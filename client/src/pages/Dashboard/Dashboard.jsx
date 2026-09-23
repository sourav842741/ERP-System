import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign, ShoppingBag, Package, Boxes, AlertTriangle,
  Clock, RotateCcw, TrendingUp, ArrowRight, ShieldAlert,
  Calendar, Sun, Zap, RefreshCw, Layers, CheckCircle2,
  ExternalLink, Eye, ChevronRight, Activity, Filter,
  ArrowUpRight, ArrowDownRight, Store, Check, Truck,
  AlertCircle, ShieldCheck
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import api from '../../api/client';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

// High-precision SaaS Tooltip for Recharts
const ChartCustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-3 shadow-xl text-xs space-y-2 pointer-events-none min-w-[160px]">
        {label && (
          <p className="font-bold border-b border-slate-800 pb-1 text-[11px] uppercase tracking-wider text-slate-400">
            {label}
          </p>
        )}
        {payload.map((entry, index) => {
          const isCurr =
            entry.name?.toLowerCase().includes('revenue') ||
            entry.name?.toLowerCase().includes('margin') ||
            entry.name?.toLowerCase().includes('profit') ||
            entry.dataKey === 'revenue' ||
            entry.dataKey === 'profit';

          const displayVal = isCurr
            ? `₹${Number(entry.value || 0).toLocaleString()}`
            : `${entry.value} orders`;

          return (
            <div key={index} className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color || '#6366f1' }}
                />
                <span className="text-slate-300 font-medium">
                  {entry.name || 'Value'}:
                </span>
              </div>
              <span className="font-bold text-white">
                {displayVal}
              </span>
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
  const [timeframeView, setTimeframeView] = useState('thisMonth'); // 'today' | 'thisWeek' | 'thisMonth' | 'allTime'
  const [auditFilter, setAuditFilter] = useState('ALL');

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-10 h-10 rounded-full border-2 border-primary-500/20 border-t-primary-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Loading Enterprise Operations Data...
          </p>
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
  const recentOrders = data?.recentOrders || [];
  const lowStockProducts = data?.lowStockProducts || [];
  const recentActivities = data?.recentActivities || [];

  const selectedRev = revenueTimeframes[timeframeView] || revenueTimeframes.thisMonth;

  // Filter audit logs
  const filteredActivities = recentActivities.filter((act) => {
    if (auditFilter === 'ALL') return true;
    return act.module?.toLowerCase() === auditFilter.toLowerCase();
  });

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
      {/* 1. Sleek Enterprise Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Operations & Inventory Hub
            </h1>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Connected
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time multi-channel order orchestration, centralized inventory ledger, and enterprise unit economics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe Selector Pill */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/90 rounded-lg border border-slate-200 dark:border-slate-700/80">
            {[
              { id: 'today', label: 'Today' },
              { id: 'thisWeek', label: '7D' },
              { id: 'thisMonth', label: 'This Month' },
              { id: 'allTime', label: 'All Time' }
            ].map((tf) => (
              <button
                key={tf.id}
                type="button"
                onClick={() => setTimeframeView(tf.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  timeframeView === tf.id
                    ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={fetchDashboard}
            disabled={loading}
            title="Refresh Live Data"
            className="border-slate-200 dark:border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Sync
          </Button>

          <Link to="/orders">
            <Button size="sm">
              <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
              New Order
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Core Executive KPI Metric Cards (Pure SaaS Aesthetic) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Revenue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-[11px]">
              {timeframeView === 'today' ? "Today's Revenue" :
               timeframeView === 'thisWeek' ? "7-Day Revenue" :
               timeframeView === 'thisMonth' ? "MTD Revenue" : "Total Revenue"}
            </span>
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              ₹{Number(selectedRev.revenue || 0).toLocaleString()}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {selectedRev.orders || 0}
              </span>
              <span>orders in this timeframe</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Orders Volume */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Orders Volume</span>
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {(kpis.totalOrders || 0).toLocaleString()}
            </h3>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                {kpis.pendingOrders || 0} pending
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-slate-500 dark:text-slate-400">
                {kpis.returnsCount || 0} returns
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: Estimated Margin */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Estimated Net Profit</span>
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
              ₹{Number(kpis.estimatedProfit || 0).toLocaleString()}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span>Gross Margin Efficiency:</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {kpis.totalRevenue > 0
                  ? Math.round(((kpis.estimatedProfit || 0) / kpis.totalRevenue) * 100)
                  : 32}%
              </span>
            </div>
          </div>
        </div>

        {/* Metric 4: Stock Health */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Central Inventory Units</span>
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {(kpis.availableStock || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">Units</span>
            </h3>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Across {kpis.totalProducts || 0} Catalog SKUs
              </span>
              {lowStockProducts.length > 0 && (
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                  {lowStockProducts.length} low
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Analytics Chart & Channel Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Velocity Chart (2 Columns) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                Sales & Profit Dynamics
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Calculated sales vs estimated net margins over time
              </p>
            </div>

            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setChartRange('7D')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  chartRange === '7D'
                    ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => setChartRange('30D')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  chartRange === '30D'
                    ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
                  <linearGradient id="chartAccentRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary-600)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--primary-600)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="chartAccentMargin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.15} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip content={<ChartCustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Gross Revenue"
                  stroke="var(--primary-600)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#chartAccentRev)"
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  name="Est. Margin"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fillOpacity={1}
                  fill="url(#chartAccentMargin)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Channel Distribution & Pipeline (1 Column) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 shadow-2xs space-y-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Store className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              Channel Share Breakdown
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Multi-channel marketplace sales proportion
            </p>
          </div>

          <div className="space-y-3">
            {marketplaceShare.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No channel orders recorded yet.</p>
            ) : (
              marketplaceShare.map((m, idx) => {
                const total = marketplaceShare.reduce((acc, curr) => acc + (curr.orders || 0), 0) || 1;
                const pct = Math.round(((m.orders || 0) / total) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-primary-600" />
                        {m.name}
                      </span>
                      <span className="text-slate-500 font-medium">
                        {m.orders} orders ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary-600 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2.5">
              Order Fulfillment Health
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Delivered</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {orderFulfillment.find(f => f.status === 'delivered')?.count || 0}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Processing / Shipped</span>
                <span className="text-base font-bold text-slate-800 dark:text-slate-200">
                  {(orderFulfillment.find(f => f.status === 'processing')?.count || 0) +
                   (orderFulfillment.find(f => f.status === 'shipped')?.count || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Operations Grid: Recent Orders & Urgent Inventory Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders Stream */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                Live Order Stream
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Most recent orders across connected channels
              </p>
            </div>
            <Link
              to="/orders"
              className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-0.5"
            >
              All Orders <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-400">
                  <th className="py-2.5">Order ID</th>
                  <th className="py-2.5">Customer</th>
                  <th className="py-2.5">Source</th>
                  <th className="py-2.5">Amount</th>
                  <th className="py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400">
                      No orders placed yet.
                    </td>
                  </tr>
                ) : (
                  recentOrders.slice(0, 6).map((order) => {
                    const status = order.fulfillmentStatus || order.status || 'pending';
                    const isDelivered = status === 'delivered';
                    const isShipped = status === 'shipped';
                    const isCancelled = status === 'cancelled';

                    return (
                      <tr key={order._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 font-bold font-mono text-slate-800 dark:text-slate-200">
                          <Link to="/orders" className="hover:text-primary-600">
                            {order.orderNumber || order.orderId || order._id.slice(-6).toUpperCase()}
                          </Link>
                        </td>
                        <td className="py-2.5 text-slate-700 dark:text-slate-300">
                          {order.customer?.name || order.shippingAddress?.fullName || 'Walk-in'}
                        </td>
                        <td className="py-2.5">
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                            {order.marketplace || order.source || 'Direct'}
                          </span>
                        </td>
                        <td className="py-2.5 font-semibold text-slate-900 dark:text-white">
                          ₹{Number(order.totalAmount || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 text-right">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isDelivered ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' :
                            isShipped ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800' :
                            isCancelled ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800' :
                            'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Watchlist */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                Critical Inventory Watchlist
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                SKUs requiring restocking to prevent channel order cancellations
              </p>
            </div>
            <Link
              to="/inventory"
              className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-0.5"
            >
              Central Inventory <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {lowStockProducts.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-1.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                <span>All catalog SKUs maintain healthy safety thresholds!</span>
              </div>
            ) : (
              lowStockProducts.slice(0, 5).map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs"
                >
                  <div className="space-y-0.5 max-w-[65%]">
                    <p className="font-bold text-slate-900 dark:text-white truncate">
                      {item.name}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500">
                      SKU: {item.sku}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Stock Left</span>
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                        {item.availableStock || 0} / {item.minimumStock || 10}
                      </span>
                    </div>
                    <Link to="/inventory">
                      <Button size="xs" variant="secondary" className="text-[11px]">
                        Restock
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 5. Enterprise Chronological Audit Trail */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              Real-time Operations Activity Log
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Immutable ledger tracking employee modifications, inventory mutations, and order fulfillment events
            </p>
          </div>

          {/* Module Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
            {['ALL', 'Orders', 'Inventory', 'Products', 'Auth'].map((mod) => (
              <button
                key={mod}
                type="button"
                onClick={() => setAuditFilter(mod)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  auditFilter === mod
                    ? 'bg-primary-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {mod}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {filteredActivities.length === 0 ? (
            <p className="py-6 text-center text-slate-400 text-xs">No audit events logged for this filter.</p>
          ) : (
            filteredActivities.slice(0, 8).map((act, i) => (
              <div
                key={act._id || i}
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-800/20 text-xs"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-[10px] text-slate-700 dark:text-slate-200 shrink-0">
                    {(act.user?.name || act.userEmail || 'SYS').charAt(0).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {act.reason || act.action?.replace(/_/g, ' ') || 'Operation Executed'}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      By {act.user?.name || act.userEmail || 'System Core'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {act.module || 'System'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {formatRelativeTime(act.createdAt)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
