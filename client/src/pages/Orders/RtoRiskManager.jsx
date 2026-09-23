import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, ShieldCheck, AlertTriangle, PhoneCall,
  CheckCircle2, XCircle, Search, RefreshCw, Plus, Trash2,
  Edit2, Sliders, DollarSign, MapPin, Phone, UserX,
  CreditCard, Eye, ArrowUpRight, HelpCircle
} from 'lucide-react';
import api from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';

export const RtoRiskManager = () => {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'rules' | 'blacklist'

  // Orders State
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [filterLevel, setFilterLevel] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Stats State
  const [stats, setStats] = useState({
    totalCodOrders: 0,
    flaggedOrders: 0,
    criticalCount: 0,
    highRiskCount: 0,
    verifiedCount: 0,
    potentialSavedCourierLoss: 0
  });

  // Selected Order for Audit Modal & Action Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState('VERIFIED_CALL');
  const [actionNotes, setActionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Rules State
  const [rules, setRules] = useState([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [newRule, setNewRule] = useState({
    ruleName: '',
    riskType: 'order_value',
    riskWeight: 20,
    severity: 'HIGH',
    conditions: {
      minOrderValue: 2500,
      minAddressLength: 15
    }
  });

  // Blacklist State
  const [blacklist, setBlacklist] = useState([]);
  const [loadingBlacklist, setLoadingBlacklist] = useState(false);
  const [showAddBlacklistModal, setShowAddBlacklistModal] = useState(false);
  const [newBlacklist, setNewBlacklist] = useState({
    type: 'phone',
    value: '',
    action: 'BLOCK',
    reason: 'Repeat COD Refusal at doorstep',
    riskScorePenalty: 60
  });

  // Fetch Stats & Orders
  const fetchStats = async () => {
    try {
      const res = await api.get('/rto-risk/stats');
      if (res.data?.success) setStats(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await api.get('/orders');
      if (res.data?.success) {
        setOrders(res.data.data.orders || []);
      }
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchRules = async () => {
    setLoadingRules(true);
    try {
      const res = await api.get('/rto-risk/rules');
      if (res.data?.success) setRules(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRules(false);
    }
  };

  const fetchBlacklist = async () => {
    setLoadingBlacklist(true);
    try {
      const res = await api.get('/rto-risk/blacklist');
      if (res.data?.success) setBlacklist(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBlacklist(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchOrders();
  }, []);

  useEffect(() => {
    if (activeTab === 'rules') fetchRules();
    if (activeTab === 'blacklist') fetchBlacklist();
  }, [activeTab]);

  // Execute Order Risk Action (Verify, Convert to Prepaid, Cancel Fraud)
  const handleExecuteAction = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      await api.post(`/rto-risk/orders/${selectedOrder._id}/action`, {
        action: actionType,
        notes: actionNotes
      });
      setShowActionModal(false);
      setSelectedOrder(null);
      setActionNotes('');
      fetchOrders();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to execute action');
    } finally {
      setActionLoading(false);
    }
  };

  // Evaluate on Demand
  const handleEvaluateOnDemand = async (orderId) => {
    try {
      await api.post(`/rto-risk/evaluate/${orderId}`);
      fetchOrders();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Evaluation failed');
    }
  };

  // Create Rule Submit
  const handleCreateRule = async (e) => {
    e.preventDefault();
    try {
      await api.post('/rto-risk/rules', newRule);
      setShowAddRuleModal(false);
      setNewRule({
        ruleName: '',
        riskType: 'order_value',
        riskWeight: 20,
        severity: 'HIGH',
        conditions: { minOrderValue: 2500, minAddressLength: 15 }
      });
      fetchRules();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create rule');
    }
  };

  // Delete Rule
  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Delete this risk scoring rule?')) return;
    try {
      await api.delete(`/rto-risk/rules/${ruleId}`);
      fetchRules();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete rule');
    }
  };

  // Add Blacklist Submit
  const handleAddBlacklist = async (e) => {
    e.preventDefault();
    try {
      await api.post('/rto-risk/blacklist', newBlacklist);
      setShowAddBlacklistModal(false);
      setNewBlacklist({
        type: 'phone',
        value: '',
        action: 'BLOCK',
        reason: 'Repeat COD Refusal at doorstep',
        riskScorePenalty: 60
      });
      fetchBlacklist();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add to blacklist');
    }
  };

  // Delete Blacklist
  const handleDeleteBlacklist = async (id) => {
    try {
      await api.delete(`/rto-risk/blacklist/${id}`);
      fetchBlacklist();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove');
    }
  };

  // Filtered Orders
  const filteredOrders = orders.filter((o) => {
    if (o.paymentMethod !== 'COD' && filterLevel !== 'all_payments') {
      // Show primarily COD orders or all if selected
      if (filterLevel === 'all') return true;
    }
    if (filterLevel !== 'all' && filterLevel !== 'all_payments') {
      if ((o.rtoRisk?.level || 'LOW') !== filterLevel) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const numMatch = o.orderNumber?.toLowerCase().includes(q);
      const nameMatch = o.customerSnapshot?.name?.toLowerCase().includes(q);
      const phoneMatch = o.customerSnapshot?.phone?.includes(q);
      return numMatch || nameMatch || phoneMatch;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              RTO & Fraud Order Risk Predictor (COD Risk Engine)
            </h2>
            <p className="text-xs text-slate-500">
              Automated heuristics to flag high-risk COD orders and prevent courier return losses.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'orders'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            COD Risk Monitor
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'rules'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Risk Rules Engine ({rules.length})
          </button>
          <button
            onClick={() => setActiveTab('blacklist')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'blacklist'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Blacklist & Whitelist ({blacklist.length})
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-500 block">Total COD Orders</span>
          <span className="text-lg font-black text-slate-900 dark:text-white">{stats.totalCodOrders}</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-500 block">Flagged Risky</span>
          <span className="text-lg font-black text-amber-600 dark:text-amber-400">{stats.flaggedOrders}</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-500 block">Critical Fraud Risk</span>
          <span className="text-lg font-black text-rose-600 dark:text-rose-400">{stats.criticalCount}</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-500 block">Staff Verified Safe</span>
          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{stats.verifiedCount}</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-500 block">Saved Courier Loss</span>
          <span className="text-lg font-black text-primary-600 dark:text-primary-400">₹{stats.potentialSavedCourierLoss.toLocaleString()}</span>
        </div>
      </div>

      {/* 3. TAB 1: COD RISK MONITOR */}
      {activeTab === 'orders' && (
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search Order #, phone, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="text-xs p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
              >
                <option value="all">All Risk Levels</option>
                <option value="CRITICAL">Critical Risk (80%+)</option>
                <option value="HIGH">High Risk (55%-79%)</option>
                <option value="MEDIUM">Medium Risk (30%-54%)</option>
                <option value="LOW">Low Risk (&lt; 30%)</option>
              </select>

              <Button size="sm" variant="ghost" onClick={fetchOrders} loading={loadingOrders}>
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Orders Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3">Order Details</th>
                  <th className="py-3 px-3">Customer & Phone</th>
                  <th className="py-3 px-3">COD Amount</th>
                  <th className="py-3 px-3">Risk Score & Level</th>
                  <th className="py-3 px-3">Status / Action</th>
                  <th className="py-3 px-3 text-right">Remediation Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No matching orders found.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const risk = order.rtoRisk || { score: 15, level: 'LOW', reasons: [] };
                    const isCritical = risk.level === 'CRITICAL';
                    const isHigh = risk.level === 'HIGH';
                    const isMedium = risk.level === 'MEDIUM';

                    return (
                      <tr key={order._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/40">
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-slate-900 dark:text-white block">
                            {order.orderNumber}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {order.source} &bull; {new Date(order.createdAt).toLocaleDateString()}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                            {order.customerSnapshot?.name || 'Customer'}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3" /> {order.customerSnapshot?.phone || 'No phone'}
                          </span>
                        </td>

                        <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                          ₹{order.total?.toFixed(2)}
                          <span className="block text-[10px] font-normal text-slate-400">
                            {order.paymentMethod}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isCritical
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 ring-1 ring-rose-500/30'
                                  : isHigh
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : isMedium
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              }`}
                            >
                              {risk.score}% {risk.level}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowAuditModal(true);
                              }}
                              className="text-slate-400 hover:text-primary-600"
                              title="View Risk Audit Breakdown"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          {risk.actionTaken && risk.actionTaken !== 'NONE' ? (
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                              {risk.actionTaken}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Pending Review</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOrder(order);
                                setActionType('VERIFIED_CALL');
                                setShowActionModal(true);
                              }}
                              className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded font-semibold text-[10px] hover:bg-emerald-100"
                              title="Mark Phone Verified"
                            >
                              Verify
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOrder(order);
                                setActionType('CONVERTED_PREPAID');
                                setShowActionModal(true);
                              }}
                              className="px-2 py-1 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 rounded font-semibold text-[10px] hover:bg-primary-100"
                              title="Convert to Prepaid UPI"
                            >
                              To Prepaid
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOrder(order);
                                setActionType('CANCELLED_FRAUD');
                                setShowActionModal(true);
                              }}
                              className="px-2 py-1 bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded font-semibold text-[10px] hover:bg-rose-100"
                              title="Cancel Risky Fraud Order"
                            >
                              Block
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. TAB 2: RISK RULES ENGINE (CRUD) */}
      {activeTab === 'rules' && (
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active COD Risk Scoring Rules</h3>
              <p className="text-xs text-slate-500">Configure parameters that increase or decrease order risk scores.</p>
            </div>
            <Button size="sm" onClick={() => setShowAddRuleModal(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Risk Rule
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rules.map((rule) => (
              <div
                key={rule._id}
                className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white text-xs">{rule.ruleName}</span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950 text-rose-600 font-bold text-[10px]">
                      +{rule.riskWeight} Pts
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteRule(rule._id)}
                      className="text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500">
                  Type: <strong className="capitalize">{rule.riskType.replace('_', ' ')}</strong> &bull; Priority: {rule.priority}
                </p>

                {rule.conditions && (
                  <div className="text-[10px] text-slate-400 font-mono bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                    {rule.conditions.minOrderValue && `Trigger when COD >= ₹${rule.conditions.minOrderValue}`}
                    {rule.conditions.minAddressLength && `Trigger when Address length < ${rule.conditions.minAddressLength} chars`}
                    {rule.conditions.paymentMethod && `Trigger on Payment: ${rule.conditions.paymentMethod}`}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. TAB 3: BLACKLIST & WHITELIST (CRUD) */}
      {activeTab === 'blacklist' && (
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Fraud Blacklist & Trusted Whitelist</h3>
              <p className="text-xs text-slate-500">Instant blocking or bypass for repeat customers, phone numbers, and pincodes.</p>
            </div>
            <Button size="sm" onClick={() => setShowAddBlacklistModal(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Entry
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {blacklist.map((item) => (
              <div
                key={item._id}
                className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.action === 'ALLOW_WHITELIST' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {item.action}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteBlacklist(item._id)}
                    className="text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="font-mono font-bold text-xs text-slate-900 dark:text-white block">
                  {item.value} ({item.type})
                </span>
                <p className="text-[11px] text-slate-500">{item.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. RISK AUDIT BREAKDOWN MODAL */}
      <Modal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        title={selectedOrder ? `RTO Risk Audit: ${selectedOrder.orderNumber}` : 'Risk Audit'}
      >
        {selectedOrder && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">Total Risk Probability Score:</span>
                <span className="text-xl font-black text-rose-600 dark:text-rose-400">
                  {selectedOrder.rtoRisk?.score || 0}% ({selectedOrder.rtoRisk?.level || 'LOW'})
                </span>
              </div>
              <Button size="sm" variant="outline" onClick={() => handleEvaluateOnDemand(selectedOrder._id)}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Re-Evaluate
              </Button>
            </div>

            <div>
              <span className="font-bold text-slate-900 dark:text-white block mb-2">
                Scoring Factors & Heuristics Triggered:
              </span>
              <div className="space-y-1.5">
                {(selectedOrder.rtoRisk?.reasons || []).map((reason, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg flex items-center gap-2 text-rose-800 dark:text-rose-300 font-mono text-[11px]"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
              <div><strong>Delivery Address:</strong> {selectedOrder.shippingAddress?.street}, {selectedOrder.shippingAddress?.city} - {selectedOrder.shippingAddress?.postalCode}</div>
              <div><strong>Customer Phone:</strong> {selectedOrder.customerSnapshot?.phone}</div>
              <div><strong>Payment Method:</strong> {selectedOrder.paymentMethod} (₹{selectedOrder.total?.toFixed(2)})</div>
            </div>
          </div>
        )}
      </Modal>

      {/* 7. REMEDIATION ACTION MODAL */}
      <Modal
        isOpen={showActionModal}
        onClose={() => setShowActionModal(false)}
        title="Execute Order Remediation Action"
      >
        <form onSubmit={handleExecuteAction} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Select Action</label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="w-full text-xs p-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-medium"
            >
              <option value="VERIFIED_CALL">Mark Phone Verified via Call/OTP (Approve for Dispatch)</option>
              <option value="CONVERTED_PREPAID">Convert to Prepaid UPI (Discount Link Sent & Paid)</option>
              <option value="CANCELLED_FRAUD">Cancel Fraud Order & Add Phone to Blacklist</option>
            </select>
          </div>

          <Input
            label="Staff Verification Notes *"
            required
            placeholder="e.g. Called buyer, confirmed address and willingness to pay COD."
            value={actionNotes}
            onChange={(e) => setActionNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowActionModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={actionLoading}>
              Save Action
            </Button>
          </div>
        </form>
      </Modal>

      {/* 8. CREATE RULE MODAL */}
      <Modal
        isOpen={showAddRuleModal}
        onClose={() => setShowAddRuleModal(false)}
        title="Add Custom RTO Risk Rule"
      >
        <form onSubmit={handleCreateRule} className="space-y-3 text-xs">
          <Input
            label="Rule Name *"
            required
            placeholder="e.g. High Value COD Over ₹3000"
            value={newRule.ruleName}
            onChange={(e) => setNewRule({ ...newRule, ruleName: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Risk Type</label>
              <select
                value={newRule.riskType}
                onChange={(e) => setNewRule({ ...newRule, riskType: e.target.value })}
                className="w-full text-xs p-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg"
              >
                <option value="order_value">COD Order Value</option>
                <option value="address_quality">Address Completeness</option>
                <option value="payment_method">Payment Method</option>
              </select>
            </div>

            <Input
              label="Risk Penalty Weight (+Pts) *"
              type="number"
              min="5"
              max="50"
              required
              value={newRule.riskWeight}
              onChange={(e) => setNewRule({ ...newRule, riskWeight: Number(e.target.value) })}
            />
          </div>

          {newRule.riskType === 'order_value' && (
            <Input
              label="Min COD Order Amount (₹)"
              type="number"
              value={newRule.conditions.minOrderValue}
              onChange={(e) =>
                setNewRule({
                  ...newRule,
                  conditions: { ...newRule.conditions, minOrderValue: Number(e.target.value) }
                })
              }
            />
          )}

          {newRule.riskType === 'address_quality' && (
            <Input
              label="Min Street Address Length (Chars)"
              type="number"
              value={newRule.conditions.minAddressLength}
              onChange={(e) =>
                setNewRule({
                  ...newRule,
                  conditions: { ...newRule.conditions, minAddressLength: Number(e.target.value) }
                })
              }
            />
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowAddRuleModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Rule</Button>
          </div>
        </form>
      </Modal>

      {/* 9. ADD BLACKLIST MODAL */}
      <Modal
        isOpen={showAddBlacklistModal}
        onClose={() => setShowAddBlacklistModal(false)}
        title="Add to Blacklist or Whitelist"
      >
        <form onSubmit={handleAddBlacklist} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Type</label>
              <select
                value={newBlacklist.type}
                onChange={(e) => setNewBlacklist({ ...newBlacklist, type: e.target.value })}
                className="w-full text-xs p-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg"
              >
                <option value="phone">Phone Number</option>
                <option value="pincode">Pincode</option>
                <option value="customer_email">Customer Email</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Action</label>
              <select
                value={newBlacklist.action}
                onChange={(e) => setNewBlacklist({ ...newBlacklist, action: e.target.value })}
                className="w-full text-xs p-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg font-bold"
              >
                <option value="BLOCK">Block & Flag Fraud</option>
                <option value="ALLOW_WHITELIST">Whitelist (Trust Always)</option>
              </select>
            </div>
          </div>

          <Input
            label="Value (Phone / Pincode) *"
            required
            placeholder="e.g. 9876543210 or 110001"
            value={newBlacklist.value}
            onChange={(e) => setNewBlacklist({ ...newBlacklist, value: e.target.value })}
          />

          <Input
            label="Reason *"
            required
            placeholder="e.g. Serial fake COD orders"
            value={newBlacklist.reason}
            onChange={(e) => setNewBlacklist({ ...newBlacklist, reason: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowAddBlacklistModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Entry</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RtoRiskManager;
