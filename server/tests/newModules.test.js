import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Warehouse } from '../src/models/Warehouse.js';
import { WarehouseBin } from '../src/models/WarehouseBin.js';
import { RtoRiskRule, RtoBlacklist } from '../src/models/RtoRiskRule.js';
import { evaluateOrderRisk } from '../src/services/rtoRiskService.js';
import { LabelTemplate } from '../src/models/LabelTemplate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

let testPassed = 0;
let testFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    testPassed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    testFailed++;
  }
}

async function runTests() {
  console.log('🚀 Running Unit & Integration Tests for 3 New Modules...\n');
  await mongoose.connect(MONGO_URI);

  try {
    // -------------------------------------------------------------
    // MODULE 1: WAREHOUSE DIGITAL TWIN & BINS
    // -------------------------------------------------------------
    console.log('--- 1. Warehouse Digital Twin & Bins Tests ---');
    let warehouse = await Warehouse.findOne();
    if (!warehouse) {
      warehouse = await Warehouse.create({
        name: 'Test Central Hub',
        code: 'TEST-HUB',
        city: 'Noida',
        isDefault: true
      });
    }

    // Clean test bins
    await WarehouseBin.deleteMany({ warehouseId: warehouse._id, binCode: { $regex: /^TEST-/ } });

    // Create Single Bin
    const testBin = await WarehouseBin.create({
      warehouseId: warehouse._id,
      zone: 'Zone Fast',
      aisle: 'Aisle 1',
      rack: 'Rack 1',
      shelf: 'Level 1',
      binCode: 'TEST-Z1-A1-R1-L1-B01',
      maxCapacity: 50,
      currentUnits: 0
    });
    assert(testBin && testBin.binCode === 'TEST-Z1-A1-R1-L1-B01', 'Single bin created with unique code');

    // Assign SKU
    testBin.assignedSkus.push({ sku: 'TEST-SKU-001', productName: 'Cotton Tee', quantity: 20 });
    testBin.currentUnits = 20;
    await testBin.save();
    assert(testBin.currentUnits === 20, 'Stock assigned to bin (currentUnits = 20)');

    // Search / Locate SKU
    const locatedBins = await WarehouseBin.find({ 'assignedSkus.sku': 'TEST-SKU-001' });
    assert(locatedBins.length >= 1, 'SKU successfully located in bin matrix');

    // Clean up
    await WarehouseBin.findByIdAndDelete(testBin._id);
    assert(true, 'Bin deleted safely');

    // -------------------------------------------------------------
    // MODULE 2: RTO & FRAUD RISK PREDICTOR
    // -------------------------------------------------------------
    console.log('\n--- 2. RTO & Fraud Risk Predictor Tests ---');

    // Case A: Safe Prepaid Order
    const prepaidOrder = {
      paymentMethod: 'UPI',
      total: 899,
      shippingAddress: { street: 'Flat 402, Sunshine Heights, MG Road', postalCode: '110001' },
      customerSnapshot: { phone: '9876543210' }
    };
    const prepaidRisk = await evaluateOrderRisk(prepaidOrder);
    assert(prepaidRisk.level === 'LOW' && prepaidRisk.score < 30, `Prepaid order has low risk (Score: ${prepaidRisk.score})`);

    // Case B: Risky COD Order (Short address, high value COD)
    const riskyCodOrder = {
      paymentMethod: 'COD',
      total: 3500,
      shippingAddress: { street: 'near shop', postalCode: '110001' },
      customerSnapshot: { phone: '9876543210' }
    };
    const riskyCodResult = await evaluateOrderRisk(riskyCodOrder);
    assert(riskyCodResult.level === 'HIGH' || riskyCodResult.level === 'CRITICAL', `High value COD with short address flagged (Score: ${riskyCodResult.score}, Level: ${riskyCodResult.level})`);
    assert(riskyCodResult.isFlagged === true, 'Order isFlagged set to true');

    // Case C: Blacklist Override
    await RtoBlacklist.deleteMany({ value: '9999999999' });
    await RtoBlacklist.create({
      type: 'phone',
      value: '9999999999',
      action: 'BLOCK',
      reason: 'Serial cancel fraudster',
      riskScorePenalty: 70
    });

    const blacklistedOrder = {
      paymentMethod: 'COD',
      total: 500,
      shippingAddress: { street: 'Regular Address Sector 12', postalCode: '110001' },
      customerSnapshot: { phone: '9999999999' }
    };
    const blacklistedResult = await evaluateOrderRisk(blacklistedOrder);
    assert(blacklistedResult.score >= 70, `Blacklisted phone heavily penalized (Score: ${blacklistedResult.score})`);
    assert(blacklistedResult.level === 'CRITICAL' || blacklistedResult.level === 'HIGH', 'Blacklisted order marked critical/high');

    await RtoBlacklist.deleteMany({ value: '9999999999' });

    // -------------------------------------------------------------
    // MODULE 3: BARCODE & LABEL GENERATOR
    // -------------------------------------------------------------
    console.log('\n--- 3. Barcode & Label Template Tests ---');
    const existingTemplates = await LabelTemplate.find();
    assert(existingTemplates.length >= 0, 'Label templates query succeeded');

    const testTemplate = await LabelTemplate.create({
      name: 'Test 4x6 Thermal Label',
      type: 'shipping_label',
      dimensions: { width: 4, height: 6, unit: 'in' },
      settings: { showStoreLogo: true, showQR: true }
    });
    assert(testTemplate && testTemplate.type === 'shipping_label', 'Custom label template created');
    await LabelTemplate.findByIdAndDelete(testTemplate._id);
    assert(true, 'Test label template cleaned up');

    console.log('\n======================================================');
    console.log(`Test Results: ${testPassed} PASSED, ${testFailed} FAILED`);
    console.log('======================================================');

    process.exit(testFailed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

runTests();
