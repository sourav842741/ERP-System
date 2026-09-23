import Decimal from 'decimal.js';
import { evaluateSafeFormula } from './safeFormulaEvaluator.js';

/**
 * Calculates marketplace fees with Decimal.js precision
 */

export const calculateFeeFromRule = (rule, context) => {
  const {
    sellingPrice = 0,
    effectivePrice = sellingPrice,
    mrp = sellingPrice,
    productCost = 0,
    weight = 0
  } = context;

  // Determine calculation base
  let baseAmount = new Decimal(sellingPrice);
  switch (rule.calculationBase) {
    case 'effectivePrice':
      baseAmount = new Decimal(effectivePrice);
      break;
    case 'mrp':
      baseAmount = new Decimal(mrp);
      break;
    case 'productCost':
      baseAmount = new Decimal(productCost);
      break;
    case 'fixedAmount':
      baseAmount = new Decimal(0);
      break;
    case 'sellingPrice':
    default:
      baseAmount = new Decimal(sellingPrice);
      break;
  }

  let calculatedFee = new Decimal(0);
  const calc = rule.calculation || {};
  let calculationDetails = '';

  switch (rule.calculationType) {
    case 'percentage': {
      const pct = new Decimal(calc.percentage || 0);
      calculatedFee = baseAmount.times(pct).dividedBy(100);
      calculationDetails = `${pct.toString()}% of ₹${baseAmount.toFixed(2)} (${rule.calculationBase})`;
      break;
    }

    case 'fixed': {
      calculatedFee = new Decimal(calc.fixedAmount || 0);
      calculationDetails = `Fixed fee: ₹${calculatedFee.toFixed(2)}`;
      break;
    }

    case 'percentage_plus_fixed': {
      const pct = new Decimal(calc.percentage || 0);
      const fixed = new Decimal(calc.fixedAmount || 0);
      calculatedFee = baseAmount.times(pct).dividedBy(100).plus(fixed);
      calculationDetails = `${pct.toString()}% (₹${baseAmount.times(pct).dividedBy(100).toFixed(2)}) + Fixed ₹${fixed.toFixed(2)}`;
      break;
    }

    case 'price_slab': {
      const slabs = calc.priceSlabs || [];
      const numPrice = baseAmount.toNumber();
      let matchedSlab = null;

      for (const slab of slabs) {
        const minOk = numPrice >= slab.minPrice;
        const maxOk = slab.maxPrice === null || slab.maxPrice === undefined || numPrice <= slab.maxPrice;
        if (minOk && maxOk) {
          matchedSlab = slab;
          break;
        }
      }

      if (matchedSlab) {
        if (matchedSlab.percentage && matchedSlab.percentage > 0) {
          calculatedFee = baseAmount.times(new Decimal(matchedSlab.percentage)).dividedBy(100);
          calculationDetails = `Price slab [₹${matchedSlab.minPrice} - ${matchedSlab.maxPrice ? '₹' + matchedSlab.maxPrice : '∞'}]: ${matchedSlab.percentage}% of ₹${baseAmount.toFixed(2)}`;
        } else {
          calculatedFee = new Decimal(matchedSlab.fee || 0);
          calculationDetails = `Price slab [₹${matchedSlab.minPrice} - ${matchedSlab.maxPrice ? '₹' + matchedSlab.maxPrice : '∞'}]: Fixed ₹${calculatedFee.toFixed(2)}`;
        }
      } else {
        calculationDetails = `No price slab matched for ₹${baseAmount.toFixed(2)}`;
      }
      break;
    }

    case 'formula': {
      if (calc.formula) {
        const formulaContext = {
          sellingPrice: new Decimal(sellingPrice).toNumber(),
          effectivePrice: new Decimal(effectivePrice).toNumber(),
          mrp: new Decimal(mrp).toNumber(),
          productCost: new Decimal(productCost).toNumber(),
          weight: new Decimal(weight).toNumber()
        };
        calculatedFee = evaluateSafeFormula(calc.formula, formulaContext);
        calculationDetails = `Formula: ${calc.formula}`;
      }
      break;
    }

    default:
      calculatedFee = new Decimal(0);
      calculationDetails = `Unknown calculation type: ${rule.calculationType}`;
  }

  // Ensure fees do not turn negative unless explicitly designed
  if (calculatedFee.isNegative()) {
    calculatedFee = new Decimal(0);
  }

  return {
    fee: calculatedFee.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    calculationDetails
  };
};

export default { calculateFeeFromRule };
