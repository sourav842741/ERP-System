import React, { useState, useEffect } from 'react';
import {
  Warehouse as WarehouseIcon, Plus, ArrowRightLeft,
  Building2, MapPin, CheckCircle, Boxes
} from 'lucide-react';
import api from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { DataTable } from '../../components/ui/DataTable';

export const Warehouses = () => {
  const [activeTab, setActiveTab] = useState('warehouses'); // 'warehouses' | 'transfers'
  const [warehouses, setWarehouses] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // New warehouse state
  const [whName, setWhName] = useState('');
  const [whCode, setWhCode] = useState('');
  const [whAddress, setWhAddress] = useState('');
  const [whCity, setWhCity] = useState('');
  const [whState, setWhState] = useState('');

  // Transfer state
  const [sourceWh, setSourceWh] = useState('');
  const [destWh, setDestWh] = useState('');
  const [transferItems, setTransferItems] = useState([]);

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/warehouses');
      if (res.data.success) setWarehouses(res.data.data.warehouses);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransfers = async () => {
    try {
      const res = await api.get('/warehouses/transfers/list');
      if (res.data.success) setTransfers(res.data.data.transfers);
    } catch (err) {}
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products?limit=100');
      if (res.data.success) setProducts(res.data.data.products);
    } catch (err) {}
  };

  useEffect(() => {
    fetchWarehouses();
    fetchTransfers();
    fetchProducts();
  }, []);

  const handleCreateWarehouse = async (e) => {
    e.preventDefault();
    try {
      await api.post('/warehouses', {
        name: whName,
        code: whCode,
        address: whAddress,
        city: whCity,
        state: whState
      });
      setShowAddModal(false);
      setWhName('');
      setWhCode('');
      setWhAddress('');
      setWhCity('');
      setWhState('');
      fetchWarehouses();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleTransferStock = async (e) => {
    e.preventDefault();
    if (!transferItems.length) {
      alert('Please add items to transfer');
      return;
    }
    if (sourceWh === destWh) {
      alert('Source and destination warehouses cannot be the same');
      return;
    }

    try {
      await api.post('/warehouses/transfer', {
        sourceWarehouseId: sourceWh,
        destinationWarehouseId: destWh,
        items: transferItems
      });
      setShowTransferModal(false);
      setTransferItems([]);
      fetchWarehouses();
      fetchTransfers();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const transferColumns = [
    {
      header: 'Transfer Number',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
          #{row.transferNumber}
        </span>
      )
    },
    {
      header: 'Route',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <span>{row.sourceWarehouse?.name}</span>
          <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-primary-600">{row.destinationWarehouse?.name}</span>
        </div>
      )
    },
    {
      header: 'Items Count',
      render: (row) => (
        <span className="text-xs text-slate-500">
          {row.items?.reduce((sum, i) => sum + i.quantity, 0)} units transferred
        </span>
      )
    },
    {
      header: 'Status',
      render: (row) => (
        <Badge variant="success" size="sm">
          {row.status}
        </Badge>
      )
    },
    {
      header: 'Date',
      render: (row) => (
        <span className="text-xs text-slate-400">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Warehouse Network & Stock Transfers
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Multi-warehouse location inventory tracking and inter-facility stock transfers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowTransferModal(true)} variant="outline" size="sm">
            <ArrowRightLeft className="w-3.5 h-3.5 mr-1" /> Transfer Stock
          </Button>
          <Button onClick={() => setShowAddModal(true)} size="sm">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Warehouse
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('warehouses')}
          className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'warehouses'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" /> Warehouses ({warehouses.length})
        </button>
        <button
          onClick={() => setActiveTab('transfers')}
          className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'transfers'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" /> Transfer Ledger ({transfers.length})
        </button>
      </div>

      {activeTab === 'warehouses' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {warehouses.map((w) => (
            <div key={w._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                    {w.code}
                  </span>
                  {w.isDefault && <Badge variant="primary" size="sm">Primary Hub</Badge>}
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">{w.name}</h4>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {w.city}, {w.state}
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Available Stock</span>
                  <span className="font-black text-emerald-600 text-base">{w.stats?.availableStock || 0}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Unique Items</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-base">{w.stats?.itemCount || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <DataTable
          columns={transferColumns}
          data={transfers}
          loading={loading}
          emptyMessage="No inter-warehouse stock transfers recorded yet"
        />
      )}

      {/* Add Warehouse Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register New Warehouse"
      >
        <form onSubmit={handleCreateWarehouse} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Warehouse Name *"
              required
              value={whName}
              onChange={(e) => setWhName(e.target.value)}
              placeholder="e.g. Bangalore Center"
            />
            <Input
              label="Facility Code *"
              required
              value={whCode}
              onChange={(e) => setWhCode(e.target.value.toUpperCase())}
              placeholder="e.g. BLR-01"
            />
          </div>
          <Input
            label="Street Address"
            value={whAddress}
            onChange={(e) => setWhAddress(e.target.value)}
            placeholder="Plot 12, Industrial Hub"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="City"
              value={whCity}
              onChange={(e) => setWhCity(e.target.value)}
              placeholder="Bangalore"
            />
            <Input
              label="State"
              value={whState}
              onChange={(e) => setWhState(e.target.value)}
              placeholder="Karnataka"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit">Create Warehouse</Button>
          </div>
        </form>
      </Modal>

      {/* Transfer Stock Modal */}
      <Modal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        title="Inter-Warehouse Stock Transfer"
      >
        <form onSubmit={handleTransferStock} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Source Warehouse *"
              value={sourceWh}
              onChange={(e) => setSourceWh(e.target.value)}
            >
              <option value="">-- Choose Origin --</option>
              {warehouses.map((w) => (
                <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
              ))}
            </Select>

            <Select
              label="Destination Warehouse *"
              value={destWh}
              onChange={(e) => setDestWh(e.target.value)}
            >
              <option value="">-- Choose Destination --</option>
              {warehouses.map((w) => (
                <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
              ))}
            </Select>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
            <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Select Items to Transfer</h4>
            <div className="max-h-36 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-700">
              {products.map((p) => (
                <div key={p._id} className="py-1.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold">{p.name}</span>
                    <span className="ml-2 font-mono text-[11px] text-slate-400">SKU: {p.sku}</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const v = p.variants?.[0];
                      setTransferItems([
                        ...transferItems,
                        {
                          variantId: v?._id,
                          productId: p._id,
                          sku: v?.sku || p.sku,
                          quantity: 25
                        }
                      ]);
                    }}
                  >
                    + Transfer Item
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {transferItems.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-slate-500">Items to Move</h4>
              {transferItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 border rounded-lg text-xs">
                  <span className="font-bold">{item.sku}</span>
                  <div className="flex items-center gap-2">
                    <span>Units:</span>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const copy = [...transferItems];
                        copy[idx].quantity = Number(e.target.value);
                        setTransferItems(copy);
                      }}
                      className="w-16 p-1 border rounded bg-slate-50 dark:bg-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => setTransferItems(transferItems.filter((_, i) => i !== idx))}
                      className="text-rose-500 font-bold"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="outline" onClick={() => setShowTransferModal(false)}>Cancel</Button>
            <Button type="submit">Execute Transfer</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
