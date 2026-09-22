import { Inventory } from '../models/Inventory.js';
import { InventoryTransaction } from '../models/InventoryTransaction.js';
import { ProductVariant } from '../models/ProductVariant.js';
import { Product } from '../models/Product.js';
import { INVENTORY_TRANSACTION_TYPES, NOTIFICATION_TYPES } from '../config/constants.js';
import { emitSocketEvent } from './socketService.js';
import { createNotification } from './notificationService.js';

class InventoryService {
  /**
   * Find or create inventory record for variant at warehouse
   */
  async getOrCreateInventory(variantId, warehouseId, productId = null) {
    let inv = await Inventory.findOne({ variantId, warehouseId });
    if (!inv) {
      if (!productId) {
        const variant = await ProductVariant.findById(variantId);
        productId = variant ? variant.productId : null;
      }
      inv = await Inventory.create({
        variantId,
        productId,
        warehouseId,
        physicalStock: 0,
        reservedStock: 0,
        damagedStock: 0,
        availableStock: 0,
        minimumStock: 10
      });
    }
    return inv;
  }

  /**
   * Central atomic inventory adjuster with immutable ledger
   */
  async mutateStock({
    variantId,
    warehouseId,
    type,
    quantity, // can be positive or negative
    referenceType = null,
    referenceId = null,
    reason = '',
    userId = null
  }) {
    const inv = await this.getOrCreateInventory(variantId, warehouseId);
    const previousStock = inv.physicalStock;
    const newStock = previousStock + quantity;

    if (newStock < 0) {
      const error = new Error(`Stock cannot become negative. Current: ${previousStock}, Requested change: ${quantity}`);
      error.code = 'INSUFFICIENT_STOCK';
      throw error;
    }

    inv.physicalStock = newStock;
    inv.availableStock = Math.max(0, inv.physicalStock - inv.reservedStock - inv.damagedStock);
    await inv.save();

    // Create immutable audit ledger
    const ledger = await InventoryTransaction.create({
      variantId,
      productId: inv.productId,
      warehouseId,
      type,
      quantity,
      previousStock,
      newStock,
      referenceType,
      referenceId,
      reason,
      createdBy: userId
    });

    // Check low stock / out of stock
    if (inv.availableStock === 0) {
      const variant = await ProductVariant.findById(variantId).populate('productId');
      const title = variant?.productId?.name || 'Product';
      createNotification({
        title: 'Out of Stock Alert',
        message: `${title} (${variant?.sku}) is now OUT OF STOCK!`,
        type: NOTIFICATION_TYPES.OUT_OF_STOCK,
        link: '/inventory',
        metadata: {
          productName: title,
          sku: variant?.sku || 'N/A',
          currentStock: '0 units',
          minimumThreshold: `${inv.minimumStock} units`,
          urgency: 'CRITICAL - Restock Required'
        }
      });
      emitSocketEvent('inventory:out', { variantId, sku: variant?.sku });
    } else if (inv.availableStock <= inv.minimumStock) {
      const variant = await ProductVariant.findById(variantId).populate('productId');
      const title = variant?.productId?.name || 'Product';
      createNotification({
        title: 'Low Stock Alert',
        message: `${title} (${variant?.sku}) is running low (${inv.availableStock} remaining).`,
        type: NOTIFICATION_TYPES.LOW_STOCK,
        link: '/inventory',
        metadata: {
          productName: title,
          sku: variant?.sku || 'N/A',
          availableStock: `${inv.availableStock} units`,
          minimumThreshold: `${inv.minimumStock} units`,
          status: 'BELOW SAFETY LEVEL'
        }
      });
      emitSocketEvent('inventory:low', { variantId, sku: variant?.sku, availableStock: inv.availableStock });
    }

    // Real-time socket event for central sync across all tabs and dashboards
    emitSocketEvent('inventory:updated', {
      variantId,
      warehouseId,
      physicalStock: inv.physicalStock,
      availableStock: inv.availableStock,
      transactionType: type
    });

    return { inventory: inv, transaction: ledger };
  }

  /**
   * Order deduction: atomic check and deduction
   */
  async deductStockForOrder(order, userId = null) {
    if (order.isStockDeducted) return;

    // 1. Verify all items have enough stock first
    for (const item of order.items) {
      const inv = await this.getOrCreateInventory(item.variantId, order.warehouse, item.productId);
      if (inv.availableStock < item.quantity) {
        const error = new Error(`Insufficient stock for ${item.title} (${item.sku}). Available: ${inv.availableStock}, Required: ${item.quantity}`);
        error.code = 'INSUFFICIENT_STOCK';
        throw error;
      }
    }

    // 2. Perform deductions
    for (const item of order.items) {
      await this.mutateStock({
        variantId: item.variantId,
        warehouseId: order.warehouse,
        type: INVENTORY_TRANSACTION_TYPES.SALE,
        quantity: -item.quantity,
        referenceType: 'Order',
        referenceId: order.orderNumber,
        reason: `Sold in Order #${order.orderNumber}`,
        userId
      });
    }

    order.isStockDeducted = true;
    await order.save();
  }

  /**
   * Cancelled Order: restore stock
   */
  async restoreStockForCancelledOrder(order, reason = 'Order Cancelled', userId = null) {
    if (!order.isStockDeducted) return;

    for (const item of order.items) {
      await this.mutateStock({
        variantId: item.variantId,
        warehouseId: order.warehouse,
        type: INVENTORY_TRANSACTION_TYPES.ORDER_CANCELLED,
        quantity: item.quantity,
        referenceType: 'Order',
        referenceId: order.orderNumber,
        reason: reason || `Stock restored from cancelled Order #${order.orderNumber}`,
        userId
      });
    }

    order.isStockDeducted = false;
    await order.save();
  }

  /**
   * Return Process: Good condition restocks to physical, Damaged moves to damagedStock
   */
  async processReturnStock({ order, condition, inspectionNotes = '', userId = null }) {
    for (const item of order.items) {
      const inv = await this.getOrCreateInventory(item.variantId, order.warehouse, item.productId);

      if (condition === 'GOOD') {
        // Restock to sellable inventory
        await this.mutateStock({
          variantId: item.variantId,
          warehouseId: order.warehouse,
          type: INVENTORY_TRANSACTION_TYPES.RETURN,
          quantity: item.quantity,
          referenceType: 'Order',
          referenceId: order.orderNumber,
          reason: `Returned good condition item for Order #${order.orderNumber}. Note: ${inspectionNotes}`,
          userId
        });
      } else {
        // Damaged: increase physical, increase damagedStock (available remains unchanged)
        inv.physicalStock += item.quantity;
        inv.damagedStock += item.quantity;
        inv.availableStock = Math.max(0, inv.physicalStock - inv.reservedStock - inv.damagedStock);
        await inv.save();

        await InventoryTransaction.create({
          variantId: item.variantId,
          productId: item.productId,
          warehouseId: order.warehouse,
          type: INVENTORY_TRANSACTION_TYPES.DAMAGE,
          quantity: item.quantity,
          previousStock: inv.physicalStock - item.quantity,
          newStock: inv.physicalStock,
          referenceType: 'OrderReturn',
          referenceId: order.orderNumber,
          reason: `Damaged return inspection. ${inspectionNotes}`,
          createdBy: userId
        });

        emitSocketEvent('inventory:updated', {
          variantId: item.variantId,
          warehouseId: order.warehouse,
          physicalStock: inv.physicalStock,
          damagedStock: inv.damagedStock,
          availableStock: inv.availableStock
        });
      }
    }
  }

  /**
   * Purchase Order receiving: increase stock
   */
  async receivePurchaseStock(purchaseOrder, receivedItems, userId = null) {
    for (const item of receivedItems) {
      if (item.receivedQuantity > 0) {
        await this.mutateStock({
          variantId: item.variantId,
          warehouseId: purchaseOrder.warehouse,
          type: INVENTORY_TRANSACTION_TYPES.PURCHASE,
          quantity: item.receivedQuantity,
          referenceType: 'PurchaseOrder',
          referenceId: purchaseOrder.poNumber,
          reason: `Goods received from PO #${purchaseOrder.poNumber}`,
          userId
        });
      }
    }
  }

  /**
   * Purchase Order rollback: safely reverse received stock upon PO deletion/cancellation
   */
  async rollbackPurchaseStock(purchaseOrder, userId = null) {
    if (!purchaseOrder || !purchaseOrder.items) return;
    for (const item of purchaseOrder.items) {
      const received = Number(item.receivedQuantity || 0);
      if (received > 0) {
        await this.mutateStock({
          variantId: item.variantId,
          warehouseId: purchaseOrder.warehouse,
          type: INVENTORY_TRANSACTION_TYPES.ADJUSTMENT,
          quantity: -received,
          referenceType: 'PurchaseOrderRollback',
          referenceId: purchaseOrder.poNumber,
          reason: `Stock reversed due to deletion/cancellation of PO #${purchaseOrder.poNumber}`,
          userId
        });
      }
    }
  }

  /**
   * Inter-warehouse transfer
   */
  async transferStock({ sourceWarehouseId, destinationWarehouseId, items, transferNumber, userId = null }) {
    for (const item of items) {
      // 1. Deduct from source
      await this.mutateStock({
        variantId: item.variantId,
        warehouseId: sourceWarehouseId,
        type: INVENTORY_TRANSACTION_TYPES.WAREHOUSE_TRANSFER_OUT,
        quantity: -item.quantity,
        referenceType: 'WarehouseTransfer',
        referenceId: transferNumber,
        reason: `Transfer to destination warehouse`,
        userId
      });

      // 2. Add to destination
      await this.mutateStock({
        variantId: item.variantId,
        warehouseId: destinationWarehouseId,
        type: INVENTORY_TRANSACTION_TYPES.WAREHOUSE_TRANSFER_IN,
        quantity: item.quantity,
        referenceType: 'WarehouseTransfer',
        referenceId: transferNumber,
        reason: `Transfer received from source warehouse`,
        userId
      });
    }
  }
}

export const inventoryService = new InventoryService();
