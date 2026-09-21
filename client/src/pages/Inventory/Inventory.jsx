import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Boxes, AlertTriangle, ShieldAlert, History, SlidersHorizontal,
  CheckCircle2, PlusCircle, ArrowUpRight, ArrowDownRight, Warehouse,
  Image as ImageIcon
} from 'lucide-react';
import api from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { DataTable } from '../../components/ui/DataTable';

export const Inventory = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'ledger'
  const [inventory, setInventory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  // Filter state
  const currentFilter = searchParams.get('filter') || '';
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [warehouses, setWarehouses] = useState([]);

  // Adjustment Modal state
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [adjQuantity, setAdjQuantity] = useState('');
  const [adjType, setAdjType] = useState('ADJUSTMENT');
  const [adjReason, setAdjReason] = useState('');
  const [adjError, setAdjError] = useState('');

  const fetchWarehouses = async () => {
    try {
      const res = await api.get('/warehouses');
      if (res.data.success) setWarehouses(res.data.data.warehouses);
    } catch (err) {}
  };

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 25 });
      if (currentFilter) params.append('filter', currentFilter);
      if (selectedWarehouse) params.append('warehouseId', selectedWarehouse);

      const res = await api.get(`/inventory/overview?${params.toString()}`);
      if (res.data.success) {
        setInventory(res.data.data.inventory);
        setStats(res.data.data.stats);
        setPagination(res.data.data.pagination);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 30 });
      if (selectedWarehouse) params.append('warehouseId', selectedWarehouse);

      const res = await api.get(`/inventory/transactions?${params.toString()}`);
      if (res.data.success) {
        setTransactions(res.data.data.transactions);
        setPagination(res.data.data.pagination);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchInventory();
    } else {
      fetchTransactions();
    }
  }, [activeTab, page, currentFilter, selectedWarehouse]);

  const handleOpenAdjust = (item) => {
    setSelectedItem(item);
    setAdjQuantity('');
    setAdjType('ADJUSTMENT');
    setAdjReason('');
    setAdjError('');
    setShowAdjustModal(true);
  };

  const handlePerformAdjustment = async (e) => {
    e.preventDefault();
    setAdjError('');
    if (!adjReason || adjReason.trim() === '') {
      setAdjError('A mandatory reason is required for any manual stock adjustment.');
      return;
    }

    try {
      await api.post('/inventory/adjust', {
        variantId: selectedItem.variantId?._id || selectedItem.variantId,
        warehouseId: selectedItem.warehouseId?._id || selectedItem.warehouseId,
        quantity: Number(adjQuantity),
        type: adjType,
        reason: adjReason.trim()
      });

      setShowAdjustModal(false);
      fetchInventory();
      if (activeTab === 'ledger') fetchTransactions();
    } catch (err) {
      setAdjError(err.response?.data?.message || err.message);
    }
  };

  const overviewColumns = [
    {
      header: 'Product / SKU',
      render: (row) => {
        const product = row.productId || row.variantId?.productId;
        const mainImage = product?.images?.[0]?.url;
        const productName = product?.name || 'Product';
        const sku = row.variantId?.sku || product?.sku;
        const brand = product?.brand;

        return (
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden text-slate-400 shadow-2xs">
              {mainImage ? (
                <img
                  src={mainImage}
                  alt={productName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=150';
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400">
                  <ImageIcon className="w-4 h-4" />
                </div>
              )}
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white leading-tight text-sm">
                {productName}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-xs font-semibold text-primary-600 dark:text-primary-400">
                  {sku}
                </span>
                {(row.variantId?.color || row.variantId?.size) && (
                  <span className="text-[11px] text-slate-400 font-medium">
                    ({row.variantId.color}{row.variantId.color && row.variantId.size ? ' / ' : ''}{row.variantId.size})
                  </span>
                )}
                {brand && (
                  <span className="text-[11px] text-slate-400 font-medium">
                    • {brand}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Warehouse',
      render: (row) => (
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {row.warehouseId?.name || 'Central Hub'}
        </span>
      )
    },
    {
      header: 'Physical Stock',
      render: (row) => <span className="font-semibold">{row.physicalStock}</span>
    },
    {
      header: 'Reserved',
      render: (row) => <span className="text-slate-500">{row.reservedStock}</span>
    },
    {
      header: 'Damaged',
      render: (row) => (
        <span className={row.damagedStock > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}>
          {row.damagedStock}
        </span>
      )
    },
    {
      header: 'Available Stock',
      render: (row) => (
        <div>
          <span className={`text-base font-extrabold ${
            row.availableStock === 0 ? 'text-rose-600' :
            row.availableStock <= row.minimumStock ? 'text-amber-600' : 'text-emerald-600'
          }`}>
            {row.availableStock}
          </span>
          <span className="text-[10px] text-slate-400 block">Min threshold: {row.minimumStock}</span>
        </div>
      )
    },
    {
      header: 'Health Status',
      render: (row) => (
        <Badge
          variant={
            row.availableStock === 0 ? 'danger' :
            row.availableStock <= row.minimumStock ? 'warning' : 'success'
          }
          size="sm"
        >
          {row.availableStock === 0 ? 'OUT OF STOCK' :
           row.availableStock <= row.minimumStock ? 'LOW STOCK' : 'HEALTHY'}
        </Badge>
      )
    },
    {
      header: 'Action',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <Button size="sm" variant="outline" onClick={() => handleOpenAdjust(row)}>
          <SlidersHorizontal className="w-3.5 h-3.5 mr-1" /> Adjust
        </Button>
      )
    }
  ];

  const ledgerColumns = [
    {
      header: 'Timestamp',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            {new Date(row.createdAt).toLocaleDateString()}
          </p>
          <span className="text-[10px] text-slate-400">
            {new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )
    },
    {
      header: 'SKU / Product',
      render: (row) => {
        const product = row.productId;
        const mainImage = product?.images?.[0]?.url;
        const productName = product?.name || 'Product';
        const sku = row.variantId?.sku || product?.sku;

        return (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden text-slate-400">
              {mainImage ? (
                <img src={mainImage} alt={productName} className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-3.5 h-3.5" />
              )}
            </div>
            <div>
              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">{sku}</span>
              <p className="text-[11px] text-slate-400 truncate max-w-xs">{productName}</p>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Movement Type',
      render: (row) => (
        <Badge
          variant={
            row.type === 'SALE' ? 'danger' :
            row.type === 'PURCHASE' || row.type === 'RETURN' ? 'success' :
            row.type === 'DAMAGE' ? 'danger' : 'neutral'
          }
          size="sm"
        >
          {row.type}
        </Badge>
      )
    },
    {
      header: 'Quantity Change',
      render: (row) => (
        <div className={`font-extrabold flex items-center ${row.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {row.quantity > 0 ? '+' : ''}{row.quantity}
        </div>
      )
    },
    {
      header: 'Stock Levels',
      render: (row) => (
        <span className="text-xs text-slate-500">
          {row.previousStock} → <span className="font-bold text-slate-800 dark:text-slate-200">{row.newStock}</span>
        </span>
      )
    },
    {
      header: 'Mandatory Reason / Note',
      render: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-300 italic max-w-sm block">
          "{row.reason || 'N/A'}"
        </span>
      )
    },
    {
      header: 'Actor',
      render: (row) => (
        <span className="text-xs text-slate-500 font-medium">
          {row.createdBy?.name || 'System Worker'}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Central Inventory Engine
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Single Source of Truth inventory, atomic stock ledger, and manual adjustments with strict auditing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 font-medium focus:outline-none"
          >
            <option value="">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase">Total Available</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">{(stats.totalAvailableStock || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase">Physical In Warehouses</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{(stats.totalPhysicalStock || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase">Reserved In Orders</span>
          <p className="text-2xl font-black text-primary-600 mt-1">{(stats.totalReservedStock || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase">Damaged Quarantine</span>
          <p className="text-2xl font-black text-rose-600 mt-1">{(stats.totalDamagedStock || 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Tabs & Quick Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 gap-4">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Boxes className="w-4 h-4" /> Stock Overview
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'ledger'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" /> Immutable Stock Ledger
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="flex items-center gap-1.5 pb-2">
            <button
              onClick={() => setSearchParams({})}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                !currentFilter ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              All Items
            </button>
            <button
              onClick={() => setSearchParams({ filter: 'low_stock' })}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                currentFilter === 'low_stock' ? 'bg-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Low Stock
            </button>
            <button
              onClick={() => setSearchParams({ filter: 'out_of_stock' })}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                currentFilter === 'out_of_stock' ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Out of Stock
            </button>
            <button
              onClick={() => setSearchParams({ filter: 'damaged' })}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                currentFilter === 'damaged' ? 'bg-slate-800 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Damaged
            </button>
          </div>
        )}
      </div>

      {activeTab === 'overview' ? (
        <DataTable
          columns={overviewColumns}
          data={inventory}
          loading={loading}
          pagination={pagination}
          onPageChange={setPage}
          emptyMessage="No inventory matches your active filter"
        />
      ) : (
        <DataTable
          columns={ledgerColumns}
          data={transactions}
          loading={loading}
          pagination={pagination}
          onPageChange={setPage}
          emptyMessage="No transaction ledger entries found"
        />
      )}

      {/* Manual Stock Adjustment Modal (Section 212: Mandatory Reason) */}
      <Modal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        title="Manual Stock Adjustment"
      >
        <form onSubmit={handlePerformAdjustment} className="space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-bold text-slate-900 dark:text-white">
              {selectedItem?.productId?.name}
            </p>
            <p className="text-xs font-mono text-primary-600 mt-0.5">
              SKU: {selectedItem?.variantId?.sku}
            </p>
            <div className="mt-2 flex gap-4 text-xs">
              <span>Current Physical: <strong>{selectedItem?.physicalStock}</strong></span>
              <span>Available: <strong>{selectedItem?.availableStock}</strong></span>
            </div>
          </div>

          {adjError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-lg font-medium">
              {adjError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantity Change (+ or -) *"
              type="number"
              required
              value={adjQuantity}
              onChange={(e) => setAdjQuantity(e.target.value)}
              placeholder="e.g. +25 or -5"
            />
            <Select
              label="Adjustment Category *"
              value={adjType}
              onChange={(e) => setAdjType(e.target.value)}
            >
              <option value="ADJUSTMENT">Standard Stock Correction</option>
              <option value="DAMAGE">Damaged Goods Write-off</option>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Mandatory Reason / Justification *
            </label>
            <textarea
              required
              rows={3}
              value={adjReason}
              onChange={(e) => setAdjReason(e.target.value)}
              placeholder="Explain why this manual stock correction is being performed (e.g. Physical cycle count discrepancy, water damage in bay 4, found excess box during audit)..."
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              * Per Section 212 of the ERP Architecture, stock adjustments cannot be performed without an immutable audit reason.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" onClick={() => setShowAdjustModal(false)}>Cancel</Button>
            <Button type="submit">Commit Stock Adjustment</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
