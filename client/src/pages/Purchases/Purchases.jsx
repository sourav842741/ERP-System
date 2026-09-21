import React, { useState, useEffect } from 'react';
import {
  Truck, Plus, CheckCircle, PackageCheck, AlertCircle, Eye, Users
} from 'lucide-react';
import api from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { DataTable } from '../../components/ui/DataTable';

export const Purchases = () => {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'suppliers'
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showPOModal, setShowPOModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);

  // PO Form state
  const [poSupplier, setPoSupplier] = useState('');
  const [poItems, setPoItems] = useState([]);

  // Supplier Form state
  const [supplierName, setSupplierName] = useState('');
  const [supplierCompany, setSupplierCompany] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [supplierGstin, setSupplierGstin] = useState('');

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const res = await api.get('/purchases');
      if (res.data.success) {
        setPurchaseOrders(res.data.data.purchaseOrders);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/suppliers');
      if (res.data.success) setSuppliers(res.data.data.suppliers);
    } catch (err) {}
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products?limit=100');
      if (res.data.success) setProducts(res.data.data.products);
    } catch (err) {}
  };

  useEffect(() => {
    if (activeTab === 'orders') fetchPurchases();
    else fetchSuppliers();
  }, [activeTab]);

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
  }, []);

  const handleCreatePO = async (e) => {
    e.preventDefault();
    if (!poItems.length) {
      alert('Please add at least one product item');
      return;
    }

    try {
      await api.post('/purchases', {
        supplierId: poSupplier,
        items: poItems
      });
      setShowPOModal(false);
      setPoItems([]);
      fetchPurchases();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    try {
      await api.post('/suppliers', {
        name: supplierName,
        company: supplierCompany,
        phone: supplierPhone,
        email: supplierEmail,
        gstin: supplierGstin
      });
      setShowSupplierModal(false);
      setSupplierName('');
      setSupplierCompany('');
      setSupplierPhone('');
      setSupplierEmail('');
      setSupplierGstin('');
      fetchSuppliers();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleReceiveGoods = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/purchases/${selectedPO._id}/receive`, {
        receivedItems: selectedPO.items.map((i) => ({
          variantId: i.variantId,
          receivedQuantity: i.quantity - (i.receivedQuantity || 0)
        }))
      });
      setShowReceiveModal(false);
      fetchPurchases();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const poColumns = [
    {
      header: 'PO Number',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 dark:text-white font-mono text-xs">
            #{row.poNumber}
          </span>
          <span className="text-[11px] text-slate-400 block">
            {new Date(row.createdAt).toLocaleDateString()}
          </span>
        </div>
      )
    },
    {
      header: 'Supplier',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-200">{row.supplier?.name}</p>
          <span className="text-[11px] text-slate-400">{row.supplier?.company}</span>
        </div>
      )
    },
    {
      header: 'Warehouse Destination',
      render: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {row.warehouse?.name}
        </span>
      )
    },
    {
      header: 'Order Items',
      render: (row) => (
        <span className="text-xs text-slate-500">
          {row.items?.reduce((sum, i) => sum + i.quantity, 0)} ordered / {row.items?.reduce((sum, i) => sum + (i.receivedQuantity || 0), 0)} received
        </span>
      )
    },
    {
      header: 'Total Cost',
      render: (row) => (
        <span className="font-extrabold text-slate-900 dark:text-white">
          ₹{row.total}
        </span>
      )
    },
    {
      header: 'Status',
      render: (row) => (
        <Badge
          variant={
            row.status === 'RECEIVED' ? 'success' :
            row.status === 'PARTIALLY_RECEIVED' ? 'warning' : 'info'
          }
          size="sm"
        >
          {row.status}
        </Badge>
      )
    },
    {
      header: 'Action',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        row.status !== 'RECEIVED' ? (
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setSelectedPO(row);
              setShowReceiveModal(true);
            }}
          >
            <PackageCheck className="w-3.5 h-3.5 mr-1" /> Receive Goods
          </Button>
        ) : (
          <span className="text-xs text-emerald-600 font-bold flex items-center justify-end gap-1">
            <CheckCircle className="w-4 h-4" /> Stock In
          </span>
        )
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Purchase Orders & Procurement
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage purchase workflows with automated stock incrementation upon goods receiving.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowSupplierModal(true)} variant="outline" size="sm">
            <Users className="w-3.5 h-3.5 mr-1" /> Add Supplier
          </Button>
          <Button onClick={() => setShowPOModal(true)} size="sm">
            <Plus className="w-3.5 h-3.5 mr-1" /> Create Purchase Order
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'orders'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Truck className="w-4 h-4" /> Purchase Orders ({purchaseOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'suppliers'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" /> Registered Suppliers ({suppliers.length})
        </button>
      </div>

      {activeTab === 'orders' ? (
        <DataTable
          columns={poColumns}
          data={purchaseOrders}
          loading={loading}
          emptyMessage="No purchase orders created yet"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {suppliers.map((s) => (
            <div key={s._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">{s.name}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{s.company || 'Private Supplier'}</p>
              <div className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                <p>Phone: {s.phone || 'N/A'}</p>
                <p>GSTIN: <span className="font-mono">{s.gstin || 'Unregistered'}</span></p>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs font-semibold">
                <span className="text-slate-400">Total POs:</span>
                <span>{s.totalPurchases || 0}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Purchase Order Modal */}
      <Modal
        isOpen={showPOModal}
        onClose={() => setShowPOModal(false)}
        title="Create Purchase Order"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreatePO} className="space-y-4">
          <Select
            label="Select Supplier *"
            required
            value={poSupplier}
            onChange={(e) => setPoSupplier(e.target.value)}
          >
            <option value="">-- Select Registered Supplier --</option>
            {suppliers.map((s) => (
              <option key={s._id} value={s._id}>{s.name} ({s.company})</option>
            ))}
          </Select>

          {/* Add Item Row */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
            <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Add Items to Purchase</h4>
            <div className="max-h-36 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-700">
              {products.map((p) => (
                <div key={p._id} className="py-1.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{p.name}</span>
                    <span className="ml-2 font-mono text-[11px] text-slate-400">Cost: ₹{p.costPrice || 0}</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const v = p.variants?.[0];
                      setPoItems([
                        ...poItems,
                        {
                          variantId: v?._id,
                          productId: p._id,
                          sku: v?.sku || p.sku,
                          title: p.name,
                          quantity: 50,
                          unitCost: p.costPrice || 100,
                          taxPercent: 0
                        }
                      ]);
                    }}
                  >
                    + Add to PO
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Selected PO Items */}
          {poItems.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-slate-500">PO Items</h4>
              {poItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 border rounded-lg text-xs">
                  <div>
                    <span className="font-bold">{item.title}</span>
                    <span className="ml-2 font-mono text-[11px] text-slate-400">{item.sku}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span>Qty:</span>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const copy = [...poItems];
                          copy[idx].quantity = Number(e.target.value);
                          setPoItems(copy);
                        }}
                        className="w-16 p-1 border rounded bg-slate-50 dark:bg-slate-800"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span>Cost: ₹</span>
                      <input
                        type="number"
                        min="1"
                        value={item.unitCost}
                        onChange={(e) => {
                          const copy = [...poItems];
                          copy[idx].unitCost = Number(e.target.value);
                          setPoItems(copy);
                        }}
                        className="w-20 p-1 border rounded bg-slate-50 dark:bg-slate-800"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setPoItems(poItems.filter((_, i) => i !== idx))}
                      className="text-rose-500 font-bold"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" onClick={() => setShowPOModal(false)}>Cancel</Button>
            <Button type="submit">Issue Purchase Order</Button>
          </div>
        </form>
      </Modal>

      {/* Goods Receiving Confirmation Modal */}
      <Modal
        isOpen={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
        title={`Receive Goods for PO #${selectedPO?.poNumber}`}
      >
        <form onSubmit={handleReceiveGoods} className="space-y-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-300">
            <p className="font-bold flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> Automatic Inventory Stock In
            </p>
            <p className="mt-0.5">
              Confirming receipt will automatically increase the physical stock for each item in the warehouse and record immutable PURCHASE transactions in the central inventory ledger.
            </p>
          </div>

          <div className="space-y-2">
            {selectedPO?.items?.map((item, idx) => (
              <div key={idx} className="p-2 border rounded-lg flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold">{item.title}</p>
                  <span className="text-slate-400">Ordered: {item.quantity} units</span>
                </div>
                <span className="font-bold text-emerald-600">
                  +{item.quantity - (item.receivedQuantity || 0)} units to stock
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setShowReceiveModal(false)}>Cancel</Button>
            <Button type="submit">Confirm & Restock</Button>
          </div>
        </form>
      </Modal>

      {/* Supplier Modal */}
      <Modal
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        title="Register New Supplier"
      >
        <form onSubmit={handleCreateSupplier} className="space-y-4">
          <Input
            label="Supplier Contact Name *"
            required
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            placeholder="e.g. Ramesh Fabrics"
          />
          <Input
            label="Company Name"
            value={supplierCompany}
            onChange={(e) => setSupplierCompany(e.target.value)}
            placeholder="Ramesh Textile Mills Ltd"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              value={supplierPhone}
              onChange={(e) => setSupplierPhone(e.target.value)}
              placeholder="+91 9123456780"
            />
            <Input
              label="GSTIN"
              value={supplierGstin}
              onChange={(e) => setSupplierGstin(e.target.value.toUpperCase())}
              placeholder="19ABCDE1234F1Z5"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setShowSupplierModal(false)}>Cancel</Button>
            <Button type="submit">Save Supplier</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
