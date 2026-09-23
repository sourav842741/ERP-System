import { calculateMarketplacePricing, compareMarketplacesPricing } from '../services/pricing/pricingEngine.js';
import { PricingCalculation } from '../models/PricingCalculation.js';
import { Product } from '../models/Product.js';

/**
 * Controller for Marketplace Pricing & Calculator
 */

// 1. Forward Mode: Calculate Profitability from Selling Price
export const calculatePricing = async (req, res, next) => {
  try {
    const inputData = req.body;
    const result = await calculateMarketplacePricing(inputData, 'FORWARD');

    // Optionally save calculation history if requested or authenticated
    let historyRecord = null;
    if (req.user && inputData.saveHistory) {
      let productSnapshot = { name: '', sku: '', category: '' };
      if (inputData.productId) {
        const prod = await Product.findById(inputData.productId).lean();
        if (prod) {
          productSnapshot = { name: prod.name, sku: prod.sku, category: inputData.category || '' };
        }
      }

      historyRecord = await PricingCalculation.create({
        user: req.user._id,
        product: inputData.productId || null,
        productSnapshot,
        marketplace: result.marketplace,
        mode: 'FORWARD',
        inputs: inputData,
        matchedRules: result.matchedRules,
        breakdown: result.breakdown,
        finalRecommendedPrice: result.finalRecommendedPrice,
        notes: inputData.notes || ''
      });
    }

    res.json({
      success: true,
      data: result,
      historyId: historyRecord?._id || null
    });
  } catch (error) {
    next(error);
  }
};

// 2. Reverse Mode: Calculate Required Selling Price from Desired Profit / Margin
export const reverseCalculatePricing = async (req, res, next) => {
  try {
    const inputData = req.body;
    const result = await calculateMarketplacePricing(inputData, 'REVERSE');

    let historyRecord = null;
    if (req.user && inputData.saveHistory) {
      let productSnapshot = { name: '', sku: '', category: '' };
      if (inputData.productId) {
        const prod = await Product.findById(inputData.productId).lean();
        if (prod) {
          productSnapshot = { name: prod.name, sku: prod.sku, category: inputData.category || '' };
        }
      }

      historyRecord = await PricingCalculation.create({
        user: req.user._id,
        product: inputData.productId || null,
        productSnapshot,
        marketplace: result.marketplace,
        mode: 'REVERSE',
        inputs: inputData,
        matchedRules: result.matchedRules,
        breakdown: result.breakdown,
        finalRecommendedPrice: result.finalRecommendedPrice,
        notes: inputData.notes || ''
      });
    }

    res.json({
      success: true,
      data: result,
      historyId: historyRecord?._id || null
    });
  } catch (error) {
    next(error);
  }
};

// 3. Multi-Marketplace Comparison Matrix
export const compareMarketplaces = async (req, res, next) => {
  try {
    const inputData = req.body;
    const targetMarketplaces = req.body.marketplaces || ['meesho', 'amazon', 'flipkart', 'myntra'];
    const comparisonResults = await compareMarketplacesPricing(inputData, targetMarketplaces);

    res.json({
      success: true,
      data: comparisonResults
    });
  } catch (error) {
    next(error);
  }
};

// 4. Get Calculation History & Audits
export const getPricingHistory = async (req, res, next) => {
  try {
    const { marketplace, page = 1, limit = 20 } = req.query;
    const query = { user: req.user._id };

    if (marketplace && marketplace !== 'all') {
      query.marketplace = marketplace.toLowerCase().trim();
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [history, total] = await Promise.all([
      PricingCalculation.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('product', 'name sku images')
        .lean(),
      PricingCalculation.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        history,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// 5. Get Single Calculation Audit by ID
export const getPricingHistoryById = async (req, res, next) => {
  try {
    const record = await PricingCalculation.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('product', 'name sku images');

    if (!record) {
      return res.status(404).json({ success: false, message: 'Calculation record not found' });
    }

    res.json({
      success: true,
      data: record
    });
  } catch (error) {
    next(error);
  }
};

export default {
  calculatePricing,
  reverseCalculatePricing,
  compareMarketplaces,
  getPricingHistory,
  getPricingHistoryById
};
