import { Warehouse } from '../models/Warehouse.js';
import { WarehouseTransfer } from '../models/WarehouseTransfer.js';
import { Inventory } from '../models/Inventory.js';
import { inventoryService } from '../services/inventoryService.js';
import { logAudit } from '../middlewares/auditMiddleware.js';

export const getWarehouses = async (req, res) => {
  try {
    const warehouses = await Warehouse.find({ isDeleted: false })
      .populate('manager', 'name email phone')
      .sort({ isDefault: -1, name: 1 });

    // Attach current stock summary for each warehouse
    const stats = await Inventory.aggregate([
      {
        $group: {
          _id: '$warehouseId',
          totalStock: { $sum: '$physicalStock' },
          availableStock: { $sum: '$availableStock' },
          itemCount: { $sum: 1 }
        }
      }
    ]);

    const statMap = stats.reduce((acc, s) => {
      acc[String(s._id)] = s;
      return acc;
    }, {});

    const enriched = warehouses.map((w) => ({
      ...w.toObject(),
      stats: statMap[String(w._id)] || { totalStock: 0, availableStock: 0, itemCount: 0 }
    }));

    res.json({ success: true, data: { warehouses: enriched } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createWarehouse = async (req, res) => {
  try {
    const { name, code, address, city, state, postalCode, manager, isDefault } = req.body;
    
    if (isDefault) {
      await Warehouse.updateMany({}, { isDefault: false });
    }

    const warehouse = await Warehouse.create({
      name,
      code: code.toUpperCase(),
      address,
      city,
      state,
      postalCode,
      manager: manager || null,
      isDefault: Boolean(isDefault)
    });

    await logAudit({
      req,
      action: 'WAREHOUSE_CREATED',
      module: 'Warehouses',
      entityId: warehouse._id,
      newValue: { name, code },
      reason: 'New warehouse added'
    });

    res.status(201).json({ success: true, message: 'Warehouse created successfully', data: { warehouse } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.body.isDefault) {
      await Warehouse.updateMany({ _id: { $ne: id } }, { isDefault: false });
    }

    const warehouse = await Warehouse.findByIdAndUpdate(id, req.body, { new: true });
    if (!warehouse) return res.status(404).json({ success: false, message: 'Warehouse not found' });

    res.json({ success: true, message: 'Warehouse updated successfully', data: { warehouse } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const transferStock = async (req, res) => {
  try {
    const { sourceWarehouseId, destinationWarehouseId, items, notes } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ success: false, message: 'Must select at least one item to transfer' });
    }

    if (String(sourceWarehouseId) === String(destinationWarehouseId)) {
      return res.status(400).json({ success: false, message: 'Source and destination warehouses cannot be the same' });
    }

    const count = await WarehouseTransfer.countDocuments();
    const transferNumber = `TRF-${Date.now().toString().slice(-6)}-${count + 1}`;

    // Execute inter-warehouse transfer via central inventory service
    await inventoryService.transferStock({
      sourceWarehouseId,
      destinationWarehouseId,
      items,
      transferNumber,
      userId: req.user?._id
    });

    const transfer = await WarehouseTransfer.create({
      transferNumber,
      sourceWarehouse: sourceWarehouseId,
      destinationWarehouse: destinationWarehouseId,
      items,
      status: 'COMPLETED',
      notes,
      createdBy: req.user?._id
    });

    await logAudit({
      req,
      action: 'STOCK_TRANSFERRED',
      module: 'Warehouses',
      entityId: transfer._id,
      newValue: { transferNumber, itemCount: items.length },
      reason: `Inter-warehouse transfer #${transferNumber}`
    });

    res.status(201).json({
      success: true,
      message: 'Stock transferred successfully between warehouses',
      data: { transfer }
    });
  } catch (err) {
    res.status(err.code === 'INSUFFICIENT_STOCK' ? 400 : 500).json({
      success: false,
      code: err.code || 'SERVER_ERROR',
      message: err.message
    });
  }
};

export const getTransfers = async (req, res) => {
  try {
    const transfers = await WarehouseTransfer.find()
      .populate('sourceWarehouse', 'name code')
      .populate('destinationWarehouse', 'name code')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: { transfers } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
