import Decimal from 'decimal.js';

/**
 * Reverse Price Solver using precision bisection
 * Finds the exact selling price to satisfy desired profit (₹) or desired profit margin (%)
 */

export const solveRequiredSellingPrice = async ({
  targetMode = 'PROFIT', // 'PROFIT' or 'MARGIN'
  targetValue = 0,       // Desired Profit in ₹ OR Desired Margin in %
  totalSellerCost = 0,
  discountsTotal = 0,
  totalRiskReserve = 0,
  calculateFeesForPriceFn // Callback function: price => { totalFees, gstOnFees }
}) => {
  const targetValDec = new Decimal(targetValue);
  const sellerCostDec = new Decimal(totalSellerCost);
  const riskReserveDec = new Decimal(totalRiskReserve);
  const discountsDec = new Decimal(discountsTotal);

  // Initial bounds
  let lowPrice = sellerCostDec.plus(riskReserveDec).plus(discountsDec);
  if (targetMode === 'PROFIT') {
    lowPrice = lowPrice.plus(targetValDec);
  } else {
    // Margin mode: lowPrice must be at least cost / (1 - margin/100)
    const marginRatio = Decimal.min(0.95, targetValDec.dividedBy(100));
    lowPrice = lowPrice.dividedBy(new Decimal(1).minus(marginRatio));
  }

  // Set conservative upper search bound
  let highPrice = lowPrice.times(3).plus(500);

  // Maximum 40 iterations of binary search yields sub-cent precision (2^-40)
  const MAX_ITERATIONS = 40;
  const TOLERANCE = new Decimal('0.01'); // 1 paisa precision

  let bestPrice = lowPrice;

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const midPrice = lowPrice.plus(highPrice).dividedBy(2);
    const midNum = midPrice.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();

    // Call fee calculator at this candidate price
    const { totalFees, gstOnFees } = await calculateFeesForPriceFn(midNum);

    const feesDec = new Decimal(totalFees);
    const gstDec = new Decimal(gstOnFees);

    const effectivePriceDec = Decimal.max(0, midPrice.minus(discountsDec));
    const totalCostDec = sellerCostDec.plus(feesDec).plus(gstDec).plus(riskReserveDec);
    const actualProfitDec = effectivePriceDec.minus(totalCostDec);

    let difference = new Decimal(0);

    if (targetMode === 'PROFIT') {
      difference = actualProfitDec.minus(targetValDec);
    } else {
      // Margin mode: actualMargin% - targetMargin%
      const actualMarginDec = effectivePriceDec.greaterThan(0)
        ? actualProfitDec.dividedBy(effectivePriceDec).times(100)
        : new Decimal(-100);
      difference = actualMarginDec.minus(targetValDec);
    }

    bestPrice = midPrice;

    if (difference.abs().lessThanOrEqualTo(TOLERANCE)) {
      break;
    }

    if (difference.isNegative()) {
      // Current price delivers less profit/margin than desired -> raise price
      lowPrice = midPrice;
    } else {
      // Current price delivers more profit/margin than desired -> lower price
      highPrice = midPrice;
    }
  }

  return bestPrice.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
};

export default { solveRequiredSellingPrice };
