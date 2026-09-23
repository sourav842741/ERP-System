import { WarehouseBin } from '../models/WarehouseBin.js';
import { Warehouse } from '../models/Warehouse.js';
import { Product } from '../models/Product.js';
import { ProductVariant } from '../models/ProductVariant.js';
import { Inventory } from '../models/Inventory.js';
import { emitSocketEvent } from '../services/socketService.js';

/**
 * Controller for 2D Warehouse Digital Twin & Bin Management
 */

// 1. Get Bins for a Warehouse (with optional Zone/Aisle/SKU filters)
export const getWarehouseBins = async (req, res, next) => {
  try {
    const { warehouseId, zone, aisle, search, status } = req.query;

    const query = {};
    if (warehouseId) query.warehouseId = warehouseId;
    if (zone && zone !== 'all') query.zone = zone;
    if (aisle && aisle !== 'all') query.aisle = aisle;
    if (status && status !== 'all') query.status = status;

    if (search) {
      query.$or = [
        { binCode: { $regex: search, $options: 'i' } },
        { rack: { $regex: search, $options: 'i' } },
        { 'assignedSkus.sku': { $regex: search, $options: 'i' } },
        { 'assignedSkus.productName': { $regex: search, $options: 'i' } }
      ];
    }

    const bins = await WarehouseBin.find(query)
      .sort({ zone: 1, aisle: 1, rack: 1, shelf: 1, binCode: 1 });

    // Proactive Auto-Sanitization: Check if any assignedSkus belong to deleted or non-existent products
    const allAssignedProductIds = new Set();
    const allAssignedSkus = new Set();
    bins.forEach((b) => {
      (b.assignedSkus || []).forEach((item) => {
        if (item.productId) allAssignedProductIds.add(String(item.productId));
        if (item.sku) allAssignedSkus.add(item.sku);
      });
    });

    if (allAssignedProductIds.size > 0 || allAssignedSkus.size > 0) {
      // Find all active products
      const activeProducts = await Product.find({
        $or: [
          { _id: { $in: Array.from(allAssignedProductIds) } },
          { sku: { $in: Array.from(allAssignedSkus) } }
        ],
        isDeleted: false
      }).select('_id sku').lean();

      const activeProductIds = new Set(activeProducts.map((p) => String(p._id)));
      const activeProductSkus = new Set(activeProducts.map((p) => p.sku));

      // Find all active variants
      const activeVariants = await ProductVariant.find({
        sku: { $in: Array.from(allAssignedSkus) },
        isDeleted: false
      }).select('_id sku productId').lean();

      const activeVariantIds = new Set(activeVariants.map((v) => String(v._id)));
      const activeVariantSkus = new Set(activeVariants.map((v) => v.sku));

      for (const b of bins) {
        if (!b.assignedSkus || b.assignedSkus.length === 0) continue;
        const initialLen = b.assignedSkus.length;
        b.assignedSkus = b.assignedSkus.filter((item) => {
          const prodActive = item.productId ? activeProductIds.has(String(item.productId)) : false;
          const varActive = item.variantId ? activeVariantIds.has(String(item.variantId)) : false;
          const skuActive = activeProductSkus.has(item.sku) || activeVariantSkus.has(item.sku);
          return (item.productId ? prodActive : false) || varActive || skuActive;
        });

        if (b.assignedSkus.length !== initialLen) {
          b.currentUnits = b.assignedSkus.reduce((sum, item) => sum + (item.quantity || 0), 0);
          if (b.currentUnits === 0 && b.status === 'full') {
            b.status = 'available';
          }
          await b.save();
        }
      }
    }

    const plainBins = bins.map((b) => (b.toObject ? b.toObject() : b));

    // Compute summary stats
    const totalBins = plainBins.length;
    let totalCapacity = 0;
    let totalStoredUnits = 0;
    let occupiedBins = 0;

    plainBins.forEach((b) => {
      totalCapacity += b.maxCapacity || 0;
      totalStoredUnits += b.currentUnits || 0;
      if ((b.currentUnits || 0) > 0) occupiedBins++;
    });

    res.json({
      success: true,
      count: totalBins,
      stats: {
        totalBins,
        occupiedBins,
        occupancyRate: totalCapacity > 0 ? ((totalStoredUnits / totalCapacity) * 100).toFixed(1) : 0,
        totalCapacity,
        totalStoredUnits
      },
      data: plainBins
    });
  } catch (error) {
    next(error);
  }
};

// 2. Create Single Warehouse Bin
export const createWarehouseBin = async (req, res, next) => {
  try {
    const { warehouseId, zone, aisle, rack, shelf, binCode, type, maxCapacity, coordinates, notes } = req.body;

    if (!warehouseId || !binCode) {
      return res.status(400).json({ success: false, message: 'Warehouse and Bin Code are required' });
    }

    const existing = await WarehouseBin.findOne({ warehouseId, binCode: binCode.toUpperCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: `Bin code ${binCode} already exists in this warehouse` });
    }

    const newBin = await WarehouseBin.create({
      warehouseId,
      zone: zone || 'Zone A',
      aisle: aisle || 'Aisle 1',
      rack: rack || 'Rack 1',
      shelf: shelf || 'Level 1',
      binCode: binCode.toUpperCase().trim(),
      type: type || 'standard',
      maxCapacity: Number(maxCapacity) || 100,
      currentUnits: 0,
      coordinates: coordinates || { x: 0, y: 0, width: 1, height: 1 },
      notes: notes || ''
    });

    emitSocketEvent('warehouse:bins_updated', { warehouseId, action: 'create_bin' });

    res.status(201).json({ success: true, data: newBin, message: 'Warehouse bin created successfully' });
  } catch (error) {
    next(error);
  }
};

// 3. Batch Generate Rack Layout (Digital Twin Matrix Builder)
export const batchGenerateBins = async (req, res, next) => {
  try {
    const {
      warehouseId,
      zone = 'Zone A',
      aisle = 'Aisle 1',
      racksCount = 2,
      levelsCount = 3,
      binsPerLevel = 4,
      maxCapacity = 100,
      type = 'standard'
    } = req.body;

    if (!warehouseId) {
      return res.status(400).json({ success: false, message: 'Warehouse is required' });
    }

    const aisleCode = aisle.replace(/\s+/g, '-').toUpperCase();
    const zoneCode = zone.replace(/\s+/g, '-').toUpperCase();

    const createdBins = [];
    let startX = 0;

    for (let r = 1; r <= Number(racksCount); r++) {
      const rackName = `Rack-${r}`;
      for (let l = 1; l <= Number(levelsCount); l++) {
        const shelfName = `Level-${l}`;
        for (let b = 1; b <= Number(binsPerLevel); b++) {
          const binCode = `${zoneCode}-${aisleCode}-R${r}-L${l}-B${b}`;

          // Check if already exists
          const exists = await WarehouseBin.findOne({ warehouseId, binCode });
          if (!exists) {
            const doc = await WarehouseBin.create({
              warehouseId,
              zone,
              aisle,
              rack: rackName,
              shelf: shelfName,
              binCode,
              type,
              maxCapacity: Number(maxCapacity),
              currentUnits: 0,
              coordinates: {
                x: (r - 1) * (Number(binsPerLevel) + 1) + (b - 1),
                y: Number(levelsCount) - l, // Top shelf at top, ground shelf at bottom
                width: 1,
                height: 1
              }
            });
            createdBins.push(doc);
          }
        }
      }
    }

    emitSocketEvent('warehouse:bins_updated', { warehouseId, action: 'batch_generated' });

    res.status(201).json({
      success: true,
      count: createdBins.length,
      message: `Generated ${createdBins.length} bins for ${zone} / ${aisle}`,
      data: createdBins
    });
  } catch (error) {
    next(error);
  }
};

// 4. Update Warehouse Bin
export const updateWarehouseBin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { zone, aisle, rack, shelf, binCode, type, maxCapacity, status, notes, coordinates } = req.body;

    const bin = await WarehouseBin.findById(id);
    if (!bin) {
      return res.status(404).json({ success: false, message: 'Warehouse bin not found' });
    }

    if (binCode && binCode.toUpperCase().trim() !== bin.binCode) {
      const dup = await WarehouseBin.findOne({
        warehouseId: bin.warehouseId,
        binCode: binCode.toUpperCase().trim(),
        _id: { $ne: id }
      });
      if (dup) {
        return res.status(400).json({ success: false, message: `Bin code ${binCode} is already in use` });
      }
      bin.binCode = binCode.toUpperCase().trim();
    }

    if (zone) bin.zone = zone;
    if (aisle) bin.aisle = aisle;
    if (rack) bin.rack = rack;
    if (shelf) bin.shelf = shelf;
    if (type) bin.type = type;
    if (maxCapacity !== undefined) bin.maxCapacity = Number(maxCapacity);
    if (status) bin.status = status;
    if (notes !== undefined) bin.notes = notes;
    if (coordinates) bin.coordinates = coordinates;

    // Auto-update status based on capacity
    if (bin.currentUnits >= bin.maxCapacity) {
      bin.status = 'full';
    } else if (bin.status === 'full' && bin.currentUnits < bin.maxCapacity) {
      bin.status = 'available';
    }

    await bin.save();
    emitSocketEvent('warehouse:bins_updated', { warehouseId: bin.warehouseId, binId: id, action: 'update_bin' });
    res.json({ success: true, data: bin, message: 'Bin updated successfully' });
  } catch (error) {
    next(error);
  }
};

// 5. Delete Warehouse Bin
export const deleteWarehouseBin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { force } = req.query;

    const bin = await WarehouseBin.findById(id);
    if (!bin) {
      return res.status(404).json({ success: false, message: 'Warehouse bin not found' });
    }

    if (bin.currentUnits > 0 && force !== 'true') {
      return res.status(400).json({
        success: false,
        message: `Cannot delete bin ${bin.binCode}: contains ${bin.currentUnits} items. Remove stock first or pass force=true.`
      });
    }

    const whId = bin.warehouseId;
    await WarehouseBin.findByIdAndDelete(id);
    emitSocketEvent('warehouse:bins_updated', { warehouseId: whId, binId: id, action: 'delete_bin' });
    res.json({ success: true, message: `Bin ${bin.binCode} deleted successfully` });
  } catch (error) {
    next(error);
  }
};

// 5.5 Clear / Reset All Bins in a Warehouse
export const clearAllWarehouseBins = async (req, res, next) => {
  try {
    const { warehouseId } = req.body;
    if (!warehouseId) {
      return res.status(400).json({ success: false, message: 'Warehouse ID is required' });
    }

    const result = await WarehouseBin.deleteMany({ warehouseId });
    emitSocketEvent('warehouse:bins_updated', { warehouseId, action: 'clear_all' });
    res.json({
      success: true,
      message: `Cleared ${result.deletedCount} bins from warehouse. Layout reset successfully.`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    next(error);
  }
};

// 5.6 Delete entire Aisle
export const deleteAisleBins = async (req, res, next) => {
  try {
    const { warehouseId, aisle } = req.body;
    if (!warehouseId || !aisle) {
      return res.status(400).json({ success: false, message: 'Warehouse ID and Aisle name are required' });
    }

    const result = await WarehouseBin.deleteMany({ warehouseId, aisle });
    emitSocketEvent('warehouse:bins_updated', { warehouseId, aisle, action: 'delete_aisle' });
    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} bins in ${aisle}`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    next(error);
  }
};

// 6. Assign SKU / Putaway Stock into Bin
export const assignSkuToBin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sku, quantity, productName, productId, variantId } = req.body;

    if (!sku || quantity === undefined) {
      return res.status(400).json({ success: false, message: 'SKU and Quantity are required' });
    }

    const bin = await WarehouseBin.findById(id);
    if (!bin) {
      return res.status(404).json({ success: false, message: 'Warehouse bin not found' });
    }

    const addQty = Number(quantity);
    const existingIndex = bin.assignedSkus.findIndex((item) => item.sku.toLowerCase() === sku.toLowerCase().trim());

    if (existingIndex >= 0) {
      bin.assignedSkus[existingIndex].quantity += addQty;
      if (bin.assignedSkus[existingIndex].quantity <= 0) {
        bin.assignedSkus.splice(existingIndex, 1);
      }
    } else if (addQty > 0) {
      bin.assignedSkus.push({
        sku: sku.toUpperCase().trim(),
        productName: productName || sku,
        productId: productId || null,
        variantId: variantId || null,
        quantity: addQty
      });
    }

    // Recalculate current units
    bin.currentUnits = bin.assignedSkus.reduce((sum, item) => sum + (item.quantity || 0), 0);

    // Auto-update status
    if (bin.currentUnits >= bin.maxCapacity) {
      bin.status = 'full';
    } else if (bin.status === 'full' && bin.currentUnits < bin.maxCapacity) {
      bin.status = 'available';
    }

    await bin.save();
    emitSocketEvent('warehouse:bins_updated', { warehouseId: bin.warehouseId, binId: id, action: 'assign_sku' });
    res.json({ success: true, data: bin, message: `Stock assigned to bin ${bin.binCode}` });
  } catch (error) {
    next(error);
  }
};

// 7. Locate SKU (Search exact bin locations for pickers)
export const locateSku = async (req, res, next) => {
  try {
    const { sku } = req.params;
    const { warehouseId } = req.query;

    const query = { 'assignedSkus.sku': { $regex: new RegExp(`^${sku.trim()}$`, 'i') } };
    if (warehouseId) query.warehouseId = warehouseId;

    const bins = await WarehouseBin.find(query)
      .populate('warehouseId', 'name code')
      .lean();

    res.json({
      success: true,
      sku,
      locationsCount: bins.length,
      data: bins.map((b) => ({
        binId: b._id,
        warehouseName: b.warehouseId?.name,
        warehouseCode: b.warehouseId?.code,
        binCode: b.binCode,
        zone: b.zone,
        aisle: b.aisle,
        rack: b.rack,
        shelf: b.shelf,
        coordinates: b.coordinates,
        itemQuantity: b.assignedSkus.find((item) => item.sku.toLowerCase() === sku.toLowerCase())?.quantity || 0
      }))
    });
  } catch (error) {
    next(error);
  }
};

// 8. Auto-Slot Warehouse Products into Bins (1-Click Intelligent Allocation)
export const autoSlotWarehouseInventory = async (req, res, next) => {
  try {
    const { warehouseId, resetExisting = false } = req.body;
    if (!warehouseId) {
      return res.status(400).json({ success: false, message: 'Warehouse ID is required' });
    }

    // 1. Fetch all bins for this warehouse
    const bins = await WarehouseBin.find({ warehouseId, status: { $ne: 'maintenance' } })
      .sort({ zone: 1, aisle: 1, rack: 1, shelf: 1, binCode: 1 });

    if (bins.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No bins found in this warehouse. Please create or auto-generate racks first.'
      });
    }

    // If resetExisting is true, clear all current assignments
    if (resetExisting) {
      for (const b of bins) {
        b.assignedSkus = [];
        b.currentUnits = 0;
        b.status = 'available';
      }
    }

    // 2. Fetch inventory items for this warehouse (excluding soft-deleted products/variants)
    let invItems = await Inventory.find({
      warehouseId,
      physicalStock: { $gt: 0 }
    })
      .populate({
        path: 'productId',
        match: { isDeleted: false },
        select: 'name sku category brand isDeleted'
      })
      .populate({
        path: 'variantId',
        match: { isDeleted: false },
        select: 'sku color size attributes isDeleted'
      })
      .lean();

    invItems = invItems.filter((inv) => inv.productId && (!inv.variantId || !inv.variantId.isDeleted));

    // If no specific inventory records exist yet for this warehouse, fetch active products from ERP catalog
    if (invItems.length === 0) {
      const activeProducts = await Product.find({ isDeleted: false })
        .populate({
          path: 'variants',
          match: { isDeleted: false }
        })
        .limit(50)
        .lean();

      invItems = [];
      activeProducts.forEach((p) => {
        const validVariants = (p.variants || []).filter((v) => !v.isDeleted);
        if (validVariants.length > 0) {
          validVariants.forEach((v) => {
            invItems.push({
              productId: p,
              variantId: v,
              sku: v.sku || p.sku,
              productName: `${p.name} (${v.color || ''} ${v.size || ''})`.trim(),
              quantityToSlot: 35
            });
          });
        } else {
          invItems.push({
            productId: p,
            variantId: null,
            sku: p.sku,
            productName: p.name,
            quantityToSlot: 50
          });
        }
      });
    } else {
      // Normalize items from Inventory
      invItems = invItems.map((inv) => ({
        productId: inv.productId,
        variantId: inv.variantId,
        sku: inv.variantId?.sku || inv.productId?.sku,
        productName: inv.variantId ? `${inv.productId?.name} (${inv.variantId?.color || ''} ${inv.variantId?.size || ''})`.trim() : inv.productId?.name,
        quantityToSlot: inv.physicalStock
      }));
    }

    let binIndex = 0;
    let totalSlottedUnits = 0;
    let slottedProductsCount = 0;

    for (const item of invItems) {
      let remainingQty = item.quantityToSlot;
      if (!remainingQty || remainingQty <= 0) continue;

      while (remainingQty > 0 && binIndex < bins.length) {
        const bin = bins[binIndex];
        const availableSpace = Math.max(0, bin.maxCapacity - bin.currentUnits);

        if (availableSpace <= 0) {
          bin.status = 'full';
          binIndex++;
          continue;
        }

        const allocateQty = Math.min(remainingQty, availableSpace);

        const existingItemIdx = bin.assignedSkus.findIndex(
          (s) => s.sku.toLowerCase() === item.sku.toLowerCase()
        );

        if (existingItemIdx >= 0) {
          bin.assignedSkus[existingItemIdx].quantity += allocateQty;
        } else {
          bin.assignedSkus.push({
            sku: item.sku,
            productId: item.productId?._id || item.productId,
            variantId: item.variantId?._id || item.variantId,
            productName: item.productName || item.sku,
            quantity: allocateQty
          });
        }

        bin.currentUnits += allocateQty;
        totalSlottedUnits += allocateQty;
        remainingQty -= allocateQty;

        if (bin.currentUnits >= bin.maxCapacity) {
          bin.status = 'full';
          binIndex++; // Move to next bin
        } else {
          bin.status = 'available';
        }
      }

      slottedProductsCount++;
      if (binIndex >= bins.length) break; // All bins filled
    }

    // Save all modified bins
    await Promise.all(bins.map((b) => b.save()));

    emitSocketEvent('warehouse:bins_updated', { warehouseId, action: 'auto_slot' });

    res.json({
      success: true,
      message: `Successfully slotted ${slottedProductsCount} products (${totalSlottedUnits} units) across warehouse bins!`,
      data: {
        slottedProductsCount,
        totalSlottedUnits,
        totalBinsFilled: bins.filter((b) => b.currentUnits > 0).length
      }
    });
  } catch (error) {
    next(error);
  }
};

// 9. Get Warehouse Stockable Products for Quick Dropdown Selection
export const getWarehouseStockableProducts = async (req, res, next) => {
  try {
    const { warehouseId } = req.query;

    const products = await Product.find({ isDeleted: false })
      .populate({
        path: 'variants',
        match: { isDeleted: false }
      })
      .sort({ name: 1 })
      .lean();

    let invMap = {};
    if (warehouseId) {
      const invs = await Inventory.find({ warehouseId }).lean();
      invs.forEach((inv) => {
        invMap[String(inv.variantId || inv.productId)] = inv.physicalStock;
      });
    }

    const flatItems = [];
    products.forEach((p) => {
      const activeVariants = (p.variants || []).filter((v) => !v.isDeleted);
      if (activeVariants.length > 0) {
        activeVariants.forEach((v) => {
          flatItems.push({
            productId: p._id,
            variantId: v._id,
            name: `${p.name} (${v.color || ''} ${v.size || ''})`.trim(),
            sku: v.sku || p.sku,
            currentStock: invMap[String(v._id)] ?? invMap[String(p._id)] ?? 50
          });
        });
      } else {
        flatItems.push({
          productId: p._id,
          variantId: null,
          name: p.name,
          sku: p.sku,
          currentStock: invMap[String(p._id)] ?? 50
        });
      }
    });

    res.json({ success: true, count: flatItems.length, data: flatItems });
  } catch (error) {
    next(error);
  }
};

export default {
  getWarehouseBins,
  createWarehouseBin,
  batchGenerateBins,
  updateWarehouseBin,
  deleteWarehouseBin,
  assignSkuToBin,
  locateSku,
  autoSlotWarehouseInventory,
  getWarehouseStockableProducts
};
