import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Eye, Layers, Compass, Volume2, VolumeX,
  Play, Pause, Sparkles, Activity
} from 'lucide-react';

/**
 * Web Audio Synthesizer for Barcode Scanner Sound
 */
let sharedAudioCtx = null;
const getAudioContext = () => {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
};

const playScannerBeep = () => {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1900, ctx.currentTime);
    osc.frequency.setValueAtTime(2600, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.13);
  } catch (e) {
    // Audio restrictions
  }
};

/**
 * Procedural Texture Generators
 */

// 1. Polished Concrete Epoxy Floor with Roadways & Stencils
const createWarehouseFloorTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 2048, 2048);

  for (let i = 0; i < 45000; i++) {
    const x = Math.random() * 2048;
    const y = Math.random() * 2048;
    const size = Math.random() * 2.5 + 1;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.018)' : 'rgba(0,0,0,0.04)';
    ctx.fillRect(x, y, size, size);
  }

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 4;
  for (let x = 0; x <= 2048; x += 256) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 2048);
    ctx.stroke();
  }
  for (let y = 0; y <= 2048; y += 256) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(2048, y);
    ctx.stroke();
  }

  const drawHazardStripe = (x, y, w, h) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = '#eab308';
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = '#0f172a';
    ctx.lineWidth = 18;
    for (let d = -h; d < w + h; d += 40) {
      ctx.beginPath();
      ctx.moveTo(x + d, y);
      ctx.lineTo(x + d + 30, y + h);
      ctx.stroke();
    }
    ctx.restore();
  };

  drawHazardStripe(64, 64, 1920, 28);
  drawHazardStripe(64, 1956, 1920, 28);
  drawHazardStripe(64, 64, 28, 1920);
  drawHazardStripe(1956, 64, 28, 1920);

  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(400, 1024);
  ctx.lineTo(1648, 1024);
  ctx.stroke();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.setLineDash([30, 25]);
  ctx.beginPath();
  ctx.moveTo(200, 700);
  ctx.lineTo(1848, 700);
  ctx.moveTo(200, 1348);
  ctx.lineTo(1848, 1348);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.font = 'bold 44px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('FORKLIFT TRANSIT LANE  •  MAX SPEED 5 KM/H', 1024, 980);
  ctx.fillText('INSPECTION BAY & STAGING AREA', 1024, 1080);

  ctx.fillStyle = 'rgba(234, 179, 8, 0.55)';
  ctx.font = '900 64px sans-serif';
  ctx.fillText('ZONE A - HIGH VELOCITY STORAGE', 1024, 380);
  ctx.fillText('ZONE B - RESERVE PALLETS', 1024, 1700);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
};

// 2. Canteen Wood Laminate Parquet Floor Texture
const createCanteenFloorTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#b48552';
  ctx.fillRect(0, 0, 512, 512);

  const plankH = 512 / 8;
  for (let i = 0; i < 8; i++) {
    const y = i * plankH;
    ctx.fillStyle = i % 2 === 0 ? '#ad7d49' : '#bc8d5b';
    ctx.fillRect(0, y + 2, 512, plankH - 4);

    ctx.fillStyle = 'rgba(80, 50, 20, 0.15)';
    for (let g = 0; g < 10; g++) {
      ctx.fillRect(0, y + Math.random() * (plankH - 8) + 4, 512, Math.random() * 2 + 1);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
};

// 3. Canteen Signboard
const createCanteenSignTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 180;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#064e3b';
  ctx.fillRect(0, 0, 512, 180);

  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 502, 170);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 52px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('☕ STAFF CANTEEN', 256, 85);

  ctx.fillStyle = '#a7f3d0';
  ctx.font = 'bold 24px monospace';
  ctx.fillText('MEALS, CHAI & BREAKROOM', 256, 135);

  return new THREE.CanvasTexture(canvas);
};

// 4. Vending Machine Texture
const createVendingTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#09090b';
  ctx.fillRect(0, 0, 512, 512);

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(32, 32, 448, 320);

  [120, 220, 310].forEach((sy) => {
    ctx.fillStyle = '#475569';
    ctx.fillRect(32, sy, 448, 12);

    for (let cx = 50; cx < 460; cx += 45) {
      const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      ctx.fillRect(cx, sy - 60, 28, 56);
    }
  });

  ctx.fillStyle = '#27272a';
  ctx.fillRect(64, 400, 384, 80);
  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 22px monospace';
  ctx.fillText('SNACKS & CHAI READY', 110, 385);

  return new THREE.CanvasTexture(canvas);
};

// 5. Corrugated Warehouse Wall Texture
const createWarehouseWallTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 512, 512);

  const ribWidth = 16;
  for (let x = 0; x < 512; x += ribWidth) {
    const grad = ctx.createLinearGradient(x, 0, x + ribWidth, 0);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.3, '#334155');
    grad.addColorStop(0.7, '#1e293b');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, ribWidth, 512);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 2);
  return texture;
};

// 6. Wooden Euro Pallet Texture
const createWoodPalletTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#b08968';
  ctx.fillRect(0, 0, 512, 512);

  const plankHeight = 512 / 5;
  for (let i = 0; i < 5; i++) {
    const y = i * plankHeight;
    const shade = (i % 2 === 0) ? '#a67c58' : '#ba9372';
    ctx.fillStyle = shade;
    ctx.fillRect(0, y + 3, 512, plankHeight - 6);

    ctx.fillStyle = 'rgba(100, 65, 35, 0.12)';
    for (let g = 0; g < 15; g++) {
      ctx.fillRect(0, y + Math.random() * (plankHeight - 10) + 5, 512, Math.random() * 2 + 1);
    }

    ctx.fillStyle = '#3a2d24';
    [24, 256, 488].forEach((nx) => {
      ctx.beginPath();
      ctx.arc(nx, y + plankHeight * 0.35, 3.5, 0, Math.PI * 2);
      ctx.arc(nx, y + plankHeight * 0.65, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  ctx.fillStyle = 'rgba(60, 40, 20, 0.4)';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('EPAL', 50, 480);
  ctx.fillText('EUR', 400, 480);

  return new THREE.CanvasTexture(canvas);
};

// 7. Cardboard Box Texture with Shipping Labels & Barcodes
const createCardboardBoxTexture = (binCode, sku, occupancyRate, isFull) => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#c79c6e';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)';
    ctx.fillRect(x, y, Math.random() * 3 + 1, Math.random() * 2 + 1);
  }

  ctx.fillStyle = 'rgba(180, 120, 60, 0.7)';
  ctx.fillRect(216, 0, 80, 512);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillRect(230, 0, 15, 512);

  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.roundRect(40, 70, 220, 240, 10);
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 18px monospace';
  ctx.fillText(binCode || 'BIN-01', 52, 98);

  const barcodeY = 112;
  ctx.fillStyle = '#000000';
  for (let b = 52; b < 240; b += Math.floor(Math.random() * 6) + 3) {
    const barWidth = Math.random() > 0.6 ? 3 : 1.5;
    ctx.fillRect(b, barcodeY, barWidth, 42);
  }

  ctx.fillStyle = '#334155';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(sku ? `SKU: ${sku.slice(0, 14)}` : 'STANDARD STORAGE', 52, 172);

  ctx.font = '18px sans-serif';
  ctx.fillText('⬆ ⬆  FRAGILE', 52, 202);

  const badgeColor = isFull ? '#ef4444' : occupancyRate > 70 ? '#f59e0b' : occupancyRate > 0 ? '#10b981' : '#94a3b8';
  ctx.fillStyle = badgeColor;
  ctx.beginPath();
  ctx.roundRect(52, 244, 196, 24, 6);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(occupancyRate)}% LOADED`, 150, 260);
  ctx.textAlign = 'left';

  return new THREE.CanvasTexture(canvas);
};

// 8. Overhead Aisle Sign
const createAisleSignTexture = (aisleName) => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 180;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 0, 512, 180);

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, 498, 166);

  ctx.fillStyle = '#000000';
  ctx.font = '900 68px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(aisleName.toUpperCase(), 256, 95);

  ctx.font = 'bold 24px monospace';
  ctx.fillText('SELECTIVE PALLET RACKING', 256, 140);

  return new THREE.CanvasTexture(canvas);
};

// 9. Floating Holographic Worker Status Bubble
const createWorkerStatusTexture = (text, statusColor = '#22c55e') => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 120;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 512, 120);

  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.beginPath();
  ctx.roundRect(16, 16, 480, 88, 24);
  ctx.fill();

  ctx.strokeStyle = statusColor;
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = statusColor;
  ctx.beginPath();
  ctx.arc(48, 60, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(text, 72, 68);

  const texture = new THREE.CanvasTexture(canvas);
  return { texture, canvas, ctx };
};

export const Warehouse3DScene = ({
  bins = [],
  matchedBinIds = new Set(),
  onSelectBin,
  selectedBin
}) => {
  const mountRef = useRef(null);
  const [hoveredBinInfo, setHoveredBinInfo] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [cameraPreset, setCameraPreset] = useState('isometric');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [simActive, setSimActive] = useState(true);

  const cameraControlRef = useRef(null);
  const simActiveRef = useRef(simActive);
  simActiveRef.current = simActive;

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    const width = currentMount.clientWidth || 900;
    const height = currentMount.clientHeight || 650;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070c18);
    scene.fog = new THREE.FogExp2(0x070c18, 0.012);

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.2, 1000);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    currentMount.appendChild(renderer.domElement);

    // 2. Realistic Warehouse Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.7);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff7ed, 1.5);
    sunLight.position.set(25, 45, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 150;
    sunLight.shadow.camera.left = -40;
    sunLight.shadow.camera.right = 40;
    sunLight.shadow.camera.top = 40;
    sunLight.shadow.camera.bottom = -40;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    const cyanBay = new THREE.PointLight(0x38bdf8, 1.6, 60);
    cyanBay.position.set(-18, 16, 12);
    scene.add(cyanBay);

    const amberBay = new THREE.PointLight(0xf59e0b, 1.2, 60);
    amberBay.position.set(18, 16, -12);
    scene.add(amberBay);

    // 3. Concrete Epoxy Floor with Roadways & Stencils
    const floorTexture = createWarehouseFloorTexture();
    const floorGeo = new THREE.PlaneGeometry(90, 90);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.35,
      metalness: 0.15
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 4. Warehouse Walls (Back and Left Cladding)
    const wallTexture = createWarehouseWallTexture();
    const wallGeo = new THREE.PlaneGeometry(90, 22);
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTexture,
      roughness: 0.7,
      metalness: 0.3
    });

    const backWall = new THREE.Mesh(wallGeo, wallMat);
    backWall.position.set(0, 11, -38);
    backWall.receiveShadow = true;
    scene.add(backWall);

    const leftWall = new THREE.Mesh(wallGeo, wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-38, 11, 0);
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    // 5. Overhead Trusses & Lamps
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
    for (let tz = -30; tz <= 30; tz += 15) {
      const beamMesh = new THREE.Mesh(new THREE.BoxGeometry(76, 0.4, 0.4), trussMat);
      beamMesh.position.set(0, 17, tz);
      scene.add(beamMesh);

      [-12, 0, 12].forEach((lx) => {
        const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 3.5), trussMat);
        cable.position.set(lx, 15.2, tz);
        scene.add(cable);

        const lamp = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.4, 16), new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.2 }));
        lamp.position.set(lx, 13.5, tz);
        scene.add(lamp);

        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        bulb.position.set(lx, 13.3, tz);
        scene.add(bulb);

        const spot = new THREE.SpotLight(0xfff7ed, 1.2, 28, Math.PI / 3, 0.4, 1.2);
        spot.position.set(lx, 13.3, tz);
        spot.target.position.set(lx, 0, tz);
        scene.add(spot);
        scene.add(spot.target);
      });
    }

    // 6. RACKS CONSTRUCTION
    const palletTexture = createWoodPalletTexture();
    const binMeshes = [];
    const interactiveObjects = [];

    const aisles = {};
    bins.forEach((b) => {
      const a = b.aisle || 'Aisle 1';
      const r = b.rack || 'Rack 1';
      if (!aisles[a]) aisles[a] = {};
      if (!aisles[a][r]) aisles[a][r] = [];
      aisles[a][r].push(b);
    });

    const aisleKeys = Object.keys(aisles);
    const aisleSpacing = 16;
    const rackSpacing = 8.5;

    const uprightBlueMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, metalness: 0.65, roughness: 0.35 });
    const crossbeamOrangeMat = new THREE.MeshStandardMaterial({ color: 0xea580c, metalness: 0.55, roughness: 0.4 });
    const braceSilverMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 });
    const wireDeckMat = new THREE.MeshStandardMaterial({ color: 0x64748b, wireframe: true, metalness: 0.9, roughness: 0.2 });
    const yellowGuardMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.4, roughness: 0.4 });
    const palletMat = new THREE.MeshStandardMaterial({ map: palletTexture, roughness: 0.9, metalness: 0.05 });
    const shrinkWrapMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, roughness: 0.1, metalness: 0.7 });

    aisleKeys.forEach((aisleKey, aIdx) => {
      const racks = aisles[aisleKey];
      const rackKeys = Object.keys(racks);
      const aisleZ = (aIdx - (aisleKeys.length - 1) / 2) * aisleSpacing;

      // Suspended High-Visibility Aisle Signboard
      const aisleSignTex = createAisleSignTexture(aisleKey);
      const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.2), new THREE.MeshBasicMaterial({ map: aisleSignTex, side: THREE.DoubleSide }));
      signMesh.position.set(-((rackKeys.length * rackSpacing) / 2) - 1.5, 9.2, aisleZ);
      signMesh.rotation.y = Math.PI / 2;
      scene.add(signMesh);

      rackKeys.forEach((rackKey, rIdx) => {
        const rackBins = racks[rackKey];
        const rackX = (rIdx - (rackKeys.length - 1) / 2) * rackSpacing;

        const levels = {};
        rackBins.forEach((b) => {
          const l = b.shelf || 'Level 1';
          if (!levels[l]) levels[l] = [];
          levels[l].push(b);
        });

        const levelKeys = Object.keys(levels).sort();
        const numLevels = Math.max(3, levelKeys.length);
        const rackHeight = numLevels * 2.5 + 1.2;
        const rackWidth = 4.2;
        const rackDepth = 1.8;

        // Upright Steel Posts
        [[-rackWidth / 2, -rackDepth / 2], [rackWidth / 2, -rackDepth / 2], [-rackWidth / 2, rackDepth / 2], [rackWidth / 2, rackDepth / 2]].forEach(([dx, dz]) => {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, rackHeight, 0.18), uprightBlueMat);
          post.position.set(rackX + dx, rackHeight / 2, aisleZ + dz);
          post.castShadow = true;
          post.receiveShadow = true;
          scene.add(post);

          const baseplate = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.36), new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.3 }));
          baseplate.position.set(rackX + dx, 0.025, aisleZ + dz);
          scene.add(baseplate);

          if (dz > 0) {
            const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.9, 16), yellowGuardMat);
            guard.position.set(rackX + dx, 0.45, aisleZ + dz + 0.15);
            guard.castShadow = true;
            scene.add(guard);
          }
        });

        // Diagonal Bracing
        [-rackWidth / 2, rackWidth / 2].forEach((sideX) => {
          for (let lvl = 0; lvl < numLevels; lvl++) {
            const y1 = lvl * 2.5 + 0.3;
            const y2 = (lvl + 1) * 2.5 + 0.3;
            const braceLen = Math.sqrt(Math.pow(rackDepth, 2) + Math.pow(y2 - y1, 2));
            const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, braceLen), braceSilverMat);
            brace.position.set(rackX + sideX, (y1 + y2) / 2, aisleZ);
            brace.rotation.x = Math.atan2(rackDepth, y2 - y1) * (lvl % 2 === 0 ? 1 : -1);
            scene.add(brace);
          }
        });

        // Shelf Levels
        levelKeys.forEach((lvlKey, lIdx) => {
          const lvlBins = levels[lvlKey];
          const shelfY = (lIdx + 1) * 2.4 - 0.2;

          const frontBeam = new THREE.Mesh(new THREE.BoxGeometry(rackWidth, 0.14, 0.1), crossbeamOrangeMat);
          frontBeam.position.set(rackX, shelfY, aisleZ + rackDepth / 2);
          frontBeam.castShadow = true;
          frontBeam.receiveShadow = true;
          scene.add(frontBeam);

          const rearBeam = new THREE.Mesh(new THREE.BoxGeometry(rackWidth, 0.14, 0.1), crossbeamOrangeMat);
          rearBeam.position.set(rackX, shelfY, aisleZ - rackDepth / 2);
          rearBeam.castShadow = true;
          rearBeam.receiveShadow = true;
          scene.add(rearBeam);

          const wireDeck = new THREE.Mesh(new THREE.PlaneGeometry(rackWidth - 0.2, rackDepth - 0.1, 16, 8), wireDeckMat);
          wireDeck.rotation.x = -Math.PI / 2;
          wireDeck.position.set(rackX, shelfY + 0.05, aisleZ);
          scene.add(wireDeck);

          const binsCount = lvlBins.length;
          const slotWidth = (rackWidth - 0.4) / Math.max(1, binsCount);

          lvlBins.forEach((bin, bIdx) => {
            const occupancy = bin.maxCapacity > 0 ? (bin.currentUnits / bin.maxCapacity) * 100 : 0;
            const isFull = occupancy >= 100;
            const isMatched = matchedBinIds.has(bin._id);
            const isSelected = selectedBin && selectedBin._id === bin._id;
            const binCenterX = rackX - (rackWidth - 0.4) / 2 + slotWidth * (bIdx + 0.5);

            // Euro Pallet
            const palletMesh = new THREE.Mesh(new THREE.BoxGeometry(Math.min(1.2, slotWidth * 0.9), 0.14, 1.2), palletMat);
            palletMesh.position.set(binCenterX, shelfY + 0.12, aisleZ);
            palletMesh.castShadow = true;
            palletMesh.receiveShadow = true;
            scene.add(palletMesh);

            const primarySku = bin.assignedSkus?.[0]?.sku || '';
            const boxTexture = createCardboardBoxTexture(bin.binCode, primarySku, occupancy, isFull);

            const boxMat = new THREE.MeshStandardMaterial({
              map: boxTexture,
              roughness: 0.85,
              metalness: 0.05,
              emissive: isMatched ? 0x06b6d4 : isSelected ? 0x2563eb : 0x000000,
              emissiveIntensity: isMatched ? 0.6 : isSelected ? 0.4 : 0
            });

            if (bin.currentUnits > 0 || isMatched) {
              const numBoxesY = occupancy > 60 ? 2 : 1;
              const boxW = Math.min(1.05, slotWidth * 0.82);
              const boxH = 0.65;
              const boxD = 1.05;

              for (let by = 0; by < numBoxesY; by++) {
                const boxMesh = new THREE.Mesh(new THREE.BoxGeometry(boxW, boxH, boxD), boxMat);
                boxMesh.position.set(binCenterX, shelfY + 0.2 + by * boxH + boxH / 2, aisleZ);
                boxMesh.castShadow = true;
                boxMesh.receiveShadow = true;
                boxMesh.userData = { bin };
                scene.add(boxMesh);
                binMeshes.push(boxMesh);
                interactiveObjects.push(boxMesh);
              }

              if (occupancy > 50) {
                const wrapMesh = new THREE.Mesh(new THREE.BoxGeometry(boxW + 0.04, boxH * numBoxesY + 0.04, boxD + 0.04), shrinkWrapMat);
                wrapMesh.position.set(binCenterX, shelfY + 0.2 + (boxH * numBoxesY) / 2, aisleZ);
                scene.add(wrapMesh);
              }
            } else {
              const emptyBox = new THREE.Mesh(
                new THREE.BoxGeometry(Math.min(1.05, slotWidth * 0.82), 0.5, 1.05),
                new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9, transparent: true, opacity: 0.35, wireframe: true })
              );
              emptyBox.position.set(binCenterX, shelfY + 0.45, aisleZ);
              emptyBox.userData = { bin };
              scene.add(emptyBox);
              binMeshes.push(emptyBox);
              interactiveObjects.push(emptyBox);
            }
          });
        });
      });
    });

    // 7. 3D CANTEEN SECTION DIRECTLY AT THE SIDE OF THE RACKS
    // Placed at x = 16.5m (directly beside Rack 3) so it's fully integrated into the main warehouse view!
    const canteenGroup = new THREE.Group();
    canteenGroup.position.set(17.5, 0, 1.0);

    // Canteen Parquet Wood Floor (10m x 8m)
    const canteenFloorTex = createCanteenFloorTexture();
    const canteenFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 8),
      new THREE.MeshStandardMaterial({ map: canteenFloorTex, roughness: 0.4 })
    );
    canteenFloor.rotation.x = -Math.PI / 2;
    canteenFloor.position.set(0, 0.02, 0);
    canteenFloor.receiveShadow = true;
    canteenGroup.add(canteenFloor);

    // Glass Partition Walls facing the warehouse racks & aisle
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xa5f3fc,
      transparent: true,
      opacity: 0.28,
      roughness: 0.1,
      metalness: 0.8
    });
    const mullionMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });

    // West Partition Glass (facing Rack 3)
    const westGlass = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.5, 8), glassMat);
    westGlass.position.set(-5, 2.25, 0);
    canteenGroup.add(westGlass);

    // Front Glass Partition facing the aisle with Entrance Door Gap
    const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(6.5, 4.5, 0.08), glassMat);
    frontGlass.position.set(1.75, 2.25, 4);
    canteenGroup.add(frontGlass);

    // Mullion posts
    [[-5, -4], [-5, 4], [5, -4], [5, 4], [-1.5, 4]].forEach(([mx, mz]) => {
      const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.18, 4.6, 0.18), mullionMat);
      mullion.position.set(mx, 2.3, mz);
      canteenGroup.add(mullion);
    });

    // Warm Ambient Canteen Pendant Lighting
    const canteenLight = new THREE.PointLight(0xf59e0b, 1.8, 16);
    canteenLight.position.set(0, 4.0, 0);
    canteenGroup.add(canteenLight);

    // Glowing Signboard right above the Entrance Door
    const canteenSignMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 1.2),
      new THREE.MeshBasicMaterial({ map: createCanteenSignTexture() })
    );
    canteenSignMesh.position.set(-3.2, 4.6, 4.05);
    canteenGroup.add(canteenSignMesh);

    // Cafeteria Dining Table
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.5 });
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.1, 1.4), tableMat);
    tableTop.position.set(1.5, 1.0, 0);
    tableTop.castShadow = true;
    canteenGroup.add(tableTop);

    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.1 });
    [[-1.3, -0.5], [1.3, -0.5], [-1.3, 0.5], [1.3, 0.5]].forEach(([tx, tz]) => {
      const tLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.95), chromeMat);
      tLeg.position.set(1.5 + tx, 0.48, tz);
      canteenGroup.add(tLeg);
    });

    // 2 Dining Chairs (Opposite each other)
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 });
    const createChair = (cx, cz, rotY) => {
      const chair = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.06, 0.65), chairMat);
      seat.position.set(0, 0.6, 0);
      chair.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.06), chairMat);
      back.position.set(0, 0.95, -0.3);
      chair.add(back);
      [[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]].forEach(([lx, lz]) => {
        const cLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.6), chromeMat);
        cLeg.position.set(lx, 0.3, lz);
        chair.add(cLeg);
      });
      chair.position.set(cx, 0, cz);
      chair.rotation.y = rotY;
      canteenGroup.add(chair);
      return chair;
    };

    createChair(1.5, -1.1, 0); // Seat 1 (facing table)
    createChair(1.5, 1.1, Math.PI); // Seat 2 (facing table)

    // Food plates & coffee mugs
    const plateMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc });
    [-0.5, 0.5].forEach((px) => {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.03, 16), plateMat);
      plate.position.set(1.5 + px, 1.07, 0);
      canteenGroup.add(plate);

      const food = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.14), new THREE.MeshStandardMaterial({ color: 0xd97706 }));
      food.position.set(1.5 + px, 1.12, 0);
      canteenGroup.add(food);
    });

    const mugMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const mug1 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.14, 16), mugMat);
    mug1.position.set(1.0, 1.13, -0.3);
    canteenGroup.add(mug1);

    const mug2 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.14, 16), mugMat);
    mug2.position.set(2.0, 1.13, 0.3);
    canteenGroup.add(mug2);

    // Glowing Vending Machine in Canteen
    const vendingMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 2.5, 0.8),
      new THREE.MeshStandardMaterial({ map: createVendingTexture() })
    );
    vendingMesh.position.set(3.8, 1.25, -3.2);
    canteenGroup.add(vendingMesh);

    // Water Cooler
    const waterCooler = new THREE.Group();
    const coolerBody = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.1, 0.45), new THREE.MeshStandardMaterial({ color: 0xf1f5f9 }));
    coolerBody.position.set(0, 0.55, 0);
    waterCooler.add(coolerBody);
    const waterBottle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.5, 16),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65 })
    );
    waterBottle.position.set(0, 1.38, 0);
    waterCooler.add(waterBottle);
    waterCooler.position.set(3.8, 0, 2.5);
    canteenGroup.add(waterCooler);

    scene.add(canteenGroup);

    // 8. MULTI-WORKER SYSTEM: 4 AUTOMATED WORKERS IN HARMONY
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.6 });
    const bluePantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.4 });

    // Helper: Build a Standard Animated Worker Model
    const createWorkerRig = (vestColor, hasScanner = true) => {
      const rig = new THREE.Group();

      // Left Leg
      const leftLegGroup = new THREE.Group();
      leftLegGroup.position.set(-0.12, 0.82, 0);
      const lLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.74, 12), bluePantsMat);
      lLeg.position.set(0, -0.37, 0);
      leftLegGroup.add(lLeg);
      const lBoot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.25), new THREE.MeshStandardMaterial({ color: 0x1c1917 }));
      lBoot.position.set(0, -0.72, 0.04);
      leftLegGroup.add(lBoot);
      rig.add(leftLegGroup);

      // Right Leg
      const rightLegGroup = new THREE.Group();
      rightLegGroup.position.set(0.12, 0.82, 0);
      const rLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.74, 12), bluePantsMat);
      rLeg.position.set(0, -0.37, 0);
      rightLegGroup.add(rLeg);
      const rBoot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.25), new THREE.MeshStandardMaterial({ color: 0x1c1917 }));
      rBoot.position.set(0, -0.72, 0.04);
      rightLegGroup.add(rBoot);
      rig.add(rightLegGroup);

      // Torso & Hi-Vis Vest
      const torsoGroup = new THREE.Group();
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.24), new THREE.MeshStandardMaterial({ color: 0x1e3a8a }));
      torso.position.set(0, 1.18, 0);
      torsoGroup.add(torso);

      const vest = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.48, 0.26), new THREE.MeshStandardMaterial({ color: vestColor }));
      vest.position.set(0, 1.18, 0);
      torsoGroup.add(vest);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), skinMat);
      head.position.set(0, 1.58, 0);
      torsoGroup.add(head);

      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), helmetMat);
      helmet.position.set(0, 1.6, 0);
      torsoGroup.add(helmet);

      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 16), helmetMat);
      brim.position.set(0, 1.6, 0.04);
      torsoGroup.add(brim);
      rig.add(torsoGroup);

      // Arms
      const leftArmGroup = new THREE.Group();
      leftArmGroup.position.set(-0.28, 1.38, 0);
      const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.48, 12), new THREE.MeshStandardMaterial({ color: 0x1e3a8a }));
      lArm.position.set(0, -0.24, 0);
      leftArmGroup.add(lArm);
      rig.add(leftArmGroup);

      const rightArmGroup = new THREE.Group();
      rightArmGroup.position.set(0.28, 1.38, 0);
      const rArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.48, 12), new THREE.MeshStandardMaterial({ color: 0x1e3a8a }));
      rArm.position.set(0, -0.24, 0);
      rightArmGroup.add(rArm);

      // Scanner & Laser
      let laserBeam = null;
      if (hasScanner) {
        const scannerDevice = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.14), new THREE.MeshStandardMaterial({ color: 0x111827 }));
        scannerDevice.position.set(0, -0.48, 0.1);
        rightArmGroup.add(scannerDevice);

        laserBeam = new THREE.Mesh(
          new THREE.CylinderGeometry(0.008, 0.008, 4.2),
          new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.9 })
        );
        laserBeam.rotation.x = Math.PI / 2;
        laserBeam.position.set(0, -0.48, 2.2);
        laserBeam.visible = false;
        rightArmGroup.add(laserBeam);
      }
      rig.add(rightArmGroup);

      // Carried Box
      const carriedBox = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.36, 0.38), new THREE.MeshStandardMaterial({ color: 0xc79c6e }));
      carriedBox.position.set(0, 1.15, 0.32);
      carriedBox.visible = false;
      rig.add(carriedBox);

      // Floating Status Bubble
      const statusData = createWorkerStatusTexture('Worker Ready', '#22c55e');
      const statusSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: statusData.texture }));
      statusSprite.scale.set(3.2, 0.8, 1);
      statusSprite.position.set(0, 2.25, 0);
      rig.add(statusSprite);

      const updateBubble = (msg, color = '#22c55e') => {
        const ctx = statusData.ctx;
        ctx.clearRect(0, 0, 512, 120);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.beginPath();
        ctx.roundRect(16, 16, 480, 88, 24);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(48, 60, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(msg, 72, 68);
        statusData.texture.needsUpdate = true;
      };

      return {
        group: rig,
        leftLeg: leftLegGroup,
        rightLeg: rightLegGroup,
        leftArm: leftArmGroup,
        rightArm: rightArmGroup,
        torso: torsoGroup,
        laser: laserBeam,
        carriedBox,
        statusSprite,
        updateBubble
      };
    };

    // WORKER 1: Rahul (Hi-Vis Lime) - Cycles: Rack 1 -> Scan -> Staging -> Canteen for Chai!
    const worker1 = createWorkerRig(0x84cc16, true);
    worker1.group.position.set(-8.5, 0, 3.2);
    scene.add(worker1.group);

    // WORKER 2: Amit (Hi-Vis Orange) - Cycles: Canteen Break -> Walks to Rack 2 & 3 -> Scans
    const worker2 = createWorkerRig(0xea580c, true);
    worker2.group.position.set(19.0, 0, 1.5);
    scene.add(worker2.group);

    // WORKER 3: Rohit (Staging Operator - Hi-Vis Sky Blue)
    const worker3 = createWorkerRig(0x0284c7, false);
    worker3.group.position.set(-2.0, 0, 5.5);
    scene.add(worker3.group);

    // WORKER 4: Forklift Driver Vikram & Moving Forklift
    const forkliftGroup = new THREE.Group();
    const yellowBodyMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.6, roughness: 0.3 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 2.2), yellowBodyMat);
    body.position.set(0, 0.65, 0);
    forkliftGroup.add(body);

    const blackMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.7 });
    const weight = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 0.6), blackMat);
    weight.position.set(0, 0.7, -1.0);
    forkliftGroup.add(weight);

    // Roll Cage
    const cageMat = new THREE.MeshStandardMaterial({ color: 0x1f2937 });
    [[-0.7, -0.6], [0.7, -0.6], [-0.7, 0.6], [0.7, 0.6]].forEach(([cx, cz]) => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4), cageMat);
      pillar.position.set(cx, 1.7, cz);
      forkliftGroup.add(pillar);
    });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 1.4), cageMat);
    roof.position.set(0, 2.4, 0);
    forkliftGroup.add(roof);

    const beaconLight = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 16), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
    beaconLight.position.set(0, 2.5, 0);
    forkliftGroup.add(beaconLight);

    // Driver inside cabin
    const driverGroup = new THREE.Group();
    const dTorso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.45, 0.22), new THREE.MeshStandardMaterial({ color: 0x84cc16 }));
    dTorso.position.set(0, 1.35, -0.1);
    driverGroup.add(dTorso);
    const dHead = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), skinMat);
    dHead.position.set(0, 1.7, -0.1);
    driverGroup.add(dHead);
    const dHelmet = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), helmetMat);
    dHelmet.position.set(0, 1.72, -0.1);
    driverGroup.add(dHelmet);
    forkliftGroup.add(driverGroup);

    // Mast & Forks
    const mastGroup = new THREE.Group();
    [-0.4, 0.4].forEach((mx) => {
      const mast = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.8, 0.12), blackMat);
      mast.position.set(mx, 1.5, 1.2);
      mastGroup.add(mast);
    });
    const forkSilverMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });
    [-0.25, 0.25].forEach((fx) => {
      const fork = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 1.2), forkSilverMat);
      fork.position.set(fx, 0.12, 1.7);
      mastGroup.add(fork);
    });
    const forkPallet = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 1.1), palletMat);
    forkPallet.position.set(0, 0.2, 1.7);
    mastGroup.add(forkPallet);
    const forkBox = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 0.9), new THREE.MeshStandardMaterial({ color: 0xc79c6e }));
    forkBox.position.set(0, 0.56, 1.7);
    mastGroup.add(forkBox);
    forkliftGroup.add(mastGroup);

    // Wheels
    const wheels = [];
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
    [[-0.8, -0.7], [0.8, -0.7], [-0.8, 0.7], [0.8, 0.7]].forEach(([wx, wz]) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.24, 16), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.3, wz);
      forkliftGroup.add(wheel);
      wheels.push(wheel);
    });

    forkliftGroup.position.set(8.0, 0, 9.5);
    scene.add(forkliftGroup);

    // 9. CAMERA CONTROLS (Clean Standard Views: Isometric, Eye-Level, Top-Down)
    let cameraAngle = {
      theta: 0.35,
      phi: 1.05,
      radius: 30,
      target: new THREE.Vector3(4, 3, 1)
    };

    const applyCameraPreset = (preset) => {
      if (preset === 'isometric') {
        cameraAngle = { theta: 0.35, phi: 1.05, radius: 30, target: new THREE.Vector3(4, 3, 1) };
      } else if (preset === 'aisle') {
        cameraAngle = { theta: 0.08, phi: 1.48, radius: 14, target: new THREE.Vector3(2, 2.0, 2) };
      } else if (preset === 'topdown') {
        cameraAngle = { theta: 0.0, phi: 0.06, radius: 40, target: new THREE.Vector3(4, 0, 1) };
      }
      updateCamera();
    };

    cameraControlRef.current = {
      setPreset: (preset) => {
        setCameraPreset(preset);
        applyCameraPreset(preset);
      }
    };

    const updateCamera = () => {
      cameraAngle.phi = Math.max(0.04, Math.min(Math.PI / 2 - 0.04, cameraAngle.phi));
      camera.position.x = cameraAngle.target.x + cameraAngle.radius * Math.sin(cameraAngle.phi) * Math.sin(cameraAngle.theta);
      camera.position.y = cameraAngle.target.y + cameraAngle.radius * Math.cos(cameraAngle.phi);
      camera.position.z = cameraAngle.target.z + cameraAngle.radius * Math.sin(cameraAngle.phi) * Math.cos(cameraAngle.theta);
      camera.lookAt(cameraAngle.target);
    };
    updateCamera();

    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      const rect = currentMount.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / height) * 2 + 1;

      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        cameraAngle.theta -= deltaX * 0.006;
        cameraAngle.phi += deltaY * 0.006;
        updateCamera();
        previousMousePosition = { x: e.clientX, y: e.clientY };
      }

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
      const intersects = raycaster.intersectObjects(interactiveObjects);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        if (hit.userData?.bin) {
          setHoveredBinInfo(hit.userData.bin);
          setTooltipPos({ x: e.clientX - rect.left + 15, y: e.clientY - rect.top + 15 });
          document.body.style.cursor = 'pointer';
        }
      } else {
        setHoveredBinInfo(null);
        document.body.style.cursor = 'default';
      }
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onClick = (e) => {
      const rect = currentMount.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
      const intersects = raycaster.intersectObjects(interactiveObjects);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        if (hit.userData?.bin) {
          if (soundEnabled) playScannerBeep();
          if (onSelectBin) onSelectBin(hit.userData.bin);
        }
      }
    };

    const onWheel = (e) => {
      e.preventDefault();
      cameraAngle.radius = Math.max(6, Math.min(75, cameraAngle.radius + e.deltaY * 0.035));
      updateCamera();
    };

    currentMount.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    currentMount.addEventListener('click', onClick);
    currentMount.addEventListener('wheel', onWheel, { passive: false });

    // 10. REAL-TIME MULTI-WORKER WORK -> CANTEEN -> WORK SCHEDULE LOOP
    // Worker 1 (Rahul) Waypoints: Racks -> Staging -> Canteen Entrance -> Dining Table Chai -> Return
    const w1Waypoints = [
      { x: -8.5, z: 3.2, rotY: Math.PI, action: 'SCAN_RACK_1', label: '🔍 Rahul: Scanning Rack 1 (Level 1)' },
      { x: -2.0, z: 5.5, rotY: 0, action: 'PICK_BOX', label: '📦 Rahul: Picking Carton at Intake' },
      { x: 0.0, z: 3.2, rotY: Math.PI, action: 'PUTAWAY_RACK_2', label: '📥 Rahul: Storing into Rack 2' },
      { x: 14.5, z: 3.6, rotY: 0, action: 'WALK', label: '🚶 Rahul: Heading to Canteen for Chai Break' },
      { x: 19.0, z: 0.5, rotY: 0, action: 'CANTEEN_CHAI', label: '☕ Rahul: Having Chai & Relaxing in Canteen' },
      { x: 14.5, z: 3.6, rotY: Math.PI, action: 'WALK', label: '🚶 Rahul: Break Over, Returning to Aisle Racks' }
    ];

    // Worker 2 (Amit) Waypoints: Finishes Canteen -> Enters Aisle -> Scans Rack 3 -> Staging
    const w2Waypoints = [
      { x: 19.0, z: 2.0, rotY: Math.PI, action: 'CANTEEN_LUNCH', label: '☕ Amit: Having Lunch in Canteen' },
      { x: 14.5, z: 3.6, rotY: Math.PI, action: 'WALK', label: '🚶 Amit: Lunch Done, Heading to Rack 3' },
      { x: 8.5, z: 3.2, rotY: Math.PI, action: 'SCAN_RACK_3', label: '🔍 Amit: Laser Scanning Rack 3' },
      { x: 0.0, z: 5.5, rotY: Math.PI / 2, action: 'STAGING_CHECK', label: '📋 Amit: Verifying Staging Pallets' },
      { x: 14.5, z: 3.6, rotY: 0, action: 'WALK', label: '🚶 Amit: Walking into Canteen for Rest' }
    ];

    let w1Index = 0;
    let w1State = 'WALKING';
    let w1Timer = 0;
    let w1Clock = 0;

    let w2Index = 0;
    let w2State = 'WORKING';
    let w2Timer = 0;
    let w2Clock = 0;

    let forkliftDirection = 1;

    // Helper: Step animate a worker towards waypoint
    const animateWorkerStep = (worker, targetWp, walkClock, carriedBox) => {
      const legSwing = Math.sin(walkClock * 6) * 0.55;
      worker.leftLeg.rotation.x = legSwing;
      worker.rightLeg.rotation.x = -legSwing;

      if (!carriedBox) {
        worker.leftArm.rotation.x = -legSwing * 0.6;
        worker.rightArm.rotation.x = legSwing * 0.6;
      } else {
        worker.leftArm.rotation.x = -Math.PI / 3;
        worker.rightArm.rotation.x = -Math.PI / 3;
      }

      worker.group.position.y = Math.abs(Math.sin(walkClock * 6)) * 0.04;

      const dx = targetWp.x - worker.group.position.x;
      const dz = targetWp.z - worker.group.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 0.15) {
        const moveSpeed = 0.045;
        worker.group.position.x += (dx / dist) * moveSpeed;
        worker.group.position.z += (dz / dist) * moveSpeed;
        worker.group.rotation.y = Math.atan2(dx, dz);
        return false;
      } else {
        worker.leftLeg.rotation.x = 0;
        worker.rightLeg.rotation.x = 0;
        worker.group.position.y = 0;
        worker.group.rotation.y = targetWp.rotY;
        return true;
      }
    };

    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (simActiveRef.current) {
        // --- WORKER 1 (RAHUL) ---
        const w1Target = w1Waypoints[w1Index];
        if (w1State === 'WALKING') {
          w1Clock += 0.08;
          const arrived = animateWorkerStep(worker1, w1Target, w1Clock, worker1.carriedBox.visible);
          if (arrived) {
            w1State = 'WORKING';
            w1Timer = 0;
            worker1.updateBubble(w1Target.label, '#38bdf8');
          }
        } else if (w1State === 'WORKING') {
          w1Timer += 0.016;

          if (w1Target.action === 'SCAN_RACK_1') {
            worker1.rightArm.rotation.x = -Math.PI / 2.5;
            if (worker1.laser) {
              worker1.laser.visible = true;
              worker1.laser.rotation.y = Math.sin(w1Timer * 6) * 0.18;
            }
            if (w1Timer > 0.3 && w1Timer < 0.33 && soundEnabled) playScannerBeep();
            if (w1Timer > 3.0) {
              if (worker1.laser) worker1.laser.visible = false;
              worker1.rightArm.rotation.x = 0;
              w1State = 'WALKING';
              w1Index = (w1Index + 1) % w1Waypoints.length;
            }
          } else if (w1Target.action === 'PICK_BOX') {
            if (w1Timer > 0.8) worker1.carriedBox.visible = true;
            if (w1Timer > 2.0) {
              w1State = 'WALKING';
              w1Index = (w1Index + 1) % w1Waypoints.length;
            }
          } else if (w1Target.action === 'PUTAWAY_RACK_2') {
            if (w1Timer > 1.0) worker1.carriedBox.visible = false;
            if (w1Timer > 2.2) {
              w1State = 'WALKING';
              w1Index = (w1Index + 1) % w1Waypoints.length;
            }
          } else if (w1Target.action === 'CANTEEN_CHAI') {
            // SITTING AT DINING TABLE SIPPING CHAI
            worker1.leftLeg.rotation.x = -Math.PI / 2;
            worker1.rightLeg.rotation.x = -Math.PI / 2;
            worker1.group.position.y = -0.3; // Sit down height

            // Lift arm to drink
            if (Math.sin(w1Timer * 2) > 0.2) {
              worker1.rightArm.rotation.x = -Math.PI / 2.3;
            } else {
              worker1.rightArm.rotation.x = -0.2;
            }

            if (w1Timer > 5.5) { // 5.5s chai break
              worker1.leftLeg.rotation.x = 0;
              worker1.rightLeg.rotation.x = 0;
              worker1.group.position.y = 0; // Stand up!
              worker1.rightArm.rotation.x = 0;
              w1State = 'WALKING';
              w1Index = (w1Index + 1) % w1Waypoints.length;
            }
          } else {
            if (w1Timer > 1.5) {
              w1State = 'WALKING';
              w1Index = (w1Index + 1) % w1Waypoints.length;
            }
          }
        }

        // --- WORKER 2 (AMIT) ---
        const w2Target = w2Waypoints[w2Index];
        if (w2State === 'WALKING') {
          w2Clock += 0.08;
          const arrived = animateWorkerStep(worker2, w2Target, w2Clock, false);
          if (arrived) {
            w2State = 'WORKING';
            w2Timer = 0;
            worker2.updateBubble(w2Target.label, '#f59e0b');
          }
        } else if (w2State === 'WORKING') {
          w2Timer += 0.016;

          if (w2Target.action === 'CANTEEN_LUNCH') {
            worker2.leftLeg.rotation.x = -Math.PI / 2;
            worker2.rightLeg.rotation.x = -Math.PI / 2;
            worker2.group.position.y = -0.3;

            if (Math.sin(w2Timer * 2.5) > 0.3) {
              worker2.leftArm.rotation.x = -Math.PI / 2.5; // Eating sandwich
            } else {
              worker2.leftArm.rotation.x = -0.2;
            }

            if (w2Timer > 5.0) {
              worker2.leftLeg.rotation.x = 0;
              worker2.rightLeg.rotation.x = 0;
              worker2.group.position.y = 0; // Stand up!
              worker2.leftArm.rotation.x = 0;
              w2State = 'WALKING';
              w2Index = (w2Index + 1) % w2Waypoints.length;
            }
          } else if (w2Target.action === 'SCAN_RACK_3') {
            worker2.rightArm.rotation.x = -Math.PI / 2.3;
            if (worker2.laser) {
              worker2.laser.visible = true;
              worker2.laser.rotation.y = Math.sin(w2Timer * 6) * 0.18;
            }
            if (w2Timer > 0.3 && w2Timer < 0.33 && soundEnabled) playScannerBeep();
            if (w2Timer > 3.0) {
              if (worker2.laser) worker2.laser.visible = false;
              worker2.rightArm.rotation.x = 0;
              w2State = 'WALKING';
              w2Index = (w2Index + 1) % w2Waypoints.length;
            }
          } else {
            if (w2Timer > 2.0) {
              w2State = 'WALKING';
              w2Index = (w2Index + 1) % w2Waypoints.length;
            }
          }
        }

        // --- WORKER 3 (ROHIT) Staging idle breathing & nod ---
        worker3.torso.rotation.x = Math.sin(Date.now() * 0.002) * 0.04;
        worker3.leftArm.rotation.x = Math.sin(Date.now() * 0.002) * 0.08;

        // --- FORKLIFT TRANSIT DRIVE ---
        forkliftGroup.position.x += 0.03 * forkliftDirection;
        wheels.forEach((w) => {
          w.rotation.x += 0.05 * forkliftDirection;
        });

        beaconLight.material.color.setHex((Math.sin(Date.now() * 0.01) > 0) ? 0xf59e0b : 0x78350f);

        if (forkliftGroup.position.x > 14) {
          forkliftDirection = -1;
          forkliftGroup.rotation.y = Math.PI / 2;
        } else if (forkliftGroup.position.x < -14) {
          forkliftDirection = 1;
          forkliftGroup.rotation.y = -Math.PI / 2;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    // 11. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      currentMount.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      currentMount.removeEventListener('click', onClick);
      currentMount.removeEventListener('wheel', onWheel);
      if (renderer.domElement && currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
      document.body.style.cursor = 'default';
    };
  }, [bins, matchedBinIds, selectedBin, soundEnabled]);

  return (
    <div className="relative w-full h-[670px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Top Left: Facility Camera Presets & Controls */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
        <div className="bg-slate-900/90 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-700/70 text-xs text-white shadow-xl space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-cyan-400">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span>Industrial 3D Digital Twin</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
              AUTONOMOUS CYCLE ACTIVE
            </span>
          </div>
          <div className="text-[11px] text-slate-300 space-y-0.5">
            <p>• <strong>Workers work at racks</strong> & walk into the <strong>Canteen for lunch/chai</strong> automatically!</p>
            <p>• <strong>Canteen Section</strong> is situated directly on the side of the racks</p>
            <p>• Left Click + Drag: <strong>Orbit 360°</strong> | Click Pallet: <strong>Putaway & Edit</strong></p>
          </div>
        </div>

        {/* Camera View Switcher Buttons (Standard Clean HUD) */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/70 text-xs shadow-lg">
          <button
            type="button"
            onClick={() => cameraControlRef.current?.setPreset('isometric')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
              cameraPreset === 'isometric'
                ? 'bg-primary-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Eye className="w-3.5 h-3.5" /> Isometric 3D
          </button>

          <button
            type="button"
            onClick={() => cameraControlRef.current?.setPreset('aisle')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
              cameraPreset === 'aisle'
                ? 'bg-primary-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5" /> Eye-Level Aisle
          </button>

          <button
            type="button"
            onClick={() => cameraControlRef.current?.setPreset('topdown')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
              cameraPreset === 'topdown'
                ? 'bg-primary-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Top-Down
          </button>

          <div className="w-[1px] h-4 bg-slate-700 mx-1" />

          {/* Pause / Resume */}
          <button
            type="button"
            onClick={() => setSimActive(!simActive)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all ${
              simActive ? 'text-amber-400 hover:bg-slate-800' : 'text-emerald-400 hover:bg-slate-800'
            }`}
            title={simActive ? 'Pause Worker Simulation' : 'Resume Worker Simulation'}
          >
            {simActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all ${
              soundEnabled ? 'text-cyan-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-800'
            }`}
            title="Toggle Barcode Scanner Beep Sound"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Top Right: Status Legend HUD */}
      <div className="absolute top-4 right-4 bg-slate-900/85 backdrop-blur-md px-3.5 py-3 rounded-xl border border-slate-700/60 text-[11px] text-slate-300 space-y-1.5 shadow-xl hidden sm:block">
        <span className="font-bold text-white block text-[11px] border-b border-slate-700/60 pb-1">
          LIVING FACILITY ENTITIES
        </span>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-lime-400 animate-pulse" />
          <span>Worker Rahul (Work ⇄ Canteen Cycle)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span>Worker Amit (Lunch ⇄ Rack Scanning)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
          <span>Worker Rohit (Staging Operator)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-xs bg-amber-400" />
          <span>Forklift Driver Vikram (Transit Lane)</span>
        </div>
      </div>

      {/* Floating 3D Hover Tooltip */}
      {hoveredBinInfo && (
        <div
          className="absolute z-50 pointer-events-none p-3.5 bg-slate-900/95 backdrop-blur-md border border-cyan-500/60 rounded-xl shadow-2xl text-xs space-y-2 text-white max-w-xs transition-all ring-1 ring-cyan-500/20"
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
        >
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-700">
            <span className="font-mono font-bold text-cyan-400 text-sm">{hoveredBinInfo.binCode}</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-semibold">
              {hoveredBinInfo.shelf}
            </span>
          </div>

          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between text-slate-300">
              <span>Location:</span>
              <span className="font-medium text-white">{hoveredBinInfo.zone} • {hoveredBinInfo.aisle} • {hoveredBinInfo.rack}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Load:</span>
              <strong className="text-white">
                {hoveredBinInfo.currentUnits} / {hoveredBinInfo.maxCapacity} units ({Math.round((hoveredBinInfo.currentUnits / hoveredBinInfo.maxCapacity) * 100)}%)
              </strong>
            </div>
          </div>

          {/* Mini Occupancy Bar */}
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                hoveredBinInfo.currentUnits >= hoveredBinInfo.maxCapacity
                  ? 'bg-rose-500'
                  : hoveredBinInfo.currentUnits / hoveredBinInfo.maxCapacity >= 0.7
                  ? 'bg-amber-500'
                  : hoveredBinInfo.currentUnits > 0
                  ? 'bg-emerald-500'
                  : 'bg-slate-600'
              }`}
              style={{
                width: `${Math.min(100, (hoveredBinInfo.currentUnits / (hoveredBinInfo.maxCapacity || 1)) * 100)}%`
              }}
            />
          </div>

          {hoveredBinInfo.assignedSkus?.length > 0 ? (
            <div className="pt-1.5 space-y-1 text-[11px] border-t border-slate-800">
              <span className="font-semibold text-slate-400 block text-[10px]">STORED ERP PRODUCT:</span>
              {hoveredBinInfo.assignedSkus.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-white bg-slate-800/60 px-2 py-1 rounded">
                  <div className="truncate pr-2">
                    <span className="font-mono text-cyan-300 block text-[10px] font-bold">{item.sku}</span>
                    <span className="text-[10px] text-slate-300 truncate">{item.productName || 'Product'}</span>
                  </div>
                  <span className="font-bold text-emerald-400 shrink-0 text-xs">{item.quantity} pcs</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800">
              Empty Pallet Slot (Ready for stock putaway)
            </p>
          )}

          <div className="pt-1 text-[10px] text-cyan-400/80 font-mono text-center">
            Click to scan & inspect bin details
          </div>
        </div>
      )}
    </div>
  );
};

export default Warehouse3DScene;
