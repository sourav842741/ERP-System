import { Supplier } from '../models/Supplier.js';
import { PurchaseOrder } from '../models/PurchaseOrder.js';
import { Warehouse } from '../models/Warehouse.js';
import { PURCHASE_STATUSES, NOTIFICATION_TYPES } from '../config/constants.js';
import { inventoryService } from '../services/inventoryService.js';
import { createNotification } from '../services/notificationService.js';
import { emitSocketEvent } from '../services/socketService.js';
import { logAudit } from '../middlewares/auditMiddleware.js';

// ================= SUPPLIER CONTROLLERS =================
export const getSuppliers = async (req, res) => {
  try {
    const { search } = req.query;
    const query = { isDeleted: false };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { gstin: { $regex: search, $options: 'i' } }
      ];
    }

    const suppliers = await Supplier.find(query).sort({ updatedAt: -1 });
    res.json({ success: true, data: { suppliers } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.create(req.body);
    await logAudit({
      req,
      action: 'SUPPLIER_CREATED',
      module: 'Purchases',
      entityId: supplier._id,
      newValue: { name: supplier.name, company: supplier.company },
      reason: 'New supplier registered'
    });
    res.status(201).json({ success: true, message: 'Supplier created successfully', data: { supplier } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await Supplier.findByIdAndUpdate(id, req.body, { new: true });
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });

    await logAudit({
      req,
      action: 'SUPPLIER_UPDATED',
      module: 'Purchases',
      entityId: supplier._id,
      newValue: { name: supplier.name, company: supplier.company },
      reason: 'Supplier details updated'
    });

    res.json({ success: true, message: 'Supplier updated successfully', data: { supplier } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await Supplier.findById(id);
    if (!supplier || supplier.isDeleted) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    // Check for active (non-cancelled, non-deleted) POs
    const activePOCount = await PurchaseOrder.countDocuments({
      supplier: id,
      isDeleted: false,
      status: { $in: [PURCHASE_STATUSES.ORDERED, PURCHASE_STATUSES.PARTIALLY_RECEIVED] }
    });

    if (activePOCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete supplier with ${activePOCount} active purchase order(s). Please receive or cancel them first.`
      });
    }

    supplier.isDeleted = true;
    await supplier.save();

    await logAudit({
      req,
      action: 'SUPPLIER_DELETED',
      module: 'Purchases',
      entityId: id,
      oldValue: { name: supplier.name, company: supplier.company },
      reason: 'Supplier removed'
    });

    res.json({ success: true, message: 'Supplier deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ================= PURCHASE ORDER CONTROLLERS =================
export const getPurchaseOrders = async (req, res) => {
  try {
    const { status, supplierId, page = 1, limit = 20 } = req.query;
    const query = { isDeleted: false };

    if (status) query.status = status;
    if (supplierId) query.supplier = supplierId;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [orders, total] = await Promise.all([
      PurchaseOrder.find(query)
        .populate('supplier', 'name company phone')
        .populate('warehouse', 'name code')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      PurchaseOrder.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        purchaseOrders: orders,
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

export const createPurchaseOrder = async (req, res) => {
  try {
    const { supplierId, warehouseId, items, discount = 0, shippingCost = 0, notes = '' } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ success: false, message: 'PO must have at least one line item' });
    }

    let warehouse = null;
    if (warehouseId) warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) warehouse = await Warehouse.findOne({ isDefault: true }) || await Warehouse.findOne();

    const calculatedItems = items.map((item) => {
      const lineSubtotal = Number(item.quantity) * Number(item.unitCost);
      const taxAmount = (lineSubtotal * Number(item.taxPercent || 0)) / 100;
      return {
        ...item,
        subtotal: lineSubtotal + taxAmount
      };
    });

    const subtotal = calculatedItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitCost)), 0);
    const taxTotal = calculatedItems.reduce((sum, item) => sum + (item.subtotal - (Number(item.quantity) * Number(item.unitCost))), 0);
    const total = subtotal + taxTotal - Number(discount) + Number(shippingCost);

    const poCount = await PurchaseOrder.countDocuments();
    const poNumber = `PO-${Date.now().toString().slice(-6)}-${poCount + 1}`;

    const po = await PurchaseOrder.create({
      poNumber,
      supplier: supplierId,
      warehouse: warehouse._id,
      items: calculatedItems,
      subtotal,
      taxTotal,
      discount: Number(discount),
      shippingCost: Number(shippingCost),
      total,
      status: PURCHASE_STATUSES.ORDERED,
      notes,
      createdBy: req.user?._id
    });

    // Update supplier purchases count and pending balance
    await Supplier.findByIdAndUpdate(supplierId, {
      $inc: { totalPurchases: 1, pendingAmount: total }
    });

    await logAudit({
      req,
      action: 'PURCHASE_ORDER_CREATED',
      module: 'Purchases',
      entityId: po._id,
      newValue: { poNumber, total, supplierId },
      reason: `PO #${poNumber} issued`
    });

    res.status(201).json({ success: true, message: 'Purchase Order created successfully', data: { purchaseOrder: po } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Goods receiving: updates inventory and marks PO received
 */
export const receivePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { receivedItems } = req.body; // array of { variantId, receivedQuantity }

    const po = await PurchaseOrder.findById(id);
    if (!po || po.isDeleted) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    if (po.status === PURCHASE_STATUSES.RECEIVED) {
      return res.status(400).json({ success: false, message: 'This purchase order has already been fully received.' });
    }

    // Map received items
    const receivingList = [];
    let allFullyReceived = true;

    po.items = po.items.map((item) => {
      const match = receivedItems?.find((r) => String(r.variantId) === String(item.variantId));
      const newReceivedQty = match ? Number(match.receivedQuantity) : (item.quantity - item.receivedQuantity);

      if (newReceivedQty > 0) {
        receivingList.push({
          variantId: item.variantId,
          receivedQuantity: newReceivedQty
        });
        item.receivedQuantity = (item.receivedQuantity || 0) + newReceivedQty;
      }

      if (item.receivedQuantity < item.quantity) {
        allFullyReceived = false;
      }
      return item;
    });

    // Increase physical stock centrally
    await inventoryService.receivePurchaseStock(po, receivingList, req.user?._id);

    po.status = allFullyReceived ? PURCHASE_STATUSES.RECEIVED : PURCHASE_STATUSES.PARTIALLY_RECEIVED;
    po.receivedAt = new Date();
    await po.save();

    createNotification({
      title: 'Goods Received (PO)',
      message: `Goods received for PO #${po.poNumber}. Stock updated in warehouse.`,
      type: NOTIFICATION_TYPES.PURCHASE_RECEIVED,
      link: '/purchases',
      metadata: {
        poNumber: `#${po.poNumber}`,
        status: po.status,
        supplierName: po.supplierName || 'Verified Vendor',
        totalAmount: `₹${po.totalAmount?.toLocaleString() || '0'}`,
        receivedBy: req.user?.name || 'Warehouse Staff'
      }
    });

    emitSocketEvent('purchase:received', po);

    await logAudit({
      req,
      action: 'PURCHASE_ORDER_RECEIVED',
      module: 'Purchases',
      entityId: id,
      newValue: { status: po.status, receivedCount: receivingList.length },
      reason: `PO #${po.poNumber} goods received`
    });

    res.json({
      success: true,
      message: `Goods received successfully. Status: ${po.status}`,
      data: { purchaseOrder: po }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updatePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { supplierId, warehouseId, items, discount = 0, shippingCost = 0, notes, paymentStatus, paidAmount, status } = req.body;

    const po = await PurchaseOrder.findById(id);
    if (!po || po.isDeleted) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    const oldTotal = po.total || 0;

    if (supplierId && String(supplierId) !== String(po.supplier)) {
      po.supplier = supplierId;
    }

    if (warehouseId) {
      po.warehouse = warehouseId;
    }

    if (notes !== undefined) po.notes = notes;
    if (paymentStatus) po.paymentStatus = paymentStatus;
    if (paidAmount !== undefined) po.paidAmount = Number(paidAmount);
    if (status && Object.values(PURCHASE_STATUSES).includes(status)) {
      po.status = status;
    }

    // Only allow updating line items if the PO has NOT been partially or fully received
    if (items && items.length > 0) {
      if (po.status === PURCHASE_STATUSES.RECEIVED || po.status === PURCHASE_STATUSES.PARTIALLY_RECEIVED) {
        return res.status(400).json({
          success: false,
          message: 'Cannot modify items on a Purchase Order that has already received goods. You can only update payment status or notes.'
        });
      }

      const calculatedItems = items.map((item) => {
        const lineSubtotal = Number(item.quantity) * Number(item.unitCost);
        const taxAmount = (lineSubtotal * Number(item.taxPercent || 0)) / 100;
        return {
          ...item,
          subtotal: lineSubtotal + taxAmount
        };
      });

      const subtotal = calculatedItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitCost)), 0);
      const taxTotal = calculatedItems.reduce((sum, item) => sum + (item.subtotal - (Number(item.quantity) * Number(item.unitCost))), 0);
      const total = subtotal + taxTotal - Number(discount || 0) + Number(shippingCost || 0);

      po.items = calculatedItems;
      po.subtotal = subtotal;
      po.taxTotal = taxTotal;
      po.discount = Number(discount || 0);
      po.shippingCost = Number(shippingCost || 0);
      po.total = total;

      // Adjust pending balance difference for supplier
      const totalDiff = total - oldTotal;
      if (totalDiff !== 0) {
        await Supplier.findByIdAndUpdate(po.supplier, {
          $inc: { pendingAmount: totalDiff }
        });
      }
    }

    await po.save();

    await logAudit({
      req,
      action: 'PURCHASE_ORDER_UPDATED',
      module: 'Purchases',
      entityId: po._id,
      newValue: { poNumber: po.poNumber, total: po.total, status: po.status },
      reason: `PO #${po.poNumber} updated`
    });

    const updatedPO = await PurchaseOrder.findById(po._id)
      .populate('supplier', 'name company phone')
      .populate('warehouse', 'name code')
      .populate('createdBy', 'name');

    res.json({ success: true, message: 'Purchase Order updated successfully', data: { purchaseOrder: updatedPO } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deletePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const po = await PurchaseOrder.findById(id);
    if (!po || po.isDeleted) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    // 1. If PO had any received items, rollback physical stock in warehouse
    const hasReceived = po.items?.some((i) => (i.receivedQuantity || 0) > 0);
    if (hasReceived) {
      await inventoryService.rollbackPurchaseStock(po, req.user?._id);
    }

    // 2. Adjust supplier stats (decrease totalPurchases and pending balance)
    const unpaidBalance = Math.max(0, (po.total || 0) - (po.paidAmount || 0));
    await Supplier.findByIdAndUpdate(po.supplier, {
      $inc: {
        totalPurchases: -1,
        pendingAmount: -unpaidBalance
      }
    });

    po.isDeleted = true;
    po.status = PURCHASE_STATUSES.CANCELLED;
    await po.save();

    await logAudit({
      req,
      action: 'PURCHASE_ORDER_DELETED',
      module: 'Purchases',
      entityId: po._id,
      oldValue: { poNumber: po.poNumber, total: po.total },
      reason: `PO #${po.poNumber} deleted (Stock reversed: ${hasReceived ? 'YES' : 'NO'})`
    });

    emitSocketEvent('purchase:deleted', { poId: po._id, poNumber: po.poNumber });

    res.json({
      success: true,
      message: `Purchase Order #${po.poNumber} deleted successfully.${hasReceived ? ' Received warehouse stock was automatically restored.' : ''}`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

