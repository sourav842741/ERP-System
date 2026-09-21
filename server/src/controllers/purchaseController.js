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
    res.json({ success: true, message: 'Supplier updated successfully', data: { supplier } });
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
