import { Inventory } from '../models/Inventory.js';
import { InventoryTransaction } from '../models/InventoryTransaction.js';
import { ProductVariant } from '../models/ProductVariant.js';
import { Product } from '../models/Product.js';
import { INVENTORY_TRANSACTION_TYPES } from '../config/constants.js';
import { inventoryService } from '../services/inventoryService.js';
import { createNotification } from '../services/notificationService.js';
import { logAudit } from '../middlewares/auditMiddleware.js';

export const getInventoryOverview = async (req, res) => {
  try {
    const { warehouseId, filter, search, page = 1, limit = 25 } = req.query;
    
    // Only query inventory for active, non-deleted products
    const activeProducts = await Product.find({ isDeleted: false }).select('_id');
    const activeProductIds = activeProducts.map((p) => p._id);

    const query = { productId: { $in: activeProductIds } };

    if (warehouseId) query.warehouseId = warehouseId;

    if (filter === 'low_stock') {
      query.$expr = {
        $and: [
          { $gt: ['$availableStock', 0] },
          { $lte: ['$availableStock', '$minimumStock'] }
        ]
      };
    } else if (filter === 'out_of_stock') {
      query.availableStock = 0;
    } else if (filter === 'damaged') {
      query.damagedStock = { $gt: 0 };
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [items, total] = await Promise.all([
      Inventory.find(query)
        .populate('productId', 'name sku brand category images')
        .populate({
          path: 'variantId',
          populate: { path: 'productId', select: 'name sku brand category images' }
        })
        .populate('warehouseId', 'name code')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Inventory.countDocuments(query)
    ]);

    // Calculate aggregated inventory KPIs
    const matchStage = { productId: { $in: activeProductIds } };
    if (warehouseId) {
      matchStage.warehouseId = new (await import('mongoose')).default.Types.ObjectId(warehouseId);
    }

    const [stats] = await Inventory.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalPhysicalStock: { $sum: '$physicalStock' },
          totalAvailableStock: { $sum: '$availableStock' },
          totalReservedStock: { $sum: '$reservedStock' },
          totalDamagedStock: { $sum: '$damagedStock' },
          lowStockCount: {
            $sum: {
              $cond: [
                { $and: [{ $gt: ['$availableStock', 0] }, { $lte: ['$availableStock', '$minimumStock'] }] },
                1,
                0
              ]
            }
          },
          outOfStockCount: {
            $sum: {
              $cond: [{ $eq: ['$availableStock', 0] }, 1, 0]
            }
          }
        }
      }
    ]) || [{ totalPhysicalStock: 0, totalAvailableStock: 0, totalReservedStock: 0, totalDamagedStock: 0, lowStockCount: 0, outOfStockCount: 0 }];

    res.json({
      success: true,
      data: {
        inventory: items,
        stats: stats || { totalPhysicalStock: 0, totalAvailableStock: 0, totalReservedStock: 0, totalDamagedStock: 0, lowStockCount: 0, outOfStockCount: 0 },
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

export const getInventoryTransactions = async (req, res) => {
  try {
    const { variantId, warehouseId, type, page = 1, limit = 30 } = req.query;
    const query = {};

    if (variantId) query.variantId = variantId;
    if (warehouseId) query.warehouseId = warehouseId;
    if (type) query.type = type;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [transactions, total] = await Promise.all([
      InventoryTransaction.find(query)
        .populate('variantId', 'sku color size')
        .populate('productId', 'name sku images')
        .populate('warehouseId', 'name code')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      InventoryTransaction.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        transactions,
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

/**
 * Manual stock adjustment with mandatory reason
 */
export const adjustStock = async (req, res) => {
  try {
    const { variantId, warehouseId, quantity, type, reason } = req.body;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        code: 'REASON_REQUIRED',
        message: 'A mandatory reason must be provided for manual stock adjustments.'
      });
    }

    if (quantity === 0) {
      return res.status(400).json({ success: false, message: 'Adjustment quantity cannot be 0' });
    }

    const adjustmentType = type === 'DAMAGE'
      ? INVENTORY_TRANSACTION_TYPES.DAMAGE
      : INVENTORY_TRANSACTION_TYPES.ADJUSTMENT;

    const result = await inventoryService.mutateStock({
      variantId,
      warehouseId,
      type: adjustmentType,
      quantity: Number(quantity),
      referenceType: 'ManualAdjustment',
      referenceId: `ADJ-${Date.now()}`,
      reason: reason.trim(),
      userId: req.user._id
    });

    await logAudit({
      req,
      action: 'STOCK_ADJUSTED',
      module: 'Inventory',
      entityId: variantId,
      newValue: { quantity, reason, newStock: result.inventory.physicalStock },
      reason: reason.trim()
    });

    createNotification({
      title: Number(quantity) > 0 ? 'Stock Ingested / Added' : 'Stock Adjusted',
      message: `${Math.abs(Number(quantity))} units ${Number(quantity) > 0 ? 'added to' : 'deducted from'} inventory. Reason: ${reason.trim()}`,
      type: 'INVENTORY_ADDED',
      link: '/inventory',
      metadata: {
        adjustment: `${Number(quantity) > 0 ? '+' : ''}${quantity} units`,
        newPhysicalStock: `${result.inventory.physicalStock} units`,
        newAvailableStock: `${result.inventory.availableStock} units`,
        reason: reason.trim(),
        adjustedBy: req.user?.name || 'Administrator'
      }
    });

    res.json({
      success: true,
      message: 'Stock adjusted successfully',
      data: result
    });
  } catch (err) {
    res.status(err.code === 'INSUFFICIENT_STOCK' ? 400 : 500).json({
      success: false,
      code: err.code || 'SERVER_ERROR',
      message: err.message
    });
  }
};
