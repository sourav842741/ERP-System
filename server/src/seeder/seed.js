import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Permission } from '../models/Permission.js';
import { Role } from '../models/Role.js';
import { User } from '../models/User.js';
import { Warehouse } from '../models/Warehouse.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { ProductVariant } from '../models/ProductVariant.js';
import { Inventory } from '../models/Inventory.js';
import { InventoryTransaction } from '../models/InventoryTransaction.js';
import { Customer } from '../models/Customer.js';
import { Supplier } from '../models/Supplier.js';
import { Expense } from '../models/Expense.js';
import { MarketplaceListing } from '../models/MarketplaceListing.js';
import { DEFAULT_PERMISSIONS, INVENTORY_TRANSACTION_TYPES } from '../config/constants.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly check server/.env, root/.env, and process.cwd()
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const seed = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/erp_system';
    console.log(`[Seeder] Loaded MONGO_URI: ${mongoURI}`);
    console.log(`[Seeder] Connecting to MongoDB...`);
    await mongoose.connect(mongoURI);

    console.log('[Seeder] Cleaning existing collections...');
    await Promise.all([
      Permission.deleteMany({}),
      Role.deleteMany({}),
      User.deleteMany({}),
      Warehouse.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      ProductVariant.deleteMany({}),
      Inventory.deleteMany({}),
      InventoryTransaction.deleteMany({}),
      Customer.deleteMany({}),
      Supplier.deleteMany({}),
      Expense.deleteMany({}),
      MarketplaceListing.deleteMany({})
    ]);

    // 1. Seed Permissions
    console.log('[Seeder] Seeding default permissions...');
    await Permission.insertMany(DEFAULT_PERMISSIONS);
    const allPermCodes = DEFAULT_PERMISSIONS.map((p) => p.code);

    // 2. Seed Roles
    console.log('[Seeder] Seeding system roles...');
    const superAdminRole = await Role.create({
      name: 'Super Admin',
      description: 'Unrestricted system access to all ERP modules',
      permissions: allPermCodes,
      isSystem: true
    });

    const inventorySupervisorRole = await Role.create({
      name: 'Inventory Supervisor',
      description: 'Can manage stock levels, transfers, and product variants',
      permissions: [
        'dashboard:view', 'product:read', 'product:create', 'product:update',
        'inventory:view', 'inventory:adjust', 'inventory:transfer',
        'order:read', 'purchase:read', 'report:view'
      ],
      isSystem: false
    });

    const orderManagerRole = await Role.create({
      name: 'Order Manager',
      description: 'Can create orders, process shipments, and manage returns',
      permissions: [
        'dashboard:view', 'order:read', 'order:create', 'order:update', 'order:cancel',
        'inventory:view', 'customer:read', 'customer:create', 'customer:update',
        'marketplace:read', 'report:view'
      ],
      isSystem: false
    });

    // 3. Seed Default Admin User
    console.log('[Seeder] Seeding default administrator...');
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@erp.com',
      password: 'adminpassword123',
      phone: '+91 9876543210',
      role: superAdminRole._id,
      status: 'active'
    });

    // 4. Seed Warehouses
    console.log('[Seeder] Seeding primary warehouses...');
    const warehouseKolkata = await Warehouse.create({
      name: 'Kolkata Central Hub',
      code: 'CCU-01',
      address: 'Plot 45, Sector V, Salt Lake',
      city: 'Kolkata',
      state: 'West Bengal',
      postalCode: '700091',
      manager: adminUser._id,
      isDefault: true
    });

    const warehouseDelhi = await Warehouse.create({
      name: 'Delhi NCR Fulfillment Center',
      code: 'DEL-01',
      address: 'Phase 2, Okhla Industrial Area',
      city: 'New Delhi',
      state: 'Delhi',
      postalCode: '110020',
      manager: adminUser._id,
      isDefault: false
    });

    // 5. Seed Categories
    console.log('[Seeder] Seeding product categories...');
    const catFashion = await Category.create({
      name: 'Apparel & Fashion',
      slug: 'apparel-fashion',
      description: 'T-Shirts, Jeans, Ethnic wear and clothing'
    });

    const catElectronics = await Category.create({
      name: 'Consumer Electronics',
      slug: 'consumer-electronics',
      description: 'Audio, cables, accessories, and gadgets'
    });

    // 6. Seed Sample Products & Variants & Single Source of Truth Stock
    console.log('[Seeder] Seeding sample products & inventory...');
    const tshirt = await Product.create({
      name: 'Premium Cotton Oversized T-Shirt',
      sku: 'TS-OVR-01',
      brand: 'UrbanCraft',
      category: catFashion._id,
      description: '100% combed cotton 220 GSM heavyweight luxury t-shirt.',
      sellingPrice: 799,
      costPrice: 280,
      mrp: 1499,
      gst: 5,
      hsnCode: '61091000',
      images: [
        { url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500', publicId: 'demo1' }
      ]
    });

    // Variants
    const vBlackM = await ProductVariant.create({
      productId: tshirt._id,
      sku: 'TS-BLK-M',
      color: 'Black',
      size: 'M',
      price: 799,
      costPrice: 280
    });

    const vBlackL = await ProductVariant.create({
      productId: tshirt._id,
      sku: 'TS-BLK-L',
      color: 'Black',
      size: 'L',
      price: 799,
      costPrice: 280
    });

    const vWhiteM = await ProductVariant.create({
      productId: tshirt._id,
      sku: 'TS-WHT-M',
      color: 'White',
      size: 'M',
      price: 799,
      costPrice: 280
    });

    // Seed stock in Kolkata Warehouse
    const variantsList = [
      { variant: vBlackM, initialStock: 150 },
      { variant: vBlackL, initialStock: 80 },
      { variant: vWhiteM, initialStock: 8 } // Low stock example!
    ];

    for (const item of variantsList) {
      await Inventory.create({
        variantId: item.variant._id,
        productId: tshirt._id,
        warehouseId: warehouseKolkata._id,
        physicalStock: item.initialStock,
        reservedStock: 0,
        damagedStock: 0,
        availableStock: item.initialStock,
        minimumStock: 15
      });

      await InventoryTransaction.create({
        variantId: item.variant._id,
        productId: tshirt._id,
        warehouseId: warehouseKolkata._id,
        type: INVENTORY_TRANSACTION_TYPES.OPENING_STOCK,
        quantity: item.initialStock,
        previousStock: 0,
        newStock: item.initialStock,
        referenceType: 'InitialSeed',
        reason: 'Seeder initial opening inventory balance',
        createdBy: adminUser._id
      });
    }

    // 7. Seed Sample Supplier & Customer
    console.log('[Seeder] Seeding supplier & customer...');
    const supplier = await Supplier.create({
      name: 'Ramesh Fabrics & Garments',
      company: 'Ramesh Textile Mills Ltd',
      phone: '+91 9123456780',
      email: 'sales@rameshtextiles.com',
      gstin: '19ABCDE1234F1Z5',
      address: 'Burrabazar Textile Market, Kolkata'
    });

    const customer = await Customer.create({
      name: 'Rahul Sharma',
      phone: '+91 9988776655',
      email: 'rahul.sharma@example.com',
      address: 'Flat 302, Green Valley Apartments',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400050',
      totalOrders: 1,
      totalSpent: 1598
    });

    // 8. Seed Sample Marketplace Listings
    console.log('[Seeder] Seeding marketplace listings...');
    await MarketplaceListing.create([
      {
        productId: tshirt._id,
        variantId: vBlackM._id,
        marketplace: 'Flipkart',
        marketplaceSKU: 'FLIP-TS-BLK-M',
        marketplaceProductId: 'FLPKT987213',
        listingTitle: 'UrbanCraft Oversized Black T-Shirt (M)',
        price: 749,
        mrp: 1499,
        listingStatus: 'ACTIVE'
      },
      {
        productId: tshirt._id,
        variantId: vBlackM._id,
        marketplace: 'Meesho',
        marketplaceSKU: 'MSHO-TS-BLK-M',
        marketplaceProductId: 'MEESH4321',
        listingTitle: 'Heavy Cotton Oversized T-Shirt (M)',
        price: 699,
        mrp: 1499,
        listingStatus: 'ACTIVE'
      }
    ]);

    // 9. Seed Sample Expenses
    console.log('[Seeder] Seeding sample operational expenses...');
    await Expense.create([
      {
        title: 'Corrugated Courier Boxes (500 pcs)',
        category: 'Packaging',
        amount: 4500,
        paymentMethod: 'UPI',
        date: new Date()
      },
      {
        title: 'Bluedart Logistics Monthly Bill',
        category: 'Shipping',
        amount: 18200,
        paymentMethod: 'Bank Transfer',
        date: new Date()
      },
      {
        title: 'Meta / Facebook Catalog Ads',
        category: 'Advertising',
        amount: 8000,
        paymentMethod: 'Credit Card',
        date: new Date()
      }
    ]);

    console.log('====================================================');
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('👑 Admin Login Credentials:');
    console.log('   Email:    admin@erp.com');
    console.log('   Password: adminpassword123');
    console.log('====================================================');

    process.exit(0);
  } catch (err) {
    console.error('Seeder Error:', err);
    process.exit(1);
  }
};

seed();
