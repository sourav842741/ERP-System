import Decimal from 'decimal.js';
import { Marketplace } from '../../models/Marketplace.js';
import { validatePricingInput } from './pricingValidator.js';
import { matchMarketplaceRules } from './ruleMatcher.js';
import { calculateFeeFromRule } from './feeCalculator.js';
import { calculateChargeableWeight, calculateShippingFee } from './shippingCalculator.js';
import { calculateTaxes } from './taxCalculator.js';
import { calculateProfitability } from './profitCalculator.js';
import { solveRequiredSellingPrice } from './reversePricingCalculator.js';

/**
 * Enterprise Marketplace Pricing Engine
 * Core engine for calculating seller profitability and reverse listing prices
 */

export const calculateMarketplacePricing = async (inputData, mode = 'FORWARD') => {
  // 1. Validation
  const validation = validatePricingInput(inputData, mode);
  if (!validation.isValid) {
    const error = new Error(`Pricing Validation Error: ${validation.errors.join(', ')}`);
    error.status = 400;
    error.details = validation.errors;
    throw error;
  }

  const {
    marketplace,
    productCost = 0,
    packagingCost = 0,
    internalLogistics = 0,
    otherSellerCosts = 0,
    mrp = 0,
    category = '',
    subCategory = '',
    weight = 0,
    packageWeight = 0,
    dimensions = { length: 0, width: 0, height: 0 },
    gstRate = 18,
    fulfilmentType = 'Easy Ship',
    shippingZone = 'National',
    couponDiscount = 0,
    promotionalDiscount = 0,
    returnRate,
    rtoRate,
    calculationDate = new Date()
  } = inputData;

  // 2. Fetch Marketplace Profile & Default Fallbacks
  const normMarketplace = marketplace.toLowerCase().trim();
  const mktConfig = await Marketplace.findOne({ code: normMarketplace, isActive: true }).lean();

  const gstRateOnFees = mktConfig?.settings?.gstRateOnFees ?? 18;
  const effReturnRate = returnRate !== undefined && returnRate !== null
    ? Number(returnRate)
    : (mktConfig?.settings?.defaultReturnRate ?? 5);
  const effRtoRate = rtoRate !== undefined && rtoRate !== null
    ? Number(rtoRate)
    : (mktConfig?.settings?.defaultRtoRate ?? 3);
  const returnCostPerUnit = mktConfig?.settings?.defaultReturnCost ?? 50;
  const rtoCostPerUnit = mktConfig?.settings?.defaultRtoCost ?? 45;

  // 3. Weight calculations
  const weightInfo = calculateChargeableWeight({ weight, packageWeight, dimensions });
  const chargeableWeight = weightInfo.chargeableWeightGrams;

  // 4. Seller Costs summation
  const productCostDec = new Decimal(productCost);
  const packagingCostDec = new Decimal(packagingCost);
  const internalLogisticsDec = new Decimal(internalLogistics);
  const otherSellerCostsDec = new Decimal(otherSellerCosts);
  const totalSellerCost = productCostDec
    .plus(packagingCostDec)
    .plus(internalLogisticsDec)
    .plus(otherSellerCostsDec)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    .toNumber();

  // 5. Total Discounts
  const discountsTotal = new Decimal(couponDiscount)
    .plus(new Decimal(promotionalDiscount))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    .toNumber();

  // 6. Return & RTO Risk Reserve
  // Expected return cost = (ReturnRate% * returnCost) + (RtoRate% * rtoCost)
  const expectedReturnCostDec = new Decimal(effReturnRate).dividedBy(100).times(new Decimal(returnCostPerUnit));
  const expectedRtoCostDec = new Decimal(effRtoRate).dividedBy(100).times(new Decimal(rtoCostPerUnit));
  const totalRiskReserve = expectedReturnCostDec
    .plus(expectedRtoCostDec)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    .toNumber();

  // Helper function to evaluate fees for any given candidate price
  const evaluateFeesForCandidatePrice = async (candPrice) => {
    const { matchedRules } = await matchMarketplaceRules({
      marketplace: normMarketplace,
      price: candPrice,
      weight: chargeableWeight,
      category,
      subCategory,
      fulfilmentType,
      shippingZone,
      calculationDate
    });

    let candTotalMktFees = new Decimal(0);
    const effCandPrice = Decimal.max(0, new Decimal(candPrice).minus(new Decimal(discountsTotal))).toNumber();

    for (const rule of matchedRules) {
      if (rule.chargeType === 'shipping') {
        const { fee } = calculateShippingFee(rule, chargeableWeight);
        candTotalMktFees = candTotalMktFees.plus(fee);
      } else {
        const { fee } = calculateFeeFromRule(rule, {
          sellingPrice: candPrice,
          effectivePrice: effCandPrice,
          mrp: mrp || candPrice,
          productCost,
          weight: chargeableWeight
        });
        candTotalMktFees = candTotalMktFees.plus(fee);
      }
    }

    const candGstOnFees = candTotalMktFees.times(new Decimal(gstRateOnFees)).dividedBy(100);

    return {
      totalFees: candTotalMktFees.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
      gstOnFees: candGstOnFees.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
      matchedRules
    };
  };

  // 7. Resolve Final Selling Price (Forward vs Reverse)
  let finalPrice = Number(inputData.sellingPrice) || 0;

  if (mode === 'REVERSE') {
    const targetMode = (inputData.desiredMargin !== undefined && inputData.desiredMargin !== null && inputData.desiredMargin !== '')
      ? 'MARGIN'
      : 'PROFIT';
    const targetValue = targetMode === 'MARGIN'
      ? Number(inputData.desiredMargin)
      : Number(inputData.desiredProfit);

    finalPrice = await solveRequiredSellingPrice({
      targetMode,
      targetValue,
      totalSellerCost,
      discountsTotal,
      totalRiskReserve,
      calculateFeesForPriceFn: async (candPrice) => {
        const res = await evaluateFeesForCandidatePrice(candPrice);
        return { totalFees: res.totalFees, gstOnFees: res.gstOnFees };
      }
    });
  }

  // 8. Execute Final Full Breakdown at finalPrice
  const { matchedRules, ignoredRules } = await matchMarketplaceRules({
    marketplace: normMarketplace,
    price: finalPrice,
    weight: chargeableWeight,
    category,
    subCategory,
    fulfilmentType,
    shippingZone,
    calculationDate
  });

  const effectiveFinalPrice = Decimal.max(0, new Decimal(finalPrice).minus(new Decimal(discountsTotal))).toNumber();

  const itemizedFees = {
    referralFee: 0,
    closingFee: 0,
    shippingFee: 0,
    pickPackFee: 0,
    paymentFee: 0,
    returnFee: 0,
    rtoFee: 0,
    storageFee: 0,
    otherFees: 0
  };

  const detailedRuleAudits = [];
  let totalMarketplaceFeesDec = new Decimal(0);

  for (const rule of matchedRules) {
    let feeResult;
    if (rule.chargeType === 'shipping') {
      feeResult = calculateShippingFee(rule, chargeableWeight);
    } else {
      feeResult = calculateFeeFromRule(rule, {
        sellingPrice: finalPrice,
        effectivePrice: effectiveFinalPrice,
        mrp: mrp || finalPrice,
        productCost,
        weight: chargeableWeight
      });
    }

    const feeAmount = feeResult.fee.toNumber();
    totalMarketplaceFeesDec = totalMarketplaceFeesDec.plus(feeResult.fee);

    // Map to charge types
    switch (rule.chargeType) {
      case 'referral':
        itemizedFees.referralFee += feeAmount;
        break;
      case 'closing':
        itemizedFees.closingFee += feeAmount;
        break;
      case 'shipping':
        itemizedFees.shippingFee += feeAmount;
        break;
      case 'pick_pack':
        itemizedFees.pickPackFee += feeAmount;
        break;
      case 'payment':
        itemizedFees.paymentFee += feeAmount;
        break;
      case 'return_fee':
        itemizedFees.returnFee += feeAmount;
        break;
      case 'rto_fee':
        itemizedFees.rtoFee += feeAmount;
        break;
      case 'storage_fee':
        itemizedFees.storageFee += feeAmount;
        break;
      case 'other':
      default:
        itemizedFees.otherFees += feeAmount;
        break;
    }

    detailedRuleAudits.push({
      ruleId: rule._id,
      ruleName: rule.ruleName,
      chargeType: rule.chargeType,
      calculationType: rule.calculationType,
      calculationBase: rule.calculationBase,
      version: rule.version || 1,
      appliedValue: rule.calculation,
      calculatedFee: feeAmount,
      explanation: feeResult.calculationDetails
    });
  }

  const totalMarketplaceFees = totalMarketplaceFeesDec.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();

  // 9. Taxes
  const taxes = calculateTaxes({
    sellingPrice: finalPrice,
    marketplaceFeesTotal: totalMarketplaceFees,
    gstRateOnFees,
    productGstRate: gstRate,
    isPriceGstInclusive: true
  });

  // 10. Profitability
  const financials = calculateProfitability({
    sellingPrice: finalPrice,
    discountsTotal,
    totalSellerCost,
    totalMarketplaceFees,
    gstOnMarketplaceFees: taxes.gstOnMarketplaceFees.toNumber(),
    totalRiskReserve
  });

  return {
    marketplace: normMarketplace,
    mode,
    finalRecommendedPrice: finalPrice,
    weights: weightInfo,
    breakdown: {
      sellerCosts: {
        productCost: Number(productCost),
        packagingCost: Number(packagingCost),
        internalLogistics: Number(internalLogistics),
        otherSellerCosts: Number(otherSellerCosts),
        totalSellerCost
      },
      marketplaceFees: {
        ...itemizedFees,
        totalMarketplaceFees
      },
      taxes: {
        gstOnMarketplaceFees: taxes.gstOnMarketplaceFees.toNumber(),
        productGstAmount: taxes.productGstAmount.toNumber(),
        taxableProductAmount: taxes.taxableProductAmount.toNumber(),
        totalTax: taxes.totalTax.toNumber()
      },
      riskReserve: {
        expectedReturnCost: expectedReturnCostDec.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
        expectedRtoCost: expectedRtoCostDec.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
        returnRate: effReturnRate,
        rtoRate: effRtoRate,
        totalRiskReserve
      },
      financials: {
        grossSellingPrice: finalPrice,
        discountsTotal,
        ...financials
      }
    },
    matchedRules: detailedRuleAudits,
    ignoredRules
  };
};

/**
 * Compare a single product across multiple marketplaces simultaneously
 */
export const compareMarketplacesPricing = async (inputData, targetMarketplaces = ['meesho', 'amazon', 'flipkart', 'myntra']) => {
  const results = {};

  for (const mkt of targetMarketplaces) {
    try {
      const result = await calculateMarketplacePricing({
        ...inputData,
        marketplace: mkt
      }, 'FORWARD');
      results[mkt] = result;
    } catch (err) {
      results[mkt] = {
        error: err.message,
        breakdown: null
      };
    }
  }

  return results;
};

export default {
  calculateMarketplacePricing,
  compareMarketplacesPricing
};
