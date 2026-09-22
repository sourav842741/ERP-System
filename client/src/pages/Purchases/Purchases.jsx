import React, { useState, useEffect } from 'react';
import {
  Truck, Plus, CheckCircle2, PackageCheck, AlertCircle, Eye, Users,
  Search, RefreshCw, Edit2, Trash2, Printer, Phone, Mail, Building,
  FileText, ChevronRight, X, DollarSign, Calendar, MapPin, Hash,
  ArrowRight, ShieldAlert, Sparkles, Filter
} from 'lucide-react';
import api from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { DataTable } from '../../components/ui/DataTable';

export const Purchases = () => {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'suppliers'
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');

  // Modals
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);
  const [showEditPOModal, setShowEditPOModal] = useState(false);
  const [showViewPOModal, setShowViewPOModal] = useState(false);
  const [showDeletePOModal, setShowDeletePOModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  const [showCreateSupplierModal, setShowCreateSupplierModal] = useState(false);
  const [showEditSupplierModal, setShowEditSupplierModal] = useState(false);
  const [showDeleteSupplierModal, setShowDeleteSupplierModal] = useState(false);

  // Selected Records
  const [selectedPO, setSelectedPO] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  // PO Form State
  const [poForm, setPoForm] = useState({
    supplierId: '',
    warehouseId: '',
    items: [],
    discount: 0,
    shippingCost: 0,
    notes: '',
    paymentStatus: 'UNPAID',
    paidAmount: 0,
    status: 'ORDERED'
  });
  const [poFormLoading, setPoFormLoading] = useState(false);
  const [poFormError, setPoFormError] = useState('');

  // Item Selector State for PO Form
  const [selectedProductToAdd, setSelectedProductToAdd] = useState('');
  const [itemQuantity, setItemQuantity] = useState(10);
  const [itemUnitCost, setItemUnitCost] = useState('');
  const [itemTaxPercent, setItemTaxPercent] = useState(0);

  // Receive Form State
  const [receiveList, setReceiveList] = useState([]);
  const [receiveLoading, setReceiveLoading] = useState(false);

  // Supplier Form State
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    gstin: '',
    address: '',
    notes: ''
  });
  const [supplierFormLoading, setSupplierFormLoading] = useState(false);
  const [supplierFormError, setSupplierFormError] = useState('');

  // Delete State
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // ================= DATA FETCHING =================
  const fetchPurchaseOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 100 });
      if (statusFilter) params.append('status', statusFilter);
      if (supplierFilter) params.append('supplierId', supplierFilter);
      const res = await api.get(`/purchases?${params.toString()}`);
      if (res.data.success) {
        setPurchaseOrders(res.data.data.purchaseOrders || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/suppliers');
      if (res.data.success) {
        setSuppliers(res.data.data.suppliers || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await api.get('/warehouses');
      if (res.data.success) {
        setWarehouses(res.data.data.warehouses || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products?limit=100');
      if (res.data.success) {
        setProducts(res.data.data.products || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSuppliers();
    fetchWarehouses();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchPurchaseOrders();
    } else {
      fetchSuppliers();
    }
  }, [activeTab, statusFilter, supplierFilter]);

  // ================= KPI CALCULATIONS =================
  const totalSpend = purchaseOrders.reduce((sum, po) => sum + (po.total || 0), 0);
  const activePOCount = purchaseOrders.filter((po) => po.status === 'ORDERED' || po.status === 'PARTIALLY_RECEIVED').length;
  const completedPOCount = purchaseOrders.filter((po) => po.status === 'RECEIVED').length;
  const totalSupplierPayables = suppliers.reduce((sum, s) => sum + (s.pendingAmount || 0), 0);

  // ================= PO FORM HELPERS =================
  const resetPOForm = (initialSupplierId = '') => {
    const defaultWarehouse = warehouses.find((w) => w.isDefault)?._id || warehouses[0]?._id || '';
    setPoForm({
      supplierId: initialSupplierId || suppliers[0]?._id || '',
      warehouseId: defaultWarehouse,
      items: [],
      discount: 0,
      shippingCost: 0,
      notes: '',
      paymentStatus: 'UNPAID',
      paidAmount: 0,
      status: 'ORDERED'
    });
    setSelectedProductToAdd('');
    setItemQuantity(10);
    setItemUnitCost('');
    setItemTaxPercent(0);
    setPoFormError('');
  };

  const handleOpenCreatePO = (supplierId = '') => {
    resetPOForm(supplierId);
    setShowCreatePOModal(true);
  };

  const handleOpenEditPO = (po) => {
    setSelectedPO(po);
    setPoForm({
      supplierId: po.supplier?._id || po.supplier || '',
      warehouseId: po.warehouse?._id || po.warehouse || '',
      items: po.items.map((i) => ({
        variantId: i.variantId,
        productId: i.productId,
        sku: i.sku,
        title: i.title,
        quantity: i.quantity,
        receivedQuantity: i.receivedQuantity || 0,
        unitCost: i.unitCost,
        taxPercent: i.taxPercent || 0,
        subtotal: i.subtotal
      })),
      discount: po.discount || 0,
      shippingCost: po.shippingCost || 0,
      notes: po.notes || '',
      paymentStatus: po.paymentStatus || 'UNPAID',
      paidAmount: po.paidAmount || 0,
      status: po.status || 'ORDERED'
    });
    setPoFormError('');
    setShowEditPOModal(true);
  };

  const handleOpenViewPO = (po) => {
    setSelectedPO(po);
    setShowViewPOModal(true);
  };

  const handleOpenDeletePO = (po) => {
    setSelectedPO(po);
    setDeleteError('');
    setShowDeletePOModal(true);
  };

  const handleOpenReceive = (po) => {
    setSelectedPO(po);
    setReceiveList(
      po.items.map((item) => {
        const remaining = Math.max(0, item.quantity - (item.receivedQuantity || 0));
        return {
          variantId: item.variantId,
          title: item.title,
          sku: item.sku,
          ordered: item.quantity,
          alreadyReceived: item.receivedQuantity || 0,
          receivedQuantity: remaining
        };
      })
    );
    setShowReceiveModal(true);
  };

  // Add Item to PO Form
  const handleAddItemToPO = () => {
    if (!selectedProductToAdd) {
      alert('Please select a product first');
      return;
    }

    const product = products.find((p) => p._id === selectedProductToAdd);
    if (!product) return;

    const variant = product.variants?.[0];
    const cost = itemUnitCost !== '' ? Number(itemUnitCost) : (product.costPrice || 100);
    const qty = Number(itemQuantity) || 1;
    const tax = Number(itemTaxPercent) || 0;
    const lineSubtotal = qty * cost + (qty * cost * tax) / 100;

    const newItem = {
      variantId: variant?._id,
      productId: product._id,
      sku: variant?.sku || product.sku,
      title: product.name,
      quantity: qty,
      receivedQuantity: 0,
      unitCost: cost,
      taxPercent: tax,
      subtotal: lineSubtotal
    };

    setPoForm((prev) => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    // Reset item input
    setSelectedProductToAdd('');
    setItemQuantity(10);
    setItemUnitCost('');
    setItemTaxPercent(0);
  };

  const handleRemovePOItem = (index) => {
    setPoForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index)
    }));
  };

  const handleUpdateItemField = (index, field, value) => {
    setPoForm((prev) => {
      const copy = [...prev.items];
      const target = { ...copy[index], [field]: Number(value) || 0 };
      const lineSubtotal = (target.quantity * target.unitCost) + ((target.quantity * target.unitCost * (target.taxPercent || 0)) / 100);
      target.subtotal = lineSubtotal;
      copy[index] = target;
      return { ...prev, items: copy };
    });
  };

  // Calculate live PO totals
  const currentSubtotal = poForm.items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitCost)), 0);
  const currentTax = poForm.items.reduce((sum, item) => sum + ((Number(item.quantity) * Number(item.unitCost) * Number(item.taxPercent || 0)) / 100), 0);
  const currentTotal = Math.max(0, currentSubtotal + currentTax - Number(poForm.discount || 0) + Number(poForm.shippingCost || 0));

  // Save Create PO
  const handleSaveCreatePO = async (e) => {
    e.preventDefault();
    if (!poForm.items.length) {
      setPoFormError('Please add at least one line item to this purchase order.');
      return;
    }
    if (!poForm.supplierId) {
      setPoFormError('Please select a supplier.');
      return;
    }

    setPoFormLoading(true);
    setPoFormError('');
    try {
      const res = await api.post('/purchases', {
        supplierId: poForm.supplierId,
        warehouseId: poForm.warehouseId || undefined,
        items: poForm.items,
        discount: Number(poForm.discount || 0),
        shippingCost: Number(poForm.shippingCost || 0),
        notes: poForm.notes
      });
      if (res.data.success) {
        setShowCreatePOModal(false);
        fetchPurchaseOrders();
        fetchSuppliers();
      }
    } catch (err) {
      setPoFormError(err.response?.data?.message || err.message);
    } finally {
      setPoFormLoading(false);
    }
  };

  // Save Edit PO
  const handleSaveEditPO = async (e) => {
    e.preventDefault();
    if (!selectedPO) return;
    if (!poForm.items.length) {
      setPoFormError('Please keep at least one line item in the order.');
      return;
    }

    setPoFormLoading(true);
    setPoFormError('');
    try {
      const res = await api.put(`/purchases/${selectedPO._id}`, {
        supplierId: poForm.supplierId,
        warehouseId: poForm.warehouseId,
        items: poForm.items,
        discount: Number(poForm.discount || 0),
        shippingCost: Number(poForm.shippingCost || 0),
        notes: poForm.notes,
        paymentStatus: poForm.paymentStatus,
        paidAmount: Number(poForm.paidAmount || 0),
        status: poForm.status
      });
      if (res.data.success) {
        setShowEditPOModal(false);
        fetchPurchaseOrders();
        fetchSuppliers();
      }
    } catch (err) {
      setPoFormError(err.response?.data?.message || err.message);
    } finally {
      setPoFormLoading(false);
    }
  };

  // Save Delete PO
  const handleConfirmDeletePO = async () => {
    if (!selectedPO) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const res = await api.delete(`/purchases/${selectedPO._id}`);
      if (res.data.success) {
        setShowDeletePOModal(false);
        fetchPurchaseOrders();
        fetchSuppliers();
      }
    } catch (err) {
      setDeleteError(err.response?.data?.message || err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Save Goods Receiving
  const handleConfirmReceive = async (e) => {
    e.preventDefault();
    if (!selectedPO) return;

    const payloadItems = receiveList
      .filter((item) => Number(item.receivedQuantity) > 0)
      .map((item) => ({
        variantId: item.variantId,
        receivedQuantity: Number(item.receivedQuantity)
      }));

    if (!payloadItems.length) {
      alert('Please specify at least 1 unit to receive.');
      return;
    }

    setReceiveLoading(true);
    try {
      const res = await api.post(`/purchases/${selectedPO._id}/receive`, {
        receivedItems: payloadItems
      });
      if (res.data.success) {
        setShowReceiveModal(false);
        fetchPurchaseOrders();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setReceiveLoading(false);
    }
  };

  // ================= SUPPLIER FORM HELPERS =================
  const resetSupplierForm = () => {
    setSupplierForm({
      name: '',
      company: '',
      phone: '',
      email: '',
      gstin: '',
      address: '',
      notes: ''
    });
    setSupplierFormError('');
  };

  const handleOpenCreateSupplier = () => {
    resetSupplierForm();
    setShowCreateSupplierModal(true);
  };

  const handleOpenEditSupplier = (supplier) => {
    setSelectedSupplier(supplier);
    setSupplierForm({
      name: supplier.name || '',
      company: supplier.company || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      gstin: supplier.gstin || '',
      address: supplier.address || '',
      notes: supplier.notes || ''
    });
    setSupplierFormError('');
    setShowEditSupplierModal(true);
  };

  const handleOpenDeleteSupplier = (supplier) => {
    setSelectedSupplier(supplier);
    setDeleteError('');
    setShowDeleteSupplierModal(true);
  };

  // Save Create Supplier
  const handleSaveCreateSupplier = async (e) => {
    e.preventDefault();
    if (!supplierForm.name.trim()) {
      setSupplierFormError('Supplier Contact Name is required.');
      return;
    }

    setSupplierFormLoading(true);
    setSupplierFormError('');
    try {
      const res = await api.post('/suppliers', supplierForm);
      if (res.data.success) {
        setShowCreateSupplierModal(false);
        fetchSuppliers();
      }
    } catch (err) {
      setSupplierFormError(err.response?.data?.message || err.message);
    } finally {
      setSupplierFormLoading(false);
    }
  };

  // Save Edit Supplier
  const handleSaveEditSupplier = async (e) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    if (!supplierForm.name.trim()) {
      setSupplierFormError('Supplier Contact Name is required.');
      return;
    }

    setSupplierFormLoading(true);
    setSupplierFormError('');
    try {
      const res = await api.put(`/suppliers/${selectedSupplier._id}`, supplierForm);
      if (res.data.success) {
        setShowEditSupplierModal(false);
        fetchSuppliers();
      }
    } catch (err) {
      setSupplierFormError(err.response?.data?.message || err.message);
    } finally {
      setSupplierFormLoading(false);
    }
  };

  // Save Delete Supplier
  const handleConfirmDeleteSupplier = async () => {
    if (!selectedSupplier) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const res = await api.delete(`/suppliers/${selectedSupplier._id}`);
      if (res.data.success) {
        setShowDeleteSupplierModal(false);
        fetchSuppliers();
      }
    } catch (err) {
      setDeleteError(err.response?.data?.message || err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Print PO Voucher Slip
  const handlePrintPOVoucher = (po) => {
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) {
      alert('Popups blocked. Please allow popups to print Purchase Order voucher.');
      return;
    }

    const itemsRows = po.items?.map((item, idx) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px;">${idx + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px;">
          <strong>${item.title}</strong><br>
          <span style="font-family: monospace; color: #64748b; font-size: 11px;">SKU: ${item.sku}</span>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: center;">${item.receivedQuantity || 0}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right;">₹${item.unitCost?.toLocaleString()}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right;">${item.taxPercent || 0}%</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right; font-weight: bold;">₹${item.subtotal?.toLocaleString()}</td>
      </tr>
    `).join('') || '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Order #${po.poNumber}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; margin: 30px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: bold; background: #e2e8f0; }
          .grid { display: flex; justify-content: space-between; gap: 30px; margin-bottom: 25px; }
          .box { flex: 1; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          th { background: #f1f5f9; padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #cbd5e1; }
          .totals { margin-left: auto; width: 320px; font-size: 13px; }
          .totals-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; }
          .totals-grand { display: flex; justify-content: space-between; padding: 10px 0; font-size: 16px; font-weight: bold; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; margin-top: 5px; }
          @media print { body { margin: 10mm; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">PURCHASE ORDER VOUCHER</h1>
            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">Official Procurement Requisition & Good Receipt Document</p>
          </div>
          <div style="text-align: right;">
            <h2 style="margin: 0; font-family: monospace; font-size: 18px; color: #0284c7;">#${po.poNumber}</h2>
            <p style="margin: 3px 0 0 0; font-size: 12px; color: #64748b;">Date: ${new Date(po.createdAt).toLocaleDateString()}</p>
            <span class="badge" style="margin-top: 5px;">STATUS: ${po.status}</span>
          </div>
        </div>

        <div class="grid">
          <div class="box">
            <h4 style="margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; color: #64748b;">Vendor / Supplier Details</h4>
            <p style="margin: 0; font-size: 14px; font-weight: bold;">${po.supplier?.name || 'Verified Supplier'}</p>
            <p style="margin: 3px 0; font-size: 12px; color: #475569;">${po.supplier?.company || ''}</p>
            <p style="margin: 3px 0; font-size: 12px; color: #475569;">Phone: ${po.supplier?.phone || 'N/A'}</p>
            <p style="margin: 3px 0; font-size: 12px; font-family: monospace; color: #475569;">GSTIN: ${po.supplier?.gstin || 'Unregistered'}</p>
          </div>
          <div class="box">
            <h4 style="margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; color: #64748b;">Ship-To Destination Warehouse</h4>
            <p style="margin: 0; font-size: 14px; font-weight: bold;">${po.warehouse?.name || 'Central Warehouse'}</p>
            <p style="margin: 3px 0; font-size: 12px; color: #475569;">Code: ${po.warehouse?.code || 'MAIN'}</p>
            <p style="margin: 3px 0; font-size: 12px; color: #475569;">Prepared By: ${po.createdBy?.name || 'Admin User'}</p>
            <p style="margin: 3px 0; font-size: 12px; color: #475569;">Payment Terms: ${po.paymentStatus || 'UNPAID'}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px;">#</th>
              <th>Item & SKU</th>
              <th style="text-align: center;">Qty Ordered</th>
              <th style="text-align: center;">Qty Received</th>
              <th style="text-align: right;">Unit Cost</th>
              <th style="text-align: right;">Tax %</th>
              <th style="text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div style="max-width: 450px;">
            <h4 style="margin: 0 0 5px 0; font-size: 12px; color: #64748b;">Notes / Special Instructions:</h4>
            <p style="margin: 0; font-size: 12px; color: #475569; background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
              ${po.notes || 'Goods must be received strictly in original manufacturer packing with valid dispatch challan.'}
            </p>
          </div>
          <div class="totals">
            <div class="totals-row"><span>Items Subtotal:</span><span>₹${(po.subtotal || 0).toLocaleString()}</span></div>
            <div class="totals-row"><span>Tax Total:</span><span>₹${(po.taxTotal || 0).toLocaleString()}</span></div>
            <div class="totals-row"><span>Discount:</span><span>-₹${(po.discount || 0).toLocaleString()}</span></div>
            <div class="totals-row"><span>Shipping Charges:</span><span>₹${(po.shippingCost || 0).toLocaleString()}</span></div>
            <div class="totals-grand"><span>Total Procurement Cost:</span><span>₹${(po.total || 0).toLocaleString()}</span></div>
            <div class="totals-row" style="color: #10b981; font-weight: bold; margin-top: 4px;"><span>Amount Paid:</span><span>₹${(po.paidAmount || 0).toLocaleString()}</span></div>
            <div class="totals-row" style="color: #f43f5e; font-weight: bold;"><span>Outstanding Payable:</span><span>₹${Math.max(0, (po.total || 0) - (po.paidAmount || 0)).toLocaleString()}</span></div>
          </div>
        </div>

        <div style="margin-top: 60px; display: flex; justify-content: space-between; padding: 0 20px;">
          <div style="text-align: center; width: 200px; border-top: 1px solid #94a3b8; padding-top: 8px; font-size: 12px; color: #64748b;">
            Authorized Procurement Officer
          </div>
          <div style="text-align: center; width: 200px; border-top: 1px solid #94a3b8; padding-top: 8px; font-size: 12px; color: #64748b;">
            Warehouse Receiving In-Charge
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  };

  // ================= FILTERED DATA =================
  const filteredPOs = purchaseOrders.filter((po) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      po.poNumber?.toLowerCase().includes(term) ||
      po.supplier?.name?.toLowerCase().includes(term) ||
      po.supplier?.company?.toLowerCase().includes(term) ||
      po.warehouse?.name?.toLowerCase().includes(term) ||
      po.items?.some((i) => i.title?.toLowerCase().includes(term) || i.sku?.toLowerCase().includes(term))
    );
  });

  const filteredSuppliers = suppliers.filter((s) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.name?.toLowerCase().includes(term) ||
      s.company?.toLowerCase().includes(term) ||
      s.phone?.toLowerCase().includes(term) ||
      s.gstin?.toLowerCase().includes(term) ||
      s.email?.toLowerCase().includes(term)
    );
  });

  // ================= PO TABLE COLUMNS =================
  const poColumns = [
    {
      header: 'PO Identifier',
      render: (row) => (
        <div className="cursor-pointer group" onClick={() => handleOpenViewPO(row)}>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-xs text-primary-600 group-hover:underline">
              #{row.poNumber}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            {new Date(row.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </span>
        </div>
      )
    },
    {
      header: 'Supplier / Vendor',
      render: (row) => (
        <div>
          <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">
            {row.supplier?.name || 'Unassigned'}
          </p>
          <span className="text-[11px] text-slate-400 block">
            {row.supplier?.company || 'Direct Supplier'}
          </span>
        </div>
      )
    },
    {
      header: 'Destination Hub',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {row.warehouse?.name || 'Default Hub'}
          </span>
        </div>
      )
    },
    {
      header: 'Line Items & Progress',
      render: (row) => {
        const totalQty = row.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
        const receivedQty = row.items?.reduce((sum, i) => sum + (i.receivedQuantity || 0), 0) || 0;
        const percent = totalQty > 0 ? Math.round((receivedQty / totalQty) * 100) : 0;

        return (
          <div className="w-40 space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500 font-medium">
                {row.items?.length || 0} item{row.items?.length > 1 ? 's' : ''} ({receivedQty}/{totalQty})
              </span>
              <span className="font-mono text-slate-400">{percent}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  percent === 100 ? 'bg-emerald-500' : percent > 0 ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      }
    },
    {
      header: 'Procurement Cost',
      render: (row) => (
        <div>
          <span className="font-extrabold text-xs text-slate-900 dark:text-white">
            ₹{row.total?.toLocaleString('en-IN') || 0}
          </span>
          <span className={`block text-[10px] font-medium ${
            row.paymentStatus === 'PAID' ? 'text-emerald-500' : 'text-amber-500'
          }`}>
            {row.paymentStatus || 'UNPAID'}
          </span>
        </div>
      )
    },
    {
      header: 'PO Status',
      render: (row) => {
        const statusConfigs = {
          ORDERED: { label: 'Ordered', color: 'border-blue-500/30 text-blue-600 bg-blue-50 dark:bg-blue-950/40' },
          PARTIALLY_RECEIVED: { label: 'Partial', color: 'border-amber-500/30 text-amber-600 bg-amber-50 dark:bg-amber-950/40' },
          RECEIVED: { label: 'Received', color: 'border-emerald-500/30 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' },
          CANCELLED: { label: 'Cancelled', color: 'border-rose-500/30 text-rose-600 bg-rose-50 dark:bg-rose-950/40' }
        };
        const config = statusConfigs[row.status] || { label: row.status, color: 'border-slate-500 text-slate-500' };

        return (
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${config.color}`}>
            {config.label}
          </span>
        );
      }
    },
    {
      header: 'Actions',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {/* View Details */}
          <button
            onClick={() => handleOpenViewPO(row)}
            title="View PO Voucher"
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Receive Goods (if not fully received) */}
          {row.status !== 'RECEIVED' && row.status !== 'CANCELLED' && (
            <button
              onClick={() => handleOpenReceive(row)}
              title="Receive Goods into Inventory"
              className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
            >
              <PackageCheck className="w-4 h-4" />
            </button>
          )}

          {/* Edit PO */}
          {row.status !== 'RECEIVED' && (
            <button
              onClick={() => handleOpenEditPO(row)}
              title="Edit Purchase Order"
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}

          {/* Print PO */}
          <button
            onClick={() => handlePrintPOVoucher(row)}
            title="Print PO Voucher Slip"
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Printer className="w-4 h-4" />
          </button>

          {/* Delete PO */}
          <button
            onClick={() => handleOpenDeletePO(row)}
            title="Delete / Cancel PO"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
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
            <Truck className="w-6 h-6 text-primary-500" />
            Purchase Orders & Procurement
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            End-to-end inbound vendor management with itemized receiving, live warehouse replenishment, and audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => handleOpenCreateSupplier()}
            variant="outline"
            size="sm"
            className="shadow-xs"
          >
            <Users className="w-4 h-4 mr-1.5 text-slate-500" />
            Add Supplier
          </Button>

          <Button
            onClick={() => handleOpenCreatePO()}
            size="sm"
            className="shadow-xs bg-primary-600 hover:bg-primary-700 text-white font-bold"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create Purchase Order
          </Button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">Total Procurement</span>
            <DollarSign className="w-4 h-4 text-primary-500" />
          </div>
          <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
            ₹{totalSpend.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">Across {purchaseOrders.length} purchase orders</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">Pending Arrival</span>
            <Truck className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-1">
            {activePOCount} Orders
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">Awaiting physical receiving</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">Stocked In (Received)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {completedPOCount} Completed
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">Physical inventory reconciled</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">Registered Suppliers</span>
            <Building className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
            {suppliers.length} Vendors
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">Payables: ₹{totalSupplierPayables.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Main Tab Controls & Quick Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        {/* Modern Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'orders'
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            Purchase Orders
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'orders' ? 'bg-primary-200/60 dark:bg-primary-900/60' : 'bg-slate-200 dark:bg-slate-800'
            }`}>
              {purchaseOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'suppliers'
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Registered Suppliers
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'suppliers' ? 'bg-primary-200/60 dark:bg-primary-900/60' : 'bg-slate-200 dark:bg-slate-800'
            }`}>
              {suppliers.length}
            </span>
          </button>
        </div>

        {/* Search & Status Filters */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={activeTab === 'orders' ? 'Search PO#, supplier, product...' : 'Search supplier, GSTIN, phone...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 w-56 sm:w-64 focus:outline-hidden focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {activeTab === 'orders' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-hidden"
            >
              <option value="">All Statuses</option>
              <option value="ORDERED">Ordered</option>
              <option value="PARTIALLY_RECEIVED">Partially Received</option>
              <option value="RECEIVED">Received</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          )}

          <button
            onClick={() => {
              if (activeTab === 'orders') fetchPurchaseOrders();
              else fetchSuppliers();
            }}
            title="Refresh Data"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tab 1: Purchase Orders Table */}
      {activeTab === 'orders' && (
        <DataTable
          columns={poColumns}
          data={filteredPOs}
          loading={loading}
          emptyMessage="No purchase orders match your criteria. Click '+ Create Purchase Order' to issue your first requisition."
        />
      )}

      {/* Tab 2: Registered Suppliers View */}
      {activeTab === 'suppliers' && (
        <div>
          {filteredSuppliers.length === 0 ? (
            <div className="py-12 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <Users className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No registered suppliers found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Click 'Add Supplier' above to onboard your verified vendor.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSuppliers.map((supplier) => (
                <div
                  key={supplier._id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Avatar & Actions */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-900/40 text-primary-600 dark:text-primary-400 font-black text-sm flex items-center justify-center">
                          {supplier.name?.charAt(0)?.toUpperCase() || 'S'}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                            {supplier.name}
                          </h4>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Building className="w-3 h-3" />
                            {supplier.company || 'Individual Vendor'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditSupplier(supplier)}
                          title="Edit Supplier"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenDeleteSupplier(supplier)}
                          title="Delete Supplier"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Contact & GSTIN Badges */}
                    <div className="mt-3.5 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      {supplier.phone && (
                        <div className="flex items-center gap-2 text-[11px]">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <a href={`tel:${supplier.phone}`} className="hover:text-primary-600">
                            {supplier.phone}
                          </a>
                        </div>
                      )}

                      {supplier.email && (
                        <div className="flex items-center gap-2 text-[11px]">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <a href={`mailto:${supplier.email}`} className="hover:text-primary-600 truncate max-w-[200px]">
                            {supplier.email}
                          </a>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-[11px]">
                        <Hash className="w-3 h-3 text-slate-400" />
                        <span className="text-slate-400">GSTIN:</span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                          {supplier.gstin || 'Unregistered'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Stats & Quick PO Action */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Orders</span>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        {supplier.totalPurchases || 0} POs
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Outstanding</span>
                      <span className={`font-bold text-xs ${
                        (supplier.pendingAmount || 0) > 0 ? 'text-rose-500' : 'text-emerald-500'
                      }`}>
                        ₹{(supplier.pendingAmount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenCreatePO(supplier._id)}
                      className="text-[11px] py-1 px-2.5 h-auto"
                    >
                      <Plus className="w-3 h-3 mr-1" /> New PO
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: CREATE PURCHASE ORDER */}
      {/* ============================================================== */}
      <Modal
        isOpen={showCreatePOModal}
        onClose={() => setShowCreatePOModal(false)}
        title="Issue New Purchase Order"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSaveCreatePO} className="space-y-4">
          {poFormError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{poFormError}</span>
            </div>
          )}

          {/* Supplier & Warehouse Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Select Supplier / Vendor *"
              required
              value={poForm.supplierId}
              onChange={(e) => setPoForm({ ...poForm, supplierId: e.target.value })}
            >
              <option value="">-- Choose Registered Vendor --</option>
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.company || 'Private'}) - GST: {s.gstin || 'None'}
                </option>
              ))}
            </Select>

            <Select
              label="Destination Warehouse Hub *"
              required
              value={poForm.warehouseId}
              onChange={(e) => setPoForm({ ...poForm, warehouseId: e.target.value })}
            >
              {warehouses.map((w) => (
                <option key={w._id} value={w._id}>
                  {w.name} ({w.code}) {w.isDefault ? '— [Default Hub]' : ''}
                </option>
              ))}
            </Select>
          </div>

          {/* Item Adder Component */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Add Products to Order
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Product Catalog
                </label>
                <select
                  value={selectedProductToAdd}
                  onChange={(e) => {
                    setSelectedProductToAdd(e.target.value);
                    const prod = products.find((p) => p._id === e.target.value);
                    if (prod) {
                      setItemUnitCost(prod.costPrice || 100);
                    }
                  }}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="">-- Select Product --</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} (SKU: {p.sku}) — Cost: ₹{p.costPrice || 0}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Qty
                </label>
                <input
                  type="number"
                  min="1"
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <Button
                  type="button"
                  onClick={handleAddItemToPO}
                  size="sm"
                  className="w-full bg-slate-800 dark:bg-slate-700 text-white font-bold h-[35px]"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
                </Button>
              </div>
            </div>
          </div>

          {/* Added Line Items List */}
          {poForm.items.length > 0 ? (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Order Items ({poForm.items.length})
              </h4>
              {poForm.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg gap-2 text-xs"
                >
                  <div className="flex-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{item.title}</span>
                    <span className="font-mono text-[11px] text-slate-400 ml-2">SKU: {item.sku}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 text-[11px]">Qty:</span>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItemField(idx, 'quantity', e.target.value)}
                        className="w-16 p-1 text-xs border rounded bg-slate-50 dark:bg-slate-800 font-mono text-center"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 text-[11px]">Cost: ₹</span>
                      <input
                        type="number"
                        min="0"
                        value={item.unitCost}
                        onChange={(e) => handleUpdateItemField(idx, 'unitCost', e.target.value)}
                        className="w-20 p-1 text-xs border rounded bg-slate-50 dark:bg-slate-800 font-mono text-right"
                      />
                    </div>

                    <div className="w-20 text-right font-extrabold text-slate-900 dark:text-white">
                      ₹{item.subtotal?.toLocaleString('en-IN') || 0}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemovePOItem(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
              No products added to this PO yet. Select from the catalog above.
            </div>
          )}

          {/* Pricing Adjustments & Grand Total Summary */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Discount (₹)</label>
              <input
                type="number"
                min="0"
                value={poForm.discount}
                onChange={(e) => setPoForm({ ...poForm, discount: e.target.value })}
                className="w-full text-xs p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Shipping Charges (₹)</label>
              <input
                type="number"
                min="0"
                value={poForm.shippingCost}
                onChange={(e) => setPoForm({ ...poForm, shippingCost: e.target.value })}
                className="w-full text-xs p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
              />
            </div>

            <div className="text-right flex flex-col justify-end">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Purchase Cost</span>
              <span className="text-lg font-black text-primary-600 dark:text-primary-400">
                ₹{currentTotal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <Input
            label="Internal Notes / Shipping Instructions"
            value={poForm.notes}
            onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })}
            placeholder="e.g. Delivery expected via BlueDart before 28th."
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreatePOModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={poFormLoading}
              className="bg-primary-600 hover:bg-primary-700 text-white font-bold"
            >
              {poFormLoading ? 'Issuing PO...' : 'Issue Purchase Order'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 2: EDIT PURCHASE ORDER */}
      {/* ============================================================== */}
      <Modal
        isOpen={showEditPOModal}
        onClose={() => setShowEditPOModal(false)}
        title={`Edit Purchase Order #${selectedPO?.poNumber}`}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSaveEditPO} className="space-y-4">
          {poFormError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{poFormError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Supplier / Vendor"
              value={poForm.supplierId}
              onChange={(e) => setPoForm({ ...poForm, supplierId: e.target.value })}
            >
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>{s.name} ({s.company || 'Private'})</option>
              ))}
            </Select>

            <Select
              label="Destination Warehouse"
              value={poForm.warehouseId}
              onChange={(e) => setPoForm({ ...poForm, warehouseId: e.target.value })}
            >
              {warehouses.map((w) => (
                <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
              ))}
            </Select>

            <Select
              label="Payment Status"
              value={poForm.paymentStatus}
              onChange={(e) => setPoForm({ ...poForm, paymentStatus: e.target.value })}
            >
              <option value="UNPAID">UNPAID</option>
              <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
              <option value="PAID">PAID</option>
            </Select>
          </div>

          {/* Editable Items */}
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Line Items ({poForm.items.length})
            </h4>
            {poForm.items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
              >
                <div className="flex-1">
                  <span className="font-bold">{item.title}</span>
                  <span className="font-mono text-[11px] text-slate-400 ml-2">SKU: {item.sku}</span>
                  {item.receivedQuantity > 0 && (
                    <span className="text-[10px] text-emerald-500 ml-2 font-semibold">
                      ({item.receivedQuantity} received)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 text-[11px]">Qty:</span>
                    <input
                      type="number"
                      min={item.receivedQuantity || 1}
                      value={item.quantity}
                      disabled={selectedPO?.status === 'RECEIVED'}
                      onChange={(e) => handleUpdateItemField(idx, 'quantity', e.target.value)}
                      className="w-16 p-1 text-xs border rounded bg-slate-50 dark:bg-slate-800 font-mono text-center disabled:opacity-50"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 text-[11px]">Cost: ₹</span>
                    <input
                      type="number"
                      min="0"
                      value={item.unitCost}
                      disabled={selectedPO?.status === 'RECEIVED'}
                      onChange={(e) => handleUpdateItemField(idx, 'unitCost', e.target.value)}
                      className="w-20 p-1 text-xs border rounded bg-slate-50 dark:bg-slate-800 font-mono text-right disabled:opacity-50"
                    />
                  </div>

                  <div className="w-20 text-right font-extrabold">
                    ₹{item.subtotal?.toLocaleString('en-IN') || 0}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Amount Paid So Far (₹)</label>
              <input
                type="number"
                min="0"
                value={poForm.paidAmount}
                onChange={(e) => setPoForm({ ...poForm, paidAmount: e.target.value })}
                className="w-full text-xs p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
              />
            </div>
            <div className="text-right flex flex-col justify-end">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Purchase Cost</span>
              <span className="text-lg font-black text-primary-600 dark:text-primary-400">
                ₹{currentTotal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <Input
            label="Internal Notes"
            value={poForm.notes}
            onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setShowEditPOModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={poFormLoading}>
              {poFormLoading ? 'Updating PO...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 3: VIEW PO VOUCHER DETAILS */}
      {/* ============================================================== */}
      <Modal
        isOpen={showViewPOModal}
        onClose={() => setShowViewPOModal(false)}
        title={`Purchase Order #${selectedPO?.poNumber}`}
        maxWidth="max-w-3xl"
      >
        {selectedPO && (
          <div className="space-y-4 text-xs">
            {/* Metadata Bar */}
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Issued Date</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {new Date(selectedPO.createdAt).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                <span className="font-bold text-primary-600">
                  {selectedPO.status}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Payment Status</span>
                <span className="font-bold text-emerald-600">
                  {selectedPO.paymentStatus || 'UNPAID'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Destination</span>
                <span className="font-semibold">
                  {selectedPO.warehouse?.name || 'Default Hub'}
                </span>
              </div>
            </div>

            {/* Vendor Card */}
            <div className="p-3 bg-white dark:bg-slate-900 border rounded-xl">
              <h5 className="font-bold uppercase text-[10px] text-slate-400 mb-1">Vendor Details</h5>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white">{selectedPO.supplier?.name}</p>
                  <p className="text-slate-500">{selectedPO.supplier?.company}</p>
                </div>
                <div className="text-right text-slate-500">
                  <p>Phone: {selectedPO.supplier?.phone || 'N/A'}</p>
                  <p className="font-mono">GSTIN: {selectedPO.supplier?.gstin || 'None'}</p>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] font-bold text-slate-500 uppercase border-b">
                  <tr>
                    <th className="p-2.5">Item & SKU</th>
                    <th className="p-2.5 text-center">Ordered</th>
                    <th className="p-2.5 text-center">Received</th>
                    <th className="p-2.5 text-right">Unit Cost</th>
                    <th className="p-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedPO.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{item.title}</span>
                        <span className="font-mono text-[10px] text-slate-400 block">{item.sku}</span>
                      </td>
                      <td className="p-2.5 text-center font-mono">{item.quantity}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-emerald-600">
                        {item.receivedQuantity || 0}
                      </td>
                      <td className="p-2.5 text-right font-mono">₹{item.unitCost?.toLocaleString()}</td>
                      <td className="p-2.5 text-right font-mono font-bold">₹{item.subtotal?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="flex justify-between items-start pt-2">
              <div className="max-w-xs text-slate-500 text-[11px]">
                {selectedPO.notes && <p><strong>Notes:</strong> {selectedPO.notes}</p>}
              </div>
              <div className="w-64 space-y-1 text-right">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span>₹{selectedPO.subtotal?.toLocaleString()}</span>
                </div>
                {selectedPO.taxTotal > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Tax:</span>
                    <span>₹{selectedPO.taxTotal?.toLocaleString()}</span>
                  </div>
                )}
                {selectedPO.discount > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Discount:</span>
                    <span>-₹{selectedPO.discount?.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-sm border-t pt-1 text-slate-900 dark:text-white">
                  <span>Total Cost:</span>
                  <span>₹{selectedPO.total?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePrintPOVoucher(selectedPO)}
              >
                <Printer className="w-3.5 h-3.5 mr-1" /> Print Voucher
              </Button>

              <div className="flex gap-2">
                {selectedPO.status !== 'RECEIVED' && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    onClick={() => {
                      setShowViewPOModal(false);
                      handleOpenReceive(selectedPO);
                    }}
                  >
                    <PackageCheck className="w-3.5 h-3.5 mr-1" /> Receive Goods
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setShowViewPOModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 4: GOODS RECEIVING WITH REAL WAREHOUSE RESTOCK */}
      {/* ============================================================== */}
      <Modal
        isOpen={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
        title={`Receive Goods for PO #${selectedPO?.poNumber}`}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleConfirmReceive} className="space-y-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
            <p className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Automated Central Warehouse Restocking
            </p>
            <p className="mt-1 leading-relaxed">
              Confirming receipt will automatically increase live stock in <strong>{selectedPO?.warehouse?.name || 'warehouse'}</strong> and generate immutable ledger entries.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Items to Receive
            </h4>
            {receiveList.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 border rounded-lg text-xs"
              >
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{item.title}</p>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Ordered: {item.ordered} | Already Received: {item.alreadyReceived}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Receive Qty:</span>
                  <input
                    type="number"
                    min="0"
                    max={item.ordered - item.alreadyReceived}
                    value={item.receivedQuantity}
                    onChange={(e) => {
                      const copy = [...receiveList];
                      copy[idx].receivedQuantity = Number(e.target.value);
                      setReceiveList(copy);
                    }}
                    className="w-20 p-1 text-xs font-mono font-bold text-center border rounded-lg bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setShowReceiveModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={receiveLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {receiveLoading ? 'Restocking Inventory...' : 'Confirm & Restock Warehouse'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 5: DELETE PURCHASE ORDER CONFIRMATION */}
      {/* ============================================================== */}
      <Modal
        isOpen={showDeletePOModal}
        onClose={() => setShowDeletePOModal(false)}
        title="Cancel & Delete Purchase Order"
      >
        <div className="space-y-4">
          {deleteError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-600">
              {deleteError}
            </div>
          )}

          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300">
            <p className="font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              Permanent Reversal Notice
            </p>
            <p className="mt-1">
              Are you sure you want to delete <strong>PO #{selectedPO?.poNumber}</strong>?
            </p>
            {selectedPO?.items?.some((i) => (i.receivedQuantity || 0) > 0) && (
              <p className="mt-1.5 font-semibold text-rose-800 dark:text-rose-200">
                ⚠️ Notice: This order already received goods. Deleting it will automatically reverse and deduct those received items from warehouse physical stock.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDeletePOModal(false)}>
              Keep Order
            </Button>
            <Button
              variant="danger"
              disabled={deleteLoading}
              onClick={handleConfirmDeletePO}
            >
              {deleteLoading ? 'Deleting...' : 'Confirm Delete PO'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 6: CREATE SUPPLIER */}
      {/* ============================================================== */}
      <Modal
        isOpen={showCreateSupplierModal}
        onClose={() => setShowCreateSupplierModal(false)}
        title="Register New Vendor / Supplier"
      >
        <form onSubmit={handleSaveCreateSupplier} className="space-y-4">
          {supplierFormError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-600">
              {supplierFormError}
            </div>
          )}

          <Input
            label="Contact Person / Supplier Name *"
            required
            value={supplierForm.name}
            onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
            placeholder="e.g. Ramesh Sharma"
          />

          <Input
            label="Company / Enterprise Legal Name"
            value={supplierForm.company}
            onChange={(e) => setSupplierForm({ ...supplierForm, company: e.target.value })}
            placeholder="e.g. Ramesh Textile Mills Pvt Ltd"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              value={supplierForm.phone}
              onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
              placeholder="+91 98765 43210"
            />
            <Input
              label="Email Address"
              type="email"
              value={supplierForm.email}
              onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
              placeholder="vendor@textile.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="GSTIN / Tax ID"
              value={supplierForm.gstin}
              onChange={(e) => setSupplierForm({ ...supplierForm, gstin: e.target.value.toUpperCase() })}
              placeholder="07AAAAA0000A1Z5"
            />
            <Input
              label="City / State"
              value={supplierForm.address}
              onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
              placeholder="Surat, Gujarat"
            />
          </div>

          <Input
            label="Payment Terms / Notes"
            value={supplierForm.notes}
            onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
            placeholder="e.g. Net 30 days payment terms"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setShowCreateSupplierModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={supplierFormLoading} className="font-bold">
              {supplierFormLoading ? 'Registering...' : 'Register Supplier'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 7: EDIT SUPPLIER */}
      {/* ============================================================== */}
      <Modal
        isOpen={showEditSupplierModal}
        onClose={() => setShowEditSupplierModal(false)}
        title={`Edit Supplier: ${selectedSupplier?.name}`}
      >
        <form onSubmit={handleSaveEditSupplier} className="space-y-4">
          {supplierFormError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-600">
              {supplierFormError}
            </div>
          )}

          <Input
            label="Contact Person / Supplier Name *"
            required
            value={supplierForm.name}
            onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
          />

          <Input
            label="Company Name"
            value={supplierForm.company}
            onChange={(e) => setSupplierForm({ ...supplierForm, company: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              value={supplierForm.phone}
              onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
            />
            <Input
              label="Email Address"
              type="email"
              value={supplierForm.email}
              onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="GSTIN / Tax ID"
              value={supplierForm.gstin}
              onChange={(e) => setSupplierForm({ ...supplierForm, gstin: e.target.value.toUpperCase() })}
            />
            <Input
              label="City / State"
              value={supplierForm.address}
              onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
            />
          </div>

          <Input
            label="Payment Terms / Notes"
            value={supplierForm.notes}
            onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setShowEditSupplierModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={supplierFormLoading} className="font-bold">
              {supplierFormLoading ? 'Updating...' : 'Save Supplier'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 8: DELETE SUPPLIER CONFIRMATION */}
      {/* ============================================================== */}
      <Modal
        isOpen={showDeleteSupplierModal}
        onClose={() => setShowDeleteSupplierModal(false)}
        title="Delete Supplier"
      >
        <div className="space-y-4">
          {deleteError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-600">
              {deleteError}
            </div>
          )}

          <p className="text-xs text-slate-600 dark:text-slate-300">
            Are you sure you want to remove <strong>{selectedSupplier?.name} ({selectedSupplier?.company || 'Vendor'})</strong>?
          </p>

          <p className="text-[11px] text-slate-400">
            Note: You cannot delete a supplier if there are active purchase orders awaiting goods receipt.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDeleteSupplierModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={deleteLoading}
              onClick={handleConfirmDeleteSupplier}
            >
              {deleteLoading ? 'Deleting...' : 'Confirm Delete Supplier'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
