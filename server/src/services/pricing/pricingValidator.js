/**
 * Input validator for Marketplace Pricing Engine
 */

export const validatePricingInput = (data, mode = 'FORWARD') => {
  const errors = [];

  if (!data.marketplace || typeof data.marketplace !== 'string') {
    errors.push('Marketplace is required (e.g. Amazon, Flipkart, Meesho, Myntra)');
  }

  const productCost = Number(data.productCost);
  if (isNaN(productCost) || productCost < 0) {
    errors.push('Product cost must be a non-negative number');
  }

  if (mode === 'FORWARD') {
    const sellingPrice = Number(data.sellingPrice);
    if (isNaN(sellingPrice) || sellingPrice <= 0) {
      errors.push('Selling price must be greater than zero for forward calculation');
    }
  } else if (mode === 'REVERSE') {
    const hasProfit = data.desiredProfit !== undefined && data.desiredProfit !== null && data.desiredProfit !== '';
    const hasMargin = data.desiredMargin !== undefined && data.desiredMargin !== null && data.desiredMargin !== '';

    if (!hasProfit && !hasMargin) {
      errors.push('Reverse calculation requires either desired profit (₹) or desired margin (%)');
    }
    if (hasMargin && (Number(data.desiredMargin) < 0 || Number(data.desiredMargin) >= 100)) {
      errors.push('Desired margin percentage must be between 0% and 99.9%');
    }
  }

  if (data.weight !== undefined && data.weight !== null && Number(data.weight) < 0) {
    errors.push('Weight cannot be negative');
  }

  if (data.gstRate !== undefined && data.gstRate !== null) {
    const gst = Number(data.gstRate);
    if (isNaN(gst) || gst < 0 || gst > 100) {
      errors.push('GST rate must be a valid percentage between 0 and 100');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export default { validatePricingInput };
