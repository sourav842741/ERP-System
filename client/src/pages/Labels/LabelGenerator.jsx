import React, { useState, useEffect, useRef } from 'react';
import {
  Printer, Tag, Truck, FileText, Plus, Trash2, Edit2,
  Copy, RefreshCw, CheckCircle2, Sliders, Eye, Sparkles,
  Barcode, QrCode, Layers, ArrowRight, Download
} from 'lucide-react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import api from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';

export const LabelGenerator = () => {
  const [activeTab, setActiveTab] = useState('shipping'); // 'shipping' | 'sku_tag' | 'packing_slip' | 'templates'

  // Data Sources
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  // Mode 1: Shipping Label State
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [shippingLabelData, setShippingLabelData] = useState(null);
  const [loadingShippingLabel, setLoadingShippingLabel] = useState(false);
  const shippingBarcodeRef = useRef(null);
  const [shippingQrUrl, setShippingQrUrl] = useState('');

  // Mode 2: SKU Barcode Tags State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [skuTags, setSkuTags] = useState([]);
  const [copiesPerTag, setCopiesPerTag] = useState(1);
  const [customTagInput, setCustomTagInput] = useState({
    title: 'Nexus Premium Apparel',
    sku: 'NX-APP-001',
    barcode: 'NXAPP001',
    color: 'Black',
    size: 'XL',
    mrp: 999,
    sellingPrice: 599
  });

  // Mode 4: Templates CRUD State
  const [showAddTemplateModal, setShowAddTemplateModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: 'Standard 4x6 Thermal',
    type: 'shipping_label',
    dimensions: { width: 4, height: 6, unit: 'in' },
    settings: {
      showStoreName: true,
      storeName: 'Nexus Fulfillment Hub',
      showStoreLogo: true,
      showQR: true,
      showMRP: false
    }
  });

  // Load initial orders, products, and templates
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [ordersRes, productsRes, templatesRes] = await Promise.all([
          api.get('/orders'),
          api.get('/products'),
          api.get('/labels/templates')
        ]);
        if (ordersRes.data?.success) {
          const ords = ordersRes.data.data.orders || [];
          setOrders(ords);
          if (ords.length > 0) setSelectedOrderId(ords[0]._id);
        }
        if (productsRes.data?.success) {
          const prods = productsRes.data.data.products || [];
          setProducts(prods);
          if (prods.length > 0) setSelectedProductId(prods[0]._id);
        }
        if (templatesRes.data?.success) {
          setTemplates(templatesRes.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load label station data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch Shipping Label Data when selectedOrderId changes
  useEffect(() => {
    if (!selectedOrderId) return;
    const fetchShippingData = async () => {
      setLoadingShippingLabel(true);
      try {
        const res = await api.get(`/labels/order-shipping-label/${selectedOrderId}`);
        if (res.data?.success) {
          setShippingLabelData(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load shipping label data', err);
      } finally {
        setLoadingShippingLabel(false);
      }
    };
    fetchShippingData();
  }, [selectedOrderId]);

  // Render Barcode & QR for Shipping Label
  useEffect(() => {
    if (activeTab === 'shipping' && shippingLabelData && shippingBarcodeRef.current) {
      try {
        JsBarcode(shippingBarcodeRef.current, shippingLabelData.trackingNumber || 'AWB-12345678', {
          format: 'CODE128',
          width: 1.8,
          height: 48,
          displayValue: true,
          fontSize: 12,
          font: 'monospace',
          margin: 0
        });
      } catch (err) {
        console.warn('Barcode render error:', err);
      }

      // Generate QR Code
      QRCode.toDataURL(
        `Order:${shippingLabelData.orderNumber}|AWB:${shippingLabelData.trackingNumber}|COD:${shippingLabelData.isCod ? shippingLabelData.codAmount : 'PREPAID'}`,
        { width: 100, margin: 1 },
        (err, url) => {
          if (!err) setShippingQrUrl(url);
        }
      );
    }
  }, [shippingLabelData, activeTab]);

  // Load SKU Barcode Tags when product selected
  useEffect(() => {
    if (activeTab === 'sku_tag' && selectedProductId) {
      const prod = products.find((p) => p._id === selectedProductId);
      if (prod) {
        const tags = [];
        if (prod.variants && prod.variants.length > 0) {
          prod.variants.forEach((v) => {
            tags.push({
              title: prod.name,
              sku: v.sku,
              barcode: v.barcode || v.sku,
              color: v.color || '',
              size: v.size || '',
              mrp: v.mrp || prod.mrp || 999,
              sellingPrice: v.sellingPrice || prod.sellingPrice || 499
            });
          });
        } else {
          tags.push({
            title: prod.name,
            sku: prod.sku,
            barcode: prod.barcode || prod.sku,
            color: '',
            size: '',
            mrp: prod.mrp || 999,
            sellingPrice: prod.sellingPrice || 499
          });
        }
        setSkuTags(tags);
      }
    }
  }, [selectedProductId, activeTab, products]);

  // Helper component to render SVG barcode for SKU tags
  const BarcodeSvg = ({ value }) => {
    const svgRef = useRef(null);
    useEffect(() => {
      if (svgRef.current && value) {
        try {
          JsBarcode(svgRef.current, value, {
            format: 'CODE128',
            width: 1.4,
            height: 32,
            displayValue: true,
            fontSize: 10,
            font: 'monospace',
            margin: 0
          });
        } catch (e) {
          console.warn(e);
        }
      }
    }, [value]);
    return <svg ref={svgRef} className="max-w-full" />;
  };

  // Browser Print trigger
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Print Styles for Thermal Labels */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-label-canvas, #printable-label-canvas * {
            visibility: visible;
          }
          #printable-label-canvas {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            box-shadow: none !important;
            border: none !important;
          }
          @page {
            margin: 0;
            size: auto;
          }
        }
      `}</style>

      {/* 1. Header Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Barcode className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Barcode, SKU Tag & Thermal Shipping Label Station
            </h2>
            <p className="text-xs text-slate-500">
              1-Click Code-128 & QR generation for 4x6 thermal courier labels, retail price stickers, and packing slips.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('shipping')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'shipping'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-blue-500" />
            <span>4x6 Shipping Label</span>
          </button>

          <button
            onClick={() => setActiveTab('sku_tag')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'sku_tag'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-emerald-500" />
            <span>Retail SKU & Price Tags</span>
          </button>

          <button
            onClick={() => setActiveTab('packing_slip')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'packing_slip'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-purple-500" />
            <span>Warehouse Packing Slip</span>
          </button>
        </div>
      </div>

      {/* 2. TAB 1: 4x6 THERMAL SHIPPING LABEL */}
      {activeTab === 'shipping' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Order Selector & Print Controls (4 Cols) */}
          <div className="lg:col-span-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary-600" /> Label Setup & Order Select
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Select Dispatch Order:
              </label>
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-medium"
              >
                {orders.map((o) => (
                  <option key={o._id} value={o._id}>
                    {o.orderNumber} — ₹{o.total} ({o.paymentMethod}) - {o.customerSnapshot?.name}
                  </option>
                ))}
              </select>
            </div>

            {shippingLabelData && (
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>Carrier:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{shippingLabelData.carrier}</span>
                </div>
                <div className="flex justify-between">
                  <span>AWB Number:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{shippingLabelData.trackingNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Type:</span>
                  <span className={`font-bold ${shippingLabelData.isCod ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>
                    {shippingLabelData.isCod ? `COD (₹${shippingLabelData.codAmount})` : 'PREPAID'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Items:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{shippingLabelData.totalItemsCount} pcs</span>
                </div>
              </div>
            )}

            <Button onClick={handlePrint} className="w-full">
              <Printer className="w-4 h-4 mr-2" /> Print 4x6 Thermal Label
            </Button>
          </div>

          {/* Right Column: 4x6 Thermal Label Visual Preview (8 Cols) */}
          <div className="lg:col-span-8 flex justify-center">
            {loadingShippingLabel ? (
              <div className="p-16 text-center text-xs text-slate-400">Loading thermal label...</div>
            ) : shippingLabelData ? (
              <div
                id="printable-label-canvas"
                className="w-full max-w-[420px] bg-white text-black p-4 border-2 border-black rounded-lg shadow-xl font-sans text-xs space-y-3"
                style={{ minHeight: '600px' }}
              >
                {/* Header: Carrier & Marketplace Branding */}
                <div className="flex items-center justify-between pb-2 border-b-2 border-black">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-base uppercase tracking-tighter">
                      {shippingLabelData.carrier}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 border border-black font-bold uppercase">
                      STANDARD EXPRESS
                    </span>
                  </div>
                  <span className="font-bold text-xs uppercase px-2 py-0.5 bg-black text-white">
                    {shippingLabelData.source}
                  </span>
                </div>

                {/* Primary Tracking Barcode (Code-128) */}
                <div className="flex flex-col items-center justify-center py-1 border-b-2 border-black text-center">
                  <svg ref={shippingBarcodeRef} className="w-full max-h-16" />
                  <span className="font-mono font-bold tracking-widest text-[11px] mt-0.5">
                    {shippingLabelData.trackingNumber}
                  </span>
                </div>

                {/* Large COD / PREPAID Banner */}
                <div
                  className={`p-2.5 text-center font-black text-sm uppercase tracking-wider border-2 border-black ${
                    shippingLabelData.isCod
                      ? 'bg-black text-white text-base'
                      : 'bg-slate-100 text-black'
                  }`}
                >
                  {shippingLabelData.isCod
                    ? `CASH ON DELIVERY: COLLECT ₹${shippingLabelData.codAmount?.toFixed(2)}`
                    : 'PREPAID SHIPMENT — DO NOT COLLECT CASH'}
                </div>

                {/* Ship To & Return Address Grid */}
                <div className="grid grid-cols-12 gap-2 border-b-2 border-black pb-3">
                  <div className="col-span-8 space-y-1">
                    <span className="text-[9px] font-black uppercase text-slate-500 block">Deliver To:</span>
                    <span className="font-black text-sm block leading-tight">{shippingLabelData.recipient.name}</span>
                    <p className="text-[11px] leading-snug">
                      {shippingLabelData.recipient.street}
                    </p>
                    <p className="font-bold text-[11px]">
                      {shippingLabelData.recipient.city}, {shippingLabelData.recipient.state} -{' '}
                      <strong className="text-sm font-black underline">{shippingLabelData.recipient.postalCode}</strong>
                    </p>
                    <p className="text-[11px] font-mono">
                      Phone: <strong>{shippingLabelData.recipient.phone}</strong>
                    </p>
                  </div>

                  <div className="col-span-4 flex flex-col items-center justify-center border-l-2 border-black pl-2">
                    {shippingQrUrl && (
                      <img src={shippingQrUrl} alt="Shipment QR" className="w-20 h-20 object-contain" />
                    )}
                    <span className="text-[8px] font-mono text-center block mt-0.5">SCAN FOR POD</span>
                  </div>
                </div>

                {/* Item Picking Manifest with Warehouse Bin Locations! */}
                <div className="space-y-1 pb-2 border-b-2 border-black text-[10px]">
                  <div className="flex justify-between font-black uppercase border-b border-black pb-0.5 text-[9px]">
                    <span>Item & Bin Pick Location</span>
                    <span>Qty</span>
                  </div>
                  {shippingLabelData.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-baseline pt-0.5">
                      <div className="min-w-0 pr-2">
                        <span className="font-bold truncate block">{item.title}</span>
                        <span className="font-mono text-[9px] text-slate-600 block">
                          SKU: {item.sku} &bull; <strong>Bin: {item.binLocation}</strong>
                        </span>
                      </div>
                      <span className="font-mono font-black text-xs shrink-0">{item.quantity}</span>
                    </div>
                  ))}
                </div>

                {/* Sender & Legal Disclaimer */}
                <div className="text-[9px] leading-tight space-y-0.5 pt-1 text-slate-600">
                  <p>
                    <strong>Return / Shipper:</strong> {shippingLabelData.sender.name}, {shippingLabelData.sender.address}, {shippingLabelData.sender.city} - {shippingLabelData.sender.postalCode}. GSTIN: {shippingLabelData.sender.gstin}
                  </p>
                  <p className="text-[8px] italic pt-1">
                    Check parcel seal before accepting. Handled via Nexus Enterprise Logistics Network.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 3. TAB 2: RETAIL SKU & PRICE BARCODE TAGS */}
      {activeTab === 'sku_tag' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Choose Product:</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="text-xs p-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
              >
                {products.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
            </div>

            <Button onClick={handlePrint} size="sm">
              <Printer className="w-4 h-4 mr-1.5" /> Print All SKU Barcode Stickers
            </Button>
          </div>

          {/* Printable Tag Grid */}
          <div
            id="printable-label-canvas"
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {skuTags.map((tag, i) => (
              <div
                key={i}
                className="p-3 bg-white text-black border-2 border-dashed border-black rounded-lg shadow-sm flex flex-col justify-between"
                style={{ width: '100%', minHeight: '160px' }}
              >
                <div>
                  <div className="flex justify-between items-start pb-1 border-b border-black">
                    <span className="font-black text-[11px] truncate">{tag.title}</span>
                    <span className="text-[9px] font-bold uppercase px-1 border border-black">
                      {tag.size || 'STD'}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline py-1 text-[10px]">
                    <span>
                      SKU: <strong className="font-mono">{tag.sku}</strong>
                    </span>
                    {tag.color && <span>Color: <strong>{tag.color}</strong></span>}
                  </div>
                </div>

                {/* Barcode Element */}
                <div className="flex flex-col items-center justify-center my-1 text-center">
                  <BarcodeSvg value={tag.barcode} />
                </div>

                {/* Price Line */}
                <div className="flex justify-between items-center pt-1 border-t border-black text-xs font-black">
                  <span className="text-slate-500 line-through text-[10px]">MRP: ₹{tag.mrp}</span>
                  <span className="text-sm">OFFER: ₹{tag.sellingPrice}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. TAB 3: WAREHOUSE PACKING SLIP */}
      {activeTab === 'packing_slip' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Choose Order:</label>
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="text-xs p-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
              >
                {orders.map((o) => (
                  <option key={o._id} value={o._id}>
                    {o.orderNumber} - {o.customerSnapshot?.name} (₹{o.total})
                  </option>
                ))}
              </select>
            </div>

            <Button onClick={handlePrint} size="sm">
              <Printer className="w-4 h-4 mr-1.5" /> Print A4 Packing Slip
            </Button>
          </div>

          {shippingLabelData && (
            <div
              id="printable-label-canvas"
              className="max-w-3xl mx-auto bg-white text-black p-8 border border-black rounded-lg shadow-xl font-sans text-xs space-y-5"
            >
              <div className="flex justify-between items-start pb-4 border-b-2 border-black">
                <div>
                  <h1 className="text-xl font-black uppercase">PACKING SLIP & PICKLIST</h1>
                  <span className="text-xs font-mono">Order Number: <strong>{shippingLabelData.orderNumber}</strong></span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-sm block">Nexus Fulfillment Center</span>
                  <span className="text-[10px] text-slate-500">Date: {new Date().toLocaleDateString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-black text-xs">
                <div>
                  <strong className="block uppercase text-[10px] text-slate-500">Shipping Address:</strong>
                  <p className="font-bold text-sm">{shippingLabelData.recipient.name}</p>
                  <p>{shippingLabelData.recipient.street}</p>
                  <p>{shippingLabelData.recipient.city}, {shippingLabelData.recipient.state} - {shippingLabelData.recipient.postalCode}</p>
                  <p>Phone: {shippingLabelData.recipient.phone}</p>
                </div>
                <div className="text-right">
                  <strong className="block uppercase text-[10px] text-slate-500">Dispatch Details:</strong>
                  <p>Carrier: <strong>{shippingLabelData.carrier}</strong></p>
                  <p>AWB: <strong className="font-mono">{shippingLabelData.trackingNumber}</strong></p>
                  <p>Payment: <strong className="uppercase">{shippingLabelData.paymentMethod} (₹{shippingLabelData.total})</strong></p>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <table className="w-full text-xs text-left">
                  <thead className="border-b-2 border-black text-[10px] uppercase font-black">
                    <tr>
                      <th className="py-2">Item Description</th>
                      <th className="py-2">SKU</th>
                      <th className="py-2">Bin Location</th>
                      <th className="py-2 text-right">Picked Qty</th>
                      <th className="py-2 text-center">Check</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/20">
                    {shippingLabelData.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 font-bold">{item.title}</td>
                        <td className="py-2.5 font-mono">{item.sku}</td>
                        <td className="py-2.5 font-mono font-bold text-primary-700">{item.binLocation}</td>
                        <td className="py-2.5 font-mono font-bold text-right text-sm">{item.quantity}</td>
                        <td className="py-2.5 text-center">
                          <span className="inline-block w-4 h-4 border border-black rounded-xs" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-4 border-t-2 border-black flex justify-between items-center text-[10px] text-slate-600">
                <span>Verified by Packer: ___________________</span>
                <span>Signature: ___________________</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LabelGenerator;
