import { Product } from '../models/Product.js';
import { ProductVariant } from '../models/ProductVariant.js';
import { Category } from '../models/Category.js';
import { Warehouse } from '../models/Warehouse.js';
import { Inventory } from '../models/Inventory.js';
import { MarketplaceListing } from '../models/MarketplaceListing.js';
import { WarehouseBin } from '../models/WarehouseBin.js';
import { INVENTORY_TRANSACTION_TYPES } from '../config/constants.js';
import { inventoryService } from '../services/inventoryService.js';
import { logAudit } from '../middlewares/auditMiddleware.js';
import { emitSocketEvent } from '../services/socketService.js';

// ================= CATEGORY CONTROLLERS =================
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isDeleted: false })
      .populate('parentCategory', 'name slug')
      .sort({ name: 1 });

    // Attach product count to each category
    const counts = await Product.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    const countMap = counts.reduce((acc, curr) => {
      acc[String(curr._id)] = curr.count;
      return acc;
    }, {});

    const enriched = categories.map((cat) => ({
      ...cat.toObject(),
      productCount: countMap[String(cat._id)] || 0
    }));

    res.json({ success: true, data: { categories: enriched } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, parentCategory, description, image, status } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const category = await Category.create({
      name,
      slug,
      parentCategory: parentCategory || null,
      description,
      image,
      status: status || 'active'
    });

    await logAudit({
      req,
      action: 'CATEGORY_CREATED',
      module: 'Products',
      entityId: category._id,
      newValue: { name },
      reason: 'New category created'
    });

    res.status(201).json({ success: true, message: 'Category created successfully', data: { category } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, parentCategory, description, image, status } = req.body;

    const category = await Category.findById(id);
    if (!category || category.isDeleted) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (name) {
      category.name = name;
      category.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    if (parentCategory !== undefined) category.parentCategory = parentCategory || null;
    if (description !== undefined) category.description = description;
    if (image !== undefined) category.image = image;
    if (status) category.status = status;

    await category.save();

    await logAudit({
      req,
      action: 'CATEGORY_UPDATED',
      module: 'Products',
      entityId: id,
      newValue: { name, description, status },
      reason: 'Category updated'
    });

    res.json({ success: true, message: 'Category updated successfully', data: { category } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    category.isDeleted = true;
    await category.save();

    await logAudit({
      req,
      action: 'CATEGORY_DELETED',
      module: 'Products',
      entityId: id,
      reason: 'Category deleted'
    });

    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ================= PRODUCT & VARIANT CONTROLLERS =================
export const getProducts = async (req, res) => {
  try {
    const { search, category, status, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const query = { isDeleted: false };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) query.category = category;
    if (status) query.status = status;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('category', 'name slug')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Product.countDocuments(query)
    ]);

    // Populate variants and their current inventory for each product
    const productIds = products.map((p) => p._id);
    const variants = await ProductVariant.find({ productId: { $in: productIds }, isDeleted: false });

    const variantIds = variants.map((v) => v._id);
    const inventories = await Inventory.find({ variantId: { $in: variantIds } });

    const invMap = inventories.reduce((acc, inv) => {
      const vId = String(inv.variantId);
      if (!acc[vId]) acc[vId] = { physicalStock: 0, availableStock: 0, reservedStock: 0, minimumStock: 0 };
      acc[vId].physicalStock += inv.physicalStock;
      acc[vId].availableStock += inv.availableStock;
      acc[vId].reservedStock += inv.reservedStock;
      acc[vId].minimumStock = Math.max(acc[vId].minimumStock, inv.minimumStock || 0);
      return acc;
    }, {});

    const variantsWithStock = variants.map((v) => ({
      ...v.toObject(),
      stock: invMap[String(v._id)] || { physicalStock: 0, availableStock: 0, reservedStock: 0, minimumStock: 10 }
    }));

    const variantMap = variantsWithStock.reduce((acc, v) => {
      const pId = String(v.productId);
      if (!acc[pId]) acc[pId] = [];
      acc[pId].push(v);
      return acc;
    }, {});

    const enrichedProducts = products.map((p) => {
      const pVars = variantMap[String(p._id)] || [];
      const totalPhysical = pVars.reduce((sum, v) => sum + (v.stock?.physicalStock || 0), 0);
      const totalAvailable = pVars.reduce((sum, v) => sum + (v.stock?.availableStock || 0), 0);
      const totalMin = pVars.length > 0
        ? pVars.reduce((sum, v) => sum + (v.stock?.minimumStock || 0), 0)
        : 10;

      return {
        ...p.toObject(),
        variants: pVars,
        totalStock: totalPhysical,
        availableStock: totalAvailable,
        minimumStock: totalMin
      };
    });

    res.json({
      success: true,
      data: {
        products: enrichedProducts,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalPages: Math.ceil(total / parseInt(limit, 10))
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).populate('category');
    if (!product || product.isDeleted) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const variants = await ProductVariant.find({ productId: id, isDeleted: false });
    const inventories = await Inventory.find({ productId: id }).populate('warehouseId', 'name code');

    res.json({
      success: true,
      data: {
        product,
        variants,
        inventories
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    const {
      name, sku, brand, category, subcategory, description, shortDescription,
      hsnCode, gst, mrp, costPrice, sellingPrice, weight, dimensions, barcode,
      status, images, variants, initialStock, warehouseId
    } = req.body;

    const existing = await Product.findOne({ sku: sku.toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: `SKU '${sku.toUpperCase()}' already exists` });
    }

    const product = await Product.create({
      name,
      sku: sku.toUpperCase(),
      brand,
      category,
      subcategory,
      description,
      shortDescription,
      hsnCode,
      gst: gst || 18,
      mrp: mrp || 0,
      costPrice: costPrice || 0,
      sellingPrice: sellingPrice || 0,
      weight: weight || 0,
      dimensions: dimensions || { length: 0, width: 0, height: 0 },
      barcode: barcode || '',
      status: status || 'active',
      images: images || []
    });

    // Determine target warehouse for initial stock (use default warehouse if not supplied)
    let targetWarehouse = null;
    if (warehouseId) {
      targetWarehouse = await Warehouse.findById(warehouseId);
    }
    if (!targetWarehouse) {
      targetWarehouse = await Warehouse.findOne({ isDefault: true }) || await Warehouse.findOne();
    }

    // Create variants or default single variant
    const createdVariants = [];
    if (variants && Array.isArray(variants) && variants.length > 0) {
      for (const v of variants) {
        const vSKU = (v.sku || `${sku}-${v.color || 'V'}-${v.size || '1'}`).toUpperCase();
        const createdVariant = await ProductVariant.create({
          productId: product._id,
          sku: vSKU,
          barcode: v.barcode || '',
          color: v.color || '',
          size: v.size || '',
          price: v.price || sellingPrice,
          costPrice: v.costPrice || costPrice,
          weight: v.weight || weight,
          images: v.images || images || [],
          status: 'active'
        });

        // Initialize central inventory record
        if (targetWarehouse) {
          const stockQty = Number(v.initialStock || 0);
          await inventoryService.getOrCreateInventory(createdVariant._id, targetWarehouse._id, product._id);
          if (stockQty > 0) {
            await inventoryService.mutateStock({
              variantId: createdVariant._id,
              warehouseId: targetWarehouse._id,
              type: INVENTORY_TRANSACTION_TYPES.OPENING_STOCK,
              quantity: stockQty,
              referenceType: 'ProductCreation',
              referenceId: String(product._id),
              reason: 'Opening stock on product creation',
              userId: req.user?._id
            });
          }
        }
        createdVariants.push(createdVariant);
      }
    } else {
      // Create single default variant
      const defaultVariant = await ProductVariant.create({
        productId: product._id,
        sku: product.sku,
        barcode: barcode || '',
        color: 'Default',
        size: 'Standard',
        price: sellingPrice,
        costPrice: costPrice,
        weight: weight,
        images: images || [],
        status: 'active'
      });

      if (targetWarehouse) {
        const stockQty = Number(initialStock || 0);
        await inventoryService.getOrCreateInventory(defaultVariant._id, targetWarehouse._id, product._id);
        if (stockQty > 0) {
          await inventoryService.mutateStock({
            variantId: defaultVariant._id,
            warehouseId: targetWarehouse._id,
            type: INVENTORY_TRANSACTION_TYPES.OPENING_STOCK,
            quantity: stockQty,
            referenceType: 'ProductCreation',
            referenceId: String(product._id),
            reason: 'Opening stock on product creation',
            userId: req.user?._id
          });
        }
      }
      createdVariants.push(defaultVariant);
    }

    await logAudit({
      req,
      action: 'PRODUCT_CREATED',
      module: 'Products',
      entityId: product._id,
      newValue: { name, sku, variantCount: createdVariants.length },
      reason: 'Product created'
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product, variants: createdVariants }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { variants, initialStock, warehouseId, ...updates } = req.body;

    const product = await Product.findById(id);
    if (!product || product.isDeleted) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Determine target warehouse
    let targetWarehouse = null;
    if (warehouseId) {
      targetWarehouse = await Warehouse.findById(warehouseId);
    }
    if (!targetWarehouse) {
      targetWarehouse = (await Warehouse.findOne({ isDefault: true })) || (await Warehouse.findOne());
    }

    // Assign top-level product updates
    Object.assign(product, updates);
    await product.save();

    // Update variants if provided
    if (variants && Array.isArray(variants)) {
      const existingVariants = await ProductVariant.find({ productId: id, isDeleted: false });
      const existingVarMap = new Map();
      existingVariants.forEach((v) => existingVarMap.set(String(v._id), v));

      const processedVariantIds = new Set();

      for (let vIdx = 0; vIdx < variants.length; vIdx++) {
        const vData = variants[vIdx];
        const vSize = (vData.size || '').toString().trim();
        const vColor = (vData.color || '').toString().trim();
        const vPrice = Number(vData.price) || product.sellingPrice;
        const vCost = Number(vData.costPrice) || product.costPrice;
        const rawVSku = (vData.sku || '').toString().trim();
        const vSKU = (rawVSku || `${product.sku}-${vColor || 'V'}-${vSize || (vIdx + 1)}`).toUpperCase();

        let variantDoc = null;
        if (vData._id && existingVarMap.has(String(vData._id))) {
          // Update existing variant
          variantDoc = existingVarMap.get(String(vData._id));
          variantDoc.size = vSize;
          variantDoc.color = vColor;
          variantDoc.price = vPrice;
          variantDoc.costPrice = vCost;
          if (rawVSku) variantDoc.sku = vSKU;
          await variantDoc.save();
          processedVariantIds.add(String(variantDoc._id));
        } else {
          // Check if variant with SKU already exists
          variantDoc = await ProductVariant.findOne({ productId: id, sku: vSKU });
          if (!variantDoc) {
            variantDoc = await ProductVariant.create({
              productId: id,
              sku: vSKU,
              barcode: vSKU,
              size: vSize,
              color: vColor,
              price: vPrice,
              costPrice: vCost,
              images: product.images,
              status: 'active'
            });
          } else {
            variantDoc.isDeleted = false;
            variantDoc.size = vSize;
            variantDoc.color = vColor;
            variantDoc.price = vPrice;
            await variantDoc.save();
          }
          processedVariantIds.add(String(variantDoc._id));
        }

        // Adjust stock if specified
        if (targetWarehouse && (vData.initialStock !== undefined || vData.stock !== undefined)) {
          const newQty = Number(vData.initialStock !== undefined ? vData.initialStock : vData.stock);
          const currentInv = await inventoryService.getOrCreateInventory(variantDoc._id, targetWarehouse._id, product._id);
          const diff = newQty - currentInv.physicalStock;
          if (diff !== 0) {
            await inventoryService.mutateStock({
              variantId: variantDoc._id,
              warehouseId: targetWarehouse._id,
              type: diff > 0 ? INVENTORY_TRANSACTION_TYPES.ADJUSTMENT_IN : INVENTORY_TRANSACTION_TYPES.ADJUSTMENT_OUT,
              quantity: Math.abs(diff),
              referenceType: 'ProductUpdate',
              referenceId: String(product._id),
              reason: `Variant ${vSKU} stock updated from ${currentInv.physicalStock} to ${newQty}`,
              userId: req.user?._id
            });
          }
        }
      }

      // Soft-delete removed variants and purge from warehouse racks
      for (const [vId, vDoc] of existingVarMap.entries()) {
        if (!processedVariantIds.has(vId) && variants.length > 0) {
          vDoc.isDeleted = true;
          await vDoc.save();
          await Inventory.deleteMany({ variantId: vId });

          // Also purge variant from WarehouseBin
          const bins = await WarehouseBin.find({
            $or: [{ 'assignedSkus.variantId': vId }, { 'assignedSkus.sku': vDoc.sku }]
          });
          for (const bin of bins) {
            bin.assignedSkus = bin.assignedSkus.filter((item) => String(item.variantId) !== String(vId) && item.sku !== vDoc.sku);
            bin.currentUnits = bin.assignedSkus.reduce((s, item) => s + (item.quantity || 0), 0);
            if (bin.currentUnits === 0 && bin.status === 'full') bin.status = 'available';
            await bin.save();
          }
        }
      }
    } else if (initialStock !== undefined && targetWarehouse) {
      // Single item stock update
      const defaultVariant = await ProductVariant.findOne({ productId: id, isDeleted: false });
      if (defaultVariant) {
        const currentInv = await inventoryService.getOrCreateInventory(defaultVariant._id, targetWarehouse._id, product._id);
        const newQty = Number(initialStock);
        const diff = newQty - currentInv.physicalStock;
        if (diff !== 0) {
          await inventoryService.mutateStock({
            variantId: defaultVariant._id,
            warehouseId: targetWarehouse._id,
            type: diff > 0 ? INVENTORY_TRANSACTION_TYPES.ADJUSTMENT_IN : INVENTORY_TRANSACTION_TYPES.ADJUSTMENT_OUT,
            quantity: Math.abs(diff),
            referenceType: 'ProductUpdate',
            referenceId: String(product._id),
            reason: `Single product stock updated to ${newQty}`,
            userId: req.user?._id
          });
        }
      }
    }

    await logAudit({
      req,
      action: 'PRODUCT_UPDATED',
      module: 'Products',
      entityId: id,
      reason: 'Product and variants updated'
    });

    res.json({ success: true, message: 'Product and variants updated successfully', data: { product } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    product.isDeleted = true;
    await product.save();

    const variants = await ProductVariant.find({ productId: id });
    const variantIds = variants.map((v) => String(v._id));
    const targetSkus = [product.sku, ...variants.map((v) => v.sku)].filter(Boolean);

    await ProductVariant.updateMany({ productId: id }, { isDeleted: true });
    await Inventory.deleteMany({ productId: id });
    await MarketplaceListing.deleteMany({ productId: id });

    // Clean up Warehouse Bins real-time
    const bins = await WarehouseBin.find({
      $or: [
        { 'assignedSkus.productId': id },
        { 'assignedSkus.variantId': { $in: variantIds } },
        { 'assignedSkus.sku': { $in: targetSkus } }
      ]
    });

    const affectedWarehouseIds = new Set();
    for (const bin of bins) {
      if (bin.warehouseId) affectedWarehouseIds.add(String(bin.warehouseId));
      bin.assignedSkus = bin.assignedSkus.filter((item) => {
        const isProdMatch = String(item.productId) === String(id);
        const isVarMatch = item.variantId && variantIds.includes(String(item.variantId));
        const isSkuMatch = item.sku && targetSkus.includes(item.sku);
        return !(isProdMatch || isVarMatch || isSkuMatch);
      });
      bin.currentUnits = bin.assignedSkus.reduce((sum, item) => sum + (item.quantity || 0), 0);
      if (bin.currentUnits === 0 && bin.status === 'full') {
        bin.status = 'available';
      }
      await bin.save();
    }

    // Broadcast Real-time Socket Event to all connected tabs/dashboards
    emitSocketEvent('warehouse:bins_updated', {
      action: 'product_deleted',
      productId: id,
      skus: targetSkus,
      affectedWarehouseIds: Array.from(affectedWarehouseIds)
    });
    emitSocketEvent('product:deleted', { productId: id, skus: targetSkus });

    await logAudit({
      req,
      action: 'PRODUCT_DELETED',
      module: 'Products',
      entityId: id,
      reason: 'Product soft deleted, inventory purged, and warehouse bins real-time cleansed'
    });

    res.json({ success: true, message: 'Product deleted successfully and warehouse racks cleared' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const bulkUpdateProducts = async (req, res) => {
  try {
    const { ids, action, value } = req.body;
    if (!ids || !ids.length) {
      return res.status(400).json({ success: false, message: 'No product IDs specified' });
    }

    if (action === 'status') {
      await Product.updateMany({ _id: { $in: ids } }, { status: value });
    } else if (action === 'category') {
      await Product.updateMany({ _id: { $in: ids } }, { category: value });
    } else if (action === 'delete') {
      await Product.updateMany({ _id: { $in: ids } }, { isDeleted: true });
      const variants = await ProductVariant.find({ productId: { $in: ids } });
      const variantIds = variants.map((v) => String(v._id));
      const deletedProducts = await Product.find({ _id: { $in: ids } }).select('sku');
      const targetSkus = [
        ...deletedProducts.map((p) => p.sku),
        ...variants.map((v) => v.sku)
      ].filter(Boolean);

      await ProductVariant.updateMany({ productId: { $in: ids } }, { isDeleted: true });
      await Inventory.deleteMany({ productId: { $in: ids } });
      await MarketplaceListing.deleteMany({ productId: { $in: ids } });

      // Clean up Warehouse Bins real-time for bulk deleted products
      const bins = await WarehouseBin.find({
        $or: [
          { 'assignedSkus.productId': { $in: ids } },
          { 'assignedSkus.variantId': { $in: variantIds } },
          { 'assignedSkus.sku': { $in: targetSkus } }
        ]
      });

      const affectedWarehouseIds = new Set();
      for (const bin of bins) {
        if (bin.warehouseId) affectedWarehouseIds.add(String(bin.warehouseId));
        bin.assignedSkus = bin.assignedSkus.filter((item) => {
          const isProdMatch = item.productId && ids.map(String).includes(String(item.productId));
          const isVarMatch = item.variantId && variantIds.includes(String(item.variantId));
          const isSkuMatch = item.sku && targetSkus.includes(item.sku);
          return !(isProdMatch || isVarMatch || isSkuMatch);
        });
        bin.currentUnits = bin.assignedSkus.reduce((sum, item) => sum + (item.quantity || 0), 0);
        if (bin.currentUnits === 0 && bin.status === 'full') {
          bin.status = 'available';
        }
        await bin.save();
      }

      emitSocketEvent('warehouse:bins_updated', {
        action: 'bulk_products_deleted',
        productIds: ids,
        skus: targetSkus,
        affectedWarehouseIds: Array.from(affectedWarehouseIds)
      });
      emitSocketEvent('product:deleted', { productIds: ids, skus: targetSkus });
    }

    await logAudit({
      req,
      action: 'PRODUCT_BULK_ACTION',
      module: 'Products',
      newValue: { count: ids.length, action, value },
      reason: 'Bulk action performed on products'
    });

    res.json({ success: true, message: `Bulk ${action} applied to ${ids.length} products` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Bulk Upload Products from parsed Excel sheet
 * Accurately groups multi-variants by Master SKU (Parent) and credits Central Inventory
 */
export const bulkUploadProducts = async (req, res) => {
  try {
    const { rows, warehouseId } = req.body;
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No product rows provided for upload.' });
    }

    // Determine target warehouse for initial stock crediting
    let targetWarehouse = null;
    if (warehouseId) {
      targetWarehouse = await Warehouse.findById(warehouseId);
    }
    if (!targetWarehouse) {
      targetWarehouse = (await Warehouse.findOne({ isDefault: true })) || (await Warehouse.findOne());
    }

    // Cache categories to prevent repetitive DB lookups
    const existingCats = await Category.find({ isDeleted: false });
    const categoryMap = new Map();
    existingCats.forEach((cat) => {
      categoryMap.set(cat.name.toLowerCase().trim(), cat);
    });

    const getOrCreateCategory = async (catName) => {
      if (!catName || !catName.toString().trim()) {
        let defaultCat = categoryMap.get('general') || existingCats[0];
        if (!defaultCat) {
          defaultCat = await Category.create({ name: 'General', slug: 'general', status: 'active' });
          categoryMap.set('general', defaultCat);
        }
        return defaultCat;
      }
      const raw = catName.toString().trim();
      const normalized = raw.toLowerCase();
      if (categoryMap.has(normalized)) {
        return categoryMap.get(normalized);
      }
      const slug = normalized.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const newCat = await Category.create({
        name: raw,
        slug: slug || `cat-${Date.now()}`,
        status: 'active'
      });
      categoryMap.set(normalized, newCat);
      return newCat;
    };

    // Group rows by Master SKU (Parent)
    const grouped = new Map();
    rows.forEach((r, idx) => {
      const rawSku = r.masterSku || r.sku || r['Master SKU (Parent) *'] || r['Master SKU'] || `PROD-${Date.now()}-${idx}`;
      const masterSku = rawSku.toString().trim().toUpperCase();
      if (!grouped.has(masterSku)) {
        grouped.set(masterSku, []);
      }
      grouped.get(masterSku).push(r);
    });

    let createdProductsCount = 0;
    let createdVariantsCount = 0;
    let totalStockCredited = 0;
    const errors = [];

    for (const [masterSku, groupRows] of grouped.entries()) {
      try {
        const first = groupRows[0];
        const rawTitle = first.title || first.name || first['Product Title *'] || first['Product Title'] || `Product ${masterSku}`;
        const rawCategory = first.categoryName || first.category || first['Category *'] || first['Category'];
        const rawBrand = first.brand || first['Brand / Manufacturer'] || first['Brand'] || '';
        const rawHsn = first.hsnCode || first['HSN Code *'] || first['HSN Code'] || '';
        const rawGst = Number(first.gst || first['GST Tax (%) *'] || first['GST Tax (%)'] || 18);
        const rawCost = Number(first.costPrice || first['Cost Price (₹)'] || 0);
        const rawSell = Number(first.sellingPrice || first['Selling Price (₹) *'] || first['Selling Price (₹)'] || 0);
        const rawMrp = Number(first.mrp || first['MRP (₹) *'] || first['MRP (₹)'] || rawSell || 0);
        const rawImg = first.imageUrl || first['Image URL'] || '';

        const categoryDoc = await getOrCreateCategory(rawCategory);

        // Check if parent product already exists
        let product = await Product.findOne({ sku: masterSku });
        if (!product) {
          product = await Product.create({
            name: rawTitle.trim(),
            sku: masterSku,
            brand: rawBrand.trim(),
            category: categoryDoc._id,
            hsnCode: rawHsn.toString().trim(),
            gst: rawGst,
            mrp: rawMrp,
            costPrice: rawCost,
            sellingPrice: rawSell,
            images: rawImg ? [{ url: rawImg.trim() }] : [],
            status: 'active'
          });
          createdProductsCount++;
        } else {
          // If reactivating or updating
          if (product.isDeleted) {
            product.isDeleted = false;
            product.status = 'active';
          }
          if (rawTitle) product.name = rawTitle.trim();
          product.category = categoryDoc._id;
          if (rawBrand) product.brand = rawBrand.trim();
          if (rawHsn) product.hsnCode = rawHsn.toString().trim();
          if (rawSell > 0) product.sellingPrice = rawSell;
          if (rawMrp > 0) product.mrp = rawMrp;
          if (rawCost > 0) product.costPrice = rawCost;
          if (rawImg && (!product.images || product.images.length === 0)) {
            product.images = [{ url: rawImg.trim() }];
          }
          await product.save();
        }

        // Determine if this is a Multi-Variant item or Single Standard item
        const hasVariants = groupRows.length > 1 || groupRows.some((r) => {
          const s = r.variantSize || r['Variant Size'];
          const c = r.variantColor || r['Variant Color'];
          return (s && s.toString().trim()) || (c && c.toString().trim());
        });

        if (hasVariants) {
          for (let vIdx = 0; vIdx < groupRows.length; vIdx++) {
            const vRow = groupRows[vIdx];
            const sizeStr = (vRow.variantSize || vRow['Variant Size'] || '').toString().trim();
            const colorStr = (vRow.variantColor || vRow['Variant Color'] || '').toString().trim();
            const rawVSku = (vRow.variantSku || vRow['Variant SKU (Picker Barcode) [AUTO]'] || vRow['Variant SKU'] || '').toString().trim();
            const vSKU = (rawVSku || `${masterSku}-${colorStr || 'V'}-${sizeStr || (vIdx + 1)}`).toUpperCase();

            const vPrice = Number(vRow.variantPrice || vRow['Variant Price (₹)'] || vRow.sellingPrice || vRow['Selling Price (₹) *'] || product.sellingPrice);
            const vCost = Number(vRow.costPrice || vRow['Cost Price (₹)'] || product.costPrice);
            const vImg = vRow.imageUrl || vRow['Image URL'] || (product.images?.[0]?.url || '');

            let variant = await ProductVariant.findOne({ productId: product._id, sku: vSKU });
            let isNewVariant = false;
            if (!variant) {
              variant = await ProductVariant.create({
                productId: product._id,
                sku: vSKU,
                barcode: vSKU,
                color: colorStr,
                size: sizeStr,
                price: vPrice,
                costPrice: vCost,
                images: vImg ? [{ url: vImg.trim() }] : [],
                status: 'active'
              });
              createdVariantsCount++;
              isNewVariant = true;
            } else {
              // Existing variant update (BULK EDIT SUPPORT)
              if (variant.isDeleted) {
                variant.isDeleted = false;
                variant.status = 'active';
              }
              if (colorStr) variant.color = colorStr;
              if (sizeStr) variant.size = sizeStr;
              if (vPrice > 0) variant.price = vPrice;
              if (vCost > 0) variant.costPrice = vCost;
              if (vImg) variant.images = [{ url: vImg.trim() }];
              await variant.save();
            }

            // Sync Stock in Central Inventory
            const stockQty = Number(vRow.stockQty || vRow['Stock Qty *'] || vRow['Stock Qty'] || vRow.initialStock || 0);
            if (targetWarehouse) {
              const currentInv = await inventoryService.getOrCreateInventory(variant._id, targetWarehouse._id, product._id);
              if (isNewVariant) {
                if (stockQty > 0) {
                  await inventoryService.mutateStock({
                    variantId: variant._id,
                    warehouseId: targetWarehouse._id,
                    type: INVENTORY_TRANSACTION_TYPES.OPENING_STOCK,
                    quantity: stockQty,
                    referenceType: 'ExcelBulkUpload',
                    referenceId: String(product._id),
                    reason: `Initial stock added via Excel Bulk Upload (${vSKU})`,
                    userId: req.user?._id
                  });
                  totalStockCredited += stockQty;
                }
              } else {
                // Adjust delta stock for bulk edit
                const diff = stockQty - currentInv.physicalStock;
                if (diff !== 0) {
                  await inventoryService.mutateStock({
                    variantId: variant._id,
                    warehouseId: targetWarehouse._id,
                    type: diff > 0 ? INVENTORY_TRANSACTION_TYPES.ADJUSTMENT_IN : INVENTORY_TRANSACTION_TYPES.ADJUSTMENT_OUT,
                    quantity: Math.abs(diff),
                    referenceType: 'ExcelBulkEdit',
                    referenceId: String(product._id),
                    reason: `Stock updated via Excel Bulk Edit (${vSKU}) from ${currentInv.physicalStock} to ${stockQty}`,
                    userId: req.user?._id
                  });
                }
              }
            }
          }
        } else {
          // Standard Single Variant Product
          const singleSKU = (first.variantSku || first['Variant SKU (Picker Barcode) [AUTO]'] || product.sku).toString().trim().toUpperCase();
          let defaultVariant = await ProductVariant.findOne({ productId: product._id, sku: singleSKU });
          let isNewSingle = false;
          if (!defaultVariant) {
            defaultVariant = await ProductVariant.create({
              productId: product._id,
              sku: singleSKU,
              barcode: singleSKU,
              color: 'Default',
              size: 'Standard',
              price: product.sellingPrice,
              costPrice: product.costPrice,
              images: product.images,
              status: 'active'
            });
            createdVariantsCount++;
            isNewSingle = true;
          } else {
            if (defaultVariant.isDeleted) {
              defaultVariant.isDeleted = false;
              defaultVariant.status = 'active';
            }
            defaultVariant.price = product.sellingPrice;
            defaultVariant.costPrice = product.costPrice;
            await defaultVariant.save();
          }

          const stockQty = Number(first.stockQty || first['Stock Qty *'] || first['Stock Qty'] || first.initialStock || 0);
          if (targetWarehouse) {
            const currentInv = await inventoryService.getOrCreateInventory(defaultVariant._id, targetWarehouse._id, product._id);
            if (isNewSingle) {
              if (stockQty > 0) {
                await inventoryService.mutateStock({
                  variantId: defaultVariant._id,
                  warehouseId: targetWarehouse._id,
                  type: INVENTORY_TRANSACTION_TYPES.OPENING_STOCK,
                  quantity: stockQty,
                  referenceType: 'ExcelBulkUpload',
                  referenceId: String(product._id),
                  reason: `Initial stock added via Excel Bulk Upload (${product.sku})`,
                  userId: req.user?._id
                });
                totalStockCredited += stockQty;
              }
            } else {
              const diff = stockQty - currentInv.physicalStock;
              if (diff !== 0) {
                await inventoryService.mutateStock({
                  variantId: defaultVariant._id,
                  warehouseId: targetWarehouse._id,
                  type: diff > 0 ? INVENTORY_TRANSACTION_TYPES.ADJUSTMENT_IN : INVENTORY_TRANSACTION_TYPES.ADJUSTMENT_OUT,
                  quantity: Math.abs(diff),
                  referenceType: 'ExcelBulkEdit',
                  referenceId: String(product._id),
                  reason: `Stock updated via Excel Bulk Edit (${product.sku}) from ${currentInv.physicalStock} to ${stockQty}`,
                  userId: req.user?._id
                });
              }
            }
          }
        }
      } catch (rowErr) {
        errors.push({ masterSku, error: rowErr.message });
      }
    }

    await logAudit({
      req,
      action: 'PRODUCT_BULK_UPLOAD',
      module: 'Products',
      newValue: {
        totalRows: rows.length,
        createdProductsCount,
        createdVariantsCount,
        totalStockCredited,
        errorCount: errors.length
      },
      reason: 'Bulk Excel Product Upload'
    });

    res.status(201).json({
      success: true,
      message: `Bulk upload processed successfully! Imported ${createdProductsCount} products, ${createdVariantsCount} variants, credited ${totalStockCredited} total stock units to Central Inventory.`,
      data: {
        createdProductsCount,
        createdVariantsCount,
        totalStockCredited,
        errors
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
