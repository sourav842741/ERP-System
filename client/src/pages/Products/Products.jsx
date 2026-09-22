import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Plus, Edit, Trash2, Layers, Image as ImageIcon,
  CheckCircle, XCircle, Search, Filter, Upload,
  Boxes, AlertTriangle, Eye, Sparkles, Loader2, X,
  ChevronLeft, ChevronRight, Star, FileSpreadsheet, Download,
  Check, CheckCheck, UploadCloud
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

  // Bulk Excel Upload State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkStats, setBulkStats] = useState({ totalRows: 0, parentCount: 0, variantCount: 0, totalStock: 0 });
  const [bulkWarehouseId, setBulkWarehouseId] = useState('');
  const [uploadingBulk, setUploadingBulk] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const bulkFileInputRef = useRef(null);

  // Variant Bulk Quick-Fill State
  const [bulkApplyPrice, setBulkApplyPrice] = useState('');
  const [bulkApplyStock, setBulkApplyStock] = useState('');

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
    const hasMultipleVariants = product.variants && (
      product.variants.length > 1 ||
      product.variants.some((v) => (v.size && v.size !== 'Standard') || (v.color && v.color !== 'Default'))
    );
    setProductType(hasMultipleVariants ? 'variants' : 'simple');

    const mappedVariants = (product.variants || []).map((v) => ({
      _id: v._id,
      color: v.color || '',
      size: v.size || '',
      price: v.price || product.sellingPrice || '',
      sku: v.sku || '',
      initialStock: v.stock?.availableStock !== undefined ? v.stock.availableStock : (v.stock?.physicalStock || 0)
    }));

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
      variants: mappedVariants.length > 0 ? mappedVariants : [
        { color: 'Black', size: 'M', price: product.sellingPrice || '', initialStock: 25, sku: '' },
        { color: 'Black', size: 'L', price: product.sellingPrice || '', initialStock: 25, sku: '' }
      ]
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

  // --- EXCEL BULK UPLOAD HANDLERS ---
  const handleDownloadTemplate = () => {
    const headers = [
      'Image URL',
      'Product Title *',
      'Master SKU (Parent) *',
      'Category *',
      'Brand / Manufacturer',
      'HSN Code *',
      'Variant Size',
      'Variant Color',
      'Variant SKU (Picker Barcode) [AUTO]',
      'Cost Price (₹)',
      'Selling Price (₹) *',
      'Variant Price (₹)',
      'MRP (₹) *',
      'GST Tax (%) *',
      'Stock Qty *'
    ];

    const sampleRows = [
      [
        'https://res.cloudinary.com/czb80riv/image/upload/v1790092926/erp_media_gallery/w4ys7f1gsafe4qje9o9i.png',
        'Shinchan Classic Ceramic Coffee Mug',
        'MUM-01',
        'Home & Kitchen',
        'Deep Enterprises',
        '691200',
        '',
        '',
        'MUM01',
        150,
        399,
        399,
        599,
        18,
        50
      ],
      [
        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800',
        'Men Oversized Cotton T-Shirt',
        'T10',
        'Apparel & Fashion',
        'Deep Enterprises',
        '61091000',
        'S',
        'Black',
        'S-T10-BLK',
        300,
        699,
        699,
        1299,
        5,
        20
      ],
      [
        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800',
        'Men Oversized Cotton T-Shirt',
        'T10',
        'Apparel & Fashion',
        'Deep Enterprises',
        '61091000',
        'M',
        'Black',
        'M-T10-BLK',
        300,
        699,
        699,
        1299,
        5,
        20
      ],
      [
        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800',
        'Men Oversized Cotton T-Shirt',
        'T10',
        'Apparel & Fashion',
        'Deep Enterprises',
        '61091000',
        'L',
        'Black',
        'L-T10-BLK',
        300,
        699,
        699,
        1299,
        5,
        25
      ],
      [
        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800',
        'Men Oversized Cotton T-Shirt',
        'T10',
        'Apparel & Fashion',
        'Deep Enterprises',
        '61091000',
        'XL',
        'Black',
        'XL-T10-BLK',
        300,
        699,
        699,
        1299,
        5,
        25
      ],
      [
        'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800',
        'Men Slim Fit Cotton Shirt',
        'SH05',
        'Apparel & Fashion',
        'Deep Enterprises',
        '62052000',
        'M',
        'Navy Blue',
        'M-SH05-NVY',
        400,
        899,
        899,
        1499,
        5,
        15
      ],
      [
        'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800',
        'Men Slim Fit Cotton Shirt',
        'SH05',
        'Apparel & Fashion',
        'Deep Enterprises',
        '62052000',
        'L',
        'Navy Blue',
        'L-SH05-NVY',
        400,
        899,
        899,
        1499,
        5,
        15
      ],
      [
        'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800',
        'Men Windproof Bomber Jacket',
        'JK05',
        'Apparel & Fashion',
        'Deep Enterprises',
        '62019300',
        'XL',
        'Black',
        'XL-JK05-BLK',
        750,
        1699,
        1699,
        2699,
        12,
        10
      ],
      [
        'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800',
        'Printed T-Shirt',
        'T265',
        'Apparel & Fashion',
        'Deep Enterprises',
        '61091000',
        'S',
        'Black',
        'S-T265-BLK',
        450,
        1099,
        1099,
        1899,
        5,
        10
      ],
      [
        'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800',
        'Printed T-Shirt',
        'T265',
        'Apparel & Fashion',
        'Deep Enterprises',
        '61091000',
        'M',
        'Black',
        'M-T265-BLK',
        450,
        1099,
        1099,
        1899,
        5,
        10
      ],
      [
        'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800',
        'Printed T-Shirt',
        'T265',
        'Apparel & Fashion',
        'Deep Enterprises',
        '61091000',
        'L',
        'Black',
        'L-T265-BLK',
        450,
        1099,
        1099,
        1899,
        5,
        10
      ],
      [
        'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800',
        'Printed T-Shirt',
        'T265',
        'Apparel & Fashion',
        'Deep Enterprises',
        '61091000',
        'XL',
        'Black',
        'XL-T265-BLK',
        450,
        1099,
        1099,
        1899,
        5,
        10
      ],
      [
        'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800',
        'Printed T-Shirt',
        'T265',
        'Apparel & Fashion',
        'Deep Enterprises',
        '61091000',
        'XXL',
        'Black',
        'XXL-T265-BLK',
        450,
        1099,
        1099,
        1899,
        5,
        10
      ],
      [
        'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800',
        'Printed T-Shirt',
        'T265',
        'Apparel & Fashion',
        'Deep Enterprises',
        '61091000',
        '3XL',
        'Black',
        '3XL-T265-BLK',
        450,
        1099,
        1099,
        1899,
        5,
        10
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    ws['!cols'] = [
      { wch: 32 }, // Image URL
      { wch: 30 }, // Title
      { wch: 20 }, // Master SKU
      { wch: 18 }, // Category
      { wch: 18 }, // Brand
      { wch: 14 }, // HSN
      { wch: 12 }, // Size
      { wch: 12 }, // Color
      { wch: 24 }, // Variant SKU
      { wch: 14 }, // Cost
      { wch: 16 }, // Sell
      { wch: 16 }, // Var Price
      { wch: 12 }, // MRP
      { wch: 12 }, // GST
      { wch: 12 }  // Stock
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products_Upload');
    XLSX.writeFile(wb, 'erp_master_inventory_upload_dynamic.xlsx');
  };

  // Export entire product catalog with all variants and sizes to Excel
  const handleExportCatalog = () => {
    if (!products || products.length === 0) {
      alert('No products available to export.');
      return;
    }

    const headers = [
      'Image URL',
      'Product Title *',
      'Master SKU (Parent) *',
      'Category *',
      'Brand / Manufacturer',
      'HSN Code *',
      'Variant Size',
      'Variant Color',
      'Variant SKU (Picker Barcode) [AUTO]',
      'Cost Price (₹)',
      'Selling Price (₹) *',
      'Variant Price (₹)',
      'MRP (₹) *',
      'GST Tax (%) *',
      'Stock Qty *'
    ];

    const rows = [];
    products.forEach((p) => {
      const vars = p.variants || [];
      if (vars.length > 0) {
        vars.forEach((v) => {
          rows.push([
            v.images?.[0]?.url || p.images?.[0]?.url || '',
            p.name,
            p.sku,
            p.category?.name || 'General',
            p.brand || '',
            p.hsnCode || '6203',
            v.size || '',
            v.color || '',
            v.sku || '',
            v.costPrice || p.costPrice || 0,
            p.sellingPrice,
            v.price || p.sellingPrice,
            p.mrp || p.sellingPrice,
            p.gst || 18,
            v.stock?.availableStock !== undefined ? v.stock.availableStock : (v.stock?.physicalStock || 0)
          ]);
        });
      } else {
        rows.push([
          p.images?.[0]?.url || '',
          p.name,
          p.sku,
          p.category?.name || 'General',
          p.brand || '',
          p.hsnCode || '6203',
          '',
          '',
          p.sku,
          p.costPrice || 0,
          p.sellingPrice,
          p.sellingPrice,
          p.mrp || p.sellingPrice,
          p.gst || 18,
          p.availableStock || 0
        ]);
      }
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [
      { wch: 32 }, { wch: 30 }, { wch: 20 }, { wch: 18 }, { wch: 18 },
      { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 24 }, { wch: 14 },
      { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Product_Catalog_Export');
    XLSX.writeFile(wb, `erp_product_catalog_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleBulkFileParse = (file) => {
    if (!file) return;
    setBulkFile(file);
    setBulkResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames.includes('Products_Upload')
          ? 'Products_Upload'
          : workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          alert('Excel sheet is empty or contains no valid rows.');
          return;
        }

        const normalized = rawJson.map((row, idx) => {
          const sku = (row['Master SKU (Parent) *'] || row['Master SKU (Parent)'] || row['Master SKU'] || row.sku || '').toString().trim();
          const title = (row['Product Title *'] || row['Product Title'] || row.name || row.title || '').toString().trim();
          const category = (row['Category *'] || row['Category'] || row.category || 'General').toString().trim();
          const brand = (row['Brand / Manufacturer'] || row['Brand'] || row.brand || '').toString().trim();
          const hsnCode = (row['HSN Code *'] || row['HSN Code'] || row.hsnCode || '').toString().trim();
          const variantSize = (row['Variant Size'] || row.variantSize || '').toString().trim();
          const variantColor = (row['Variant Color'] || row.variantColor || '').toString().trim();
          const variantSku = (row['Variant SKU (Picker Barcode) [AUTO]'] || row['Variant SKU'] || row.variantSku || '').toString().trim();
          const costPrice = Number(row['Cost Price (₹)'] || row.costPrice || 0);
          const sellingPrice = Number(row['Selling Price (₹) *'] || row['Selling Price (₹)'] || row.sellingPrice || 0);
          const variantPrice = Number(row['Variant Price (₹)'] || row.variantPrice || sellingPrice);
          const mrp = Number(row['MRP (₹) *'] || row['MRP (₹)'] || row.mrp || sellingPrice);
          const gst = Number(row['GST Tax (%) *'] || row['GST Tax (%)'] || row.gst || 18);
          const stockQty = Number(row['Stock Qty *'] || row['Stock Qty'] || row.stockQty || 0);
          const imageUrl = (row['Image URL'] || row.imageUrl || '').toString().trim();

          const missingFields = [];
          if (!sku) missingFields.push('Master SKU');
          if (!title) missingFields.push('Product Title');
          if (sellingPrice <= 0) missingFields.push('Selling Price');

          return {
            rowNum: idx + 2,
            sku,
            title,
            category,
            brand,
            hsnCode,
            variantSize,
            variantColor,
            variantSku: variantSku || (variantSize || variantColor ? `${sku}-${variantColor || 'V'}-${variantSize || (idx + 1)}` : sku),
            costPrice,
            sellingPrice,
            variantPrice,
            mrp,
            gst,
            stockQty,
            imageUrl,
            missingFields,
            isValid: missingFields.length === 0
          };
        });

        const parentSkus = new Set(normalized.map((r) => r.sku).filter(Boolean));
        const totalStock = normalized.reduce((sum, r) => sum + (r.stockQty || 0), 0);
        const variantsCount = normalized.filter((r) => r.variantSize || r.variantColor).length;

        setBulkRows(normalized);
        setBulkStats({
          totalRows: normalized.length,
          parentCount: parentSkus.size,
          variantCount: variantsCount,
          totalStock
        });
      } catch (err) {
        alert('Failed to parse Excel file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmBulkUpload = async () => {
    if (!bulkRows.length) return;
    const invalidCount = bulkRows.filter((r) => !r.isValid).length;
    if (invalidCount > 0) {
      if (!window.confirm(`${invalidCount} row(s) have missing required fields. Proceed anyway with valid rows?`)) {
        return;
      }
    }

    setUploadingBulk(true);
    try {
      const res = await api.post('/products/bulk-upload', {
        rows: bulkRows.filter((r) => r.isValid),
        warehouseId: bulkWarehouseId || warehouses[0]?._id
      });

      if (res.data.success) {
        setBulkResult(res.data.data);
        await fetchProducts();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setUploadingBulk(false);
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
      header: 'Variants & Sizes',
      render: (row) => {
        const variants = row.variants || [];
        const hasSpecificVariants = variants.length > 1 || variants.some((v) => (v.size && v.size !== 'Standard') || (v.color && v.color !== 'Default'));

        if (!hasSpecificVariants || variants.length === 0) {
          return (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-block w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600"></span>
              <span className="text-slate-500 font-medium">Standard (Single)</span>
            </div>
          );
        }

        return (
          <div className="space-y-1.5 max-w-[280px]">
            <div className="flex items-center gap-1.5">
              <Badge variant="neutral" size="sm" className="font-bold">
                <Layers className="w-3 h-3 mr-1 text-primary-500" /> {variants.length} {variants.length === 1 ? 'Variant' : 'Sizes / Variants'}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1">
              {variants.slice(0, 4).map((v, i) => {
                const stockQty = v.stock?.availableStock !== undefined ? v.stock.availableStock : (v.stock?.physicalStock || 0);
                const isOut = stockQty <= 0;
                return (
                  <span
                    key={v._id || i}
                    title={`${v.color ? v.color + ' • ' : ''}Size: ${v.size || 'Std'} | Stock: ${stockQty} pcs | SKU: ${v.sku || 'N/A'}`}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold border transition-all ${
                      isOut
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {v.color && (
                      <span className="text-[10px] text-slate-400 font-normal">{v.color}</span>
                    )}
                    <span className="font-bold text-slate-900 dark:text-slate-100">{v.size || 'Std'}</span>
                    <span className={`text-[10px] px-1 rounded font-black ${
                      isOut ? 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                    }`}>
                      {stockQty}
                    </span>
                  </span>
                );
              })}
              {variants.length > 4 && (
                <span
                  title={variants.slice(4).map((v) => `${v.color ? v.color + ' ' : ''}${v.size || 'Std'}: ${v.stock?.availableStock || 0} pcs`).join(', ')}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800 cursor-help"
                >
                  +{variants.length - 4} more
                </span>
              )}
            </div>
          </div>
        );
      }
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
      render: (row) => {
        const minThreshold = row.minimumStock ?? 10;
        const isOutOfStock = row.availableStock === 0;
        const isLowStock = row.availableStock > 0 && row.availableStock <= minThreshold;

        return (
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`text-sm font-black ${
                isOutOfStock ? 'text-rose-600' :
                isLowStock ? 'text-amber-600' : 'text-emerald-600'
              }`}>
                {row.availableStock} Units
              </span>
              <Badge
                variant={isOutOfStock ? 'danger' : isLowStock ? 'warning' : 'success'}
                size="sm"
              >
                {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
              </Badge>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Total Physical: {row.totalStock || row.availableStock} pcs
            </span>
          </div>
        );
      }
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
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={handleDownloadTemplate}
            variant="outline"
            size="sm"
            className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Download sample Excel spreadsheet template"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" /> Excel Template
          </Button>
          <Button
            type="button"
            onClick={handleExportCatalog}
            variant="outline"
            size="sm"
            className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Export all products, sizes, colors and stock to Excel file"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-blue-600 dark:text-blue-400" /> Export Catalog
          </Button>
          <Button
            type="button"
            onClick={() => {
              setBulkFile(null);
              setBulkRows([]);
              setBulkResult(null);
              setBulkWarehouseId(warehouses[0]?._id || '');
              setShowBulkModal(true);
            }}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
            title="Bulk import products from Excel sheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Bulk Excel Upload
          </Button>
          <Button onClick={handleOpenAddCategory} variant="outline" size="sm">
            <Layers className="w-3.5 h-3.5 mr-1" /> New Category
          </Button>
          <Button onClick={handleOpenAdd} size="sm" className="bg-primary-600 hover:bg-primary-700 text-white">
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

          {/* SECTION 3: INVENTORY STOCK / QUANTITY & VARIANTS (SIZES/COLORS) */}
          <div className="p-4 bg-primary-50/40 dark:bg-primary-950/20 rounded-xl border border-primary-200 dark:border-primary-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-primary-200/60 dark:border-primary-800/60 pb-3">
              <div>
                <h4 className="text-xs font-bold uppercase text-primary-800 dark:text-primary-200 flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-primary-600" />
                  {editingProduct
                    ? 'Product Stock & Variants (Sizes: S, M, L, XL / Colors)'
                    : 'Kitna Product Add Karna Hai (Initial Stock / Quantity) *'}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {editingProduct
                    ? 'Edit sizes, colors, prices, and live inventory stock for this item.'
                    : 'Choose whether this is a single item or has multiple sizes/colors.'}
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
              /* SINGLE PRODUCT INITIAL / CURRENT QUANTITY INPUT */
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div className="sm:col-span-2">
                  <Input
                    label={editingProduct ? "Current Stock (Pcs / Units) *" : "Initial Quantity / Stock Added (Pcs / Units) *"}
                    type="number"
                    min="0"
                    required
                    value={formData.initialStock}
                    onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
                    placeholder="e.g. 50"
                    helperText="Total units that will immediately be updated in Central Inventory balance."
                  />
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-primary-200 dark:border-primary-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Quantity</span>
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
                    Sizes, Colors & Stock Quantities:
                  </span>
                  <Button type="button" size="sm" variant="secondary" onClick={handleAddVariantRow}>
                    + Add Size / Variant
                  </Button>
                </div>

                {/* Bulk Variant Quick-Fill Bar */}
                {formData.variants.length > 1 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-100/90 dark:bg-slate-800/90 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      ⚡ Quick Bulk-Apply to All Sizes:
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          placeholder="Price (₹)"
                          value={bulkApplyPrice}
                          onChange={(e) => setBulkApplyPrice(e.target.value)}
                          className="w-24 p-1.5 text-xs border rounded bg-white dark:bg-slate-900 font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!bulkApplyPrice) return;
                            setFormData((prev) => ({
                              ...prev,
                              variants: prev.variants.map((v) => ({ ...v, price: bulkApplyPrice }))
                            }));
                          }}
                          className="px-2 py-1 text-[11px] font-bold bg-primary-600 hover:bg-primary-700 text-white rounded transition-colors"
                        >
                          Set Price
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          placeholder="Stock (Qty)"
                          value={bulkApplyStock}
                          onChange={(e) => setBulkApplyStock(e.target.value)}
                          className="w-24 p-1.5 text-xs border rounded bg-white dark:bg-slate-900 font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!bulkApplyStock) return;
                            setFormData((prev) => ({
                              ...prev,
                              variants: prev.variants.map((v) => ({ ...v, initialStock: bulkApplyStock }))
                            }));
                          }}
                          className="px-2 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors"
                        >
                          Set Stock
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Variant Column Headers */}
                <div className="grid grid-cols-12 gap-2 text-[11px] font-bold uppercase text-slate-500 px-2">
                  <div className="col-span-3">Color</div>
                  <div className="col-span-3">Size (e.g. S, M, L, XL)</div>
                  <div className="col-span-3">Price (₹)</div>
                  <div className="col-span-2">Stock (Qty)</div>
                  <div className="col-span-1 text-right">Del</div>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {formData.variants.map((v, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
                      <div className="col-span-3">
                        <input
                          type="text"
                          placeholder="Color (e.g. Blue)"
                          value={v.color}
                          onChange={(e) => {
                            const copy = [...formData.variants];
                            copy[idx].color = e.target.value;
                            setFormData({ ...formData, variants: copy });
                          }}
                          className="w-full p-1.5 border rounded bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          placeholder="Size (e.g. S, M, XL)"
                          value={v.size}
                          onChange={(e) => {
                            const copy = [...formData.variants];
                            copy[idx].size = e.target.value;
                            setFormData({ ...formData, variants: copy });
                          }}
                          className="w-full p-1.5 border rounded bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          placeholder="Price (₹)"
                          value={v.price}
                          onChange={(e) => {
                            const copy = [...formData.variants];
                            copy[idx].price = e.target.value;
                            setFormData({ ...formData, variants: copy });
                          }}
                          className="w-full p-1.5 border rounded bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          min="0"
                          placeholder="Qty"
                          value={v.initialStock}
                          onChange={(e) => {
                            const copy = [...formData.variants];
                            copy[idx].initialStock = e.target.value;
                            setFormData({ ...formData, variants: copy });
                          }}
                          className="w-full p-1.5 border rounded bg-slate-50 dark:bg-slate-800 font-black text-emerald-600 dark:text-emerald-400"
                        />
                      </div>
                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveVariantRow(idx)}
                          className="text-rose-500 hover:text-rose-700 font-bold px-1 py-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Remove variant"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total summary badge */}
                <div className="flex justify-between items-center pt-2 text-xs border-t border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">{formData.variants.length} variant(s) defined</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Total Live Stock:</span>
                    <span className="font-black text-emerald-600 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      {calculateTotalVariantStock()} Units
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" onClick={() => setShowProductModal(false)}>Cancel</Button>
            <Button type="submit">
              {editingProduct ? 'Update Product, Variants & Stock' : `Save Product (${calculateTotalVariantStock()} Units)`}
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

      {/* BULK EXCEL UPLOAD MODAL */}
      <Modal
        isOpen={showBulkModal}
        onClose={() => {
          if (!uploadingBulk) setShowBulkModal(false);
        }}
        title="Bulk Product Import (Excel / CSV)"
        size="2xl"
      >
        <div className="space-y-5">
          {!bulkResult ? (
            <>
              {/* Warehouse Selection & Template Download Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Upload Products Spreadsheet
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Supports 15 dynamic columns (Multi-variants auto-grouped by Master SKU).
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    onClick={handleDownloadTemplate}
                    variant="outline"
                    size="sm"
                    className="text-xs border-emerald-600/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> Download Sample Template (.xlsx)
                  </Button>
                </div>
              </div>

              {/* Target Warehouse Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Credit Initial Stock To Warehouse *
                  </label>
                  <Select
                    value={bulkWarehouseId}
                    onChange={(e) => setBulkWarehouseId(e.target.value)}
                    options={warehouses.map((w) => ({
                      value: w._id,
                      label: `${w.name} (${w.code || 'Primary Hub'})`
                    }))}
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    All `Stock Qty` values will immediately be credited to this facility's Central Inventory balance.
                  </p>
                </div>

                {/* Upload Drag & Drop Trigger */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Spreadsheet File (.xlsx, .xls, .csv) *
                  </label>
                  <input
                    type="file"
                    ref={bulkFileInputRef}
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleBulkFileParse(file);
                    }}
                  />
                  <div
                    onClick={() => bulkFileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl p-3 text-center cursor-pointer bg-slate-50/50 dark:bg-slate-950/50 transition-colors flex items-center justify-center gap-2.5 h-[58px]"
                  >
                    <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                      {bulkFile ? bulkFile.name : 'Click to choose or drop Excel file'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Parsed Stats & Live Preview Table */}
              {bulkRows.length > 0 && (
                <div className="space-y-3">
                  {/* KPI Chips */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="p-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-center">
                      <span className="text-[10px] uppercase font-semibold text-slate-500 block">Total Rows</span>
                      <strong className="text-sm font-bold text-slate-900 dark:text-white">{bulkStats.totalRows}</strong>
                    </div>
                    <div className="p-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-center">
                      <span className="text-[10px] uppercase font-semibold text-slate-500 block">Master Products</span>
                      <strong className="text-sm font-bold text-primary-600 dark:text-primary-400">{bulkStats.parentCount}</strong>
                    </div>
                    <div className="p-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-center">
                      <span className="text-[10px] uppercase font-semibold text-slate-500 block">Variants</span>
                      <strong className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{bulkStats.variantCount}</strong>
                    </div>
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-lg text-center">
                      <span className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 block">Total Stock</span>
                      <strong className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{bulkStats.totalStock} Pcs</strong>
                    </div>
                  </div>

                  {/* Scrollable Preview Table */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                    <div className="max-h-72 overflow-y-auto overflow-x-auto text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          <tr>
                            <th className="p-2.5">Row</th>
                            <th className="p-2.5">Image</th>
                            <th className="p-2.5">Product Title</th>
                            <th className="p-2.5">Master SKU</th>
                            <th className="p-2.5">Category</th>
                            <th className="p-2.5">Variant (Size/Color)</th>
                            <th className="p-2.5">Variant SKU</th>
                            <th className="p-2.5 text-right">Price</th>
                            <th className="p-2.5 text-right">Stock</th>
                            <th className="p-2.5 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 bg-white dark:bg-slate-950">
                          {bulkRows.map((r, i) => (
                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                              <td className="p-2.5 font-mono text-[10px] text-slate-400">{r.rowNum}</td>
                              <td className="p-2.5">
                                {r.imageUrl ? (
                                  <img
                                    src={r.imageUrl}
                                    alt=""
                                    className="w-8 h-8 rounded object-cover border border-slate-200 dark:border-slate-800"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                    <ImageIcon className="w-3.5 h-3.5" />
                                  </div>
                                )}
                              </td>
                              <td className="p-2.5 font-medium text-slate-900 dark:text-white max-w-[160px] truncate" title={r.title}>
                                {r.title || <span className="text-rose-500 font-bold">Missing</span>}
                              </td>
                              <td className="p-2.5 font-mono font-semibold text-primary-600 dark:text-primary-400">
                                {r.sku || <span className="text-rose-500 font-bold">Missing</span>}
                              </td>
                              <td className="p-2.5 text-slate-600 dark:text-slate-400">{r.category || 'General'}</td>
                              <td className="p-2.5 text-slate-600 dark:text-slate-400">
                                {r.variantSize || r.variantColor ? (
                                  <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-mono text-[10px]">
                                    {r.variantSize || '-'}/{r.variantColor || '-'}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[10px]">Single Item</span>
                                )}
                              </td>
                              <td className="p-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">{r.variantSku}</td>
                              <td className="p-2.5 text-right font-medium text-slate-900 dark:text-white">₹{r.variantPrice || r.sellingPrice}</td>
                              <td className="p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">{r.stockQty} Pcs</td>
                              <td className="p-2.5 text-center">
                                {r.isValid ? (
                                  <span className="inline-flex items-center text-emerald-500 text-[10px] font-bold">
                                    <Check className="w-3 h-3 mr-0.5" /> Ready
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-rose-500 text-[10px] font-bold" title={r.missingFields.join(', ')}>
                                    <X className="w-3 h-3 mr-0.5" /> {r.missingFields[0]}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={uploadingBulk}
                  onClick={() => setShowBulkModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={uploadingBulk || bulkRows.length === 0}
                  onClick={handleConfirmBulkUpload}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {uploadingBulk ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing Import...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4 mr-1.5" /> Confirm & Import {bulkRows.length} Row(s)
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            /* Result Screen */
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border-2 border-emerald-500 shadow-md">
                <CheckCheck className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Bulk Product Import Completed!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Products and variants have been generated and stock credited to Central Inventory.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Products</span>
                  <strong className="text-lg font-bold text-slate-900 dark:text-white">{bulkResult.createdProductsCount}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Variants</span>
                  <strong className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{bulkResult.createdVariantsCount}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Credited Stock</span>
                  <strong className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{bulkResult.totalStockCredited} Pcs</strong>
                </div>
              </div>

              {bulkResult.errors && bulkResult.errors.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl text-left text-xs text-amber-700 dark:text-amber-300">
                  <p className="font-semibold mb-1">Warnings / Skips ({bulkResult.errors.length}):</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                    {bulkResult.errors.map((err, idx) => (
                      <li key={idx}>SKU {err.masterSku}: {err.error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-2">
                <Button
                  onClick={() => {
                    setShowBulkModal(false);
                    setBulkResult(null);
                    setBulkRows([]);
                    setBulkFile(null);
                  }}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-medium"
                >
                  View Product Catalog
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
