import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Images, UploadCloud, Search, Copy, Check, ExternalLink,
  Trash2, Edit3, Grid, List, Eye, Sparkles, Filter,
  FileImage, Tag, Folder, RefreshCw, X, Download, AlertCircle, Wand2
} from 'lucide-react';
import api from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';

const CATEGORIES = ['All', 'General', 'Products', 'Banners', 'Marketing', 'Logos'];

export const MediaGallery = () => {
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalCount: 0, totalSizeMB: '0.00' });
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Modals & Interactivity
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewAsset, setPreviewAsset] = useState(null); // Lightbox
  const [editingAsset, setEditingAsset] = useState(null); // Edit modal
  const [copiedId, setCopiedId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Upload Form State
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('General');
  const [editTags, setEditTags] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedCategory && selectedCategory !== 'All') params.append('category', selectedCategory);

      const res = await api.get(`/media?${params.toString()}`);
      if (res.data.success) {
        setAssets(res.data.data.assets);
        setStats(res.data.data.stats);
      }
    } catch (err) {
      console.error('Failed to load media assets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [selectedCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAssets();
  };

  // Drag & Drop Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const processSelectedFile = (selectedFile) => {
    if (!selectedFile.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WEBP, SVG, GIF)');
      return;
    }
    setFile(selectedFile);
    // Generate human-friendly title from filename
    const cleanName = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    setFilePreview(URL.createObjectURL(selectedFile));
    setShowUploadModal(true);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert('Please select an image file to upload.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('category', category);
      formData.append('tags', tags);

      const res = await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        // Prepend new image to active listing so it shows immediately at the top
        setAssets((prev) => [res.data.data.asset, ...prev]);
        setStats((prev) => ({
          ...prev,
          totalCount: prev.totalCount + 1
        }));
        // Reset state
        setFile(null);
        setFilePreview('');
        setTitle('');
        setTags('');
        setShowUploadModal(false);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Upload failed. Please verify image format.');
    } finally {
      setUploading(false);
    }
  };

  // Copy Public Cloudinary URL
  const handleCopyLink = (asset, e) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(asset.url);
    setCopiedId(asset._id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Edit Asset Modal Trigger
  const handleOpenEdit = (asset, e) => {
    e?.stopPropagation();
    setEditingAsset(asset);
    setEditTitle(asset.title);
    setEditCategory(asset.category || 'General');
    setEditTags(asset.tags?.join(', ') || '');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingAsset) return;
    setSavingEdit(true);
    try {
      const res = await api.put(`/media/${editingAsset._id}`, {
        title: editTitle,
        category: editCategory,
        tags: editTags
      });
      if (res.data.success) {
        setAssets((prev) =>
          prev.map((a) => (a._id === editingAsset._id ? res.data.data.asset : a))
        );
        setEditingAsset(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update asset');
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete Asset
  const handleDelete = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm('Are you sure you want to permanently delete this image from Cloudinary?')) {
      return;
    }

    try {
      const res = await api.delete(`/media/${id}`);
      if (res.data.success) {
        setAssets((prev) => prev.filter((a) => a._id !== id));
        setStats((prev) => ({
          ...prev,
          totalCount: Math.max(0, prev.totalCount - 1)
        }));
        if (previewAsset?._id === id) setPreviewAsset(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete asset');
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Storage KPIs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-primary-500/20">
            <Images className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Cloud Media Asset Hub
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Cloudinary CDN Live
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Upload from PC or drag & drop. Every image receives a direct, publicly accessible Cloudinary share URL.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-50 dark:bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-200/70 dark:border-slate-700/60 text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Assets
            </span>
            <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
              {stats.totalCount} Images
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-200/70 dark:border-slate-700/60 text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Cloud Storage
            </span>
            <span className="text-base font-extrabold text-primary-600 dark:text-primary-400 font-mono">
              {stats.totalSizeMB} MB
            </span>
          </div>

          <Button
            onClick={() => {
              setFile(null);
              setFilePreview('');
              setTitle('');
              setTags('');
              setShowUploadModal(true);
            }}
            size="md"
            className="shadow-md shadow-primary-500/20"
          >
            <UploadCloud className="w-4 h-4 mr-1.5" /> Upload from PC
          </Button>
        </div>
      </div>

      {/* Drag & Drop Quick Dropzone Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-primary-500 bg-primary-500/10 scale-[1.01]'
            : 'border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/50 hover:border-primary-400'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files?.[0]) processSelectedFile(e.target.files[0]);
          }}
          accept="image/*"
          className="hidden"
        />
        <div className="max-w-md mx-auto flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-3 shadow-inner">
            <UploadCloud className="w-6 h-6 animate-bounce" />
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Drag and drop your images here, or{' '}
            <span className="text-primary-600 dark:text-primary-400 underline underline-offset-2">
              browse from your computer
            </span>
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Supports high-res PNG, JPG, WEBP, SVG up to 10MB &bull; Automatic Cloudinary CDN deployment
          </p>
        </div>
      </div>

      {/* Search, Filter Bar & View Toggle */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedCategory === cat
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search input and View Mode */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search images by title or tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:border-primary-500 text-slate-800 dark:text-slate-200"
            />
          </form>

          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              title="Grid View"
              className={`p-1.5 ${viewMode === 'grid' ? 'bg-primary-50 dark:bg-primary-950 text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="List View"
              className={`p-1.5 ${viewMode === 'list' ? 'bg-primary-50 dark:bg-primary-950 text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <Button variant="secondary" size="sm" onClick={fetchAssets} title="Refresh Assets">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 4. LISTING VIEW: GRID OR LIST */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-9 h-9 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400 font-medium">Fetching Cloudinary asset index...</p>
        </div>
      ) : assets.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center max-w-md mx-auto">
          <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-400 mb-3">
            <FileImage className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No media assets found</h3>
          <p className="text-xs text-slate-400 mt-1">
            {search ? 'No results matched your search query.' : 'Upload your first image from your computer to get started.'}
          </p>
          <Button
            onClick={() => {
              setFile(null);
              setFilePreview('');
              setShowUploadModal(true);
            }}
            size="sm"
            className="mt-4"
          >
            <UploadCloud className="w-3.5 h-3.5 mr-1" /> Upload Image
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW (Newest First) */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {assets.map((asset) => (
            <div
              key={asset._id}
              onClick={() => setPreviewAsset(asset)}
              className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs hover:shadow-xl hover:border-primary-400/50 transition-all duration-200 flex flex-col cursor-pointer"
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-4/3 bg-slate-100 dark:bg-slate-800/80 overflow-hidden flex items-center justify-center">
                <img
                  src={asset.url}
                  alt={asset.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />

                {/* Top Badges */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-950/70 text-white backdrop-blur-md uppercase">
                    {asset.format || 'IMG'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary-600/80 text-white backdrop-blur-md">
                    {asset.category || 'General'}
                  </span>
                </div>

                {/* Hover Action Overlay */}
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs flex items-center justify-center gap-2">
                  <button
                    onClick={(e) => handleCopyLink(asset, e)}
                    title="Copy Public Cloudinary URL"
                    className="p-2 rounded-xl bg-white text-slate-800 hover:bg-primary-500 hover:text-white transition-all shadow-lg text-xs font-bold flex items-center gap-1"
                  >
                    {copiedId === asset._id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Share Link
                      </>
                    )}
                  </button>
                  <a
                    href={asset.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    title="Open Full Image in New Tab"
                    className="p-2 rounded-xl bg-white text-slate-800 hover:bg-cyan-500 hover:text-white transition-all shadow-lg"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-3.5 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate" title={asset.title}>
                    {asset.title}
                  </h4>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400 font-mono">
                    <span>{formatBytes(asset.size)}</span>
                    {asset.width > 0 && <span>{asset.width} &times; {asset.height} px</span>}
                  </div>
                </div>

                {/* Card Footer: Share Link button & Controls */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    onClick={(e) => handleCopyLink(asset, e)}
                    className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg transition-colors ${
                      copiedId === asset._id
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-primary-950/50 hover:text-primary-600'
                    }`}
                  >
                    {copiedId === asset._id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" /> Link Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copy Share URL
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/studio', { state: { imageUrl: asset.url, title: asset.title } });
                      }}
                      title="Edit in AI Studio (Remove BG / Crop)"
                      className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleOpenEdit(asset, e)}
                      title="Edit Title & Category"
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(asset._id, e)}
                      title="Delete from Cloudinary"
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-bold">
                <th className="py-3 px-4">Image Asset</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Size & Format</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {assets.map((asset) => (
                <tr
                  key={asset._id}
                  onClick={() => setPreviewAsset(asset)}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={asset.url}
                        alt={asset.title}
                        className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0 border border-slate-200 dark:border-slate-700"
                      />
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white leading-tight">{asset.title}</p>
                        <p className="text-[10px] text-slate-400 truncate max-w-xs font-mono">{asset.publicId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="primary" size="sm">{asset.category || 'General'}</Badge>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500">
                    <span>{formatBytes(asset.size)} &bull; {asset.format?.toUpperCase()}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {new Date(asset.createdAt).toLocaleDateString()} {new Date(asset.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleCopyLink(asset, e)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors ${
                          copiedId === asset._id
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-primary-50 hover:text-primary-600'
                        }`}
                      >
                        {copiedId === asset._id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        {copiedId === asset._id ? 'Copied' : 'Share URL'}
                      </button>
                      <a
                        href={asset.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-400 hover:text-cyan-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Open Full Image"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/studio', { state: { imageUrl: asset.url, title: asset.title } });
                        }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                        title="Edit in AI Studio (Remove BG / Crop)"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleOpenEdit(asset, e)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(asset._id, e)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. UPLOAD MODAL */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => {
          if (!uploading) setShowUploadModal(false);
        }}
        title="Upload Image to Cloudinary"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          {/* File Picker or Preview */}
          {!filePreview ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-primary-500 hover:bg-primary-50/20 transition-all"
            >
              <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Click to browse or drop an image file
              </p>
              <p className="text-[10px] text-slate-400 mt-1">PNG, JPG, WEBP up to 10MB</p>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 flex items-center justify-center max-h-56">
              <img src={filePreview} alt="Upload preview" className="max-h-56 object-contain" />
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setFilePreview('');
                }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Image Title *
            </label>
            <Input
              required
              placeholder="e.g. Summer Banner 2026 or Product Front View"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-hidden"
              >
                <option value="General">General</option>
                <option value="Products">Products</option>
                <option value="Banners">Banners</option>
                <option value="Marketing">Marketing</option>
                <option value="Logos">Logos</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tags (comma separated)
              </label>
              <Input
                placeholder="ecommerce, hero, black"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-900 dark:text-blue-200">
              The image will be securely transferred to Cloudinary CDN servers. You will get a permanent public share link that works worldwide without authentication.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              disabled={uploading}
              onClick={() => setShowUploadModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={uploading || !file}>
              {uploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Uploading to Cloudinary...
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5 mr-1.5" /> Upload to Cloudinary
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 6. FULL LIGHTBOX PREVIEW MODAL */}
      {previewAsset && (
        <Modal
          isOpen={Boolean(previewAsset)}
          onClose={() => setPreviewAsset(null)}
          title={previewAsset.title}
        >
          <div className="space-y-4">
            <div className="bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center max-h-96 p-2 border border-slate-800">
              <img
                src={previewAsset.url}
                alt={previewAsset.title}
                className="max-h-96 object-contain rounded-lg shadow-xl"
              />
            </div>

            {/* Direct Cloudinary Public Share Link Box */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Direct Cloudinary Public Share URL
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={previewAsset.url}
                  className="w-full text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 select-all"
                />
                <Button
                  size="sm"
                  onClick={(e) => handleCopyLink(previewAsset, e)}
                  className="shrink-0"
                >
                  {copiedId === previewAsset._id ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                    </>
                  )}
                </Button>
                <a
                  href={previewAsset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors shrink-0"
                  title="Open in new window"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Metadata breakdown */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold">FORMAT</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                  {previewAsset.format?.toUpperCase() || 'PNG'}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold">SIZE</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                  {formatBytes(previewAsset.size)}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold">CATEGORY</span>
                <span className="font-bold text-primary-600 dark:text-primary-400">
                  {previewAsset.category || 'General'}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button
                variant="danger"
                size="sm"
                onClick={(e) => handleDelete(previewAsset._id, e)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete from Cloudinary
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPreviewAsset(null)}
              >
                Close Preview
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 7. EDIT ASSET METADATA MODAL */}
      {editingAsset && (
        <Modal
          isOpen={Boolean(editingAsset)}
          onClose={() => setEditingAsset(null)}
          title="Edit Image Details"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Image Title *
              </label>
              <Input
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-hidden"
              >
                <option value="General">General</option>
                <option value="Products">Products</option>
                <option value="Banners">Banners</option>
                <option value="Marketing">Marketing</option>
                <option value="Logos">Logos</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tags (comma separated)
              </label>
              <Input
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                disabled={savingEdit}
                onClick={() => setEditingAsset(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingEdit}>
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default MediaGallery;
