import { MarketplaceRule } from '../../models/MarketplaceRule.js';

/**
 * Intelligent Rule Matcher
 * Matches active marketplace rules based on category, price, weight, fulfilment, and zone,
 * respecting rule priority, versioning, and effective dates.
 */

export const matchMarketplaceRules = async ({
  marketplace,
  price,
  weight = 0,
  category = '',
  subCategory = '',
  fulfilmentType = '',
  shippingZone = '',
  calculationDate = new Date()
}) => {
  const normMarketplace = marketplace.toLowerCase().trim();
  const targetDate = new Date(calculationDate);

  // 1. Query all active rules for this marketplace valid on the given calculation date
  const candidateRules = await MarketplaceRule.find({
    marketplace: normMarketplace,
    isActive: true,
    effectiveFrom: { $lte: targetDate },
    $or: [
      { effectiveTo: null },
      { effectiveTo: { $gte: targetDate } }
    ]
  }).sort({ priority: -1, createdAt: -1 }).lean();

  const matchedRulesByChargeType = {};
  const allMatchedRules = [];
  const ignoredRules = [];

  for (const rule of candidateRules) {
    const { conditions } = rule;
    let matched = true;
    let ignoreReason = '';

    // Check Category Match
    if (conditions?.category && conditions.category !== '*' && conditions.category.trim() !== '') {
      const ruleCat = conditions.category.toLowerCase().trim();
      const prodCat = (category || '').toLowerCase().trim();
      if (ruleCat !== prodCat) {
        matched = false;
        ignoreReason = `Category "${category}" does not match required "${conditions.category}"`;
      }
    }

    // Check SubCategory Match
    if (matched && conditions?.subCategory && conditions.subCategory !== '*' && conditions.subCategory.trim() !== '') {
      const ruleSubCat = conditions.subCategory.toLowerCase().trim();
      const prodSubCat = (subCategory || '').toLowerCase().trim();
      if (ruleSubCat !== prodSubCat) {
        matched = false;
        ignoreReason = `Subcategory "${subCategory}" does not match required "${conditions.subCategory}"`;
      }
    }

    // Check Price Range Match
    if (matched) {
      const numPrice = Number(price);
      if (conditions?.minPrice !== null && conditions?.minPrice !== undefined && numPrice < conditions.minPrice) {
        matched = false;
        ignoreReason = `Price ₹${numPrice} is below minPrice ₹${conditions.minPrice}`;
      } else if (conditions?.maxPrice !== null && conditions?.maxPrice !== undefined && numPrice > conditions.maxPrice) {
        matched = false;
        ignoreReason = `Price ₹${numPrice} exceeds maxPrice ₹${conditions.maxPrice}`;
      }
    }

    // Check Weight Range Match
    if (matched) {
      const numWeight = Number(weight);
      if (conditions?.minWeight !== null && conditions?.minWeight !== undefined && numWeight < conditions.minWeight) {
        matched = false;
        ignoreReason = `Weight ${numWeight}g is below minWeight ${conditions.minWeight}g`;
      } else if (conditions?.maxWeight !== null && conditions?.maxWeight !== undefined && numWeight > conditions.maxWeight) {
        matched = false;
        ignoreReason = `Weight ${numWeight}g exceeds maxWeight ${conditions.maxWeight}g`;
      }
    }

    // Check Fulfilment Type Match
    if (matched && conditions?.fulfilmentType && conditions.fulfilmentType !== '*' && conditions.fulfilmentType.trim() !== '') {
      const ruleFulfil = conditions.fulfilmentType.toLowerCase().trim();
      const reqFulfil = (fulfilmentType || '').toLowerCase().trim();
      if (ruleFulfil !== reqFulfil) {
        matched = false;
        ignoreReason = `Fulfilment "${fulfilmentType}" does not match required "${conditions.fulfilmentType}"`;
      }
    }

    // Check Shipping Zone Match
    if (matched && conditions?.shippingZone && conditions.shippingZone !== '*' && conditions.shippingZone.trim() !== '') {
      const ruleZone = conditions.shippingZone.toLowerCase().trim();
      const reqZone = (shippingZone || '').toLowerCase().trim();
      if (ruleZone !== reqZone) {
        matched = false;
        ignoreReason = `Shipping Zone "${shippingZone}" does not match required "${conditions.shippingZone}"`;
      }
    }

    if (matched) {
      // Check priority collision: Only the highest priority rule for a given chargeType applies
      // (Unless the rule specifically permits multi-rule composition, e.g. additive 'other')
      const chargeType = rule.chargeType;
      if (!matchedRulesByChargeType[chargeType]) {
        matchedRulesByChargeType[chargeType] = rule;
        allMatchedRules.push(rule);
      } else {
        const existing = matchedRulesByChargeType[chargeType];
        ignoredRules.push({
          ruleId: rule._id,
          ruleName: rule.ruleName,
          chargeType: rule.chargeType,
          priority: rule.priority,
          reason: `Superseded by higher priority rule "${existing.ruleName}" (Priority ${existing.priority} vs ${rule.priority})`
        });
      }
    } else {
      ignoredRules.push({
        ruleId: rule._id,
        ruleName: rule.ruleName,
        chargeType: rule.chargeType,
        priority: rule.priority,
        reason: ignoreReason
      });
    }
  }

  return {
    matchedRules: allMatchedRules,
    ignoredRules
  };
};

export default { matchMarketplaceRules };
