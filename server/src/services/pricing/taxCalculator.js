import Decimal from 'decimal.js';

/**
 * Calculates GST on marketplace service fees and product tax components
 */

export const calculateTaxes = ({
  sellingPrice = 0,
  marketplaceFeesTotal = 0,
  gstRateOnFees = 18, // 18% standard GST on service fees in India
  productGstRate = 18,
  isPriceGstInclusive = true
}) => {
  const feesTotalDec = new Decimal(marketplaceFeesTotal);
  const gstRateOnFeesDec = new Decimal(gstRateOnFees);
  const prodGstRateDec = new Decimal(productGstRate);
  const priceDec = new Decimal(sellingPrice);

  // 1. GST on Marketplace Fees (Always 18% of total marketplace service charges)
  const gstOnMarketplaceFees = feesTotalDec.times(gstRateOnFeesDec).dividedBy(100);

  // 2. Product GST Calculation
  let taxableProductAmount = new Decimal(0);
  let productGstAmount = new Decimal(0);

  if (prodGstRateDec.greaterThan(0)) {
    if (isPriceGstInclusive) {
      // Selling price already includes GST: Taxable = Price / (1 + Rate/100)
      const denominator = new Decimal(1).plus(prodGstRateDec.dividedBy(100));
      taxableProductAmount = priceDec.dividedBy(denominator);
      productGstAmount = priceDec.minus(taxableProductAmount);
    } else {
      // Selling price is pre-tax: GST = Price * Rate/100
      taxableProductAmount = priceDec;
      productGstAmount = priceDec.times(prodGstRateDec).dividedBy(100);
    }
  } else {
    taxableProductAmount = priceDec;
    productGstAmount = new Decimal(0);
  }

  return {
    gstOnMarketplaceFees: gstOnMarketplaceFees.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    productGstAmount: productGstAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    taxableProductAmount: taxableProductAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    totalTax: gstOnMarketplaceFees.plus(productGstAmount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
  };
};

export default { calculateTaxes };
