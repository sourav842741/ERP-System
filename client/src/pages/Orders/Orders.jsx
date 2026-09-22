import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, ShoppingBag, RotateCcw, XCircle, CheckCircle,
  Truck, Eye, Search, AlertCircle, RefreshCw, Image as ImageIcon,
  Edit2, Trash2, Printer, MapPin, Phone, Mail, User, CreditCard, Package,
  ExternalLink, Copy, Check, FileText, Settings as SettingsIcon
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

const PAYMENT_STATUS_VARIANTS = {
  PENDING: 'warning',
  PAID: 'success',
  FAILED: 'danger',
  REFUNDED: 'neutral'
};

const COURIER_PARTNERS = [
  'Bluedart',
  'Delhivery',
  'DTDC',
  'India Post',
  'FedEx',
  'Shadowfax',
  'Xpressbees',
  'Ecom Express',
  'Other / Self Ship'
];

export const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  // Business & Tax Invoice Profile State (configured by admin in Settings)
  const [companyProfile, setCompanyProfile] = useState({
    companyName: 'NEXUS ERP',
    companyTagline: 'Multi-Channel Enterprise Order & Inventory Management',
    companyGstin: '19AAACN0123M1Z8',
    companyEmail: 'billing@nexuserp.com',
    companyPhone: '+91 98765 43210',
    companyAddress: 'Plot No. 42, Sector V, Salt Lake, Kolkata, West Bengal - 700091',
    invoiceTerms: 'Computer-generated tax invoice. No physical signature required.'
  });

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [copiedTracking, setCopiedTracking] = useState(false);

  // Products catalog for item selection
  const [productsList, setProductsList] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [orderItems, setOrderItems] = useState([]);

  // Create Order state
  const [customOrderNumber, setCustomOrderNumber] = useState('');
  const [orderSource, setOrderSource] = useState('Manual');
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [orderShipping, setOrderShipping] = useState(0);
  const [orderPaymentMethod, setOrderPaymentMethod] = useState('COD');
  const [orderPaymentStatus, setOrderPaymentStatus] = useState('PENDING');
  const [orderShippingCarrier, setOrderShippingCarrier] = useState('');
  const [orderTrackingNumber, setOrderTrackingNumber] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [customerData, setCustomerData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    postalCode: ''
  });
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Edit Order state
  const [editFormData, setEditFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    shippingCarrier: '',
    trackingNumber: '',
    paymentMethod: 'COD',
    paymentStatus: 'PENDING',
    orderStatus: 'PENDING',
    notes: '',
    cancellationReason: ''
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete State
  const [deleteRestoreStock, setDeleteRestoreStock] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  const fetchCompanySettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data.success && res.data.data.settings) {
        const s = res.data.data.settings;
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
    fetchOrders();
  }, [page, search, statusFilter, sourceFilter]);

  useEffect(() => {
    fetchProductsCatalog();
    fetchCompanySettings();
  }, []);

  const handleOpenCreate = () => {
    setCustomOrderNumber('');
    setOrderItems([]);
    setCustomerData({
      name: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      postalCode: ''
    });
    setOrderSource('Manual');
    setOrderDiscount(0);
    setOrderShipping(0);
    setOrderPaymentMethod('COD');
    setOrderPaymentStatus('PENDING');
    setOrderShippingCarrier('');
    setOrderTrackingNumber('');
    setOrderNotes('');
    setCreateError('');
    setProductSearch('');
    setShowCreateModal(true);
  };

  const handleAddOrderItem = (product, variant) => {
    if ((variant?.stock?.availableStock ?? product.availableStock) <= 0) {
      alert('Selected item is currently Out of Stock!');
      return;
    }

    const targetVariant = variant || product.variants?.[0];
    const targetVariantId = targetVariant?._id;

    const existingIdx = orderItems.findIndex((i) => String(i.variantId) === String(targetVariantId));
    if (existingIdx > -1) {
      const copy = [...orderItems];
      const max = copy[existingIdx].maxAvailable;
      if (copy[existingIdx].quantity < max) {
        copy[existingIdx].quantity += 1;
        setOrderItems(copy);
      } else {
        alert(`Cannot add more than available stock (${max} units)!`);
      }
    } else {
      setOrderItems([
        ...orderItems,
        {
          variantId: targetVariantId,
          productId: product._id,
          sku: targetVariant?.sku || product.sku,
          title: `${product.name} ${targetVariant?.color && targetVariant.color !== 'Default' ? `(${targetVariant.color}/${targetVariant.size})` : ''}`,
          quantity: 1,
          unitPrice: targetVariant?.price || product.sellingPrice,
          costPrice: targetVariant?.costPrice || product.costPrice || 0,
          maxAvailable: targetVariant?.stock?.availableStock ?? product.availableStock
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

    setCreateLoading(true);
    try {
      await api.post('/orders', {
        orderNumber: customOrderNumber ? customOrderNumber.trim() : undefined,
        source: orderSource,
        customerData: {
          name: customerData.name,
          phone: customerData.phone,
          email: customerData.email,
          address: customerData.address,
          city: customerData.city,
          state: customerData.state,
          postalCode: customerData.postalCode
        },
        shippingAddress: {
          street: customerData.address,
          city: customerData.city,
          state: customerData.state,
          postalCode: customerData.postalCode
        },
        items: orderItems,
        discount: Number(orderDiscount) || 0,
        shippingFee: Number(orderShipping) || 0,
        paymentMethod: orderPaymentMethod,
        paymentStatus: orderPaymentStatus,
        shippingCarrier: orderShippingCarrier,
        trackingNumber: orderTrackingNumber,
        notes: orderNotes
      });

      setShowCreateModal(false);
      fetchOrders();
    } catch (err) {
      setCreateError(err.response?.data?.message || err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  // Open Edit Modal with order data
  const handleOpenEdit = (order) => {
    setSelectedOrder(order);
    setEditFormData({
      customerName: order.customerSnapshot?.name || '',
      customerPhone: order.customerSnapshot?.phone || '',
      customerEmail: order.customerSnapshot?.email || '',
      street: order.shippingAddress?.street || order.customerSnapshot?.address || '',
      city: order.shippingAddress?.city || '',
      state: order.shippingAddress?.state || '',
      postalCode: order.shippingAddress?.postalCode || '',
      shippingCarrier: order.shippingCarrier || '',
      trackingNumber: order.trackingNumber || '',
      paymentMethod: order.paymentMethod || 'COD',
      paymentStatus: order.paymentStatus || 'PENDING',
      orderStatus: order.orderStatus || 'PENDING',
      notes: order.notes || '',
      cancellationReason: order.cancellationReason || ''
    });
    setEditError('');
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setEditLoading(true);
    setEditError('');
    try {
      const res = await api.put(`/orders/${selectedOrder._id}`, {
        customerData: {
          name: editFormData.customerName,
          phone: editFormData.customerPhone,
          email: editFormData.customerEmail,
          address: editFormData.street
        },
        shippingAddress: {
          street: editFormData.street,
          city: editFormData.city,
          state: editFormData.state,
          postalCode: editFormData.postalCode
        },
        shippingCarrier: editFormData.shippingCarrier,
        trackingNumber: editFormData.trackingNumber,
        paymentMethod: editFormData.paymentMethod,
        paymentStatus: editFormData.paymentStatus,
        orderStatus: editFormData.orderStatus,
        cancellationReason: editFormData.orderStatus === 'CANCELLED' ? editFormData.cancellationReason : '',
        notes: editFormData.notes
      });
      if (res.data.success) {
        setShowEditModal(false);
        fetchOrders();
      }
    } catch (err) {
      setEditError(err.response?.data?.message || err.message);
    } finally {
      setEditLoading(false);
    }
  };

  // Open Delete Modal
  const handleOpenDelete = (order) => {
    setSelectedOrder(order);
    setDeleteRestoreStock(true);
    setShowDeleteModal(true);
  };

  const handleDeleteOrder = async () => {
    if (!selectedOrder) return;
    setDeleteLoading(true);
    try {
      const res = await api.delete(`/orders/${selectedOrder._id}?restoreStock=${deleteRestoreStock}`);
      if (res.data.success) {
        setShowDeleteModal(false);
        fetchOrders();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Open Details Modal
  const handleOpenDetails = (order) => {
    setSelectedOrder(order);
    setCopiedTracking(false);
    setShowDetailsModal(true);
  };

  const handleCopyTracking = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  const handlePrintInvoice = (orderToPrint) => {
    const order = orderToPrint || selectedOrder;
    if (!order) return;

    const printWindow = window.open('', '_blank', 'width=850,height=1000');
    if (!printWindow) {
      alert('Pop-up was blocked. Please allow pop-ups for this site to print invoices.');
      return;
    }

    const itemsRows = (order.items || [])
      .map(
        (item, idx) => `
        <tr>
          <td style="text-align: center; color: #64748b; font-size: 11px;">${idx + 1}</td>
          <td>
            <div style="font-weight: 700; color: #0f172a; font-size: 13px;">${item.title || 'Product'}</div>
            <div style="font-family: monospace; font-size: 11px; color: #64748b;">SKU: ${item.sku || 'N/A'}</div>
          </td>
          <td style="text-align: center; font-weight: 700;">${item.quantity || 1}</td>
          <td style="text-align: right; font-weight: 500;">₹${Number(item.unitPrice || 0).toLocaleString()}</td>
          <td style="text-align: right; font-weight: 800; color: #0f172a;">₹${Number(item.subtotal || (item.unitPrice || 0) * (item.quantity || 1)).toLocaleString()}</td>
        </tr>
      `
      )
      .join('');

    const formattedDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const compName = companyProfile.companyName || 'NEXUS ERP';
    const compTagline = companyProfile.companyTagline || 'Multi-Channel Enterprise Order & Inventory Management';
    const compGstin = companyProfile.companyGstin || '19AAACN0123M1Z8';
    const compEmail = companyProfile.companyEmail || 'billing@nexuserp.com';
    const compPhone = companyProfile.companyPhone || '+91 98765 43210';
    const compAddress = companyProfile.companyAddress || 'Plot No. 42, Sector V, Salt Lake, Kolkata, West Bengal - 700091';
    const compTerms = companyProfile.invoiceTerms || 'Computer-generated tax invoice. No physical signature required.';

    const subtotal = Number(order.subtotal || 0);
    const discount = Number(order.discount || 0);
    const shipping = Number(order.shippingFee || 0);
    const tax = Number(order.tax || 0);
    const total = Number(order.total || 0);
    const invoiceNumber = order.invoiceNumber || order.orderNumber;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice #${invoiceNumber} - ${compName}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }
            body {
              color: #1e293b;
              background: #ffffff;
              padding: 24px;
              font-size: 12.5px;
              line-height: 1.5;
            }
            .inv-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 18px;
              margin-bottom: 20px;
            }
            .brand-name {
              font-size: 22px;
              font-weight: 900;
              color: #0f172a;
              letter-spacing: -0.5px;
            }
            .brand-sub {
              font-size: 11px;
              color: #64748b;
              margin-top: 2px;
            }
            .brand-gst {
              font-size: 11px;
              color: #475569;
              margin-top: 4px;
              font-weight: 600;
            }
            .inv-meta-right {
              text-align: right;
            }
            .tax-badge {
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              color: #4f46e5;
              letter-spacing: 0.8px;
              background: #eef2ff;
              padding: 3px 8px;
              border-radius: 4px;
              display: inline-block;
              margin-bottom: 6px;
            }
            .inv-num {
              font-size: 15px;
              font-weight: 800;
              font-family: monospace;
              color: #0f172a;
            }
            .inv-date {
              font-size: 11px;
              color: #64748b;
              margin-top: 3px;
            }
            .grid-2 {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 24px;
            }
            .card {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 14px;
            }
            .card-title {
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              color: #64748b;
              margin-bottom: 8px;
              letter-spacing: 0.5px;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 4px;
            }
            .customer-name {
              font-size: 14px;
              font-weight: 800;
              color: #0f172a;
              margin-bottom: 4px;
            }
            .card-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
              font-size: 12px;
            }
            .label { color: #64748b; }
            .val { font-weight: 600; color: #0f172a; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th {
              background: #f1f5f9;
              color: #475569;
              font-weight: 700;
              font-size: 10.5px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              padding: 9px 12px;
              border-top: 1px solid #cbd5e1;
              border-bottom: 2px solid #cbd5e1;
            }
            td {
              padding: 10px 12px;
              border-bottom: 1px solid #e2e8f0;
              font-size: 12px;
            }
            .totals-container {
              display: flex;
              justify-content: flex-end;
              margin-bottom: 24px;
            }
            .totals-box {
              width: 320px;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              padding: 4px 0;
              font-size: 12px;
              color: #475569;
            }
            .totals-row.grand {
              border-top: 2px solid #0f172a;
              margin-top: 6px;
              padding-top: 8px;
              font-size: 15px;
              font-weight: 900;
              color: #0f172a;
            }
            .grand-amt {
              color: #4f46e5;
              font-size: 16px;
            }
            .notes-card {
              background: #f8fafc;
              border: 1px dashed #cbd5e1;
              border-radius: 6px;
              padding: 10px 14px;
              margin-bottom: 24px;
              font-size: 11px;
            }
            .footer {
              border-top: 1px solid #e2e8f0;
              padding-top: 16px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 10.5px;
              color: #64748b;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="inv-header">
            <div>
              <div class="brand-name">${compName}</div>
              <div class="brand-sub">${compTagline}</div>
              <div class="brand-gst">GSTIN: ${compGstin} | Email: ${compEmail} | Phone: ${compPhone}</div>
              <div style="font-size: 10.5px; color: #64748b; margin-top: 3px;">📍 ${compAddress}</div>
            </div>
            <div class="inv-meta-right">
              <div class="tax-badge">Tax Invoice</div>
              <div class="inv-num">#${invoiceNumber}</div>
              <div class="inv-date">Date: ${formattedDate}</div>
              <div class="inv-date">Order Channel: <strong>${order.source || 'Direct'}</strong></div>
            </div>
          </div>

          <div class="grid-2">
            <div class="card">
              <div class="card-title">Customer & Delivery Details</div>
              <div class="customer-name">${order.customerSnapshot?.name || 'Walk-in Customer'}</div>
              <div class="card-row">
                <span class="label">Contact Phone:</span>
                <span class="val">${order.customerSnapshot?.phone || 'N/A'}</span>
              </div>
              ${order.customerSnapshot?.email ? `
              <div class="card-row">
                <span class="label">Email:</span>
                <span class="val">${order.customerSnapshot.email}</span>
              </div>` : ''}
              <div class="card-row" style="margin-top: 4px;">
                <span class="label">Shipping Address:</span>
                <span class="val" style="text-align: right; max-width: 65%;">
                  ${order.shippingAddress?.street || order.customerSnapshot?.address || 'Standard Delivery'}
                  ${order.shippingAddress?.city ? `, ${order.shippingAddress.city}` : ''}
                  ${order.shippingAddress?.state ? `, ${order.shippingAddress.state}` : ''}
                  ${order.shippingAddress?.postalCode ? ` - ${order.shippingAddress.postalCode}` : ''}
                </span>
              </div>
            </div>

            <div class="card">
              <div class="card-title">Fulfillment & Payment Info</div>
              <div class="card-row">
                <span class="label">Order Ref #:</span>
                <span class="val">#${order.orderNumber}</span>
              </div>
              <div class="card-row">
                <span class="label">Courier Partner:</span>
                <span class="val">${order.shippingCarrier || 'Standard Delivery'}</span>
              </div>
              <div class="card-row">
                <span class="label">Tracking AWB #:</span>
                <span class="val" style="font-family: monospace;">${order.trackingNumber || 'Pending Dispatch'}</span>
              </div>
              <div class="card-row">
                <span class="label">Payment Mode:</span>
                <span class="val">${order.paymentMethod || 'COD'}</span>
              </div>
              <div class="card-row">
                <span class="label">Payment Status:</span>
                <span class="val" style="color: ${order.paymentStatus === 'PAID' ? '#16a34a' : '#ea580c'}; font-weight: 800;">
                  ${order.paymentStatus}
                </span>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">#</th>
                <th style="text-align: left;">Product Item Description</th>
                <th style="width: 60px; text-align: center;">Qty</th>
                <th style="width: 110px; text-align: right;">Unit Price</th>
                <th style="width: 120px; text-align: right;">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div class="totals-container">
            <div class="totals-box">
              <div class="totals-row">
                <span>Subtotal Items:</span>
                <span style="font-weight: 700;">₹${subtotal.toLocaleString()}</span>
              </div>
              ${discount > 0 ? `
              <div class="totals-row" style="color: #16a34a;">
                <span>Discount:</span>
                <span>-₹${discount.toLocaleString()}</span>
              </div>` : ''}
              ${shipping > 0 ? `
              <div class="totals-row">
                <span>Shipping Fee:</span>
                <span>+₹${shipping.toLocaleString()}</span>
              </div>` : ''}
              ${tax > 0 ? `
              <div class="totals-row">
                <span>Estimated GST / Tax:</span>
                <span>₹${tax.toLocaleString()}</span>
              </div>` : ''}
              <div class="totals-row grand">
                <span>Grand Total Amount:</span>
                <span class="grand-amt">₹${total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          ${order.notes ? `
          <div class="notes-card">
            <strong>Order Remarks / Special Instructions:</strong> ${order.notes}
          </div>` : ''}

          <div class="footer">
            <div>
              <strong>${compTerms}</strong>
            </div>
            <div>
              Generated via ${compName} &bull; Page 1 of 1
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    // Trigger print automatically after document rendering
    setTimeout(() => {
      printWindow.print();
    }, 400);
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

  const filteredCatalog = productsList.filter((p) => {
    if (!productSearch) return true;
    const q = productSearch.toLowerCase();
    return p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q);
  });

  const columns = [
    {
      header: 'Order Number',
      render: (row) => (
        <div>
          <button
            onClick={() => handleOpenDetails(row)}
            className="font-bold text-primary-600 dark:text-primary-400 hover:underline font-mono text-xs block text-left"
          >
            #{row.orderNumber}
          </button>
          <span className="text-[10px] text-slate-400 block font-mono">
            {row.invoiceNumber ? `Inv: ${row.invoiceNumber}` : new Date(row.createdAt).toLocaleDateString()}
          </span>
          <span className="text-[10px] text-slate-400 block">
            {new Date(row.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      )
    },
    {
      header: 'Customer',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{row.customerSnapshot?.name}</p>
          <span className="text-[11px] text-slate-400 block">{row.customerSnapshot?.phone}</span>
          {row.shippingAddress?.city && (
            <span className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5">
              <MapPin className="w-2.5 h-2.5" /> {row.shippingAddress.city}
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Source / Channel',
      render: (row) => (
        <div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            {row.source}
          </span>
          {row.shippingCarrier && (
            <span className="text-[10px] text-primary-600 dark:text-primary-400 flex items-center gap-0.5">
              <Truck className="w-2.5 h-2.5" /> {row.shippingCarrier}
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Items Count',
      render: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          {row.items?.reduce((sum, i) => sum + i.quantity, 0) || 0} units
        </span>
      )
    },
    {
      header: 'Total & Payment',
      render: (row) => (
        <div>
          <span className="font-extrabold text-slate-900 dark:text-white text-xs block">₹{Number(row.total || 0).toLocaleString()}</span>
          <div className="flex items-center gap-1 mt-0.5">
            <Badge variant={PAYMENT_STATUS_VARIANTS[row.paymentStatus] || 'neutral'} size="sm">
              {row.paymentStatus}
            </Badge>
            {row.paymentMethod && (
              <span className="text-[10px] text-slate-400">({row.paymentMethod})</span>
            )}
          </div>
        </div>
      )
    },
    {
      header: 'Fulfillment Status',
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
        <div className="flex items-center justify-end gap-1">
          {/* View Details / Invoice */}
          <button
            type="button"
            onClick={() => handleOpenDetails(row)}
            title="View Details & Tax Invoice"
            className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 rounded-lg transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {/* Quick Print Invoice */}
          <button
            type="button"
            onClick={() => handlePrintInvoice(row)}
            title="Print Tax Invoice (PDF)"
            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>

          {/* Edit Order */}
          <button
            type="button"
            onClick={() => handleOpenEdit(row)}
            title="Edit Order Details"
            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          {/* Quick Status Update */}
          <button
            type="button"
            onClick={() => {
              setSelectedOrder(row);
              setNewStatus(row.orderStatus);
              setCancellationReason('');
              setShowStatusModal(true);
            }}
            title="Update Fulfillment Status"
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Return button if DELIVERED */}
          {row.orderStatus === 'DELIVERED' && !row.returnDetails?.isRestocked && (
            <button
              type="button"
              onClick={() => {
                setSelectedOrder(row);
                setReturnCondition('GOOD');
                setInspectionNotes('');
                setShowReturnModal(true);
              }}
              title="Process Return & Restock"
              className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Delete Order */}
          <button
            type="button"
            onClick={() => handleOpenDelete(row)}
            title="Delete Order"
            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary-600" /> Order Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Full order lifecycle: create manual orders, edit details, track shipping, generate tax invoices, and restore stock upon cancellation.
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
        searchPlaceholder="Search order #, customer name, phone, city..."
        pagination={pagination}
        onPageChange={setPage}
        actions={
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none font-medium"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="PROCESSING">PROCESSING</option>
              <option value="PACKED">PACKED</option>
              <option value="SHIPPED">SHIPPED</option>
              <option value="DELIVERED">DELIVERED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="RETURNED">RETURNED</option>
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none font-medium"
            >
              <option value="">All Sources</option>
              <option value="Manual">Manual</option>
              <option value="Flipkart">Flipkart</option>
              <option value="Meesho">Meesho</option>
              <option value="Amazon">Amazon</option>
              <option value="Website">Website</option>
            </select>
          </div>
        }
      />

      {/* 1. CREATE MANUAL ORDER MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Order (Automatic Inventory Deduction)"
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleCreateOrder} className="space-y-4">
          {createError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-lg font-medium flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" /> {createError}
            </div>
          )}

          {/* Row 1: Order ID & Source */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Input
                label="Custom Order ID (Optional)"
                value={customOrderNumber}
                onChange={(e) => setCustomOrderNumber(e.target.value.toUpperCase())}
                placeholder="e.g. ORD-2026-001 (Leave blank to auto-generate)"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">
                💡 Khali chhodne par system unique ID (ORD-XXXXXX-N) automatically create karega.
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

          {/* Row 2: Customer Details */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary-500" /> Customer Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Customer Name *"
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
                placeholder="+91 9876543210"
              />
              <Input
                label="Email"
                type="email"
                value={customerData.email}
                onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                placeholder="customer@example.com"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <Input
                  label="Street Address"
                  value={customerData.address}
                  onChange={(e) => setCustomerData({ ...customerData, address: e.target.value })}
                  placeholder="Flat / Building / Street address"
                />
              </div>
              <Input
                label="City"
                value={customerData.city}
                onChange={(e) => setCustomerData({ ...customerData, city: e.target.value })}
                placeholder="e.g. Kolkata"
              />
              <Input
                label="Pincode / Postal Code"
                value={customerData.postalCode}
                onChange={(e) => setCustomerData({ ...customerData, postalCode: e.target.value })}
                placeholder="e.g. 700001"
              />
            </div>
          </div>

          {/* Row 3: Payment & Shipping Courier */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Select
              label="Payment Method"
              value={orderPaymentMethod}
              onChange={(e) => setOrderPaymentMethod(e.target.value)}
            >
              <option value="COD">Cash on Delivery (COD)</option>
              <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
              <option value="Credit/Debit Card">Credit / Debit Card</option>
              <option value="Net Banking">Net Banking</option>
              <option value="Cash">Cash (Store Walk-in)</option>
              <option value="Marketplace Prepaid">Marketplace Prepaid</option>
            </Select>

            <Select
              label="Payment Status"
              value={orderPaymentStatus}
              onChange={(e) => setOrderPaymentStatus(e.target.value)}
            >
              <option value="PENDING">PENDING</option>
              <option value="PAID">PAID</option>
            </Select>

            <Select
              label="Courier / Shipping Partner"
              value={orderShippingCarrier}
              onChange={(e) => setOrderShippingCarrier(e.target.value)}
            >
              <option value="">Select Courier Partner</option>
              {COURIER_PARTNERS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>

            <Input
              label="Tracking / AWB #"
              value={orderTrackingNumber}
              onChange={(e) => setOrderTrackingNumber(e.target.value.toUpperCase())}
              placeholder="e.g. BLU198273645"
            />
          </div>

          {/* Row 4: Product Catalog Selector */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-primary-500" /> Select Products from Inventory
              </h4>
              <div className="w-48">
                <Input
                  size="sm"
                  placeholder="Search catalog..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="max-h-40 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-700">
              {filteredCatalog.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No products found matching query.</p>
              ) : (
                filteredCatalog.map((p) => (
                  <div key={p._id} className="py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden text-slate-400">
                        {p.images && p.images[0]?.url ? (
                          <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{p.name}</span>
                        <span className="ml-2 font-mono text-[11px] text-slate-400">SKU: {p.sku}</span>
                        <span className={`ml-2 text-[10px] font-bold ${p.availableStock > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                          ({p.availableStock} in stock)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">₹{p.sellingPrice}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={p.availableStock <= 0}
                        onClick={() => handleAddOrderItem(p, p.variants?.[0])}
                      >
                        + Add
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Row 5: Selected Line Items */}
          {orderItems.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-slate-500">Selected Order Items ({orderItems.length})</h4>
              {orderItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{item.title}</span>
                    <span className="ml-2 font-mono text-[10px] text-slate-400">{item.sku}</span>
                    <span className="ml-2 text-[10px] text-slate-400">(Max: {item.maxAvailable})</span>
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
                        className="w-16 p-1 text-center bg-slate-50 dark:bg-slate-800 border rounded font-bold"
                      />
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">₹{item.unitPrice * item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))}
                      className="text-rose-500 hover:text-rose-700 font-bold px-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Row 6: Pricing Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex gap-4">
              <div className="w-28">
                <Input
                  label="Discount (₹)"
                  type="number"
                  min="0"
                  value={orderDiscount}
                  onChange={(e) => setOrderDiscount(e.target.value)}
                />
              </div>
              <div className="w-28">
                <Input
                  label="Shipping (₹)"
                  type="number"
                  min="0"
                  value={orderShipping}
                  onChange={(e) => setOrderShipping(e.target.value)}
                />
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 block">Total Order Payable</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                ₹{Math.max(0, orderItems.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0) - Number(orderDiscount) + Number(orderShipping)).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Row 7: Notes */}
          <Input
            label="Internal Order Notes (Optional)"
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            placeholder="Special delivery instructions, gift notes, or remarks"
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button type="submit" disabled={createLoading}>
              {createLoading ? 'Deducting Stock & Placing...' : 'Place Order & Deduct Stock'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. ORDER DETAILS & TAX INVOICE MODAL */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title={`Order Details #${selectedOrder?.orderNumber}`}
        maxWidth="max-w-3xl"
      >
        {selectedOrder && (
          <div className="space-y-5">
            {/* Action Bar (Top) */}
            <div className="flex items-center justify-between no-print bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANTS[selectedOrder.orderStatus] || 'neutral'}>
                  {selectedOrder.orderStatus}
                </Badge>
                <Badge variant={PAYMENT_STATUS_VARIANTS[selectedOrder.paymentStatus] || 'neutral'}>
                  Payment: {selectedOrder.paymentStatus}
                </Badge>
                <span className="text-xs font-semibold text-slate-500">
                  Channel: {selectedOrder.source}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/settings"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-primary-600 hover:border-primary-400 transition-colors shadow-2xs"
                  title="Configure Company Name, GSTIN & Address in Settings"
                >
                  <SettingsIcon className="w-3.5 h-3.5 text-slate-500" />
                  Edit Business Profile
                </Link>
                <Button size="sm" variant="outline" onClick={() => handlePrintInvoice(selectedOrder)}>
                  <Printer className="w-3.5 h-3.5 mr-1" /> Print Tax Invoice
                </Button>
              </div>
            </div>

            {/* PRINTABLE TAX INVOICE CONTAINER */}
            <div id="printable-invoice-container" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
              {/* Invoice Header */}
              <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-5">
                <div>
                  <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    {companyProfile.companyName || 'NEXUS ERP'}
                  </h1>
                  <p className="text-xs text-slate-500">
                    {companyProfile.companyTagline || 'Enterprise Order Management & Fulfillment'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    GSTIN: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{companyProfile.companyGstin || 'N/A'}</span>
                    {companyProfile.companyEmail ? ` | Email: ${companyProfile.companyEmail}` : ''}
                    {companyProfile.companyPhone ? ` | Phone: ${companyProfile.companyPhone}` : ''}
                  </p>
                  {companyProfile.companyAddress && (
                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5" /> {companyProfile.companyAddress}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 block">TAX INVOICE</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white font-mono block">
                    #{selectedOrder.invoiceNumber || selectedOrder.orderNumber}
                  </span>
                  <span className="text-xs text-slate-400 block mt-1">
                    Date: {new Date(selectedOrder.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Customer & Shipping Information Grid */}
              <div className="grid grid-cols-2 gap-6 text-xs">
                <div className="space-y-1 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400 block">Billed & Shipped To</span>
                  <p className="font-black text-slate-900 dark:text-white text-sm">{selectedOrder.customerSnapshot?.name || 'Walk-in Customer'}</p>
                  <p className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" /> {selectedOrder.customerSnapshot?.phone || 'N/A'}
                  </p>
                  {selectedOrder.customerSnapshot?.email && (
                    <p className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" /> {selectedOrder.customerSnapshot.email}
                    </p>
                  )}
                  <p className="text-slate-600 dark:text-slate-300 flex items-start gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      {selectedOrder.shippingAddress?.street || selectedOrder.customerSnapshot?.address || 'Direct pickup'}
                      {selectedOrder.shippingAddress?.city ? `, ${selectedOrder.shippingAddress.city}` : ''}
                      {selectedOrder.shippingAddress?.state ? `, ${selectedOrder.shippingAddress.state}` : ''}
                      {selectedOrder.shippingAddress?.postalCode ? ` - ${selectedOrder.shippingAddress.postalCode}` : ''}
                    </span>
                  </p>
                </div>

                <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400 block">Shipping & Logistics</span>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Courier Partner:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedOrder.shippingCarrier || 'Not Assigned / Standard'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Tracking AWB #:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1">
                      {selectedOrder.trackingNumber || 'Pending'}
                      {selectedOrder.trackingNumber && (
                        <button
                          type="button"
                          onClick={() => handleCopyTracking(selectedOrder.trackingNumber)}
                          className="no-print p-0.5 text-slate-400 hover:text-primary-600"
                          title="Copy Tracking Number"
                        >
                          {copiedTracking ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payment Mode:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedOrder.paymentMethod || 'Cash / COD'} ({selectedOrder.paymentStatus})
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="pb-2">Item Description</th>
                      <th className="pb-2">SKU</th>
                      <th className="pb-2 text-center">Qty</th>
                      <th className="pb-2 text-right">Unit Price</th>
                      <th className="pb-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedOrder.items?.map((item, idx) => (
                      <tr key={idx} className="py-2.5">
                        <td className="py-2.5 font-bold text-slate-900 dark:text-white">{item.title}</td>
                        <td className="py-2.5 font-mono text-slate-500 text-[11px]">{item.sku}</td>
                        <td className="py-2.5 text-center font-bold">{item.quantity}</td>
                        <td className="py-2.5 text-right font-medium">₹{item.unitPrice}</td>
                        <td className="py-2.5 text-right font-bold text-slate-900 dark:text-white">
                          ₹{(item.subtotal || item.unitPrice * item.quantity).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Price Calculation Breakdown */}
              <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal:</span>
                    <span className="font-semibold">₹{Number(selectedOrder.subtotal || 0).toLocaleString()}</span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Discount:</span>
                      <span>-₹{Number(selectedOrder.discount).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedOrder.shippingFee > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Shipping Fee:</span>
                      <span className="font-semibold">+₹{Number(selectedOrder.shippingFee).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedOrder.tax > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Estimated GST / Tax:</span>
                      <span className="font-semibold">₹{Number(selectedOrder.tax).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-sm font-black text-slate-900 dark:text-white">
                    <span>Grand Total:</span>
                    <span className="text-base text-primary-600 dark:text-primary-400">
                      ₹{Number(selectedOrder.total || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <span className="font-bold text-slate-500 block mb-0.5">Order Notes / Instructions:</span>
                  <p className="text-slate-700 dark:text-slate-300">{selectedOrder.notes}</p>
                </div>
              )}
            </div>

            {/* Modal Bottom Close */}
            <div className="flex justify-end no-print pt-2">
              <Button variant="outline" onClick={() => setShowDetailsModal(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 3. EDIT ORDER MODAL */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit Order #${selectedOrder?.orderNumber}`}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          {editError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-lg font-medium flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" /> {editError}
            </div>
          )}

          {/* Customer Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-primary-500" /> Customer Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Customer Name"
                value={editFormData.customerName}
                onChange={(e) => setEditFormData({ ...editFormData, customerName: e.target.value })}
                required
              />
              <Input
                label="Phone"
                value={editFormData.customerPhone}
                onChange={(e) => setEditFormData({ ...editFormData, customerPhone: e.target.value })}
                required
              />
              <Input
                label="Email"
                type="email"
                value={editFormData.customerEmail}
                onChange={(e) => setEditFormData({ ...editFormData, customerEmail: e.target.value })}
              />
            </div>
          </div>

          {/* Shipping Address */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-primary-500" /> Shipping Address
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <Input
                  label="Street Address"
                  value={editFormData.street}
                  onChange={(e) => setEditFormData({ ...editFormData, street: e.target.value })}
                  placeholder="Street / Landmark"
                />
              </div>
              <Input
                label="City"
                value={editFormData.city}
                onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                placeholder="City"
              />
              <Input
                label="Pincode"
                value={editFormData.postalCode}
                onChange={(e) => setEditFormData({ ...editFormData, postalCode: e.target.value })}
                placeholder="Postal code"
              />
            </div>
          </div>

          {/* Logistics & Tracking */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-primary-500" /> Logistics & Courier Tracking
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Courier Partner"
                value={editFormData.shippingCarrier}
                onChange={(e) => setEditFormData({ ...editFormData, shippingCarrier: e.target.value })}
              >
                <option value="">Select Courier</option>
                {COURIER_PARTNERS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
              <Input
                label="Tracking / AWB Number"
                value={editFormData.trackingNumber}
                onChange={(e) => setEditFormData({ ...editFormData, trackingNumber: e.target.value.toUpperCase() })}
                placeholder="e.g. DELH987654321"
              />
            </div>
          </div>

          {/* Status & Payment */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-primary-500" /> Status & Financials
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                label="Fulfillment Status"
                value={editFormData.orderStatus}
                onChange={(e) => setEditFormData({ ...editFormData, orderStatus: e.target.value })}
              >
                <option value="PENDING">PENDING</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="PROCESSING">PROCESSING</option>
                <option value="PACKED">PACKED</option>
                <option value="SHIPPED">SHIPPED</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="CANCELLED">CANCELLED (Auto Restores Stock)</option>
              </Select>

              <Select
                label="Payment Method"
                value={editFormData.paymentMethod}
                onChange={(e) => setEditFormData({ ...editFormData, paymentMethod: e.target.value })}
              >
                <option value="COD">COD</option>
                <option value="UPI">UPI</option>
                <option value="Credit/Debit Card">Card</option>
                <option value="Net Banking">Net Banking</option>
                <option value="Cash">Cash</option>
                <option value="Marketplace Prepaid">Marketplace Prepaid</option>
              </Select>

              <Select
                label="Payment Status"
                value={editFormData.paymentStatus}
                onChange={(e) => setEditFormData({ ...editFormData, paymentStatus: e.target.value })}
              >
                <option value="PENDING">PENDING</option>
                <option value="PAID">PAID</option>
                <option value="FAILED">FAILED</option>
                <option value="REFUNDED">REFUNDED</option>
              </Select>
            </div>
          </div>

          {editFormData.orderStatus === 'CANCELLED' && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-lg space-y-2">
              <p className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> Stock Will Be Automatically Restored
              </p>
              <Input
                label="Cancellation Reason *"
                required
                value={editFormData.cancellationReason}
                onChange={(e) => setEditFormData({ ...editFormData, cancellationReason: e.target.value })}
                placeholder="Reason for cancelling order"
              />
            </div>
          )}

          <Input
            label="Internal Notes"
            value={editFormData.notes}
            onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
            placeholder="Remarks or internal instructions"
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button type="submit" disabled={editLoading}>
              {editLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. DELETE ORDER CONFIRMATION MODAL */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={`Delete Order #${selectedOrder?.orderNumber}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl space-y-1">
            <p className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" /> Warning: Soft Deleting Order
            </p>
            <p className="text-xs text-rose-700 dark:text-rose-400">
              Are you sure you want to delete order <strong>#{selectedOrder?.orderNumber}</strong>?
              This will remove the order from active lists and the dashboard.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Customer:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{selectedOrder?.customerSnapshot?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Amount:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">₹{selectedOrder?.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Items:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{selectedOrder?.items?.length} items</span>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={deleteRestoreStock}
              onChange={(e) => setDeleteRestoreStock(e.target.checked)}
              className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <span>Restore deducted item stock back to warehouse inventory (Recommended)</span>
          </label>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteOrder} disabled={deleteLoading}>
              {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 5. QUICK STATUS TRANSITION MODAL */}
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

      {/* 6. RETURN INSPECTION MODAL */}
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
