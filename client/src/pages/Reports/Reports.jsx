import React, { useState } from 'react';
import {
  Download, FileSpreadsheet, BarChart3, Package,
  ShoppingCart, DollarSign, ArrowDownToLine
} from 'lucide-react';
import api from '../../api/client';
import { Button } from '../../components/ui/Button';

export const Reports = () => {
  const [downloading, setDownloading] = useState('');

  const handleExport = async (type) => {
    setDownloading(type);
    try {
      const defaultBaseUrl = typeof window !== 'undefined' && window.location.origin.includes('5173')
        ? 'http://localhost:5000/api/v1'
        : '/api/v1';
      const baseURL = import.meta.env.VITE_API_BASE_URL || defaultBaseUrl;
      const token = localStorage.getItem('erp_token');

      // Fetch blob with auth
      const response = await fetch(`${baseURL}/reports/export/${type}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `erp_${type}_export_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Failed to export report: ' + err.message);
    } finally {
      setDownloading('');
    }
  };

  const REPORT_CARDS = [
    {
      id: 'orders',
      title: 'Orders & Sales Ledger Report',
      desc: 'Complete order log with customer details, order statuses, totals, and payment status.',
      icon: ShoppingCart,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-950/40'
    },
    {
      id: 'inventory',
      title: 'Current Central Stock Report',
      desc: 'Physical, reserved, damaged, and net available stock across all warehouse facilities.',
      icon: Package,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40'
    },
    {
      id: 'expenses',
      title: 'Operational Expenses Audit',
      desc: 'Expense breakdown by category (Logistics, Packaging, Marketing, Software) with dates.',
      icon: DollarSign,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/40'
    },
    {
      id: 'products',
      title: 'Master Product Catalog Export',
      desc: 'Master list of products, SKUs, brands, selling prices, cost prices, and active statuses.',
      icon: BarChart3,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Reports & Data Exports
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Generate structured operational exports and financial reports (Section 22 & 29).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORT_CARDS.map((r) => {
          const Icon = r.icon;
          return (
            <div
              key={r.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${r.bg} ${r.color} flex items-center justify-center shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{r.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{r.desc}</p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                  <FileSpreadsheet className="w-3.5 h-3.5" /> CSV / Excel format
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  loading={downloading === r.id}
                  onClick={() => handleExport(r.id)}
                >
                  <ArrowDownToLine className="w-3.5 h-3.5 mr-1" /> Download CSV
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
