import Decimal from 'decimal.js';

/**
 * Profit, Margin, and ROI Calculator with Decimal.js precision
 */

export const calculateProfitability = ({
  sellingPrice = 0,
  discountsTotal = 0,
  totalSellerCost = 0,
  totalMarketplaceFees = 0,
  gstOnMarketplaceFees = 0,
  totalRiskReserve = 0
}) => {
  const priceDec = new Decimal(sellingPrice);
  const discountsDec = new Decimal(discountsTotal);
  const effectiveRevenueDec = Decimal.max(0, priceDec.minus(discountsDec));

  const sellerCostDec = new Decimal(totalSellerCost);
  const mktFeesDec = new Decimal(totalMarketplaceFees);
  const gstFeesDec = new Decimal(gstOnMarketplaceFees);
  const riskReserveDec = new Decimal(totalRiskReserve);

  // Total Costs incurred per unit sold
  const totalCostDec = sellerCostDec
    .plus(mktFeesDec)
    .plus(gstFeesDec)
    .plus(riskReserveDec);

  // Net Profit = Net Revenue - Total Cost
  const netProfitDec = effectiveRevenueDec.minus(totalCostDec);

  // Profit Margin % = (Net Profit / Net Revenue) * 100
  let profitMarginDec = new Decimal(0);
  if (effectiveRevenueDec.greaterThan(0)) {
    profitMarginDec = netProfitDec.dividedBy(effectiveRevenueDec).times(100);
  }

  // Return on Investment (ROI) % = (Net Profit / Total Seller Cost) * 100
  let roiDec = new Decimal(0);
  if (sellerCostDec.greaterThan(0)) {
    roiDec = netProfitDec.dividedBy(sellerCostDec).times(100);
  }

  return {
    effectiveSellingPrice: effectiveRevenueDec.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    totalCost: totalCostDec.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    netProfit: netProfitDec.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    profitMargin: profitMarginDec.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    roi: roiDec.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber()
  };
};

export default { calculateProfitability };
