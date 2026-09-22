import React, { useState, useEffect } from 'react';
import {
  Users, Plus, Phone, Mail, MapPin, ShoppingBag, Eye, Edit2, Trash2,
  Search, RefreshCw, DollarSign, TrendingUp, ShieldAlert, CheckCircle2,
  Calendar, Package, X, ArrowUpRight
} from 'lucide-react';
import api from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { DataTable } from '../../components/ui/DataTable';

export const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [customerDetails, setCustomerDetails] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDeleteCustomer, setSelectedDeleteCustomer] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    postalCode: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/customers?search=${encodeURIComponent(search)}`);
      if (res.data.success) {
        setCustomers(res.data.data.customers || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  // ================= KPI CALCULATIONS =================
  const totalCustomers = customers.length;
  const totalLifetimeSpend = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
  const avgCustomerLTV = totalCustomers > 0 ? Math.round(totalLifetimeSpend / totalCustomers) : 0;
  const repeatBuyersCount = customers.filter((c) => (c.totalOrders || 0) > 1).length;

  // ================= MODAL HANDLERS =================
  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      postalCode: ''
    });
    setFormError('');
    setShowFormModal(true);
  };

  const handleOpenEdit = (cust) => {
    setEditingCustomer(cust);
    setFormData({
      name: cust.name || '',
      phone: cust.phone || '',
      email: cust.email || '',
      address: cust.address || '',
      city: cust.city || '',
      state: cust.state || '',
      postalCode: cust.postalCode || ''
    });
    setFormError('');
    setShowFormModal(true);
  };

  const handleOpenDelete = (cust) => {
    setSelectedDeleteCustomer(cust);
    setShowDeleteModal(true);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Customer full name is required.');
      return;
    }

    setFormLoading(true);
    setFormError('');
    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer._id}`, formData);
      } else {
        await api.post('/customers', formData);
      }
      setShowFormModal(false);
      fetchCustomers();
    } catch (err) {
      setFormError(err.response?.data?.message || err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedDeleteCustomer) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/customers/${selectedDeleteCustomer._id}`);
      setShowDeleteModal(false);
      fetchCustomers();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleViewCustomer = async (cust) => {
    setDetailLoading(true);
    setShowDetailModal(true);
    try {
      const res = await api.get(`/customers/${cust._id}`);
      if (res.data.success) {
        setCustomerDetails(res.data.data);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = [
    {
      header: 'Customer Details',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-900/40 text-primary-600 dark:text-primary-400 font-black text-xs flex items-center justify-center shrink-0 uppercase">
            {row.name ? row.name.slice(0, 2) : 'CU'}
          </div>
          <div>
            <p className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
              {row.name}
            </p>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {row.email || 'No email provided'}
            </span>
          </div>
        </div>
      )
    },
    {
      header: 'Contact Phone',
      render: (row) => (
        row.phone ? (
          <a href={`tel:${row.phone}`} className="font-mono text-xs text-slate-700 dark:text-slate-300 font-semibold hover:text-primary-600">
            {row.phone}
          </a>
        ) : (
          <span className="text-xs text-slate-400">N/A</span>
        )
      )
    },
    {
      header: 'Location',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            {row.city ? `${row.city}${row.state ? `, ${row.state}` : ''}` : (row.address || 'India')}
          </span>
        </div>
      )
    },
    {
      header: 'Total Orders',
      render: (row) => (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono">
          <ShoppingBag className="w-3 h-3 text-slate-400" />
          {row.totalOrders || 0} order{row.totalOrders !== 1 ? 's' : ''}
        </span>
      )
    },
    {
      header: 'Lifetime Spend (LTV)',
      render: (row) => (
        <span className="font-extrabold text-xs text-emerald-600 dark:text-emerald-400 font-mono">
          ₹{(row.totalSpent || 0).toLocaleString('en-IN')}
        </span>
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
            onClick={() => handleViewCustomer(row)}
            className="text-xs h-7 px-2.5"
            title="View Customer Profile & Past Orders"
          >
            <Eye className="w-3.5 h-3.5 mr-1" /> Profile
          </Button>

          <button
            onClick={() => handleOpenEdit(row)}
            title="Edit Customer"
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => handleOpenDelete(row)}
            title="Delete Customer"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-primary-500" />
            Customer Intelligence & Lifetime Value
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Automated customer profiling, repeat buyer analytics, order histories, and CRM data.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={handleOpenAdd}
            size="sm"
            className="shadow-xs bg-primary-600 hover:bg-primary-700 text-white font-bold"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">Total Clients</span>
            <Users className="w-4 h-4 text-primary-500" />
          </div>
          <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
            {totalCustomers} Customers
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">Automated CRM directory</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">Cumulative Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
            ₹{totalLifetimeSpend.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">Total customer lifetime value</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">Average Customer LTV</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-lg font-black text-blue-600 dark:text-blue-400 mt-1">
            ₹{avgCustomerLTV.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">Revenue per unique customer</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">Repeat Buyers</span>
            <CheckCircle2 className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-lg font-black text-purple-600 dark:text-purple-400 mt-1">
            {repeatBuyersCount} Loyal Buyers
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">Ordered more than once</span>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search customer by name, phone, email, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 w-full focus:outline-hidden focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <button
          onClick={fetchCustomers}
          title="Refresh Customer Directory"
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Customers Table */}
      <DataTable
        columns={columns}
        data={customers}
        loading={loading}
        emptyMessage="No customers recorded yet. Customers are automatically saved when orders are placed, or you can click '+ Add Customer' to register one."
      />

      {/* ============================================================== */}
      {/* MODAL 1: ADD / EDIT CUSTOMER */}
      {/* ============================================================== */}
      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={editingCustomer ? `Edit Customer: ${editingCustomer.name}` : 'Register New Customer'}
      >
        <form onSubmit={handleSaveCustomer} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-600">
              {formError}
            </div>
          )}

          <Input
            label="Customer Full Name *"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Priya Mukherjee"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+91 9830011223"
            />
            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="priya@example.com"
            />
          </div>

          <Input
            label="Street Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Flat 4B, Silver Oak, GT Road"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="Kolkata"
            />
            <Input
              label="State"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              placeholder="West Bengal"
            />
            <Input
              label="Postal / PIN Code"
              value={formData.postalCode}
              onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
              placeholder="700001"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setShowFormModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={formLoading} className="font-bold">
              {formLoading ? 'Saving...' : (editingCustomer ? 'Update Customer' : 'Save Customer')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 2: VIEW CUSTOMER PROFILE & ORDER HISTORY */}
      {/* ============================================================== */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Customer Profile & Intelligence"
        maxWidth="max-w-3xl"
      >
        {detailLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading customer history...</div>
        ) : customerDetails ? (
          <div className="space-y-4 text-xs">
            {/* Customer Summary Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0 uppercase shadow-xs">
                  {customerDetails.customer?.name?.slice(0, 2) || 'CU'}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                    {customerDetails.customer?.name}
                  </h3>
                  <div className="flex items-center gap-3 text-slate-400 mt-1">
                    {customerDetails.customer?.phone && <span>📞 {customerDetails.customer?.phone}</span>}
                    {customerDetails.customer?.email && <span>✉️ {customerDetails.customer?.email}</span>}
                  </div>
                  {customerDetails.customer?.address && (
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      📍 {customerDetails.customer?.address}
                    </span>
                  )}
                </div>
              </div>

              {/* Stats Tiles */}
              <div className="flex items-center gap-3 sm:border-l sm:pl-4 border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Orders</span>
                  <span className="font-black text-sm text-slate-900 dark:text-white">
                    {customerDetails.analytics?.totalOrders || 0}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Lifetime Spend</span>
                  <span className="font-black text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                    ₹{(customerDetails.analytics?.totalSpent || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">AOV</span>
                  <span className="font-black text-sm text-blue-600 dark:text-blue-400 font-mono">
                    ₹{(customerDetails.analytics?.avgOrderValue || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Past Orders List */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Order History ({customerDetails.orders?.length || 0})
              </h4>
              {customerDetails.orders?.length > 0 ? (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 font-bold uppercase text-[10px] text-slate-500 border-b">
                      <tr>
                        <th className="p-2.5">Order #</th>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Source</th>
                        <th className="p-2.5 text-right">Total</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {customerDetails.orders.map((o) => (
                        <tr key={o._id}>
                          <td className="p-2.5 font-mono font-bold text-primary-600">
                            #{o.orderNumber}
                          </td>
                          <td className="p-2.5 text-slate-400">
                            {new Date(o.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-2.5 font-medium">{o.source}</td>
                          <td className="p-2.5 text-right font-mono font-bold">
                            ₹{o.total?.toLocaleString('en-IN')}
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                              {o.orderStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                  No orders completed by this customer yet.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setShowDetailModal(false)}>
                Close Profile
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 3: DELETE CUSTOMER CONFIRMATION */}
      {/* ============================================================== */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Customer Profile"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300">
            <p className="font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              Customer Deletion Check
            </p>
            <p className="mt-1">
              Are you sure you want to delete customer <strong>{selectedDeleteCustomer?.name}</strong>?
            </p>
            <p className="mt-1 text-slate-500">
              Note: Historical orders linked to this customer will remain safe in your financial ledger.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={deleteLoading}
              onClick={handleConfirmDelete}
            >
              {deleteLoading ? 'Deleting...' : 'Confirm Delete Customer'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
