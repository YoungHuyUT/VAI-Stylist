import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Camera,
  Upload,
  Download,
  Box,
  Layers,
  Check,
  Sun,
  Palette,
  Sparkles,
  Wind,
  User,
  Shirt,
  Footprints,
  Compass,
} from 'lucide-react';
import {
  TopGarmentOption,
  TraditionalColor,
  BottomGarmentOption,
  HairStyleId,
  ExpressionId,
  PatternId,
  FabricMaterialId,
  NecklineCutId,
  HemLengthCutId,
  HAIR_STYLES,
  HAIR_COLORS,
  EXPRESSIONS,
  TRADITIONAL_COLORS,
  BOTTOM_GARMENTS,
  CATALOG_COLOR_SWATCHES,
  getFabricMaterialSpec,
} from '../data/vietPhucData';
import {
  loadSuppliedCostumeGlb,
  LoadedCostumeModel,
  registerSuppliedGlbFile,
} from './vietPhucGlbLoader';
import {
  useOutfitState,
  registerDesignSnapshotProvider,
  getDesignSnapshot,
} from '../state/outfitStore';
import {
  StoredTurntableData,
  resolveTurntableFrames,
  renderRecoloredTurntableFrame,
  exportTurntableAndMeshyZip,
  loadImageElement,
  getCachedRecoloredCanvas,
  getDetectedFaceBox,
  prewarmAdjacentTurnaroundSheets,
} from '../utils/vstylistStorageAndZip';
import { TurnaroundAiStudioModal } from './TurnaroundAiStudioModal';
import { useGranularSceneAttachments } from './useGranularSceneAttachments';

export { getDesignSnapshot };

export interface VietPhucCanvasProps {
  genderEn: 'male' | 'female';
  onToggleGender: (g: 'male' | 'female') => void;
  hairStyle?: HairStyleId;
  hairColorHex?: string;
  expression?: ExpressionId;
  isCharacterTab?: boolean;
  topGarment: TopGarmentOption;
  color: TraditionalColor;
  patternId?: PatternId;
  fabricMaterialId?: FabricMaterialId;
  bottomGarment: BottomGarmentOption;
  accessories: string[];
  culturalStatus: 'SAFE' | 'WARNING' | 'CRITICAL';
  onCycleTop: (dir: -1 | 1) => void;
  onCycleColor: (dir: -1 | 1) => void;
  onCycleBottom: (dir: -1 | 1) => void;
  isNotebookActive: boolean;
  onToggleNotebook: () => void;
  onOpenBodyShapeModal?: () => void;
}

const ANGLE_NAMES_VI = [
  'Chính diện (0°)',
  'Nghiêng trái (90°)',
  'Phía sau (180°)',
  'Nghiêng phải (270°)',
];

const CLOTH_NODE_COUNT = 8;

interface ClothPhysicsChainState {
  nodesX: Float32Array;
  velX: Float32Array;
  flare: number;
  flareVel: number;
  prevAngleDeg: number;
  lastTimestamp: number;
}

function getFabricPhysicsParams(fabricId: FabricMaterialId): {
  stiffness: number;
  damping: number;
  breezeAmp: number;
  flareScale: number;
} {
  switch (fabricId) {
    case 'gam-trieu-dinh':
      return { stiffness: 195, damping: 8.8, breezeAmp: 1.0, flareScale: 0.75 };
    case 'dui-to':
      return { stiffness: 150, damping: 7.2, breezeAmp: 1.5, flareScale: 0.95 };
    case 'lua-ha-dong':
    default:
      return { stiffness: 125, damping: 5.8, breezeAmp: 2.1, flareScale: 1.15 };
  }
}

function renderFrameWithClothPhysics(
  mainCanvas: HTMLCanvasElement,
  source: HTMLCanvasElement | HTMLImageElement,
  sim: ClothPhysicsChainState,
  physicsEnabled: boolean,
  timeSec: number,
  fabricId: FabricMaterialId
): void {
  const ctx = mainCanvas.getContext('2d');
  if (!ctx) return;
  const w = mainCanvas.width || 768;
  const h = mainCanvas.height || 1152;

  ctx.clearRect(0, 0, w, h);

  // Always draw the full character frame 1:1 without horizontal strip-slicing
  // so legs, trousers, ankles, and shoes remain 100% razor-sharp with zero broken pixels or shearing!
  ctx.drawImage(source, 0, 0, w, h);

  if (!physicsEnabled) {
    return;
  }

  void timeSec;
  void fabricId;
  const CLOTH_START_Y = 396;
  const CLOTH_END_Y = 920;
  const spanY = CLOTH_END_Y - CLOTH_START_Y;

  // Dynamic kinetic fold sheen & shadow modulation across the upper/mid garment (`source-atop` preserves alpha & sharpness 100%)
  const tipSway = sim.nodesX[CLOTH_NODE_COUNT - 2];
  if (Math.abs(tipSway) > 0.35 || sim.flare > 0.015) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    const sheenIntensity = Math.min(0.11, Math.abs(tipSway) * 0.0035 + sim.flare * 0.06);
    const grad = ctx.createLinearGradient(w * 0.22, 480, w * 0.78, 860);
    if (tipSway >= 0) {
      grad.addColorStop(0, `rgba(28, 25, 23, ${(sheenIntensity * 0.65).toFixed(3)})`);
      grad.addColorStop(0.5, 'rgba(255, 250, 240, 0.0)');
      grad.addColorStop(1, `rgba(255, 250, 235, ${sheenIntensity.toFixed(3)})`);
    } else {
      grad.addColorStop(0, `rgba(255, 250, 235, ${sheenIntensity.toFixed(3)})`);
      grad.addColorStop(0.5, 'rgba(255, 250, 240, 0.0)');
      grad.addColorStop(1, `rgba(28, 25, 23, ${(sheenIntensity * 0.65).toFixed(3)})`);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, CLOTH_START_Y, w, spanY);
    ctx.restore();
  }
}

function createSoftContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 120);
  grad.addColorStop(0, 'rgba(28, 25, 23, 0.42)');
  grad.addColorStop(0.45, 'rgba(28, 25, 23, 0.18)');
  grad.addColorStop(1, 'rgba(28, 25, 23, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export const VietPhucCanvas: React.FC<VietPhucCanvasProps> = ({
  genderEn,
  onToggleGender,
  hairStyle = 'bui-truyen-thong',
  hairColorHex = '#181513',
  expression = 'trang-nghiem',
  isCharacterTab = false,
  topGarment,
  color,
  patternId: propPatternId = 'none',
  fabricMaterialId = 'lua-ha-dong',
  bottomGarment,
  accessories = [],
  culturalStatus,
  onCycleTop,
  onCycleColor,
  onCycleBottom,
  isNotebookActive,
  onToggleNotebook,
  onOpenBodyShapeModal,
}) => {
  const {
    outfit,
    setEnableTrouserKey,
    setPrimaryColorById,
    setPrimaryColorHex,
    setTrouserByName,
    setTrouserColorHex,
  } = useOutfitState();

  const activeGender = outfit?.gender || genderEn;
  const activeCostumeId = outfit?.costumeId || topGarment.id;
  const activePatternId = outfit?.patternId || propPatternId;
  const activeAoHex = outfit?.colors?.ao || outfit?.colors?.primary || color.hex;
  const activeQuanHex =
    outfit?.colors?.quan || outfit?.colors?.trouser || bottomGarment.hex;
  const activeBottomId = bottomGarment.id;
  const activeAccessories = outfit?.accessories || accessories;
  const activeNecklineCut: NecklineCutId =
    outfit?.necklineCut || 'co-truyen-thong';
  const activeHemLengthCut: HemLengthCutId =
    outfit?.hemLengthCut || 'ta-dai-chuan';
  const activeHoaTietHex = outfit?.colors?.hoaTiet || '#D4AF37';
  const enableTrouserKey = outfit?.colors?.enableTrouserKey ?? true;
  const patternConfig = outfit?.patternConfig || {
    scale: 1.2,
    rotationDeg: 0,
    strength: 0.55,
  };

  const activeFabricSpec = useMemo(
    () => getFabricMaterialSpec(fabricMaterialId),
    [fabricMaterialId]
  );

  const mountRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const turntableCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Viewport priority state: 'loading' | 'glb' | 'turntable' | 'missing'
  const [viewerMode, setViewerMode] = useState<
    'loading' | 'glb' | 'turntable' | 'missing'
  >('loading');
  const [loadProgress, setLoadProgress] = useState<number>(15);
  const [posterLoadFailed, setPosterLoadFailed] = useState<boolean>(false);
  const [posterUseFallbackId, setPosterUseFallbackId] = useState<boolean>(false);
  const [reloadTick, setReloadTick] = useState<number>(0);
  const [snapshotCopied, setSnapshotCopied] = useState<boolean>(false);
  const [isAiStudioOpen, setIsAiStudioOpen] = useState<boolean>(false);

  // GLB specific state
  const [isGlbFromComputer, setIsGlbFromComputer] = useState<boolean>(false);
  const [calibratedHueInfo, setCalibratedHueInfo] = useState<{
    baseHueDeg: number;
    trouserHueDeg: number;
  }>({ baseHueDeg: 170, trouserHueDeg: 40 });
  const [lightAngleMode, setLightAngleMode] = useState<
    'studio' | 'grazing' | 'rim'
  >('studio');
  const lightAngleModeRef = useRef<'studio' | 'grazing' | 'rim'>('studio');

  // Real-time Cloth Physics Simulation state (Hooke's law spring-damper chain + centrifugal skirt flare)
  const [isPhysicsEnabled, setIsPhysicsEnabled] = useState<boolean>(() =>
    typeof window === 'undefined' || !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const isPhysicsEnabledRef = useRef<boolean>(isPhysicsEnabled);
  const fabricMaterialIdRef = useRef<FabricMaterialId>(fabricMaterialId);
  const activeSourceDrawableRef = useRef<
    HTMLCanvasElement | HTMLImageElement | null
  >(null);
  const clothSimRef = useRef<ClothPhysicsChainState>({
    nodesX: new Float32Array(CLOTH_NODE_COUNT),
    velX: new Float32Array(CLOTH_NODE_COUNT),
    flare: 0,
    flareVel: 0,
    prevAngleDeg: 0,
    lastTimestamp: 0,
  });

  const triggerClothImpulse = useCallback((angularDeltaDeg: number) => {
    if (!isPhysicsEnabledRef.current) return;
    const sim = clothSimRef.current;
    // Clamp impulse so both smooth drag and 90° step buttons produce natural silk lag & billow
    const clampedDelta = Math.max(-65, Math.min(65, angularDeltaDeg));
    for (let i = 1; i < CLOTH_NODE_COUNT; i++) {
      const weight = Math.pow(i / (CLOTH_NODE_COUNT - 1), 1.35);
      // Fabric lags opposite to rotation direction, then swings through via spring restoring force
      sim.velX[i] = Math.max(
        -520,
        Math.min(520, sim.velX[i] - clampedDelta * weight * 11.5)
      );
    }
    sim.flareVel = Math.min(
      2.4,
      sim.flareVel + Math.min(1.1, Math.abs(clampedDelta) * 0.022)
    );
  }, []);

  // 360° Image-Sequence Viewer state
  const [turntableData, setTurntableData] = useState<StoredTurntableData | null>(
    null
  );
  const [recoloredFrames, setRecoloredFrames] = useState<
    [string, string, string, string] | null
  >(null);
  const [turntableAngleDeg, setTurntableAngleDeg] = useState<number>(0); // continuous 0..360
  const [turntableZoom, setTurntableZoom] = useState<number>(1.0);
  const [showFaceLoupe, setShowFaceLoupe] = useState<boolean>(false);
  const hasAppearanceMountedRef = useRef<boolean>(false);
  const isDraggingTurntableRef = useRef<boolean>(false);
  const turntableAngleRef = useRef<number>(0);
  const dragLastXRef = useRef<number>(0);
  const dragLastTimeRef = useRef<number>(0);
  const dragVelocityRef = useRef<number>(0);
  const anglePublishRafRef = useRef<number>(0);
  const inertiaRafRef = useRef<number>(0);
  const hasMountedOnceRef = useRef<boolean>(false);
  const recoloredFramesRef = useRef<[string, string, string, string] | null>(
    null
  );
  const viewerModeRef = useRef<'loading' | 'glb' | 'turntable' | 'missing'>(
    'loading'
  );

  useEffect(() => {
    turntableAngleRef.current = turntableAngleDeg;
  }, [turntableAngleDeg]);

  useEffect(() => () => {
    cancelAnimationFrame(anglePublishRafRef.current);
    cancelAnimationFrame(inertiaRafRef.current);
  }, []);

  // Visual Trouser/Bottom fitting transition & procedural styling motion state
  const [trouserFittingState, setTrouserFittingState] = useState<{
    isFitting: boolean;
    bottomName: string;
    progress: number;
  }>({ isFitting: false, bottomName: '', progress: 0 });
  const prevBottomIdRef = useRef<string>(activeBottomId);
  const prevQuanHexRef = useRef<string>(activeQuanHex);
  const prevAoHexRef = useRef<string>(activeAoHex);
  const trouserFittingStartRef = useRef<number>(0);

  useEffect(() => {
    lightAngleModeRef.current = lightAngleMode;
  }, [lightAngleMode]);

  useEffect(() => {
    isPhysicsEnabledRef.current = isPhysicsEnabled;
    if (isPhysicsEnabled) {
      // Give a gentle initial silk sway impulse when Physics is toggled ON so user immediately sees fabric movement
      triggerClothImpulse(24);
    } else {
      const sim = clothSimRef.current;
      sim.nodesX.fill(0);
      sim.velX.fill(0);
      sim.flare = 0;
      sim.flareVel = 0;
      if (turntableCanvasRef.current && activeSourceDrawableRef.current) {
        renderFrameWithClothPhysics(
          turntableCanvasRef.current,
          activeSourceDrawableRef.current,
          sim,
          false,
          0,
          fabricMaterialIdRef.current
        );
      }
    }
  }, [isPhysicsEnabled, triggerClothImpulse]);

  useEffect(() => {
    fabricMaterialIdRef.current = fabricMaterialId;
  }, [fabricMaterialId]);

  // Inject rotational inertia impulse into the cloth simulation whenever turntableAngleDeg changes
  useEffect(() => {
    const sim = clothSimRef.current;
    let delta = turntableAngleDeg - sim.prevAngleDeg;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    sim.prevAngleDeg = turntableAngleDeg;
    if (Math.abs(delta) > 0.05) {
      triggerClothImpulse(delta);
    }
  }, [turntableAngleDeg, triggerClothImpulse]);

  useEffect(() => {
    recoloredFramesRef.current = recoloredFrames;
  }, [recoloredFrames]);

  useEffect(() => {
    viewerModeRef.current = viewerMode;
  }, [viewerMode]);

  // Detect Trouser / Bottom Garment or Color Changes & Trigger Procedural Styling Transition
  useEffect(() => {
    // Avoid triggering on first mount before model is loaded
    if (!hasMountedOnceRef.current) {
      prevBottomIdRef.current = activeBottomId;
      prevQuanHexRef.current = activeQuanHex;
      prevAoHexRef.current = activeAoHex;
      return;
    }
    const isBottomChange =
      prevBottomIdRef.current !== activeBottomId ||
      prevQuanHexRef.current !== activeQuanHex;
    const isAoColorChange = prevAoHexRef.current !== activeAoHex;

    if (isBottomChange || isAoColorChange) {
      prevBottomIdRef.current = activeBottomId;
      prevQuanHexRef.current = activeQuanHex;
      prevAoHexRef.current = activeAoHex;
      trouserFittingStartRef.current = performance.now();

      const label = isBottomChange
        ? `${bottomGarment.name} (${activeQuanHex})`
        : `Màu Áo ${color.name} (${activeAoHex})`;

      setTrouserFittingState({
        isFitting: true,
        bottomName: label,
        progress: 0,
      });

      // Inject fabric ripple & impulse into cloth physics for realistic fabric settling
      triggerClothImpulse(18);

      const duration = 880; // ms
      let animFrameId = 0;
      const step = () => {
        const elapsed = performance.now() - trouserFittingStartRef.current;
        const p = Math.min(1.0, elapsed / duration);
        setTrouserFittingState((prev) => ({
          ...prev,
          progress: p,
          isFitting: p < 1.0,
        }));
        if (p < 1.0) {
          animFrameId = requestAnimationFrame(step);
        }
      };
      animFrameId = requestAnimationFrame(step);

      return () => {
        if (animFrameId) cancelAnimationFrame(animFrameId);
      };
    }
  }, [activeBottomId, activeQuanHex, bottomGarment.name, triggerClothImpulse]);

  const modelId = `${activeCostumeId}-${activeGender}`;
  const posterUrl =
    turntableData?.posterDataUrl ||
    (posterUseFallbackId
      ? `/models/${activeCostumeId}.jpg`
      : `/models/${modelId}.jpg`);

  // Three.js scene references (lazily initialized only when a 3D GLB model is active)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelHolderRef = useRef<THREE.Group | null>(null);
  const loadedModelRef = useRef<LoadedCostumeModel | null>(null);
  const webglCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setPosterLoadFailed(false);
    setPosterUseFallbackId(false);
  }, [modelId]);

  // 1A. Register `getDesignSnapshot()`: PNG data URL of current front view, 3:4 aspect ratio, max 1024 px
  useEffect(() => {
    registerDesignSnapshotProvider(() => {
      const targetW = 768;
      const targetH = 1024; // 3:4 aspect ratio, max 1024px
      const outCanvas = document.createElement('canvas');
      outCanvas.width = targetW;
      outCanvas.height = targetH;
      const oCtx = outCanvas.getContext('2d');
      if (!oCtx) return null;

      // If 360° turntable mode is active, render front frame (frame_00) onto 3:4 warm ivory canvas
      if (viewerModeRef.current === 'turntable') {
        oCtx.fillStyle = '#F2EDE4';
        oCtx.fillRect(0, 0, targetW, targetH);

        // Soft shadow under feet
        oCtx.save();
        oCtx.translate(targetW / 2, targetH * 0.94);
        oCtx.scale(1.0, 0.22);
        const grad = oCtx.createRadialGradient(0, 0, 10, 0, 0, 175);
        grad.addColorStop(0, 'rgba(28, 25, 23, 0.35)');
        grad.addColorStop(1, 'rgba(28, 25, 23, 0.0)');
        oCtx.fillStyle = grad;
        oCtx.beginPath();
        oCtx.arc(0, 0, 175, 0, Math.PI * 2);
        oCtx.fill();
        oCtx.restore();

        const frontFrameKey = recoloredFramesRef.current?.[0];
        const frontCanvas =
          (frontFrameKey && getCachedRecoloredCanvas(frontFrameKey)) ||
          turntableCanvasRef.current;
        if (frontCanvas) {
          const drawH = targetH * 0.96;
          const drawW = drawH * (768 / 1152);
          oCtx.drawImage(
            frontCanvas,
            (targetW - drawW) / 2,
            targetH - drawH,
            drawW,
            drawH
          );
          return outCanvas.toDataURL('image/png');
        }
      }

      if (
        !rendererRef.current ||
        !sceneRef.current ||
        !cameraRef.current ||
        !controlsRef.current
      ) {
        return null;
      }

      const r = rendererRef.current;
      const s = sceneRef.current;
      const c = cameraRef.current;
      const ctrl = controlsRef.current;

      const prevCamPos = c.position.clone();
      const prevTarget = ctrl.target.clone();
      const prevAutoRotate = ctrl.autoRotate;

      ctrl.autoRotate = false;
      ctrl.target.set(0, 0.92, 0);
      c.position.set(0, 1.02, 3.75);
      ctrl.update();

      r.render(s, c);

      const srcCanvas = r.domElement;
      const srcW = srcCanvas.width;
      const srcH = srcCanvas.height;
      const targetAspect = 3 / 4;
      const srcAspect = srcW / srcH;

      let sx = 0;
      let sy = 0;
      let sw = srcW;
      let sh = srcH;
      if (srcAspect > targetAspect) {
        sw = Math.round(srcH * targetAspect);
        sx = Math.round((srcW - sw) / 2);
      } else {
        sh = Math.round(srcW / targetAspect);
        sy = Math.round((srcH - sh) / 2);
      }

      oCtx.fillStyle = '#F2EDE4';
      oCtx.fillRect(0, 0, targetW, targetH);
      oCtx.drawImage(srcCanvas, sx, sy, sw, sh, 0, 0, targetW, targetH);
      const outDataUrl = outCanvas.toDataURL('image/png');

      c.position.copy(prevCamPos);
      ctrl.target.copy(prevTarget);
      ctrl.autoRotate = prevAutoRotate;
      ctrl.update();
      r.render(s, c);

      return outDataUrl;
    });

    return () => {
      registerDesignSnapshotProvider(null);
      if (webglCleanupRef.current) {
        webglCleanupRef.current();
        webglCleanupRef.current = null;
      }
    };
  }, []);

  // 1B. Lazily initialize Three.js WebGLRenderer ONLY when a 3D GLB model is actually loaded,
  //     pre-probing WebGL context availability so blocked contexts never throw or log console errors.
  const ensureWebGLSceneInitialized = useCallback((): boolean => {
    if (rendererRef.current && modelHolderRef.current) {
      return true;
    }
    const container = mountRef.current;
    if (!container) return false;

    const glCanvas = document.createElement('canvas');
    const contextAttrs: WebGLContextAttributes = {
      alpha: false,
      antialias: true,
      powerPreference: 'default',
      preserveDrawingBuffer: true,
      failIfMajorPerformanceCaveat: false,
    };

    let glContext: WebGLRenderingContext | WebGL2RenderingContext | null = null;
    try {
      glContext =
        glCanvas.getContext('webgl2', contextAttrs) ||
        glCanvas.getContext('webgl', contextAttrs) ||
        (glCanvas.getContext(
          'experimental-webgl',
          contextAttrs
        ) as WebGLRenderingContext | null);
    } catch {
      glContext = null;
    }

    if (
      !glContext ||
      (typeof glContext.isContextLost === 'function' &&
        glContext.isContextLost())
    ) {
      return false;
    }

    let renderer: THREE.WebGLRenderer;
    const compactDevice =
      window.matchMedia('(max-width: 768px)').matches ||
      (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4);
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: glCanvas,
        context: glContext as WebGLRenderingContext,
        antialias: true,
        alpha: false,
        powerPreference: 'default',
        preserveDrawingBuffer: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, compactDevice ? 1.35 : 1.75));
      renderer.setClearColor(0xf2ede4, 1);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    } catch {
      return false;
    }

    const handleContextLost = (e: Event) => {
      e.preventDefault();
    };
    glCanvas.addEventListener('webglcontextlost', handleContextLost, false);

    const width = container.clientWidth || 460;
    const height = container.clientHeight || 560;
    renderer.setSize(width, height, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf2ede4);

    let envTexture: THREE.Texture | null = null;
    try {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      pmremGenerator.compileEquirectangularShader();
      envTexture = pmremGenerator.fromScene(
        new RoomEnvironment(),
        0.04
      ).texture;
      scene.environment = envTexture;
      if ('environmentIntensity' in scene) {
        (
          scene as THREE.Scene & { environmentIntensity: number }
        ).environmentIntensity = 0.78;
      }
      pmremGenerator.dispose();
    } catch {
      // Fallback to lights
    }

    const camera = new THREE.PerspectiveCamera(28, width / height, 0.1, 50);
    camera.position.set(0, 1.12, 3.85);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minPolarAngle = Math.PI * 0.2;
    controls.maxPolarAngle = Math.PI * 0.5;
    controls.minDistance = 1.75;
    controls.maxDistance = 4.9;
    controls.target.set(0, 1.02, 0);
    controls.autoRotate = false;
    controls.update();

    const hemiLight = new THREE.HemisphereLight(0xfffaf0, 0xd6cebe, 0.65);
    hemiLight.position.set(0, 3.5, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff8ee, 1.35);
    keyLight.position.set(2.2, 3.4, 2.8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = compactDevice ? 1024 : 1536;
    keyLight.shadow.mapSize.height = compactDevice ? 1024 : 1536;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 9.0;
    const d = 1.4;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xfff0dd, 0.75);
    rimLight.position.set(-1.6, 2.6, -2.6);
    scene.add(rimLight);

    const shadowGround = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 8),
      new THREE.ShadowMaterial({ opacity: 0.25 })
    );
    shadowGround.rotation.x = -Math.PI / 2;
    shadowGround.position.y = 0;
    shadowGround.receiveShadow = true;
    scene.add(shadowGround);

    const contactShadowTex = createSoftContactShadowTexture();
    const contactShadowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 1.15),
      new THREE.MeshBasicMaterial({
        map: contactShadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.75,
      })
    );
    contactShadowMesh.rotation.x = -Math.PI / 2;
    contactShadowMesh.position.y = 0.001;
    scene.add(contactShadowMesh);

    const modelHolder = new THREE.Group();
    scene.add(modelHolder);

    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    controlsRef.current = controls;
    modelHolderRef.current = modelHolder;

    let lastW = width;
    let lastH = height;
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || !container) return;
      const nextW =
        Math.round(entry.contentRect.width) || container.clientWidth || 460;
      const nextH =
        Math.round(entry.contentRect.height) || container.clientHeight || 560;
      if (nextW === lastW && nextH === lastH) return;
      lastW = nextW;
      lastH = nextH;
      camera.aspect = nextW / nextH;
      camera.updateProjectionMatrix();
      renderer.setSize(nextW, nextH, false);
    });
    resizeObserver.observe(container);

    let rafId = 0;
    const clock = new THREE.Clock();
    const targetKeyPos = new THREE.Vector3(2.2, 3.4, 2.8);
    const targetRimPos = new THREE.Vector3(-1.6, 2.6, -2.6);
    let prevAzimuth = controls.getAzimuthalAngle();
    let glbSwayAngle = 0;
    let glbSwayVel = 0;
    let glbFlare = 0;
    let glbFlareVel = 0;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      // Only run WebGL rendering when GLB mode is active
      if (viewerModeRef.current !== 'glb') return;
      const dt = Math.min(0.05, clock.getDelta());
      controls.update();

      const curAzimuth = controls.getAzimuthalAngle();
      let dAz = curAzimuth - prevAzimuth;
      if (dAz > Math.PI) dAz -= Math.PI * 2;
      if (dAz < -Math.PI) dAz += Math.PI * 2;
      prevAzimuth = curAzimuth;

      // Procedural Styling Motion when user changes trousers / bottoms
      const nowMs = performance.now();
      const fittingElapsed = nowMs - trouserFittingStartRef.current;
      const fittingDuration = 880;
      let fittingWeightShift = 0;
      let fittingDipY = 0;
      let fittingTurnY = 0;

      if (fittingElapsed < fittingDuration) {
        const p = Math.min(1.0, Math.max(0, fittingElapsed / fittingDuration));
        // Smooth sine bell envelope: 0 at p=0, 1 at p=0.5, 0 at p=1
        const envelope = Math.sin(p * Math.PI);
        // Subtle dip down (-0.022m) as knees flex gently to adjust trousers/skirt
        fittingDipY = -0.022 * envelope;
        // Subtle turn to side (+/- 0.042 rad) showing the crease and pleats
        fittingTurnY = Math.sin(p * Math.PI * 2) * 0.042;
        // Gentle weight shift from hip to hip
        fittingWeightShift = Math.sin(p * Math.PI * 2) * 0.038;

        // Subtle head tilt down to inspect trousers/skirt, then looking back up
        if (loadedModelRef.current?.headBone) {
          loadedModelRef.current.headBone.rotation.x = envelope * 0.07;
        }
      } else if (loadedModelRef.current?.headBone) {
        loadedModelRef.current.headBone.rotation.x = 0;
      }

      if (isPhysicsEnabledRef.current && modelHolderRef.current) {
        const { stiffness, damping, breezeAmp } = getFabricPhysicsParams(
          fabricMaterialIdRef.current
        );
        glbSwayVel -= dAz * 6.5;
        const breezeTorque =
          Math.sin(clock.elapsedTime * 2.8) * (breezeAmp * 0.004);
        const springAccel =
          -stiffness * 0.35 * glbSwayAngle - damping * glbSwayVel + breezeTorque;
        glbSwayVel += springAccel * dt;
        glbSwayAngle = Math.max(
          -0.14,
          Math.min(0.14, glbSwayAngle + glbSwayVel * dt)
        );

        glbFlareVel += Math.abs(dAz) * 3.2;
        glbFlareVel += (-95 * glbFlare - 7.5 * glbFlareVel) * dt;
        glbFlare = Math.max(0, Math.min(0.08, glbFlare + glbFlareVel * dt));

        modelHolderRef.current.position.y = fittingDipY;
        modelHolderRef.current.rotation.y = fittingTurnY;
        modelHolderRef.current.rotation.z = glbSwayAngle + fittingWeightShift;
        modelHolderRef.current.scale.set(
          1 + glbFlare,
          1,
          1 + glbFlare
        );
      } else if (modelHolderRef.current) {
        modelHolderRef.current.position.y = fittingDipY;
        modelHolderRef.current.rotation.y = fittingTurnY;
        modelHolderRef.current.rotation.z = fittingWeightShift;
        modelHolderRef.current.scale.set(1, 1, 1);
      }

      const mode = lightAngleModeRef.current;
      if (mode === 'studio') {
        targetKeyPos.set(2.2, 3.4, 2.8);
        targetRimPos.set(-1.6, 2.6, -2.6);
      } else if (mode === 'grazing') {
        targetKeyPos.set(3.3, 2.4, 0.75);
        targetRimPos.set(-2.4, 2.9, -1.5);
      } else {
        targetKeyPos.set(-1.8, 3.1, 2.2);
        targetRimPos.set(1.9, 2.8, -2.7);
      }
      const lerpAlpha = Math.min(1.0, dt * 4.5);
      keyLight.position.lerp(targetKeyPos, lerpAlpha);
      rimLight.position.lerp(targetRimPos, lerpAlpha);

      if (loadedModelRef.current?.mixer) {
        loadedModelRef.current.mixer.update(dt);
      }
      renderer.render(scene, camera);
    };
    animate();

    webglCleanupRef.current = () => {
      cancelAnimationFrame(rafId);
      glCanvas.removeEventListener('webglcontextlost', handleContextLost);
      controls.dispose();
      resizeObserver.disconnect();
      if (loadedModelRef.current) {
        loadedModelRef.current.dispose();
        loadedModelRef.current = null;
      }
      contactShadowTex.dispose();
      if (envTexture) envTexture.dispose();
      renderer.dispose();
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      modelHolderRef.current = null;
    };

    return true;
  }, []);

  // 2. Priority Loader per costumeId + gender:
  //    (1) GLB (/public/models/{id}-{gender}.glb or IndexedDB)
  //    (2) Fallback 360° Image-Sequence Viewer (/turntable/{id}-{gender}/frame_00..03.png or IndexedDB or built-in sheet)
  //    (3) Missing Card ("Chưa có mô hình cho bộ này")
  //    Preserves camera angle, colors, and pattern already chosen!
  useEffect(() => {
    const abortController = new AbortController();
    // Only show full loading screen on initial mount so switching costumes never flashes blank
    if (!hasMountedOnceRef.current) {
      setViewerMode('loading');
      setLoadProgress(18);
      hasMountedOnceRef.current = true;
    }

    if (loadedModelRef.current && modelHolderRef.current) {
      modelHolderRef.current.remove(loadedModelRef.current.scene);
      loadedModelRef.current.dispose();
      loadedModelRef.current = null;
    }

    const maxAniso =
      rendererRef.current?.capabilities.getMaxAnisotropy() || 4;

    (async () => {
      // Priority 1: Check GLB (/public/models/ or IndexedDB)
      const glbResult = await loadSuppliedCostumeGlb({
        costumeId: activeCostumeId,
        gender: activeGender,
        primaryHex: activeAoHex,
        trouserHex: activeQuanHex,
        enableTrouserKey,
        patternId: activePatternId,
        hoaTietHex: activeHoaTietHex,
        patternScale: patternConfig.scale,
        patternRotationDeg: patternConfig.rotationDeg,
        patternStrength: patternConfig.strength,
        fabricMaterialId,
        maxAnisotropy: maxAniso,
        onProgress: (pct) => {
          if (!abortController.signal.aborted) {
            setLoadProgress(pct);
          }
        },
        signal: abortController.signal,
      });

      if (abortController.signal.aborted) {
        if (glbResult.status === 'loaded') glbResult.dispose();
        return;
      }

      if (glbResult.status === 'loaded' && ensureWebGLSceneInitialized()) {
        const holder = modelHolderRef.current;
        if (holder) {
          glbResult.updateCharacterAppearance({
            hairStyle,
            hairColorHex,
            expression,
            costumeId: activeCostumeId,
            bottomId: activeBottomId,
            trouserHex: activeQuanHex,
            accessories: activeAccessories,
            necklineCut: activeNecklineCut,
            hemLengthCut: activeHemLengthCut,
          });
          holder.add(glbResult.scene);
          loadedModelRef.current = glbResult;
          setIsGlbFromComputer(glbResult.isFromUserComputer);
          setCalibratedHueInfo({
            baseHueDeg: glbResult.calibratedBaseHueDeg,
            trouserHueDeg: glbResult.calibratedTrouserHueDeg,
          });
          setLoadProgress(100);
          setViewerMode('glb');
          return;
        }
      } else if (glbResult.status === 'loaded') {
        glbResult.dispose();
      }

      // Priority 2: Fallback 360° Image-Sequence Viewer (/turntable/ or IndexedDB or built-in photoreal sheet)
      setLoadProgress(65);
      const resolvedTurntable = await resolveTurntableFrames(
        activeCostumeId,
        activeGender
      );
      if (abortController.signal.aborted) return;

      if (resolvedTurntable) {
        const visIdx = nearestDiscreteIdx;
        try {
          const activeUrl = await renderRecoloredTurntableFrame({
            modelId: resolvedTurntable.modelId,
            frameIndex: visIdx,
            frameSrc: resolvedTurntable.frames[visIdx],
            calibratedBaseHue: resolvedTurntable.calibratedBaseHue,
            aoHex: activeAoHex,
            quanHex: activeQuanHex,
            bottomId: activeBottomId,
            accessories: activeAccessories,
            enableTrouserKey,
            patternId: activePatternId,
            hoaTietHex: activeHoaTietHex,
            patternConfig,
            fabricMaterialId,
            lightAngleMode: lightAngleModeRef.current,
            hairStyle,
            hairColorHex,
            expression,
            necklineCut: activeNecklineCut,
            hemLengthCut: activeHemLengthCut,
          });
          if (abortController.signal.aborted) return;

          const immediateCanvas = getCachedRecoloredCanvas(activeUrl);
          if (immediateCanvas && turntableCanvasRef.current) {
            activeSourceDrawableRef.current = immediateCanvas;
            const dst = turntableCanvasRef.current;
            if (
              dst.width !== immediateCanvas.width ||
              dst.height !== immediateCanvas.height
            ) {
              dst.width = immediateCanvas.width;
              dst.height = immediateCanvas.height;
            }
            renderFrameWithClothPhysics(
              dst,
              immediateCanvas,
              clothSimRef.current,
              isPhysicsEnabledRef.current,
              performance.now() * 0.001,
              fabricMaterialIdRef.current
            );
          }

          const nextFrames: [string, string, string, string] = [
            resolvedTurntable.frames[0],
            resolvedTurntable.frames[1],
            resolvedTurntable.frames[2],
            resolvedTurntable.frames[3],
          ];
          nextFrames[visIdx] = activeUrl;
          setRecoloredFrames(nextFrames);
        } catch {
          setRecoloredFrames(resolvedTurntable.frames);
        }
        setTurntableData(resolvedTurntable);
        setCalibratedHueInfo({
          baseHueDeg: Math.round(resolvedTurntable.calibratedBaseHue * 360),
          trouserHueDeg: 40,
        });
        setLoadProgress(100);
        setViewerMode('turntable');
        return;
      }

      // Priority 3: Show "Chưa có mô hình cho bộ này" card
      setTurntableData(null);
      setRecoloredFrames(null);
      setViewerMode('missing');
    })();

    return () => {
      abortController.abort();
    };
  }, [activeCostumeId, activeGender, reloadTick, ensureWebGLSceneInitialized]);

  // Preload adjacent costumes and the other gender during browser idle time for <15ms switching
  useEffect(() => {
    const otherGender: 'male' | 'female' =
      activeGender === 'male' ? 'female' : 'male';
    const timer = window.setTimeout(() => {
      resolveTurntableFrames(activeCostumeId, otherGender).catch(() => {});
      prewarmAdjacentTurnaroundSheets(activeCostumeId, activeGender);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [activeCostumeId, activeGender]);

  // 3. Instant 3D Recolor & Pattern Uniforms (< 1 ms, no AI call)
  useEffect(() => {
    if (!loadedModelRef.current) return;
    loadedModelRef.current.updateRecolorUniforms({
      primaryHex: activeAoHex,
      trouserHex: activeQuanHex,
      enableTrouserKey,
    });
  }, [activeAoHex, activeQuanHex, enableTrouserKey]);

  useEffect(() => {
    if (!loadedModelRef.current) return;
    loadedModelRef.current.updatePatternUniforms({
      patternId: activePatternId,
      hoaTietHex: activeHoaTietHex,
      scale: patternConfig.scale,
      rotationDeg: patternConfig.rotationDeg,
      strength: patternConfig.strength,
    });
  }, [
    activePatternId,
    activeHoaTietHex,
    patternConfig.scale,
    patternConfig.rotationDeg,
    patternConfig.strength,
  ]);

  useEffect(() => {
    if (!loadedModelRef.current) return;
    loadedModelRef.current.updateFabricNormalAndPbr(fabricMaterialId);
  }, [fabricMaterialId]);

  const nearestDiscreteIdx = useMemo(() => {
    const norm = ((turntableAngleDeg % 360) + 360) % 360;
    return Math.round(norm / 90) % 4;
  }, [turntableAngleDeg]);

  // Smooth 3D cylindrical perspective tilt within the current 90° view sector (zero double-exposure ghosting!)
  const sectorTiltDeg = useMemo(() => {
    const norm = ((turntableAngleDeg % 360) + 360) % 360;
    const canonical = nearestDiscreteIdx * 90;
    let diff = norm - canonical;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    // Clamp within [-45, 45] and scale to a natural 3D perspective turn [-16deg, +16deg]
    return Math.max(-45, Math.min(45, diff)) * 0.35;
  }, [turntableAngleDeg, nearestDiscreteIdx]);

  // Keep refs of garment cuts & character/accessories for granular non-rerendering updates
  const renderJobIdRef = useRef<number>(0);
  const garmentCutRef = useRef({
    costumeId: activeCostumeId,
    bottomId: activeBottomId,
    trouserHex: activeQuanHex,
    necklineCut: activeNecklineCut,
    hemLengthCut: activeHemLengthCut,
  });
  garmentCutRef.current = {
    costumeId: activeCostumeId,
    bottomId: activeBottomId,
    trouserHex: activeQuanHex,
    necklineCut: activeNecklineCut,
    hemLengthCut: activeHemLengthCut,
  };

  const latestCharAndAccRef = useRef({
    hairStyle,
    hairColorHex,
    expression,
    accessories: activeAccessories,
  });
  latestCharAndAccRef.current = {
    hairStyle,
    hairColorHex,
    expression,
    accessories: activeAccessories,
  };

  // Update 3D garment cut & hierarchical bone mask layer when costume/bottom/cut changes
  useEffect(() => {
    if (!loadedModelRef.current) return;
    const cur = latestCharAndAccRef.current;
    loadedModelRef.current.updateCharacterAppearance({
      hairStyle: cur.hairStyle,
      hairColorHex: cur.hairColorHex,
      expression: cur.expression,
      accessories: cur.accessories,
      costumeId: activeCostumeId,
      bottomId: activeBottomId,
      trouserHex: activeQuanHex,
      necklineCut: activeNecklineCut,
      hemLengthCut: activeHemLengthCut,
    });
  }, [activeCostumeId, activeBottomId, activeQuanHex, activeNecklineCut, activeHemLengthCut]);

  // Granular state management hook: observes `character` & `accessories`
  // and triggers targeted `scene.add`/`scene.remove` + direct canvas sync
  useGranularSceneAttachments({
    character: {
      hairStyle,
      hairColorHex,
      expression,
    },
    accessories: activeAccessories,
    garmentCutRef,
    loadedModelRef,
    onDirectCanvasBufferSync: (nextChar, nextAccessories) => {
      if (!turntableData || viewerMode !== 'turntable') return;
      const visIdx = nearestDiscreteIdx;
      const targetModelId = turntableData.modelId;
      const jobId = ++renderJobIdRef.current;

      void (async () => {
        try {
          const visibleUrl = await renderRecoloredTurntableFrame({
            modelId: targetModelId,
            frameIndex: visIdx,
            frameSrc: turntableData.frames[visIdx],
            calibratedBaseHue: turntableData.calibratedBaseHue,
            aoHex: activeAoHex,
            quanHex: activeQuanHex,
            bottomId: activeBottomId,
            accessories: nextAccessories,
            enableTrouserKey,
            patternId: activePatternId,
            hoaTietHex: activeHoaTietHex,
            patternConfig,
            fabricMaterialId,
            lightAngleMode,
            hairStyle: nextChar.hairStyle,
            hairColorHex: nextChar.hairColorHex,
            expression: nextChar.expression,
            necklineCut: activeNecklineCut,
            hemLengthCut: activeHemLengthCut,
          });
          if (jobId !== renderJobIdRef.current) return;

          const immediateCanvas = getCachedRecoloredCanvas(visibleUrl);
          if (immediateCanvas && turntableCanvasRef.current) {
            activeSourceDrawableRef.current = immediateCanvas;
            const dst = turntableCanvasRef.current;
            if (
              dst.width !== immediateCanvas.width ||
              dst.height !== immediateCanvas.height
            ) {
              dst.width = immediateCanvas.width;
              dst.height = immediateCanvas.height;
            }
            renderFrameWithClothPhysics(
              dst,
              immediateCanvas,
              clothSimRef.current,
              isPhysicsEnabledRef.current,
              performance.now() * 0.001,
              fabricMaterialIdRef.current
            );
          } else if (turntableCanvasRef.current) {
            const img = await loadImageElement(visibleUrl);
            if (jobId !== renderJobIdRef.current) return;
            activeSourceDrawableRef.current = img;
            const dst = turntableCanvasRef.current;
            renderFrameWithClothPhysics(
              dst,
              img,
              clothSimRef.current,
              isPhysicsEnabledRef.current,
              performance.now() * 0.001,
              fabricMaterialIdRef.current
            );
          }

          setRecoloredFrames((prev) => {
            const base =
              prev && prev.length === 4
                ? ([...prev] as [string, string, string, string])
                : ([...turntableData.frames] as [string, string, string, string]);
            base[visIdx] = visibleUrl;
            return base;
          });

          // Also sync the other 3 angles in the background so rotating keeps all accessories
          const otherIndices = [0, 1, 2, 3].filter((i) => i !== visIdx);
          for (const idx of otherIndices) {
            if (jobId !== renderJobIdRef.current) return;
            const url = await renderRecoloredTurntableFrame({
              modelId: targetModelId,
              frameIndex: idx,
              frameSrc: turntableData.frames[idx],
              calibratedBaseHue: turntableData.calibratedBaseHue,
              aoHex: activeAoHex,
              quanHex: activeQuanHex,
              bottomId: activeBottomId,
              accessories: nextAccessories,
              enableTrouserKey,
              patternId: activePatternId,
              hoaTietHex: activeHoaTietHex,
              patternConfig,
              fabricMaterialId,
              lightAngleMode,
              hairStyle: nextChar.hairStyle,
              hairColorHex: nextChar.hairColorHex,
              expression: nextChar.expression,
              necklineCut: activeNecklineCut,
              hemLengthCut: activeHemLengthCut,
            });
            if (jobId !== renderJobIdRef.current) return;
            setRecoloredFrames((prev) => {
              const base =
                prev && prev.length === 4
                  ? ([...prev] as [string, string, string, string])
                  : ([...turntableData.frames] as [string, string, string, string]);
              base[idx] = url;
              return base;
            });
          }
        } catch {
          // ignore
        }
      })();
    },
  });

  // 4. Instant 2D Turntable Garment Hue-Key + Pattern Multiplication + 3D PBR Fold/Weave Shading
  useEffect(() => {
    if (!turntableData || viewerMode !== 'turntable') return;
    let cancelled = false;
    let bgTimer = 0;
    const jobId = ++renderJobIdRef.current;
    const curCharAcc = latestCharAndAccRef.current;

    (async () => {
      const visIdx = nearestDiscreteIdx;
      const targetModelId = turntableData.modelId;
      try {
        const visibleUrl = await renderRecoloredTurntableFrame({
          modelId: targetModelId,
          frameIndex: visIdx,
          frameSrc: turntableData.frames[visIdx],
          calibratedBaseHue: turntableData.calibratedBaseHue,
          aoHex: activeAoHex,
          quanHex: activeQuanHex,
          bottomId: activeBottomId,
          accessories: curCharAcc.accessories,
          enableTrouserKey,
          patternId: activePatternId,
          hoaTietHex: activeHoaTietHex,
          patternConfig,
          fabricMaterialId,
          lightAngleMode,
          hairStyle: curCharAcc.hairStyle,
          hairColorHex: curCharAcc.hairColorHex,
          expression: curCharAcc.expression,
          necklineCut: activeNecklineCut,
          hemLengthCut: activeHemLengthCut,
        });
        if (cancelled || jobId !== renderJobIdRef.current) return;

        // Paint directly onto persistent canvas immediately before React re-render for 0ms latency
        const immediateCanvas = getCachedRecoloredCanvas(visibleUrl);
        if (immediateCanvas && turntableCanvasRef.current) {
          activeSourceDrawableRef.current = immediateCanvas;
          const dst = turntableCanvasRef.current;
          if (dst.width !== immediateCanvas.width || dst.height !== immediateCanvas.height) {
            dst.width = immediateCanvas.width;
            dst.height = immediateCanvas.height;
          }
          renderFrameWithClothPhysics(
            dst,
            immediateCanvas,
            clothSimRef.current,
            isPhysicsEnabledRef.current,
            performance.now() * 0.001,
            fabricMaterialIdRef.current
          );
        }

        setRecoloredFrames((prev) => {
          const base =
            prev && prev.length === 4
              ? ([...prev] as [string, string, string, string])
              : ([...turntableData.frames] as [string, string, string, string]);
          base[visIdx] = visibleUrl;
          return base;
        });

        // 2. Render remaining 3 off-angle frames lazily in idle background
        bgTimer = window.setTimeout(async () => {
          const latest = latestCharAndAccRef.current;
          const otherIndices = [0, 1, 2, 3].filter((i) => i !== visIdx);
          for (const idx of otherIndices) {
            if (cancelled || jobId !== renderJobIdRef.current) return;
            const url = await renderRecoloredTurntableFrame({
              modelId: targetModelId,
              frameIndex: idx,
              frameSrc: turntableData.frames[idx],
              calibratedBaseHue: turntableData.calibratedBaseHue,
              aoHex: activeAoHex,
              quanHex: activeQuanHex,
              bottomId: activeBottomId,
              accessories: latest.accessories,
              enableTrouserKey,
              patternId: activePatternId,
              hoaTietHex: activeHoaTietHex,
              patternConfig,
              fabricMaterialId,
              lightAngleMode,
              hairStyle: latest.hairStyle,
              hairColorHex: latest.hairColorHex,
              expression: latest.expression,
              necklineCut: activeNecklineCut,
              hemLengthCut: activeHemLengthCut,
            });
            if (cancelled || jobId !== renderJobIdRef.current) return;
            setRecoloredFrames((prev) => {
              const base =
                prev && prev.length === 4
                  ? ([...prev] as [string, string, string, string])
                  : ([...turntableData.frames] as [string, string, string, string]);
              base[idx] = url;
              return base;
            });
          }
        }, 24);
      } catch {
        // Fallback to raw frames
        if (!cancelled && jobId === renderJobIdRef.current) {
          setRecoloredFrames(turntableData.frames);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (bgTimer) window.clearTimeout(bgTimer);
    };
  }, [
    turntableData,
    viewerMode,
    nearestDiscreteIdx,
    activeAoHex,
    activeQuanHex,
    activeBottomId,
    enableTrouserKey,
    activePatternId,
    activeHoaTietHex,
    patternConfig.scale,
    patternConfig.rotationDeg,
    patternConfig.strength,
    fabricMaterialId,
    lightAngleMode,
    activeNecklineCut,
    activeHemLengthCut,
  ]);

  // 5. Keyboard Left/Right Arrow Key support for stepping frames in 360° viewer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (viewerMode !== 'turntable') return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setTurntableAngleDeg((prev) => {
          const snapped = Math.round(prev / 90) * 90;
          return (snapped - 90 + 360) % 360;
        });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setTurntableAngleDeg((prev) => {
          const snapped = Math.round(prev / 90) * 90;
          return (snapped + 90) % 360;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewerMode]);

  const handleStepFrame = useCallback((dir: -1 | 1) => {
    cancelAnimationFrame(inertiaRafRef.current);
    inertiaRafRef.current = 0;
    setTurntableAngleDeg((prev) => {
      const snapped = Math.round(prev / 90) * 90;
      const next = (snapped + dir * 90 + 360) % 360;
      turntableAngleRef.current = next;
      return next;
    });
  }, []);

  const handleZoom = useCallback(
    (delta: number) => {
      if (viewerMode === 'turntable') {
        setTurntableZoom((z) =>
          Math.min(1.45, Math.max(0.8, Number((z - delta * 0.35).toFixed(2))))
        );
        return;
      }
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (!camera || !controls) return;
      const dir = new THREE.Vector3()
        .subVectors(camera.position, controls.target)
        .normalize();
      const curDist = camera.position.distanceTo(controls.target);
      const nextDist = Math.min(
        controls.maxDistance,
        Math.max(controls.minDistance, curDist + delta)
      );
      camera.position.copy(controls.target).addScaledVector(dir, nextDist);
      controls.update();
    },
    [viewerMode]
  );

  const handleResetView = useCallback(() => {
    cancelAnimationFrame(inertiaRafRef.current);
    inertiaRafRef.current = 0;
    setTurntableAngleDeg(0);
    turntableAngleRef.current = 0;
    setTurntableZoom(1.0);
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    controls.target.set(0, 1.02, 0);
    camera.position.set(0, 1.12, 3.85);
    controls.autoRotate = false;
    controls.update();
  }, []);

  const handleExportDesignSnapshot = useCallback(() => {
    const dataUrl = getDesignSnapshot();
    if (!dataUrl) return;
    setSnapshotCopied(true);
    setTimeout(() => setSnapshotCopied(false), 1800);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `v-stylist-${modelId}-front-3x4.png`;
    link.click();
  }, [modelId]);

  const handleLocalGlbSupply = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await registerSuppliedGlbFile(activeCostumeId, activeGender, file);
      setReloadTick((t) => t + 1);
      e.target.value = '';
    },
    [activeCostumeId, activeGender]
  );

  // Download GLB loaded from user's computer so they can commit it to /public/models/{id}-{gender}.glb
  const handleDownloadComputerGlb = useCallback(() => {
    const loaded = loadedModelRef.current;
    if (!loaded || !loaded.rawGlbBuffer) return;
    const blob = new Blob([loaded.rawGlbBuffer], {
      type: 'model/gltf-binary',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${modelId}.glb`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }, [modelId]);

  const activeDisplayFrames = recoloredFrames || turntableData?.frames || null;
  const activeFrameUrl = activeDisplayFrames
    ? activeDisplayFrames[nearestDiscreteIdx]
    : null;

  // Draw active 360° frame & live portrait loupe directly onto persistent double-buffered <canvas> elements
  // so there is ZERO browser image decode flash when changing hairstyle, expression, bottoms, or accessories!
  useEffect(() => {
    if (!activeFrameUrl || viewerMode !== 'turntable') return;
    let cancelled = false;

    const paintToCanvases = (source: HTMLCanvasElement | HTMLImageElement) => {
      if (cancelled) return;
      activeSourceDrawableRef.current = source;
      const mainCanvas = turntableCanvasRef.current;
      if (mainCanvas) {
        renderFrameWithClothPhysics(
          mainCanvas,
          source,
          clothSimRef.current,
          isPhysicsEnabledRef.current,
          performance.now() * 0.001,
          fabricMaterialIdRef.current
        );
      }
      const loupeCanvas = loupeCanvasRef.current;
      if (loupeCanvas) {
        const lCtx = loupeCanvas.getContext('2d');
        if (lCtx) {
          const faceBox =
            (turntableData &&
              getDetectedFaceBox(turntableData.modelId, nearestDiscreteIdx)) || {
              cx: 384,
              cy: 155,
              size: 185,
            };
          const half = faceBox.size * 0.5;
          const sx = Math.max(0, Math.min(768 - faceBox.size, faceBox.cx - half));
          const sy = Math.max(0, Math.min(1152 - faceBox.size, faceBox.cy - half));
          lCtx.clearRect(0, 0, loupeCanvas.width, loupeCanvas.height);
          lCtx.fillStyle = '#F2EDE4';
          lCtx.fillRect(0, 0, loupeCanvas.width, loupeCanvas.height);
          lCtx.drawImage(
            source,
            sx,
            sy,
            faceBox.size,
            faceBox.size,
            0,
            0,
            loupeCanvas.width,
            loupeCanvas.height
          );
        }
      }
    };

    const cachedCanvas = getCachedRecoloredCanvas(activeFrameUrl);
    if (cachedCanvas) {
      paintToCanvases(cachedCanvas);
    } else {
      loadImageElement(activeFrameUrl)
        .then((img) => paintToCanvases(img))
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [
    activeFrameUrl,
    viewerMode,
    turntableData,
    nearestDiscreteIdx,
    showFaceLoupe,
    isCharacterTab,
  ]);

  // 6. Real-Time 60fps Spring-Damper Cloth Simulation Loop (Hooke's Law + Viscous Damping + Centrifugal Flare)
  useEffect(() => {
    if (!isPhysicsEnabled || viewerMode !== 'turntable') return;
    let rafId = 0;
    const sim = clothSimRef.current;
    sim.lastTimestamp = performance.now();

    const stepPhysics = (now: number) => {
      rafId = requestAnimationFrame(stepPhysics);
      const dt = Math.min(0.04, Math.max(0.001, (now - sim.lastTimestamp) * 0.001));
      sim.lastTimestamp = now;

      const { stiffness, damping } = getFabricPhysicsParams(
        fabricMaterialIdRef.current
      );

      // Node 0 is pinned at the upper chest/shoulder anchor
      sim.nodesX[0] = 0;
      sim.velX[0] = 0;

      // Integrate coupled spring-damper chain nodes 1..7
      for (let i = 1; i < CLOTH_NODE_COUNT; i++) {
        const parentX = sim.nodesX[i - 1];
        const curX = sim.nodesX[i];
        const childX =
          i < CLOTH_NODE_COUNT - 1 ? sim.nodesX[i + 1] : curX;

        // Hooke's Law restoring force toward parent node & vertical gravity plumb line
        const parentSpring = -stiffness * (curX - parentX * 0.86);
        const childSpring =
          i < CLOTH_NODE_COUNT - 1
            ? stiffness * 0.32 * (childX - curX)
            : 0;
        const gravityPlumb = -stiffness * 0.42 * curX;
        const viscousDrag = -damping * sim.velX[i];

        const accel =
          parentSpring + childSpring + gravityPlumb + viscousDrag;
        sim.velX[i] += accel * dt;
      }

      for (let i = 1; i < CLOTH_NODE_COUNT; i++) {
        const maxDisp = 6 + i * 4.8; // Up to ~40px natural sway at the lower robe hem
        sim.nodesX[i] = Math.max(
          -maxDisp,
          Math.min(maxDisp, sim.nodesX[i] + sim.velX[i] * dt)
        );
      }

      // Centrifugal skirt & sleeve flare spring-damper integration
      const flareAccel = -110 * sim.flare - 7.5 * sim.flareVel;
      sim.flareVel += flareAccel * dt;
      sim.flare = Math.max(0, Math.min(1.0, sim.flare + sim.flareVel * dt));

      if (turntableCanvasRef.current && activeSourceDrawableRef.current) {
        renderFrameWithClothPhysics(
          turntableCanvasRef.current,
          activeSourceDrawableRef.current,
          sim,
          true,
          now * 0.001,
          fabricMaterialIdRef.current
        );
      }
    };

    rafId = requestAnimationFrame(stepPhysics);
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isPhysicsEnabled, viewerMode]);

  const handleTurntablePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    cancelAnimationFrame(inertiaRafRef.current);
    cancelAnimationFrame(anglePublishRafRef.current);
    inertiaRafRef.current = 0;
    anglePublishRafRef.current = 0;
    isDraggingTurntableRef.current = true;
    dragLastXRef.current = event.clientX;
    dragLastTimeRef.current = performance.now();
    dragVelocityRef.current = 0;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleTurntablePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingTurntableRef.current) return;
    const now = performance.now();
    const elapsed = Math.max(8, now - dragLastTimeRef.current);
    const deltaAngle = (dragLastXRef.current - event.clientX) * 0.85;
    const instantVelocity = Math.max(-1.5, Math.min(1.5, deltaAngle / elapsed));
    dragVelocityRef.current = dragVelocityRef.current * 0.58 + instantVelocity * 0.42;
    dragLastXRef.current = event.clientX;
    dragLastTimeRef.current = now;
    turntableAngleRef.current = ((turntableAngleRef.current + deltaAngle) % 360 + 360) % 360;

    // Pointer devices can emit more events than the display can paint. Publish at most once per frame.
    if (!anglePublishRafRef.current) {
      anglePublishRafRef.current = requestAnimationFrame(() => {
        anglePublishRafRef.current = 0;
        setTurntableAngleDeg(turntableAngleRef.current);
      });
    }
  };

  const handleTurntablePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingTurntableRef.current) return;
    isDraggingTurntableRef.current = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already have been released by the browser.
    }

    let previousTime = performance.now();
    const coast = (now: number) => {
      const elapsed = Math.min(32, Math.max(0, now - previousTime));
      previousTime = now;
      dragVelocityRef.current *= Math.exp(-elapsed / 260);
      turntableAngleRef.current = ((turntableAngleRef.current + dragVelocityRef.current * elapsed) % 360 + 360) % 360;
      setTurntableAngleDeg(turntableAngleRef.current);
      if (Math.abs(dragVelocityRef.current) > 0.012) {
        inertiaRafRef.current = requestAnimationFrame(coast);
      } else {
        inertiaRafRef.current = 0;
      }
    };

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion && Math.abs(dragVelocityRef.current) > 0.04) {
      inertiaRafRef.current = requestAnimationFrame(coast);
    } else {
      setTurntableAngleDeg(turntableAngleRef.current);
    }
  };

  return (
    <div className="VietPhucCanvas relative flex-1 flex flex-col bg-[#F2EDE4] border border-[#D6CEBE] overflow-hidden select-none">
      {/* Hidden input for supplying a local .GLB file (stored in IndexedDB) */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".glb"
        onChange={handleLocalGlbSupply}
        className="hidden"
      />

      {/* Top Studio Header Bar */}
      <div className="relative z-20 px-3 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-[#DFD8C8] bg-[#FBF9F5]/95 backdrop-blur-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] border shrink-0 ${
              culturalStatus === 'SAFE'
                ? 'bg-[#14532D] text-[#FBF9F5] border-[#14532D]'
                : culturalStatus === 'WARNING'
                ? 'bg-[#92400E] text-[#FBF9F5] border-[#92400E]'
                : 'bg-[#991B1B] text-[#FBF9F5] border-[#991B1B]'
            }`}
          >
            {culturalStatus === 'SAFE'
              ? 'Hợp bối cảnh'
              : culturalStatus === 'WARNING'
              ? 'Cân nhắc bối cảnh'
              : 'Có thể chưa phù hợp'}
          </span>

          <div className="flex items-center bg-[#EBE6DF] p-0.5 border border-[#DFD8C8] text-[11px] font-semibold">
            <button
              onClick={() => onToggleGender('male')}
              className={`px-2 py-0.5 cursor-pointer transition-colors ${
                activeGender === 'male'
                  ? 'bg-[#1C1917] text-[#FDE68A]'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              Nam
            </button>
            <button
              onClick={() => onToggleGender('female')}
              className={`px-2 py-0.5 cursor-pointer transition-colors ${
                activeGender === 'female'
                  ? 'bg-[#9A3412] text-[#FBF9F5]'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              Nữ
            </button>
          </div>

          <span className="hidden xl:inline text-[11px] text-[#57534E] truncate">
            {viewerMode === 'glb'
              ? 'Mẫu 3D tương tác'
              : viewerMode === 'turntable'
              ? `${ANGLE_NAMES_VI[nearestDiscreteIdx]} · kéo để xoay`
              : viewerMode === 'loading'
              ? 'Đang chuẩn bị mẫu thử'
              : 'Sẵn sàng dựng mẫu 3D'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {/* Open Studio "Tạo ảnh 360° bằng AI" */}
          <button
            onClick={() => setIsAiStudioOpen(true)}
            className="px-2 py-1 text-[11px] font-semibold border border-[#9A3412] bg-[#9A3412] hover:bg-[#7C2D12] text-[#FBF9F5] flex items-center gap-1 transition-colors cursor-pointer"
            title="Mở Studio Tạo ảnh 360° bằng AI (Sheet 4 góc hoặc Từng góc nét hơn)"
          >
            <Sparkles className="w-3 h-3 text-[#FDE68A]" />
            <span>Tạo ảnh 360° AI</span>
          </button>

          {(viewerMode === 'glb' || viewerMode === 'turntable') && (
            <button
              onClick={() =>
                setLightAngleMode((prev) =>
                  prev === 'studio'
                    ? 'grazing'
                    : prev === 'grazing'
                    ? 'rim'
                    : 'studio'
                )
              }
              className="px-2 py-1 text-[11px] font-semibold border border-[#DFD8C8] bg-[#FBF9F5] hover:border-[#1C1917] text-[#57534E] hover:text-[#1C1917] flex items-center gap-1 transition-colors cursor-pointer"
              title="Đổi góc ánh sáng mượt (kiểm tra phản xạ vải PBR không bóng nhựa)"
            >
              <Sun className="w-3 h-3 text-[#B45309]" />
              <span className="hidden sm:inline">
                {lightAngleMode === 'studio'
                  ? 'Studio 45°'
                  : lightAngleMode === 'grazing'
                  ? 'Nghiêng Tà'
                  : 'Ngược Sáng'}
              </span>
            </button>
          )}

          {/* Real-Time Cloth Physics Simulation Toggle Button */}
          {(viewerMode === 'glb' || viewerMode === 'turntable') && (
            <button
              type="button"
              onClick={() => setIsPhysicsEnabled((prev) => !prev)}
              data-testid="physics-toggle-button"
              className={`px-2.5 py-1 text-[11px] font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                isPhysicsEnabled
                  ? 'bg-[#1C1917] text-[#FDE68A] border-[#9A3412] shadow-xs'
                  : 'bg-[#FBF9F5] text-[#57534E] border-[#DFD8C8] hover:border-[#1C1917] hover:text-[#1C1917]'
              }`}
              title="Bật/tắt mô phỏng vật lý chuyển động tà áo & tay áo theo quán tính khi xoay nhân vật (Real-time Cloth Physics)"
            >
              <Wind
                className={`w-3.5 h-3.5 ${
                  isPhysicsEnabled
                    ? 'text-[#FDE68A] animate-pulse'
                    : 'text-[#686259]'
                }`}
              />
              <span>Vải chuyển động</span>
              <span className="font-mono-tabular font-bold">
                {isPhysicsEnabled ? 'ON' : 'OFF'}
              </span>
            </button>
          )}

          {/* Optional Trouser Hue-Key Flag Toggle */}
          <button
            onClick={() => setEnableTrouserKey(!enableTrouserKey)}
            className={`px-2 py-1 text-[11px] font-semibold border flex items-center gap-1 transition-colors cursor-pointer ${
              enableTrouserKey
                ? 'bg-[#134E4A] text-[#FBF9F5] border-[#134E4A]'
                : 'bg-[#FBF9F5] text-[#57534E] border-[#DFD8C8] hover:border-[#1C1917]'
            }`}
            title="Bật hoặc tắt việc áp dụng màu hạ y bạn đã chọn"
          >
            <Layers className="w-3 h-3" />
            <span className="hidden sm:inline">Màu hạ y</span>
            <span aria-hidden="true">{enableTrouserKey ? '✓' : '○'}</span>
          </button>

          {/* Export Front View Snapshot (getDesignSnapshot 3:4 <= 1024px PNG) */}
          <button
            onClick={handleExportDesignSnapshot}
            disabled={viewerMode === 'missing' || viewerMode === 'loading'}
            className="px-2 py-1 text-[11px] font-semibold border border-[#DFD8C8] bg-[#FBF9F5] hover:border-[#1C1917] text-[#1C1917] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40"
            title="Chụp ảnh chính diện 3:4 PNG (getDesignSnapshot, tối đa 1024px)"
          >
            {snapshotCopied ? (
              <>
                <Check className="w-3 h-3 text-[#14532D]" />
                <span>Đã lưu PNG</span>
              </>
            ) : (
              <>
                <Camera className="w-3 h-3 text-[#9A3412]" />
                <span className="hidden sm:inline">Snapshot</span>
              </>
            )}
          </button>

          {onOpenBodyShapeModal && (
            <button
              type="button"
              onClick={onOpenBodyShapeModal}
              className="px-2 py-1 text-[11px] font-semibold border border-[#14532D] bg-[#14532D] text-white hover:bg-[#166534] flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
              title="Thử phom cổ phục và xem gợi ý phối đồ trên ảnh cá nhân"
            >
              <User className="w-3 h-3 text-[#FDE68A]" />
              <span className="hidden sm:inline">Ghép Ảnh Thật</span>
            </button>
          )}

          <button
            onClick={onToggleNotebook}
            className={`px-2.5 py-1 text-[11px] font-semibold border transition-colors flex items-center gap-1 cursor-pointer ${
              isNotebookActive
                ? 'bg-[#9A3412] text-[#FDE68A] border-[#9A3412]'
                : 'bg-[#FBF9F5] text-[#7C2D12] border-[#9A3412]/40 hover:border-[#9A3412]'
            }`}
          >
            <ScrollText className="w-3 h-3" />
            <span>Điển Tích</span>
          </button>
        </div>
      </div>

      {/* Main 3D / 360° Stage Viewport */}
      <div className="studio-stage relative flex-1 min-h-[380px] flex items-center justify-center overflow-hidden">
        {/* Quick Left/Right Outfit Cycle Arrows */}
        <div className="absolute inset-y-16 left-2 z-20 flex flex-col justify-center gap-1.5 pointer-events-none">
          <button
            onClick={() => onCycleTop(-1)}
            className="pointer-events-auto w-8 h-8 bg-[#FBF9F5]/92 hover:bg-[#1C1917] hover:text-[#FBF9F5] border border-[#DFD8C8] flex items-center justify-center transition-all hover:scale-105 cursor-pointer shadow-xs"
            title="Đổi Áo trước"
          >
            <Shirt className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onCycleColor(-1)}
            className="pointer-events-auto w-8 h-8 bg-[#FBF9F5]/92 hover:bg-[#1C1917] hover:text-[#FBF9F5] border border-[#DFD8C8] flex items-center justify-center transition-all hover:scale-105 cursor-pointer shadow-xs"
            title="Đổi Màu trước"
          >
            <Palette className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onCycleBottom(-1)}
            className="pointer-events-auto w-8 h-8 bg-[#FBF9F5]/92 hover:bg-[#1C1917] hover:text-[#FBF9F5] border border-[#DFD8C8] flex items-center justify-center transition-all hover:scale-105 cursor-pointer shadow-xs"
            title="Đổi Quần trước"
          >
            <Footprints className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="absolute inset-y-16 right-2 z-20 flex flex-col justify-center gap-1.5 pointer-events-none">
          <button
            onClick={() => onCycleTop(1)}
            className="pointer-events-auto w-8 h-8 bg-[#FBF9F5]/92 hover:bg-[#1C1917] hover:text-[#FBF9F5] border border-[#DFD8C8] flex items-center justify-center transition-all hover:scale-105 cursor-pointer shadow-xs"
            title="Đổi Áo tiếp"
          >
            <Shirt className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onCycleColor(1)}
            className="pointer-events-auto w-8 h-8 bg-[#FBF9F5]/92 hover:bg-[#1C1917] hover:text-[#FBF9F5] border border-[#DFD8C8] flex items-center justify-center transition-all hover:scale-105 cursor-pointer shadow-xs"
            title="Đổi Màu tiếp"
          >
            <Palette className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onCycleBottom(1)}
            className="pointer-events-auto w-8 h-8 bg-[#FBF9F5]/92 hover:bg-[#1C1917] hover:text-[#FBF9F5] border border-[#DFD8C8] flex items-center justify-center transition-all hover:scale-105 cursor-pointer shadow-xs"
            title="Đổi Quần tiếp"
          >
            <Footprints className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 1. Three.js WebGL Mount Container (Active when GLB is loaded) */}
        <div
          ref={mountRef}
          className={`w-full h-full cursor-grab active:cursor-grabbing transition-opacity duration-300 ${
            viewerMode === 'glb'
              ? 'opacity-100'
              : 'opacity-0 pointer-events-none absolute inset-0'
          }`}
        />
        {viewerMode === 'glb' && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-[#FBF9F5]/85 backdrop-blur-sm border border-[#DFD8C8]/80 px-2.5 py-1 text-[10px] text-[#57534E] pointer-events-none">
            <Compass className="w-3.5 h-3.5 text-[#9A3412]" />
            <span>Kéo để xoay · cuộn để phóng to</span>
          </div>
        )}

        {/* 2. Fallback 360° Image-Sequence Viewer (Drag horizontally, cross-fade between nearest 2 frames, < > buttons, soft shadow on #F2EDE4) */}
        {viewerMode === 'turntable' && activeDisplayFrames && (
          <div
            onPointerDown={handleTurntablePointerDown}
            onPointerMove={handleTurntablePointerMove}
            onPointerUp={handleTurntablePointerUp}
            onPointerCancel={handleTurntablePointerUp}
            onWheel={(event) => {
              if (event.deltaY === 0) return;
              event.preventDefault();
              handleZoom(event.deltaY > 0 ? 0.6 : -0.6);
            }}
            role="group"
            aria-label="Mẫu cổ phục 360 độ. Kéo ngang để xoay, dùng phím mũi tên để đổi góc."
            className="relative w-full h-full flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-pan-y overflow-hidden transition-opacity duration-300"
          >
            {/* 3D Studio Turntable Stage with Dynamic Floor Pedestal & Single Crisp Active Pose (zero ghosting) */}
            <div
              className="relative flex items-center justify-center w-full h-full max-h-[540px]"
              style={{
                transform: `scale(${turntableZoom})`,
                transition: 'transform 150ms ease-out',
              }}
            >
              {/* Subtle Studio Key/Rim Radial Illumination on the #F2EDE4 Backdrop */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    lightAngleMode === 'grazing'
                      ? 'radial-gradient(circle at 68% 38%, rgba(255,251,242,0.55) 0%, rgba(242,237,228,0) 62%)'
                      : lightAngleMode === 'rim'
                      ? 'radial-gradient(circle at 34% 36%, rgba(255,246,230,0.62) 0%, rgba(242,237,228,0) 60%)'
                      : 'radial-gradient(circle at 50% 42%, rgba(255,251,244,0.48) 0%, rgba(242,237,228,0) 64%)',
                }}
              />

              {/* Soft Ground Contact Shadow beneath the character's shoes (no intrusive border ring) */}
              <div
                className="absolute bottom-[5.5%] w-52 h-8 rounded-full pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse at center, rgba(28,25,23,0.24) 0%, rgba(28,25,23,0.08) 52%, rgba(28,25,23,0) 78%)',
                }}
              />

              {/* Single 100%-Opaque Active Frame rendered on Persistent Double-Buffered Canvas (ZERO flicker!) */}
              <canvas
                ref={turntableCanvasRef}
                width={768}
                height={1152}
                className="relative z-10 w-full h-full object-contain pointer-events-none select-none"
                style={{
                  transform: `perspective(1100px) rotateY(${-sectorTiltDeg.toFixed(
                    2
                  )}deg)`,
                  filter:
                    'drop-shadow(0 10px 14px rgba(28, 25, 23, 0.14))',
                }}
              />
            </div>

            {/* Top-Left 360° Step Controls ("<" and ">" step one frame + angle indicator) */}
            <div
              onPointerDown={(e) => e.stopPropagation()}
              className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-[#FBF9F5]/95 border border-[#DFD8C8] px-2.5 py-1 shadow-xs"
            >
              <button
                type="button"
                onClick={() => handleStepFrame(-1)}
                className="px-2 py-0.5 text-xs font-bold bg-[#F5F1E8] hover:bg-[#1C1917] hover:text-[#FBF9F5] border border-[#DFD8C8] cursor-pointer transition-colors"
                title="Lùi 1 góc nhìn (Phím mũi tên Trái)"
              >
                &lt;
              </button>

              <span className="px-2 text-[11px] font-mono-tabular font-semibold text-[#1C1917] min-w-[130px] text-center">
                {ANGLE_NAMES_VI[nearestDiscreteIdx]}
              </span>

              <button
                type="button"
                onClick={() => handleStepFrame(1)}
                className="px-2 py-0.5 text-xs font-bold bg-[#F5F1E8] hover:bg-[#1C1917] hover:text-[#FBF9F5] border border-[#DFD8C8] cursor-pointer transition-colors"
                title="Tiến 1 góc nhìn (Phím mũi tên Phải)"
              >
                &gt;
              </button>
            </div>
            <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-[#FBF9F5]/85 backdrop-blur-sm border border-[#DFD8C8]/80 px-2.5 py-1 text-[10px] text-[#57534E] pointer-events-none">
              <Compass className="w-3.5 h-3.5 text-[#9A3412]" />
              <span>Kéo để xoay · cuộn để phóng to</span>
            </div>
          </div>
        )}

        {/* Visual Trouser/Bottom Transition & Procedural Styling Gesture Indicator */}
        {trouserFittingState.isFitting && (
          <>
            {/* Subtle radial silk aura around the lower garment region */}
            <div
              className="absolute inset-x-0 bottom-[14%] h-[38%] pointer-events-none z-15 flex items-center justify-center transition-opacity duration-300"
              style={{
                opacity: Math.sin(trouserFittingState.progress * Math.PI) * 0.72,
              }}
            >
              <div className="w-72 h-36 rounded-full bg-gradient-to-t from-[#B45309]/15 via-[#FDE68A]/12 to-transparent blur-xl" />
            </div>

            {/* Floating Glassmorphic Styling Badge */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-all duration-200">
              <div className="bg-[#1C1917]/92 text-[#FBF9F5] backdrop-blur-md px-3.5 py-1.5 border border-[#DFD8C8]/30 shadow-md flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-[#EAB308] animate-ping" />
                <Sparkles className="w-3.5 h-3.5 text-[#FDE68A] animate-spin" />
                <span className="font-editorial text-[13px] tracking-wide text-[#FBF9F5]">
                  Đang chỉnh trang {trouserFittingState.bottomName}...
                </span>
                <div className="w-14 h-1 bg-[#44403C] overflow-hidden ml-1 border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-[#D97706] to-[#FDE68A] transition-all duration-75"
                    style={{
                      width: `${Math.round(trouserFittingState.progress * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* LOADING STATE: Poster (/public/models/{id}.jpg or front frame) + Progress Bar */}
        {viewerMode === 'loading' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#F2EDE4] p-6">
            <div className="w-full max-w-xs bg-[#FBF9F5] border border-[#DFD8C8] p-4 shadow-xs flex flex-col items-center gap-3">
              <div className="w-44 h-56 bg-[#EBE6DF] border border-[#DFD8C8] flex items-center justify-center overflow-hidden relative">
                {!posterLoadFailed ? (
                  <img
                    src={posterUrl}
                    alt={topGarment.baseName}
                    referrerPolicy="no-referrer"
                    onError={() => {
                      if (!posterUseFallbackId) {
                        setPosterUseFallbackId(true);
                      } else {
                        setPosterLoadFailed(true);
                      }
                    }}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-3 text-[#686259]">
                    <Box className="w-8 h-8 text-[#9A3412] mb-1.5 animate-pulse" />
                    <span className="text-[11px] font-mono-tabular">
                      {topGarment.baseName}
                    </span>
                  </div>
                )}
              </div>

              <div className="w-full space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono-tabular">
                  <span className="text-[#1C1917] font-semibold truncate">
                    Đang nạp mô hình {modelId}...
                  </span>
                  <span className="text-[#9A3412] font-bold">
                    {loadProgress}%
                  </span>
                </div>
                <div className="w-full h-2 bg-[#EBE6DF] border border-[#DFD8C8] overflow-hidden">
                  <div
                    className="h-full bg-[#9A3412] transition-all duration-150"
                    style={{ width: `${Math.max(8, loadProgress)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. MISSING MODEL STATE: Card "Chưa có mô hình cho bộ này" with "Tạo ảnh 360° bằng AI" and "Nạp tệp GLB từ máy" */}
        {viewerMode === 'missing' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#F2EDE4] p-6">
            <div className="w-full max-w-sm bg-[#FBF9F5] border-2 border-[#1C1917] p-6 shadow-sm text-center space-y-4">
              <div className="w-12 h-12 mx-auto bg-[#EBE6DF] border border-[#DFD8C8] flex items-center justify-center">
                <Box className="w-6 h-6 text-[#9A3412]" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-editorial font-bold text-[#1C1917]">
                  Chưa có mô hình cho bộ này
                </h3>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  Trang phục <strong>{topGarment.baseName}</strong> (
                  {activeGender === 'male' ? 'Nam' : 'Nữ'}) chưa có tệp GLB hoặc
                  khung hình 360°.
                </p>
              </div>

              <div className="bg-[#F5F1E8] border border-[#DFD8C8] p-2.5 text-left font-mono-tabular text-[11px] text-[#1C1917] space-y-1">
                <div className="truncate">
                  <span className="text-[#686259]">1. GLB: </span>
                  <strong>/public/models/{modelId}.glb</strong>
                </div>
                <div className="truncate">
                  <span className="text-[#686259]">2. 360°: </span>
                  <span>/turntable/{modelId}/frame_00..03.png</span>
                </div>
              </div>

              <div className="pt-1 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setIsAiStudioOpen(true)}
                  className="w-full py-2.5 px-3 bg-[#9A3412] hover:bg-[#7C2D12] text-[#FBF9F5] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#FDE68A]" />
                  <span>Tạo ảnh 360° bằng AI</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 px-3 bg-[#1C1917] hover:bg-[#44403C] text-[#FBF9F5] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Nạp tệp GLB từ máy</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Real-World Color & Trouser Switcher Bar (Emphasizing Instant Color & Bottom Replacement for Nam & Nữ) */}
      <div className="relative z-20 px-3 py-2 bg-[#F5F1E8] border-t border-[#DFD8C8] space-y-2 text-xs">
        {/* Row 1: Instant 360° Real-World Trouser / Skirt Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 bg-[#9A3412] text-[#FBF9F5] text-[10px] font-bold uppercase tracking-wider">
              Thay Quần 360° ({activeGender === 'male' ? 'Nam' : 'Nữ'})
            </span>
            <span className="text-[11px] font-semibold text-[#1C1917]">
              {bottomGarment.name}
            </span>
            <span className="text-[10px] font-mono-tabular text-[#686259]">
              ({bottomGarment.material})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {BOTTOM_GARMENTS.map((b) => {
              const isSelected = bottomGarment.id === b.id;
              const shortLabel = b.name
                .replace(' Ống Rộng Contemporary', '')
                .replace(' Ống Suông Cổ Điển', '')
                .replace(' Micro-Miniskirt', '')
                .replace(' Cắt Ngắn', '')
                .replace(' Ống Rộng', '');
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setTrouserByName(b.name)}
                  className={`px-2 py-1 text-[10px] font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#1C1917] text-[#FDE68A] border-[#1C1917] shadow-xs'
                      : 'bg-[#FBF9F5] text-[#1C1917] border-[#DFD8C8] hover:border-[#1C1917]'
                  }`}
                  title={`${b.name} — ${b.note}`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-black/25 shrink-0"
                    style={{
                      backgroundColor: isSelected ? activeQuanHex : b.hex,
                    }}
                  />
                  <span>{shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Instant Dual Color Studio (Màu Áo & Màu Quần) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1.5 border-t border-[#DFD8C8]/80">
          {/* Màu Áo Swatches */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 bg-[#FBF9F5] px-2.5 py-1.5 border border-[#DFD8C8]">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1C1917]">
                Đổi Màu Áo:
              </span>
              <span className="text-[10px] font-mono-tabular font-semibold text-[#9A3412]">
                {activeAoHex}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {TRADITIONAL_COLORS.map((c) => {
                const isAoActive =
                  activeAoHex.toLowerCase() === c.hex.toLowerCase();
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setPrimaryColorById(c.id)}
                    title={`${c.name} (${c.hex})`}
                    className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                      isAoActive
                        ? 'scale-115 ring-2 ring-[#1C1917] border-white'
                        : 'border-black/25 hover:scale-110'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                );
              })}
              <input
                type="color"
                value={activeAoHex}
                onChange={(e) => setPrimaryColorHex(e.target.value)}
                title="Tùy chọn màu Áo bất kỳ"
                className="w-5 h-5 cursor-pointer border border-[#DFD8C8] bg-transparent ml-0.5"
              />
            </div>
          </div>

          {/* Màu Quần Swatches */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 bg-[#FBF9F5] px-2.5 py-1.5 border border-[#DFD8C8]">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1C1917]">
                Đổi Màu Quần:
              </span>
              <span className="text-[10px] font-mono-tabular font-semibold text-[#9A3412]">
                {activeQuanHex}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {[
                { hex: '#F5F1E8', name: 'Trắng Ngà' },
                { hex: '#181615', name: 'Đen Lĩnh' },
                { hex: '#1E40AF', name: 'Xanh Indigo Jeans' },
                { hex: '#C5A880', name: 'Kem Cát Kaki' },
                { hex: '#D4AF37', name: 'Vàng Hoàng Gia' },
                { hex: '#9A2B1D', name: 'Đỏ Son' },
                { hex: '#134E4A', name: 'Xanh Ngọc' },
              ].map((sw) => {
                const isQuanActive =
                  activeQuanHex.toLowerCase() === sw.hex.toLowerCase();
                return (
                  <button
                    key={sw.hex}
                    type="button"
                    onClick={() => setTrouserColorHex(sw.hex)}
                    title={`Màu quần: ${sw.name} (${sw.hex})`}
                    className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                      isQuanActive
                        ? 'scale-115 ring-2 ring-[#1C1917] border-white'
                        : 'border-black/25 hover:scale-110'
                    }`}
                    style={{ backgroundColor: sw.hex }}
                  />
                );
              })}
              <input
                type="color"
                value={activeQuanHex}
                onChange={(e) => setTrouserColorHex(e.target.value)}
                title="Tùy chọn màu Quần bất kỳ"
                className="w-5 h-5 cursor-pointer border border-[#DFD8C8] bg-transparent ml-0.5"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Studio Control Bar */}
      <div className="relative z-20 px-3 py-2 bg-[#FBF9F5] border-t border-[#DFD8C8] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
            style={{ backgroundColor: activeAoHex }}
          />
          <span className="font-semibold text-[#1C1917] truncate">
            {topGarment.baseName}
          </span>
          <span className="text-[11px] font-mono-tabular text-[#686259] hidden sm:inline">
            · {activeFabricSpec.shortName} (R:{activeFabricSpec.roughness} · Sheen:{' '}
            {activeFabricSpec.sheen} · Aniso:{activeFabricSpec.anisotropy})
          </span>
          {(viewerMode === 'glb' || viewerMode === 'turntable') && (
            <span className="text-[10px] font-mono-tabular text-[#14532D] hidden md:inline">
              · BaseHue {calibratedHueInfo.baseHueDeg}° (Top 5% Sat · ±25°)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 flex-wrap">
          {/* "Tải GLB về" button when a GLB file was loaded from the user's computer (IndexedDB) */}
          {viewerMode === 'glb' && isGlbFromComputer && (
            <button
              type="button"
              onClick={handleDownloadComputerGlb}
              className="px-2 py-1 border border-[#14532D] bg-[#14532D] text-[#FBF9F5] text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
              title={`Tải tệp ${modelId}.glb về máy để đưa vào thư mục /public/models/`}
            >
              <Download className="w-3 h-3" />
              <span>Tải GLB về</span>
            </button>
          )}

          {/* "Tải ZIP" button when viewing 360° turntable */}
          {viewerMode === 'turntable' && turntableData && (
            <button
              type="button"
              onClick={() =>
                exportTurntableAndMeshyZip(
                  modelId,
                  recoloredFrames || turntableData.frames
                )
              }
              className="px-2 py-1 border border-[#14532D] bg-[#F5F1E8] hover:bg-[#14532D] hover:text-[#FBF9F5] text-[#14532D] text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Tải gói ZIP gồm /turntable (frame_00..03.png, poster.jpg, config.json) và /meshy (front, left, back, right trên nền #D9D9D9)"
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">Tải ZIP 360°</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2 py-1 border border-[#DFD8C8] bg-[#F5F1E8] hover:border-[#1C1917] text-[11px] font-medium flex items-center gap-1 cursor-pointer"
            title={`Nạp tệp GLB từ máy cho ${modelId} (lưu vào IndexedDB)`}
          >
            <Upload className="w-3 h-3 text-[#9A3412]" />
            <span className="hidden sm:inline">Nạp tệp GLB từ máy</span>
          </button>

          <button
            type="button"
            onClick={() => handleZoom(-0.4)}
            disabled={viewerMode === 'missing' || viewerMode === 'loading'}
            className="p-1.5 border border-[#DFD8C8] bg-[#F5F1E8] hover:bg-[#1C1917] hover:text-[#FBF9F5] transition-colors cursor-pointer disabled:opacity-40"
            title="Phóng to (Zoom In)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => handleZoom(0.4)}
            disabled={viewerMode === 'missing' || viewerMode === 'loading'}
            className="p-1.5 border border-[#DFD8C8] bg-[#F5F1E8] hover:bg-[#1C1917] hover:text-[#FBF9F5] transition-colors cursor-pointer disabled:opacity-40"
            title="Thu nhỏ (Zoom Out)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleResetView}
            disabled={viewerMode === 'missing' || viewerMode === 'loading'}
            className="p-1.5 border border-[#DFD8C8] bg-[#F5F1E8] hover:bg-[#1C1917] hover:text-[#FBF9F5] transition-colors cursor-pointer disabled:opacity-40"
            title="Đặt lại góc nhìn về chính diện (0°)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Studio "Tạo ảnh 360° bằng AI" Modal */}
      <TurnaroundAiStudioModal
        isOpen={isAiStudioOpen}
        onClose={() => setIsAiStudioOpen(false)}
        gender={activeGender}
        topGarment={topGarment}
        bottomGarment={bottomGarment}
        accessories={activeAccessories}
        hairStyle={hairStyle}
        hairColorHex={hairColorHex}
        expression={expression}
        aoHex={activeAoHex}
        quanHex={activeQuanHex}
        existingTurntable={turntableData}
        onAppliedTurntable={(newTurntable) => {
          setTurntableData(newTurntable);
          setRecoloredFrames(null);
          if (viewerMode !== 'glb') {
            setViewerMode('turntable');
          }
        }}
      />
    </div>
  );
};
