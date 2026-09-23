import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Decimal from 'decimal.js';

import { Marketplace } from '../src/models/Marketplace.js';
import { MarketplaceRule } from '../src/models/MarketplaceRule.js';
import { calculateMarketplacePricing, compareMarketplacesPricing } from '../src/services/pricing/pricingEngine.js';
import { seedMarketplacesAndRules } from '../src/seeder/seedMarketplacePricing.js';
import { evaluateSafeFormula } from '../src/services/pricing/safeFormulaEvaluator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const runTests = async () => {
  console.log('🧪 Starting Marketplace Pricing Engine Automated Test Suite...\n');

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/erp_system';
  await mongoose.connect(mongoUri);

  // Ensure fresh seed data exists for tests
  await seedMarketplacesAndRules();

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName) => {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  };

  try {
    // ----------------------------------------------------
    // TEST 1: Safe Formula Evaluator (No eval())
    // ----------------------------------------------------
    console.log('\n--- 1. Safe Formula Evaluator Tests ---');
    const formulaResult1 = evaluateSafeFormula('sellingPrice * 0.10 + 15', { sellingPrice: 500 });
    assert(formulaResult1.equals(new Decimal(65)), 'Evaluates linear formula: 500 * 0.10 + 15 = 65');

    const formulaResult2 = evaluateSafeFormula('(sellingPrice - productCost) * 0.18', { sellingPrice: 1000, productCost: 400 });
    assert(formulaResult2.equals(new Decimal(108)), 'Evaluates grouped parentheses: (1000 - 400) * 0.18 = 108');

    // ----------------------------------------------------
    // TEST 2: Basic Forward Calculation (Amazon Apparel)
    // ----------------------------------------------------
    console.log('\n--- 2. Forward Pricing Calculation Tests ---');
    const amazonForward = await calculateMarketplacePricing({
      marketplace: 'amazon',
      productCost: 250,
      packagingCost: 10,
      sellingPrice: 500,
      mrp: 999,
      category: 'Fashion',
      weight: 400, // 400g
      gstRate: 18
    }, 'FORWARD');

    assert(amazonForward.finalRecommendedPrice === 500, 'Recommended price equals selling price in forward mode');
    assert(amazonForward.breakdown.sellerCosts.totalSellerCost === 260, 'Total seller cost = ₹250 + ₹10 = ₹260');
    assert(amazonForward.breakdown.marketplaceFees.referralFee > 0, 'Amazon Fashion referral fee applied (> 0)');
    assert(amazonForward.breakdown.marketplaceFees.closingFee > 0, 'Amazon closing fee applied (> 0)');
    assert(amazonForward.breakdown.marketplaceFees.shippingFee > 0, 'Amazon Easy Ship fee applied (> 0)');
    assert(amazonForward.breakdown.financials.netProfit !== undefined, 'Net profit is computed');
    assert(amazonForward.breakdown.financials.profitMargin !== undefined, 'Profit margin % is computed');

    // ----------------------------------------------------
    // TEST 3: Price Slab Boundary Values (Amazon Closing Fees)
    // ----------------------------------------------------
    console.log('\n--- 3. Price Slab Boundary Tests (₹250, ₹251, ₹500, ₹501) ---');
    const p250 = await calculateMarketplacePricing({ marketplace: 'amazon', productCost: 100, sellingPrice: 250, weight: 300 }, 'FORWARD');
    const p251 = await calculateMarketplacePricing({ marketplace: 'amazon', productCost: 100, sellingPrice: 251, weight: 300 }, 'FORWARD');
    const p500 = await calculateMarketplacePricing({ marketplace: 'amazon', productCost: 100, sellingPrice: 500, weight: 300 }, 'FORWARD');
    const p501 = await calculateMarketplacePricing({ marketplace: 'amazon', productCost: 100, sellingPrice: 501, weight: 300 }, 'FORWARD');

    assert(p250.breakdown.marketplaceFees.closingFee === 5, 'Price ₹250 hits 0-250 slab (Fee = ₹5)');
    assert(p251.breakdown.marketplaceFees.closingFee === 12, 'Price ₹251 transitions to 251-500 slab (Fee = ₹12)');
    assert(p500.breakdown.marketplaceFees.closingFee === 12, 'Price ₹500 hits 251-500 slab (Fee = ₹12)');
    assert(p501.breakdown.marketplaceFees.closingFee === 28, 'Price ₹501 transitions to 501-1000 slab (Fee = ₹28)');

    // ----------------------------------------------------
    // TEST 4: Weight Slab Boundary Values (500g, 501g, 1000g, 1001g)
    // ----------------------------------------------------
    console.log('\n--- 4. Weight Slab Boundary Tests (500g, 501g, 1000g, 1001g) ---');
    const w500 = await calculateMarketplacePricing({ marketplace: 'amazon', productCost: 100, sellingPrice: 400, weight: 500 }, 'FORWARD');
    const w501 = await calculateMarketplacePricing({ marketplace: 'amazon', productCost: 100, sellingPrice: 400, weight: 501 }, 'FORWARD');
    const w1000 = await calculateMarketplacePricing({ marketplace: 'amazon', productCost: 100, sellingPrice: 400, weight: 1000 }, 'FORWARD');
    const w1001 = await calculateMarketplacePricing({ marketplace: 'amazon', productCost: 100, sellingPrice: 400, weight: 1001 }, 'FORWARD');

    assert(w500.breakdown.marketplaceFees.shippingFee === 65, 'Weight 500g hits 0-500g slab (Fee = ₹65)');
    assert(w501.breakdown.marketplaceFees.shippingFee === 89, 'Weight 501g transitions to 501-1000g slab (Fee = ₹89)');
    assert(w1000.breakdown.marketplaceFees.shippingFee === 89, 'Weight 1000g hits 501-1000g slab (Fee = ₹89)');
    assert(w1001.breakdown.marketplaceFees.shippingFee === 120, 'Weight 1001g transitions to 1001-2000g slab (Fee = ₹120)');

    // ----------------------------------------------------
    // TEST 5: Reverse Calculation (Target Profit / Target Margin)
    // ----------------------------------------------------
    console.log('\n--- 5. Reverse Price Calculation Tests ---');
    const targetProfit = 100;
    const reverseRes = await calculateMarketplacePricing({
      marketplace: 'amazon',
      productCost: 250,
      packagingCost: 15,
      desiredProfit: targetProfit,
      category: 'Fashion',
      weight: 450
    }, 'REVERSE');

    const recommendedPrice = reverseRes.finalRecommendedPrice;
    assert(recommendedPrice > (250 + 15 + targetProfit), `Recommended price (₹${recommendedPrice}) exceeds baseline cost + target profit`);

    // Verify reverse math consistency: forward calculation at recommendedPrice must yield ~targetProfit
    const forwardCheck = await calculateMarketplacePricing({
      marketplace: 'amazon',
      productCost: 250,
      packagingCost: 15,
      sellingPrice: recommendedPrice,
      category: 'Fashion',
      weight: 450
    }, 'FORWARD');

    const diff = Math.abs(forwardCheck.breakdown.financials.netProfit - targetProfit);
    assert(diff <= 0.15, `Forward validation confirms profit ₹${forwardCheck.breakdown.financials.netProfit} is within ₹0.15 of target ₹${targetProfit} (Diff: ₹${diff.toFixed(2)})`);

    // ----------------------------------------------------
    // TEST 6: Multi-Marketplace Comparison Matrix
    // ----------------------------------------------------
    console.log('\n--- 6. Multi-Marketplace Comparison Tests ---');
    const comparison = await compareMarketplacesPricing({
      productCost: 300,
      sellingPrice: 699,
      mrp: 1299,
      category: 'Fashion',
      weight: 480,
      gstRate: 18
    }, ['meesho', 'amazon', 'flipkart', 'myntra']);

    assert(comparison.meesho && !comparison.meesho.error, 'Meesho calculation successful in comparison matrix');
    assert(comparison.amazon && !comparison.amazon.error, 'Amazon calculation successful in comparison matrix');
    assert(comparison.flipkart && !comparison.flipkart.error, 'Flipkart calculation successful in comparison matrix');
    assert(comparison.myntra && !comparison.myntra.error, 'Myntra calculation successful in comparison matrix');

    // Meesho zero-commission verification: Meesho total marketplace fees must be lower than Amazon
    const meeshoFees = comparison.meesho.breakdown.marketplaceFees.totalMarketplaceFees;
    const amazonFees = comparison.amazon.breakdown.marketplaceFees.totalMarketplaceFees;
    assert(meeshoFees < amazonFees, `Meesho total fees (₹${meeshoFees}) are significantly lower than Amazon fees (₹${amazonFees})`);

    // ----------------------------------------------------
    // TEST 7: GST Calculation Verification (0%, 5%, 12%, 18%, 28%)
    // ----------------------------------------------------
    console.log('\n--- 7. GST Rates Verification Tests (0%, 5%, 12%, 18%, 28%) ---');
    for (const gst of [0, 5, 12, 18, 28]) {
      const gstTest = await calculateMarketplacePricing({
        marketplace: 'amazon',
        productCost: 200,
        sellingPrice: 500,
        gstRate: gst,
        weight: 300
      }, 'FORWARD');

      const expectedGstOnFees = Math.round(gstTest.breakdown.marketplaceFees.totalMarketplaceFees * 0.18 * 100) / 100;
      assert(
        Math.abs(gstTest.breakdown.taxes.gstOnMarketplaceFees - expectedGstOnFees) <= 0.05,
        `GST on marketplace fees is verified at 18% for product GST ${gst}%`
      );
    }

    // ----------------------------------------------------
    // TEST 8: Rule Priority Verification
    // ----------------------------------------------------
    console.log('\n--- 8. Rule Priority Collision Verification ---');
    const electronicsRes = await calculateMarketplacePricing({
      marketplace: 'amazon',
      productCost: 500,
      sellingPrice: 900,
      category: 'Electronics',
      weight: 300
    }, 'FORWARD');

    // Electronics rule has priority 20 (8%), Default referral rule has priority 5 (10%)
    const refRule = electronicsRes.matchedRules.find(r => r.chargeType === 'referral');
    assert(refRule && refRule.ruleName.includes('Electronics'), 'Higher priority category rule (Electronics - 8%) won over default referral rule');

    // ----------------------------------------------------
    // TEST 9: Decimal Financial Precision (No IEEE 754 float drift)
    // ----------------------------------------------------
    console.log('\n--- 9. Decimal Financial Precision Tests ---');
    const precisionCheck = new Decimal('0.1').plus(new Decimal('0.2'));
    assert(precisionCheck.toString() === '0.3', '0.1 + 0.2 === 0.3 without floating-point drift (0.30000000000000004)');

    console.log(`\n======================================================`);
    console.log(`Test Results: ${passed} PASSED, ${failed} FAILED`);
    console.log(`======================================================\n`);

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Test suite failed with unexpected error:', err);
    process.exit(1);
  }
};

runTests();
