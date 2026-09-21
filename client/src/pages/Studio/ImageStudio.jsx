import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
  Crop, UploadCloud, Download, Copy, ExternalLink,
  RotateCw, RotateCcw, FlipHorizontal, FlipVertical, RefreshCw,
  Sliders, Image as ImageIcon, CheckCheck, FolderOpen,
  Scissors, PenTool, MousePointer, Undo2, Trash2, Check
} from 'lucide-react';
import api from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

// Aspect Ratio Presets
const ASPECT_PRESETS = [
  { label: 'Freeform', value: undefined, desc: 'Drag any size & dimension' },
  { label: '1:1 Square', value: 1, desc: 'Amazon, Flipkart, Square' },
  { label: '3:4 Portrait', value: 3 / 4, desc: 'Meesho, Myntra, Apparel' },
  { label: '4:3 Standard', value: 4 / 3, desc: 'Catalog Product Card' },
  { label: '16:9 Landscape', value: 16 / 9, desc: 'Website Banner & Hero' },
  { label: '9:16 Story', value: 9 / 16, desc: 'Mobile Reel & Stories' },
];

// Sample demo presets
const SAMPLE_PRESETS = [
  {
    name: 'Sneaker Product',
    url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80'
  },
  {
    name: 'Smart Watch',
    url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80'
  },
  {
    name: 'Wireless Headphones',
    url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'
  }
];

export const ImageStudio = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Studio Mode: 'crop' | 'lasso' | 'photoroom'
  const [activeStudioTab, setActiveStudioTab] = useState('crop');

  // Base Image State
  const [imageSrc, setImageSrc] = useState('');
  const [imageTitle, setImageTitle] = useState('Product Asset');
  const imgRef = useRef(null);

  // --- CROPPER STATE (react-image-crop) ---
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const [aspect, setAspect] = useState(undefined); // undefined = 100% Freeform
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [croppedResultUrl, setCroppedResultUrl] = useState('');

  // --- FREEFORM LASSO / POLYGON CUTOUT STATE ---
  const lassoCanvasRef = useRef(null);
  const [lassoMode, setLassoMode] = useState('freehand'); // 'freehand' | 'polygon'
  const [lassoPoints, setLassoPoints] = useState([]); // Array of { x: 0..1, y: 0..1 }
  const [isDrawingLasso, setIsDrawingLasso] = useState(false);
  const [cutoutResultUrl, setCutoutResultUrl] = useState('');

  // --- PHOTOROOM STATE ---
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeKey, setIframeKey] = useState(1);

  // --- CLOUD MEDIA SAVE MODAL ---
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [cloudFile, setCloudFile] = useState(null);
  const [cloudPreview, setCloudPreview] = useState('');
  const [cloudTitle, setCloudTitle] = useState('Studio Export');
  const [cloudCategory, setCloudCategory] = useState('Products');
  const [cloudTags, setCloudTags] = useState('cutout, transparent');
  const [uploadingToCloud, setUploadingToCloud] = useState(false);
  const [savedCloudUrl, setSavedCloudUrl] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // --- ASSET PICKER MODAL ---
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [existingAssets, setExistingAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  const fileInputRef = useRef(null);
  const cloudDropInputRef = useRef(null);

  // Load initial image
  useEffect(() => {
    if (location.state?.imageUrl) {
      loadImage(location.state.imageUrl, location.state.title || 'Asset');
    } else {
      loadImage(SAMPLE_PRESETS[0].url, SAMPLE_PRESETS[0].name);
    }
  }, [location.state]);

  const loadImage = (url, title = 'Asset') => {
    setImageSrc(url);
    setImageTitle(title);
    setCloudTitle(title);
    setCroppedResultUrl('');
    setCutoutResultUrl('');
    setLassoPoints([]);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setZoom(1);
  };

  const handleFileUpload = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }
    const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const reader = new FileReader();
    reader.onload = (e) => {
      loadImage(e.target.result, cleanTitle);
    };
    reader.readAsDataURL(file);
  };

  // Called when image is loaded in ReactCrop DOM
  const onImageLoad = (e) => {
    imgRef.current = e.currentTarget;
    const { width, height } = e.currentTarget;

    // Initialize crop to 80% center
    const initialCrop = centerCrop(
      aspect
        ? makeAspectCrop({ unit: '%', width: 80 }, aspect, width, height)
        : { unit: '%', width: 80, height: 80, x: 10, y: 10 },
      width,
      height
    );
    setCrop(initialCrop);
    setCompletedCrop(initialCrop);
  };

  // Switch aspect ratio preset
  const handleSelectAspect = (presetValue) => {
    setAspect(presetValue);
    if (!imgRef.current) return;
    const { width, height } = imgRef.current;

    if (presetValue) {
      const newCrop = centerCrop(
        makeAspectCrop({ unit: '%', width: 80 }, presetValue, width, height),
        width,
        height
      );
      setCrop(newCrop);
      setCompletedCrop(newCrop);
    } else {
      // Freeform: keep current crop or set to 80% freeform
      const freeformCrop = {
        unit: '%',
        width: crop?.width || 80,
        height: crop?.height || 80,
        x: crop?.x || 10,
        y: crop?.y || 10
      };
      setCrop(freeformCrop);
      setCompletedCrop(freeformCrop);
    }
  };

  // Generate cropped canvas from react-image-crop
  const generateCroppedCanvas = useCallback(() => {
    const image = imgRef.current;
    if (!image || !completedCrop) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Calculate crop pixel dimensions on original image
    let pixelX = completedCrop.x;
    let pixelY = completedCrop.y;
    let pixelW = completedCrop.width;
    let pixelH = completedCrop.height;

    if (completedCrop.unit === '%') {
      pixelX = (completedCrop.x / 100) * image.naturalWidth;
      pixelY = (completedCrop.y / 100) * image.naturalHeight;
      pixelW = (completedCrop.width / 100) * image.naturalWidth;
      pixelH = (completedCrop.height / 100) * image.naturalHeight;
    } else {
      pixelX = completedCrop.x * scaleX;
      pixelY = completedCrop.y * scaleY;
      pixelW = completedCrop.width * scaleX;
      pixelH = completedCrop.height * scaleY;
    }

    canvas.width = Math.max(1, Math.round(pixelW));
    canvas.height = Math.max(1, Math.round(pixelH));

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    ctx.drawImage(
      image,
      pixelX,
      pixelY,
      pixelW,
      pixelH,
      -canvas.width / 2,
      -canvas.height / 2,
      canvas.width,
      canvas.height
    );
    ctx.restore();

    return canvas;
  }, [completedCrop, rotation, flipH, flipV]);

  // Apply Crop and preview
  const handleApplyCrop = () => {
    const canvas = generateCroppedCanvas();
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setCroppedResultUrl(dataUrl);
  };

  // Download Cropped
  const handleDownloadCropped = (format = 'png') => {
    const canvas = generateCroppedCanvas();
    if (!canvas) return;
    const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
    const link = document.createElement('a');
    link.download = `${imageTitle || 'cropped-asset'}.${format}`;
    link.href = canvas.toDataURL(mime, 0.95);
    link.click();
  };

  // Open Cloud Modal with Cropped Image
  const handleOpenCloudWithCropped = async () => {
    const canvas = generateCroppedCanvas();
    if (!canvas) return;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.95));
    const file = new File([blob], `${imageTitle || 'cropped'}.png`, { type: 'image/png' });
    setCloudFile(file);
    setCloudPreview(canvas.toDataURL('image/png'));
    setSavedCloudUrl('');
    setShowCloudModal(true);
  };

  // --- LASSO CUTOUT CANVAS LOGIC ---
  useEffect(() => {
    if (activeStudioTab !== 'lasso') return;
    drawLassoCanvas();
  }, [activeStudioTab, imageSrc, lassoPoints, isDrawingLasso]);

  const drawLassoCanvas = () => {
    const canvas = lassoCanvasRef.current;
    if (!canvas || !imageSrc) return;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Calculate responsive fit
      const containerWidth = canvas.parentElement?.clientWidth || 700;
      const maxH = 500;
      const aspect = img.width / img.height;
      let renderW = containerWidth;
      let renderH = renderW / aspect;

      if (renderH > maxH) {
        renderH = maxH;
        renderW = renderH * aspect;
      }

      canvas.width = renderW;
      canvas.height = renderH;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, renderW, renderH);

      // Draw Lasso Path
      if (lassoPoints.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = '#38bdf8'; // Clean cyan-blue outline
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);

        const start = lassoPoints[0];
        ctx.moveTo(start.x * renderW, start.y * renderH);

        for (let i = 1; i < lassoPoints.length; i++) {
          ctx.lineTo(lassoPoints[i].x * renderW, lassoPoints[i].y * renderH);
        }

        if (lassoPoints.length > 2 && !isDrawingLasso) {
          ctx.closePath();
          ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
          ctx.fill();
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw points
        ctx.fillStyle = '#ffffff';
        lassoPoints.forEach((p, idx) => {
          ctx.beginPath();
          ctx.arc(p.x * renderW, p.y * renderH, idx === 0 ? 5 : 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });
      }
    };
    img.src = imageSrc;
  };

  const getCanvasCoords = (e) => {
    const canvas = lassoCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
    };
  };

  const handleLassoMouseDown = (e) => {
    const pt = getCanvasCoords(e);
    if (!pt) return;

    if (lassoMode === 'freehand') {
      setIsDrawingLasso(true);
      setLassoPoints([pt]);
    } else {
      // Polygon mode: click points
      setLassoPoints((prev) => [...prev, pt]);
    }
  };

  const handleLassoMouseMove = (e) => {
    if (lassoMode !== 'freehand' || !isDrawingLasso) return;
    const pt = getCanvasCoords(e);
    if (!pt) return;
    setLassoPoints((prev) => [...prev, pt]);
  };

  const handleLassoMouseUp = () => {
    if (lassoMode === 'freehand' && isDrawingLasso) {
      setIsDrawingLasso(false);
    }
  };

  // Perform Cutout using Canvas clipping path
  const handlePerformLassoCutout = () => {
    if (lassoPoints.length < 3) {
      alert('Please outline an object with at least 3 points.');
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const origW = img.naturalWidth || img.width;
      const origH = img.naturalHeight || img.height;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = origW;
      canvas.height = origH;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(lassoPoints[0].x * origW, lassoPoints[0].y * origH);
      for (let i = 1; i < lassoPoints.length; i++) {
        ctx.lineTo(lassoPoints[i].x * origW, lassoPoints[i].y * origH);
      }
      ctx.closePath();
      ctx.clip();

      ctx.drawImage(img, 0, 0, origW, origH);
      ctx.restore();

      const dataUrl = canvas.toDataURL('image/png');
      setCutoutResultUrl(dataUrl);
    };
    img.src = imageSrc;
  };

  const handleDownloadCutout = () => {
    if (!cutoutResultUrl) return;
    const link = document.createElement('a');
    link.download = `${imageTitle || 'cutout'}-cutout.png`;
    link.href = cutoutResultUrl;
    link.click();
  };

  const handleOpenCloudWithCutout = async () => {
    if (!cutoutResultUrl) return;
    const res = await fetch(cutoutResultUrl);
    const blob = await res.blob();
    const file = new File([blob], `${imageTitle || 'cutout'}-transparent.png`, { type: 'image/png' });
    setCloudFile(file);
    setCloudPreview(cutoutResultUrl);
    setSavedCloudUrl('');
    setShowCloudModal(true);
  };

  // --- CLOUDINARY UPLOAD SUBMISSION ---
  const handleCloudUploadSubmit = async (e) => {
    e?.preventDefault();
    if (!cloudFile) {
      alert('Please select or drop an image file.');
      return;
    }

    setUploadingToCloud(true);
    try {
      const formData = new FormData();
      formData.append('file', cloudFile);
      formData.append('title', cloudTitle || 'Studio Cutout Asset');
      formData.append('category', cloudCategory);
      formData.append('tags', cloudTags);

      const res = await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setSavedCloudUrl(res.data.data.asset.url);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to upload to Cloudinary.');
    } finally {
      setUploadingToCloud(false);
    }
  };

  const handleOpenAssetPicker = async () => {
    setShowAssetPicker(true);
    setLoadingAssets(true);
    try {
      const res = await api.get('/media?limit=24');
      if (res.data.success) {
        setExistingAssets(res.data.data.assets);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAssets(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Custom Styles for Professional Dark ReactCrop Handles */}
      <style>{`
        .ReactCrop {
          display: inline-block;
          max-width: 100%;
          user-select: none;
        }
        .ReactCrop__crop-selection {
          border: 1px solid #ffffff !important;
          box-shadow: 0 0 0 9999px rgba(10, 14, 23, 0.75) !important;
        }
        .ReactCrop__drag-handle {
          width: 10px !important;
          height: 10px !important;
          background: #ffffff !important;
          border: 1.5px solid #0f172a !important;
          border-radius: 2px !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.5) !important;
        }
        .ReactCrop__rule-of-thirds-vt,
        .ReactCrop__rule-of-thirds-hz {
          border-color: rgba(255, 255, 255, 0.35) !important;
        }
      `}</style>

      {/* 1. PROFESSIONAL STUDIO HEADER (CLEAN ENTERPRISE DARK THEME) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Image Studio
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Professional cropping, freeform lasso cutout, and PhotoRoom background removal.
          </p>
        </div>

        {/* Clean Segmented Control for Tools */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveStudioTab('crop')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeStudioTab === 'crop'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Crop className="w-3.5 h-3.5 text-blue-400" /> Crop & Aspect Ratio
            </button>
            <button
              onClick={() => setActiveStudioTab('lasso')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeStudioTab === 'lasso'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Scissors className="w-3.5 h-3.5 text-sky-400" /> Freeform Cutout
            </button>
            <button
              onClick={() => setActiveStudioTab('photoroom')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeStudioTab === 'photoroom'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" /> PhotoRoom AI
            </button>
          </div>

          <Button
            size="sm"
            onClick={() => {
              setCloudFile(null);
              setCloudPreview('');
              setSavedCloudUrl('');
              setShowCloudModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            <UploadCloud className="w-3.5 h-3.5 mr-1.5" /> Save to Cloud Media
          </Button>
        </div>
      </div>

      {/* 2. TAB 1: CROP & ASPECT RATIO STUDIO */}
      {activeStudioTab === 'crop' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* CROPPER CANVAS AREA (8 COLS) */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-200">
                  Interactive Crop Canvas
                </span>
                {imgRef.current && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-950 text-slate-400 border border-slate-800">
                    {imgRef.current.naturalWidth} &times; {imgRef.current.naturalHeight} px
                  </span>
                )}
                <span className="text-[11px] text-slate-400">
                  Mode: <strong className="text-slate-200">{aspect ? 'Locked Ratio' : 'Freeform (Drag Any Size)'}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  accept="image/*"
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  <UploadCloud className="w-3.5 h-3.5 mr-1" /> Open Image
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleOpenAssetPicker}
                  className="bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  <FolderOpen className="w-3.5 h-3.5 mr-1" /> Cloud Assets
                </Button>
              </div>
            </div>

            {/* REACT-IMAGE-CROP CONTAINER */}
            <div className="relative w-full rounded-xl overflow-hidden min-h-[460px] flex items-center justify-center p-4 bg-[#0a0e17] border border-slate-800">
              <div
                style={{
                  transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1}) scale(${zoom})`,
                  transition: 'transform 0.15s ease-out'
                }}
              >
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={aspect}
                  className="max-h-[420px]"
                >
                  <img
                    ref={imgRef}
                    src={imageSrc}
                    alt="Workspace Asset"
                    onLoad={onImageLoad}
                    crossOrigin="anonymous"
                    className="max-h-[420px] max-w-full object-contain block"
                  />
                </ReactCrop>
              </div>
            </div>

            {/* Crop Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleApplyCrop}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  <Crop className="w-3.5 h-3.5 mr-1" /> Apply Crop
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadCropped('png')}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Download PNG
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadCropped('jpg')}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Download JPG
                </Button>
              </div>

              <Button
                size="sm"
                onClick={handleOpenCloudWithCropped}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium"
              >
                <UploadCloud className="w-3.5 h-3.5 mr-1" /> Save to Cloud Media
              </Button>
            </div>

            {/* Cropped Output Preview Box */}
            {croppedResultUrl && (
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={croppedResultUrl}
                    alt="Cropped Preview"
                    className="w-16 h-16 object-contain rounded-lg bg-slate-900 border border-slate-800 p-1"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Crop Applied Successfully
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Export clean PNG/JPG or upload straight to Cloudinary.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => setActiveStudioTab('lasso')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                  >
                    <Scissors className="w-3.5 h-3.5 mr-1 text-sky-400" /> Freeform Cutout
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setActiveStudioTab('photoroom')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1" /> PhotoRoom AI
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* CROPPER SIDEBAR CONTROLS (4 COLS) */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-semibold text-sm text-white flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-slate-400" /> Aspect Ratio Presets
              </h3>
              <button
                onClick={() => handleSelectAspect(undefined)}
                className="text-[11px] font-medium text-slate-400 hover:text-white flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Reset
              </button>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 gap-2">
              {ASPECT_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handleSelectAspect(preset.value)}
                  className={`p-2.5 rounded-lg border text-left text-xs transition-colors ${
                    aspect === preset.value
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="font-medium text-white">{preset.label}</div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {preset.desc}
                  </span>
                </button>
              ))}
            </div>

            {/* Orientation & Transformations */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-300">
                Orientation:
              </label>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  title="Rotate 90° Clockwise"
                  className="p-2 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300 flex flex-col items-center justify-center gap-1 text-[10px]"
                >
                  <RotateCw className="w-3.5 h-3.5 text-slate-400" />
                  <span>90° CW</span>
                </button>

                <button
                  onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                  title="Rotate 90° Counter-Clockwise"
                  className="p-2 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300 flex flex-col items-center justify-center gap-1 text-[10px]"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>90° CCW</span>
                </button>

                <button
                  onClick={() => setFlipH(!flipH)}
                  title="Flip Horizontal"
                  className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 text-[10px] ${
                    flipH ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                  <span>Flip H</span>
                </button>

                <button
                  onClick={() => setFlipV(!flipV)}
                  title="Flip Vertical"
                  className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 text-[10px] ${
                    flipV ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <FlipVertical className="w-3.5 h-3.5" />
                  <span>Flip V</span>
                </button>
              </div>
            </div>

            {/* Zoom Slider */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <label className="text-slate-300">Zoom</label>
                <span className="font-mono text-slate-400">{Math.round(zoom * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>

            {/* Sample Presets */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="text-xs font-semibold text-slate-300">Sample Assets:</label>
              <div className="grid grid-cols-3 gap-2">
                {SAMPLE_PRESETS.map((sample) => (
                  <button
                    key={sample.name}
                    onClick={() => loadImage(sample.url, sample.name)}
                    className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-[11px] font-medium text-slate-300 flex items-center gap-1.5 truncate"
                  >
                    <img src={sample.url} alt={sample.name} className="w-5 h-5 rounded-xs object-cover" />
                    <span className="truncate">{sample.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB 2: FREEFORM LASSO / POLYGON CUTOUT (CUSTOM CUTOUT TOOL) */}
      {activeStudioTab === 'lasso' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LASSO CANVAS WORKSPACE (8 COLS) */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">
                  Freeform Cutout Workspace
                </span>
                <span className="text-[11px] text-slate-400">
                  {lassoMode === 'freehand'
                    ? 'Drag cursor freely around object'
                    : 'Click points around object boundary'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setLassoMode('freehand')}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                      lassoMode === 'freehand'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <PenTool className="w-3 h-3 inline mr-1" /> Freehand
                  </button>
                  <button
                    onClick={() => setLassoMode('polygon')}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                      lassoMode === 'polygon'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <MousePointer className="w-3 h-3 inline mr-1" /> Polygon Points
                  </button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLassoPoints((prev) => prev.slice(0, -1))}
                  disabled={lassoPoints.length === 0}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 text-[11px] h-7 px-2"
                  title="Undo point"
                >
                  <Undo2 className="w-3 h-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLassoPoints([])}
                  disabled={lassoPoints.length === 0}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 text-[11px] h-7 px-2"
                  title="Clear path"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* INTERACTIVE CUTOUT CANVAS */}
            <div className="relative w-full rounded-xl overflow-hidden min-h-[460px] flex items-center justify-center p-4 bg-[#0a0e17] border border-slate-800 select-none">
              <canvas
                ref={lassoCanvasRef}
                onMouseDown={handleLassoMouseDown}
                onMouseMove={handleLassoMouseMove}
                onMouseUp={handleLassoMouseUp}
                onTouchStart={handleLassoMouseDown}
                onTouchMove={handleLassoMouseMove}
                onTouchEnd={handleLassoMouseUp}
                className="max-h-[440px] max-w-full rounded-lg shadow-xl cursor-crosshair block"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handlePerformLassoCutout}
                  disabled={lassoPoints.length < 3}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50"
                >
                  <Scissors className="w-3.5 h-3.5 mr-1" /> Cut Out Selection
                </Button>
                {cutoutResultUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadCutout}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> Download PNG
                  </Button>
                )}
              </div>

              {cutoutResultUrl && (
                <Button
                  size="sm"
                  onClick={handleOpenCloudWithCutout}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium"
                >
                  <UploadCloud className="w-3.5 h-3.5 mr-1" /> Save Cutout to Cloud Media
                </Button>
              )}
            </div>

            {/* Cutout Result Preview Box */}
            {cutoutResultUrl && (
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-16 h-16 rounded-lg border border-slate-800 flex items-center justify-center p-1"
                    style={{
                      backgroundImage:
                        'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                      backgroundSize: '10px 10px',
                      backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px'
                    }}
                  >
                    <img
                      src={cutoutResultUrl}
                      alt="Cutout Preview"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Cutout Ready (Transparent PNG)
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Isolated subject background removed via freeform boundary.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleDownloadCutout}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> Download PNG
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* LASSO SIDEBAR INSTRUCTIONS & PREVIEWS (4 COLS) */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-sm text-white flex items-center gap-1.5 pb-3 border-b border-slate-800">
              <Scissors className="w-4 h-4 text-slate-400" /> Freeform Cut Guide
            </h3>

            <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <span className="font-semibold text-slate-200 block">1. Choose Cut Mode</span>
                <p className="text-[11px]">
                  <strong>Freehand:</strong> Click and hold mouse/finger to draw a continuous path around the product.
                </p>
                <p className="text-[11px]">
                  <strong>Polygon Points:</strong> Click sequentially along corners and edges to create precise geometric boundaries.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <span className="font-semibold text-slate-200 block">2. Complete & Cut</span>
                <p className="text-[11px]">
                  Once your path encloses the target item, click <strong>Cut Out Selection</strong> to automatically clip the background into a transparent PNG.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <span className="font-semibold text-slate-200 block">3. Cloud Media Sync</span>
                <p className="text-[11px]">
                  Upload the cutout directly to Cloudinary for permanent public shareable URLs (ready for Amazon / Meesho / WhatsApp catalog).
                </p>
              </div>
            </div>

            {/* Change Asset */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="text-xs font-semibold text-slate-300">Switch Sample Asset:</label>
              <div className="grid grid-cols-3 gap-2">
                {SAMPLE_PRESETS.map((sample) => (
                  <button
                    key={sample.name}
                    onClick={() => loadImage(sample.url, sample.name)}
                    className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-[11px] font-medium text-slate-300 flex items-center gap-1.5 truncate"
                  >
                    <img src={sample.url} alt={sample.name} className="w-5 h-5 rounded-xs object-cover" />
                    <span className="truncate">{sample.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 3: PHOTOROOM BACKGROUND REMOVER */}
      {activeStudioTab === 'photoroom' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-800 text-slate-200 flex items-center justify-center shrink-0 border border-slate-700">
                <Scissors className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-white">
                  PhotoRoom Background Removal
                </p>
                <p className="text-slate-400">
                  Drop complex photos below to remove intricate backgrounds with automatic edge detection. Download the transparent PNG and upload to Cloud Media.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href="https://www.photoroom.com/tools/background-remover"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-400" /> Open Dedicated Tab
              </a>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIframeKey((k) => k + 1)}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
                title="Reload"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* EMBEDDED PHOTOROOM STUDIO */}
          <div className="relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl min-h-[760px]">
            {!iframeLoaded && (
              <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center z-10">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-xs font-medium text-slate-300">
                  Loading PhotoRoom Engine...
                </p>
              </div>
            )}

            <iframe
              key={iframeKey}
              src="https://www.photoroom.com/tools/background-remover"
              title="PhotoRoom Background Remover"
              onLoad={() => setIframeLoaded(true)}
              className="w-full h-[760px] border-0"
              allow="clipboard-read; clipboard-write; camera"
            />
          </div>

          {/* Action to upload Cutout to Cloud Media */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs">
              <h4 className="font-semibold text-white">
                Upload your cutout to Cloud Media
              </h4>
              <p className="text-slate-400 mt-0.5">
                Generate an instant Cloudinary public share URL for WhatsApp or e-commerce listings.
              </p>
            </div>

            <Button
              onClick={() => {
                setCloudFile(null);
                setCloudPreview('');
                setSavedCloudUrl('');
                setShowCloudModal(true);
              }}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              <UploadCloud className="w-4 h-4 mr-1.5" /> Upload Cutout to Cloudinary
            </Button>
          </div>
        </div>
      )}

      {/* 5. MODAL: SAVE TO CLOUD MEDIA */}
      <Modal
        isOpen={showCloudModal}
        onClose={() => setShowCloudModal(false)}
        title="Upload Image to Cloud Media"
      >
        {!savedCloudUrl ? (
          <form onSubmit={handleCloudUploadSubmit} className="space-y-4">
            <div
              onClick={() => cloudDropInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center cursor-pointer hover:border-blue-500 bg-slate-950 transition-colors"
            >
              <input
                type="file"
                ref={cloudDropInputRef}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setCloudFile(f);
                    setCloudPreview(URL.createObjectURL(f));
                    setCloudTitle(f.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
                  }
                }}
                accept="image/*"
                className="hidden"
              />
              {cloudPreview ? (
                <div className="flex flex-col items-center">
                  <img src={cloudPreview} alt="Upload preview" className="max-h-36 object-contain rounded-lg mb-2" />
                  <p className="text-xs font-medium text-blue-400">{cloudFile?.name}</p>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-7 h-7 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-200">
                    Drop your image or cutout here
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Click to browse from PC (PNG, JPG, WEBP)
                  </p>
                </>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Asset Title *
              </label>
              <input
                type="text"
                required
                value={cloudTitle}
                onChange={(e) => setCloudTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={cloudCategory}
                  onChange={(e) => setCloudCategory(e.target.value)}
                  className="w-full p-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-hidden"
                >
                  <option value="Products">Products</option>
                  <option value="Banners">Banners</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Logos">Logos</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={cloudTags}
                  onChange={(e) => setCloudTags(e.target.value)}
                  placeholder="cutout, transparent"
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                disabled={uploadingToCloud}
                onClick={() => setShowCloudModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={uploadingToCloud || !cloudFile} className="bg-blue-600 hover:bg-blue-700 text-white">
                {uploadingToCloud ? 'Uploading...' : 'Save to Cloudinary'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 text-center py-3">
            <div className="w-10 h-10 rounded-full bg-emerald-950/80 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-800">
              <CheckCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-white">
                Uploaded to Cloudinary Successfully
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                A permanent public share URL has been generated.
              </p>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-left">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Direct Public Share URL
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={savedCloudUrl}
                  className="w-full text-xs font-mono bg-slate-900 border border-slate-800 rounded-md px-2.5 py-1.5 text-slate-200 select-all"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(savedCloudUrl);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="shrink-0 bg-slate-800 hover:bg-slate-700 text-white"
                >
                  {copiedLink ? 'Copied' : 'Copy'}
                </Button>
                <a
                  href={savedCloudUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="flex justify-center pt-2 gap-2">
              <Button size="sm" variant="secondary" onClick={() => navigate('/media')}>
                Go to Media Assets
              </Button>
              <Button size="sm" onClick={() => setShowCloudModal(false)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 6. MODAL: PICK FROM CLOUD ASSETS */}
      <Modal
        isOpen={showAssetPicker}
        onClose={() => setShowAssetPicker(false)}
        title="Choose from Cloud Media Assets"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Select an image to load into the crop workspace:
          </p>

          {loadingAssets ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Loading assets...
            </div>
          ) : existingAssets.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No cloud assets found.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 max-h-80 overflow-y-auto p-1">
              {existingAssets.map((asset) => (
                <div
                  key={asset._id}
                  onClick={() => {
                    loadImage(asset.url, asset.title);
                    setShowAssetPicker(false);
                  }}
                  className="rounded-lg border border-slate-800 overflow-hidden cursor-pointer hover:border-blue-500 bg-slate-950 transition-colors"
                >
                  <div className="aspect-square bg-slate-900 flex items-center justify-center">
                    <img
                      src={asset.url}
                      alt={asset.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-2 text-[11px] font-medium text-slate-300 truncate">
                    {asset.title}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="secondary" size="sm" onClick={() => setShowAssetPicker(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ImageStudio;
