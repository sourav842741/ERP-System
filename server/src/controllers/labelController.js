import { LabelTemplate } from '../models/LabelTemplate.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { ProductVariant } from '../models/ProductVariant.js';
import { WarehouseBin } from '../models/WarehouseBin.js';

/**
 * Controller for Barcode, SKU Tag & Thermal Shipping Label Generator
 */

// Initial Default Templates Seeder Helper
const seedDefaultTemplatesIfNeeded = async () => {
  const count = await LabelTemplate.countDocuments();
  if (count === 0) {
    await LabelTemplate.create([
      {
        name: 'Standard 4x6 Thermal Shipping Label',
        type: 'shipping_label',
        dimensions: { width: 4, height: 6, unit: 'in' },
        settings: {
          showMRP: false,
          showStoreLogo: true,
          showStoreName: true,
          storeName: 'Nexus Fulfillment Hub',
          storeAddress: 'Plot 42, Logistics Park, Okhla Ind Area, New Delhi - 110020',
          storeGSTIN: '07AAAAA0000A1Z5',
          showQR: true,
          barcodeType: 'CODE128',
          barcodeHeight: 50,
          showReturnAddress: true,
          disclaimerText: 'Standard E-Commerce Courier Dispatch. Check tamper evident seal before acceptance.'
        },
        isDefault: true
      },
      {
        name: '50x25mm Retail SKU & Price Barcode Tag',
        type: 'sku_barcode_tag',
        dimensions: { width: 50, height: 25, unit: 'mm' },
        settings: {
          showMRP: true,
          showStoreLogo: false,
          showStoreName: true,
          storeName: 'NEXUS RETAIL',
          showQR: false,
          barcodeType: 'CODE128',
          barcodeHeight: 35
        },
        isDefault: true
      },
      {
        name: 'A4 Warehouse Picking & Packing Slip',
        type: 'packing_slip',
        dimensions: { width: 210, height: 297, unit: 'mm' },
        settings: {
          showMRP: true,
          showStoreLogo: true,
          showStoreName: true,
          storeName: 'Nexus Central Warehouse',
          storeAddress: 'Warehouse A, Sector 18, Gurugram, Haryana - 122015',
          storeGSTIN: '06AAAAA0000A1Z5',
          showQR: true,
          barcodeType: 'CODE128',
          barcodeHeight: 40
        },
        isDefault: true
      }
    ]);
  }
};

// 1. Get Label Templates
export const getLabelTemplates = async (req, res, next) => {
  try {
    await seedDefaultTemplatesIfNeeded();
    const { type } = req.query;
    const query = {};
    if (type && type !== 'all') query.type = type;

    const templates = await LabelTemplate.find(query).sort({ isDefault: -1, createdAt: -1 }).lean();
    res.json({ success: true, count: templates.length, data: templates });
  } catch (error) {
    next(error);
  }
};

// 2. Create Label Template
export const createLabelTemplate = async (req, res, next) => {
  try {
    const { name, type, dimensions, settings, isDefault } = req.body;
    if (!name || !type) {
      return res.status(400).json({ success: false, message: 'Template name and type are required' });
    }

    if (isDefault) {
      await LabelTemplate.updateMany({ type }, { isDefault: false });
    }

    const template = await LabelTemplate.create({
      name,
      type,
      dimensions: dimensions || { width: 4, height: 6, unit: 'in' },
      settings: settings || {},
      isDefault: Boolean(isDefault),
      createdBy: req.user?._id
    });

    res.status(201).json({ success: true, data: template, message: 'Label template created successfully' });
  } catch (error) {
    next(error);
  }
};

// 3. Update Label Template
export const updateLabelTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, dimensions, settings, isDefault } = req.body;

    const template = await LabelTemplate.findById(id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

    if (isDefault) {
      await LabelTemplate.updateMany({ type: template.type, _id: { $ne: id } }, { isDefault: false });
    }

    if (name) template.name = name;
    if (dimensions) template.dimensions = dimensions;
    if (settings) template.settings = { ...template.settings, ...settings };
    if (isDefault !== undefined) template.isDefault = Boolean(isDefault);

    await template.save();
    res.json({ success: true, data: template, message: 'Label template updated successfully' });
  } catch (error) {
    next(error);
  }
};

// 4. Delete Label Template
export const deleteLabelTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const template = await LabelTemplate.findById(id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

    await LabelTemplate.findByIdAndDelete(id);
    res.json({ success: true, message: 'Label template deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// 5. Get Order Shipping Label Data (Payload for 4x6 Thermal Print)
export const getOrderShippingLabelData = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId)
      .populate('warehouse')
      .populate('customer')
      .lean();

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Look up warehouse bins for picking locations
    const skus = (order.items || []).map((i) => i.sku);
    const bins = await WarehouseBin.find({
      'assignedSkus.sku': { $in: skus }
    }).lean();

    const binMap = {};
    bins.forEach((b) => {
      b.assignedSkus?.forEach((item) => {
        binMap[item.sku] = `${b.zone} - ${b.binCode}`;
      });
    });

    const enrichedItems = (order.items || []).map((item) => ({
      ...item,
      binLocation: binMap[item.sku] || 'Central Area'
    }));

    const awb = order.trackingNumber || `AWB-${order.orderNumber?.replace(/[^a-zA-Z0-9]/g, '') || Date.now()}`;

    res.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        invoiceNumber: order.invoiceNumber,
        source: order.source,
        date: order.createdAt,
        carrier: order.shippingCarrier || 'Delhivery / Bluedart',
        trackingNumber: awb,
        paymentMethod: order.paymentMethod || 'COD',
        paymentStatus: order.paymentStatus || 'PENDING',
        total: order.total,
        isCod: (order.paymentMethod || 'COD').toUpperCase() === 'COD',
        codAmount: (order.paymentMethod || 'COD').toUpperCase() === 'COD' ? order.total : 0,
        sender: {
          name: order.warehouse?.name || 'Nexus Central Fulfillment Hub',
          address: order.warehouse?.address || 'Warehouse Hub 1, Sector 62',
          city: order.warehouse?.city || 'Noida',
          state: order.warehouse?.state || 'Uttar Pradesh',
          postalCode: order.warehouse?.postalCode || '201301',
          gstin: '09AAECN1234F1Z5'
        },
        recipient: {
          name: order.customerSnapshot?.name || 'Valued Customer',
          phone: order.customerSnapshot?.phone || 'N/A',
          street: order.shippingAddress?.street || order.customerSnapshot?.address || '',
          city: order.shippingAddress?.city || '',
          state: order.shippingAddress?.state || '',
          postalCode: order.shippingAddress?.postalCode || ''
        },
        items: enrichedItems,
        totalItemsCount: enrichedItems.reduce((sum, item) => sum + (item.quantity || 1), 0),
        weightGrams: enrichedItems.length * 450 // approximate fallback
      }
    });
  } catch (error) {
    next(error);
  }
};

// 6. Get Product Barcode Tags Data (Payload for 50x25mm Price/SKU Tags)
export const getProductBarcodeTagsData = async (req, res, next) => {
  try {
    const { productIds, variantIds } = req.body; // array of IDs

    const tags = [];

    if (productIds && productIds.length > 0) {
      const products = await Product.find({ _id: { $in: productIds } })
        .populate('variants')
        .populate('category')
        .lean();

      products.forEach((p) => {
        if (p.variants && p.variants.length > 0) {
          p.variants.forEach((v) => {
            tags.push({
              productId: p._id,
              variantId: v._id,
              title: p.name,
              sku: v.sku || p.sku,
              barcode: v.barcode || v.sku || p.sku,
              attributes: v.attributes ? Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(' | ') : '',
              color: v.color || '',
              size: v.size || '',
              mrp: v.mrp || p.mrp || 999,
              sellingPrice: v.sellingPrice || p.sellingPrice || 499,
              category: p.category?.name || 'Retail'
            });
          });
        } else {
          tags.push({
            productId: p._id,
            title: p.name,
            sku: p.sku,
            barcode: p.barcode || p.sku,
            mrp: p.mrp || 999,
            sellingPrice: p.sellingPrice || 499,
            category: p.category?.name || 'Retail'
          });
        }
      });
    } else if (variantIds && variantIds.length > 0) {
      const variants = await ProductVariant.find({ _id: { $in: variantIds } })
        .populate('productId')
        .lean();

      variants.forEach((v) => {
        tags.push({
          productId: v.productId?._id,
          variantId: v._id,
          title: v.productId?.name || 'Product',
          sku: v.sku,
          barcode: v.barcode || v.sku,
          attributes: v.attributes ? Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(' | ') : '',
          color: v.color || '',
          size: v.size || '',
          mrp: v.mrp || v.productId?.mrp || 999,
          sellingPrice: v.sellingPrice || v.productId?.sellingPrice || 499
        });
      });
    }

    res.json({ success: true, count: tags.length, data: tags });
  } catch (error) {
    next(error);
  }
};

export default {
  getLabelTemplates,
  createLabelTemplate,
  updateLabelTemplate,
  deleteLabelTemplate,
  getOrderShippingLabelData,
  getProductBarcodeTagsData
};
