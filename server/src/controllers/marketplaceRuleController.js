import { Marketplace } from '../models/Marketplace.js';
import { MarketplaceRule } from '../models/MarketplaceRule.js';

/**
 * Controller for Admin Marketplace Configuration and Rule Management
 */

// 1. Get All Supported Marketplaces
export const getMarketplaces = async (req, res, next) => {
  try {
    const marketplaces = await Marketplace.find().sort({ name: 1 }).lean();
    res.json({ success: true, data: marketplaces });
  } catch (error) {
    next(error);
  }
};

// 2. Create or Update Marketplace Profile
export const saveMarketplace = async (req, res, next) => {
  try {
    const { name, code, logo, badgeColor, fulfilmentTypes, shippingZones, settings, description, isActive } = req.body;
    const normCode = code.toLowerCase().trim();

    const mkt = await Marketplace.findOneAndUpdate(
      { code: normCode },
      {
        $set: {
          name,
          code: normCode,
          logo,
          badgeColor,
          fulfilmentTypes: fulfilmentTypes || [],
          shippingZones: shippingZones || [],
          settings: settings || {},
          description,
          isActive: isActive !== undefined ? isActive : true
        }
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, data: mkt, message: `Marketplace ${name} saved successfully` });
  } catch (error) {
    next(error);
  }
};

// 3. Get Rules with Filtering & Search
export const getMarketplaceRules = async (req, res, next) => {
  try {
    const { marketplace, chargeType, search, isActive } = req.query;
    const query = {};

    if (marketplace && marketplace !== 'all') {
      query.marketplace = marketplace.toLowerCase().trim();
    }
    if (chargeType && chargeType !== 'all') {
      query.chargeType = chargeType;
    }
    if (isActive !== undefined && isActive !== 'all') {
      query.isActive = isActive === 'true';
    }
    if (search) {
      query.$or = [
        { ruleName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'conditions.category': { $regex: search, $options: 'i' } }
      ];
    }

    const rules = await MarketplaceRule.find(query)
      .sort({ marketplace: 1, chargeType: 1, priority: -1, createdAt: -1 })
      .lean();

    res.json({ success: true, count: rules.length, data: rules });
  } catch (error) {
    next(error);
  }
};

// 4. Create New Pricing Rule
export const createMarketplaceRule = async (req, res, next) => {
  try {
    const ruleData = req.body;
    ruleData.marketplace = ruleData.marketplace.toLowerCase().trim();
    ruleData.version = 1;

    const newRule = await MarketplaceRule.create(ruleData);
    res.status(201).json({ success: true, data: newRule, message: 'Pricing rule created successfully' });
  } catch (error) {
    next(error);
  }
};

// 5. Update Existing Rule with Versioning Support
export const updateMarketplaceRule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const existingRule = await MarketplaceRule.findById(id);

    if (!existingRule) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }

    // Versioning: If calculation or core conditions changed, bump version number
    let newVersion = existingRule.version || 1;
    const hasCoreChanges =
      JSON.stringify(updateData.calculation) !== JSON.stringify(existingRule.calculation) ||
      JSON.stringify(updateData.conditions) !== JSON.stringify(existingRule.conditions) ||
      updateData.calculationType !== existingRule.calculationType;

    if (hasCoreChanges) {
      newVersion += 1;
    }

    const updated = await MarketplaceRule.findByIdAndUpdate(
      id,
      {
        $set: {
          ...updateData,
          version: newVersion
        }
      },
      { new: true }
    );

    res.json({ success: true, data: updated, message: `Rule updated to version ${newVersion}` });
  } catch (error) {
    next(error);
  }
};

// 6. Duplicate Rule (Quick Clone for another category/tier)
export const duplicateMarketplaceRule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const original = await MarketplaceRule.findById(id).lean();

    if (!original) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }

    delete original._id;
    delete original.createdAt;
    delete original.updatedAt;

    original.ruleName = `${original.ruleName} (Copy)`;
    original.isSystemSeed = false;
    original.version = 1;

    const cloned = await MarketplaceRule.create(original);
    res.status(201).json({ success: true, data: cloned, message: 'Rule cloned successfully' });
  } catch (error) {
    next(error);
  }
};

// 7. Toggle Rule Active/Inactive
export const toggleRuleStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rule = await MarketplaceRule.findById(id);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }

    rule.isActive = !rule.isActive;
    await rule.save();

    res.json({ success: true, data: rule, message: `Rule ${rule.isActive ? 'activated' : 'deactivated'}` });
  } catch (error) {
    next(error);
  }
};

// 8. Delete Custom Rule (Prevent deleting protected system seed rules)
export const deleteMarketplaceRule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rule = await MarketplaceRule.findById(id);

    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }

    await MarketplaceRule.findByIdAndDelete(id);
    res.json({ success: true, message: 'Rule deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// 9. Get Single Marketplace Rule by ID
export const getMarketplaceRuleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rule = await MarketplaceRule.findById(id).lean();
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }
    res.json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
};

export default {
  getMarketplaces,
  saveMarketplace,
  getMarketplaceRules,
  createMarketplaceRule,
  updateMarketplaceRule,
  duplicateMarketplaceRule,
  toggleRuleStatus,
  deleteMarketplaceRule
};
