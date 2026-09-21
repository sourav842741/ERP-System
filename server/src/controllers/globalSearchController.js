import { Product } from '../models/Product.js';
import { ProductVariant } from '../models/ProductVariant.js';
import { Order } from '../models/Order.js';
import { Customer } from '../models/Customer.js';
import { Supplier } from '../models/Supplier.js';

export const globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ success: true, data: { products: [], orders: [], customers: [], suppliers: [] } });
    }

    const regex = new RegExp(q.trim(), 'i');

    const [products, variants, orders, customers, suppliers] = await Promise.all([
      Product.find({
        isDeleted: false,
        $or: [{ name: regex }, { sku: regex }, { brand: regex }]
      }).select('name sku brand sellingPrice images').limit(5),

      ProductVariant.find({
        isDeleted: false,
        $or: [{ sku: regex }, { barcode: regex }]
      }).populate('productId', 'name sku').limit(5),

      Order.find({
        isDeleted: false,
        $or: [
          { orderNumber: regex },
          { 'customerSnapshot.name': regex },
          { 'customerSnapshot.phone': regex }
        ]
      }).select('orderNumber source total orderStatus customerSnapshot createdAt').limit(5),

      Customer.find({
        isDeleted: false,
        $or: [{ name: regex }, { phone: regex }, { email: regex }]
      }).select('name phone email city').limit(5),

      Supplier.find({
        isDeleted: false,
        $or: [{ name: regex }, { company: regex }, { phone: regex }]
      }).select('name company phone').limit(5)
    ]);

    res.json({
      success: true,
      data: {
        products,
        variants,
        orders,
        customers,
        suppliers
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
