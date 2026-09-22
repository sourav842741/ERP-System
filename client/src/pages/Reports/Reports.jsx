import React, { useState, useEffect } from 'react';
import {
  TrendingUp, BarChart3, PieChart as PieIcon, Calendar, ArrowDownToLine,
  RefreshCw, FileSpreadsheet, ShoppingCart, Package, DollarSign,
  ArrowUpRight, ArrowDownRight, Layers, Building2, ShieldAlert,
  Sparkles, Filter, CheckCircle2, ChevronRight, Boxes, Percent, Wallet
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import api from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export const Reports = () => {
  const [range, setRange] = useState('30d');
  const [chartMetric, setChartMetric] = useState('revenue'); // 'revenue' | 'orders' | 'monthly'
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState('');

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/analytics?range=${range}`);
      if (res.data.success) {
        setAnalytics(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [range]);

  const handleExport = async (type) => {
    setDownloading(type);
    try {
      const defaultBaseUrl = typeof window !== 'undefined' && window.location.origin.includes('5173')
        ? 'http://localhost:5000/api/v1'
        : '/api/v1';
      const baseURL = import.meta.env.VITE_API_BASE_URL || defaultBaseUrl;
      const token = localStorage.getItem('erp_token');

      const response = await fetch(`${baseURL}/reports/export/${type}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `erp_${type}_export_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Failed to export report: ' + err.message);
    } finally {
      setDownloading('');
    }
  };

  const kpis = analytics?.kpis || {};
  const dailyTimeline = analytics?.dailyTimeline || [];
  const monthlyData = analytics?.monthlyData || [];
  const channelShare = analytics?.channelShare || [];
  const statusPipeline = analytics?.statusPipeline || [];
  const categoryBreakdown = analytics?.categoryBreakdown || [];
  const stockHealth = analytics?.stockHealth || [];
  const topSellingProducts = analytics?.topSellingProducts || [];

  const timeRanges = [
    { id: '7d', label: 'Last 7 Days' },
    { id: '30d', label: 'Last 30 Days' },
    { id: 'this_month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
    { id: 'this_year', label: 'This Year' },
    { id: '12m', label: '12-Month View' }
  ];

  const REPORT_CARDS = [
    {
      id: 'orders',
      title: 'Orders & Sales Ledger Report',
      desc: 'Complete order log with customer details, order statuses, totals, and payment status.',
      icon: ShoppingCart,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-950/40'
    },
    {
      id: 'inventory',
      title: 'Current Central Stock Report',
      desc: 'Physical, reserved, damaged, and net available stock across all warehouse facilities.',
      icon: Package,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40'
    },
    {
      id: 'expenses',
      title: 'Operational Expenses Audit',
      desc: 'Expense breakdown by category (Logistics, Packaging, Marketing, Software) with dates.',
      icon: DollarSign,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/40'
    },
    {
      id: 'products',
      title: 'Master Product Catalog Export',
      desc: 'Master list of products, SKUs, brands, selling prices, cost prices, and active statuses.',
      icon: BarChart3,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Range Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary-500" />
            Financial Intelligence & Real-Time Analytics
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Multi-channel revenue intelligence, inventory capital valuation, and operational exports.
          </p>
        </div>

        {/* Timeframe Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex-wrap">
          {timeRanges.map((t) => (
            <button
              key={t.id}
              onClick={() => setRange(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                range === t.id
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
          <button
            onClick={fetchAnalytics}
            title="Refresh Analytics"
            className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Executive Financial KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">Period Gross Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
            ₹{(kpis.periodRevenue || 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            AOV: ₹{(kpis.aov || 0).toLocaleString('en-IN')}
          </span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">Order Volume</span>
            <ShoppingCart className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-lg font-black text-blue-600 dark:text-blue-400 mt-1">
            {kpis.periodOrdersCount || 0} Orders
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Return Rate: {kpis.returnRate || '0%'}
          </span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">Net Estimated Profit</span>
            <Sparkles className="w-4 h-4 text-primary-500" />
          </div>
          <p className="text-lg font-black text-primary-600 dark:text-primary-400 mt-1">
            ₹{(kpis.netProfit || 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Margin: {kpis.profitMargin || '0%'}
          </span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">Stock Capital Valuation</span>
            <Wallet className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-1">
            ₹{(kpis.totalStockValuationCost || 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Retail: ₹{(kpis.totalStockValuationRetail || 0).toLocaleString('en-IN')}
          </span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">Warehouse Inventory</span>
            <Boxes className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
            {kpis.totalPhysicalStock || 0} Units
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Available: {kpis.totalAvailableStock || 0} sellable
          </span>
        </div>
      </div>

      {/* SECTION 1: PRIMARY TIMELINE CHART */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {chartMetric === 'revenue' && 'Day-by-Day Earnings & Revenue Trajectory'}
              {chartMetric === 'orders' && 'Daily Order Volume & Fulfillment'}
              {chartMetric === 'monthly' && '12-Month Historical Revenue Growth'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live automated aggregation excluding cancelled and deleted orders.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg">
            <button
              onClick={() => setChartMetric('revenue')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                chartMetric === 'revenue'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Daily Revenue
            </button>
            <button
              onClick={() => setChartMetric('orders')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                chartMetric === 'orders'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Daily Orders
            </button>
            <button
              onClick={() => setChartMetric('monthly')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                chartMetric === 'monthly'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              12 Months
            </button>
          </div>
        </div>

        {/* Chart View */}
        <div className="h-72 w-full">
          {chartMetric === 'revenue' && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTimeline}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                  formatter={(val, name) => [`₹${val.toLocaleString()}`, name === 'revenue' ? 'Gross Revenue' : 'Est. Profit']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#revenueGrad)" />
                <Area type="monotone" dataKey="profit" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#profitGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {chartMetric === 'orders' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyTimeline}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Orders Placed" />
                <Bar dataKey="delivered" fill="#10b981" radius={[4, 4, 0, 0]} name="Orders Delivered" />
              </BarChart>
            </ResponsiveContainer>
          )}

          {chartMetric === 'monthly' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                  formatter={(val, name) => [`₹${val.toLocaleString()}`, name === 'revenue' ? 'Revenue' : 'Est. Profit']}
                />
                <Bar dataKey="revenue" fill="#6366f1" radius={[6, 6, 0, 0]} name="Gross Revenue" />
                <Bar dataKey="profit" fill="#10b981" radius={[6, 6, 0, 0]} name="Est. Net Margin" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* SECTION 2: MULTI-CHANNEL & ORDER STATUS SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Marketplace Channel Performance */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Multi-Channel Revenue Split</span>
              <span className="text-xs text-slate-400 font-normal">Active Channels</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Sales distribution across Flipkart, Amazon, Meesho, and Website.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4 my-2">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={channelShare}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="revenue"
                  >
                    {channelShare.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px'
                    }}
                    formatter={(val) => `₹${val.toLocaleString()}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Channel List */}
            <div className="space-y-2">
              {channelShare.map((c, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{c.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-slate-900 dark:text-white">₹{c.revenue.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-400 ml-1.5 font-mono">({c.sharePercent}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Order Fulfillment Status Pipeline */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Order Fulfillment Lifecycle Pipeline
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live status tracking from pending confirmation to successful delivery.
            </p>
          </div>

          <div className="h-48 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusPipeline} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.2} />
                <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} allowDecimals={false} />
                <YAxis dataKey="status" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '11px'
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {statusPipeline.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SECTION 3: INVENTORY HEALTH & CAPITAL ALLOCATION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Category Capital Allocation */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Category Stock & Capital Investment Allocation
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Physical capital bound across product categories in central warehouses.
          </p>

          <div className="h-56 mt-4">
            {categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px'
                    }}
                    formatter={(val, name) => [`₹${val.toLocaleString()}`, 'Capital Value']}
                  />
                  <Bar dataKey="valuation" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Capital Bound" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No active category stock registered yet.
              </div>
            )}
          </div>
        </div>

        {/* Stock Level Safety Distribution */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Stock Health Status
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Optimal vs Low Stock Risk vs Stockouts.
            </p>
          </div>

          <div className="h-44 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stockHealth}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={68}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {stockHealth.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '11px'
                  }}
                  formatter={(val) => `${val} SKUs`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            {stockHealth.map((s, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-slate-600 dark:text-slate-300">{s.name}</span>
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{s.value} SKUs</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 4: TOP PERFORMING ACTIVE PRODUCTS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Top Revenue Generating Products (Real-Time Catalog)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Ranked by sales volume and net earnings. Deleted items are strictly filtered out.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 font-bold uppercase text-[10px] text-slate-500 border-b">
              <tr>
                <th className="p-3">Rank & Product</th>
                <th className="p-3">SKU</th>
                <th className="p-3 text-center">Units Sold</th>
                <th className="p-3 text-right">Cost Basis</th>
                <th className="p-3 text-right">Gross Earnings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {topSellingProducts.map((p, idx) => (
                <tr key={p.id || idx}>
                  <td className="p-3 flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-8 h-8 rounded-lg object-cover border" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Package className="w-4 h-4 text-slate-400" />
                      </div>
                    )}
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">{p.name}</span>
                    </div>
                  </td>
                  <td className="p-3 font-mono text-[11px] text-slate-500">{p.sku}</td>
                  <td className="p-3 text-center font-bold text-slate-800 dark:text-slate-200">
                    {p.unitsSold} units
                  </td>
                  <td className="p-3 text-right font-mono text-slate-500">
                    ₹{(p.costPrice || 0).toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                    ₹{(p.revenue || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 5: STRUCTURED CSV / EXCEL DATA EXPORTS HUB */}
      <div>
        <div className="mb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-primary-500" />
            Operational Ledger & Data Exports (Excel / CSV)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Download raw database logs for external taxation, compliance audits, or spreadsheet modeling.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          {REPORT_CARDS.map((r) => {
            const Icon = r.icon;
            return (
              <div
                key={r.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className={`w-8 h-8 rounded-lg ${r.bg} ${r.color} flex items-center justify-center shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{r.title}</h4>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{r.desc}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400">CSV FORMAT</span>
                  <Button
                    size="sm"
                    variant="outline"
                    loading={downloading === r.id}
                    onClick={() => handleExport(r.id)}
                    className="text-[11px] py-1 px-2.5 h-auto"
                  >
                    <ArrowDownToLine className="w-3 h-3 mr-1" /> Download
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
