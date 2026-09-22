import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Edit, Trash2, Layers, Image as ImageIcon,
  CheckCircle, XCircle, Search, Filter, Upload,
  Boxes, AlertTriangle, Eye, Sparkles, Loader2, X,
  ChevronLeft, ChevronRight, Star
} from 'lucide-react';
import api from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { DataTable } from '../../components/ui/DataTable';

export const Products = () => {
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'categories'
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  // Modals & Lightbox
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [galleryProduct, setGalleryProduct] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Image Upload State
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const fileInputRef = useRef(null);

  // Product Type Toggle: 'simple' | 'variants'
  const [productType, setProductType] = useState('simple');

  // Form State for Product
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    brand: '',
    category: '',
    sellingPrice: '',
    costPrice: '',
    mrp: '',
    gst: 18,
    hsnCode: '',
    description: '',
    initialStock: 50,
    warehouseId: '',
    images: [],
    variants: []
  });

  // Category CRUD State
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');
  const [categoryStatus, setCategoryStatus] = useState('active');
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (search) params.append('search', search);
      if (selectedCategory) params.append('category', selectedCategory);

      const res = await api.get(`/products?${params.toString()}`);
      if (res.data.success) {
        setProducts(res.data.data.products);
        setPagination(res.data.data.pagination);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/products/categories');
      if (res.data.success) setCategories(res.data.data.categories);
    } catch (err) {}
  };

  const fetchWarehouses = async () => {
    try {
      const res = await api.get('/warehouses');
      if (res.data.success) setWarehouses(res.data.data.warehouses);
    } catch (err) {}
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchWarehouses();
  }, [page, search, selectedCategory]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setProductType('simple');
    setImageUrlInput('');
    setFormData({
      name: '',
      sku: '',
      brand: '',
      category: categories[0]?._id || '',
      sellingPrice: '',
      costPrice: '',
      mrp: '',
      gst: 18,
      hsnCode: '',
      description: '',
      initialStock: 50,
      warehouseId: warehouses[0]?._id || '',
      images: [],
      variants: [
        { color: 'Black', size: 'M', price: '', initialStock: 25, sku: '' },
        { color: 'Black', size: 'L', price: '', initialStock: 25, sku: '' }
      ]
    });
    setShowProductModal(true);
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setImageUrlInput('');
    setProductType(product.variants?.length > 1 ? 'variants' : 'simple');
    setFormData({
      name: product.name,
      sku: product.sku,
      brand: product.brand || '',
      category: product.category?._id || product.category || '',
      sellingPrice: product.sellingPrice,
      costPrice: product.costPrice || '',
      mrp: product.mrp || '',
      gst: product.gst || 18,
      hsnCode: product.hsnCode || '',
      description: product.description || '',
      initialStock: product.availableStock || 0,
      images: product.images || [],
      variants: product.variants || []
    });
    setShowProductModal(true);
  };

  // Image File Upload to Cloudinary / Local Fallback
  const handleImageFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const uploadData = new FormData();
      uploadData.append('file', file);

      const res = await api.post('/upload', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        const uploadedImg = {
          url: res.data.data.url,
          publicId: res.data.data.publicId || ''
        };
        setFormData((prev) => ({
          ...prev,
          images: [...(prev.images || []), uploadedImg]
        }));
      }
    } catch (err) {
      alert('Photo upload failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddImageUrl = (e) => {
    e.preventDefault();
    if (!imageUrlInput || imageUrlInput.trim() === '') return;
    setFormData((prev) => ({
      ...prev,
      images: [...(prev.images || []), { url: imageUrlInput.trim(), publicId: '' }]
    }));
    setImageUrlInput('');
  };

  const handleRemoveImage = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleMakeMainImage = (indexToPromote) => {
    if (indexToPromote === 0) return;
    setFormData((prev) => {
      const updated = [...(prev.images || [])];
      const [promoted] = updated.splice(indexToPromote, 1);
      updated.unshift(promoted);
      return {
        ...prev,
        images: updated
      };
    });
  };

  const handleAddVariantRow = () => {
    setFormData((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        { color: '', size: '', price: prev.sellingPrice || '', initialStock: 10, sku: '' }
      ]
    }));
  };

  const handleRemoveVariantRow = (idx) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== idx)
    }));
  };

  const calculateTotalVariantStock = () => {
    if (productType === 'simple') {
      return Number(formData.initialStock || 0);
    }
    return formData.variants.reduce((sum, v) => sum + Number(v.initialStock || 0), 0);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        sellingPrice: Number(formData.sellingPrice),
        costPrice: Number(formData.costPrice || 0),
        mrp: Number(formData.mrp || 0),
        gst: Number(formData.gst || 18),
        initialStock: Number(formData.initialStock || 0),
        variants: productType === 'variants' ? formData.variants : []
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct._id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setShowProductModal(false);
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product from catalog?')) return;
    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryDesc('');
    setCategoryStatus('active');
    setShowCategoryModal(true);
  };

  const handleOpenEditCategory = (cat, e) => {
    e?.stopPropagation();
    setEditingCategory(cat);
    setCategoryName(cat.name || '');
    setCategoryDesc(cat.description || '');
    setCategoryStatus(cat.status || 'active');
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      alert('Please enter a category name');
      return;
    }
    setSavingCategory(true);
    try {
      if (editingCategory) {
        await api.put(`/products/categories/${editingCategory._id}`, {
          name: categoryName.trim(),
          description: categoryDesc.trim(),
          status: categoryStatus
        });
      } else {
        await api.post('/products/categories', {
          name: categoryName.trim(),
          description: categoryDesc.trim(),
          status: categoryStatus
        });
      }
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCategoryName('');
      setCategoryDesc('');
      setCategoryStatus('active');
      await fetchCategories();
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setDeletingCategory(true);
    try {
      await api.delete(`/products/categories/${categoryToDelete._id}`);
      setCategoryToDelete(null);
      await fetchCategories();
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setDeletingCategory(false);
    }
  };

  const filteredCategories = categories.filter((c) => {
    if (!categorySearch.trim()) return true;
    const q = categorySearch.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.status?.toLowerCase().includes(q)
    );
  });

  const columns = [
    {
      header: 'Product & Photo',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div
            onClick={() => {
              if (row.images && row.images.length > 0) {
                setGalleryProduct(row);
                setSelectedImageIndex(0);
              }
            }}
            className={`relative group w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden text-slate-400 shadow-2xs ${
              row.images && row.images.length > 0 ? 'cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all' : ''
            }`}
            title={row.images?.length > 1 ? `Click to view all ${row.images.length} photos` : 'Product thumbnail'}
          >
            {row.images && row.images.length > 0 && row.images[0].url ? (
              <>
                <img
                  src={row.images[0].url}
                  alt={row.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=150';
                  }}
                />
                {/* Extra photo counter badge */}
                {row.images.length > 1 && (
                  <span className="absolute bottom-0 right-0 bg-slate-900/85 backdrop-blur-xs text-white text-[9px] font-black px-1.5 py-0.5 rounded-tl-md border-t border-l border-white/20">
                    +{row.images.length - 1}
                  </span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                  <Eye className="w-4 h-4" />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400">
                <ImageIcon className="w-5 h-5" />
                <span className="text-[8px] font-semibold mt-0.5">No photo</span>
              </div>
            )}
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-white leading-tight text-sm">{row.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-xs font-semibold text-primary-600 dark:text-primary-400">
                SKU: {row.sku}
              </span>
              {row.brand && (
                <span className="text-[11px] text-slate-400 font-medium">
                  • {row.brand}
                </span>
              )}
            </div>
            {/* Clickable gallery link if multiple or extra photos exist */}
            {row.images && row.images.length > 1 ? (
              <button
                type="button"
                onClick={() => {
                  setGalleryProduct(row);
                  setSelectedImageIndex(0);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600 dark:text-primary-400 hover:underline mt-1 bg-primary-50 dark:bg-primary-950/50 px-1.5 py-0.5 rounded border border-primary-200 dark:border-primary-800/50"
              >
                <ImageIcon className="w-3 h-3" />
                <span>{row.images.length} photos (View Gallery)</span>
              </button>
            ) : row.images && row.images.length === 1 ? (
              <button
                type="button"
                onClick={() => {
                  setGalleryProduct(row);
                  setSelectedImageIndex(0);
                }}
                className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 mt-0.5"
              >
                <Eye className="w-2.5 h-2.5" /> 1 photo
              </button>
            ) : null}
          </div>
        </div>
      )
    },
    {
      header: 'Category',
      render: (row) => (
        <span className="text-xs font-semibold px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md">
          {row.category?.name || 'General'}
        </span>
      )
    },
    {
      header: 'Variants',
      render: (row) => (
        <Badge variant="neutral" size="sm">
          <Layers className="w-3 h-3 mr-1" /> {row.variants?.length || 1} {row.variants?.length === 1 ? 'variant' : 'variants'}
        </Badge>
      )
    },
    {
      header: 'Pricing',
      render: (row) => (
        <div>
          <span className="font-extrabold text-slate-900 dark:text-white text-sm">₹{row.sellingPrice}</span>
          {row.costPrice > 0 && <span className="text-[11px] text-slate-400 block font-medium">Cost: ₹{row.costPrice}</span>}
        </div>
      )
    },
    {
      header: 'Total Quantity / Stock',
      render: (row) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className={`text-sm font-black ${
              row.availableStock === 0 ? 'text-rose-600' :
              row.availableStock <= 15 ? 'text-amber-600' : 'text-emerald-600'
            }`}>
              {row.availableStock} Units
            </span>
            <Badge
              variant={row.availableStock === 0 ? 'danger' : row.availableStock <= 15 ? 'warning' : 'success'}
              size="sm"
            >
              {row.availableStock === 0 ? 'Out of Stock' : row.availableStock <= 15 ? 'Low Stock' : 'In Stock'}
            </Badge>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Total Physical: {row.totalStock || row.availableStock} pcs
          </span>
        </div>
      )
    },
    {
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'active' ? 'success' : 'neutral'} size="sm">
          {row.status}
        </Badge>
      )
    },
    {
      header: 'Actions',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => {
              setGalleryProduct(row);
              setSelectedImageIndex(0);
            }}
            title="View Photo Gallery"
            className="p-1.5 text-slate-400 hover:text-primary-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleOpenEdit(row)}
            title="Edit Product & Photos"
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteProduct(row._id)}
            title="Delete Product"
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Product Catalog</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage product specifications, photo uploads, initial quantities, and centralized stock initialization.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleOpenAddCategory} variant="outline" size="sm">
            <Layers className="w-3.5 h-3.5 mr-1" /> New Category
          </Button>
          <Button onClick={handleOpenAdd} size="sm">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Product
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('products')}
          className={`pb-2.5 text-xs font-bold transition-colors border-b-2 ${
            activeTab === 'products'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          All Products ({pagination?.total || products.length})
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-2.5 text-xs font-bold transition-colors border-b-2 ${
            activeTab === 'categories'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Categories ({categories.length})
        </button>
      </div>

      {activeTab === 'products' ? (
        <DataTable
          columns={columns}
          data={products}
          loading={loading}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search product by title, SKU, brand..."
          pagination={pagination}
          onPageChange={setPage}
          actions={
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Category Search & Counter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="Search categories by name, desc..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-primary-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">
                Total Categories: <strong className="text-white">{filteredCategories.length}</strong>
              </span>
              <Button onClick={handleOpenAddCategory} size="sm" variant="outline">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Category
              </Button>
            </div>
          </div>

          {/* Category Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredCategories.map((cat) => (
              <div
                key={cat._id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs hover:border-slate-700 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-primary-400 transition-colors">
                      {cat.name}
                    </h4>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant={cat.status === 'active' ? 'success' : 'neutral'} size="sm">
                        {cat.status}
                      </Badge>
                      <button
                        onClick={(e) => handleOpenEditCategory(cat, e)}
                        className="p-1 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-md transition-colors"
                        title="Edit Category"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCategoryToDelete(cat);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 min-h-[32px]">
                    {cat.description || 'No description provided'}
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <button
                    onClick={() => {
                      setSelectedCategory(cat._id);
                      setActiveTab('products');
                    }}
                    className="font-semibold text-primary-500 hover:text-primary-400 transition-colors flex items-center gap-1"
                    title="Filter products by this category"
                  >
                    <span>{cat.productCount || 0} associated products</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleOpenEditCategory(cat, e)}
                      className="px-2 py-1 rounded-md text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1"
                    >
                      <Edit className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCategoryToDelete(cat);
                      }}
                      className="px-2 py-1 rounded-md text-[11px] font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredCategories.length === 0 && (
            <div className="text-center py-12 bg-slate-900/40 border border-slate-800 rounded-xl">
              <Layers className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">No categories found</p>
              <p className="text-xs text-slate-500 mt-1">Try another search or create a new category.</p>
              <Button onClick={handleOpenAddCategory} size="sm" className="mt-4">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Category
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Product Creation / Edit Modal with Photo Upload & Quantity Config */}
      <Modal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        title={editingProduct ? 'Edit Product Details & Photo' : 'Add New Product (Photo & Initial Stock)'}
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleSaveProduct} className="space-y-5">
          {/* SECTION 1: PRODUCT PHOTOS UPLOAD */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-primary-600" /> Product Photos & Gallery
                </h4>
                <p className="text-[11px] text-slate-400">
                  Upload product photo directly (Cloudinary CDN or local storage fallback).
                </p>
              </div>
              {uploadingImage && (
                <span className="text-xs text-primary-600 font-semibold flex items-center gap-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading image...
                </span>
              )}
            </div>

            {/* Uploaded Images Gallery Preview */}
            <div className="space-y-2">
              <div className="flex flex-wrap gap-3 items-center">
                {formData.images && formData.images.map((img, idx) => (
                  <div
                    key={idx}
                    className={`relative group w-24 h-24 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm border-2 transition-all ${
                      idx === 0
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'border-slate-300 dark:border-slate-700 hover:border-primary-400'
                    }`}
                  >
                    <img src={img.url} alt="Product preview" className="w-full h-full object-cover" />
                    
                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full opacity-90 hover:opacity-100 transition-opacity shadow-sm z-10"
                      title="Remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>

                    {/* Promote to Main button for extra photos */}
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => handleMakeMainImage(idx)}
                        className="absolute top-1 left-1 p-1 bg-slate-900/80 hover:bg-emerald-600 text-white rounded-full opacity-90 hover:opacity-100 transition-all shadow-sm z-10"
                        title="Set as Main Photo"
                      >
                        <Star className="w-3 h-3" />
                      </button>
                    )}

                    {/* Badge */}
                    <div className="absolute bottom-0 inset-x-0">
                      {idx === 0 ? (
                        <span className="block bg-emerald-600 text-[9px] text-white text-center font-black py-0.5 shadow-sm">
                          ⭐ Main Photo
                        </span>
                      ) : (
                        <span className="block bg-slate-900/80 backdrop-blur-xs text-[9px] text-slate-200 text-center font-semibold py-0.5">
                          Extra #{idx + 1}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {/* Upload Trigger Button */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageFileUpload}
                  className="hidden"
                  id="product-photo-upload"
                />
                <label
                  htmlFor="product-photo-upload"
                  className="w-24 h-24 border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-primary-500 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-primary-600 cursor-pointer transition-colors bg-white dark:bg-slate-900"
                >
                  <Upload className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-bold">+ Upload Photo</span>
                </label>

                {/* URL fallback */}
                <div className="flex-1 min-w-[220px] flex items-center gap-2 pl-2">
                  <input
                    type="url"
                    placeholder="Or paste image URL (https://...)"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <Button type="button" size="sm" variant="secondary" onClick={handleAddImageUrl}>
                    Add URL
                  </Button>
                </div>
              </div>

              {/* Explanatory helper guide */}
              {formData.images?.length > 0 && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Main Photo (#1)</span> catalog table aur order screen me thumbnail banegi. Baaki <span className="font-semibold text-primary-600 dark:text-primary-400">Extra Photos</span> product gallery lightbox me slide hoke dikhengi. Kisi bhi extra photo par ⭐ click karke use Main Photo bana sakte hain.
                </p>
              )}
            </div>
          </div>

          {/* SECTION 2: BASIC PRODUCT INFO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Product Title *"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Cotton Printed Baby Romper"
            />
            <Input
              label="Master SKU *"
              required
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
              placeholder="e.g. BB-CLOTH-01"
              disabled={Boolean(editingProduct)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Brand / Manufacturer"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              placeholder="e.g. BabyCare"
            />
            <Select
              label="Category *"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </Select>
            <Input
              label="HSN Code"
              value={formData.hsnCode}
              onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
              placeholder="61112000"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Input
              label="Selling Price (₹) *"
              type="number"
              required
              value={formData.sellingPrice}
              onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
              placeholder="499"
            />
            <Input
              label="Cost Price (₹)"
              type="number"
              value={formData.costPrice}
              onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
              placeholder="200"
            />
            <Input
              label="MRP (₹)"
              type="number"
              value={formData.mrp}
              onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
              placeholder="999"
            />
            <Input
              label="GST Tax (%)"
              type="number"
              value={formData.gst}
              onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
            />
          </div>

          {/* SECTION 3: INVENTORY STOCK / QUANTITY (KITNA ADD KARNA HAI) */}
          {!editingProduct && (
            <div className="p-4 bg-primary-50/40 dark:bg-primary-950/20 rounded-xl border border-primary-200 dark:border-primary-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-primary-200/60 dark:border-primary-800/60 pb-3">
                <div>
                  <h4 className="text-xs font-bold uppercase text-primary-800 dark:text-primary-200 flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-primary-600" /> Kitna Product Add Karna Hai (Initial Stock / Quantity) *
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Choose whether this is a single item or has multiple sizes/colors.
                  </p>
                </div>

                {/* Single vs Variant Toggle */}
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setProductType('simple')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                      productType === 'simple'
                        ? 'bg-primary-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Standard (Single Stock)
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductType('variants')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                      productType === 'variants'
                        ? 'bg-primary-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Multi-Variant (Sizes/Colors)
                  </button>
                </div>
              </div>

              {productType === 'simple' ? (
                /* SINGLE PRODUCT INITIAL QUANTITY INPUT */
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div className="sm:col-span-2">
                    <Input
                      label="Initial Quantity / Stock Added (Pcs / Units) *"
                      type="number"
                      min="0"
                      required
                      value={formData.initialStock}
                      onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
                      placeholder="e.g. 50"
                      helperText="Total units that will immediately be credited to the Central Inventory balance."
                    />
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-primary-200 dark:border-primary-800 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Quantity Added</span>
                    <span className="text-xl font-black text-emerald-600">
                      {formData.initialStock || 0} Pcs
                    </span>
                  </div>
                </div>
              ) : (
                /* MULTI-VARIANT STOCK GRID */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Set individual quantities for each variant:
                    </span>
                    <Button type="button" size="sm" variant="secondary" onClick={handleAddVariantRow}>
                      + Add Variant Row
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {formData.variants.map((v, idx) => (
                      <div key={idx} className="grid grid-cols-5 gap-2 items-center bg-white dark:bg-slate-900 p-2 rounded-lg border text-xs">
                        <input
                          type="text"
                          placeholder="Color (e.g. Blue)"
                          value={v.color}
                          onChange={(e) => {
                            const copy = [...formData.variants];
                            copy[idx].color = e.target.value;
                            setFormData({ ...formData, variants: copy });
                          }}
                          className="p-1.5 border rounded bg-slate-50 dark:bg-slate-800"
                        />
                        <input
                          type="text"
                          placeholder="Size (e.g. 0-3M)"
                          value={v.size}
                          onChange={(e) => {
                            const copy = [...formData.variants];
                            copy[idx].size = e.target.value;
                            setFormData({ ...formData, variants: copy });
                          }}
                          className="p-1.5 border rounded bg-slate-50 dark:bg-slate-800"
                        />
                        <input
                          type="number"
                          placeholder="Price (₹)"
                          value={v.price}
                          onChange={(e) => {
                            const copy = [...formData.variants];
                            copy[idx].price = e.target.value;
                            setFormData({ ...formData, variants: copy });
                          }}
                          className="p-1.5 border rounded bg-slate-50 dark:bg-slate-800"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">Qty:</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="Stock"
                            value={v.initialStock}
                            onChange={(e) => {
                              const copy = [...formData.variants];
                              copy[idx].initialStock = e.target.value;
                              setFormData({ ...formData, variants: copy });
                            }}
                            className="w-full p-1.5 border rounded bg-slate-50 dark:bg-slate-800 font-bold text-emerald-600"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveVariantRow(idx)}
                          className="text-rose-500 hover:text-rose-700 font-bold text-right"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Total summary badge */}
                  <div className="flex justify-end items-center gap-2 pt-2 text-xs">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Total Stock Across All Variants:</span>
                    <span className="font-black text-emerald-600 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      {calculateTotalVariantStock()} Units
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" onClick={() => setShowProductModal(false)}>Cancel</Button>
            <Button type="submit">
              {editingProduct ? 'Update Product & Photos' : `Save Product (${calculateTotalVariantStock()} Units)`}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Category Creation / Edit Modal */}
      <Modal
        isOpen={showCategoryModal}
        onClose={() => {
          setShowCategoryModal(false);
          setEditingCategory(null);
        }}
        title={editingCategory ? `Edit Category: ${editingCategory.name}` : 'Create New Category'}
      >
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <Input
            label="Category Name *"
            required
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder="e.g. Footwear & Shoes"
          />
          <Input
            label="Description"
            value={categoryDesc}
            onChange={(e) => setCategoryDesc(e.target.value)}
            placeholder="Casual, formal, sports footwear and sneakers"
          />
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Status
            </label>
            <select
              value={categoryStatus}
              onChange={(e) => setCategoryStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-primary-500"
            >
              <option value="active">Active (Visible in Catalog)</option>
              <option value="inactive">Inactive (Hidden)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCategoryModal(false);
                setEditingCategory(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={savingCategory}>
              {editingCategory ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Category Confirmation Modal */}
      <Modal
        isOpen={Boolean(categoryToDelete)}
        onClose={() => setCategoryToDelete(null)}
        title="Delete Category Confirmation"
      >
        {categoryToDelete && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
              <div>
                <p className="font-bold text-rose-300 text-sm">
                  Delete "{categoryToDelete.name}"?
                </p>
                <p className="mt-1 leading-relaxed text-slate-300">
                  Are you sure you want to delete this category? This action will remove the category classification.
                </p>
                {categoryToDelete.productCount > 0 && (
                  <p className="mt-2 text-amber-400 font-semibold bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                    ⚠️ Note: There are currently {categoryToDelete.productCount} product(s) assigned to this category.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCategoryToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-rose-600 hover:bg-rose-700 text-white font-medium"
                loading={deletingCategory}
                onClick={handleDeleteCategory}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Category
              </Button>
            </div>
          </div>
        )}
      </Modal>
      {/* Photo Gallery Lightbox Modal */}
      <Modal
        isOpen={Boolean(galleryProduct)}
        onClose={() => setGalleryProduct(null)}
        title={
          galleryProduct ? (
            <div className="flex items-center justify-between w-full pr-6">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-primary-500" />
                <span className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-md">
                  {galleryProduct.name} - Photos & Gallery
                </span>
              </div>
              <Badge variant="neutral" size="sm">
                Photo {selectedImageIndex + 1} of {galleryProduct.images?.length || 1}
              </Badge>
            </div>
          ) : ''
        }
        maxWidth="max-w-3xl"
      >
        {galleryProduct && (
          <div className="space-y-4">
            {/* Main High-Res Image Viewport */}
            <div className="relative w-full h-80 sm:h-96 rounded-2xl bg-slate-950 flex items-center justify-center overflow-hidden border border-slate-800 shadow-inner group">
              {galleryProduct.images && galleryProduct.images.length > 0 ? (
                <img
                  src={galleryProduct.images[selectedImageIndex]?.url || galleryProduct.images[0]?.url}
                  alt={galleryProduct.name}
                  className="max-w-full max-h-full object-contain select-none transition-all duration-300"
                />
              ) : (
                <div className="text-center text-slate-500">
                  <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No photos uploaded for this product.</p>
                </div>
              )}

              {/* Tag: Main vs Extra */}
              {galleryProduct.images && galleryProduct.images.length > 0 && (
                <div className="absolute top-3 left-3">
                  {selectedImageIndex === 0 ? (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-600/90 backdrop-blur-md text-white shadow-lg flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 fill-current" /> Main Display Photo
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900/90 backdrop-blur-md text-slate-200 border border-slate-700 shadow-lg flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5" /> Extra Photo #{selectedImageIndex + 1}
                    </span>
                  )}
                </div>
              )}

              {/* Prev / Next buttons if > 1 photo */}
              {galleryProduct.images && galleryProduct.images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedImageIndex((prev) =>
                        prev > 0 ? prev - 1 : galleryProduct.images.length - 1
                      )
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white shadow-lg border border-slate-700 transition-transform active:scale-90"
                    title="Previous photo"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedImageIndex((prev) =>
                        prev < galleryProduct.images.length - 1 ? prev + 1 : 0
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white shadow-lg border border-slate-700 transition-transform active:scale-90"
                    title="Next photo"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Carousel / Filmstrip */}
            {galleryProduct.images && galleryProduct.images.length > 1 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  All Photos ({galleryProduct.images.length}) - Click any thumbnail to preview full size:
                </p>
                <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                  {galleryProduct.images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                        selectedImageIndex === idx
                          ? 'border-primary-500 ring-2 ring-primary-500/40 scale-105 shadow-md'
                          : 'border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100 hover:scale-100'
                      }`}
                    >
                      <img
                        src={img.url}
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <span
                        className={`absolute bottom-0 inset-x-0 text-[8px] font-black py-0.5 text-center ${
                          idx === 0
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-900/85 text-slate-200'
                        }`}
                      >
                        {idx === 0 ? 'Main' : `Extra #${idx + 1}`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Product Meta & Direct Action Link */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  SKU:{' '}
                  <strong className="text-slate-900 dark:text-white font-mono">
                    {galleryProduct.sku}
                  </strong>
                </span>
                <span>
                  Price:{' '}
                  <strong className="text-slate-900 dark:text-white">
                    ₹{galleryProduct.sellingPrice}
                  </strong>
                </span>
                <span>
                  Available Stock:{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    {galleryProduct.availableStock} Units
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const prod = galleryProduct;
                    setGalleryProduct(null);
                    handleOpenEdit(prod);
                  }}
                >
                  <Edit className="w-3.5 h-3.5 mr-1" /> Edit / Add More Photos
                </Button>
                <Button size="sm" variant="outline" onClick={() => setGalleryProduct(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
