import React, { useState, useEffect } from 'react';
import {
  Calculator, ArrowRightLeft, Layers, History, Settings, ShieldCheck,
  TrendingUp, Percent, DollarSign, Package, Truck, RotateCcw,
  Sparkles, CheckCircle2, AlertCircle, Copy, RefreshCw, Eye,
  ChevronDown, ChevronRight, ExternalLink, Plus, Trash2, Check,
  Search, Info, ArrowUpRight, HelpCircle, Edit2, Sliders, X
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';

const MARKETPLACES = [
  { code: 'amazon', name: 'Amazon', badge: 'bg-[#ff9900]/10 text-amber-600 dark:text-amber-400 border-amber-500/30', color: '#ff9900', defaultFulfilment: 'Easy Ship' },
  { code: 'flipkart', name: 'Flipkart', badge: 'bg-[#2874f0]/10 text-blue-600 dark:text-blue-400 border-blue-500/30', color: '#2874f0', defaultFulfilment: 'Flipkart Fulfilled' },
  { code: 'meesho', name: 'Meesho', badge: 'bg-[#f43397]/10 text-pink-600 dark:text-pink-400 border-pink-500/30', color: '#f43397', defaultFulfilment: 'Standard Seller Dispatch' },
  { code: 'myntra', name: 'Myntra', badge: 'bg-[#ff3f6c]/10 text-rose-600 dark:text-rose-400 border-rose-500/30', color: '#ff3f6c', defaultFulfilment: 'Partner Fulfilled' }
];

export const MarketplacePricing = () => {
  const { user } = useAuth();

  // Active Tab: 'calculator' | 'compare' | 'history' | 'rules'
  const [activeTab, setActiveTab] = useState('calculator');

  // Products from ERP for quick autofill
  const [erpProducts, setErpProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');

  // Mode: 'FORWARD' (Calculate Profit from Selling Price) vs 'REVERSE' (Find Selling Price for Target Profit/Margin)
  const [calcMode, setCalcMode] = useState('FORWARD');

  // Reverse Target Mode: 'PROFIT' (₹) or 'MARGIN' (%)
  const [reverseTargetMode, setReverseTargetMode] = useState('PROFIT');

  // Input State
  const [formData, setFormData] = useState({
    marketplace: 'amazon',
    productCost: 250,
    packagingCost: 15,
    internalLogistics: 0,
    otherSellerCosts: 0,
    mrp: 999,
    sellingPrice: 599,
    desiredProfit: 100,
    desiredMargin: 20,
    category: 'Fashion',
    subCategory: '',
    weight: 450, // grams
    packageWeight: 50,
    length: 25, // cm
    width: 18,
    height: 6,
    gstRate: 18,
    fulfilmentType: 'Easy Ship',
    shippingZone: 'National',
    couponDiscount: 0,
    promotionalDiscount: 0,
    returnRate: 5,
    rtoRate: 3
  });

  // Calculation Results
  const [calculating, setCalculating] = useState(false);
  const [calculationResult, setCalculationResult] = useState(null);
  const [calcError, setCalcError] = useState(null);

  // Comparison Matrix State
  const [comparing, setComparing] = useState(false);
  const [comparisonResults, setComparisonResults] = useState(null);

  // Calculation Transparency Modal
  const [showExplainModal, setShowExplainModal] = useState(false);

  // History State
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [savingHistory, setSavingHistory] = useState(false);
  const [historySavedSuccess, setHistorySavedSuccess] = useState(false);

  // Rules State
  const [rulesList, setRulesList] = useState([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [rulesFilterMarketplace, setRulesFilterMarketplace] = useState('all');
  const [ruleSearchQuery, setRuleSearchQuery] = useState('');
  const [showCreateRuleModal, setShowCreateRuleModal] = useState(false);

  // EDIT RULE MODAL STATE
  const [showEditRuleModal, setShowEditRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [updatingRule, setUpdatingRule] = useState(false);

  // New Rule Form Data
  const [newRuleData, setNewRuleData] = useState({
    marketplace: 'amazon',
    ruleName: '',
    chargeType: 'referral',
    calculationType: 'percentage',
    calculationBase: 'sellingPrice',
    category: '',
    minPrice: 0,
    maxPrice: '',
    percentage: 10,
    fixedAmount: 0,
    priority: 10
  });

  // Fetch ERP Products for Quick Autofill
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get('/products?limit=100');
        if (res.data?.success) {
          setErpProducts(res.data.data.products || []);
        }
      } catch (err) {
        console.error('Failed to load products for pricing', err);
      }
    };
    fetchProducts();
  }, []);

  // Run live calculation when core inputs change
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      handleCalculate();
    }, 350);
    return () => clearTimeout(debounceTimer);
  }, [
    formData.marketplace,
    formData.productCost,
    formData.packagingCost,
    formData.internalLogistics,
    formData.otherSellerCosts,
    formData.sellingPrice,
    formData.desiredProfit,
    formData.desiredMargin,
    formData.category,
    formData.weight,
    formData.packageWeight,
    formData.length,
    formData.width,
    formData.height,
    formData.gstRate,
    formData.fulfilmentType,
    formData.shippingZone,
    formData.couponDiscount,
    formData.promotionalDiscount,
    calcMode,
    reverseTargetMode
  ]);

  // Handle Product Autofill Selection
  const handleSelectProduct = (prodId) => {
    setSelectedProductId(prodId);
    if (!prodId) return;

    const prod = erpProducts.find((p) => p._id === prodId);
    if (prod) {
      setFormData((prev) => ({
        ...prev,
        productCost: prod.costPrice || prev.productCost,
        mrp: prod.mrp || prev.mrp,
        sellingPrice: prod.sellingPrice || prev.sellingPrice,
        weight: prod.weight || prev.weight,
        length: prod.dimensions?.length || prev.length,
        width: prod.dimensions?.width || prev.width,
        height: prod.dimensions?.height || prev.height,
        gstRate: prod.gst !== undefined ? prod.gst : prev.gstRate,
        category: (typeof prod.category === 'object' ? prod.category?.name : prod.category) || 'Fashion'
      }));
    }
  };

  // Perform Live Calculation
  const handleCalculate = async () => {
    setCalculating(true);
    setCalcError(null);
    try {
      const endpoint = calcMode === 'REVERSE' ? '/pricing/reverse-calculate' : '/pricing/calculate';
      const payload = {
        ...formData,
        dimensions: {
          length: Number(formData.length) || 0,
          width: Number(formData.width) || 0,
          height: Number(formData.height) || 0
        },
        desiredProfit: reverseTargetMode === 'PROFIT' ? Number(formData.desiredProfit) : undefined,
        desiredMargin: reverseTargetMode === 'MARGIN' ? Number(formData.desiredMargin) : undefined
      };

      const res = await api.post(endpoint, payload);
      if (res.data?.success) {
        setCalculationResult(res.data.data);
      }
    } catch (err) {
      setCalcError(err.response?.data?.message || err.message);
    } finally {
      setCalculating(false);
    }
  };

  // Run Multi-Marketplace Comparison
  const handleCompareAll = async () => {
    setComparing(true);
    try {
      const payload = {
        ...formData,
        dimensions: {
          length: Number(formData.length) || 0,
          width: Number(formData.width) || 0,
          height: Number(formData.height) || 0
        }
      };
      const res = await api.post('/pricing/compare', payload);
      if (res.data?.success) {
        setComparisonResults(res.data.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Comparison failed');
    } finally {
      setComparing(false);
    }
  };

  // Save current calculation to History
  const handleSaveToHistory = async () => {
    setSavingHistory(true);
    setHistorySavedSuccess(false);
    try {
      const endpoint = calcMode === 'REVERSE' ? '/pricing/reverse-calculate' : '/pricing/calculate';
      const payload = {
        ...formData,
        dimensions: {
          length: Number(formData.length) || 0,
          width: Number(formData.width) || 0,
          height: Number(formData.height) || 0
        },
        productId: selectedProductId || undefined,
        saveHistory: true,
        notes: `Calculated via Nexus Pricing Engine (${calcMode})`
      };

      await api.post(endpoint, payload);
      setHistorySavedSuccess(true);
      setTimeout(() => setHistorySavedSuccess(false), 3000);
      if (activeTab === 'history') fetchHistory();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save calculation');
    } finally {
      setSavingHistory(false);
    }
  };

  // Fetch Pricing History
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get('/pricing/history');
      if (res.data?.success) {
        setHistoryList(res.data.data.history || []);
      }
    } catch (err) {
      console.error('Failed to load pricing history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Fetch Marketplace Rules
  const fetchRules = async () => {
    setLoadingRules(true);
    try {
      const params = {};
      if (rulesFilterMarketplace !== 'all') params.marketplace = rulesFilterMarketplace;
      if (ruleSearchQuery) params.search = ruleSearchQuery;
      const res = await api.get('/marketplace-rules', { params });
      if (res.data?.success) {
        setRulesList(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load rules', err);
    } finally {
      setLoadingRules(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
    if (activeTab === 'rules') fetchRules();
    if (activeTab === 'compare') handleCompareAll();
  }, [activeTab, rulesFilterMarketplace]);

  // Open Edit Rule Modal
  const handleOpenEditRule = (rule) => {
    setEditingRule({
      _id: rule._id,
      marketplace: rule.marketplace,
      ruleName: rule.ruleName,
      description: rule.description || '',
      chargeType: rule.chargeType,
      calculationType: rule.calculationType,
      calculationBase: rule.calculationBase || 'sellingPrice',
      conditions: {
        category: rule.conditions?.category || '',
        subCategory: rule.conditions?.subCategory || '',
        minPrice: rule.conditions?.minPrice ?? 0,
        maxPrice: rule.conditions?.maxPrice ?? '',
        minWeight: rule.conditions?.minWeight ?? 0,
        maxWeight: rule.conditions?.maxWeight ?? '',
        fulfilmentType: rule.conditions?.fulfilmentType || '',
        shippingZone: rule.conditions?.shippingZone || ''
      },
      calculation: {
        percentage: rule.calculation?.percentage ?? 0,
        fixedAmount: rule.calculation?.fixedAmount ?? 0,
        formula: rule.calculation?.formula || '',
        priceSlabs: rule.calculation?.priceSlabs ? JSON.parse(JSON.stringify(rule.calculation.priceSlabs)) : [],
        weightSlabs: rule.calculation?.weightSlabs ? JSON.parse(JSON.stringify(rule.calculation.weightSlabs)) : []
      },
      priority: rule.priority ?? 10,
      version: rule.version || 1,
      isActive: rule.isActive ?? true
    });
    setShowEditRuleModal(true);
  };

  // Open Edit Rule directly by ID (from calculator card or explain modal)
  const handleOpenEditRuleById = async (ruleId) => {
    try {
      // 1. Try local state first
      const foundInState = rulesList.find((r) => r._id === ruleId);
      if (foundInState) {
        handleOpenEditRule(foundInState);
        return;
      }
      // 2. Fetch specific rule directly
      const res = await api.get(`/marketplace-rules/${ruleId}`);
      if (res.data?.success && res.data.data) {
        handleOpenEditRule(res.data.data);
      } else {
        // Fallback: fetch all rules
        const allRes = await api.get('/marketplace-rules');
        const fallbackFound = allRes.data?.data?.find((r) => r._id === ruleId);
        if (fallbackFound) {
          handleOpenEditRule(fallbackFound);
        } else {
          alert('Rule not found for editing');
        }
      }
    } catch (err) {
      console.error('Failed to open edit rule by ID', err);
      // Fallback: load all rules and find
      try {
        const allRes = await api.get('/marketplace-rules');
        const fallbackFound = allRes.data?.data?.find((r) => r._id === ruleId);
        if (fallbackFound) {
          handleOpenEditRule(fallbackFound);
        } else {
          alert('Rule not found');
        }
      } catch (fallbackErr) {
        alert(err.response?.data?.message || 'Failed to load rule for editing');
      }
    }
  };

  // Save Rule Edits (PUT)
  const handleUpdateRuleSubmit = async (e) => {
    e.preventDefault();
    if (!editingRule) return;
    setUpdatingRule(true);
    try {
      const payload = {
        marketplace: editingRule.marketplace,
        ruleName: editingRule.ruleName,
        description: editingRule.description,
        chargeType: editingRule.chargeType,
        calculationType: editingRule.calculationType,
        calculationBase: editingRule.calculationBase,
        conditions: {
          ...editingRule.conditions,
          minPrice: Number(editingRule.conditions.minPrice) || 0,
          maxPrice: editingRule.conditions.maxPrice !== '' && editingRule.conditions.maxPrice !== null ? Number(editingRule.conditions.maxPrice) : null,
          minWeight: Number(editingRule.conditions.minWeight) || 0,
          maxWeight: editingRule.conditions.maxWeight !== '' && editingRule.conditions.maxWeight !== null ? Number(editingRule.conditions.maxWeight) : null
        },
        calculation: {
          percentage: Number(editingRule.calculation.percentage) || 0,
          fixedAmount: Number(editingRule.calculation.fixedAmount) || 0,
          formula: editingRule.calculation.formula || null,
          priceSlabs: editingRule.calculation.priceSlabs || [],
          weightSlabs: editingRule.calculation.weightSlabs || []
        },
        priority: Number(editingRule.priority) || 10,
        isActive: editingRule.isActive
      };

      await api.put(`/marketplace-rules/${editingRule._id}`, payload);
      setShowEditRuleModal(false);
      setEditingRule(null);
      fetchRules();
      handleCalculate(); // Recalculate live prices with updated rule!
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setUpdatingRule(false);
    }
  };

  // Create Rule Submit (POST)
  const handleCreateRuleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        marketplace: newRuleData.marketplace,
        ruleName: newRuleData.ruleName,
        chargeType: newRuleData.chargeType,
        calculationType: newRuleData.calculationType,
        calculationBase: newRuleData.calculationBase,
        conditions: {
          category: newRuleData.category || undefined,
          minPrice: Number(newRuleData.minPrice) || 0,
          maxPrice: newRuleData.maxPrice ? Number(newRuleData.maxPrice) : null
        },
        calculation: {
          percentage: Number(newRuleData.percentage) || 0,
          fixedAmount: Number(newRuleData.fixedAmount) || 0
        },
        priority: Number(newRuleData.priority) || 10
      };

      await api.post('/marketplace-rules', payload);
      setShowCreateRuleModal(false);
      fetchRules();
      handleCalculate();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  // Toggle Rule Active Status
  const handleToggleRuleStatus = async (ruleId) => {
    try {
      await api.patch(`/marketplace-rules/${ruleId}/status`);
      fetchRules();
      handleCalculate();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update rule status');
    }
  };

  // Duplicate Rule
  const handleDuplicateRule = async (ruleId) => {
    try {
      await api.post(`/marketplace-rules/${ruleId}/duplicate`);
      fetchRules();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to duplicate rule');
    }
  };

  // Delete Rule
  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this pricing rule?')) return;
    try {
      await api.delete(`/marketplace-rules/${ruleId}`);
      fetchRules();
      handleCalculate();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete rule');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Marketplace Pricing & Listing Price Calculator
            </h2>
            <Badge variant="primary" size="sm" className="hidden sm:inline-flex items-center gap-1 font-mono">
              <Sparkles className="w-3 h-3" /> Rule Engine v2.4
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Precision marketplace fee estimation, forward profit margins, reverse listing price solver, and visual rule builder.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {historySavedSuccess && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved to History
            </span>
          )}
          <Button
            size="sm"
            onClick={handleSaveToHistory}
            loading={savingHistory}
            className="bg-primary-600 hover:bg-primary-700 text-white text-xs"
          >
            <History className="w-3.5 h-3.5 mr-1" /> Save Calculation
          </Button>
        </div>
      </div>

      {/* 2. Top Segmented Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('calculator')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'calculator'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Calculator className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          <span>Pricing Calculator</span>
        </button>

        <button
          onClick={() => setActiveTab('compare')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'compare'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4 text-sky-500" />
          <span>Compare 4 Marketplaces</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'history'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4 text-emerald-500" />
          <span>Calculation History & Audits</span>
        </button>

        {/* 4th Tab: Accessible to Everyone to Configure & Edit Rules */}
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'rules'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4 text-amber-500" />
          <span>Marketplace Rules & Slabs (Edit)</span>
        </button>
      </div>

      {/* 3. TAB 1: PRICING CALCULATOR */}
      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: PARAMETER INPUTS (7 COLS) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Mode Switcher Banner: Forward vs Reverse */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ArrowRightLeft className="w-4 h-4 text-primary-600" /> Calculation Direction
                </span>
                <span className="text-[11px] text-slate-400">
                  {calcMode === 'FORWARD' ? 'Profit from Selling Price' : 'Solve Required Selling Price'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCalcMode('FORWARD')}
                  className={`py-2 px-3 rounded-md text-xs font-bold transition-all text-center ${
                    calcMode === 'FORWARD'
                      ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Mode A: Calculate Profit (Forward)
                </button>
                <button
                  type="button"
                  onClick={() => setCalcMode('REVERSE')}
                  className={`py-2 px-3 rounded-md text-xs font-bold transition-all text-center ${
                    calcMode === 'REVERSE'
                      ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Mode B: Find Selling Price (Reverse)
                </button>
              </div>
            </div>

            {/* Product & Marketplace Identity Card */}
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary-600" /> Product & Target Marketplace
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setRulesFilterMarketplace(formData.marketplace);
                    setActiveTab('rules');
                  }}
                  className="text-[11px] font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" /> Edit Rules for {formData.marketplace}
                </button>
              </div>

              {/* ERP Product Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Autofill from Existing ERP Product:
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleSelectProduct(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:border-primary-500"
                >
                  <option value="">-- Choose Product to Auto-Fill Specs --</option>
                  {erpProducts.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.sku}) — Cost: ₹{p.costPrice} | MRP: ₹{p.mrp}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Marketplace Choice */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Target Marketplace *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {MARKETPLACES.map((mkt) => {
                    const isSelected = formData.marketplace === mkt.code;
                    return (
                      <button
                        key={mkt.code}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            marketplace: mkt.code,
                            fulfilmentType: mkt.defaultFulfilment
                          }))
                        }
                        className={`p-3 rounded-xl border text-center transition-all relative ${
                          isSelected
                            ? 'border-primary-500 bg-primary-50/60 dark:bg-primary-950/40 ring-2 ring-primary-500/20 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary-600 text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                        <span className="font-bold text-xs text-slate-900 dark:text-white block">
                          {mkt.name}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {mkt.defaultFulfilment}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category, Fulfilment & Shipping Zone */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Product Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full text-xs p-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="Fashion">Fashion & Apparel</option>
                    <option value="Electronics">Electronics & Gadgets</option>
                    <option value="Beauty">Beauty & Personal Care</option>
                    <option value="Home">Home & Kitchen</option>
                    <option value="Footwear">Footwear & Shoes</option>
                    <option value="General">General Merchandise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Fulfilment Type
                  </label>
                  <select
                    value={formData.fulfilmentType}
                    onChange={(e) => setFormData({ ...formData, fulfilmentType: e.target.value })}
                    className="w-full text-xs p-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="Easy Ship">Easy Ship (Standard)</option>
                    <option value="FBA">FBA (Amazon Fulfilled)</option>
                    <option value="Flipkart Fulfilled">Flipkart Fulfilled</option>
                    <option value="Standard Seller Dispatch">Standard Seller Dispatch</option>
                    <option value="Partner Fulfilled">Partner Fulfilled (Myntra)</option>
                    <option value="Self Ship">Self Ship / Direct Merchant</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Shipping Zone
                  </label>
                  <select
                    value={formData.shippingZone}
                    onChange={(e) => setFormData({ ...formData, shippingZone: e.target.value })}
                    className="w-full text-xs p-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="Local">Local (Intra-City)</option>
                    <option value="Regional">Regional (Same State/Zone)</option>
                    <option value="National">National (Inter-State All India)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Financial Parameters & Pricing */}
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary-600" /> Cost & Pricing Parameters
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Product Cost Price (₹) *"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.productCost}
                  onChange={(e) => setFormData({ ...formData, productCost: Number(e.target.value) })}
                />
                <Input
                  label="Packaging Material Cost (₹)"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.packagingCost}
                  onChange={(e) => setFormData({ ...formData, packagingCost: Number(e.target.value) })}
                />
                <Input
                  label="Internal Transport / Logistics (₹)"
                  type="number"
                  min="0"
                  value={formData.internalLogistics}
                  onChange={(e) => setFormData({ ...formData, internalLogistics: Number(e.target.value) })}
                />
              </div>

              {/* Mode A: Selling Price Input vs Mode B: Desired Profit / Margin Input */}
              {calcMode === 'FORWARD' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <Input
                    label="Listing Selling Price (₹) *"
                    type="number"
                    min="1"
                    step="1"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                  />
                  <Input
                    label="Maximum Retail Price - MRP (₹)"
                    type="number"
                    min="0"
                    value={formData.mrp}
                    onChange={(e) => setFormData({ ...formData, mrp: Number(e.target.value) })}
                  />
                </div>
              ) : (
                <div className="p-4 bg-primary-50/60 dark:bg-primary-950/30 rounded-xl border border-primary-200 dark:border-primary-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary-900 dark:text-primary-200">
                      🎯 Target Profit Objective
                    </span>
                    <div className="flex items-center bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setReverseTargetMode('PROFIT')}
                        className={`px-2.5 py-1 rounded font-semibold transition-all ${
                          reverseTargetMode === 'PROFIT'
                            ? 'bg-primary-600 text-white shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Target Profit (₹)
                      </button>
                      <button
                        type="button"
                        onClick={() => setReverseTargetMode('MARGIN')}
                        className={`px-2.5 py-1 rounded font-semibold transition-all ${
                          reverseTargetMode === 'MARGIN'
                            ? 'bg-primary-600 text-white shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Target Margin (%)
                      </button>
                    </div>
                  </div>

                  {reverseTargetMode === 'PROFIT' ? (
                    <Input
                      label="Desired Net Profit per Unit (₹) *"
                      type="number"
                      min="1"
                      value={formData.desiredProfit}
                      onChange={(e) => setFormData({ ...formData, desiredProfit: Number(e.target.value) })}
                      placeholder="e.g. ₹150 profit per order"
                    />
                  ) : (
                    <Input
                      label="Desired Net Margin (%) *"
                      type="number"
                      min="1"
                      max="90"
                      value={formData.desiredMargin}
                      onChange={(e) => setFormData({ ...formData, desiredMargin: Number(e.target.value) })}
                      placeholder="e.g. 25% margin"
                    />
                  )}
                </div>
              )}

              {/* Weight & Parcel Dimensions */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                <Input
                  label="Product Weight (g)"
                  type="number"
                  min="0"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                />
                <Input
                  label="Length (cm)"
                  type="number"
                  min="0"
                  value={formData.length}
                  onChange={(e) => setFormData({ ...formData, length: Number(e.target.value) })}
                />
                <Input
                  label="Width (cm)"
                  type="number"
                  min="0"
                  value={formData.width}
                  onChange={(e) => setFormData({ ...formData, width: Number(e.target.value) })}
                />
                <Input
                  label="Height (cm)"
                  type="number"
                  min="0"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) })}
                />
              </div>

              {/* Discounts & Taxes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <Input
                  label="Coupon Discount (₹)"
                  type="number"
                  min="0"
                  value={formData.couponDiscount}
                  onChange={(e) => setFormData({ ...formData, couponDiscount: Number(e.target.value) })}
                />
                <Input
                  label="Promo Discount (₹)"
                  type="number"
                  min="0"
                  value={formData.promotionalDiscount}
                  onChange={(e) => setFormData({ ...formData, promotionalDiscount: Number(e.target.value) })}
                />
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Product GST %
                  </label>
                  <select
                    value={formData.gstRate}
                    onChange={(e) => setFormData({ ...formData, gstRate: Number(e.target.value) })}
                    className="w-full text-xs p-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="0">0% (Nil)</option>
                    <option value="5">5% (Apparel &lt; ₹1000)</option>
                    <option value="12">12% (Apparel &gt; ₹1000)</option>
                    <option value="18">18% (Standard Retail)</option>
                    <option value="28">28% (Luxury / Electronics)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: LIVE CALCULATION BREAKDOWN (5 COLS) */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-4">
            {calculating && (
              <div className="p-3 text-center text-xs font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 rounded-xl border border-primary-200 dark:border-primary-800 flex items-center justify-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                <span>Precision engine calculating...</span>
              </div>
            )}

            {calcError && (
              <div className="p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{calcError}</span>
              </div>
            )}

            {calculationResult && (
              <div className="space-y-4">
                {/* 1. Main Hero Metric Card */}
                <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl shadow-xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {calcMode === 'REVERSE' ? 'Recommended Listing Price' : 'Gross Selling Price'}
                    </span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300 border border-primary-500/30 capitalize">
                      {calculationResult.marketplace}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-3xl font-black tracking-tight text-white">
                        ₹{calculationResult.finalRecommendedPrice.toFixed(2)}
                      </span>
                      {calcMode === 'REVERSE' && (
                        <p className="text-[11px] text-emerald-400 mt-0.5">
                          Guarantees target profit after all fees & taxes
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Net Profit:</span>
                      <span className={`text-xl font-extrabold ${calculationResult.breakdown.financials.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ₹{calculationResult.breakdown.financials.netProfit.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Profit Margin & ROI Bar */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Profit Margin</span>
                      <span className="font-bold text-base text-slate-200">
                        {calculationResult.breakdown.financials.profitMargin.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Return on Investment</span>
                      <span className="font-bold text-base text-slate-200">
                        {calculationResult.breakdown.financials.roi.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Chargeable Weight Pill */}
                  <div className="text-[10px] text-slate-400 bg-slate-800/80 p-2 rounded-lg flex items-center justify-between">
                    <span>Chargeable Weight:</span>
                    <span className="font-mono text-white font-semibold">
                      {calculationResult.weights.chargeableWeightGrams}g (Dead: {calculationResult.weights.deadWeightGrams}g, Vol: {calculationResult.weights.volumetricWeightGrams}g)
                    </span>
                  </div>
                </div>

                {/* 2. Structured Cost & Fee Breakdown Cards */}
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Itemized Cost Breakdown
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowExplainModal(true)}
                      className="text-[11px] font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> View Math Details
                    </button>
                  </div>

                  {/* Seller Costs */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between font-semibold text-slate-800 dark:text-slate-200">
                      <span>Seller Base Costs</span>
                      <span>₹{calculationResult.breakdown.sellerCosts.totalSellerCost.toFixed(2)}</span>
                    </div>
                    <div className="pl-2 space-y-0.5 text-[11px] text-slate-500">
                      <div className="flex justify-between">
                        <span>Product Cost:</span>
                        <span>₹{calculationResult.breakdown.sellerCosts.productCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Packaging Material:</span>
                        <span>₹{calculationResult.breakdown.sellerCosts.packagingCost.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Marketplace Fees */}
                  <div className="space-y-1.5 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between font-semibold text-slate-800 dark:text-slate-200">
                      <span>Total Marketplace Fees</span>
                      <span className="text-amber-600 dark:text-amber-400">
                        ₹{calculationResult.breakdown.marketplaceFees.totalMarketplaceFees.toFixed(2)}
                      </span>
                    </div>
                    <div className="pl-2 space-y-0.5 text-[11px] text-slate-500">
                      {calculationResult.breakdown.marketplaceFees.referralFee > 0 && (
                        <div className="flex justify-between">
                          <span>Referral Commission:</span>
                          <span>₹{calculationResult.breakdown.marketplaceFees.referralFee.toFixed(2)}</span>
                        </div>
                      )}
                      {calculationResult.breakdown.marketplaceFees.closingFee > 0 && (
                        <div className="flex justify-between">
                          <span>Fixed Closing Fee:</span>
                          <span>₹{calculationResult.breakdown.marketplaceFees.closingFee.toFixed(2)}</span>
                        </div>
                      )}
                      {calculationResult.breakdown.marketplaceFees.shippingFee > 0 && (
                        <div className="flex justify-between">
                          <span>Weight Handling / Shipping:</span>
                          <span>₹{calculationResult.breakdown.marketplaceFees.shippingFee.toFixed(2)}</span>
                        </div>
                      )}
                      {calculationResult.breakdown.marketplaceFees.pickPackFee > 0 && (
                        <div className="flex justify-between">
                          <span>Pick & Pack / Fulfilment:</span>
                          <span>₹{calculationResult.breakdown.marketplaceFees.pickPackFee.toFixed(2)}</span>
                        </div>
                      )}
                      {calculationResult.breakdown.marketplaceFees.paymentFee > 0 && (
                        <div className="flex justify-between">
                          <span>Payment / Banking Fee:</span>
                          <span>₹{calculationResult.breakdown.marketplaceFees.paymentFee.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Taxes & Reserves */}
                  <div className="space-y-1 text-xs pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                    <div className="flex justify-between">
                      <span>18% GST on Marketplace Fees:</span>
                      <span>₹{calculationResult.breakdown.taxes.gstOnMarketplaceFees.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Return & RTO Risk Reserve:</span>
                      <span>₹{calculationResult.breakdown.riskReserve.totalRiskReserve.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-white text-xs">
                      <span>Total Costs (Costs + Fees + Taxes):</span>
                      <span>₹{calculationResult.breakdown.financials.totalCost.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Applied Rules in this Calculation (Direct Edit) */}
                {calculationResult.matchedRules && calculationResult.matchedRules.length > 0 && (
                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-amber-500" />
                        Applied Rules ({calculationResult.matchedRules.length}) — Click to Edit
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setRulesFilterMarketplace(formData.marketplace);
                          setActiveTab('rules');
                        }}
                        className="text-[11px] font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                      >
                        <span>Manage All</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      {calculationResult.matchedRules.map((rule, idx) => (
                        <div
                          key={rule.ruleId || idx}
                          className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-2 hover:border-primary-300 dark:hover:border-primary-800 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {rule.ruleName}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono capitalize">
                                {rule.calculationType.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate mt-0.5">
                              {rule.explanation}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                              ₹{rule.calculatedFee.toFixed(2)}
                            </span>
                            {rule.ruleId && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditRuleById(rule.ruleId)}
                                className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 hover:bg-primary-50 dark:hover:bg-primary-950/60 border border-slate-200 dark:border-slate-700 hover:border-primary-400 text-primary-600 dark:text-primary-400 font-semibold text-[11px] flex items-center gap-1 shadow-2xs transition-colors"
                                title="Edit this rule rate or slabs"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Edit Rule</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. TAB 2: MULTI-MARKETPLACE COMPARISON MATRIX */}
      {activeTab === 'compare' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Multi-Marketplace Profitability Comparison
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Side-by-side fee simulation across Meesho, Amazon, Flipkart, and Myntra for ₹{formData.sellingPrice || 0} selling price and {formData.weight || 0}g parcel.
              </p>
            </div>
            <Button size="sm" onClick={handleCompareAll} loading={comparing} className="text-xs">
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Re-Compare Now
            </Button>
          </div>

          {comparing ? (
            <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <span>Running simultaneous pricing simulation across 4 marketplaces...</span>
            </div>
          ) : comparisonResults ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {['meesho', 'amazon', 'flipkart', 'myntra'].map((mktKey) => {
                const res = comparisonResults[mktKey];
                const mktMeta = MARKETPLACES.find((m) => m.code === mktKey);

                if (!res || res.error) {
                  return (
                    <div key={mktKey} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <span className="font-bold text-sm capitalize">{mktKey}</span>
                      <p className="text-xs text-rose-500 mt-2">Error: {res?.error || 'Unavailable'}</p>
                    </div>
                  );
                }

                const financials = res.breakdown.financials;
                const mktFees = res.breakdown.marketplaceFees.totalMarketplaceFees;
                const shipping = res.breakdown.marketplaceFees.shippingFee;

                return (
                  <div
                    key={mktKey}
                    className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-4 hover:border-primary-500 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded border capitalize ${mktMeta?.badge}`}>
                        {mktMeta?.name || mktKey}
                      </span>
                      <span className={`text-xs font-bold ${financials.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                        {financials.profitMargin.toFixed(1)}% Margin
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-slate-400 block">Estimated Net Profit</span>
                      <span className={`text-2xl font-black ${financials.netProfit >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-500'}`}>
                        ₹{financials.netProfit.toFixed(2)}
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex justify-between">
                        <span>Selling Price:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">₹{res.finalRecommendedPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Marketplace Fees:</span>
                        <span className="font-semibold text-amber-600">₹{mktFees.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Shipping Logistics:</span>
                        <span>₹{shipping.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Taxes on Fees:</span>
                        <span>₹{res.breakdown.taxes.gstOnMarketplaceFees.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Return Reserve:</span>
                        <span>₹{res.breakdown.riskReserve.totalRiskReserve.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-white">
                        <span>ROI:</span>
                        <span>{financials.roi.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      )}

      {/* 5. TAB 3: CALCULATION HISTORY & AUDITS */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Saved Pricing Calculations & Audit Trail
              </h3>
              <p className="text-xs text-slate-400">
                Audited snapshots of previous price simulations, rule versions, and margin breakdowns.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={fetchHistory} loading={loadingHistory} className="text-xs">
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
            </Button>
          </div>

          {loadingHistory ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading history...</div>
          ) : historyList.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No saved pricing calculations yet. Click "Save Calculation" on the calculator to create audit records.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Marketplace</th>
                    <th className="py-3 px-4">Product / SKU</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4 text-right">Selling Price</th>
                    <th className="py-3 px-4 text-right">Total Fees</th>
                    <th className="py-3 px-4 text-right">Net Profit</th>
                    <th className="py-3 px-4 text-right">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {historyList.map((rec) => (
                    <tr key={rec._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(rec.createdAt).toLocaleDateString()} {new Date(rec.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4 font-bold capitalize">{rec.marketplace}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate max-w-xs">
                          {rec.productSnapshot?.name || 'Custom Product'}
                        </span>
                        {rec.productSnapshot?.sku && (
                          <span className="text-[10px] text-slate-400 font-mono">{rec.productSnapshot.sku}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800">
                          {rec.mode}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        ₹{rec.finalRecommendedPrice.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-amber-600">
                        ₹{rec.breakdown?.marketplaceFees?.totalMarketplaceFees?.toFixed(2) || 0}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{rec.breakdown?.financials?.netProfit?.toFixed(2) || 0}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {rec.breakdown?.financials?.profitMargin?.toFixed(1) || 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 6. TAB 4: MARKETPLACE RULES & SLABS (WITH FULL EDITING & SLAB BUILDER) */}
      {activeTab === 'rules' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary-600" /> Marketplace Pricing Rules & Rate Cards
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Click on the <Edit2 className="w-3 h-3 inline text-primary-600" /> icon to edit fees, commission %, price tiers, or weight slabs for any marketplace.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setShowCreateRuleModal(true)} className="text-xs bg-primary-600 hover:bg-primary-700 text-white">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add New Pricing Rule
              </Button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="w-44">
              <select
                value={rulesFilterMarketplace}
                onChange={(e) => setRulesFilterMarketplace(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="all">All Marketplaces</option>
                <option value="amazon">Amazon</option>
                <option value="flipkart">Flipkart</option>
                <option value="meesho">Meesho</option>
                <option value="myntra">Myntra</option>
              </select>
            </div>

            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search rule by name, category..."
                value={ruleSearchQuery}
                onChange={(e) => setRuleSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchRules()}
                className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <Button size="sm" variant="outline" onClick={fetchRules} className="text-xs">
              Search
            </Button>
          </div>

          {/* Rules Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            {loadingRules ? (
              <div className="p-12 text-center text-xs text-slate-400">Loading rules...</div>
            ) : rulesList.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">No rules found matching criteria.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Marketplace</th>
                      <th className="py-3 px-4">Rule Name</th>
                      <th className="py-3 px-4">Charge Type</th>
                      <th className="py-3 px-4">Calculation</th>
                      <th className="py-3 px-4">Conditions</th>
                      <th className="py-3 px-4 text-center">Priority</th>
                      <th className="py-3 px-4 text-center">Version</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rulesList.map((rule) => (
                      <tr key={rule._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-bold capitalize">{rule.marketplace}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                          <div className="flex items-center gap-1.5">
                            <span>{rule.ruleName}</span>
                            {rule.isSystemSeed && (
                              <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                                System
                              </span>
                            )}
                          </div>
                          {rule.description && (
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-xs">{rule.description}</p>
                          )}
                        </td>
                        <td className="py-3 px-4 capitalize font-mono text-[11px] text-amber-600 dark:text-amber-400">
                          {rule.chargeType}
                        </td>
                        <td className="py-3 px-4 text-[11px]">
                          {rule.calculationType === 'percentage' && (
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {rule.calculation?.percentage}% ({rule.calculationBase || 'sellingPrice'})
                            </span>
                          )}
                          {rule.calculationType === 'fixed' && (
                            <span className="font-semibold text-slate-900 dark:text-white">
                              ₹{rule.calculation?.fixedAmount}
                            </span>
                          )}
                          {rule.calculationType === 'price_slab' && (
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {rule.calculation?.priceSlabs?.length || 0} price tiers
                            </span>
                          )}
                          {rule.calculationType === 'weight_slab' && (
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {rule.calculation?.weightSlabs?.length || 0} weight slabs
                            </span>
                          )}
                          {rule.calculationType === 'formula' && (
                            <span className="font-mono text-[10px] text-primary-600 truncate max-w-[120px] block">
                              {rule.calculation?.formula}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-500">
                          {rule.conditions?.category ? (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {rule.conditions.category}
                            </span>
                          ) : (
                            'Any Category'
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold">{rule.priority}</td>
                        <td className="py-3 px-4 text-center font-mono text-slate-400">v{rule.version || 1}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleRuleStatus(rule._id)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                              rule.isActive
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {rule.isActive ? 'Active' : 'Disabled'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditRule(rule)}
                              className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-primary-600 dark:text-primary-400 transition-colors"
                              title="Edit Rule & Slabs"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicateRule(rule._id)}
                              className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                              title="Clone Rule"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            {!rule.isSystemSeed && (
                              <button
                                type="button"
                                onClick={() => handleDeleteRule(rule._id)}
                                className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-500 hover:text-rose-700 transition-colors"
                                title="Delete Rule"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. CALCULATION TRANSPARENCY & AUDIT DETAILS MODAL (WITH QUICK EDIT SHORTCUTS) */}
      <Modal
        isOpen={showExplainModal}
        onClose={() => setShowExplainModal(false)}
        title="Calculation Details & Matched Rules Breakdown"
      >
        {calculationResult && (
          <div className="space-y-4 text-xs">
            <p className="text-slate-500 dark:text-slate-400">
              The engine matched the following rules based on marketplace criteria, category, and parcel weight:
            </p>

            <div className="space-y-3">
              {calculationResult.matchedRules.map((r, i) => (
                <div key={i} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">{r.ruleName}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                        ₹{r.calculatedFee.toFixed(2)}
                      </span>
                      {r.ruleId && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowExplainModal(false);
                            handleOpenEditRuleById(r.ruleId);
                          }}
                          className="px-2 py-0.5 rounded bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800 font-semibold text-[10px] flex items-center gap-1 hover:bg-primary-100"
                        >
                          <Edit2 className="w-2.5 h-2.5" /> Edit Rule
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono">{r.explanation}</p>
                  <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400">
                    <span>Base: {r.calculationBase}</span>
                    <span>&bull;</span>
                    <span>Type: {r.calculationType}</span>
                    <span>&bull;</span>
                    <span>Version: v{r.version}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg flex justify-between font-bold text-slate-900 dark:text-white">
              <span>Total Marketplace Fees:</span>
              <span>₹{calculationResult.breakdown.marketplaceFees.totalMarketplaceFees.toFixed(2)}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* 8. COMPLETE EDIT PRICING RULE MODAL */}
      <Modal
        isOpen={showEditRuleModal}
        onClose={() => setShowEditRuleModal(false)}
        title={editingRule ? `Edit Rule: ${editingRule.ruleName}` : 'Edit Pricing Rule'}
        maxWidth="max-w-3xl"
      >
        {editingRule && (
          <form onSubmit={handleUpdateRuleSubmit} className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Rule Version: <strong className="font-mono text-primary-600">v{editingRule.version}</strong>
              </span>
              <label className="flex items-center gap-2 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingRule.isActive}
                  onChange={(e) => setEditingRule({ ...editingRule, isActive: e.target.checked })}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <span>Active Rule</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Marketplace *</label>
                <select
                  value={editingRule.marketplace}
                  onChange={(e) => setEditingRule({ ...editingRule, marketplace: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="amazon">Amazon</option>
                  <option value="flipkart">Flipkart</option>
                  <option value="meesho">Meesho</option>
                  <option value="myntra">Myntra</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Charge Type *</label>
                <select
                  value={editingRule.chargeType}
                  onChange={(e) => setEditingRule({ ...editingRule, chargeType: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="referral">Referral / Commission</option>
                  <option value="closing">Fixed Closing Fee</option>
                  <option value="shipping">Shipping & Weight Handling</option>
                  <option value="pick_pack">Pick & Pack</option>
                  <option value="payment">Payment Processing</option>
                  <option value="return_fee">Return Fee</option>
                  <option value="rto_fee">RTO Fee</option>
                  <option value="storage_fee">Storage Fee</option>
                  <option value="other">Other Regulatory Fee</option>
                </select>
              </div>
            </div>

            <Input
              label="Rule Name *"
              required
              value={editingRule.ruleName}
              onChange={(e) => setEditingRule({ ...editingRule, ruleName: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Calculation Type *</label>
                <select
                  value={editingRule.calculationType}
                  onChange={(e) => setEditingRule({ ...editingRule, calculationType: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-medium"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                  <option value="price_slab">Price Slabs (Tiered by Price)</option>
                  <option value="weight_slab">Weight Slabs (Tiered by Weight)</option>
                  <option value="percentage_plus_fixed">Percentage + Fixed Fee</option>
                  <option value="formula">Safe Formula Expression</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Calculation Base</label>
                <select
                  value={editingRule.calculationBase}
                  onChange={(e) => setEditingRule({ ...editingRule, calculationBase: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="sellingPrice">Selling Price</option>
                  <option value="effectivePrice">Effective Selling Price (Post Discount)</option>
                  <option value="mrp">Maximum Retail Price (MRP)</option>
                  <option value="fixedAmount">Fixed Amount</option>
                </select>
              </div>
            </div>

            {/* DYNAMIC RATE INPUTS BASED ON CALCULATION TYPE */}
            {editingRule.calculationType === 'percentage' && (
              <Input
                label="Percentage Commission / Fee Rate (%)"
                type="number"
                step="0.1"
                min="0"
                value={editingRule.calculation.percentage}
                onChange={(e) =>
                  setEditingRule({
                    ...editingRule,
                    calculation: { ...editingRule.calculation, percentage: Number(e.target.value) }
                  })
                }
              />
            )}

            {editingRule.calculationType === 'fixed' && (
              <Input
                label="Fixed Fee Amount (₹)"
                type="number"
                step="0.5"
                min="0"
                value={editingRule.calculation.fixedAmount}
                onChange={(e) =>
                  setEditingRule({
                    ...editingRule,
                    calculation: { ...editingRule.calculation, fixedAmount: Number(e.target.value) }
                  })
                }
              />
            )}

            {editingRule.calculationType === 'percentage_plus_fixed' && (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Percentage (%)"
                  type="number"
                  step="0.1"
                  min="0"
                  value={editingRule.calculation.percentage}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      calculation: { ...editingRule.calculation, percentage: Number(e.target.value) }
                    })
                  }
                />
                <Input
                  label="Plus Fixed Fee (₹)"
                  type="number"
                  step="0.5"
                  min="0"
                  value={editingRule.calculation.fixedAmount}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      calculation: { ...editingRule.calculation, fixedAmount: Number(e.target.value) }
                    })
                  }
                />
              </div>
            )}

            {/* INTERACTIVE PRICE SLABS EDITOR */}
            {editingRule.calculationType === 'price_slab' && (
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Configured Price Tiers (Slabs)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const slabs = [...(editingRule.calculation.priceSlabs || [])];
                      const lastMax = slabs.length > 0 ? (slabs[slabs.length - 1].maxPrice || 1000) + 1 : 0;
                      slabs.push({ minPrice: lastMax, maxPrice: null, fee: 30, percentage: 0 });
                      setEditingRule({
                        ...editingRule,
                        calculation: { ...editingRule.calculation, priceSlabs: slabs }
                      });
                    }}
                    className="text-[11px] text-primary-600 dark:text-primary-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Price Slab
                  </button>
                </div>

                <div className="space-y-2">
                  {(editingRule.calculation.priceSlabs || []).map((slab, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-400 block">Min (₹)</label>
                        <input
                          type="number"
                          value={slab.minPrice}
                          onChange={(e) => {
                            const updated = [...editingRule.calculation.priceSlabs];
                            updated[index].minPrice = Number(e.target.value);
                            setEditingRule({ ...editingRule, calculation: { ...editingRule.calculation, priceSlabs: updated } });
                          }}
                          className="w-full text-xs p-1 bg-transparent border-b border-slate-200 dark:border-slate-700"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-400 block">Max (₹ or blank)</label>
                        <input
                          type="number"
                          value={slab.maxPrice ?? ''}
                          placeholder="No max"
                          onChange={(e) => {
                            const updated = [...editingRule.calculation.priceSlabs];
                            updated[index].maxPrice = e.target.value !== '' ? Number(e.target.value) : null;
                            setEditingRule({ ...editingRule, calculation: { ...editingRule.calculation, priceSlabs: updated } });
                          }}
                          className="w-full text-xs p-1 bg-transparent border-b border-slate-200 dark:border-slate-700"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-400 block">Fixed Fee (₹)</label>
                        <input
                          type="number"
                          value={slab.fee || 0}
                          onChange={(e) => {
                            const updated = [...editingRule.calculation.priceSlabs];
                            updated[index].fee = Number(e.target.value);
                            setEditingRule({ ...editingRule, calculation: { ...editingRule.calculation, priceSlabs: updated } });
                          }}
                          className="w-full text-xs p-1 bg-transparent border-b border-slate-200 dark:border-slate-700 font-bold"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = editingRule.calculation.priceSlabs.filter((_, idx) => idx !== index);
                          setEditingRule({ ...editingRule, calculation: { ...editingRule.calculation, priceSlabs: updated } });
                        }}
                        className="text-slate-400 hover:text-rose-500 pt-3"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* INTERACTIVE WEIGHT SLABS EDITOR */}
            {editingRule.calculationType === 'weight_slab' && (
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Configured Weight Slabs & Logistics Rates
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const slabs = [...(editingRule.calculation.weightSlabs || [])];
                      const lastMax = slabs.length > 0 ? (slabs[slabs.length - 1].maxWeight || 2000) + 1 : 0;
                      slabs.push({ minWeight: lastMax, maxWeight: null, fee: 90, additionalWeightStep: 1000, additionalFee: 30 });
                      setEditingRule({
                        ...editingRule,
                        calculation: { ...editingRule.calculation, weightSlabs: slabs }
                      });
                    }}
                    className="text-[11px] text-primary-600 dark:text-primary-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Weight Slab
                  </button>
                </div>

                <div className="space-y-2">
                  {(editingRule.calculation.weightSlabs || []).map((slab, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="w-24">
                        <label className="text-[10px] text-slate-400 block">Min (g)</label>
                        <input
                          type="number"
                          value={slab.minWeight}
                          onChange={(e) => {
                            const updated = [...editingRule.calculation.weightSlabs];
                            updated[index].minWeight = Number(e.target.value);
                            setEditingRule({ ...editingRule, calculation: { ...editingRule.calculation, weightSlabs: updated } });
                          }}
                          className="w-full text-xs p-1 bg-transparent border-b border-slate-200 dark:border-slate-700"
                        />
                      </div>
                      <div className="w-24">
                        <label className="text-[10px] text-slate-400 block">Max (g)</label>
                        <input
                          type="number"
                          value={slab.maxWeight ?? ''}
                          placeholder="No max"
                          onChange={(e) => {
                            const updated = [...editingRule.calculation.weightSlabs];
                            updated[index].maxWeight = e.target.value !== '' ? Number(e.target.value) : null;
                            setEditingRule({ ...editingRule, calculation: { ...editingRule.calculation, weightSlabs: updated } });
                          }}
                          className="w-full text-xs p-1 bg-transparent border-b border-slate-200 dark:border-slate-700"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-400 block">Base Fee (₹)</label>
                        <input
                          type="number"
                          value={slab.fee || 0}
                          onChange={(e) => {
                            const updated = [...editingRule.calculation.weightSlabs];
                            updated[index].fee = Number(e.target.value);
                            setEditingRule({ ...editingRule, calculation: { ...editingRule.calculation, weightSlabs: updated } });
                          }}
                          className="w-full text-xs p-1 bg-transparent border-b border-slate-200 dark:border-slate-700 font-bold"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-400 block">+Step Rate (₹/step)</label>
                        <input
                          type="number"
                          value={slab.additionalFee || 0}
                          onChange={(e) => {
                            const updated = [...editingRule.calculation.weightSlabs];
                            updated[index].additionalFee = Number(e.target.value);
                            setEditingRule({ ...editingRule, calculation: { ...editingRule.calculation, weightSlabs: updated } });
                          }}
                          className="w-full text-xs p-1 bg-transparent border-b border-slate-200 dark:border-slate-700"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = editingRule.calculation.weightSlabs.filter((_, idx) => idx !== index);
                          setEditingRule({ ...editingRule, calculation: { ...editingRule.calculation, weightSlabs: updated } });
                        }}
                        className="text-slate-400 hover:text-rose-500 pt-3"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conditions: Category, Fulfilment, Zone */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <Input
                label="Category Condition"
                value={editingRule.conditions?.category || ''}
                onChange={(e) =>
                  setEditingRule({
                    ...editingRule,
                    conditions: { ...editingRule.conditions, category: e.target.value }
                  })
                }
                placeholder="Leave blank for all"
              />

              <Input
                label="Fulfilment Condition"
                value={editingRule.conditions?.fulfilmentType || ''}
                onChange={(e) =>
                  setEditingRule({
                    ...editingRule,
                    conditions: { ...editingRule.conditions, fulfilmentType: e.target.value }
                  })
                }
                placeholder="Leave blank for all"
              />

              <Input
                label="Rule Priority"
                type="number"
                value={editingRule.priority}
                onChange={(e) => setEditingRule({ ...editingRule, priority: Number(e.target.value) })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="secondary" onClick={() => setShowEditRuleModal(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={updatingRule} className="bg-primary-600 hover:bg-primary-700 text-white">
                <Check className="w-3.5 h-3.5 mr-1" /> Save Rule Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* 9. CREATE PRICING RULE MODAL */}
      <Modal
        isOpen={showCreateRuleModal}
        onClose={() => setShowCreateRuleModal(false)}
        title="Add New Marketplace Pricing Rule"
      >
        <form onSubmit={handleCreateRuleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Marketplace *</label>
              <select
                value={newRuleData.marketplace}
                onChange={(e) => setNewRuleData({ ...newRuleData, marketplace: e.target.value })}
                className="w-full p-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="amazon">Amazon</option>
                <option value="flipkart">Flipkart</option>
                <option value="meesho">Meesho</option>
                <option value="myntra">Myntra</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Charge Type *</label>
              <select
                value={newRuleData.chargeType}
                onChange={(e) => setNewRuleData({ ...newRuleData, chargeType: e.target.value })}
                className="w-full p-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="referral">Referral / Commission</option>
                <option value="closing">Fixed Closing Fee</option>
                <option value="shipping">Shipping & Weight Handling</option>
                <option value="pick_pack">Pick & Pack</option>
                <option value="payment">Payment Processing</option>
                <option value="return_fee">Return Fee</option>
                <option value="rto_fee">RTO Fee</option>
                <option value="other">Other Regulatory Fee</option>
              </select>
            </div>
          </div>

          <Input
            label="Rule Name *"
            required
            value={newRuleData.ruleName}
            onChange={(e) => setNewRuleData({ ...newRuleData, ruleName: e.target.value })}
            placeholder="e.g. Amazon Electronics Commission 2026"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Calculation Type</label>
              <select
                value={newRuleData.calculationType}
                onChange={(e) => setNewRuleData({ ...newRuleData, calculationType: e.target.value })}
                className="w-full p-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Calculation Base</label>
              <select
                value={newRuleData.calculationBase}
                onChange={(e) => setNewRuleData({ ...newRuleData, calculationBase: e.target.value })}
                className="w-full p-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="sellingPrice">Selling Price</option>
                <option value="effectivePrice">Effective Selling Price</option>
                <option value="mrp">MRP</option>
                <option value="fixedAmount">Fixed Amount</option>
              </select>
            </div>
          </div>

          {newRuleData.calculationType === 'percentage' ? (
            <Input
              label="Percentage Rate (%)"
              type="number"
              step="0.1"
              value={newRuleData.percentage}
              onChange={(e) => setNewRuleData({ ...newRuleData, percentage: Number(e.target.value) })}
            />
          ) : (
            <Input
              label="Fixed Amount (₹)"
              type="number"
              step="0.5"
              value={newRuleData.fixedAmount}
              onChange={(e) => setNewRuleData({ ...newRuleData, fixedAmount: Number(e.target.value) })}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Condition: Category (Optional)"
              value={newRuleData.category}
              onChange={(e) => setNewRuleData({ ...newRuleData, category: e.target.value })}
              placeholder="e.g. Fashion"
            />
            <Input
              label="Rule Priority (Default: 10)"
              type="number"
              value={newRuleData.priority}
              onChange={(e) => setNewRuleData({ ...newRuleData, priority: Number(e.target.value) })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreateRuleModal(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white">
              Save Rule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MarketplacePricing;
