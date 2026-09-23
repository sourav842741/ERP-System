import { RtoRiskRule, RtoBlacklist } from '../models/RtoRiskRule.js';
import { Order } from '../models/Order.js';

/**
 * Service for computing RTO (Return to Origin) & COD Fraud Risk
 */

export const evaluateOrderRisk = async (orderData) => {
  let score = 0;
  const reasons = [];
  let isFlagged = false;

  const phone = (orderData.customerSnapshot?.phone || orderData.shippingAddress?.phone || '').trim();
  const pincode = (orderData.shippingAddress?.postalCode || '').trim();
  const paymentMethod = (orderData.paymentMethod || 'COD').toUpperCase();
  const total = Number(orderData.total) || 0;
  const address = (orderData.shippingAddress?.street || orderData.customerSnapshot?.address || '').trim();

  // 1. Blacklist / Whitelist Check
  const blacklistedPhone = phone ? await RtoBlacklist.findOne({ type: 'phone', value: phone, isActive: true }) : null;
  const blacklistedPin = pincode ? await RtoBlacklist.findOne({ type: 'pincode', value: pincode, isActive: true }) : null;

  if (blacklistedPhone) {
    if (blacklistedPhone.action === 'ALLOW_WHITELIST') {
      return {
        score: 5,
        level: 'LOW',
        isFlagged: false,
        reasons: ['Customer phone is verified on Whitelist'],
        actionTaken: 'WHITELISTED'
      };
    } else {
      score += blacklistedPhone.riskScorePenalty || 60;
      reasons.push(`Phone ${phone} blacklisted: ${blacklistedPhone.reason}`);
      isFlagged = true;
    }
  }

  if (blacklistedPin) {
    if (blacklistedPin.action === 'BLOCK' || blacklistedPin.action === 'FLAG_REVIEW') {
      score += blacklistedPin.riskScorePenalty || 40;
      reasons.push(`Pincode ${pincode} blacklisted: ${blacklistedPin.reason}`);
      isFlagged = true;
    }
  }

  // 2. Fetch Active Custom DB Rules
  const rules = await RtoRiskRule.find({ isActive: true }).sort({ priority: -1 }).lean();

  if (rules && rules.length > 0) {
    for (const rule of rules) {
      let matched = false;

      switch (rule.riskType) {
        case 'payment_method':
          if (rule.conditions?.paymentMethod && paymentMethod === rule.conditions.paymentMethod.toUpperCase()) {
            matched = true;
          }
          break;

        case 'order_value':
          if (paymentMethod === 'COD') {
            if (rule.conditions?.minOrderValue && total >= rule.conditions.minOrderValue) {
              matched = true;
            }
          }
          break;

        case 'address_quality':
          if (rule.conditions?.minAddressLength && address.length < rule.conditions.minAddressLength) {
            matched = true;
          }
          break;

        case 'pincode':
          if (rule.conditions?.pincodes && rule.conditions.pincodes.includes(pincode)) {
            matched = true;
          } else if (rule.conditions?.pincodePrefixes) {
            for (const prefix of rule.conditions.pincodePrefixes) {
              if (pincode.startsWith(prefix)) {
                matched = true;
                break;
              }
            }
          }
          break;

        default:
          break;
      }

      if (matched) {
        score += rule.riskWeight;
        reasons.push(`${rule.ruleName} (+${rule.riskWeight})`);
      }
    }
  } else {
    // 3. Fallback Built-In Heuristics
    if (paymentMethod === 'COD') {
      score += 15;
      reasons.push('Cash on Delivery (COD) payment method (+15)');

      if (total >= 3000) {
        score += 30;
        reasons.push('High value COD order >= ₹3000 (+30)');
      } else if (total >= 1500) {
        score += 15;
        reasons.push('Moderate COD order value >= ₹1500 (+15)');
      }
    } else {
      // Prepaid orders inherently have low fraud probability
      score += 0;
    }

    if (address.length < 15) {
      score += 25;
      reasons.push('Incomplete street address (< 15 chars) (+25)');
    }

    if (!pincode || pincode.length !== 6) {
      score += 20;
      reasons.push('Missing or invalid postal code (+20)');
    }

    if (!phone || phone.replace(/\D/g, '').length < 10) {
      score += 35;
      reasons.push('Invalid phone number (+35)');
    }
  }

  // 4. Check Customer Order History (Repeat RTOs)
  if (phone) {
    try {
      const pastOrders = await Order.find({
        $or: [
          { 'customerSnapshot.phone': phone },
          { 'shippingAddress.phone': phone }
        ],
        _id: { $ne: orderData._id }
      }).limit(10).lean();

      if (pastOrders && pastOrders.length > 0) {
        const rtoCount = pastOrders.filter((o) =>
          o.orderStatus === 'RETURNED' ||
          o.orderStatus === 'CANCELLED' ||
          (o.returnDetails && o.returnDetails.requestedAt)
        ).length;

        if (rtoCount >= 2) {
          score += 35;
          reasons.push(`Customer has ${rtoCount} prior returns/cancellations (+35)`);
          isFlagged = true;
        } else if (rtoCount === 0 && pastOrders.length >= 2) {
          // Trusted repeat buyer discount
          score = Math.max(0, score - 20);
          reasons.push('Trusted repeat customer (-20)');
        }
      }
    } catch (err) {
      console.warn('History lookup skipped', err.message);
    }
  }

  // Cap score 0 - 100
  score = Math.min(100, Math.max(0, score));

  // Determine Level
  let level = 'LOW';
  if (score >= 80) {
    level = 'CRITICAL';
    isFlagged = true;
  } else if (score >= 55) {
    level = 'HIGH';
    isFlagged = true;
  } else if (score >= 30) {
    level = 'MEDIUM';
  } else {
    level = 'LOW';
  }

  return {
    score,
    level,
    isFlagged,
    reasons
  };
};

export default {
  evaluateOrderRisk
};
