import Decimal from 'decimal.js';

/**
 * Calculates shipping, logistics, and weight handling fees
 */

export const calculateChargeableWeight = ({
  weight = 0, // grams
  packageWeight = 0, // grams
  dimensions = { length: 0, width: 0, height: 0 } // cm
}) => {
  const deadWeightGrams = new Decimal(Math.max(Number(weight) || 0, Number(packageWeight) || 0));

  const l = new Decimal(dimensions?.length || 0);
  const w = new Decimal(dimensions?.width || 0);
  const h = new Decimal(dimensions?.height || 0);

  // Standard Indian E-Commerce Volumetric Weight formula:
  // (L * W * H in cm) / 5000 = weight in kg -> multiply by 1000 for grams: (L * W * H) / 5
  let volumetricWeightGrams = new Decimal(0);
  if (l.greaterThan(0) && w.greaterThan(0) && h.greaterThan(0)) {
    volumetricWeightGrams = l.times(w).times(h).dividedBy(5);
  }

  // Chargeable weight is the higher of dead weight and volumetric weight
  const chargeableGrams = Decimal.max(deadWeightGrams, volumetricWeightGrams);

  return {
    deadWeightGrams: deadWeightGrams.toNumber(),
    volumetricWeightGrams: volumetricWeightGrams.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber(),
    chargeableWeightGrams: chargeableGrams.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber()
  };
};

export const calculateShippingFee = (shippingRule, chargeableWeightGrams) => {
  if (!shippingRule) {
    return { fee: new Decimal(0), calculationDetails: 'No shipping rule matched' };
  }

  const calc = shippingRule.calculation || {};
  let fee = new Decimal(0);
  let calculationDetails = '';

  if (shippingRule.calculationType === 'weight_slab') {
    const slabs = calc.weightSlabs || [];
    let matchedSlab = null;

    for (const slab of slabs) {
      const minOk = chargeableWeightGrams >= slab.minWeight;
      const maxOk = slab.maxWeight === null || slab.maxWeight === undefined || chargeableWeightGrams <= slab.maxWeight;
      if (minOk && maxOk) {
        matchedSlab = slab;
        break;
      }
    }

    if (matchedSlab) {
      let totalFee = new Decimal(matchedSlab.fee || 0);
      calculationDetails = `Weight slab [${matchedSlab.minWeight}g - ${matchedSlab.maxWeight ? matchedSlab.maxWeight + 'g' : '∞'}]: Base ₹${totalFee.toFixed(2)}`;

      // Handle additional step fees if defined (e.g. every extra 500g above base slab)
      if (matchedSlab.additionalWeightStep > 0 && matchedSlab.additionalFee > 0) {
        const excessWeight = new Decimal(chargeableWeightGrams).minus(matchedSlab.minWeight);
        if (excessWeight.greaterThan(0)) {
          const steps = excessWeight.dividedBy(matchedSlab.additionalWeightStep).ceil();
          const extraCharges = steps.times(matchedSlab.additionalFee);
          totalFee = totalFee.plus(extraCharges);
          calculationDetails += ` + ${steps.toString()} step(s) extra (${matchedSlab.additionalWeightStep}g @ ₹${matchedSlab.additionalFee}) = ₹${totalFee.toFixed(2)}`;
        }
      }

      fee = totalFee;
    } else {
      fee = new Decimal(calc.fixedAmount || 0);
      calculationDetails = `Default fixed shipping: ₹${fee.toFixed(2)}`;
    }
  } else if (shippingRule.calculationType === 'fixed') {
    fee = new Decimal(calc.fixedAmount || 0);
    calculationDetails = `Fixed shipping fee: ₹${fee.toFixed(2)}`;
  } else if (shippingRule.calculationType === 'percentage') {
    // Rare, e.g. % of order value
    fee = new Decimal(0);
  }

  return {
    fee: fee.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    calculationDetails
  };
};

export default { calculateChargeableWeight, calculateShippingFee };
