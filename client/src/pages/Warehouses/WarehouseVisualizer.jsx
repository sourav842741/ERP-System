import React, { useState, useEffect } from 'react';
import {
  Boxes, Layers, Search, Plus, RefreshCw, Trash2, Edit2,
  Package, MapPin, CheckCircle2, AlertCircle, Sparkles,
  Sliders, Grid, ArrowRight, Eye, Check, X, ShieldAlert, RotateCcw
} from 'lucide-react';
import api from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Warehouse3DScene } from './Warehouse3DScene';
import { useSocket } from '../../context/SocketContext';

export const WarehouseVisualizer = ({ initialWarehouseId = '' }) => {
  const socketContext = useSocket ? useSocket() : null;
  const socket = socketContext?.socket;

  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(initialWarehouseId);

  // Bins State
  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalBins: 0,
    occupiedBins: 0,
    occupancyRate: 0,
    totalCapacity: 0,
    totalStoredUnits: 0
  });

  // Filters & SKU Locator Search
  const [zoneFilter, setZoneFilter] = useState('all');
  const [aisleFilter, setAisleFilter] = useState('all');
  const [skuSearch, setSkuSearch] = useState('');
  const [matchedBinIds, setMatchedBinIds] = useState(new Set());

  // View Mode: '3d' | '2d'
  const [viewMode, setViewMode] = useState('3d');

  // Modals State
  const [showAddBinModal, setShowAddBinModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showBinDetailsModal, setShowBinDetailsModal] = useState(false);
  const [showEditBinModal, setShowEditBinModal] = useState(false);
  const [selectedBin, setSelectedBin] = useState(null);

  // Edit Bin Form
  const [editBinForm, setEditBinForm] = useState({
    binCode: '',
    zone: 'Zone A',
    aisle: 'Aisle 1',
    rack: 'Rack 1',
    shelf: 'Level 1',
    type: 'standard',
    maxCapacity: 100,
    status: 'available',
    notes: ''
  });

  // Single Bin Form
  const [binForm, setBinForm] = useState({
    zone: 'Zone A',
    aisle: 'Aisle 1',
    rack: 'Rack 1',
    shelf: 'Level 1',
    binCode: '',
    type: 'standard',
    maxCapacity: 100,
    notes: ''
  });

  // Batch Generator Form
  const [batchForm, setBatchForm] = useState({
    zone: 'Zone A',
    aisle: 'Aisle 1',
    racksCount: 3,
    levelsCount: 3,
    binsPerLevel: 4,
    maxCapacity: 100,
    type: 'standard',
    autoSlotInventory: true
  });

  // Assign Stock Form
  const [assignForm, setAssignForm] = useState({
    sku: '',
    productName: '',
    quantity: 10
  });

  // Stockable Products & Auto-Slotting State
  const [stockableProducts, setStockableProducts] = useState([]);
  const [autoSlotting, setAutoSlotting] = useState(false);

  // Fetch Warehouses
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const res = await api.get('/warehouses');
        if (res.data?.success) {
          const whs = res.data.data.warehouses || [];
          setWarehouses(whs);
          if (!selectedWarehouseId && whs.length > 0) {
            setSelectedWarehouseId(whs[0]._id);
          }
        }
      } catch (err) {
        console.error('Failed to load warehouses', err);
      }
    };
    fetchWarehouses();
  }, []);

  // Fetch Stockable Products for Dropdown
  const fetchStockableProducts = async () => {
    if (!selectedWarehouseId) return;
    try {
      const res = await api.get(`/warehouse-bins/stockable-products?warehouseId=${selectedWarehouseId}`);
      if (res.data?.success) {
        setStockableProducts(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load stockable products', err);
    }
  };

  // Fetch Bins for Selected Warehouse (supports silent refresh for seamless real-time updates)
  const fetchBins = async (silent = false) => {
    if (!selectedWarehouseId) return;
    if (!silent) setLoading(true);
    try {
      const params = { warehouseId: selectedWarehouseId };
      if (zoneFilter !== 'all') params.zone = zoneFilter;
      if (aisleFilter !== 'all') params.aisle = aisleFilter;
      const res = await api.get('/warehouse-bins', { params });
      if (res.data?.success) {
        setBins(res.data.data || []);
        if (res.data.stats) setStats(res.data.stats);
      }
    } catch (err) {
      console.error('Failed to load bins', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchBins();
    fetchStockableProducts();
  }, [selectedWarehouseId, zoneFilter, aisleFilter]);

  // Real-time synchronization: Socket events, window focus, and background polling
  useEffect(() => {
    // 1. Immediately re-fetch when window gets focus (e.g. user deleted product in Catalog tab and switched back)
    const handleFocus = () => {
      fetchBins(true);
      fetchStockableProducts();
    };
    window.addEventListener('focus', handleFocus);

    // 2. Real-time WebSockets
    const handleRealtimeUpdate = () => {
      fetchBins(true);
      fetchStockableProducts();
    };

    if (socket) {
      socket.on('warehouse:bins_updated', handleRealtimeUpdate);
      socket.on('product:deleted', handleRealtimeUpdate);
      socket.on('inventory:updated', handleRealtimeUpdate);
      socket.on('products:bulk_update', handleRealtimeUpdate);
    }

    // 3. Fallback background sync every 4 seconds to guarantee twin accuracy
    const pollInterval = setInterval(() => {
      fetchBins(true);
    }, 4000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(pollInterval);
      if (socket) {
        socket.off('warehouse:bins_updated', handleRealtimeUpdate);
        socket.off('product:deleted', handleRealtimeUpdate);
        socket.off('inventory:updated', handleRealtimeUpdate);
        socket.off('products:bulk_update', handleRealtimeUpdate);
      }
    };
  }, [socket, selectedWarehouseId, zoneFilter, aisleFilter]);

  // 1-Click Auto-Slotting Handler
  const handleAutoSlot = async () => {
    if (!selectedWarehouseId) return;
    setAutoSlotting(true);
    try {
      const res = await api.post('/warehouse-bins/auto-slot', {
        warehouseId: selectedWarehouseId,
        resetExisting: false
      });
      if (res.data?.success) {
        alert(res.data.message);
        fetchBins();
        fetchStockableProducts();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to auto-slot inventory');
    } finally {
      setAutoSlotting(false);
    }
  };

  // SKU Search & Instant Highlighting
  useEffect(() => {
    if (!skuSearch.trim()) {
      setMatchedBinIds(new Set());
      return;
    }
    const query = skuSearch.toLowerCase().trim();
    const matches = new Set();
    bins.forEach((b) => {
      const hasSku = b.assignedSkus?.some(
        (item) => item.sku.toLowerCase().includes(query) || (item.productName && item.productName.toLowerCase().includes(query))
      );
      const matchesCode = b.binCode?.toLowerCase().includes(query);
      if (hasSku || matchesCode) {
        matches.add(b._id);
      }
    });
    setMatchedBinIds(matches);
  }, [skuSearch, bins]);

  // Extract Unique Zones and Aisles for filter dropdowns
  const availableZones = Array.from(new Set(bins.map((b) => b.zone))).filter(Boolean);
  const availableAisles = Array.from(new Set(bins.map((b) => b.aisle))).filter(Boolean);

  // Group Bins by Aisle and Rack for 2D Grid Layout
  const groupedLayout = React.useMemo(() => {
    const layout = {};
    bins.forEach((bin) => {
      const aisleKey = bin.aisle || 'Aisle 1';
      const rackKey = bin.rack || 'Rack 1';
      if (!layout[aisleKey]) layout[aisleKey] = {};
      if (!layout[aisleKey][rackKey]) layout[aisleKey][rackKey] = [];
      layout[aisleKey][rackKey].push(bin);
    });
    return layout;
  }, [bins]);

  // Create Single Bin Submit
  const handleCreateBin = async (e) => {
    e.preventDefault();
    try {
      await api.post('/warehouse-bins', {
        ...binForm,
        warehouseId: selectedWarehouseId
      });
      setShowAddBinModal(false);
      setBinForm({
        zone: 'Zone A',
        aisle: 'Aisle 1',
        rack: 'Rack 1',
        shelf: 'Level 1',
        binCode: '',
        type: 'standard',
        maxCapacity: 100,
        notes: ''
      });
      fetchBins();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create bin');
    }
  };

  // Batch Generate Bins Submit
  const handleBatchGenerate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/warehouse-bins/batch-generate', {
        ...batchForm,
        warehouseId: selectedWarehouseId
      });
      if (batchForm.autoSlotInventory) {
        await api.post('/warehouse-bins/auto-slot', {
          warehouseId: selectedWarehouseId,
          resetExisting: false
        });
      }
      setShowBatchModal(false);
      fetchBins();
      fetchStockableProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Batch generation failed');
    }
  };

  // Assign Stock Submit
  const handleAssignStock = async (e) => {
    e.preventDefault();
    if (!selectedBin) return;
    try {
      const res = await api.post(`/warehouse-bins/${selectedBin._id}/assign-sku`, assignForm);
      if (res.data?.success) {
        setSelectedBin(res.data.data);
        setAssignForm({ sku: '', productName: '', quantity: 10 });
        fetchBins();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign stock');
    }
  };

  // Open Edit Bin Modal
  const handleOpenEditBin = (bin) => {
    setSelectedBin(bin);
    setEditBinForm({
      binCode: bin.binCode,
      zone: bin.zone,
      aisle: bin.aisle,
      rack: bin.rack,
      shelf: bin.shelf,
      type: bin.type || 'standard',
      maxCapacity: bin.maxCapacity || 100,
      status: bin.status || 'available',
      notes: bin.notes || ''
    });
    setShowBinDetailsModal(false);
    setShowEditBinModal(true);
  };

  // Submit Update Bin (PUT)
  const handleUpdateBinSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBin) return;
    try {
      const res = await api.put(`/warehouse-bins/${selectedBin._id}`, editBinForm);
      if (res.data?.success) {
        setShowEditBinModal(false);
        fetchBins();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update bin');
    }
  };

  // Clear / Reset All Bins in Warehouse
  const handleClearAllBins = async () => {
    if (!selectedWarehouseId) return;
    if (!window.confirm('Are you sure you want to CLEAR & RESET all bins in this warehouse? All generated racks and bin allocations will be deleted.')) return;
    try {
      const res = await api.post('/warehouse-bins/clear-all', { warehouseId: selectedWarehouseId });
      alert(res.data?.message || 'Layout cleared');
      fetchBins();
      fetchStockableProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to clear layout');
    }
  };

  // Delete entire Aisle
  const handleDeleteAisle = async (aisleName) => {
    if (!window.confirm(`Are you sure you want to delete all bins in ${aisleName}?`)) return;
    try {
      await api.post('/warehouse-bins/delete-aisle', { warehouseId: selectedWarehouseId, aisle: aisleName });
      fetchBins();
      fetchStockableProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete aisle');
    }
  };

  // Delete Single Bin
  const handleDeleteBin = async (binId, binCode) => {
    if (!window.confirm(`Are you sure you want to delete bin ${binCode}?`)) return;
    try {
      await api.delete(`/warehouse-bins/${binId}`);
      setShowBinDetailsModal(false);
      fetchBins();
      fetchStockableProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete bin');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar & Warehouse Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-600/10 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              3D & 2D Warehouse Digital Twin & Visualizer
            </h2>
            <p className="text-xs text-slate-500">
              High-definition 3D industrial racks, bin occupancy simulation, and automated ERP inventory allocation.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* 3D vs 2D Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('3d')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === '3d'
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" /> 3D Digital Twin
            </button>
            <button
              type="button"
              onClick={() => setViewMode('2d')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === '2d'
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" /> 2D Blueprint Grid
            </button>
          </div>

          {/* Warehouse Selector */}
          <div className="flex items-center gap-1.5 text-xs bg-slate-50 dark:bg-slate-950 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <MapPin className="w-3.5 h-3.5 text-slate-400 ml-1" />
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden"
            >
              {warehouses.map((w) => (
                <option key={w._id} value={w._id} className="dark:bg-slate-900">
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          <Button
            size="sm"
            onClick={handleAutoSlot}
            loading={autoSlotting}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs"
            title="Automatically distribute ERP inventory and products into available bins"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1" /> Auto-Slot Products
          </Button>

          <Button size="sm" variant="outline" onClick={() => setShowBatchModal(true)} className="text-xs">
            <Layers className="w-3.5 h-3.5 mr-1 text-primary-500" /> Auto-Generate Racks
          </Button>

          <Button size="sm" onClick={() => setShowAddBinModal(true)} className="text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Bin
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleClearAllBins}
            className="text-xs text-rose-500 hover:text-rose-600 hover:border-rose-300 dark:border-slate-800"
            title="Clear and reset all bins in this warehouse"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset Layout
          </Button>
        </div>
      </div>

      {/* Auto-Slot Suggestion Banner if Bins are mostly empty */}
      {bins.length > 0 && stats.occupiedBins <= 1 && (
        <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-primary-500/10 to-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-800 dark:text-amber-200 font-medium">
            <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <span className="font-bold block text-slate-900 dark:text-white">
                Racks are generated but products are unallocated!
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                You don't need to manually type or assign products. Click <strong>"Auto-Slot Products to Bins"</strong> to instantly map and allocate all existing catalog items and stock into these shelf racks.
              </span>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleAutoSlot}
            loading={autoSlotting}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> ⚡ Auto-Slot All Products Now
          </Button>
        </div>
      )}

      {/* 2. Facility Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-500 block">Total Bins</span>
          <span className="text-lg font-black text-slate-900 dark:text-white">{stats.totalBins}</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-500 block">Occupied Bins</span>
          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{stats.occupiedBins}</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-500 block">Occupancy Rate</span>
          <span className="text-lg font-black text-amber-600 dark:text-amber-400">{stats.occupancyRate}%</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-500 block">Total Capacity</span>
          <span className="text-lg font-black text-slate-900 dark:text-white">{stats.totalCapacity.toLocaleString()}</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-500 block">Stored Units</span>
          <span className="text-lg font-black text-primary-600 dark:text-primary-400">{stats.totalStoredUnits.toLocaleString()}</span>
        </div>
      </div>

      {/* 3. Search & Quick Filters Bar */}
      <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Instant SKU Locator Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Locate SKU or Bin Code on map..."
            value={skuSearch}
            onChange={(e) => setSkuSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:border-primary-500"
          />
          {skuSearch && (
            <button
              onClick={() => setSkuSearch('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600" />
            <span>Empty</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500/30 border border-emerald-500" />
            <span>1-70% Stocked</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-500/30 border border-amber-500" />
            <span>71-99% High</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-rose-500/40 border border-rose-500" />
            <span>100% Full</span>
          </span>
          {matchedBinIds.size > 0 && (
            <span className="flex items-center gap-1.5 font-bold text-primary-600 dark:text-primary-400 animate-pulse">
              <span className="w-2.5 h-2.5 rounded-xs bg-primary-600 ring-2 ring-primary-400" />
              <span>{matchedBinIds.size} Matched Target</span>
            </span>
          )}
        </div>

        {/* Zone & Aisle Filters */}
        <div className="flex items-center gap-2">
          {availableZones.length > 0 && (
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="text-xs p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Zones</option>
              {availableZones.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          )}

          {availableAisles.length > 0 && (
            <select
              value={aisleFilter}
              onChange={(e) => setAisleFilter(e.target.value)}
              className="text-xs p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Aisles</option>
              {availableAisles.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          )}

          <Button size="sm" variant="ghost" onClick={fetchBins} loading={loading} className="text-xs p-2">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* 4. Interactive Warehouse Digital Twin Canvas (3D or 2D) */}
      {loading ? (
        <div className="p-16 text-center text-xs text-slate-400 flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span>Rendering Warehouse Digital Twin...</span>
        </div>
      ) : bins.length === 0 ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl space-y-3">
          <Boxes className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Bins Configured in this Facility</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Use the "Auto-Generate Racks" button to build an interactive Aisle / Rack / Level matrix in seconds.
          </p>
          <Button onClick={() => setShowBatchModal(true)} size="sm">
            <Layers className="w-3.5 h-3.5 mr-1.5" /> Generate First Rack Layout
          </Button>
        </div>
      ) : viewMode === '3d' ? (
        /* --- 3D DIGITAL TWIN SCENE --- */
        <Warehouse3DScene
          bins={bins}
          matchedBinIds={matchedBinIds}
          onSelectBin={(bin) => {
            setSelectedBin(bin);
            setShowBinDetailsModal(true);
          }}
          selectedBin={selectedBin}
        />
      ) : (
        /* --- 2D BLUEPRINT GRID --- */
        <div className="space-y-6">
          {Object.entries(groupedLayout).map(([aisleName, racks]) => (
            <div
              key={aisleName}
              className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4"
            >
              {/* Aisle Title & Walking Lane */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-mono font-bold">
                    {aisleName}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Walking Corridor & Picking Lane</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-400">
                    {Object.keys(racks).length} Racks configured
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteAisle(aisleName)}
                    className="text-rose-500 hover:text-rose-700 text-xs flex items-center gap-1 px-2 py-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    title={`Delete all bins in ${aisleName}`}
                  >
                    <Trash2 className="w-3 h-3" /> Delete Aisle
                  </button>
                </div>
              </div>

              {/* Racks Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {Object.entries(racks).map(([rackName, rackBins]) => (
                  <div
                    key={rackName}
                    className="p-4 bg-slate-50/70 dark:bg-slate-950/70 rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {rackName}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {rackBins.length} Bins
                      </span>
                    </div>

                    {/* Bins Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {rackBins.map((bin) => {
                        const isMatched = matchedBinIds.has(bin._id);
                        const occupancy = bin.maxCapacity > 0 ? (bin.currentUnits / bin.maxCapacity) * 100 : 0;
                        const isFull = occupancy >= 100;
                        const isHigh = occupancy >= 70 && !isFull;
                        const isOccupied = occupancy > 0 && !isHigh && !isFull;

                        return (
                          <div
                            key={bin._id}
                            onClick={() => {
                              setSelectedBin(bin);
                              setShowBinDetailsModal(true);
                            }}
                            className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all relative overflow-hidden group hover:scale-[1.02] ${
                              isMatched
                                ? 'bg-primary-500/20 border-primary-500 ring-2 ring-primary-500 shadow-md shadow-primary-500/20 animate-pulse'
                                : isFull
                                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60'
                                : isHigh
                                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60'
                                : isOccupied
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-mono font-bold text-slate-900 dark:text-white truncate">
                                {bin.binCode}
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono">
                                {bin.shelf}
                              </span>
                            </div>

                            {/* Occupancy bar */}
                            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-1.5">
                              <div
                                className={`h-full rounded-full ${
                                  isFull ? 'bg-rose-500' : isHigh ? 'bg-amber-500' : isOccupied ? 'bg-emerald-500' : 'bg-slate-300'
                                }`}
                                style={{ width: `${Math.min(100, occupancy)}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-500">
                              <span>{bin.currentUnits} / {bin.maxCapacity}</span>
                              <span className="font-semibold">{Math.round(occupancy)}%</span>
                            </div>

                            {bin.assignedSkus?.length > 0 && (
                              <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-800/60 text-[9px] text-slate-400 font-mono truncate">
                                {bin.assignedSkus[0].sku} ({bin.assignedSkus[0].quantity})
                                {bin.assignedSkus.length > 1 && ` +${bin.assignedSkus.length - 1}`}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Bin Details & Stock Putaway Modal */}
      <Modal
        isOpen={showBinDetailsModal}
        onClose={() => setShowBinDetailsModal(false)}
        title={selectedBin ? `Bin Details: ${selectedBin.binCode}` : 'Bin Details'}
      >
        {selectedBin && (
          <div className="space-y-4 text-xs">
            {/* Bin Identity Cards */}
            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-slate-400 block text-[10px]">Zone / Aisle / Rack:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedBin.zone} &bull; {selectedBin.aisle} &bull; {selectedBin.rack}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Shelf Level:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedBin.shelf}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Capacity Utilization:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedBin.currentUnits} of {selectedBin.maxCapacity} units ({Math.round((selectedBin.currentUnits / selectedBin.maxCapacity) * 100)}%)
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Bin Type:</span>
                <span className="font-bold capitalize text-slate-800 dark:text-slate-200">{selectedBin.type}</span>
              </div>
            </div>

            {/* Currently Stored Items */}
            <div className="space-y-2">
              <span className="font-bold text-slate-900 dark:text-white block">
                Stored Items ({selectedBin.assignedSkus?.length || 0})
              </span>
              {!selectedBin.assignedSkus || selectedBin.assignedSkus.length === 0 ? (
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg text-slate-400 text-center">
                  This bin is currently empty.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {selectedBin.assignedSkus.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <span className="font-mono font-bold text-slate-900 dark:text-white block">
                          {item.sku}
                        </span>
                        <span className="text-[10px] text-slate-400">{item.productName || 'Product'}</span>
                      </div>
                      <span className="font-mono font-bold text-primary-600 dark:text-primary-400 px-2 py-0.5 bg-primary-50 dark:bg-primary-950 rounded">
                        {item.quantity} pcs
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Putaway Stock Form */}
            <form onSubmit={handleAssignStock} className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="font-bold text-slate-900 dark:text-white block">
                Assign / Putaway Stock into this Bin:
              </span>

              {/* Product Selector Dropdown */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Product from ERP Catalog:
                </label>
                <select
                  value={assignForm.sku}
                  onChange={(e) => {
                    const found = stockableProducts.find((p) => p.sku === e.target.value);
                    if (found) {
                      const remainingSpace = Math.max(1, selectedBin.maxCapacity - selectedBin.currentUnits);
                      setAssignForm({
                        sku: found.sku,
                        productName: found.name,
                        quantity: Math.min(found.currentStock || 25, remainingSpace)
                      });
                    } else {
                      setAssignForm({ ...assignForm, sku: e.target.value });
                    }
                  }}
                  className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                >
                  <option value="">-- Choose Existing Product from Catalog --</option>
                  {stockableProducts.map((p) => (
                    <option key={p.sku} value={p.sku}>
                      {p.name} ({p.sku}) — Available: {p.currentStock} units
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="SKU Identifier *"
                  required
                  value={assignForm.sku}
                  onChange={(e) => setAssignForm({ ...assignForm, sku: e.target.value })}
                />
                <Input
                  label="Units to Store *"
                  type="number"
                  min="1"
                  required
                  value={assignForm.quantity}
                  onChange={(e) => setAssignForm({ ...assignForm, quantity: Number(e.target.value) })}
                />
              </div>

              <Button type="submit" size="sm" className="w-full text-xs">
                <Plus className="w-3 h-3 mr-1" /> Putaway Selected Product into Bin
              </Button>
            </form>

            {/* Action Buttons: Edit & Delete Bin */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => handleOpenEditBin(selectedBin)}
                  className="text-xs text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-800"
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit Bin Details
                </Button>
                <button
                  type="button"
                  onClick={() => handleDeleteBin(selectedBin._id, selectedBin.binCode)}
                  className="text-rose-500 hover:text-rose-700 text-xs font-semibold flex items-center gap-1 px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete this Bin
                </button>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowBinDetailsModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 6. Batch Generate Racks Modal */}
      <Modal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        title="Auto-Generate Warehouse Rack Matrix"
      >
        <form onSubmit={handleBatchGenerate} className="space-y-3 text-xs">
          <p className="text-slate-400">
            Automatically create an entire aisle layout with multi-level shelf racks.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Zone Name *"
              required
              value={batchForm.zone}
              onChange={(e) => setBatchForm({ ...batchForm, zone: e.target.value })}
              placeholder="e.g. Zone Fast"
            />
            <Input
              label="Aisle Name *"
              required
              value={batchForm.aisle}
              onChange={(e) => setBatchForm({ ...batchForm, aisle: e.target.value })}
              placeholder="e.g. Aisle 1"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Number of Racks"
              type="number"
              min="1"
              max="10"
              required
              value={batchForm.racksCount}
              onChange={(e) => setBatchForm({ ...batchForm, racksCount: Number(e.target.value) })}
            />
            <Input
              label="Shelf Levels per Rack"
              type="number"
              min="1"
              max="6"
              required
              value={batchForm.levelsCount}
              onChange={(e) => setBatchForm({ ...batchForm, levelsCount: Number(e.target.value) })}
            />
            <Input
              label="Bins per Level"
              type="number"
              min="1"
              max="10"
              required
              value={batchForm.binsPerLevel}
              onChange={(e) => setBatchForm({ ...batchForm, binsPerLevel: Number(e.target.value) })}
            />
          </div>

          <Input
            label="Default Bin Capacity (Units)"
            type="number"
            min="1"
            value={batchForm.maxCapacity}
            onChange={(e) => setBatchForm({ ...batchForm, maxCapacity: Number(e.target.value) })}
          />

          <div className="p-3 bg-primary-50 dark:bg-primary-950/60 rounded-xl text-primary-700 dark:text-primary-300 font-mono text-[11px]">
            This will generate <strong>{batchForm.racksCount * batchForm.levelsCount * batchForm.binsPerLevel} bins</strong> with automatic coordinate mapping.
          </div>

          <label className="flex items-center gap-2 p-2.5 bg-amber-50/70 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-800 text-xs font-semibold cursor-pointer text-slate-900 dark:text-white">
            <input
              type="checkbox"
              checked={batchForm.autoSlotInventory}
              onChange={(e) => setBatchForm({ ...batchForm, autoSlotInventory: e.target.checked })}
              className="rounded text-amber-600 focus:ring-amber-500"
            />
            <span>⚡ Automatically slot existing ERP products into newly generated bins</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowBatchModal(false)}>
              Cancel
            </Button>
            <Button type="submit">
              <Sparkles className="w-3.5 h-3.5 mr-1" /> Generate Layout Now
            </Button>
          </div>
        </form>
      </Modal>

      {/* 7. Single Bin Create Modal */}
      <Modal
        isOpen={showAddBinModal}
        onClose={() => setShowAddBinModal(false)}
        title="Add Single Warehouse Bin"
      >
        <form onSubmit={handleCreateBin} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Zone *"
              required
              value={binForm.zone}
              onChange={(e) => setBinForm({ ...binForm, zone: e.target.value })}
            />
            <Input
              label="Aisle *"
              required
              value={binForm.aisle}
              onChange={(e) => setBinForm({ ...binForm, aisle: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Rack *"
              required
              value={binForm.rack}
              onChange={(e) => setBinForm({ ...binForm, rack: e.target.value })}
            />
            <Input
              label="Shelf Level *"
              required
              value={binForm.shelf}
              onChange={(e) => setBinForm({ ...binForm, shelf: e.target.value })}
            />
          </div>

          <Input
            label="Bin Code * (Unique)"
            required
            placeholder="e.g. ZA-A1-R1-L2-B04"
            value={binForm.binCode}
            onChange={(e) => setBinForm({ ...binForm, binCode: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Max Capacity (Units)"
              type="number"
              value={binForm.maxCapacity}
              onChange={(e) => setBinForm({ ...binForm, maxCapacity: Number(e.target.value) })}
            />
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Type</label>
              <select
                value={binForm.type}
                onChange={(e) => setBinForm({ ...binForm, type: e.target.value })}
                className="w-full text-xs p-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="standard">Standard Bin</option>
                <option value="pallet">Pallet Rack</option>
                <option value="cold_storage">Cold Storage</option>
                <option value="oversized">Oversized</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowAddBinModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Bin</Button>
          </div>
        </form>
      </Modal>

      {/* 8. Edit Bin Modal */}
      <Modal
        isOpen={showEditBinModal}
        onClose={() => setShowEditBinModal(false)}
        title={selectedBin ? `Edit Bin: ${selectedBin.binCode}` : 'Edit Bin'}
      >
        <form onSubmit={handleUpdateBinSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Zone *"
              required
              value={editBinForm.zone}
              onChange={(e) => setEditBinForm({ ...editBinForm, zone: e.target.value })}
            />
            <Input
              label="Aisle *"
              required
              value={editBinForm.aisle}
              onChange={(e) => setEditBinForm({ ...editBinForm, aisle: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Rack *"
              required
              value={editBinForm.rack}
              onChange={(e) => setEditBinForm({ ...editBinForm, rack: e.target.value })}
            />
            <Input
              label="Shelf Level *"
              required
              value={editBinForm.shelf}
              onChange={(e) => setEditBinForm({ ...editBinForm, shelf: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Bin Code * (Unique)"
              required
              value={editBinForm.binCode}
              onChange={(e) => setEditBinForm({ ...editBinForm, binCode: e.target.value })}
            />
            <Input
              label="Max Capacity (Units)"
              type="number"
              min="1"
              value={editBinForm.maxCapacity}
              onChange={(e) => setEditBinForm({ ...editBinForm, maxCapacity: Number(e.target.value) })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Type</label>
              <select
                value={editBinForm.type}
                onChange={(e) => setEditBinForm({ ...editBinForm, type: e.target.value })}
                className="w-full text-xs p-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="standard">Standard Bin</option>
                <option value="pallet">Pallet Rack</option>
                <option value="cold_storage">Cold Storage</option>
                <option value="oversized">Oversized</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Status</label>
              <select
                value={editBinForm.status}
                onChange={(e) => setEditBinForm({ ...editBinForm, status: e.target.value })}
                className="w-full text-xs p-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="reserved">Reserved</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>

          <Input
            label="Notes / Instructions"
            value={editBinForm.notes}
            onChange={(e) => setEditBinForm({ ...editBinForm, notes: e.target.value })}
            placeholder="e.g. Near main forklift lane, fragile only"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowEditBinModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default WarehouseVisualizer;
