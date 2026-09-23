import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { Marketplace } from '../models/Marketplace.js';
import { MarketplaceRule } from '../models/MarketplaceRule.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MARKETPLACES_DATA = [
  {
    name: 'Meesho',
    code: 'meesho',
    logo: 'https://res.cloudinary.com/dwyk82g9k/image/upload/v1/meesho_logo',
    badgeColor: '#f43397',
    fulfilmentTypes: ['Standard Seller Dispatch'],
    shippingZones: ['Local', 'Regional', 'National'],
    settings: {
      defaultReturnRate: 8,
      defaultRtoRate: 5,
      defaultReturnCost: 55,
      defaultRtoCost: 50,
      gstRateOnFees: 18
    },
    description: 'Zero commission marketplace optimized for direct manufacturers and high-volume retail.'
  },
  {
    name: 'Amazon',
    code: 'amazon',
    logo: 'https://res.cloudinary.com/dwyk82g9k/image/upload/v1/amazon_logo',
    badgeColor: '#ff9900',
    fulfilmentTypes: ['Easy Ship', 'FBA', 'Self Ship'],
    shippingZones: ['Local', 'Regional', 'National'],
    settings: {
      defaultReturnRate: 5,
      defaultRtoRate: 3,
      defaultReturnCost: 65,
      defaultRtoCost: 60,
      gstRateOnFees: 18
    },
    description: 'Global marketplace powerhouse with Easy Ship, FBA fulfillment, and tier-based referral commissions.'
  },
  {
    name: 'Flipkart',
    code: 'flipkart',
    logo: 'https://res.cloudinary.com/dwyk82g9k/image/upload/v1/flipkart_logo',
    badgeColor: '#2874f0',
    fulfilmentTypes: ['Flipkart Fulfilled', 'Seller Smart', 'Self Ship'],
    shippingZones: ['Local', 'Zonal', 'National'],
    settings: {
      defaultReturnRate: 6,
      defaultRtoRate: 4,
      defaultReturnCost: 60,
      defaultRtoCost: 55,
      gstRateOnFees: 18
    },
    description: 'Leading Indian marketplace with Ekart logistics network, fixed closing fees, and category slabs.'
  },
  {
    name: 'Myntra',
    code: 'myntra',
    logo: 'https://res.cloudinary.com/dwyk82g9k/image/upload/v1/myntra_logo',
    badgeColor: '#ff3f6c',
    fulfilmentTypes: ['Myntra M-Direct', 'Partner Fulfilled'],
    shippingZones: ['Local', 'Regional', 'National'],
    settings: {
      defaultReturnRate: 9,
      defaultRtoRate: 4,
      defaultReturnCost: 75,
      defaultRtoCost: 65,
      gstRateOnFees: 18
    },
    description: 'Premium fashion, lifestyle, and beauty portal with dedicated apparel logistics and packaging rules.'
  }
];

const RULES_DATA = [
  // =================== MEESHO RULES ===================
  {
    marketplace: 'meesho',
    ruleName: 'Meesho 0% Commission Policy',
    chargeType: 'referral',
    calculationType: 'percentage',
    calculationBase: 'sellingPrice',
    calculation: { percentage: 0 },
    priority: 10,
    isSystemSeed: true,
    description: 'Meesho offers zero commission across all standard retail catalog categories.'
  },
  {
    marketplace: 'meesho',
    ruleName: 'Meesho Zero Fixed Closing Fee',
    chargeType: 'closing',
    calculationType: 'fixed',
    calculationBase: 'fixedAmount',
    calculation: { fixedAmount: 0 },
    priority: 10,
    isSystemSeed: true,
    description: 'No closing or transaction fee charged per order.'
  },
  {
    marketplace: 'meesho',
    ruleName: 'Meesho National Shipping Slabs',
    chargeType: 'shipping',
    calculationType: 'weight_slab',
    calculationBase: 'fixedAmount',
    calculation: {
      weightSlabs: [
        { minWeight: 0, maxWeight: 500, fee: 49 },
        { minWeight: 501, maxWeight: 1000, fee: 69 },
        { minWeight: 1001, maxWeight: 2000, fee: 99, additionalWeightStep: 1000, additionalFee: 35 }
      ]
    },
    priority: 10,
    isSystemSeed: true,
    description: 'Standard third-party courier delivery rate card across national pin codes.'
  },
  {
    marketplace: 'meesho',
    ruleName: 'Meesho Payment Gateway Processing',
    chargeType: 'payment',
    calculationType: 'percentage',
    calculationBase: 'effectivePrice',
    calculation: { percentage: 1.5 },
    priority: 10,
    isSystemSeed: true,
    description: 'Payment gateway collection charge on online and COD settlements.'
  },

  // =================== AMAZON RULES ===================
  {
    marketplace: 'amazon',
    ruleName: 'Amazon Apparel & Fashion Referral Fee',
    chargeType: 'referral',
    calculationType: 'percentage',
    calculationBase: 'sellingPrice',
    conditions: { category: 'Fashion' },
    calculation: { percentage: 12 },
    priority: 20,
    isSystemSeed: true,
    description: 'Category referral rate for clothing, accessories, and apparel.'
  },
  {
    marketplace: 'amazon',
    ruleName: 'Amazon Consumer Electronics Referral Fee',
    chargeType: 'referral',
    calculationType: 'percentage',
    calculationBase: 'sellingPrice',
    conditions: { category: 'Electronics' },
    calculation: { percentage: 8 },
    priority: 20,
    isSystemSeed: true,
    description: 'Special discounted referral rate for electronics, mobile accessories, and gadgets.'
  },
  {
    marketplace: 'amazon',
    ruleName: 'Amazon Standard Category Referral Fee (Default)',
    chargeType: 'referral',
    calculationType: 'percentage',
    calculationBase: 'sellingPrice',
    calculation: { percentage: 10 },
    priority: 5,
    isSystemSeed: true,
    description: 'Standard 10% referral baseline for general e-commerce categories.'
  },
  {
    marketplace: 'amazon',
    ruleName: 'Amazon Tiered Closing Fee Slabs',
    chargeType: 'closing',
    calculationType: 'price_slab',
    calculationBase: 'sellingPrice',
    calculation: {
      priceSlabs: [
        { minPrice: 0, maxPrice: 250, fee: 5 },
        { minPrice: 251, maxPrice: 500, fee: 12 },
        { minPrice: 501, maxPrice: 1000, fee: 28 },
        { minPrice: 1001, maxPrice: null, fee: 50 }
      ]
    },
    priority: 15,
    isSystemSeed: true,
    description: 'Official Amazon closing fee schedule categorized by item selling price tier.'
  },
  {
    marketplace: 'amazon',
    ruleName: 'Amazon Easy Ship National Delivery',
    chargeType: 'shipping',
    calculationType: 'weight_slab',
    calculationBase: 'fixedAmount',
    calculation: {
      weightSlabs: [
        { minWeight: 0, maxWeight: 500, fee: 65 },
        { minWeight: 501, maxWeight: 1000, fee: 89 },
        { minWeight: 1001, maxWeight: 2000, fee: 120, additionalWeightStep: 1000, additionalFee: 30 }
      ]
    },
    priority: 10,
    isSystemSeed: true,
    description: 'Easy Ship National shipping rates for standard parcel sizes.'
  },
  {
    marketplace: 'amazon',
    ruleName: 'Amazon Pick & Pack / Handling',
    chargeType: 'pick_pack',
    calculationType: 'fixed',
    calculationBase: 'fixedAmount',
    calculation: { fixedAmount: 14 },
    priority: 10,
    isSystemSeed: true,
    description: 'Standard handling and pick-and-pack fulfillment cost.'
  },
  {
    marketplace: 'amazon',
    ruleName: 'Amazon Collection & Banking Fee',
    chargeType: 'payment',
    calculationType: 'percentage',
    calculationBase: 'effectivePrice',
    calculation: { percentage: 2.0 },
    priority: 10,
    isSystemSeed: true,
    description: 'Payment gateway collection fee on prepaid and COD payments.'
  },

  // =================== FLIPKART RULES ===================
  {
    marketplace: 'flipkart',
    ruleName: 'Flipkart Fashion & Apparel Commission',
    chargeType: 'referral',
    calculationType: 'percentage',
    calculationBase: 'sellingPrice',
    conditions: { category: 'Fashion' },
    calculation: { percentage: 11 },
    priority: 20,
    isSystemSeed: true,
    description: 'Flipkart marketplace referral fee for apparel and style categories.'
  },
  {
    marketplace: 'flipkart',
    ruleName: 'Flipkart Standard Commission (Default)',
    chargeType: 'referral',
    calculationType: 'percentage',
    calculationBase: 'sellingPrice',
    calculation: { percentage: 9 },
    priority: 5,
    isSystemSeed: true,
    description: 'Standard Flipkart category commission baseline.'
  },
  {
    marketplace: 'flipkart',
    ruleName: 'Flipkart Fixed Fee Slabs',
    chargeType: 'closing',
    calculationType: 'price_slab',
    calculationBase: 'sellingPrice',
    calculation: {
      priceSlabs: [
        { minPrice: 0, maxPrice: 300, fee: 12 },
        { minPrice: 301, maxPrice: 500, fee: 18 },
        { minPrice: 501, maxPrice: 1000, fee: 32 },
        { minPrice: 1001, maxPrice: null, fee: 48 }
      ]
    },
    priority: 15,
    isSystemSeed: true,
    description: 'Flipkart tier-based fixed charge applied to all fulfilled orders.'
  },
  {
    marketplace: 'flipkart',
    ruleName: 'Flipkart Ekart National Shipping',
    chargeType: 'shipping',
    calculationType: 'weight_slab',
    calculationBase: 'fixedAmount',
    calculation: {
      weightSlabs: [
        { minWeight: 0, maxWeight: 500, fee: 59 },
        { minWeight: 501, maxWeight: 1000, fee: 79 },
        { minWeight: 1001, maxWeight: 2000, fee: 110, additionalWeightStep: 1000, additionalFee: 28 }
      ]
    },
    priority: 10,
    isSystemSeed: true,
    description: 'Ekart logistics national parcel shipping rates.'
  },
  {
    marketplace: 'flipkart',
    ruleName: 'Flipkart Payment Collection Fee',
    chargeType: 'payment',
    calculationType: 'percentage',
    calculationBase: 'effectivePrice',
    calculation: { percentage: 1.8 },
    priority: 10,
    isSystemSeed: true,
    description: 'Collection and settlement charges for online transactions.'
  },

  // =================== MYNTRA RULES ===================
  {
    marketplace: 'myntra',
    ruleName: 'Myntra Lifestyle & Fashion Commission',
    chargeType: 'referral',
    calculationType: 'percentage',
    calculationBase: 'sellingPrice',
    calculation: { percentage: 14.5 },
    priority: 10,
    isSystemSeed: true,
    description: 'Specialized fashion portal commission rate on catalog retail.'
  },
  {
    marketplace: 'myntra',
    ruleName: 'Myntra Transaction Closing Fee',
    chargeType: 'closing',
    calculationType: 'fixed',
    calculationBase: 'fixedAmount',
    calculation: { fixedAmount: 25 },
    priority: 10,
    isSystemSeed: true,
    description: 'Flat processing closing fee on validated fashion orders.'
  },
  {
    marketplace: 'myntra',
    ruleName: 'Myntra National Express Logistics',
    chargeType: 'shipping',
    calculationType: 'weight_slab',
    calculationBase: 'fixedAmount',
    calculation: {
      weightSlabs: [
        { minWeight: 0, maxWeight: 500, fee: 68 },
        { minWeight: 501, maxWeight: 1000, fee: 94 },
        { minWeight: 1001, maxWeight: 2000, fee: 125, additionalWeightStep: 1000, additionalFee: 32 }
      ]
    },
    priority: 10,
    isSystemSeed: true,
    description: 'Dedicated branded courier logistics with customer trial delivery support.'
  },
  {
    marketplace: 'myntra',
    ruleName: 'Myntra Fulfilment & Bagging Fee',
    chargeType: 'pick_pack',
    calculationType: 'fixed',
    calculationBase: 'fixedAmount',
    calculation: { fixedAmount: 20 },
    priority: 10,
    isSystemSeed: true,
    description: 'Tamper-proof packaging and quality inspection charge.'
  }
];

export const seedMarketplacesAndRules = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/erp_system';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
    console.log('Connected to MongoDB for Marketplace Pricing Seeding');

    // 1. Seed or Update Marketplaces
    for (const mkt of MARKETPLACES_DATA) {
      await Marketplace.findOneAndUpdate(
        { code: mkt.code },
        { $set: mkt },
        { upsert: true, new: true }
      );
      console.log(`✓ Seeded Marketplace: ${mkt.name} (${mkt.code})`);
    }

    // 2. Seed Baseline Rules (upsert by ruleName & marketplace)
    for (const rule of RULES_DATA) {
      await MarketplaceRule.findOneAndUpdate(
        { marketplace: rule.marketplace, ruleName: rule.ruleName },
        { $set: { ...rule, isActive: true } },
        { upsert: true, new: true }
      );
    }
    console.log(`✓ Successfully seeded ${RULES_DATA.length} verified marketplace rules across Meesho, Amazon, Flipkart, and Myntra.`);

    return { success: true, count: RULES_DATA.length };
  } catch (error) {
    console.error('Error seeding marketplace rules:', error);
    throw error;
  }
};

// Execute if run directly from CLI
if (process.argv[1] && process.argv[1].endsWith('seedMarketplacePricing.js')) {
  seedMarketplacesAndRules()
    .then(() => {
      console.log('Seeding completed successfully!');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

export default seedMarketplacesAndRules;
