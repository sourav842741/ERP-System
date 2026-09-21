import { Customer } from '../models/Customer.js';
import { Order } from '../models/Order.js';

export const getCustomers = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const query = { isDeleted: false };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [customers, total] = await Promise.all([
      Customer.find(query).sort({ updatedAt: -1 }).skip(skip).limit(parseInt(limit, 10)),
      Customer.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        customers,
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

export const getCustomerDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findById(id);
    if (!customer || customer.isDeleted) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const orders = await Order.find({ customer: id, isDeleted: false }).sort({ createdAt: -1 });

    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, o) => (o.paymentStatus === 'PAID' || o.orderStatus === 'DELIVERED' ? sum + o.total : sum), 0);
    const returnedOrders = orders.filter((o) => o.orderStatus === 'RETURNED').length;
    const cancelledOrders = orders.filter((o) => o.orderStatus === 'CANCELLED').length;
    const avgOrderValue = totalOrders > 0 ? Math.round(totalSpent / totalOrders) : 0;

    res.json({
      success: true,
      data: {
        customer,
        orders,
        analytics: {
          totalOrders,
          totalSpent,
          returnedOrders,
          cancelledOrders,
          avgOrderValue,
          lastOrder: orders[0]?.createdAt || null
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createCustomer = async (req, res) => {
  try {
    const { name, phone, email, address, city, state, postalCode } = req.body;
    const customer = await Customer.create({
      name,
      phone,
      email: email ? email.toLowerCase() : '',
      address,
      city,
      state,
      postalCode
    });

    res.status(201).json({ success: true, message: 'Customer created successfully', data: { customer } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByIdAndUpdate(id, req.body, { new: true });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, message: 'Customer updated successfully', data: { customer } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
