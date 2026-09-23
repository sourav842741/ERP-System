import { RtoRiskRule, RtoBlacklist } from '../models/RtoRiskRule.js';
import { Order } from '../models/Order.js';
import { evaluateOrderRisk } from '../services/rtoRiskService.js';

/**
 * Controller for RTO & COD Fraud Risk Engine
 */

// 1. Get Custom Rules
export const getRiskRules = async (req, res, next) => {
  try {
    const rules = await RtoRiskRule.find().sort({ priority: -1, createdAt: -1 }).lean();
    res.json({ success: true, count: rules.length, data: rules });
  } catch (error) {
    next(error);
  }
};

// 2. Create Custom Rule
export const createRiskRule = async (req, res, next) => {
  try {
    const rule = await RtoRiskRule.create(req.body);
    res.status(201).json({ success: true, data: rule, message: 'Risk rule created successfully' });
  } catch (error) {
    next(error);
  }
};

// 3. Update Custom Rule
export const updateRiskRule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rule = await RtoRiskRule.findByIdAndUpdate(id, req.body, { new: true });
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });
    res.json({ success: true, data: rule, message: 'Risk rule updated successfully' });
  } catch (error) {
    next(error);
  }
};

// 4. Delete Custom Rule
export const deleteRiskRule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rule = await RtoRiskRule.findByIdAndDelete(id);
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });
    res.json({ success: true, message: 'Risk rule deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// 5. Get Blacklist / Whitelist Records
export const getBlacklist = async (req, res, next) => {
  try {
    const { type, action } = req.query;
    const query = {};
    if (type && type !== 'all') query.type = type;
    if (action && action !== 'all') query.action = action;

    const list = await RtoBlacklist.find(query).sort({ createdAt: -1 }).lean();
    res.json({ success: true, count: list.length, data: list });
  } catch (error) {
    next(error);
  }
};

// 6. Add to Blacklist / Whitelist
export const addToBlacklist = async (req, res, next) => {
  try {
    const { type, value, action, reason, riskScorePenalty } = req.body;
    if (!type || !value) {
      return res.status(400).json({ success: false, message: 'Type and Value are required' });
    }

    const normValue = value.trim();
    const item = await RtoBlacklist.findOneAndUpdate(
      { type, value: normValue },
      {
        $set: {
          type,
          value: normValue,
          action: action || 'BLOCK',
          reason: reason || 'High RTO fraud history',
          riskScorePenalty: Number(riskScorePenalty) || 50,
          addedBy: req.user?._id || null,
          isActive: true
        }
      },
      { upsert: true, new: true }
    );

    res.status(201).json({ success: true, data: item, message: `Added ${normValue} to ${action}` });
  } catch (error) {
    next(error);
  }
};

// 7. Delete Blacklist / Whitelist Record
export const deleteFromBlacklist = async (req, res, next) => {
  try {
    const { id } = req.params;
    await RtoBlacklist.findByIdAndDelete(id);
    res.json({ success: true, message: 'Record removed successfully' });
  } catch (error) {
    next(error);
  }
};

// 8. Evaluate Order Risk on Demand
export const evaluateOrderRiskById = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const riskResult = await evaluateOrderRisk(order);

    order.rtoRisk = {
      score: riskResult.score,
      level: riskResult.level,
      isFlagged: riskResult.isFlagged,
      reasons: riskResult.reasons,
      actionTaken: order.rtoRisk?.actionTaken || 'NONE'
    };

    await order.save();
    res.json({ success: true, data: order.rtoRisk, orderId: order._id });
  } catch (error) {
    next(error);
  }
};

// 9. Take Action on Risky Order (Verify, Convert to Prepaid, Cancel Fraud)
export const orderRiskAction = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { action, notes } = req.body; // 'VERIFIED_CALL', 'CONVERTED_PREPAID', 'CANCELLED_FRAUD', 'WHITELIST'

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (!order.rtoRisk) {
      order.rtoRisk = { score: 0, level: 'LOW', reasons: [] };
    }

    order.rtoRisk.actionTaken = action;
    order.rtoRisk.verifiedAt = new Date();
    order.rtoRisk.verifiedBy = req.user?._id;

    if (action === 'VERIFIED_CALL') {
      order.rtoRisk.isFlagged = false;
      order.rtoRisk.reasons.push(`Manually verified by staff: ${notes || 'Customer confirmed over call'}`);
    } else if (action === 'CONVERTED_PREPAID') {
      order.paymentMethod = 'UPI';
      order.paymentStatus = 'PAID';
      order.rtoRisk.level = 'LOW';
      order.rtoRisk.isFlagged = false;
      order.rtoRisk.reasons.push('Converted from COD to Prepaid with customer approval');
    } else if (action === 'CANCELLED_FRAUD') {
      order.orderStatus = 'CANCELLED';
      order.cancellationReason = notes || 'Cancelled due to High RTO & Fraud Risk Score';

      // Auto-add customer phone to blacklist if specified
      const phone = order.customerSnapshot?.phone;
      if (phone) {
        await RtoBlacklist.findOneAndUpdate(
          { type: 'phone', value: phone },
          {
            $set: {
              type: 'phone',
              value: phone,
              action: 'BLOCK',
              reason: 'Fraud order cancelled by staff',
              riskScorePenalty: 80
            }
          },
          { upsert: true }
        );
      }
    }

    await order.save();
    res.json({ success: true, data: order, message: `Action ${action} recorded successfully` });
  } catch (error) {
    next(error);
  }
};

// 10. Dashboard Stats for RTO Risk
export const getRiskStats = async (req, res, next) => {
  try {
    const orders = await Order.find({ isDeleted: false })
      .select('paymentMethod total orderStatus rtoRisk createdAt')
      .lean();

    let totalCodOrders = 0;
    let highRiskCount = 0;
    let criticalCount = 0;
    let verifiedCount = 0;
    let potentialSavedCourierLoss = 0;

    orders.forEach((o) => {
      if (o.paymentMethod === 'COD') {
        totalCodOrders++;
        const level = o.rtoRisk?.level;
        if (level === 'CRITICAL') {
          criticalCount++;
          potentialSavedCourierLoss += 140; // Estimated 2-way forward+RTO shipping loss saved
        } else if (level === 'HIGH') {
          highRiskCount++;
          potentialSavedCourierLoss += 110;
        }
        if (o.rtoRisk?.actionTaken === 'VERIFIED_CALL' || o.rtoRisk?.actionTaken === 'CONVERTED_PREPAID') {
          verifiedCount++;
        }
      }
    });

    res.json({
      success: true,
      data: {
        totalCodOrders,
        flaggedOrders: highRiskCount + criticalCount,
        criticalCount,
        highRiskCount,
        verifiedCount,
        potentialSavedCourierLoss
      }
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getRiskRules,
  createRiskRule,
  updateRiskRule,
  deleteRiskRule,
  getBlacklist,
  addToBlacklist,
  deleteFromBlacklist,
  evaluateOrderRiskById,
  orderRiskAction,
  getRiskStats
};
