import React, { useState, useEffect } from 'react';
import {
  Plus, ShoppingBag, RotateCcw, XCircle, CheckCircle,
  Truck, Eye, Search, AlertCircle, RefreshCw, Image as ImageIcon, Hash
} from 'lucide-react';
import api from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { DataTable } from '../../components/ui/DataTable';

const STATUS_VARIANTS = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  PROCESSING: 'info',
  PACKED: 'primary',
  SHIPPED: 'primary',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  RETURN_REQUESTED: 'warning',
  RETURNED: 'neutral',
  REFUNDED: 'neutral'
};

export const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Available products for order item selection
  const [productsList, setProductsList] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [customerData, setCustomerData] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });
  const [customOrderNumber, setCustomOrderNumber] = useState('');
  const [orderSource, setOrderSource] = useState('Manual');
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [orderShipping, setOrderShipping] = useState(0);
  const [createError, setCreateError] = useState('');

  // Status update / Cancel state
  const [newStatus, setNewStatus] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');

  // Return inspection state
  const [returnCondition, setReturnCondition] = useState('GOOD');
  const [inspectionNotes, setInspectionNotes] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (sourceFilter) params.append('source', sourceFilter);

      const res = await api.get(`/orders?${params.toString()}`);
      if (res.data.success) {
        setOrders(res.data.data.orders);
        setPagination(res.data.data.pagination);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductsCatalog = async () => {
    try {
      const res = await api.get('/products?limit=100');
      if (res.data.success) setProductsList(res.data.data.products);
    } catch (err) {}
  };

  useEffect(() => {
    fetchOrders();
  }, [page, search, statusFilter, sourceFilter]);

  useEffect(() => {
    fetchProductsCatalog();
  }, []);

  const handleOpenCreate = () => {
    setCustomOrderNumber('');
    setOrderItems([]);
    setCustomerData({ name: '', phone: '', email: '', address: '' });
    setOrderSource('Manual');
    setOrderDiscount(0);
    setOrderShipping(0);
    setCreateError('');
    setShowCreateModal(true);
  };

  const handleAddOrderItem = (product, variant) => {
    if ((variant?.stock?.availableStock || product.availableStock) <= 0) {
      alert('Selected item is currently Out of Stock!');
      return;
    }

    const existingIdx = orderItems.findIndex((i) => String(i.variantId) === String(variant?._id || product.variants?.[0]?._id));
    if (existingIdx > -1) {
      const copy = [...orderItems];
      copy[existingIdx].quantity += 1;
      setOrderItems(copy);
    } else {
      const selectedVar = variant || product.variants?.[0];
      setOrderItems([
        ...orderItems,
        {
          variantId: selectedVar?._id,
          productId: product._id,
          sku: selectedVar?.sku || product.sku,
          title: `${product.name} ${selectedVar?.color ? `(${selectedVar.color}/${selectedVar.size})` : ''}`,
          quantity: 1,
          unitPrice: selectedVar?.price || product.sellingPrice,
          costPrice: selectedVar?.costPrice || product.costPrice || 0,
          maxAvailable: selectedVar?.stock?.availableStock || product.availableStock
        }
      ]);
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setCreateError('');
    if (!orderItems.length) {
      setCreateError('Please select at least one item for this order.');
      return;
    }

    try {
      await api.post('/orders', {
        orderNumber: customOrderNumber ? customOrderNumber.trim() : undefined,
        source: orderSource,
        customerData,
        items: orderItems,
        discount: Number(orderDiscount),
        shippingFee: Number(orderShipping)
      });

      setShowCreateModal(false);
      fetchOrders();
    } catch (err) {
      setCreateError(err.response?.data?.message || err.message);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/orders/${selectedOrder._id}/status`, {
        orderStatus: newStatus,
        cancellationReason: newStatus === 'CANCELLED' ? cancellationReason : ''
      });
      setShowStatusModal(false);
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleProcessReturn = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/orders/${selectedOrder._id}/return`, {
        condition: returnCondition,
        inspectionNotes
      });
      setShowReturnModal(false);
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const columns = [
    {
      header: 'Order Number',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 dark:text-white font-mono text-xs">
            #{row.orderNumber}
          </span>
          <span className="text-[11px] text-slate-400 block">
            {new Date(row.createdAt).toLocaleDateString()}
          </span>
        </div>
      )
    },
    {
      header: 'Customer',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-200">{row.customerSnapshot?.name}</p>
          <span className="text-[11px] text-slate-400">{row.customerSnapshot?.phone}</span>
        </div>
      )
    },
    {
      header: 'Marketplace Source',
      render: (row) => (
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
          {row.source}
        </span>
      )
    },
    {
      header: 'Items Count',
      render: (row) => (
        <span className="text-xs text-slate-500">
          {row.items?.reduce((sum, i) => sum + i.quantity, 0) || 0} units
        </span>
      )
    },
    {
      header: 'Total Value',
      render: (row) => (
        <div>
          <span className="font-extrabold text-slate-900 dark:text-white">₹{row.total}</span>
          <span className="text-[10px] text-slate-400 block">{row.paymentStatus}</span>
        </div>
      )
    },
    {
      header: 'Status',
      render: (row) => (
        <Badge variant={STATUS_VARIANTS[row.orderStatus] || 'neutral'} size="sm">
          {row.orderStatus}
        </Badge>
      )
    },
    {
      header: 'Actions',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedOrder(row);
              setNewStatus(row.orderStatus);
              setCancellationReason('');
              setShowStatusModal(true);
            }}
          >
            Update
          </Button>

          {row.orderStatus === 'DELIVERED' && !row.returnDetails?.isRestocked && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setSelectedOrder(row);
                setReturnCondition('GOOD');
                setInspectionNotes('');
                setShowReturnModal(true);
              }}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Return
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Order Management</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Multi-channel manual orders, automatic inventory deduction, cancellations, and returns.
          </p>
        </div>
        <Button onClick={handleOpenCreate} size="sm">
          <Plus className="w-3.5 h-3.5 mr-1" /> Create Manual Order
        </Button>
      </div>

      {/* Filter Bar & Data Table */}
      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search order #, customer name, phone..."
        pagination={pagination}
        onPageChange={setPage}
        actions={
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="PROCESSING">PROCESSING</option>
              <option value="SHIPPED">SHIPPED</option>
              <option value="DELIVERED">DELIVERED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="RETURNED">RETURNED</option>
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="">All Sources</option>
              <option value="Flipkart">Flipkart</option>
              <option value="Meesho">Meesho</option>
              <option value="Amazon">Amazon</option>
              <option value="Website">Website</option>
              <option value="Manual">Manual</option>
            </select>
          </div>
        }
      />

      {/* Manual Create Order Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Order (Automatic Inventory Deduction)"
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleCreateOrder} className="space-y-4">
          {createError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-lg font-medium">
              {createError}
            </div>
          )}

          {/* Order ID & Source */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Input
                label="Custom Order ID / Number (Optional)"
                value={customOrderNumber}
                onChange={(e) => setCustomOrderNumber(e.target.value.toUpperCase())}
                placeholder="e.g. OD482910398 or INV-2026-001 (Leave blank to auto-generate)"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">
                💡 Khali chhodne par system automatic unique ID (jaise ORD-123456-1) generate karega.
              </span>
            </div>
            <Select
              label="Order Source *"
              value={orderSource}
              onChange={(e) => setOrderSource(e.target.value)}
            >
              <option value="Manual">Manual Entry</option>
              <option value="Flipkart">Flipkart</option>
              <option value="Meesho">Meesho</option>
              <option value="Amazon">Amazon</option>
              <option value="Website">Website</option>
            </Select>
          </div>

          {/* Customer Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Customer Full Name *"
              required
              value={customerData.name}
              onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
              placeholder="e.g. Rahul Sharma"
            />
            <Input
              label="Contact Phone *"
              required
              value={customerData.phone}
              onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
              placeholder="+91 9988776655"
            />
            <Input
              label="Email"
              type="email"
              value={customerData.email}
              onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
              placeholder="rahul@example.com"
            />
          </div>

          <Input
            label="Shipping Address"
            value={customerData.address}
            onChange={(e) => setCustomerData({ ...customerData, address: e.target.value })}
            placeholder="Street address, Flat number, City, Pincode"
          />

          {/* Item Selector */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
            <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Select Products from Inventory</h4>
            <div className="max-h-40 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-700">
              {productsList.map((p) => (
                <div key={p._id} className="py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden text-slate-400">
                      {p.images && p.images[0]?.url ? (
                        <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{p.name}</span>
                      <span className="ml-2 font-mono text-[11px] text-slate-400">SKU: {p.sku}</span>
                      <span className="ml-2 text-[10px] text-emerald-600 font-semibold">({p.availableStock} in stock)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">₹{p.sellingPrice}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddOrderItem(p, p.variants?.[0])}
                    >
                      + Add
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Line Items */}
          {orderItems.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-slate-500">Order Items</h4>
              {orderItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{item.title}</span>
                    <span className="ml-2 text-slate-400">Max avail: {item.maxAvailable}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400">Qty:</span>
                      <input
                        type="number"
                        min="1"
                        max={item.maxAvailable}
                        value={item.quantity}
                        onChange={(e) => {
                          const copy = [...orderItems];
                          copy[idx].quantity = Math.min(item.maxAvailable, Math.max(1, Number(e.target.value)));
                          setOrderItems(copy);
                        }}
                        className="w-16 p-1 text-center bg-slate-50 dark:bg-slate-800 border rounded"
                      />
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">₹{item.unitPrice * item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))}
                      className="text-rose-500 hover:text-rose-700 font-bold"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pricing Summary */}
          <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex gap-4">
              <div className="w-24">
                <Input
                  label="Discount (₹)"
                  type="number"
                  value={orderDiscount}
                  onChange={(e) => setOrderDiscount(e.target.value)}
                />
              </div>
              <div className="w-24">
                <Input
                  label="Shipping (₹)"
                  type="number"
                  value={orderShipping}
                  onChange={(e) => setOrderShipping(e.target.value)}
                />
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 block">Total Payable</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                ₹{Math.max(0, orderItems.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0) - Number(orderDiscount) + Number(orderShipping))}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button type="submit">Place Order & Deduct Stock</Button>
          </div>
        </form>
      </Modal>

      {/* Order Status Transition Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title={`Update Order #${selectedOrder?.orderNumber}`}
      >
        <form onSubmit={handleUpdateStatus} className="space-y-4">
          <Select
            label="Order Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
          >
            <option value="PENDING">PENDING</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="PACKED">PACKED</option>
            <option value="SHIPPED">SHIPPED</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="CANCELLED">CANCELLED (Automatically Restores Stock)</option>
          </Select>

          {newStatus === 'CANCELLED' && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-lg space-y-2">
              <p className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> Automatic Stock Restoration Rule
              </p>
              <p className="text-[11px] text-rose-600 dark:text-rose-300">
                Cancelling this order will immediately restore all deducted item quantities back to the central inventory ledger.
              </p>
              <Input
                label="Cancellation Reason *"
                required
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="e.g. Customer requested cancellation before dispatch"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setShowStatusModal(false)}>Cancel</Button>
            <Button type="submit">Save Status</Button>
          </div>
        </form>
      </Modal>

      {/* Return Inspection Modal */}
      <Modal
        isOpen={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        title={`Process Return for #${selectedOrder?.orderNumber}`}
      >
        <form onSubmit={handleProcessReturn} className="space-y-4">
          <p className="text-xs text-slate-500">
            Inspect the returned items upon warehouse intake to determine if they should be restocked to sellable inventory or sent to damaged quarantine.
          </p>

          <Select
            label="Inspection Condition *"
            value={returnCondition}
            onChange={(e) => setReturnCondition(e.target.value)}
          >
            <option value="GOOD">Good Condition → Restock Sellable Inventory</option>
            <option value="DAMAGED">Damaged / Defective → Move to Damaged Quarantine</option>
          </Select>

          <Input
            label="Inspection Notes"
            value={inspectionNotes}
            onChange={(e) => setInspectionNotes(e.target.value)}
            placeholder="e.g. Box slightly dented, product untouched with tags intact"
          />

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setShowReturnModal(false)}>Cancel</Button>
            <Button type="submit">Complete Return & Update Stock</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
