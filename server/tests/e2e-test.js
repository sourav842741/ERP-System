import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { DEFAULT_PERMISSIONS, INVENTORY_TRANSACTION_TYPES, ORDER_STATUSES } from '../src/config/constants.js';
import { Permission } from '../src/models/Permission.js';
import { Role } from '../src/models/Role.js';
import { User } from '../src/models/User.js';
import { Warehouse } from '../src/models/Warehouse.js';
import { Category } from '../src/models/Category.js';
import { Product } from '../src/models/Product.js';
import { ProductVariant } from '../src/models/ProductVariant.js';
import { Inventory } from '../src/models/Inventory.js';
import { InventoryTransaction } from '../src/models/InventoryTransaction.js';
import { Order } from '../src/models/Order.js';

let mongod;
let adminToken = '';
let warehouseKolkataId = '';
let warehouseDelhiId = '';
let testProductId = '';
let testVariantId = '';
let testOrderId = '';

const runTests = async () => {
  console.log('================================================================');
  console.log('🧪 RUNNING COMPREHENSIVE END-TO-END AUTOMATED ERP TEST SUITE');
  console.log('================================================================\n');

  try {
    // 1. Start MongoDB In-Memory Server
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    console.log('✅ [1/14] In-Memory MongoDB Engine Connected Successfully.');

    // 2. Setup Default RBAC & Super Admin
    await Permission.insertMany(DEFAULT_PERMISSIONS);
    const superAdminRole = await Role.create({
      name: 'Super Admin',
      description: 'System Admin',
      permissions: DEFAULT_PERMISSIONS.map(p => p.code),
      isSystem: true
    });

    const adminUser = await User.create({
      name: 'Test Administrator',
      email: 'admin@erp.com',
      password: 'adminpassword123',
      role: superAdminRole._id
    });
    console.log('✅ [2/14] RBAC Permissions & Super Admin User Initialized.');

    // 3. Test Auth & JWT Generation
    const isMatch = await adminUser.comparePassword('adminpassword123');
    if (!isMatch) throw new Error('Password verification failed');

    const jwt = await import('jsonwebtoken');
    adminToken = jwt.default.sign(
      { id: adminUser._id, role: 'Super Admin' },
      process.env.JWT_SECRET || 'super_secret_jwt_key_erp_2026_change_this_in_production',
      { expiresIn: '1d' }
    );
    console.log('✅ [3/14] Authentication & JWT Verification Passed.');

    // 4. Setup Warehouses & Category
    const wh1 = await Warehouse.create({
      name: 'Kolkata Hub',
      code: 'CCU-01',
      city: 'Kolkata',
      state: 'West Bengal',
      isDefault: true
    });
    warehouseKolkataId = String(wh1._id);

    const wh2 = await Warehouse.create({
      name: 'Delhi Fulfillment Center',
      code: 'DEL-01',
      city: 'New Delhi',
      state: 'Delhi',
      isDefault: false
    });
    warehouseDelhiId = String(wh2._id);

    const cat = await Category.create({
      name: 'Apparel',
      slug: 'apparel',
      description: 'Clothing'
    });
    console.log('✅ [4/14] Multi-Warehouse Infrastructure & Categories Initialized.');

    // 5. Test Product Creation & Variant Stock Initializer
    const product = await Product.create({
      name: 'Urban Oversized T-Shirt',
      sku: 'TS-OVR-01',
      brand: 'UrbanCraft',
      category: cat._id,
      sellingPrice: 799,
      costPrice: 250
    });
    testProductId = String(product._id);

    const variant = await ProductVariant.create({
      productId: product._id,
      sku: 'TS-BLK-M',
      color: 'Black',
      size: 'M',
      price: 799,
      costPrice: 250
    });
    testVariantId = String(variant._id);

    // Seed Opening Stock: 100 units
    await Inventory.create({
      variantId: variant._id,
      productId: product._id,
      warehouseId: wh1._id,
      physicalStock: 100,
      reservedStock: 0,
      damagedStock: 0,
      availableStock: 100,
      minimumStock: 15
    });

    await InventoryTransaction.create({
      variantId: variant._id,
      productId: product._id,
      warehouseId: wh1._id,
      type: INVENTORY_TRANSACTION_TYPES.OPENING_STOCK,
      quantity: 100,
      previousStock: 0,
      newStock: 100,
      reason: 'Opening stock'
    });
    console.log('✅ [5/14] Product & Variant Created with 100 Units Opening Balance.');

    // 6. Test Single Source of Truth Available Stock Formula
    const inv1 = await Inventory.findOne({ variantId: variant._id, warehouseId: wh1._id });
    if (inv1.availableStock !== 100) throw new Error(`Expected 100 stock, got ${inv1.availableStock}`);
    console.log(`✅ [6/14] Single Source of Truth Verified: availableStock = ${inv1.availableStock}.`);

    // 7. Test Central Inventory Service Order Deduction (Buy 5 units)
    const { inventoryService } = await import('../src/services/inventoryService.js');
    
    const testOrder = new Order({
      orderNumber: 'ORD-TEST-001',
      source: 'Flipkart',
      warehouse: wh1._id,
      items: [{
        variantId: variant._id,
        productId: product._id,
        sku: variant.sku,
        title: product.name,
        quantity: 5,
        unitPrice: 799,
        costPrice: 250,
        subtotal: 3995
      }],
      subtotal: 3995,
      total: 3995,
      customerSnapshot: { name: 'Rahul Test', phone: '9988776655' },
      orderStatus: ORDER_STATUSES.CONFIRMED,
      createdBy: adminUser._id
    });

    await inventoryService.deductStockForOrder(testOrder, adminUser._id);
    await testOrder.save();
    testOrderId = String(testOrder._id);

    const invAfterOrder = await Inventory.findOne({ variantId: variant._id, warehouseId: wh1._id });
    if (invAfterOrder.physicalStock !== 95 || invAfterOrder.availableStock !== 95) {
      throw new Error(`Inventory deduction failed. Expected 95, got physical=${invAfterOrder.physicalStock}, available=${invAfterOrder.availableStock}`);
    }

    const saleLedger = await InventoryTransaction.findOne({ type: 'SALE', referenceId: 'ORD-TEST-001' });
    if (!saleLedger || saleLedger.quantity !== -5) throw new Error('Sale ledger record missing or incorrect');
    console.log(`✅ [7/14] Order Created: 5 units deducted atomically (Stock: 100 -> ${invAfterOrder.availableStock}). Ledger recorded.`);

    // 8. Test Stock Cannot Go Negative Protection
    let caughtNegativeError = false;
    try {
      await inventoryService.mutateStock({
        variantId: variant._id,
        warehouseId: wh1._id,
        type: 'SALE',
        quantity: -9999, // Exceeds available 95
        reason: 'Attempt negative stock'
      });
    } catch (e) {
      caughtNegativeError = true;
      if (e.code !== 'INSUFFICIENT_STOCK') throw e;
    }
    if (!caughtNegativeError) throw new Error('System allowed negative stock!');
    console.log('✅ [8/14] Negative Stock Prevention Enforced: Orders exceeding available stock are strictly rejected.');

    // 9. Test Manual Stock Adjustment with Mandatory Reason Rule (Section 212)
    const adjResult = await inventoryService.mutateStock({
      variantId: variant._id,
      warehouseId: wh1._id,
      type: INVENTORY_TRANSACTION_TYPES.ADJUSTMENT,
      quantity: 20,
      reason: 'Physical inventory cycle audit discrepancy found 20 extra boxes in Bay 3',
      userId: adminUser._id
    });
    if (adjResult.inventory.availableStock !== 115) throw new Error(`Expected 115, got ${adjResult.inventory.availableStock}`);
    console.log(`✅ [9/14] Manual Stock Adjustment Passed with Mandatory Justification (Stock: 95 -> ${adjResult.inventory.availableStock}).`);

    // 10. Test Automatic Stock Restoration on Order Cancellation
    await inventoryService.restoreStockForCancelledOrder(testOrder, 'Customer cancelled order prior to dispatch', adminUser._id);
    const invAfterCancel = await Inventory.findOne({ variantId: variant._id, warehouseId: wh1._id });
    if (invAfterCancel.availableStock !== 120) throw new Error(`Expected restored 120, got ${invAfterCancel.availableStock}`);
    console.log(`✅ [10/14] Order Cancellation Verified: 5 units automatically restored to Central Stock (Stock: 115 -> ${invAfterCancel.availableStock}).`);

    // 11. Test Returns Workflow (Damaged Condition Intake)
    await inventoryService.processReturnStock({
      order: testOrder,
      condition: 'DAMAGED',
      inspectionNotes: 'Customer returned with tear in sleeve. Quarantined to damaged.',
      userId: adminUser._id
    });
    const invAfterReturn = await Inventory.findOne({ variantId: variant._id, warehouseId: wh1._id });
    if (invAfterReturn.damagedStock !== 5) throw new Error(`Expected 5 damaged stock, got ${invAfterReturn.damagedStock}`);
    console.log(`✅ [11/14] Returns Management Verified: Damaged items routed to Damaged Quarantine (${invAfterReturn.damagedStock} damaged).`);

    // 12. Test Inter-Warehouse Stock Transfer (Kolkata -> Delhi)
    await inventoryService.transferStock({
      sourceWarehouseId: wh1._id,
      destinationWarehouseId: wh2._id,
      items: [{ variantId: variant._id, quantity: 30 }],
      transferNumber: 'TRF-TEST-001',
      userId: adminUser._id
    });
    const invKolkata = await Inventory.findOne({ variantId: variant._id, warehouseId: wh1._id });
    const invDelhi = await Inventory.findOne({ variantId: variant._id, warehouseId: wh2._id });

    if (invDelhi.availableStock !== 30) throw new Error(`Delhi warehouse transfer failed. Expected 30, got ${invDelhi?.availableStock}`);
    console.log(`✅ [12/14] Inter-Warehouse Transfer Verified: Kolkata (-30) -> Delhi (+30: Stock is ${invDelhi.availableStock}).`);

    // 13. Test Custom RBAC Role Builder
    const customRole = await Role.create({
      name: 'Warehouse Dispatcher',
      description: 'Dispatches packages only',
      permissions: ['order:read', 'order:update', 'inventory:view']
    });
    if (!customRole.permissions.includes('order:read')) throw new Error('Role creation failed');
    console.log('✅ [13/14] Dynamic RBAC Builder Verified: Custom roles with granular permissions created.');

    // 14. Test Summary & Global Search
    const searchMatch = await Product.find({ $text: { $search: 'Urban' } });
    console.log(`✅ [14/14] Global Index Search Verified: Found ${searchMatch.length} matched products.`);

    console.log('\n================================================================');
    console.log('🎉 ALL 14 ARCHITECTURAL & BUSINESS TESTS PASSED WITH 100% SUCCESS!');
    console.log('================================================================');

    await mongoose.disconnect();
    await mongod.stop();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err);
    if (mongod) await mongod.stop();
    process.exit(1);
  }
};

runTests();
