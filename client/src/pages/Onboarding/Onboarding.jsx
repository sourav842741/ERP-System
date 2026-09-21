import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store, Boxes, ShoppingCart, TrendingUp, ShieldCheck,
  ArrowRight, CheckCircle2, Zap, Layers, BarChart3,
  Sparkles, ChevronRight, Truck, FileText, Check,
  Warehouse, Users, Activity, Lock, RefreshCw,
  QrCode, Printer, Database, Globe, Play,
  ExternalLink, ChevronDown, Award, Eye, Bell
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

const ECOSYSTEM_CHANNELS = [
  { name: 'Amazon SP-API', color: '#f59e0b', status: 'Official API v2' },
  { name: 'Flipkart Seller Hub', color: '#2563eb', status: 'Direct Sync' },
  { name: 'Meesho Supplier', color: '#ec4899', status: 'Automated' },
  { name: 'Shopify Plus', color: '#10b981', status: 'Webhook Ready' },
  { name: 'Delhivery Logistics', color: '#06b6d4', status: 'API Tracking' },
  { name: 'Shiprocket Multi-Courier', color: '#8b5cf6', status: 'Integrated' },
  { name: 'GST Tax Portal', color: '#6366f1', status: 'E-Invoice Verified' }
];

export const Onboarding = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('inventory');

  const handleProceedToLogin = () => {
    localStorage.setItem('erp_tour_completed', 'true');
    localStorage.setItem('erp_has_onboarded', 'true');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-primary-500 selection:text-white font-sans relative overflow-x-hidden">
      {/* Dynamic Ambient Background Lights */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[850px] h-[450px] bg-gradient-to-r from-primary-600/25 via-cyan-500/20 to-indigo-600/25 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[850px] right-0 w-[550px] h-[550px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[1900px] left-0 w-[600px] h-[600px] bg-cyan-600/15 rounded-full blur-[150px] pointer-events-none" />

      {/* Subtle Grid Lines */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.25) 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}
      />

      {/* 1. TOP STICKY NAV */}
      <header className="sticky top-0 z-50 w-full bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Nexus ERP Logo"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain shadow-lg ring-1 ring-primary-500/30 bg-slate-900 p-0.5"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-black text-lg sm:text-xl tracking-tight text-white">
                  Nexus ERP
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300 border border-primary-500/30">
                  Enterprise
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide hidden sm:block">
                Unified Multi-Channel Operations Engine
              </span>
            </div>
          </div>

          {/* Quick Nav Anchors */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <a href="#cockpit" className="hover:text-primary-400 transition-colors">
              Platform Cockpit
            </a>
            <a href="#channels" className="hover:text-primary-400 transition-colors">
              Marketplace Sync
            </a>
            <a href="#warehouses" className="hover:text-primary-400 transition-colors">
              Multi-Warehouse
            </a>
            <a href="#invoicing" className="hover:text-primary-400 transition-colors">
              GST Invoicing
            </a>
            <a href="#finance" className="hover:text-primary-400 transition-colors">
              Unit Economics
            </a>
          </nav>

          {/* Action CTA */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleProceedToLogin}
              className="bg-gradient-to-r from-primary-600 via-indigo-600 to-cyan-600 hover:from-primary-500 hover:to-cyan-500 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-primary-600/30 flex items-center gap-1.5"
            >
              Sign In to ERP <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative z-10 pt-10 sm:pt-14 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/30 text-xs font-semibold text-primary-300 mb-5 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>v2.4 Enterprise Architecture • Real-Time Socket Gateway Active</span>
        </div>

        {/* Clean, Curated Headline */}
        <h1 className="font-heading font-black text-3xl sm:text-5xl lg:text-6xl tracking-tight text-white leading-[1.12] max-w-4xl mx-auto">
          One Unified Operating System for{' '}
          <span className="bg-gradient-to-r from-cyan-400 via-primary-300 to-indigo-300 bg-clip-text text-transparent">
            Multi-Channel E-Commerce & Retail
          </span>
        </h1>

        {/* Crisp Subtitle */}
        <p className="mt-4 text-sm sm:text-base lg:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Centralize master catalogs, synchronize real-time stock across Amazon, Flipkart & Meesho in sub-seconds, automate 1-click GST tax invoices, and monitor true net profit margins.
        </p>

        {/* Action Buttons */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3.5">
          <Button
            size="lg"
            onClick={handleProceedToLogin}
            className="bg-gradient-to-r from-primary-600 via-indigo-600 to-cyan-600 hover:from-primary-500 hover:to-cyan-500 text-white font-black text-sm px-7 py-3.5 rounded-xl shadow-xl shadow-primary-600/40 flex items-center gap-2"
          >
            Launch Enterprise Workspace <ArrowRight className="w-4 h-4" />
          </Button>

          <a
            href="#cockpit"
            className="px-6 py-3.5 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-900/70 text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center gap-2"
          >
            View Live Interface Preview <ChevronDown className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Ecosystem Channels Ticker */}
        <div className="mt-10 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 max-w-4xl mx-auto">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-2">
            Native Connectors:
          </span>
          {ECOSYSTEM_CHANNELS.map((ch, idx) => (
            <div
              key={idx}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-medium text-slate-300"
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ch.color }} />
              <span>{ch.name}</span>
            </div>
          ))}
        </div>

        {/* 3. HERO VISUAL: FIGMA-GRADE 3D ERP COCKPIT MOCKUP IMAGE */}
        <div id="cockpit" className="mt-12 relative group max-w-5xl mx-auto">
          {/* Ambient Glow */}
          <div className="absolute -inset-2 bg-gradient-to-r from-primary-500 via-cyan-400 to-indigo-600 rounded-3xl blur-2xl opacity-40 group-hover:opacity-60 transition duration-700" />

          {/* Window Container */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-900 shadow-2xl">
            {/* Window Top Controls */}
            <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="text-[11px] font-mono text-slate-400 ml-2">
                  Nexus Global Operations Engine • Live Production
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  Latency: 18ms
                </span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> 100% Synced
                </span>
              </div>
            </div>

            {/* Generated High-Resolution Dashboard Mockup Image */}
            <div className="relative overflow-hidden bg-slate-950">
              <img
                src="/dashboard_preview.png"
                alt="Nexus ERP Executive Dashboard Interface"
                className="w-full h-auto object-cover transform hover:scale-[1.01] transition duration-500"
              />

              {/* Floating Live KPI Overlays */}
              <div className="absolute bottom-4 left-4 right-4 hidden sm:flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/90 border border-slate-800/90 backdrop-blur-md text-xs shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black">
                    ₹
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Real-Time Gross GMV</div>
                    <div className="font-heading font-black text-sm text-white">₹1,845,910 MTD (+15.2%)</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-black">
                    <Boxes className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Multi-Hub Stock Tracked</div>
                    <div className="font-heading font-black text-sm text-white">8,912 Active SKUs</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-black">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Total Orders Ingested</div>
                    <div className="font-heading font-black text-sm text-white">12,450 Dispatches</div>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={handleProceedToLogin}
                  className="bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs px-4 shadow-md"
                >
                  Enter Cockpit <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SECTION: MULTI-CHANNEL MARKETPLACE ORCHESTRATION */}
      <section id="channels" className="relative z-10 py-16 sm:py-20 border-t border-slate-800/80 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-wider mb-3">
              <Store className="w-3.5 h-3.5" /> Channel Orchestration
            </div>
            <h2 className="font-heading font-black text-2xl sm:text-4xl text-white tracking-tight">
              Instant Two-Way Synchronization Across Every Marketplace
            </h2>
            <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed">
              When an item sells on Amazon, Nexus ERP automatically deducts safety stock on Flipkart and Meesho within 2 seconds, completely eliminating out-of-stock seller penalties.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 hover:border-primary-500/50 transition duration-300">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Store className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-black text-lg text-white">Amazon SP-API Gateway</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Direct integration with Amazon Selling Partner API. Auto-fetch orders, update tracking AWBs, adjust FBA & FBM inventory buffers, and synchronize SKU pricing.
              </p>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Webhook Ingestion:</span>
                <span className="text-emerald-400 font-bold">Sub-2.0s</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 hover:border-primary-500/50 transition duration-300">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-black text-lg text-white">Flipkart Hub & Smart Listing</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Seamlessly bind FSN product listings with central warehouse barcodes. Automatic batch order dispatch and manifest label generation.
              </p>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Catalog Binding:</span>
                <span className="text-blue-400 font-bold">1-Click Map</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 hover:border-primary-500/50 transition duration-300">
              <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-black text-lg text-white">Meesho & Offline POS</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Manage zero-commission social commerce alongside high-volume physical retail counters. Unified customer database and omnichannel CRM records.
              </p>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Atomic Lock:</span>
                <span className="text-pink-400 font-bold">Zero Oversell</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SECTION: MULTI-WAREHOUSE & GST INVOICE COCKPIT */}
      <section id="warehouses" className="relative z-10 py-16 sm:py-20 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-3">
              <Warehouse className="w-3.5 h-3.5" /> Logistics & Warehousing
            </div>
            <h2 className="font-heading font-black text-2xl sm:text-4xl text-white tracking-tight">
              Nationwide Multi-Warehouse Ledgers & Automated Invoicing
            </h2>
            <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed">
              Track physical, reserved, and in-transit inventory across regional hubs (Delhi, Mumbai, Bengaluru, Kolkata) with real-time barcode scanning and 100% compliant GST tax invoices.
            </p>
          </div>

          {/* SECOND GENERATED IMAGE: WAREHOUSE LOGISTICS & INVOICE SCREEN */}
          <div className="relative group max-w-5xl mx-auto mb-12">
            <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-500 rounded-3xl blur-2xl opacity-30 group-hover:opacity-50 transition duration-700" />
            <div className="relative rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-900 shadow-2xl">
              <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
                <span className="font-heading font-bold text-white flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-emerald-400" />
                  Regional Warehousing & Scanning Terminal Console
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  GST HSN Engine: Active
                </span>
              </div>
              <img
                src="/inventory_preview.png"
                alt="Regional Warehouses Map and Automated GST Invoice Preview"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>

          {/* 3 Column Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2.5">
              <div className="flex items-center gap-2 text-white font-heading font-bold text-sm">
                <QrCode className="w-4 h-4 text-primary-400" /> Barcode Pick & Pack
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Scan physical item barcodes during dispatch to ensure 100% SKU and variant packing accuracy before carton sealing.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2.5">
              <div className="flex items-center gap-2 text-white font-heading font-bold text-sm">
                <FileText className="w-4 h-4 text-amber-400" /> 1-Click GST Tax Invoices
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Generate compliant tax invoices with HSN codes, buyer GSTIN, CGST/SGST/IGST breakdown, and verified scannable QR codes.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2.5">
              <div className="flex items-center gap-2 text-white font-heading font-bold text-sm">
                <Printer className="w-4 h-4 text-emerald-400" /> 4x6" Thermal Shipping Labels
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Batch print standard thermal courier labels for Delhivery, BlueDart, and Xpressbees in single-click print queues.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SECTION: UNIT ECONOMICS & REAL-TIME P&L */}
      <section id="finance" className="relative z-10 py-16 sm:py-20 border-t border-slate-800/80 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-3">
              <TrendingUp className="w-3.5 h-3.5" /> Unit Economics
            </div>
            <h2 className="font-heading font-black text-2xl sm:text-4xl text-white tracking-tight">
              Know Your Real Net Profit Margin on Every Order
            </h2>
            <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed">
              Never get surprised by hidden deductions. Nexus ERP automatically factors in acquisition cost (COGS), marketplace commission slabs, shipping charges, and taxes in real time.
            </p>
          </div>

          {/* Unit Economics Breakdown Card */}
          <div className="max-w-3xl mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h4 className="font-heading font-black text-base text-white">
                  Live Unit Economics Demonstration
                </h4>
                <p className="text-xs text-slate-400">SKU: NX-PRO-STUDIO-HEADPHONES</p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                +45.6% Net Margin
              </span>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                <span className="text-slate-300">Gross Selling Price (Amazon)</span>
                <span className="font-bold text-white">₹2,499.00</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Product Acquisition Cost (COGS)</span>
                <span className="font-semibold text-rose-400">-₹950.00</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Marketplace Referral & Closing Fee (12%)</span>
                <span className="font-semibold text-rose-400">-₹299.88</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Courier Shipping & Packaging Weight Slab</span>
                <span className="font-semibold text-rose-400">-₹110.00</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-t-2 border-slate-800 text-sm sm:text-base font-black">
                <span className="text-white">Calculated Net Gross Profit:</span>
                <span className="text-emerald-400 font-heading text-lg">₹1,139.12</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. HIGH-CONVERSION FINAL CALL TO ACTION */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="relative overflow-hidden bg-gradient-to-r from-primary-950/80 via-slate-900 to-indigo-950/80 border border-primary-500/40 rounded-3xl p-8 sm:p-14 shadow-2xl backdrop-blur-xl">
          <div className="relative z-10 space-y-6">
            <img
              src="/logo.png"
              alt="Nexus ERP"
              className="w-16 h-16 rounded-2xl object-contain mx-auto shadow-2xl bg-slate-950 p-1 ring-2 ring-primary-500/40"
            />
            <h2 className="font-heading font-black text-2xl sm:text-4xl text-white tracking-tight">
              Ready to Accelerate Your Multi-Channel Brand?
            </h2>
            <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
              Login to your secure corporate workspace now to manage inventory, print GST invoices, and monitor live sales performance.
            </p>
            <div className="pt-2">
              <Button
                size="lg"
                onClick={handleProceedToLogin}
                className="bg-gradient-to-r from-primary-600 via-indigo-600 to-cyan-600 hover:from-primary-500 hover:to-cyan-500 text-white font-black text-sm px-8 py-4 rounded-xl shadow-xl shadow-primary-600/50 inline-flex items-center gap-2"
              >
                Proceed to Corporate Login <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 8. ENTERPRISE FOOTER */}
      <footer className="relative z-10 border-t border-slate-800/80 py-8 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Nexus Logo" className="w-6 h-6 object-contain rounded" />
            <span className="font-heading font-bold text-white">Nexus ERP Enterprise OS</span>
            <span>• © 2026 All Rights Reserved</span>
          </div>

          <div className="flex items-center gap-5">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              All Systems Operational
            </span>
            <button
              onClick={handleProceedToLogin}
              className="font-bold text-primary-400 hover:text-primary-300 transition-colors underline-offset-4 hover:underline"
            >
              Sign In to Account →
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Onboarding;
