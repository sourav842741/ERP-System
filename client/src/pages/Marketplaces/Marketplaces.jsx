import React, { useState, useEffect } from 'react';
import {
  Store, Plus, ExternalLink, RefreshCw, AlertCircle, Edit, Trash2
} from 'lucide-react';
import api from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { DataTable } from '../../components/ui/DataTable';

export const Marketplaces = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [products, setProducts] = useState([]);
  const [marketplaceFilter, setMarketplaceFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
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

  const fetchListings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (marketplaceFilter) params.append('marketplace', marketplaceFilter);

      const res = await api.get(`/marketplaces?${params.toString()}`);
      if (res.data.success) {
        setListings(res.data.data.listings);
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
      if (res.data.success) setProducts(res.data.data.products);
    } catch (err) {}
  };

  useEffect(() => {
    fetchListings();
  }, [marketplaceFilter]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSaveListing = async (e) => {
    e.preventDefault();
    try {
      await api.post('/marketplaces', formData);
      setShowModal(false);
      fetchListings();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleSyncMarketplaces = async () => {
    setSyncing(true);
    try {
      const res = await api.post('/marketplaces/sync');
      if (res.data.success) {
        alert(res.data.message);
        fetchListings();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setSyncing(false);
    }
  };

  const columns = [
    {
      header: 'Listing Title & Marketplace',
      render: (row) => {
        const product = row.productId;
        const mainImage = product?.images?.[0]?.url;

        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden text-slate-400 shadow-2xs">
              {mainImage ? (
                <img
                  src={mainImage}
                  alt={row.listingTitle}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=150';
                  }}
                />
              ) : (
                <Store className="w-4 h-4" />
              )}
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white leading-tight">{row.listingTitle}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="primary" size="sm">{row.marketplace}</Badge>
                <span className="text-[11px] font-mono text-slate-400">FSN/ASIN: {row.marketplaceProductId || 'N/A'}</span>
              </div>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Marketplace SKU',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
          {row.marketplaceSKU}
        </span>
      )
    },
    {
      header: 'Listing Price',
      render: (row) => (
        <div>
          <span className="font-extrabold text-slate-900 dark:text-white">₹{row.price}</span>
          {row.mrp > 0 && <span className="text-[10px] text-slate-400 line-through block">₹{row.mrp}</span>}
        </div>
      )
    },
    {
      header: 'Central Inventory Stock',
      render: (row) => (
        <div>
          <span className={`font-bold ${row.centralStock <= 10 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {row.centralStock} available
          </span>
          <span className="text-[10px] text-slate-400 block">Single source of truth</span>
        </div>
      )
    },
    {
      header: 'Listing Status',
      render: (row) => (
        <Badge variant={row.listingStatus === 'ACTIVE' ? 'success' : 'neutral'} size="sm">
          {row.listingStatus}
        </Badge>
      )
    },
    {
      header: 'Marketplace Link',
      render: (row) => (
        row.listingUrl ? (
          <a
            href={row.listingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            Visit <ExternalLink className="w-3.5 h-3.5" />
          </a>
        ) : <span className="text-xs text-slate-400">-</span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Marketplace Multi-Channel Listings
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manually managed listings across Flipkart, Meesho, Amazon, and Web with real-time central stock sync.
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
            {syncing ? 'Syncing...' : 'Sync All Channels'}
          </Button>
          <Button onClick={() => setShowModal(true)} size="sm">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Marketplace Listing
          </Button>
        </div>
      </div>

      {/* Info Callout */}
      <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 dark:text-blue-200">
          <p className="font-bold">Marketplace Architecture Ready</p>
          <p className="mt-0.5 opacity-90">
            Listings display the exact live stock from the central inventory engine. Future Flipkart/Meesho API synchronization services plug directly into this layer without modifying the core database.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={listings}
        loading={loading}
        actions={
          <select
            value={marketplaceFilter}
            onChange={(e) => setMarketplaceFilter(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="">All Marketplaces</option>
            <option value="Flipkart">Flipkart</option>
            <option value="Meesho">Meesho</option>
            <option value="Amazon">Amazon</option>
            <option value="Website">Website</option>
          </select>
        }
      />

      {/* Add Listing Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add Marketplace Listing"
      >
        <form onSubmit={handleSaveListing} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Select Internal Product *"
              required
              value={formData.productId}
              onChange={(e) => {
                const p = products.find((prod) => prod._id === e.target.value);
                setFormData({
                  ...formData,
                  productId: e.target.value,
                  variantId: p?.variants?.[0]?._id || '',
                  listingTitle: p?.name || '',
                  marketplaceSKU: p?.variants?.[0]?.sku || p?.sku || '',
                  price: p?.sellingPrice || '',
                  mrp: p?.mrp || ''
                });
              }}
            >
              <option value="">-- Choose Product --</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
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
            </Select>
          </div>

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
                      {v.sku} {v.color ? `• ${v.color}` : ''} {v.size ? `(${v.size})` : ''} - ₹{v.price}
                    </option>
                  ))}
                </Select>
              );
            }
            return null;
          })()}

          <Input
            label="Listing Title *"
            required
            value={formData.listingTitle}
            onChange={(e) => setFormData({ ...formData, listingTitle: e.target.value })}
            placeholder="Title as displayed on marketplace"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Marketplace SKU *"
              required
              value={formData.marketplaceSKU}
              onChange={(e) => setFormData({ ...formData, marketplaceSKU: e.target.value })}
              placeholder="e.g. FLIP-TS-BLK-M"
            />
            <Input
              label="Marketplace Product ID (FSN / ASIN)"
              value={formData.marketplaceProductId}
              onChange={(e) => setFormData({ ...formData, marketplaceProductId: e.target.value })}
              placeholder="e.g. FPKT123984"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Selling Price (₹) *"
              type="number"
              required
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="699"
            />
            <Input
              label="MRP (₹)"
              type="number"
              value={formData.mrp}
              onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
              placeholder="1499"
            />
          </div>

          <Input
            label="Listing Public URL"
            value={formData.listingUrl}
            onChange={(e) => setFormData({ ...formData, listingUrl: e.target.value })}
            placeholder="https://flipkart.com/item/..."
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit">Create Listing</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
