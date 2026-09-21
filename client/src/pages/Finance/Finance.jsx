import React, { useState, useEffect } from 'react';
import {
  DollarSign, Plus, PieChart, TrendingUp, TrendingDown,
  CreditCard, Calendar, Trash2
} from 'lucide-react';
import api from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { DataTable } from '../../components/ui/DataTable';

export const Finance = () => {
  const [expenses, setExpenses] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [financeMetrics, setFinanceMetrics] = useState({});
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'Packaging',
    amount: '',
    paymentMethod: 'Bank Transfer',
    referenceNumber: '',
    notes: ''
  });

  const fetchFinancials = async () => {
    setLoading(true);
    try {
      const [expRes, finRes] = await Promise.all([
        api.get('/expenses'),
        api.get('/reports/finance')
      ]);

      if (expRes.data.success) {
        setExpenses(expRes.data.data.expenses);
        setBreakdown(expRes.data.data.breakdown);
        setCategories(expRes.data.data.categories || []);
      }
      if (finRes.data.success) {
        setFinanceMetrics(finRes.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancials();
  }, []);

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    try {
      await api.post('/expenses', formData);
      setShowModal(false);
      setFormData({
        title: '',
        category: 'Packaging',
        amount: '',
        paymentMethod: 'Bank Transfer',
        referenceNumber: '',
        notes: ''
      });
      fetchFinancials();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Delete this expense record?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      fetchFinancials();
    } catch (err) {}
  };

  const columns = [
    {
      header: 'Expense Item',
      render: (row) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-white leading-tight">{row.title}</p>
          <span className="text-[11px] text-slate-400">Ref: {row.referenceNumber || 'N/A'}</span>
        </div>
      )
    },
    {
      header: 'Category',
      render: (row) => <Badge variant="primary" size="sm">{row.category}</Badge>
    },
    {
      header: 'Payment Method',
      render: (row) => <span className="text-xs text-slate-500">{row.paymentMethod}</span>
    },
    {
      header: 'Amount',
      render: (row) => (
        <span className="font-extrabold text-rose-600">
          - ₹{row.amount.toLocaleString()}
        </span>
      )
    },
    {
      header: 'Date',
      render: (row) => (
        <span className="text-xs text-slate-400">
          {new Date(row.date).toLocaleDateString()}
        </span>
      )
    },
    {
      header: 'Action',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <button
          onClick={() => handleDeleteExpense(row._id)}
          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Financial Ledger & Profit/Loss
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Operational expenses tracking, marketplace fee reconciliation, and net profitability calculation.
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} size="sm">
          <Plus className="w-3.5 h-3.5 mr-1" /> Record Expense
        </Button>
      </div>

      {/* P&L Cards (Section 20) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase">Gross Revenue</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            ₹{(financeMetrics.revenue || 0).toLocaleString()}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">From confirmed delivered orders</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase">Total Operational Expenses</span>
          <p className="text-2xl font-black text-rose-600 mt-1">
            ₹{(financeMetrics.totalExpense || 0).toLocaleString()}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Packaging, Logistics, Marketing, Staff</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase">Estimated Net Profit</span>
          <p className={`text-2xl font-black mt-1 ${financeMetrics.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            ₹{(financeMetrics.netProfit || 0).toLocaleString()}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Revenue minus operational overhead</span>
        </div>
      </div>

      {/* Expense Category Breakdown */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Expenses by Category</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {breakdown.map((b) => (
            <div key={b._id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">{b._id}</span>
              <p className="text-base font-extrabold text-slate-900 dark:text-white mt-1">₹{b.totalAmount.toLocaleString()}</p>
              <span className="text-[10px] text-slate-400 block">{b.count} invoices</span>
            </div>
          ))}
        </div>
      </div>

      {/* Expense Entries Table */}
      <DataTable
        columns={columns}
        data={expenses}
        loading={loading}
        emptyMessage="No operational expenses recorded"
      />

      {/* Add Expense Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Record Operational Expense"
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <Input
            label="Expense Description *"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Courier Shipping Bags (1000 pcs)"
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Expense Category *"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="Packaging">Packaging</option>
              <option value="Shipping">Shipping</option>
              <option value="Warehouse">Warehouse</option>
              <option value="Salary">Salary</option>
              <option value="Advertising">Advertising</option>
              <option value="Transportation">Transportation</option>
              <option value="Electricity">Electricity</option>
              <option value="Software">Software</option>
              <option value="Marketplace Fees">Marketplace Fees</option>
              <option value="Other">Other</option>
            </Select>

            <Input
              label="Amount (₹) *"
              type="number"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="3500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Payment Method"
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
            >
              <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
              <option value="UPI">UPI</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Cash">Cash</option>
            </Select>

            <Input
              label="Reference / Invoice #"
              value={formData.referenceNumber}
              onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
              placeholder="INV-98213"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit">Save Expense</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
