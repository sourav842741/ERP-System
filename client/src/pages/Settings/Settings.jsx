import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon, Palette, Mail, Server, Check,
  Send, Database, Cloud, Zap, Building2, FileText, CheckCircle2,
  Phone, MapPin, Receipt, ShieldCheck
} from 'lucide-react';
import api from '../../api/client';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';

const ACCENTS = [
  { id: 'indigo', name: 'Electric Indigo', color: 'bg-indigo-600' },
  { id: 'blue', name: 'Ocean Blue', color: 'bg-blue-600' },
  { id: 'emerald', name: 'Emerald Forest', color: 'bg-emerald-600' },
  { id: 'violet', name: 'Royal Violet', color: 'bg-violet-600' },
  { id: 'rose', name: 'Crimson Rose', color: 'bg-rose-600' },
  { id: 'amber', name: 'Sunset Amber', color: 'bg-amber-600' }
];

export const Settings = () => {
  const { theme, setTheme, accentColor, setAccentColor } = useTheme();
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
      if (res.data.success) {
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
    } catch (err) {}
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

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          System & Company Settings
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Configure real enterprise business info for Tax Invoices, ERP appearance, and infrastructure.
        </p>
      </div>

      {/* 🏢 Company & Tax Invoice Profile (Real Business Settings) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary-600" /> Enterprise Profile & Tax Invoice Details
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Yeh saari real details aapke print hone wale Tax Invoices, Bills aur Customer Receipts par automatically aayengi.
            </p>
          </div>
          {companySaveSuccess && (
            <Badge variant="success" size="sm" className="self-start sm:self-auto flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Saved to Database!
            </Badge>
          )}
        </div>

        <form onSubmit={handleSaveCompanyProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Company / Enterprise Name *"
              required
              value={companyProfile.companyName}
              onChange={(e) => setCompanyProfile({ ...companyProfile, companyName: e.target.value })}
              placeholder="e.g. Deepenterprises Pvt. Ltd."
            />
            <Input
              label="GSTIN / Tax Identification Number *"
              required
              value={companyProfile.companyGstin}
              onChange={(e) => setCompanyProfile({ ...companyProfile, companyGstin: e.target.value.toUpperCase() })}
              placeholder="e.g. 19AAACD5544E1Z3"
            />
          </div>

          <Input
            label="Business Tagline / Subtitle"
            value={companyProfile.companyTagline}
            onChange={(e) => setCompanyProfile({ ...companyProfile, companyTagline: e.target.value })}
            placeholder="e.g. Premium E-Commerce & Retail Supply Hub"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Official Billing Email *"
              type="email"
              required
              value={companyProfile.companyEmail}
              onChange={(e) => setCompanyProfile({ ...companyProfile, companyEmail: e.target.value })}
              placeholder="e.g. billing@deepenterprises.com"
            />
            <Input
              label="Customer Support / Billing Phone *"
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
            placeholder="e.g. 123 Commercial Plaza, Park Street, Kolkata, West Bengal - 700016"
          />

          <Input
            label="Invoice Terms & Footer Disclaimer"
            value={companyProfile.invoiceTerms}
            onChange={(e) => setCompanyProfile({ ...companyProfile, invoiceTerms: e.target.value })}
            placeholder="e.g. Computer-generated tax invoice. Goods once sold are covered under warranty."
          />

          {/* Live Preview Card */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              👀 Invoice Header Live Preview:
            </span>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-black text-slate-900 dark:text-white text-base leading-tight">
                  {companyProfile.companyName || 'Your Company Name'}
                </p>
                <p className="text-xs text-slate-500">
                  {companyProfile.companyTagline || 'Enterprise Tagline'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  GSTIN: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{companyProfile.companyGstin || 'N/A'}</span> &bull; Email: {companyProfile.companyEmail || 'N/A'} &bull; Phone: {companyProfile.companyPhone || 'N/A'}
                </p>
                <p className="text-[10.5px] text-slate-400 mt-0.5">
                  📍 {companyProfile.companyAddress || 'Registered Address'}
                </p>
              </div>
              <Badge variant="primary" size="sm">TAX INVOICE</Badge>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" loading={savingCompany} size="sm">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Save Company Profile
            </Button>
          </div>
        </form>
      </div>

      {/* Infrastructure Status */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <Server className="w-4 h-4 text-primary-600" /> Connected Services Status
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Database className="w-4 h-4 text-emerald-500" />
              <div>
                <p className="text-xs font-bold">MongoDB Central DB</p>
                <span className="text-[10px] text-slate-400">Primary Database</span>
              </div>
            </div>
            <Badge variant="success" size="sm">Active</Badge>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-amber-500" />
              <div>
                <p className="text-xs font-bold">Background Queue</p>
                <span className="text-[10px] text-slate-400">{serviceStatus.redisConfigured ? 'BullMQ (Redis)' : 'In-Memory Auto-Retry'}</span>
              </div>
            </div>
            <Badge variant="primary" size="sm">{serviceStatus.redisConfigured ? 'Redis' : 'Active Fallback'}</Badge>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Cloud className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-xs font-bold">Cloudinary Media</p>
                <span className="text-[10px] text-slate-400">{serviceStatus.cloudinaryConfigured ? 'Cloudinary CDN' : 'Local Storage Fallback'}</span>
              </div>
            </div>
            <Badge variant={serviceStatus.cloudinaryConfigured ? 'success' : 'neutral'} size="sm">
              {serviceStatus.cloudinaryConfigured ? 'Cloud' : 'Local Disk'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Appearance & Theme (Section 34) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary-600" /> Appearance & Theme Customizer
        </h3>

        {/* Theme Mode */}
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-2">Theme Mode</label>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            {['light', 'dark', 'system'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setTheme(m)}
                className={`py-2 px-3 rounded-lg border text-xs font-bold uppercase transition-all ${
                  theme === m
                    ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Accent Colors */}
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-2">Primary Accent Palette</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ACCENTS.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => setAccentColor(acc.id)}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                  accentColor === acc.id
                    ? 'border-primary-600 bg-slate-50 dark:bg-slate-800/80 ring-2 ring-primary-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className={`w-7 h-7 rounded-full ${acc.color} flex items-center justify-center text-white shadow-xs shrink-0`}>
                  {accentColor === acc.id && <Check className="w-4 h-4 stroke-[3]" />}
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{acc.name}</p>
                  <span className="text-[10px] text-slate-400">CSS Tokens Active</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SMTP Email Configuration & Test Dispatch (Section 27) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary-600" /> Gmail SMTP Email System
          </h3>
          <Badge variant={serviceStatus.emailConfigured ? 'success' : 'warning'} size="sm">
            {serviceStatus.emailConfigured ? 'SMTP Configured' : 'Simulation Mode'}
          </Badge>
        </div>

        <p className="text-xs text-slate-500">
          Enter SMTP credentials in your <code>server/.env</code> file. You can dispatch a test email below to verify connectivity.
        </p>

        {testEmailResult && (
          <div className={`p-3 text-xs rounded-lg font-medium border ${testEmailResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
            {testEmailResult.message}
          </div>
        )}

        <form onSubmit={handleSendTestEmail} className="flex gap-2 max-w-md">
          <Input
            type="email"
            required
            value={testEmailTo}
            onChange={(e) => setTestEmailTo(e.target.value)}
            placeholder="your-email@example.com"
          />
          <Button type="submit" loading={testEmailLoading} size="md">
            <Send className="w-3.5 h-3.5 mr-1" /> Send Test
          </Button>
        </form>
      </div>
    </div>
  );
};
