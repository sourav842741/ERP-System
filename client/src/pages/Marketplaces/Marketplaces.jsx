import React, { useState, useEffect } from 'react';
import {
  Store, Plus, ExternalLink, RefreshCw, AlertCircle, Edit2, Trash2,
  TrendingUp, ShoppingBag, CheckCircle2, PauseCircle, Search, ArrowUpRight,
  Layers, Package, Check, Sparkles
} from 'lucide-react';
import api from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { DataTable } from '../../components/ui/DataTable';

const MARKETPLACE_CONFIG = {
  Flipkart: {
    name: 'Flipkart',
    bg: 'bg-[#2874f0]/10 text-[#2874f0] border-[#2874f0]/30 dark:bg-[#2874f0]/20 dark:text-blue-400',
    dot: 'bg-[#2874f0]',
    badge: 'border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40',
    color: '#2874f0'
  },
  Amazon: {
    name: 'Amazon',
    bg: 'bg-[#ff9900]/10 text-[#d97706] border-[#ff9900]/30 dark:bg-[#ff9900]/20 dark:text-amber-400',
    dot: 'bg-[#ff9900]',
    badge: 'border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40',
    color: '#ff9900'
  },
  Meesho: {
    name: 'Meesho',
    bg: 'bg-[#f43397]/10 text-[#f43397] border-[#f43397]/30 dark:bg-[#f43397]/20 dark:text-pink-400',
    dot: 'bg-[#f43397]',
    badge: 'border border-pink-200 dark:border-pink-800 text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-950/40',
    color: '#f43397'
  },
  Website: {
    name: 'Website',
    bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    badge: 'border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40',
    color: '#10b981'
  },
  Myntra: {
    name: 'Myntra',
    bg: 'bg-[#ff3f6c]/10 text-[#ff3f6c] border-[#ff3f6c]/30 dark:bg-[#ff3f6c]/20 dark:text-rose-400',
    dot: 'bg-[#ff3f6c]',
    badge: 'border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40',
    color: '#ff3f6c'
  }
};

export const Marketplaces = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [products, setProducts] = useState([]);

  // Filters
  const [marketplaceFilter, setMarketplaceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);

  // Form States
  const [formData, setFormData] = useState({
    productId: '',
    variantId: '',
    marketplace: 'Flipkart',
    marketplaceSKU: '',
    marketplaceProductId: '',
    listingTitle: '',
    price: '',
    mrp: '',
    listingStatus: 'ACTIVE',
    listingUrl: '',
    notes: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete State
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 100 });
      if (marketplaceFilter) params.append('marketplace', marketplaceFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);

      const res = await api.get(`/marketplaces?${params.toString()}`);
      if (res.data.success) {
        setListings(res.data.data.listings || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products?limit=100');
      if (res.data.success) {
        // Only active non-deleted products
        setProducts(res.data.data.products || []);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchListings();
  }, [marketplaceFilter, statusFilter, search]);

  useEffect(() => {
    fetchProducts();
  }, []);

  // Quick Channel Sync
  const handleSyncMarketplaces = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await api.post('/marketplaces/sync');
      if (res.data.success) {
        setSyncResult(res.data.message);
        setTimeout(() => setSyncResult(null), 4000);
        fetchListings();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setSyncing(false);
    }
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormData({
      productId: products[0]?._id || '',
      variantId: products[0]?.variants?.[0]?._id || '',
      marketplace: 'Flipkart',
      marketplaceSKU: products[0]?.sku || '',
      marketplaceProductId: '',
      listingTitle: products[0]?.name || '',
      price: products[0]?.sellingPrice || '',
      mrp: products[0]?.mrp || '',
      listingStatus: 'ACTIVE',
      listingUrl: '',
      notes: ''
    });
    setFormError('');
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (listing) => {
    setSelectedListing(listing);
    setFormData({
      productId: listing.productId?._id || listing.productId || '',
      variantId: listing.variantId?._id || listing.variantId || '',
      marketplace: listing.marketplace || 'Flipkart',
      marketplaceSKU: listing.marketplaceSKU || '',
      marketplaceProductId: listing.marketplaceProductId || '',
      listingTitle: listing.listingTitle || '',
      price: listing.price || '',
      mrp: listing.mrp || '',
      listingStatus: listing.listingStatus || 'ACTIVE',
      listingUrl: listing.listingUrl || '',
      notes: listing.notes || ''
    });
    setFormError('');
    setShowEditModal(true);
  };

  // Open Delete Modal
  const handleOpenDelete = (listing) => {
    setSelectedListing(listing);
    setShowDeleteModal(true);
  };

  // Save Create Listing
  const handleCreateListing = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      const res = await api.post('/marketplaces', formData);
      if (res.data.success) {
        setShowAddModal(false);
        fetchListings();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // Save Update Listing
  const handleUpdateListing = async (e) => {
    e.preventDefault();
    if (!selectedListing) return;
    setFormLoading(true);
    setFormError('');
    try {
      const res = await api.put(`/marketplaces/${selectedListing._id}`, formData);
      if (res.data.success) {
        setShowEditModal(false);
        fetchListings();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // Quick Status Toggle (ACTIVE <-> PAUSED)
  const handleToggleStatus = async (listing) => {
    const nextStatus = listing.listingStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await api.put(`/marketplaces/${listing._id}`, { listingStatus: nextStatus });
      fetchListings();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  // Delete Listing
  const handleDeleteListing = async () => {
    if (!selectedListing) return;
    setDeleteLoading(true);
    try {
      const res = await api.delete(`/marketplaces/${selectedListing._id}`);
      if (res.data.success) {
        setShowDeleteModal(false);
        fetchListings();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Analytics Metrics
  const totalListings = listings.length;
  const flipkartCount = listings.filter((l) => l.marketplace === 'Flipkart').length;
  const amazonCount = listings.filter((l) => l.marketplace === 'Amazon').length;
  const meeshoCount = listings.filter((l) => l.marketplace === 'Meesho').length;
  const activeCount = listings.filter((l) => l.listingStatus === 'ACTIVE').length;
  const oosCount = listings.filter((l) => Number(l.centralStock || 0) <= 0).length;

  const columns = [
    {
      header: 'Listing & Marketplace',
      render: (row) => {
        const product = row.productId;
        const mainImage = product?.images?.[0]?.url;
        const config = MARKETPLACE_CONFIG[row.marketplace] || MARKETPLACE_CONFIG.Website;
        const isDeletedProduct = !product || product.isDeleted;

        return (
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden text-slate-400 shadow-2xs">
              {mainImage ? (
                <img
                  src={mainImage}
                  alt={row.listingTitle}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Store className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 dark:text-white leading-tight truncate max-w-xs text-xs">
                {row.listingTitle}
              </p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${config.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                  {row.marketplace}
                </span>

                {row.marketplaceProductId && (
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    ID: {row.marketplaceProductId}
                  </span>
                )}

                {isDeletedProduct && (
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-1.5 py-0.2 rounded">
                    ⚠️ Catalog Product Deleted
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Marketplace SKU',
      render: (row) => (
        <div>
          <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 block">
            {row.marketplaceSKU}
          </span>
          <span className="text-[10px] text-slate-400 block">
            Catalog: {row.productId?.sku || row.variantId?.sku || 'Unlinked'}
          </span>
        </div>
      )
    },
    {
      header: 'Listing Price',
      render: (row) => {
        const hasDiscount = row.mrp && Number(row.mrp) > Number(row.price);
        const discountPct = hasDiscount ? Math.round(((row.mrp - row.price) / row.mrp) * 100) : 0;

        return (
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-black text-slate-900 dark:text-white text-sm">₹{Number(row.price).toLocaleString()}</span>
              {hasDiscount && (
                <span className="text-[10px] text-slate-400 line-through">₹{Number(row.mrp).toLocaleString()}</span>
              )}
            </div>
            {hasDiscount && (
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">
                {discountPct}% OFF
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Central Stock Sync',
      render: (row) => {
        const stock = Number(row.centralStock || 0);
        const isOutOfStock = stock <= 0;
        const isLow = stock > 0 && stock <= 10;

        return (
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                isOutOfStock ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
              }`} />
              <span className={`font-black text-xs ${
                isOutOfStock ? 'text-rose-600 dark:text-rose-400' :
                isLow ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {isOutOfStock ? '0 Available' : `${stock} Units Live`}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {isOutOfStock ? 'Restock needed' : 'Central ledger synced'}
            </span>
          </div>
        );
      }
    },
    {
      header: 'Listing Status',
      render: (row) => (
        <button
          type="button"
          onClick={() => handleToggleStatus(row)}
          title="Click to toggle status (ACTIVE / PAUSED)"
          className="group cursor-pointer text-left"
        >
          <Badge
            variant={row.listingStatus === 'ACTIVE' ? 'success' : row.listingStatus === 'PAUSED' ? 'warning' : 'neutral'}
            size="sm"
            className="group-hover:opacity-80 transition-opacity"
          >
            {row.listingStatus} ↻
          </Badge>
        </button>
      )
    },
    {
      header: 'Actions',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {/* External Listing Link */}
          {row.listingUrl ? (
            <a
              href={row.listingUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open Live Product Page on Marketplace"
              className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 rounded-lg transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <span className="p-1.5 text-slate-300 dark:text-slate-700 cursor-not-allowed">
              <ExternalLink className="w-3.5 h-3.5 opacity-30" />
            </span>
          )}

          {/* Edit Listing */}
          <button
            type="button"
            onClick={() => handleOpenEdit(row)}
            title="Edit Marketplace Listing & Pricing"
            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          {/* Delete Listing */}
          <button
            type="button"
            onClick={() => handleOpenDelete(row)}
            title="Delete Marketplace Listing"
            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Store className="w-5 h-5 text-primary-600" /> Marketplace Multi-Channel Hub
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage live multi-channel listings across Flipkart, Amazon, Meesho, and Direct Web. Central inventory synchronization & price management.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSyncMarketplaces}
            disabled={syncing}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-primary-500' : ''}`} />
            {syncing ? 'Syncing Channels...' : 'Sync All Channels'}
          </Button>
          <Button onClick={handleOpenAdd} size="sm">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Marketplace Listing
          </Button>
        </div>
      </div>

      {syncResult && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> {syncResult}
        </div>
      )}

      {/* Top Channel Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        {/* Total Listings */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Listings</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white">{totalListings}</p>
          <span className="text-[10px] text-emerald-600 font-semibold">{activeCount} active live</span>
        </div>

        {/* Flipkart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#2874f0]">Flipkart</span>
            <span className="w-2 h-2 rounded-full bg-[#2874f0]" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white">{flipkartCount}</p>
          <span className="text-[10px] text-slate-400">Products mapped</span>
        </div>

        {/* Amazon */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#ff9900]">Amazon</span>
            <span className="w-2 h-2 rounded-full bg-[#ff9900]" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white">{amazonCount}</p>
          <span className="text-[10px] text-slate-400">Products mapped</span>
        </div>

        {/* Meesho */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#f43397]">Meesho</span>
            <span className="w-2 h-2 rounded-full bg-[#f43397]" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white">{meeshoCount}</p>
          <span className="text-[10px] text-slate-400">Products mapped</span>
        </div>

        {/* OOS Alert */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">Stock Alerts</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-xl font-black text-rose-600 dark:text-rose-400">{oosCount}</p>
          <span className="text-[10px] text-slate-400">{oosCount > 0 ? 'Out of stock in hub' : 'All channels in stock'}</span>
        </div>
      </div>

      {/* Channel Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: '', label: 'All Channels', count: totalListings },
          { id: 'Flipkart', label: 'Flipkart', count: flipkartCount, color: 'text-[#2874f0]' },
          { id: 'Amazon', label: 'Amazon', count: amazonCount, color: 'text-[#ff9900]' },
          { id: 'Meesho', label: 'Meesho', count: meeshoCount, color: 'text-[#f43397]' },
          { id: 'Website', label: 'Website', count: listings.filter(l => l.marketplace === 'Website').length, color: 'text-emerald-500' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMarketplaceFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              marketplaceFilter === tab.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              marketplaceFilter === tab.id
                ? 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Main Data Table */}
      <DataTable
        columns={columns}
        data={listings}
        loading={loading}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search listing title, SKU, or FSN/ASIN..."
        actions={
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none font-medium"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PAUSED">PAUSED</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
        }
      />

      {/* 1. ADD MARKETPLACE LISTING MODAL */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Marketplace Listing"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateListing} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-lg font-medium flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Select Internal Catalog Product *"
              required
              value={formData.productId}
              onChange={(e) => {
                const p = products.find((prod) => prod._id === e.target.value);
                setFormData({
                  ...formData,
                  productId: e.target.value,
                  variantId: p?.variants?.[0]?._id || '',
                  listingTitle: p?.name || formData.listingTitle,
                  marketplaceSKU: p?.variants?.[0]?.sku || p?.sku || formData.marketplaceSKU,
                  price: p?.sellingPrice || formData.price,
                  mrp: p?.mrp || formData.mrp
                });
              }}
            >
              <option value="">-- Choose Catalog Product --</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} (SKU: {p.sku}) - {p.availableStock} in stock
                </option>
              ))}
            </Select>

            <Select
              label="Marketplace Channel *"
              value={formData.marketplace}
              onChange={(e) => setFormData({ ...formData, marketplace: e.target.value })}
            >
              <option value="Flipkart">Flipkart</option>
              <option value="Meesho">Meesho</option>
              <option value="Amazon">Amazon</option>
              <option value="Website">Direct Website</option>
              <option value="Myntra">Myntra</option>
            </Select>
          </div>

          {/* Variant Selector (if product has multiple variants) */}
          {(() => {
            const selectedProd = products.find((prod) => prod._id === formData.productId);
            if (selectedProd && selectedProd.variants && selectedProd.variants.length > 1) {
              return (
                <Select
                  label="Select Product Variant *"
                  value={formData.variantId}
                  onChange={(e) => {
                    const v = selectedProd.variants.find((item) => item._id === e.target.value);
                    setFormData({
                      ...formData,
                      variantId: e.target.value,
                      marketplaceSKU: v?.sku || formData.marketplaceSKU,
                      price: v?.price || formData.price
                    });
                  }}
                >
                  {selectedProd.variants.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.sku} {v.color ? `• ${v.color}` : ''} {v.size ? `(${v.size})` : ''} - ₹{v.price} ({v.stock?.availableStock || 0} in stock)
                    </option>
                  ))}
                </Select>
              );
            }
            return null;
          })()}

          <Input
            label="Listing Title on Marketplace *"
            required
            value={formData.listingTitle}
            onChange={(e) => setFormData({ ...formData, listingTitle: e.target.value })}
            placeholder="e.g. Shinchan Printed Ceramic Mug 350ml"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Marketplace SKU *"
              required
              value={formData.marketplaceSKU}
              onChange={(e) => setFormData({ ...formData, marketplaceSKU: e.target.value })}
              placeholder="e.g. FLIP-MUG-001"
            />
            <Input
              label="Channel Product ID (FSN / ASIN / ID)"
              value={formData.marketplaceProductId}
              onChange={(e) => setFormData({ ...formData, marketplaceProductId: e.target.value })}
              placeholder="e.g. FSNMUG987213 or B08XYZ1234"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Selling Price (₹) *"
              type="number"
              required
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="299"
            />
            <Input
              label="MRP (₹)"
              type="number"
              min="0"
              value={formData.mrp}
              onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
              placeholder="599"
            />
            <Select
              label="Listing Status"
              value={formData.listingStatus}
              onChange={(e) => setFormData({ ...formData, listingStatus: e.target.value })}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="PAUSED">PAUSED</option>
              <option value="INACTIVE">INACTIVE</option>
            </Select>
          </div>

          <Input
            label="Public Product Link / Listing URL"
            value={formData.listingUrl}
            onChange={(e) => setFormData({ ...formData, listingUrl: e.target.value })}
            placeholder="https://www.flipkart.com/item/..."
          />

          <Input
            label="Internal Notes / Strategy"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="e.g. Festive promotion listing, 10% lower margin"
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit" disabled={formLoading}>
              {formLoading ? 'Saving...' : 'Create Marketplace Listing'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. EDIT MARKETPLACE LISTING MODAL */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit Listing: ${selectedListing?.listingTitle}`}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleUpdateListing} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-lg font-medium flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Linked Catalog Product"
              value={formData.productId}
              onChange={(e) => {
                const p = products.find((prod) => prod._id === e.target.value);
                setFormData({
                  ...formData,
                  productId: e.target.value,
                  variantId: p?.variants?.[0]?._id || '',
                  listingTitle: p?.name || formData.listingTitle
                });
              }}
            >
              <option value="">-- Choose Product --</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.sku}) - {p.availableStock} in stock
                </option>
              ))}
            </Select>

            <Select
              label="Marketplace Channel *"
              value={formData.marketplace}
              onChange={(e) => setFormData({ ...formData, marketplace: e.target.value })}
            >
              <option value="Flipkart">Flipkart</option>
              <option value="Meesho">Meesho</option>
              <option value="Amazon">Amazon</option>
              <option value="Website">Direct Website</option>
              <option value="Myntra">Myntra</option>
            </Select>
          </div>

          <Input
            label="Listing Title *"
            required
            value={formData.listingTitle}
            onChange={(e) => setFormData({ ...formData, listingTitle: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Marketplace SKU *"
              required
              value={formData.marketplaceSKU}
              onChange={(e) => setFormData({ ...formData, marketplaceSKU: e.target.value })}
            />
            <Input
              label="Channel Product ID (FSN / ASIN)"
              value={formData.marketplaceProductId}
              onChange={(e) => setFormData({ ...formData, marketplaceProductId: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Selling Price (₹) *"
              type="number"
              required
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
            <Input
              label="MRP (₹)"
              type="number"
              min="0"
              value={formData.mrp}
              onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
            />
            <Select
              label="Listing Status"
              value={formData.listingStatus}
              onChange={(e) => setFormData({ ...formData, listingStatus: e.target.value })}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="PAUSED">PAUSED</option>
              <option value="INACTIVE">INACTIVE</option>
            </Select>
          </div>

          <Input
            label="Public Product URL"
            value={formData.listingUrl}
            onChange={(e) => setFormData({ ...formData, listingUrl: e.target.value })}
            placeholder="https://..."
          />

          <Input
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button type="submit" disabled={formLoading}>
              {formLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Marketplace Listing"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl space-y-1">
            <p className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" /> Confirm Listing Deletion
            </p>
            <p className="text-xs text-rose-700 dark:text-rose-400">
              Are you sure you want to remove this listing from ERP sync? This will delete the mapping for <strong>{selectedListing?.marketplace}</strong>.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Listing:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{selectedListing?.listingTitle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Channel:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{selectedListing?.marketplace}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Marketplace SKU:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedListing?.marketplaceSKU}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Listed Price:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">₹{selectedListing?.price}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteListing} disabled={deleteLoading}>
              {deleteLoading ? 'Deleting...' : 'Delete Listing'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
