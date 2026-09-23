import React, { useState, useEffect } from 'react';
import {
  Building2, Palette, Server, Mail, ShieldCheck, CheckCircle2,
  Database, Zap, Cloud, Send, Check, Sun, Moon, Laptop,
  FileText, Sparkles, RefreshCw, AlertCircle, ArrowUpRight
} from 'lucide-react';
import api from '../../api/client';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';

const ACCENTS = [
  { id: 'indigo', name: 'Electric Indigo', color: 'bg-indigo-600', ring: 'ring-indigo-500', hex: '#4f46e5', preview: 'from-indigo-500 to-indigo-700' },
  { id: 'blue', name: 'Ocean Blue', color: 'bg-blue-600', ring: 'ring-blue-500', hex: '#2563eb', preview: 'from-blue-500 to-blue-700' },
  { id: 'emerald', name: 'Emerald Forest', color: 'bg-emerald-600', ring: 'ring-emerald-500', hex: '#059669', preview: 'from-emerald-500 to-emerald-700' },
  { id: 'violet', name: 'Royal Violet', color: 'bg-violet-600', ring: 'ring-violet-500', hex: '#7c3aed', preview: 'from-violet-500 to-violet-700' },
  { id: 'rose', name: 'Crimson Rose', color: 'bg-rose-600', ring: 'ring-rose-500', hex: '#e11d48', preview: 'from-rose-500 to-rose-700' },
  { id: 'amber', name: 'Sunset Amber', color: 'bg-amber-600', ring: 'ring-amber-500', hex: '#d97706', preview: 'from-amber-500 to-amber-700' },
  { id: 'cyan', name: 'Deep Cyan', color: 'bg-cyan-600', ring: 'ring-cyan-500', hex: '#0891b2', preview: 'from-cyan-500 to-cyan-700' },
  { id: 'slate', name: 'Neutral Slate', color: 'bg-slate-700', ring: 'ring-slate-500', hex: '#334155', preview: 'from-slate-600 to-slate-800' }
];

export const Settings = () => {
  const { theme, setTheme, accentColor, setAccentColor } = useTheme();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'appearance' | 'infrastructure'
  const [serviceStatus, setServiceStatus] = useState({});
  const [testEmailTo, setTestEmailTo] = useState('');
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState(null);

  // Business & Tax Invoice Profile State
  const [companyProfile, setCompanyProfile] = useState({
    companyName: 'NEXUS ERP',
    companyTagline: 'Multi-Channel Enterprise Order & Inventory Management',
    companyGstin: '19AAACN0123M1Z8',
    companyEmail: 'billing@nexuserp.com',
    companyPhone: '+91 98765 43210',
    companyAddress: 'Plot No. 42, Sector V, Salt Lake, Kolkata, West Bengal - 700091',
    invoiceTerms: 'Computer-generated tax invoice. No physical signature required.'
  });
  const [savingCompany, setSavingCompany] = useState(false);
  const [companySaveSuccess, setCompanySaveSuccess] = useState(false);

  const fetchServiceSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data?.success) {
        setServiceStatus(res.data.data.serviceStatus || {});
        const s = res.data.data.settings || {};
        setCompanyProfile({
          companyName: s.companyName || 'NEXUS ERP',
          companyTagline: s.companyTagline || 'Multi-Channel Enterprise Order & Inventory Management',
          companyGstin: s.companyGstin || '19AAACN0123M1Z8',
          companyEmail: s.companyEmail || 'billing@nexuserp.com',
          companyPhone: s.companyPhone || '+91 98765 43210',
          companyAddress: s.companyAddress || 'Plot No. 42, Sector V, Salt Lake, Kolkata, West Bengal - 700091',
          invoiceTerms: s.invoiceTerms || 'Computer-generated tax invoice. No physical signature required.'
        });
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    }
  };

  useEffect(() => {
    fetchServiceSettings();
  }, []);

  const handleSaveCompanyProfile = async (e) => {
    e.preventDefault();
    setSavingCompany(true);
    setCompanySaveSuccess(false);
    try {
      await api.post('/settings/save', companyProfile);
      setCompanySaveSuccess(true);
      setTimeout(() => setCompanySaveSuccess(false), 3000);
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setSavingCompany(false);
    }
  };

  const handleSendTestEmail = async (e) => {
    e.preventDefault();
    setTestEmailLoading(true);
    setTestEmailResult(null);
    try {
      const res = await api.post('/settings/test-email', { to: testEmailTo });
      setTestEmailResult({ success: true, message: res.data.message });
    } catch (err) {
      setTestEmailResult({ success: false, message: err.response?.data?.message || err.message });
    } finally {
      setTestEmailLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Enterprise Profile & Invoices', icon: Building2, desc: 'GSTIN, business address & billing info' },
    { id: 'appearance', label: 'Appearance & Theme', icon: Palette, desc: 'Dark mode & brand accent styling' },
    { id: 'infrastructure', label: 'Services & Infrastructure', icon: Server, desc: 'MongoDB, BullMQ, Cloudinary & SMTP' }
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            System Settings
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your organization profile, dynamic tax invoice headers, theme tokens, and backend services.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="neutral" size="sm" className="hidden sm:inline-flex items-center gap-1.5 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Nexus OS v2.4
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchServiceSettings}
            className="text-xs border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reload
          </Button>
        </div>
      </div>

      {/* 2. Enterprise Segmented Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3.5 ${
                isActive
                  ? 'bg-white dark:bg-slate-900 border-primary-500 dark:border-primary-500 ring-2 ring-primary-500/10 shadow-xs'
                  : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-900'
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  isActive
                    ? 'bg-primary-50 text-primary-600 dark:bg-primary-950/60 dark:text-primary-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className={`text-xs font-bold block truncate ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                  {tab.label}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate mt-0.5">
                  {tab.desc}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. TAB CONTENT */}

      {/* TAB 1: Enterprise Profile & Invoices */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Form (8 Cols) */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary-600" /> Organization & Legal Entity
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  These details populate every customer invoice, receipt, and export document.
                </p>
              </div>

              {companySaveSuccess && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-md">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                </span>
              )}
            </div>

            <form onSubmit={handleSaveCompanyProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Enterprise Registered Legal Name *"
                  required
                  value={companyProfile.companyName}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, companyName: e.target.value })}
                  placeholder="e.g. Acme Retail Enterprises Pvt Ltd"
                />
                <Input
                  label="GSTIN / VAT Identification No. *"
                  required
                  value={companyProfile.companyGstin}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, companyGstin: e.target.value.toUpperCase() })}
                  placeholder="e.g. 19AAACD5544E1Z3"
                />
              </div>

              <Input
                label="Corporate Brand Tagline / Subtitle"
                value={companyProfile.companyTagline}
                onChange={(e) => setCompanyProfile({ ...companyProfile, companyTagline: e.target.value })}
                placeholder="e.g. Multi-Channel Retail & Warehouse Supply Engine"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Official Billing & Accounting Email *"
                  type="email"
                  required
                  value={companyProfile.companyEmail}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, companyEmail: e.target.value })}
                  placeholder="e.g. billing@acme.com"
                />
                <Input
                  label="Support & Inquiries Contact Phone *"
                  required
                  value={companyProfile.companyPhone}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, companyPhone: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                />
              </div>

              <Input
                label="Registered Business Address *"
                required
                value={companyProfile.companyAddress}
                onChange={(e) => setCompanyProfile({ ...companyProfile, companyAddress: e.target.value })}
                placeholder="e.g. Plot No. 42, Tech City, Salt Lake, Kolkata, WB - 700091"
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tax Invoice Terms & Declarations
                </label>
                <textarea
                  rows={2}
                  value={companyProfile.invoiceTerms}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, invoiceTerms: e.target.value })}
                  placeholder="e.g. Computer-generated tax invoice. Goods once sold are covered under standard manufacturer warranty."
                  className="w-full text-xs p-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:border-primary-500"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" loading={savingCompany} size="sm" className="bg-primary-600 hover:bg-primary-700 text-white">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Save Changes
                </Button>
              </div>
            </form>
          </div>

          {/* Interactive Invoice Live Preview (4 Cols) */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-primary-600" /> Live Invoice Preview
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                GST Ready
              </span>
            </div>

            {/* Paper Preview Sheet */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 font-sans text-xs">
              <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-2.5">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">
                    {companyProfile.companyName || 'Your Company Name'}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {companyProfile.companyTagline || 'Enterprise Commerce Platform'}
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary-100 text-primary-800 dark:bg-primary-950/60 dark:text-primary-300">
                  TAX INVOICE
                </span>
              </div>

              <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                <p>
                  <strong className="text-slate-800 dark:text-slate-200">GSTIN:</strong>{' '}
                  <span className="font-mono">{companyProfile.companyGstin || '19AAACN0123M1Z8'}</span>
                </p>
                <p>
                  <strong className="text-slate-800 dark:text-slate-200">Email:</strong> {companyProfile.companyEmail || 'billing@example.com'}
                </p>
                <p>
                  <strong className="text-slate-800 dark:text-slate-200">Phone:</strong> {companyProfile.companyPhone || '+91 00000 00000'}
                </p>
                <p className="text-[10px] leading-tight pt-1 text-slate-500">
                  📍 {companyProfile.companyAddress || 'Plot No. 42, Tech City, Salt Lake, Kolkata'}
                </p>
              </div>

              {/* Sample Items Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden text-[10px]">
                <div className="bg-slate-100 dark:bg-slate-900 px-2 py-1 font-semibold text-slate-700 dark:text-slate-300 flex justify-between">
                  <span>Description</span>
                  <span>Amount</span>
                </div>
                <div className="px-2 py-1 flex justify-between border-t border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <span>Sample Item SKU #104</span>
                  <span>₹2,499.00</span>
                </div>
                <div className="px-2 py-1 flex justify-between border-t border-slate-200 dark:border-slate-800 font-bold text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-900/50">
                  <span>Total (incl. GST)</span>
                  <span>₹2,499.00</span>
                </div>
              </div>

              <p className="text-[9.5px] text-slate-400 dark:text-slate-500 italic leading-snug">
                "{companyProfile.invoiceTerms || 'Computer-generated tax invoice. No signature required.'}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Appearance & Theme Customizer */}
      {activeTab === 'appearance' && (
        <div className="space-y-6">
          {/* Theme Mode Selector Cards */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary-600" /> Interface Theme Mode
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Choose how Nexus ERP appears on your device. The setting is saved immediately.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              {[
                { id: 'light', label: 'Light Mode', desc: 'Clean paper white, optimal for daylight offices', icon: Sun },
                { id: 'dark', label: 'Dark Mode', desc: 'Deep slate, reduced glare for warehouse monitors', icon: Moon },
                { id: 'system', label: 'System Default', desc: 'Syncs automatically with operating system', icon: Laptop }
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = theme === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setTheme(m.id)}
                    className={`p-4 rounded-xl border text-left transition-all relative ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/30 ring-2 ring-primary-500/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary-600 text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center mb-2.5">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      {m.label}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 leading-snug">
                      {m.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accent Palette Selector */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary-600" /> Primary Accent Palette
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select a calibrated SaaS accent color. All buttons, active nav indicators, and focus rings will sync in real time.
                </p>
              </div>

              <Badge variant="primary" size="sm" className="font-mono text-[10px]">
                Active: {ACCENTS.find((a) => a.id === accentColor)?.name || 'Electric Indigo'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ACCENTS.map((acc) => {
                const isSelected = accentColor === acc.id;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setAccentColor(acc.id)}
                    className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/30 ring-2 ring-primary-500/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg ${acc.color} flex items-center justify-center text-white shadow-xs shrink-0`}>
                      {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : <div className="w-2 h-2 rounded-full bg-white/70" />}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{acc.name}</p>
                      <span className="text-[10px] font-mono text-slate-400">{acc.hex}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Live Component Preview Bar */}
            <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Live Accent Component Preview:
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm" className="bg-primary-600 hover:bg-primary-700 text-white font-medium">
                  Primary Button
                </Button>
                <Button size="sm" variant="outline" className="border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300">
                  Outline Button
                </Button>
                <Badge variant="primary" size="sm">
                  Active Tag
                </Badge>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 pl-2">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 accent-primary-600"
                  />
                  <span>Checkbox</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Connected Services & Infrastructure */}
      {activeTab === 'infrastructure' && (
        <div className="space-y-6">
          {/* Services Grid */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-primary-600" /> Infrastructure & Integrations Health
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Core services driving data storage, media assets, asynchronous tasks, and email dispatch.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              {/* MongoDB */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    <Database className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Connected
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">MongoDB Central</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Primary cluster database</p>
                </div>
              </div>

              {/* BullMQ */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    {serviceStatus.redisConfigured ? 'Redis BullMQ' : 'In-Memory Queue'}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Async Task Queue</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Bulk imports & batch sync</p>
                </div>
              </div>

              {/* Cloudinary */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    serviceStatus.cloudinaryConfigured
                      ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                  }`}>
                    {serviceStatus.cloudinaryConfigured ? 'Cloud CDN Active' : 'Local Disk'}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Cloudinary CDN</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Media assets & AI crops</p>
                </div>
              </div>

              {/* SMTP */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    serviceStatus.emailConfigured
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  }`}>
                    {serviceStatus.emailConfigured ? 'SMTP Live' : 'Simulated'}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Gmail SMTP Relay</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Order & low-stock alerts</p>
                </div>
              </div>
            </div>
          </div>

          {/* SMTP Email Ping Tester */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary-600" /> Send Test Notification Email
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Verify your SMTP credentials and delivery speed by sending a test alert to your inbox.
                </p>
              </div>

              <Badge variant={serviceStatus.emailConfigured ? 'success' : 'warning'} size="sm">
                {serviceStatus.emailConfigured ? 'Configured' : 'Simulation Mode'}
              </Badge>
            </div>

            {testEmailResult && (
              <div
                className={`p-3 text-xs rounded-lg font-medium border flex items-center gap-2 ${
                  testEmailResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                }`}
              >
                {testEmailResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{testEmailResult.message}</span>
              </div>
            )}

            <form onSubmit={handleSendTestEmail} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-lg">
              <div className="flex-1">
                <Input
                  type="email"
                  required
                  value={testEmailTo}
                  onChange={(e) => setTestEmailTo(e.target.value)}
                  placeholder="Enter destination email..."
                />
              </div>
              <Button type="submit" loading={testEmailLoading} size="sm" className="bg-primary-600 hover:bg-primary-700 text-white shrink-0 h-10">
                <Send className="w-3.5 h-3.5 mr-1.5" /> Dispatch Test
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
