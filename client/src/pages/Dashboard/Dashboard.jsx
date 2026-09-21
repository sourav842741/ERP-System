import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign, ShoppingBag, Package, Boxes, AlertTriangle,
  Clock, RotateCcw, TrendingUp, ArrowRight, ShieldAlert,
  Calendar, Sun, Zap, RefreshCw, Layers, CheckCircle2,
  ExternalLink, Eye, ChevronRight, Activity, Filter,
  ArrowUpRight, ArrowDownRight, Store, Image as ImageIcon
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
  BarChart, Bar
} from 'recharts';
import api from '../../api/client';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

// Ultra-crisp high-contrast Tooltip for Recharts (prevents dark-on-dark unreadable text)
const ChartCustomTooltip = ({ active, payload, label, isCurrency = false }) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="rounded-xl p-3 shadow-2xl text-xs space-y-2 z-50 pointer-events-none min-w-[150px] border"
        style={{
          backgroundColor: '#090d16',
          borderColor: '#334155',
          color: '#ffffff',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6)'
        }}
      >
        {label && (
          <p
            className="font-bold border-b pb-1 text-[11px] uppercase tracking-wider"
            style={{ color: '#94a3b8', borderColor: '#1e293b' }}
          >
            {label}
          </p>
        )}
        {payload.map((entry, index) => {
          const isCurr =
            isCurrency ||
            entry.name?.toLowerCase().includes('revenue') ||
            entry.name?.toLowerCase().includes('margin') ||
            entry.name?.toLowerCase().includes('profit') ||
            entry.dataKey === 'revenue' ||
            entry.dataKey === 'profit' ||
            entry.dataKey === 'value';

          const itemName =
            entry.name && entry.name !== 'value' && entry.name !== 'count'
              ? entry.name
              : (entry.payload?.name || entry.payload?.status || 'Total');

          const displayVal = isCurr
            ? `₹${Number(entry.value || 0).toLocaleString()}`
            : `${entry.value} ${entry.dataKey === 'count' ? 'orders' : ''}`;

          const dotColor =
            entry.color ||
            entry.payload?.fill ||
            entry.payload?.color ||
            '#6366f1';

          return (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white/20"
                    style={{ backgroundColor: dotColor }}
                  />
                  <span className="font-semibold" style={{ color: '#cbd5e1' }}>
                    {itemName}:
                  </span>
                </div>
                <span className="font-black text-sm" style={{ color: '#ffffff' }}>
                  {displayVal}
                </span>
              </div>
              {entry.payload?.orders !== undefined && entry.payload?.orders !== null && (
                <div className="text-[11px] font-medium pl-4 flex items-center justify-between" style={{ color: '#94a3b8' }}>
                  <span>Volume:</span>
                  <span className="font-semibold" style={{ color: '#cbd5e1' }}>
                    {entry.payload.orders} orders
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

export const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartRange, setChartRange] = useState('7D'); // '7D' | '30D'
  const [auditFilter, setAuditFilter] = useState('ALL'); // 'ALL' | 'Orders' | 'Inventory' | 'Products' | 'Auth'

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/dashboard');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[65vh]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-primary-500/20 border-t-primary-600 animate-spin" />
            <Activity className="w-5 h-5 text-primary-500 absolute inset-0 m-auto" />
          </div>
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Synchronizing Executive Analytics...</p>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const revenueTimeframes = data?.revenueTimeframes || {
    today: { revenue: 0, orders: 0 },
    thisWeek: { revenue: 0, orders: 0 },
    thisMonth: { revenue: 0, orders: 0 },
    allTime: { revenue: 0, orders: 0 }
  };

  const activeTimeline = chartRange === '7D' ? (data?.timeline7D || []) : (data?.timeline30D || []);
  const marketplaceShare = data?.marketplaceShare || [];
  const orderFulfillment = data?.orderFulfillment || [];
  const topProducts = data?.topProducts || [];
  const recentOrders = data?.recentOrders || [];
  const lowStockProducts = data?.lowStockProducts || [];
  const recentActivities = data?.recentActivities || [];

  // Filter audit logs
  const filteredActivities = recentActivities.filter((act) => {
    if (auditFilter === 'ALL') return true;
    return act.module?.toLowerCase() === auditFilter.toLowerCase();
  });

  const getModuleBadgeColor = (module = '') => {
    switch (module.toLowerCase()) {
      case 'orders':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'inventory':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'products':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      case 'marketplaces':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'auth':
        return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    }
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Executive Operations Hub
            </h2>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Real-time
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Single Source of Truth inventory, multi-channel marketplace distribution, and live P&L performance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={fetchDashboard} disabled={loading} title="Refresh Live Data">
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Link to="/orders">
            <Button size="sm">
              <ShoppingBag className="w-3.5 h-3.5 mr-1" /> + New Order
            </Button>
          </Link>
          <Link to="/products">
            <Button size="sm" variant="secondary">
              <Package className="w-3.5 h-3.5 mr-1" /> + Add Product
            </Button>
          </Link>
        </div>
      </div>

      {/* SECTION 1: MULTI-TIMEFRAME REVENUE INTELLIGENCE HERO */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-primary-500" /> Revenue & Sales Velocity (Multi-Timeframe)
          </h3>
          <span className="text-[11px] text-slate-400">Auto-synchronized with Order Engine</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Today's Revenue */}
          <div className="relative overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:border-primary-500/40 transition-all group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <Sun className="w-3.5 h-3.5 text-amber-500" /> Today's Revenue
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Today
              </span>
            </div>
            <div className="mt-3">
              <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                ₹{Number(revenueTimeframes.today.revenue || 0).toLocaleString()}
              </h4>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                <ShoppingBag className="w-3 h-3 text-slate-400" />
                <strong className="text-slate-800 dark:text-slate-200">{revenueTimeframes.today.orders || 0}</strong> orders placed today
              </p>
            </div>
            <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-amber-500/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
          </div>

          {/* Card 2: This Week's Revenue */}
          <div className="relative overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:border-primary-500/40 transition-all group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-primary-500" /> This Week's Revenue
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20">
                Past 7 Days
              </span>
            </div>
            <div className="mt-3">
              <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                ₹{Number(revenueTimeframes.thisWeek.revenue || 0).toLocaleString()}
              </h4>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                <ShoppingBag className="w-3 h-3 text-slate-400" />
                <strong className="text-slate-800 dark:text-slate-200">{revenueTimeframes.thisWeek.orders || 0}</strong> orders this week
              </p>
            </div>
            <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-primary-500/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
          </div>

          {/* Card 3: This Month's Revenue */}
          <div className="relative overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:border-primary-500/40 transition-all group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-500" /> This Month's Revenue
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                MTD
              </span>
            </div>
            <div className="mt-3">
              <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                ₹{Number(revenueTimeframes.thisMonth.revenue || 0).toLocaleString()}
              </h4>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                <ShoppingBag className="w-3 h-3 text-slate-400" />
                <strong className="text-slate-800 dark:text-slate-200">{revenueTimeframes.thisMonth.orders || 0}</strong> orders in current month
              </p>
            </div>
            <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
          </div>

          {/* Card 4: All-Time Total Revenue */}
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-white to-slate-50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900 border-2 border-emerald-500/40 rounded-2xl p-4 shadow-xs group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 fill-current" /> All-Time Revenue
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                Lifetime
              </span>
            </div>
            <div className="mt-3">
              <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                ₹{Number(revenueTimeframes.allTime.revenue || 0).toLocaleString()}
              </h4>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                <ShoppingBag className="w-3 h-3 text-emerald-500" />
                <strong className="text-slate-800 dark:text-slate-200">{revenueTimeframes.allTime.orders || 0}</strong> total orders processed
              </p>
            </div>
            <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-emerald-500/20 rounded-full blur-xl group-hover:scale-125 transition-transform" />
          </div>
        </div>
      </div>

      {/* SECTION 2: SECONDARY OPERATIONAL METRICS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Estimated Profit</span>
            <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
              ₹{(kpis.estimatedProfit || 0).toLocaleString()}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Central Available Stock</span>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
              {(kpis.availableStock || 0).toLocaleString()} <span className="text-xs text-slate-400 font-normal">Units</span>
            </p>
          </div>
          <div className="p-2 rounded-lg bg-primary-500/10 text-primary-500">
            <Boxes className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Catalog SKUs</span>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
              {kpis.totalProducts || 0} <span className="text-xs text-slate-400 font-normal">Active</span>
            </p>
          </div>
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
            <Package className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending / Returns</span>
            <p className="text-lg font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
              {kpis.pendingOrders || 0} <span className="text-xs text-slate-400 font-normal">/ {kpis.returnsCount || 0} ret</span>
            </p>
          </div>
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
            <RotateCcw className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* SECTION 3: REVENUE TIMELINE & MARKETPLACE SHARE CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Revenue Area Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-primary-500" /> Revenue & Profit Performance Dynamics
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Calculated sales vs estimated net margins over time
              </p>
            </div>

            {/* Time range switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setChartRange('7D')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  chartRange === '7D'
                    ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => setChartRange('30D')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  chartRange === '30D'
                    ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Last 30 Days
              </button>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activeTimeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartColorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="chartColorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.12} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip content={<ChartCustomTooltip isCurrency={true} />} />
                <Legend iconType="circle" />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Gross Revenue (₹)"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#chartColorRevenue)"
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  name="Est. Margin (₹)"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#chartColorProfit)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Marketplace Share Donut Chart (1 Col) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Store className="w-4 h-4 text-purple-500" /> Marketplace Share
              </h3>
              <Link to="/marketplaces" className="text-[11px] font-semibold text-primary-600 hover:underline">
                View all
              </Link>
            </div>
            <p className="text-xs text-slate-400 mb-3">Multi-channel revenue breakdown</p>

            <div className="h-44 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={marketplaceShare}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {marketplaceShare.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartCustomTooltip isCurrency={true} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center pointer-events-none">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Total</span>
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  ₹{Number(kpis.totalSales || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Marketplace breakdown list */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            {marketplaceShare.map((m, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{m.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[11px]">{m.orders} orders</span>
                  <span className="font-bold text-slate-900 dark:text-white">₹{Number(m.value || 0).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 4: FULFILLMENT FUNNEL & TOP PRODUCTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Fulfillment Pipeline */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-500" /> Order Fulfillment Pipeline
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Order distribution by status stages</p>
            </div>
            <Link to="/orders" className="text-xs font-semibold text-primary-600 hover:underline flex items-center gap-1">
              Orders <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={orderFulfillment} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.12} vertical={false} />
                <XAxis dataKey="status" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartCustomTooltip isCurrency={false} />} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {orderFulfillment.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.fill || '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Selling Products Leaderboard */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Package className="w-4 h-4 text-emerald-500" /> Top Selling Products
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Ranked by revenue contribution</p>
            </div>
            <Link to="/products" className="text-xs font-semibold text-primary-600 hover:underline flex items-center gap-1">
              Catalog <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {topProducts.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">No product sales recorded yet.</p>
            ) : (
              topProducts.map((prod, idx) => (
                <div key={prod._id || idx} className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl px-2 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                      idx === 0 ? 'bg-amber-400 text-amber-950 shadow-xs' :
                      idx === 1 ? 'bg-slate-300 text-slate-900' :
                      idx === 2 ? 'bg-amber-700 text-white' :
                      'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                      {prod.image ? (
                        <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-slate-900 dark:text-white truncate">{prod.name}</p>
                      <span className="font-mono text-[10px] text-slate-400">{prod.sku}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-black text-xs text-emerald-600 dark:text-emerald-400 block">
                      ₹{Number(prod.totalRevenue || 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400">{prod.unitsSold || 0} units</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* SECTION 5: OPERATIONAL TABLES (RECENT ORDERS & LOW STOCK ALERTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders Live Stream */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Recent Orders Stream</h3>
                <p className="text-xs text-slate-400">Latest multi-channel order deductions</p>
              </div>
              <Link to="/orders" className="text-xs font-semibold text-primary-600 hover:underline flex items-center gap-1">
                View all ({kpis.totalOrders || 0}) <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="pb-2">Order #</th>
                    <th className="pb-2">Customer</th>
                    <th className="pb-2">Source</th>
                    <th className="pb-2">Amount</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">No orders recorded yet.</td>
                    </tr>
                  ) : (
                    recentOrders.map((o) => (
                      <tr key={o._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-2.5 font-bold font-mono text-slate-900 dark:text-white">#{o.orderNumber}</td>
                        <td className="py-2.5 text-slate-600 dark:text-slate-300 truncate max-w-[120px]">{o.customerSnapshot?.name || 'Walk-in'}</td>
                        <td className="py-2.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {o.source}
                          </span>
                        </td>
                        <td className="py-2.5 font-bold text-slate-900 dark:text-white">₹{o.total}</td>
                        <td className="py-2.5">
                          <Badge
                            variant={
                              o.orderStatus === 'DELIVERED' ? 'success' :
                              o.orderStatus === 'CANCELLED' ? 'danger' :
                              o.orderStatus === 'PENDING' ? 'warning' : 'primary'
                            }
                            size="sm"
                          >
                            {o.orderStatus}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Low Stock Risk Radar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Low Stock Risk Radar
                </h3>
                <p className="text-xs text-slate-400">Critical threshold alerts for replenishment</p>
              </div>
              <Link to="/inventory?filter=low_stock" className="text-xs font-semibold text-amber-600 hover:underline flex items-center gap-1">
                View all ({kpis.lowStockCount || 0}) <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="pb-2">Product</th>
                    <th className="pb-2">SKU</th>
                    <th className="pb-2">Stock</th>
                    <th className="pb-2">Threshold</th>
                    <th className="pb-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {lowStockProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                        All warehouse inventory is above safety thresholds!
                      </td>
                    </tr>
                  ) : (
                    lowStockProducts.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-2 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                            {item.productId?.images?.[0]?.url ? (
                              <img src={item.productId.images[0].url} alt="Item" className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </div>
                          <span className="truncate max-w-[130px]">{item.productId?.name || 'Item'}</span>
                        </td>
                        <td className="py-2 font-mono text-[11px] text-slate-500">{item.variantId?.sku || item.productId?.sku}</td>
                        <td className="py-2 font-extrabold text-rose-600 dark:text-rose-400">{item.availableStock}</td>
                        <td className="py-2 text-slate-400">{item.minimumStock}</td>
                        <td className="py-2">
                          <Link to="/inventory">
                            <button className="text-[11px] font-bold text-primary-600 hover:underline">
                              Adjust →
                            </button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 6: HIGH-TECH AUDIT LOG & IMMUTABLE EVENT TIMELINE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-500" /> Enterprise Audit Trail & Immutable System Events
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold">
                Security Log
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Cryptographically safe chronological stream of all system activities and user operations
            </p>
          </div>

          {/* Module Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {['ALL', 'Orders', 'Inventory', 'Products', 'Marketplaces', 'Auth'].map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setAuditFilter(filter)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  auditFilter === filter
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Log Chronological Feed */}
        <div className="space-y-2.5">
          {filteredActivities.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No audit logs matching selected filter.</p>
          ) : (
            filteredActivities.map((act) => (
              <div
                key={act._id}
                className="flex items-start gap-3 p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                {/* Module Avatar */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 border ${getModuleBadgeColor(act.module)}`}>
                  {act.module ? act.module.slice(0, 2).toUpperCase() : 'SYS'}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-slate-900 dark:text-white font-mono">
                        {act.action}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getModuleBadgeColor(act.module)}`}>
                        {act.module}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {formatRelativeTime(act.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 truncate">
                    {act.reason || 'System operation executed successfully'}
                  </p>

                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                    <span>User: <strong className="text-slate-700 dark:text-slate-300">{act.userName || 'Super Admin'}</strong></span>
                    {act.ipAddress && <span>IP: {act.ipAddress}</span>}
                    {act.entityId && <span>ID: <strong className="font-mono">{String(act.entityId).slice(-6)}</strong></span>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
