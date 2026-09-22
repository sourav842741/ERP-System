import { Product } from '../models/Product.js';
import { ProductVariant } from '../models/ProductVariant.js';
import { Category } from '../models/Category.js';
import { Warehouse } from '../models/Warehouse.js';
import { Inventory } from '../models/Inventory.js';
import { INVENTORY_TRANSACTION_TYPES } from '../config/constants.js';
import { inventoryService } from '../services/inventoryService.js';
import { logAudit } from '../middlewares/auditMiddleware.js';

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
      if (!acc[vId]) acc[vId] = { physicalStock: 0, availableStock: 0, reservedStock: 0 };
      acc[vId].physicalStock += inv.physicalStock;
      acc[vId].availableStock += inv.availableStock;
      acc[vId].reservedStock += inv.reservedStock;
      return acc;
    }, {});

    const variantsWithStock = variants.map((v) => ({
      ...v.toObject(),
      stock: invMap[String(v._id)] || { physicalStock: 0, availableStock: 0, reservedStock: 0 }
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

      return {
        ...p.toObject(),
        variants: pVars,
        totalStock: totalPhysical,
        availableStock: totalAvailable
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
    const updates = req.body;

    const product = await Product.findById(id);
    if (!product || product.isDeleted) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Assign updates
    Object.assign(product, updates);
    await product.save();

    await logAudit({
      req,
      action: 'PRODUCT_UPDATED',
      module: 'Products',
      entityId: id,
      reason: 'Product updated'
    });

    res.json({ success: true, message: 'Product updated successfully', data: { product } });
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
    await ProductVariant.updateMany({ productId: id }, { isDeleted: true });

    await logAudit({
      req,
      action: 'PRODUCT_DELETED',
      module: 'Products',
      entityId: id,
      reason: 'Product soft deleted'
    });

    res.json({ success: true, message: 'Product deleted successfully' });
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
      await ProductVariant.updateMany({ productId: { $in: ids } }, { isDeleted: true });
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
