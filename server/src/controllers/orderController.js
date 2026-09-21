import { Order } from '../models/Order.js';
import { Customer } from '../models/Customer.js';
import { Warehouse } from '../models/Warehouse.js';
import { ORDER_STATUSES, NOTIFICATION_TYPES } from '../config/constants.js';
import { inventoryService } from '../services/inventoryService.js';
import { emitSocketEvent } from '../services/socketService.js';
import { createNotification } from '../services/notificationService.js';
import { enqueueEmail } from '../services/emailService.js';
import { logAudit } from '../middlewares/auditMiddleware.js';

export const getOrders = async (req, res) => {
  try {
    const { status, source, search, startDate, endDate, page = 1, limit = 20 } = req.query;
    const query = { isDeleted: false };

    if (status) query.orderStatus = status;
    if (source) query.source = source;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'customerSnapshot.name': { $regex: search, $options: 'i' } },
        { 'customerSnapshot.phone': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('warehouse', 'name code')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Order.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        orders,
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

export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id)
      .populate('warehouse')
      .populate('customer')
      .populate('createdBy', 'name email');

    if (!order || order.isDeleted) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, data: { order } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createOrder = async (req, res) => {
  try {
    const {
      orderNumber: customOrderNumber,
      source,
      customerData, // { name, phone, email, address, city, state, postalCode }
      items, // [{ variantId, productId, sku, title, quantity, unitPrice, costPrice }]
      discount = 0,
      shippingFee = 0,
      tax = 0,
      notes = '',
      warehouseId
    } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ success: false, message: 'Order must contain at least one item' });
    }

    // Determine warehouse (default if not specified)
    let warehouse = null;
    if (warehouseId) warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) warehouse = await Warehouse.findOne({ isDefault: true }) || await Warehouse.findOne();

    if (!warehouse) {
      return res.status(400).json({ success: false, message: 'No warehouse found in the system' });
    }

    // 1. Calculate totals
    const calculatedItems = items.map((item) => ({
      ...item,
      subtotal: Number(item.unitPrice) * Number(item.quantity)
    }));

    const subtotal = calculatedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const total = subtotal - Number(discount) + Number(shippingFee) + Number(tax);

    // 2. Handle or find customer
    let customer = null;
    if (customerData?.phone || customerData?.email) {
      const customerQuery = [];
      if (customerData.phone) customerQuery.push({ phone: customerData.phone });
      if (customerData.email) customerQuery.push({ email: customerData.email.toLowerCase() });

      customer = await Customer.findOne({ $or: customerQuery });
      if (!customer) {
        customer = await Customer.create({
          name: customerData.name || 'Walk-in Customer',
          phone: customerData.phone || '',
          email: customerData.email ? customerData.email.toLowerCase() : '',
          address: customerData.address || '',
          city: customerData.city || '',
          state: customerData.state || '',
          postalCode: customerData.postalCode || ''
        });
      }
    }

    // 3. Determine order number (Custom manual input or auto-generated)
    let orderNumber = customOrderNumber ? String(customOrderNumber).trim().toUpperCase() : '';
    if (orderNumber) {
      const existing = await Order.findOne({ orderNumber });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Order ID "${orderNumber}" already exists in the system. Please provide a unique Order ID.`
        });
      }
    } else {
      const orderCount = await Order.countDocuments();
      orderNumber = `ORD-${Date.now().toString().slice(-6)}-${orderCount + 1}`;
    }

    // 4. Create Order instance
    const order = new Order({
      orderNumber,
      source: source || 'Manual',
      customer: customer?._id || null,
      customerSnapshot: {
        name: customerData?.name || 'Walk-in Customer',
        phone: customerData?.phone || '',
        email: customerData?.email || '',
        address: customerData?.address || ''
      },
      warehouse: warehouse._id,
      items: calculatedItems,
      subtotal,
      discount: Number(discount),
      shippingFee: Number(shippingFee),
      tax: Number(tax),
      total,
      notes,
      orderStatus: ORDER_STATUSES.CONFIRMED,
      paymentStatus: 'PENDING',
      createdBy: req.user?._id,
      shippingAddress: {
        street: customerData?.address || '',
        city: customerData?.city || '',
        state: customerData?.state || '',
        postalCode: customerData?.postalCode || ''
      }
    });

    // 5. Deduct inventory centrally & atomic stock check
    await inventoryService.deductStockForOrder(order, req.user?._id);

    // 6. Save order
    await order.save();

    // 7. Update customer metrics
    if (customer) {
      customer.totalOrders += 1;
      customer.totalSpent += total;
      customer.lastOrderDate = new Date();
      await customer.save();
    }

    createNotification({
      title: 'New Order Received',
      message: `Order #${orderNumber} for ₹${total.toLocaleString()} from ${order.source}`,
      type: NOTIFICATION_TYPES.NEW_ORDER,
      link: '/orders',
      metadata: {
        orderNumber: `#${orderNumber}`,
        source: order.source,
        totalAmount: `₹${total.toLocaleString()}`,
        customerName: customerData?.name || 'Direct Customer',
        paymentMethod: order.paymentMethod,
        itemsCount: items.length
      }
    });
    emitSocketEvent('order:created', order);

    // 9. Enqueue confirmation email (non-blocking)
    if (customerData?.email) {
      enqueueEmail({
        to: customerData.email,
        subject: `Order Confirmation - #${orderNumber}`,
        html: `<h2>Thank you for your order!</h2><p>Your order #${orderNumber} has been confirmed. Total: ₹${total.toLocaleString()}</p>`
      });
    }

    // 10. Audit log
    await logAudit({
      req,
      action: 'ORDER_CREATED',
      module: 'Orders',
      entityId: order._id,
      newValue: { orderNumber, total, itemCount: items.length },
      reason: `Order #${orderNumber} created`
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: { order }
    });
  } catch (err) {
    res.status(err.code === 'INSUFFICIENT_STOCK' ? 400 : 500).json({
      success: false,
      code: err.code || 'SERVER_ERROR',
      message: err.message
    });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus, paymentStatus, cancellationReason } = req.body;

    const order = await Order.findById(id);
    if (!order || order.isDeleted) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const prevStatus = order.orderStatus;

    // Handle cancellation: restore stock automatically
    if (orderStatus === ORDER_STATUSES.CANCELLED && prevStatus !== ORDER_STATUSES.CANCELLED) {
      order.orderStatus = ORDER_STATUSES.CANCELLED;
      order.cancellationReason = cancellationReason || 'Cancelled by user';
      await inventoryService.restoreStockForCancelledOrder(order, order.cancellationReason, req.user?._id);

      createNotification({
        title: 'Order Cancelled',
        message: `Order #${order.orderNumber} was cancelled. Inventory restored.`,
        type: NOTIFICATION_TYPES.ORDER_CANCELLED,
        link: '/orders'
      });
      emitSocketEvent('order:cancelled', { orderNumber: order.orderNumber });
    } else if (orderStatus) {
      order.orderStatus = orderStatus;
    }

    if (paymentStatus) order.paymentStatus = paymentStatus;

    await order.save();

    emitSocketEvent('order:updated', order);

    await logAudit({
      req,
      action: 'ORDER_STATUS_UPDATED',
      module: 'Orders',
      entityId: id,
      oldValue: { status: prevStatus },
      newValue: { status: order.orderStatus, paymentStatus: order.paymentStatus },
      reason: `Status changed from ${prevStatus} to ${order.orderStatus}`
    });

    res.json({ success: true, message: 'Order status updated successfully', data: { order } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const processReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const { condition = 'GOOD', inspectionNotes = '', reason = '' } = req.body;

    const order = await Order.findById(id);
    if (!order || order.isDeleted) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.returnDetails?.isRestocked) {
      return res.status(400).json({ success: false, message: 'This return has already been processed and restocked.' });
    }

    // Process return via central inventory service
    await inventoryService.processReturnStock({
      order,
      condition,
      inspectionNotes,
      userId: req.user?._id
    });

    order.orderStatus = ORDER_STATUSES.RETURNED;
    order.returnDetails = {
      receivedAt: new Date(),
      reason,
      condition,
      inspectionNotes,
      isRestocked: true
    };
    await order.save();

    createNotification({
      title: 'Return Processed',
      message: `Return for Order #${order.orderNumber} inspected as ${condition}. Stock updated.`,
      type: NOTIFICATION_TYPES.RETURN_RECEIVED,
      link: '/orders'
    });

    emitSocketEvent('order:updated', order);

    await logAudit({
      req,
      action: 'ORDER_RETURN_PROCESSED',
      module: 'Orders',
      entityId: id,
      newValue: { condition, inspectionNotes },
      reason: `Return processed: ${condition}`
    });

    res.json({ success: true, message: `Return processed. Inventory adjusted (${condition}).`, data: { order } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
