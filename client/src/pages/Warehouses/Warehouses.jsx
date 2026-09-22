import React, { useState, useEffect } from 'react';
import {
  Building2, Plus, ArrowRightLeft, MapPin, CheckCircle2, Boxes,
  Search, RefreshCw, Edit2, Trash2, Eye, Printer, AlertCircle,
  Package, ShieldAlert, Star, ExternalLink, X, ArrowRight,
  TrendingUp, Check, Layers
} from 'lucide-react';
import api from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { DataTable } from '../../components/ui/DataTable';

export const Warehouses = () => {
  const [activeTab, setActiveTab] = useState('warehouses'); // 'warehouses' | 'transfers'
  const [warehouses, setWarehouses] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showTransferDetailsModal, setShowTransferDetailsModal] = useState(false);

  // Selected State
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [selectedTransfer, setSelectedTransfer] = useState(null);

  // Facility Form State
  const [whForm, setWhForm] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    isDefault: false
  });
  const [whFormLoading, setWhFormLoading] = useState(false);
  const [whFormError, setWhFormError] = useState('');

  // Transfer Form State
  const [sourceWh, setSourceWh] = useState('');
  const [destWh, setDestWh] = useState('');
  const [transferItems, setTransferItems] = useState([]);
  const [transferNotes, setTransferNotes] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState('');

  // Hub Inventory Drawer State
  const [hubInventory, setHubInventory] = useState([]);
  const [hubInvLoading, setHubInvLoading] = useState(false);
  const [hubInvSearch, setHubInvSearch] = useState('');

  // Delete State
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // ================= DATA FETCHING =================
  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/warehouses');
      if (res.data.success) {
        setWarehouses(res.data.data.warehouses || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransfers = async () => {
    try {
      const res = await api.get('/warehouses/transfers/list');
      if (res.data.success) {
        setTransfers(res.data.data.transfers || []);
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
    } catch (err) {}
  };

  useEffect(() => {
    fetchWarehouses();
    fetchTransfers();
    fetchProducts();
  }, []);

  // Fetch Hub Specific Stock
  const fetchHubStock = async (warehouseId) => {
    setHubInvLoading(true);
    try {
      const res = await api.get(`/inventory/overview?warehouseId=${warehouseId}&limit=100`);
      if (res.data.success) {
        setHubInventory(res.data.data.items || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHubInvLoading(false);
    }
  };

  // ================= KPI CALCULATIONS =================
  const totalPhysicalStock = warehouses.reduce((sum, w) => sum + (w.stats?.totalStock || 0), 0);
  const totalAvailableStock = warehouses.reduce((sum, w) => sum + (w.stats?.availableStock || 0), 0);
  const primaryWarehouse = warehouses.find((w) => w.isDefault);

  // ================= MODAL HANDLERS =================
  const handleOpenAdd = () => {
    setWhForm({
      name: '',
      code: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      isDefault: warehouses.length === 0
    });
    setWhFormError('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (w) => {
    setSelectedWarehouse(w);
    setWhForm({
      name: w.name || '',
      code: w.code || '',
      address: w.address || '',
      city: w.city || '',
      state: w.state || '',
      postalCode: w.postalCode || '',
      isDefault: Boolean(w.isDefault)
    });
    setWhFormError('');
    setShowEditModal(true);
  };

  const handleOpenDelete = (w) => {
    setSelectedWarehouse(w);
    setDeleteError('');
    setShowDeleteModal(true);
  };

  const handleOpenInventory = (w) => {
    setSelectedWarehouse(w);
    setHubInvSearch('');
    fetchHubStock(w._id);
    setShowInventoryModal(true);
  };

  const handleOpenTransfer = (originId = '') => {
    const defaultOrigin = originId || warehouses[0]?._id || '';
    const defaultDest = warehouses.find((w) => w._id !== defaultOrigin)?._id || '';
    setSourceWh(defaultOrigin);
    setDestWh(defaultDest);
    setTransferItems([]);
    setTransferNotes('');
    setTransferError('');
    setShowTransferModal(true);
  };

  const handleOpenTransferDetails = (transfer) => {
    setSelectedTransfer(transfer);
    setShowTransferDetailsModal(true);
  };

  // ================= CRUD ACTIONS =================
  // Create Warehouse
  const handleCreateWarehouse = async (e) => {
    e.preventDefault();
    if (!whForm.name.trim() || !whForm.code.trim()) {
      setWhFormError('Warehouse name and facility code are required');
      return;
    }

    setWhFormLoading(true);
    setWhFormError('');
    try {
      const res = await api.post('/warehouses', {
        ...whForm,
        code: whForm.code.toUpperCase()
      });
      if (res.data.success) {
        setShowAddModal(false);
        fetchWarehouses();
      }
    } catch (err) {
      setWhFormError(err.response?.data?.message || err.message);
    } finally {
      setWhFormLoading(false);
    }
  };

  // Update Warehouse
  const handleUpdateWarehouse = async (e) => {
    e.preventDefault();
    if (!selectedWarehouse) return;
    if (!whForm.name.trim() || !whForm.code.trim()) {
      setWhFormError('Warehouse name and facility code are required');
      return;
    }

    setWhFormLoading(true);
    setWhFormError('');
    try {
      const res = await api.put(`/warehouses/${selectedWarehouse._id}`, {
        ...whForm,
        code: whForm.code.toUpperCase()
      });
      if (res.data.success) {
        setShowEditModal(false);
        fetchWarehouses();
      }
    } catch (err) {
      setWhFormError(err.response?.data?.message || err.message);
    } finally {
      setWhFormLoading(false);
    }
  };

  // Delete Warehouse
  const handleDeleteWarehouse = async () => {
    if (!selectedWarehouse) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const res = await api.delete(`/warehouses/${selectedWarehouse._id}`);
      if (res.data.success) {
        setShowDeleteModal(false);
        fetchWarehouses();
      }
    } catch (err) {
      setDeleteError(err.response?.data?.message || err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Execute Stock Transfer
  const handleTransferStock = async (e) => {
    e.preventDefault();
    if (!transferItems.length) {
      setTransferError('Please select at least one item to transfer.');
      return;
    }
    if (sourceWh === destWh) {
      setTransferError('Source and destination warehouses cannot be the same facility.');
      return;
    }

    setTransferLoading(true);
    setTransferError('');
    try {
      const res = await api.post('/warehouses/transfer', {
        sourceWarehouseId: sourceWh,
        destinationWarehouseId: destWh,
        items: transferItems,
        notes: transferNotes
      });
      if (res.data.success) {
        setShowTransferModal(false);
        setTransferItems([]);
        fetchWarehouses();
        fetchTransfers();
      }
    } catch (err) {
      setTransferError(err.response?.data?.message || err.message);
    } finally {
      setTransferLoading(false);
    }
  };

  // Print Transfer Slip
  const handlePrintTransferSlip = (t) => {
    const printWindow = window.open('', '_blank', 'width=850,height=750');
    if (!printWindow) {
      alert('Popups blocked. Please allow popups to print transfer slip.');
      return;
    }

    const itemsRows = t.items?.map((item, idx) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px;">${idx + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-family: monospace;"><strong>${item.sku}</strong></td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: center; font-weight: bold;">${item.quantity} units</td>
      </tr>
    `).join('') || '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Stock Transfer Slip #${t.transferNumber}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; margin: 30px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
          .grid { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 25px; }
          .box { flex: 1; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          th { background: #f1f5f9; padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
          @media print { body { margin: 10mm; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 800;">INTER-FACILITY STOCK TRANSFER SLIP</h1>
            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">Internal Dispatch & Receiving Challan</p>
          </div>
          <div style="text-align: right;">
            <h2 style="margin: 0; font-family: monospace; font-size: 18px; color: #0284c7;">#${t.transferNumber}</h2>
            <p style="margin: 3px 0 0 0; font-size: 12px; color: #64748b;">Date: ${new Date(t.createdAt).toLocaleString()}</p>
            <span style="display: inline-block; padding: 3px 8px; background: #dcfce7; color: #166534; font-size: 11px; font-weight: bold; border-radius: 9999px;">${t.status}</span>
          </div>
        </div>

        <div class="grid">
          <div class="box">
            <h4 style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; color: #64748b;">Source Facility (Origin)</h4>
            <p style="margin: 0; font-size: 14px; font-weight: bold;">${t.sourceWarehouse?.name}</p>
            <p style="margin: 3px 0; font-size: 12px; font-family: monospace; color: #64748b;">Code: ${t.sourceWarehouse?.code}</p>
          </div>
          <div class="box">
            <h4 style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; color: #64748b;">Destination Facility</h4>
            <p style="margin: 0; font-size: 14px; font-weight: bold;">${t.destinationWarehouse?.name}</p>
            <p style="margin: 3px 0; font-size: 12px; font-family: monospace; color: #64748b;">Code: ${t.destinationWarehouse?.code}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px;">#</th>
              <th>SKU Identifier</th>
              <th style="text-align: center;">Transferred Quantity</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        ${t.notes ? `<p style="font-size: 12px; color: #64748b; background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;"><strong>Notes:</strong> ${t.notes}</p>` : ''}

        <div style="margin-top: 50px; display: flex; justify-content: space-between;">
          <div style="text-align: center; width: 180px; border-top: 1px solid #94a3b8; padding-top: 6px; font-size: 12px; color: #64748b;">
            Dispatched By (Origin)
          </div>
          <div style="text-align: center; width: 180px; border-top: 1px solid #94a3b8; padding-top: 6px; font-size: 12px; color: #64748b;">
            Received By (Destination)
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

  // Filtered warehouses
  const filteredWarehouses = warehouses.filter((w) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      w.name?.toLowerCase().includes(term) ||
      w.code?.toLowerCase().includes(term) ||
      w.city?.toLowerCase().includes(term) ||
      w.state?.toLowerCase().includes(term)
    );
  });

  // Filtered Transfers
  const filteredTransfers = transfers.filter((t) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      t.transferNumber?.toLowerCase().includes(term) ||
      t.sourceWarehouse?.name?.toLowerCase().includes(term) ||
      t.destinationWarehouse?.name?.toLowerCase().includes(term) ||
      t.items?.some((i) => i.sku?.toLowerCase().includes(term))
    );
  });

  // Table columns for Transfers
  const transferColumns = [
    {
      header: 'Transfer Identifier',
      render: (row) => (
        <div className="cursor-pointer group" onClick={() => handleOpenTransferDetails(row)}>
          <span className="font-mono text-xs font-bold text-primary-600 group-hover:underline">
            #{row.transferNumber}
          </span>
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
      header: 'Facility Route',
      render: (row) => (
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {row.sourceWarehouse?.code || 'ORIGIN'}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-primary-500" />
          <span className="px-2 py-0.5 rounded bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 font-bold">
            {row.destinationWarehouse?.code || 'DEST'}
          </span>
        </div>
      )
    },
    {
      header: 'Items Moved',
      render: (row) => (
        <div>
          <span className="font-bold text-xs text-slate-900 dark:text-white">
            {row.items?.reduce((sum, i) => sum + i.quantity, 0) || 0} units
          </span>
          <span className="text-[11px] text-slate-400 block">
            Across {row.items?.length || 0} line item{row.items?.length > 1 ? 's' : ''}
          </span>
        </div>
      )
    },
    {
      header: 'Execution Status',
      render: (row) => (
        <Badge variant="success" size="sm">
          {row.status}
        </Badge>
      )
    },
    {
      header: 'Actions',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleOpenTransferDetails(row)}
            title="View Transfer Slip"
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handlePrintTransferSlip(row)}
            title="Print Transfer Slip"
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Printer className="w-4 h-4" />
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
            <Building2 className="w-6 h-6 text-primary-500" />
            Warehouse Network & Stock Transfers
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Multi-facility inventory tracking, inter-warehouse replenishment, and localized stock ledgers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => handleOpenTransfer()}
            variant="outline"
            size="sm"
            className="shadow-xs"
          >
            <ArrowRightLeft className="w-4 h-4 mr-1.5 text-slate-500" />
            Transfer Stock
          </Button>

          <Button
            onClick={() => handleOpenAdd()}
            size="sm"
            className="shadow-xs bg-primary-600 hover:bg-primary-700 text-white font-bold"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Warehouse
          </Button>
        </div>
      </div>

      {/* Logistics KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">Total Facilities</span>
            <Building2 className="w-4 h-4 text-primary-500" />
          </div>
          <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
            {warehouses.length} Active Hubs
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">Physical distribution nodes</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">Available Stock</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {totalAvailableStock} Units
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">Sellable across all channels</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">Total Physical Units</span>
            <Boxes className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
            {totalPhysicalStock} Units
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">Including reserved & safety stock</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">Primary Fulfillment Hub</span>
            <Star className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-white mt-1 truncate">
            {primaryWarehouse ? primaryWarehouse.name : 'Not Designated'}
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {primaryWarehouse ? `Code: ${primaryWarehouse.code}` : 'Designate in settings'}
          </span>
        </div>
      </div>

      {/* Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        {/* Modern Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('warehouses')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'warehouses'
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Warehouses
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'warehouses' ? 'bg-primary-200/60 dark:bg-primary-900/60' : 'bg-slate-200 dark:bg-slate-800'
            }`}>
              {warehouses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('transfers')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'transfers'
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Transfer Ledger
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'transfers' ? 'bg-primary-200/60 dark:bg-primary-900/60' : 'bg-slate-200 dark:bg-slate-800'
            }`}>
              {transfers.length}
            </span>
          </button>
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={activeTab === 'warehouses' ? 'Search hub name, code, city...' : 'Search transfer#, route, SKU...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 w-56 sm:w-64 focus:outline-hidden focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <button
            onClick={() => {
              fetchWarehouses();
              fetchTransfers();
            }}
            title="Refresh Warehouses"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tab 1: Warehouse Grid */}
      {activeTab === 'warehouses' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWarehouses.map((w) => (
            <div
              key={w._id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4.5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header Pill & Badges */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-extrabold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded border border-slate-200 dark:border-slate-700">
                      {w.code}
                    </span>
                    {w.isDefault && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        Primary Hub
                      </span>
                    )}
                  </div>

                  {/* Actions Dropdown */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(w)}
                      title="Edit Warehouse"
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {!w.isDefault && (
                      <button
                        onClick={() => handleOpenDelete(w)}
                        title="Delete Warehouse"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <h4 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  {w.name}
                </h4>

                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span>
                    {w.address ? `${w.address}, ` : ''}{w.city}{w.state ? `, ${w.state}` : ''}
                    {w.postalCode ? ` - ${w.postalCode}` : ''}
                  </span>
                </p>
              </div>

              {/* Stats Box */}
              <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                      Available Stock
                    </span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-lg">
                      {w.stats?.availableStock || 0}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Unique Items
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-lg">
                      {w.stats?.itemCount || 0}
                    </span>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenInventory(w)}
                    className="flex-1 text-[11px] py-1.5 h-auto"
                  >
                    <Boxes className="w-3.5 h-3.5 mr-1 text-slate-500" />
                    Inspect Inventory
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenTransfer(w._id)}
                    className="text-[11px] py-1.5 h-auto text-primary-600 hover:text-primary-700"
                    title="Initiate Inter-Warehouse Transfer from here"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <DataTable
          columns={transferColumns}
          data={filteredTransfers}
          loading={loading}
          emptyMessage="No inter-warehouse stock transfers recorded yet. Click 'Transfer Stock' above to shift inventory between facilities."
        />
      )}

      {/* ============================================================== */}
      {/* MODAL 1: ADD WAREHOUSE */}
      {/* ============================================================== */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register New Warehouse Hub"
      >
        <form onSubmit={handleCreateWarehouse} className="space-y-4">
          {whFormError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-600">
              {whFormError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Warehouse Name *"
              required
              value={whForm.name}
              onChange={(e) => setWhForm({ ...whForm, name: e.target.value })}
              placeholder="e.g. Mumbai Fulfillment Center"
            />
            <Input
              label="Facility Code *"
              required
              value={whForm.code}
              onChange={(e) => setWhForm({ ...whForm, code: e.target.value.toUpperCase() })}
              placeholder="e.g. BOM-01"
            />
          </div>

          <Input
            label="Street Address"
            value={whForm.address}
            onChange={(e) => setWhForm({ ...whForm, address: e.target.value })}
            placeholder="Plot 104, Bhiwandi Logistics Park"
          />

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="City"
              value={whForm.city}
              onChange={(e) => setWhForm({ ...whForm, city: e.target.value })}
              placeholder="Mumbai"
            />
            <Input
              label="State"
              value={whForm.state}
              onChange={(e) => setWhForm({ ...whForm, state: e.target.value })}
              placeholder="Maharashtra"
            />
            <Input
              label="PIN Code"
              value={whForm.postalCode}
              onChange={(e) => setWhForm({ ...whForm, postalCode: e.target.value })}
              placeholder="421302"
            />
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Designate as Primary Fulfillment Hub
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                New online orders and purchase orders default to this warehouse unless overridden.
              </p>
            </div>
            <input
              type="checkbox"
              checked={whForm.isDefault}
              onChange={(e) => setWhForm({ ...whForm, isDefault: e.target.checked })}
              className="w-4 h-4 text-primary-600 rounded border-slate-300"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={whFormLoading} className="font-bold">
              {whFormLoading ? 'Registering...' : 'Register Warehouse'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 2: EDIT WAREHOUSE */}
      {/* ============================================================== */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit Warehouse: ${selectedWarehouse?.name}`}
      >
        <form onSubmit={handleUpdateWarehouse} className="space-y-4">
          {whFormError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-600">
              {whFormError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Warehouse Name *"
              required
              value={whForm.name}
              onChange={(e) => setWhForm({ ...whForm, name: e.target.value })}
            />
            <Input
              label="Facility Code *"
              required
              value={whForm.code}
              onChange={(e) => setWhForm({ ...whForm, code: e.target.value.toUpperCase() })}
            />
          </div>

          <Input
            label="Street Address"
            value={whForm.address}
            onChange={(e) => setWhForm({ ...whForm, address: e.target.value })}
          />

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="City"
              value={whForm.city}
              onChange={(e) => setWhForm({ ...whForm, city: e.target.value })}
            />
            <Input
              label="State"
              value={whForm.state}
              onChange={(e) => setWhForm({ ...whForm, state: e.target.value })}
            />
            <Input
              label="PIN Code"
              value={whForm.postalCode}
              onChange={(e) => setWhForm({ ...whForm, postalCode: e.target.value })}
            />
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Primary Fulfillment Hub
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Designating this hub as primary will revoke default status from others.
              </p>
            </div>
            <input
              type="checkbox"
              checked={whForm.isDefault}
              onChange={(e) => setWhForm({ ...whForm, isDefault: e.target.checked })}
              className="w-4 h-4 text-primary-600 rounded border-slate-300"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={whFormLoading} className="font-bold">
              {whFormLoading ? 'Updating...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 3: DELETE WAREHOUSE */}
      {/* ============================================================== */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Warehouse Facility"
      >
        <div className="space-y-4">
          {deleteError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-600">
              {deleteError}
            </div>
          )}

          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300">
            <p className="font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              Safety Verification
            </p>
            <p className="mt-1">
              Are you sure you want to delete <strong>{selectedWarehouse?.name} ({selectedWarehouse?.code})</strong>?
            </p>
            <p className="mt-1 text-slate-500">
              Note: You cannot delete a warehouse that holds active physical stock or is designated as the Primary Hub.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={deleteLoading}
              onClick={handleDeleteWarehouse}
            >
              {deleteLoading ? 'Deleting...' : 'Confirm Delete Facility'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 4: INSPECT HUB INVENTORY DRAWER */}
      {/* ============================================================== */}
      <Modal
        isOpen={showInventoryModal}
        onClose={() => setShowInventoryModal(false)}
        title={`Live Inventory — ${selectedWarehouse?.name} (${selectedWarehouse?.code})`}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          {/* Top Search */}
          <div className="flex justify-between items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search SKU or title in this warehouse..."
                value={hubInvSearch}
                onChange={(e) => setHubInvSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 w-full"
              />
            </div>
            <span className="text-xs text-slate-400">
              {hubInventory.length} items catalogued
            </span>
          </div>

          {/* Table */}
          {hubInvLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading facility stock...</div>
          ) : hubInventory.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed">
              No stock stored in this warehouse yet. Receive a purchase order or transfer stock to populate it.
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 font-bold uppercase text-[10px] text-slate-500 border-b">
                  <tr>
                    <th className="p-2.5">Product & SKU</th>
                    <th className="p-2.5 text-center">Available Stock</th>
                    <th className="p-2.5 text-center">Physical Stock</th>
                    <th className="p-2.5 text-center">Reserved</th>
                    <th className="p-2.5 text-center">Damaged</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {hubInventory
                    .filter((item) => {
                      if (!hubInvSearch) return true;
                      const term = hubInvSearch.toLowerCase();
                      const name = item.productId?.name?.toLowerCase() || '';
                      const sku = item.productId?.sku?.toLowerCase() || item.variantId?.sku?.toLowerCase() || '';
                      return name.includes(term) || sku.includes(term);
                    })
                    .map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5">
                          <p className="font-bold text-slate-800 dark:text-slate-200">
                            {item.productId?.name || 'Item'}
                          </p>
                          <span className="font-mono text-[10px] text-slate-400">
                            SKU: {item.variantId?.sku || item.productId?.sku}
                          </span>
                        </td>
                        <td className="p-2.5 text-center font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          {item.availableStock}
                        </td>
                        <td className="p-2.5 text-center font-semibold text-slate-700 dark:text-slate-300">
                          {item.physicalStock}
                        </td>
                        <td className="p-2.5 text-center text-amber-500 font-mono">
                          {item.reservedStock}
                        </td>
                        <td className="p-2.5 text-center text-rose-500 font-mono">
                          {item.damagedStock}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setShowInventoryModal(false)}>
              Close Inspection
            </Button>
          </div>
        </div>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 5: INTER-WAREHOUSE STOCK TRANSFER */}
      {/* ============================================================== */}
      <Modal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        title="Inter-Warehouse Stock Transfer"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleTransferStock} className="space-y-4">
          {transferError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-600">
              {transferError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Source Facility (Origin) *"
              value={sourceWh}
              onChange={(e) => setSourceWh(e.target.value)}
            >
              <option value="">-- Choose Origin Hub --</option>
              {warehouses.map((w) => (
                <option key={w._id} value={w._id}>
                  {w.name} ({w.code}) — {w.stats?.availableStock || 0} units
                </option>
              ))}
            </Select>

            <Select
              label="Destination Facility *"
              value={destWh}
              onChange={(e) => setDestWh(e.target.value)}
            >
              <option value="">-- Choose Destination Hub --</option>
              {warehouses.map((w) => (
                <option key={w._id} value={w._id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </Select>
          </div>

          {/* Add Product Items */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
            <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">
              Select Product to Move
            </h4>
            <div className="max-h-36 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-700 pr-1">
              {products.map((p) => (
                <div key={p._id} className="py-2 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{p.name}</span>
                    <span className="ml-2 font-mono text-[11px] text-slate-400">SKU: {p.sku}</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const v = p.variants?.[0];
                      const sku = v?.sku || p.sku;
                      if (transferItems.some((i) => i.sku === sku)) return;
                      setTransferItems([
                        ...transferItems,
                        {
                          variantId: v?._id,
                          productId: p._id,
                          sku,
                          title: p.name,
                          quantity: 5
                        }
                      ]);
                    }}
                  >
                    + Add to Transfer
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Items in transfer batch */}
          {transferItems.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-slate-500">
                Transfer Items ({transferItems.length})
              </h4>
              {transferItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 border rounded-lg text-xs"
                >
                  <div>
                    <span className="font-bold">{item.title || item.sku}</span>
                    <span className="ml-2 font-mono text-[11px] text-slate-400">{item.sku}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Units:</span>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const copy = [...transferItems];
                          copy[idx].quantity = Number(e.target.value);
                          setTransferItems(copy);
                        }}
                        className="w-20 p-1 text-xs font-mono font-bold text-center border rounded bg-slate-50 dark:bg-slate-800"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setTransferItems(transferItems.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-rose-500 font-bold p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Input
            label="Transfer Notes / Reason"
            value={transferNotes}
            onChange={(e) => setTransferNotes(e.target.value)}
            placeholder="e.g. Stock balancing for upcoming festive sale"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setShowTransferModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={transferLoading} className="font-bold">
              {transferLoading ? 'Moving Stock...' : 'Execute Stock Transfer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 6: TRANSFER DETAILS VOUCHER */}
      {/* ============================================================== */}
      <Modal
        isOpen={showTransferDetailsModal}
        onClose={() => setShowTransferDetailsModal(false)}
        title={`Transfer Slip #${selectedTransfer?.transferNumber}`}
      >
        {selectedTransfer && (
          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Executed On</span>
                <span className="font-semibold">{new Date(selectedTransfer.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                <Badge variant="success" size="sm">{selectedTransfer.status}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white dark:bg-slate-900 border rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Origin Hub</span>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedTransfer.sourceWarehouse?.name}
                </p>
                <span className="font-mono text-slate-400 text-xs">{selectedTransfer.sourceWarehouse?.code}</span>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 border rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Destination Hub</span>
                <p className="font-bold text-sm text-primary-600 mt-0.5">
                  {selectedTransfer.destinationWarehouse?.name}
                </p>
                <span className="font-mono text-slate-400 text-xs">{selectedTransfer.destinationWarehouse?.code}</span>
              </div>
            </div>

            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 font-bold uppercase text-[10px] text-slate-500 border-b">
                  <tr>
                    <th className="p-2.5">SKU</th>
                    <th className="p-2.5 text-center">Quantity Transferred</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedTransfer.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-mono font-bold">{item.sku}</td>
                      <td className="p-2.5 text-center font-bold text-emerald-600">{item.quantity} units</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedTransfer.notes && (
              <p className="text-slate-500 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                <strong>Notes:</strong> {selectedTransfer.notes}
              </p>
            )}

            <div className="flex justify-between items-center pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePrintTransferSlip(selectedTransfer)}
              >
                <Printer className="w-3.5 h-3.5 mr-1" /> Print Slip
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowTransferDetailsModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
