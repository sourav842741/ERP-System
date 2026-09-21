import React, { useState, useEffect } from 'react';
import { Users, Plus, Phone, Mail, MapPin, ShoppingBag, Eye, Edit, Trash2 } from 'lucide-react';
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

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/customers?search=${encodeURIComponent(search)}`);
      if (res.data.success) setCustomers(res.data.data.customers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

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
    setShowFormModal(true);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer._id}`, formData);
      } else {
        await api.post('/customers', formData);
      }
      setShowFormModal(false);
      fetchCustomers();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleDeleteCustomer = async (cust) => {
    if (!window.confirm(`Are you sure you want to delete customer "${cust.name}"?`)) return;
    try {
      await api.delete(`/customers/${cust._id}`);
      fetchCustomers();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleViewCustomer = async (cust) => {
    try {
      const res = await api.get(`/customers/${cust._id}`);
      if (res.data.success) {
        setCustomerDetails(res.data.data);
        setShowDetailModal(true);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const columns = [
    {
      header: 'Customer',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs uppercase">
            {row.name ? row.name.slice(0, 2) : 'CU'}
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-white leading-tight">{row.name}</p>
            <span className="text-xs text-slate-400">{row.email || 'No email provided'}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Phone',
      render: (row) => (
        <span className="font-mono text-xs text-slate-700 dark:text-slate-300 font-semibold">
          {row.phone || 'N/A'}
        </span>
      )
    },
    {
      header: 'Location',
      render: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {row.city ? `${row.city}${row.state ? `, ${row.state}` : ''}` : (row.address || 'N/A')}
        </span>
      )
    },
    {
      header: 'Total Orders',
      render: (row) => <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{row.totalOrders || 0}</span>
    },
    {
      header: 'Total Spent',
      render: (row) => <span className="font-extrabold text-primary-600 dark:text-primary-400">₹{(row.totalSpent || 0).toLocaleString()}</span>
    },
    {
      header: 'Actions',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button size="sm" variant="outline" onClick={() => handleViewCustomer(row)} title="View Customer Profile & Orders">
            <Eye className="w-3.5 h-3.5 mr-1" /> Profile
          </Button>
          <button
            onClick={() => handleOpenEdit(row)}
            title="Edit Customer"
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteCustomer(row)}
            title="Delete Customer"
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Customer Intelligence</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Customer directory, order histories, average order value, and lifetime value.
          </p>
        </div>
        <Button onClick={handleOpenAdd} size="sm">
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Customer
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={customers}
        loading={loading}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search customer by name, phone, email..."
      />

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={editingCustomer ? 'Edit Customer Details' : 'Add New Customer'}
      >
        <form onSubmit={handleSaveCustomer} className="space-y-4">
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
            placeholder="Apartment, Lane, Area"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="e.g. Kolkata"
            />
            <Input
              label="State"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              placeholder="e.g. West Bengal"
            />
            <Input
              label="Postal Code / PIN"
              value={formData.postalCode}
              onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
              placeholder="e.g. 700001"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" onClick={() => setShowFormModal(false)}>Cancel</Button>
            <Button type="submit">
              {editingCustomer ? 'Update Customer' : 'Save Customer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Customer Details Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={customerDetails?.customer?.name ? `${customerDetails.customer.name} - Profile & Analytics` : 'Customer Profile'}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-5">
          {/* Customer header info */}
          {customerDetails?.customer && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{customerDetails.customer.name}</h4>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                  {customerDetails.customer.phone && <span>📞 {customerDetails.customer.phone}</span>}
                  {customerDetails.customer.email && <span>✉️ {customerDetails.customer.email}</span>}
                  {customerDetails.customer.city && <span>📍 {customerDetails.customer.city}</span>}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowDetailModal(false);
                  handleOpenEdit(customerDetails.customer);
                }}
              >
                <Edit className="w-3.5 h-3.5 mr-1" /> Edit Profile
              </Button>
            </div>
          )}

          {/* Analytics KPI boxes */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs border border-slate-100 dark:border-slate-700">
              <span className="text-slate-400 block font-medium">Total Orders</span>
              <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">
                {customerDetails?.analytics?.totalOrders || 0}
              </span>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-xs border border-emerald-200 dark:border-emerald-800">
              <span className="text-emerald-600 dark:text-emerald-400 block font-medium">Total Spent</span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                ₹{(customerDetails?.analytics?.totalSpent || 0).toLocaleString()}
              </span>
            </div>
            <div className="p-3 bg-primary-50 dark:bg-primary-950/40 rounded-xl text-xs border border-primary-200 dark:border-primary-800">
              <span className="text-primary-600 dark:text-primary-400 block font-medium">Avg Order Value</span>
              <span className="text-xl font-black text-primary-600 dark:text-primary-400 mt-1 block">
                ₹{(customerDetails?.analytics?.avgOrderValue || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Order history */}
          <div>
            <h4 className="text-xs font-bold uppercase text-slate-400 mb-2.5">
              Order History ({customerDetails?.orders?.length || 0})
            </h4>
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
              {customerDetails?.orders?.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No orders placed yet.</p>
              ) : (
                customerDetails?.orders?.map((o) => (
                  <div key={o._id} className="p-3 flex justify-between items-center text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <div>
                      <span className="font-bold font-mono text-slate-900 dark:text-white">#{o.orderNumber}</span>
                      <span className="ml-2 text-slate-400">({o.source})</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {new Date(o.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-sm">₹{o.total}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        o.orderStatus === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300' :
                        o.orderStatus === 'CANCELLED' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300' :
                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {o.orderStatus}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
