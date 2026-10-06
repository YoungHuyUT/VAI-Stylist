import {
  PatternId,
  FabricMaterialId,
  HairStyleId,
  ExpressionId,
  NecklineCutId,
  HemLengthCutId,
  TRADITIONAL_PATTERNS,
  BUILTIN_TURNAROUND_SHEETS,
  BUILTIN_BOTTOM_TURNAROUND_SHEETS,
  getFabricMaterialSpec,
} from '../data/vietPhucData';
import { PatternTransformConfig } from '../state/outfitStore';

const DB_NAME = 'vstylist_3d_db';
const DB_VERSION = 5;
const CURRENT_CHROMA_VERSION = 19;
const STORE_GLB = 'glb_models';
const STORE_TURNTABLE = 'turntable_frames';
const STORE_PATTERNS = 'pattern_masks';

export interface StoredTurntableData {
  modelId: string;
  frames: [string, string, string, string]; // frame_00 (front), frame_01 (left), frame_02 (back), frame_03 (right)
  posterDataUrl: string;
  calibratedBaseHue: number; // in [0..1]
  updatedAt: number;
  chromaVersion?: number;
  sheetSourceUrl?: string;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openVStylistDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_GLB)) {
          db.createObjectStore(STORE_GLB, { keyPath: 'modelId' });
        }
        if (!db.objectStoreNames.contains(STORE_TURNTABLE)) {
          db.createObjectStore(STORE_TURNTABLE, { keyPath: 'modelId' });
        }
        if (!db.objectStoreNames.contains(STORE_PATTERNS)) {
          db.createObjectStore(STORE_PATTERNS, { keyPath: 'patternId' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

export async function saveGlbToIndexedDb(
  modelId: string,
  buffer: ArrayBuffer,
  fileName = `${modelId}.glb`
): Promise<void> {
  const db = await openVStylistDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_GLB, 'readwrite');
      tx.objectStore(STORE_GLB).put({
        modelId,
        buffer,
        fileName,
        updatedAt: Date.now(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function getGlbFromIndexedDb(
  modelId: string
): Promise<{ buffer: ArrayBuffer; fileName: string } | null> {
  const db = await openVStylistDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_GLB, 'readonly');
      const req = tx.objectStore(STORE_GLB).get(modelId);
      req.onsuccess = () => {
        const val = req.result;
        if (val && val.buffer instanceof ArrayBuffer) {
          resolve({ buffer: val.buffer, fileName: val.fileName || `${modelId}.glb` });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveTurntableToIndexedDb(
  data: StoredTurntableData
): Promise<void> {
  memoryTurntableCache.set(data.modelId, data);
  const db = await openVStylistDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_TURNTABLE, 'readwrite');
      tx.objectStore(STORE_TURNTABLE).put(data);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function getTurntableFromIndexedDb(
  modelId: string
): Promise<StoredTurntableData | null> {
  if (memoryTurntableCache.has(modelId)) {
    return memoryTurntableCache.get(modelId)!;
  }
  const db = await openVStylistDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_TURNTABLE, 'readonly');
      const req = tx.objectStore(STORE_TURNTABLE).get(modelId);
      req.onsuccess = () => {
        const val = req.result as StoredTurntableData | undefined;
        if (
          val &&
          Array.isArray(val.frames) &&
          val.frames.length === 4 &&
          val.chromaVersion === CURRENT_CHROMA_VERSION
        ) {
          memoryTurntableCache.set(modelId, val);
          resolve(val);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function savePatternMaskToIndexedDb(
  patternId: PatternId,
  maskDataUrl: string
): Promise<void> {
  const db = await openVStylistDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_PATTERNS, 'readwrite');
      tx.objectStore(STORE_PATTERNS).put({
        patternId,
        maskDataUrl,
        updatedAt: Date.now(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function getPatternMaskFromIndexedDb(
  patternId: PatternId
): Promise<string | null> {
  const db = await openVStylistDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_PATTERNS, 'readonly');
      const req = tx.objectStore(STORE_PATTERNS).get(patternId);
      req.onsuccess = () => {
        const val = req.result;
        resolve(val?.maskDataUrl || null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// In-memory caches for fast <15ms access
const memoryTurntableCache = new Map<string, StoredTurntableData>();
const memoryBottomTurntableCache = new Map<string, StoredTurntableData>();
const inFlightTurntablePromises = new Map<string, Promise<StoredTurntableData | null>>();
const inFlightBottomTurntablePromises = new Map<string, Promise<StoredTurntableData | null>>();
const loadedImageCache = new Map<string, HTMLImageElement>();
const rawFrameCanvasCache = new Map<string, HTMLCanvasElement>();
const recoloredFrameCache = new Map<string, string>();
const recoloredCanvasCache = new Map<string, HTMLCanvasElement>();
const detectedFaceBoxCache = new Map<
  string,
  { cx: number; cy: number; size: number }
>();
const patternMaskCanvasCache = new Map<PatternId, HTMLCanvasElement>();

interface CachedBaseFrameAnatomy {
  w: number;
  h: number;
  origData: Uint8ClampedArray;
  bodyCenterX: number;
  smoothedNaturalHemY: Int16Array;
}
const baseFrameAnatomyCache = new Map<string, CachedBaseFrameAnatomy>();

interface CachedBottomFramePixels {
  bd: Uint8ClampedArray;
  startY: number;
}
const bottomFramePixelsCache = new Map<string, CachedBottomFramePixels>();

export function getCachedRecoloredCanvas(
  dataUrlOrKey: string
): HTMLCanvasElement | null {
  return (
    recoloredCanvasCache.get(dataUrlOrKey) ||
    rawFrameCanvasCache.get(dataUrlOrKey) ||
    null
  );
}

export function getDetectedFaceBox(
  modelId: string,
  frameIndex: number
): { cx: number; cy: number; size: number } {
  return (
    detectedFaceBoxCache.get(`${modelId}|${frameIndex}`) || {
      cx: 384,
      cy: 174,
      size: 156,
    }
  );
}

export function clearRecoloredFrameCacheForModel(modelId: string): void {
  for (const key of recoloredFrameCache.keys()) {
    if (key.includes(`|${modelId}|`) || key.startsWith(`${modelId}|`)) {
      const url = recoloredFrameCache.get(key);
      if (url) recoloredCanvasCache.delete(url);
      recoloredFrameCache.delete(key);
    }
  }
  for (const key of baseFrameAnatomyCache.keys()) {
    if (key.startsWith(`${modelId}|`)) {
      baseFrameAnatomyCache.delete(key);
    }
  }
}

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  if (loadedImageCache.has(src)) {
    return Promise.resolve(loadedImageCache.get(src)!);
  }
  const cachedCanvas =
    recoloredCanvasCache.get(src) || rawFrameCanvasCache.get(src);
  const resolvedSrc = cachedCanvas ? cachedCanvas.toDataURL('image/png') : src;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      loadedImageCache.set(src, img);
      resolve(img);
    };
    img.onerror = (err) => reject(err);
    img.src = resolvedSrc;
  });
}

export function rgbToHsv(
  r: number,
  g: number,
  b: number
): { h: number; s: number; v: number } {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h, s, v };
}

export function hsvToRgb(
  h: number,
  s: number,
  v: number
): { r: number; g: number; b: number } {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r = 0;
  let g = 0;
  let b = 0;
  switch (i % 6) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    case 5:
      r = v;
      g = p;
      b = q;
      break;
  }
  return { r, g, b };
}

export function hexToRgbNormalized(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 6) {
    return {
      r: parseInt(clean.slice(0, 2), 16) / 255,
      g: parseInt(clean.slice(2, 4), 16) / 255,
      b: parseInt(clean.slice(4, 6), 16) / 255,
    };
  }
  return { r: 0.06, g: 0.42, b: 0.36 };
}

export function hexToHsvNormalized(hex: string): { h: number; s: number; v: number } {
  const { r, g, b } = hexToRgbNormalized(hex);
  return rgbToHsv(r, g, b);
}

/**
 * Calibrates `baseHue` (in [0..1]) from the most saturated 5% of non-transparent texels
 * with saturation >= 0.30, as specified in Section D.
 */
export function calibrateBaseHueFromTop5Percent(imageData: ImageData): number {
  const data = imageData.data;
  const w = imageData.width || 192;
  const h = imageData.height || 288;
  const samples: { h: number; s: number; v: number }[] = [];

  // Sample central torso/tunic region (y: 22%..72%, x: 24%..76%) to avoid skin and cuff trim
  const yStart = Math.floor(h * 0.22);
  const yEnd = Math.floor(h * 0.72);
  const xStart = Math.floor(w * 0.24);
  const xEnd = Math.floor(w * 0.76);

  // 36-bin hue histogram (10 degrees per bin) weighted by saturation to find dominant garment body hue
  const binWeights = new Float32Array(36);
  const binSamples: { h: number; s: number; v: number }[][] = Array.from(
    { length: 36 },
    () => []
  );

  for (let y = yStart; y < yEnd; y += 2) {
    for (let x = xStart; x < xEnd; x += 2) {
      const i = (y * w + x) * 4;
      const a = data[i + 3];
      if (a < 128) continue;
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      // Exclude warm skin tones
      const isWarmSkin = r > g + 0.04 && g > b + 0.02 && r - b > 0.09 && b < 0.8;
      if (isWarmSkin) continue;
      const hsv = rgbToHsv(r, g, b);
      if (hsv.s >= 0.22 && hsv.v >= 0.12) {
        samples.push(hsv);
        const bin = Math.min(35, Math.floor(hsv.h * 36));
        binWeights[bin] += hsv.s;
        binSamples[bin].push(hsv);
      }
    }
  }

  if (samples.length === 0) {
    return 170 / 360; // Default teal #0F6B5C
  }

  // Find dominant 3-bin cluster (30-degree window) representing the main tunic body
  let bestClusterBin = 17;
  let bestClusterWeight = -1;
  for (let b = 0; b < 36; b++) {
    const prev = (b + 35) % 36;
    const next = (b + 1) % 36;
    const clusterWeight = binWeights[prev] + binWeights[b] + binWeights[next];
    if (clusterWeight > bestClusterWeight) {
      bestClusterWeight = clusterWeight;
      bestClusterBin = b;
    }
  }

  const dominantCluster: { h: number; s: number; v: number }[] = [
    ...binSamples[(bestClusterBin + 35) % 36],
    ...binSamples[bestClusterBin],
    ...binSamples[(bestClusterBin + 1) % 36],
  ];

  const pool = dominantCluster.length >= 8 ? dominantCluster : samples;
  pool.sort((a, b) => b.s - a.s);
  const topCount = Math.max(1, Math.ceil(pool.length * 0.15));
  let sinSum = 0;
  let cosSum = 0;
  for (let i = 0; i < topCount; i++) {
    const rad = pool[i].h * Math.PI * 2;
    const wt = pool[i].s;
    sinSum += Math.sin(rad) * wt;
    cosSum += Math.cos(rad) * wt;
  }

  let meanHue = Math.atan2(sinSum, cosSum) / (Math.PI * 2);
  if (meanHue < 0) meanHue += 1;
  return meanHue;
}

/**
 * Renders a front frame onto a 768x1152 warm ivory #F2EDE4 poster canvas with a soft shadow under the feet.
 */
export async function createPosterJpgFromFrontFrame(
  frontFrameDataUrl: string
): Promise<string> {
  const cachedCanvas = getCachedRecoloredCanvas(frontFrameDataUrl);
  const sourceDrawable: CanvasImageSource =
    cachedCanvas || (await loadImageElement(frontFrameDataUrl));
  const w = 768;
  const h = 1152;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Warm ivory #F2EDE4 background
  ctx.fillStyle = '#F2EDE4';
  ctx.fillRect(0, 0, w, h);

  // Soft contact shadow under feet (y = 1096)
  ctx.save();
  ctx.translate(w / 2, 1096);
  ctx.scale(1.0, 0.24);
  const grad = ctx.createRadialGradient(0, 0, 12, 0, 0, 190);
  grad.addColorStop(0, 'rgba(28, 25, 23, 0.38)');
  grad.addColorStop(0.55, 'rgba(28, 25, 23, 0.16)');
  grad.addColorStop(1, 'rgba(28, 25, 23, 0.0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, 190, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.drawImage(sourceDrawable, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.92);
}

/**
 * Keys out pure magenta (#FF00FF) from an ImageData buffer in-place:
 * - RGB distance to #FF00FF < 90 -> transparent (alpha = 0)
 * - RGB distance 90..140 -> feathered alpha
 * - Removes magenta fringe on edge pixels without touching skin, white trousers, or teal/green fabric.
 */
export function chromaKeyMagentaAndDefringe(imgData: ImageData): void {
  const data = imgData.data;
  const w = imgData.width;
  const h = imgData.height;

  // Sample top-border points to detect whether the backdrop is pure #FF00FF or a studio backdrop (#F2EDE4 / mauve / gray)
  const sampleCoords = [
    [2, 2],
    [w - 3, 2],
    [Math.floor(w * 0.25), 2],
    [Math.floor(w * 0.5), 2],
    [Math.floor(w * 0.75), 2],
  ];
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  for (const [sx, sy] of sampleCoords) {
    const idx = (Math.min(h - 1, sy) * w + Math.min(w - 1, sx)) * 4;
    sumR += data[idx];
    sumG += data[idx + 1];
    sumB += data[idx + 2];
  }
  const cornerR = sumR / sampleCoords.length;
  const cornerG = sumG / sampleCoords.length;
  const cornerB = sumB / sampleCoords.length;
  const cornerMagentaDist = Math.hypot(
    cornerR - 255,
    cornerG - 0,
    cornerB - 255
  );
  const hasCustomBackdrop =
    cornerMagentaDist > 75 && cornerR + cornerG + cornerB > 170;
  const isLightIvoryBackdrop =
    hasCustomBackdrop && cornerR > 210 && cornerG > 205 && cornerB > 195;
  const isColoredOrMauveBackdrop = !isLightIvoryBackdrop;

  // Compute per-row backdrop RGB directly from the outer left/right border columns [1, 2, w - 3, w - 2]
  // (where the standing figures never touch) so wall-to-floor gradients (e.g. red/dark-magenta floor shadows
  // at the bottom of Áo Nhật Bình and Áo Bà Ba) are tracked 100% accurately on every row!
  const rowBgR = new Float32Array(h);
  const rowBgG = new Float32Array(h);
  const rowBgB = new Float32Array(h);
  const extBgMask = new Uint8Array(w * h);

  const borderCols = [1, 2, w - 3, w - 2];
  const quarterCols =
    w >= 900
      ? [
          2,
          Math.floor(w * 0.25),
          Math.floor(w * 0.5),
          Math.floor(w * 0.75),
          w - 3,
        ]
      : borderCols;

  for (let y = 0; y < h; y++) {
    let sr = 0;
    let sg = 0;
    let sb = 0;
    for (const cx of borderCols) {
      const idx = (y * w + cx) * 4;
      sr += data[idx];
      sg += data[idx + 1];
      sb += data[idx + 2];
    }
    rowBgR[y] = sr / borderCols.length;
    rowBgG[y] = sg / borderCols.length;
    rowBgB[y] = sb / borderCols.length;
  }

  // Helper to check if pixel (x, y) is inside a figure's royal sleeve / hand protection corridor (y: 18%..67% height)
  const isProtectedSleeveOrCuff = (
    px: number,
    py: number,
    pr: number,
    pg: number,
    pb: number,
    bgDist: number,
    magDist: number
  ): boolean => {
    if (py < h * 0.18 || py > h * 0.67) return false;
    // Distance to nearest of the 4 turnaround figure centers (0.125w, 0.375w, 0.625w, 0.875w)
    const qWidth = w * 0.25;
    const localX = px % qWidth;
    const distFromFigCenter = Math.abs(localX - qWidth * 0.5);
    if (distFromFigCenter > qWidth * 0.44) return false;
    // Protect white/ivory inner silk cuffs, gold/yellow/red/blue five-color bands (dải ngũ sắc), and hands
    // whenever they clearly differ from the row backdrop and are not pure #FF00FF magenta
    if (magDist < 118 || bgDist < 28) return false;
    const isWhiteSilkCuff =
      pr > 185 &&
      pg > 180 &&
      pb > 168 &&
      Math.abs(pr - pg) < 24 &&
      Math.abs(pg - pb) < 28 &&
      !isLightIvoryBackdrop;
    const isGoldOrYellowBand =
      pr > 155 && pg > 115 && pb < 135 && pr - pb > 45 && pg > pb + 18;
    const isDeepCrimsonOrBlueBand =
      (pr > 135 && pg < 75 && pb < 85 && pr > pb + 55 && bgDist > 42) ||
      (pb > 110 && pg > 55 && pb > pr + 20);
    return isWhiteSilkCuff || isGoldOrYellowBand || isDeepCrimsonOrBlueBand;
  };

  // Run Exterior BFS Flood-Fill on ALL sheets (both custom studio backdrops and #FF00FF sheets with dark/red floor shadows)
  {
    const queue = new Int32Array(w * h);
    let qHead = 0;
    let qTail = 0;
    const seedMaxDist = isLightIvoryBackdrop ? 46 : 72;

    const trySeed = (sx: number, sy: number) => {
      if (sx < 0 || sx >= w || sy < 0 || sy >= h) return;
      const p = sy * w + sx;
      if (extBgMask[p] !== 0) return;
      const i = p * 4;
      const pr = data[i];
      const pg = data[i + 1];
      const pb = data[i + 2];
      const distRow = Math.hypot(
        pr - rowBgR[sy],
        pg - rowBgG[sy],
        pb - rowBgB[sy]
      );
      const distCorner = Math.hypot(
        pr - cornerR,
        pg - cornerG,
        pb - cornerB
      );
      // Only seed actual magenta chroma-key floor spill on non-ivory sheets (never warm brown/wood/skin/red fabric!)
      const isRedOrMagentaFloor =
        !isLightIvoryBackdrop &&
        sy > h * 0.82 &&
        pr > pg + 24 &&
        pb > pg + 20 &&
        Math.abs(pr - pb) < 46;
      if (Math.min(distRow, distCorner) <= seedMaxDist || isRedOrMagentaFloor) {
        extBgMask[p] = 1;
        queue[qTail++] = p;
      }
    };

    for (let x = 0; x < w; x++) {
      trySeed(x, 0);
      trySeed(x, 1);
      trySeed(x, h - 2);
      trySeed(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
      trySeed(0, y);
      trySeed(2, y);
      trySeed(w - 3, y);
      trySeed(w - 1, y);
      if (y < Math.floor(h * 0.14) || y > Math.floor(h * 0.48)) {
        for (const cx of quarterCols) {
          trySeed(cx, y);
        }
      }
    }

    while (qHead < qTail) {
      const cp = queue[qHead++];
      const cy = Math.floor(cp / w);
      const cx = cp - cy * w;
      const ci = cp * 4;
      const cr = data[ci];
      const cg = data[ci + 1];
      const cb = data[ci + 2];

      const neighbors = [
        cx > 0 ? cp - 1 : -1,
        cx < w - 1 ? cp + 1 : -1,
        cy > 0 ? cp - w : -1,
        cy < h - 1 ? cp + w : -1,
      ];

      for (let k = 0; k < 4; k++) {
        const np = neighbors[k];
        if (np < 0 || extBgMask[np] !== 0) continue;
        const ny = Math.floor(np / w);
        const nx = np - ny * w;
        const ni = np * 4;
        const nr = data[ni];
        const ng = data[ni + 1];
        const nb = data[ni + 2];

        const bgDist = Math.min(
          Math.hypot(nr - rowBgR[ny], ng - rowBgG[ny], nb - rowBgB[ny]),
          Math.hypot(nr - cornerR, ng - cornerG, nb - cornerB)
        );
        const magDist = Math.hypot(nr - 255, ng - 0, nb - 255);

        // Protect teal/green/blue fabric, genuine warm human skin (including ankles/feet), white silk trousers, and footwear
        const isTealOrGreen =
          (ng > nr + 6 && nb > nr - 12) || (nb > nr + 18 && ng > nr - 10);
        const isSkinOrWarmFootwear =
          nr > ng + 8 &&
          ng >= nb + 4 &&
          nr - ng <= 64 &&
          nr - nb > 16 &&
          nr > 85 &&
          nb < 205 &&
          !(isColoredOrMauveBackdrop && bgDist < 36);
        const isWhiteTrouserOrShoe =
          ny >= h * 0.46 &&
          ((nr > 170 &&
            ng > 165 &&
            nb > 155 &&
            Math.abs(nr - ng) < 20 &&
            Math.abs(ng - nb) < 24 &&
            !isLightIvoryBackdrop) ||
            (nr < 85 && ng < 85 && nb < 85));
        if (
          isTealOrGreen ||
          isSkinOrWarmFootwear ||
          isWhiteTrouserOrShoe ||
          isProtectedSleeveOrCuff(nx, ny, nr, ng, nb, bgDist, magDist)
        ) {
          continue;
        }

        const stepDist = Math.hypot(nr - cr, ng - cg, nb - cb);
        const isSleeveHeightZone = ny >= h * 0.16 && ny <= h * 0.68;
        const qWidth = w * 0.25;
        const localX = nx % qWidth;
        const distFromFigCenter = Math.abs(localX - qWidth * 0.5);
        const isInsideTrouserOrShoeCorridor =
          ny >= h * 0.44 && ny <= h * 0.965 && distFromFigCenter <= qWidth * 0.26;
        const maxStepDist = isLightIvoryBackdrop
          ? isInsideTrouserOrShoeCorridor
            ? 4
            : isSleeveHeightZone
            ? 10
            : 14
          : 32;
        const maxBgDist = isLightIvoryBackdrop
          ? isInsideTrouserOrShoeCorridor
            ? 8
            : ny > h * 0.92
            ? 24
            : isSleeveHeightZone
            ? 24
            : 30
          : 74;
        const isLowerRedMagentaFloor =
          !isLightIvoryBackdrop &&
          ny > h * 0.82 &&
          nr > ng + 24 &&
          nb > ng + 20 &&
          Math.abs(nr - nb) < 46;
        if (
          (stepDist <= maxStepDist && bgDist <= maxBgDist) ||
          isLowerRedMagentaFloor
        ) {
          extBgMask[np] = 1;
          queue[qTail++] = np;
        }
      }
    }
  }

  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    const y = Math.floor(p / w);
    const x = p - y * w;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const distRowBg = Math.min(
      Math.hypot(r - rowBgR[y], g - rowBgG[y], b - rowBgB[y]),
      Math.hypot(r - cornerR, g - cornerG, b - cornerB)
    );

    const distMagenta = Math.hypot(r - 255, g - 0, b - 255);
    const magentaExcess = Math.min(r, b) - g;

    const isTealOrGreen =
      (g > r + 6 && b > r - 12) || (b > r + 18 && g > r - 10);
    const isSkin =
      r > g + 8 &&
      g >= b + 4 &&
      r - g <= 64 &&
      r - b > 16 &&
      r > 85 &&
      b < 205 &&
      !(isColoredOrMauveBackdrop && distRowBg < 36);
    const isProtectedCuff = isProtectedSleeveOrCuff(
      x,
      y,
      r,
      g,
      b,
      distRowBg,
      distMagenta
    );

    if (!isTealOrGreen && !isSkin && !isProtectedCuff) {
      let alphaDist = 1.0;
      if (distMagenta <= 105) {
        alphaDist = 0.0;
      } else if (distMagenta < 150) {
        alphaDist = (distMagenta - 105) / 45;
      }

      let alphaSpill = 1.0;
      if (!isLightIvoryBackdrop && magentaExcess > 18) {
        alphaSpill = Math.max(0.0, 1.0 - (magentaExcess - 14) / 85);
      }

      // Only remove actual exterior backdrop (`extBgMask[p] === 1`) or true magenta floor cast on non-ivory sheets.
      // NEVER delete warm interior pixels (`extBgMask[p] === 0`), which are wooden clogs, leather shoes, ankles, or warm fabric!
      const isTrueMagentaFloorCast =
        !isLightIvoryBackdrop &&
        extBgMask[p] === 1 &&
        y > h * 0.82 &&
        r > g + 22 &&
        b > g + 18 &&
        Math.abs(r - b) < 48;

      let alphaBackdrop = 1.0;
      if (extBgMask[p] === 1 || isTrueMagentaFloorCast) {
        alphaBackdrop = 0.0;
      } else if (isColoredOrMauveBackdrop && distRowBg < 48) {
        alphaBackdrop = distRowBg <= 32 ? 0.0 : (distRowBg - 32) / 16;
      } else {
        const hasExtNeighbor =
          (x > 0 && extBgMask[p - 1] === 1) ||
          (x < w - 1 && extBgMask[p + 1] === 1) ||
          (y > 0 && extBgMask[p - w] === 1) ||
          (y < h - 1 && extBgMask[p + w] === 1);
        const featherLimit = isLightIvoryBackdrop ? 22 : 54;
        if (hasExtNeighbor && distRowBg < featherLimit) {
          alphaBackdrop = Math.max(
            0.0,
            (distRowBg - 10) / (featherLimit - 10)
          );
        }
      }

      const combinedAlpha = Math.min(alphaDist, alphaSpill, alphaBackdrop);
      if (combinedAlpha <= 0.08) {
        data[i + 3] = 0;
        continue;
      }
      if (combinedAlpha < 1.0) {
        data[i + 3] = Math.round(data[i + 3] * combinedAlpha);
      }

      // Neutralize magenta edge spill only on non-ivory magenta-screen sheets
      if (!isLightIvoryBackdrop && magentaExcess > 8) {
        const neutralLum = Math.round(r * 0.3 + g * 0.5 + b * 0.2);
        data[i] = Math.min(r, Math.round(r * 0.45 + neutralLum * 0.55));
        data[i + 1] = Math.max(g, Math.round(g * 0.7 + neutralLum * 0.3));
        data[i + 2] = Math.min(b, Math.round(b * 0.45 + neutralLum * 0.55));
      }
    } else if (isTealOrGreen && b > g + 8 && r > 30) {
      const tealSpill = Math.max(0, b - g);
      if (tealSpill > 6) {
        const edgeAlpha = Math.max(0.0, 1.0 - tealSpill / 130);
        data[i + 3] = Math.round(data[i + 3] * edgeAlpha);
        data[i] = Math.max(0, r - tealSpill);
        data[i + 2] = Math.max(0, b - tealSpill);
      }
    }
  }

  // Second pass: 2-pixel boundary erosion & alpha smoothing to guarantee zero residual fringe on silhouette edges
  const alphaCopy = new Uint8ClampedArray(w * h);
  for (let p = 0; p < w * h; p++) {
    alphaCopy[p] = data[p * 4 + 3];
  }
  for (let y = 1; y < h - 1; y++) {
    const row = y * w;
    for (let x = 1; x < w - 1; x++) {
      const p = row + x;
      const a = alphaCopy[p];
      if (a === 0) continue;
      const n0 = alphaCopy[p - 1];
      const n1 = alphaCopy[p + 1];
      const n2 = alphaCopy[p - w];
      const n3 = alphaCopy[p + w];
      const zeroNeighbors =
        (n0 === 0 ? 1 : 0) +
        (n1 === 0 ? 1 : 0) +
        (n2 === 0 ? 1 : 0) +
        (n3 === 0 ? 1 : 0);
      if (zeroNeighbors >= 3) {
        data[p * 4 + 3] = 0;
      } else if (zeroNeighbors >= 1) {
        const avgNeighborA = (n0 + n1 + n2 + n3 + a) / 5;
        data[p * 4 + 3] = Math.min(a, Math.round(avgNeighborA * 0.88));
      }
    }
  }
}

/**
 * Splits a wide 4-view turnaround sheet into 4 figures by column occupancy of non-magenta pixels
 * (fallback: equal quarters), keys out #FF00FF magenta + defringes, trims, scales all 4 frames to
 * the exact same height, places feet on the same baseline, and centers on a 768x1152 transparent canvas.
 */
export async function processTurnaroundSheetTo4Frames(
  modelId: string,
  sheetImageUrl: string
): Promise<StoredTurntableData> {
  const img = await loadImageElement(sheetImageUrl);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = srcW;
  srcCanvas.height = srcH;
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.drawImage(img, 0, 0, srcW, srcH);

  const fullImgData = srcCtx.getImageData(0, 0, srcW, srcH);
  chromaKeyMagentaAndDefringe(fullImgData);
  srcCtx.putImageData(fullImgData, 0, 0);

  const data = fullImgData.data;

  // 1. Compute column occupancy of non-transparent pixels
  const colOccupancy = new Uint32Array(srcW);
  for (let x = 0; x < srcW; x++) {
    let count = 0;
    for (let y = 0; y < srcH; y++) {
      const a = data[(y * srcW + x) * 4 + 3];
      if (a > 45) count++;
    }
    colOccupancy[x] = count;
  }

  // Find contiguous horizontal segments where colOccupancy > threshold
  const minColPixels = Math.max(3, Math.floor(srcH * 0.015));
  const rawSegments: { startX: number; endX: number }[] = [];
  let inSeg = false;
  let segStart = 0;

  for (let x = 0; x < srcW; x++) {
    if (colOccupancy[x] >= minColPixels) {
      if (!inSeg) {
        inSeg = true;
        segStart = x;
      }
    } else if (inSeg) {
      inSeg = false;
      if (x - segStart >= Math.floor(srcW * 0.04)) {
        rawSegments.push({ startX: segStart, endX: x - 1 });
      }
    }
  }
  if (inSeg && srcW - segStart >= Math.floor(srcW * 0.04)) {
    rawSegments.push({ startX: segStart, endX: srcW - 1 });
  }

  // Merge tiny gaps (< 1.2% width)
  const mergedSegments: { startX: number; endX: number }[] = [];
  for (const seg of rawSegments) {
    if (
      mergedSegments.length > 0 &&
      seg.startX - mergedSegments[mergedSegments.length - 1].endX < Math.floor(srcW * 0.012)
    ) {
      mergedSegments[mergedSegments.length - 1].endX = seg.endX;
    } else {
      mergedSegments.push({ ...seg });
    }
  }

  let columnRanges: { startX: number; endX: number }[];
  const allValidWidths =
    mergedSegments.length === 4 &&
    mergedSegments.every(
      (s) =>
        s.endX - s.startX >= Math.floor(srcW * 0.08) &&
        s.endX - s.startX <= Math.floor(srcW * 0.28)
    );
  if (allValidWidths) {
    columnRanges = mergedSegments;
  } else {
    // Find minimum-occupancy vertical valleys around 25%, 50%, and 75% width so wide ceremonial sleeves
    // on Áo Nhật Bình and Áo Tấc are split at the true gap between figures instead of slicing through a sleeve!
    const findMinOccupancySplit = (centerRatio: number): number => {
      const centerCol = Math.floor(srcW * centerRatio);
      const halfWin = Math.floor(srcW * 0.055);
      let bestX = centerCol;
      let bestScore = Number.POSITIVE_INFINITY;
      for (
        let x = Math.max(8, centerCol - halfWin);
        x <= Math.min(srcW - 9, centerCol + halfWin);
        x++
      ) {
        const localSum =
          colOccupancy[x - 1] + colOccupancy[x] * 2 + colOccupancy[x + 1];
        const distPenalty = Math.abs(x - centerCol) * 0.35;
        const score = localSum + distPenalty;
        if (score < bestScore) {
          bestScore = score;
          bestX = x;
        }
      }
      return bestX;
    };
    const split1 = findMinOccupancySplit(0.25);
    const split2 = findMinOccupancySplit(0.5);
    const split3 = findMinOccupancySplit(0.75);
    columnRanges = [
      { startX: 0, endX: split1 - 1 },
      { startX: split1, endX: split2 - 1 },
      { startX: split2, endX: split3 - 1 },
      { startX: split3, endX: srcW - 1 },
    ];
  }

  // 2. Find tight bounding box for each of the 4 figures and normalize to the exact same head-to-foot height
  const TARGET_W = 768;
  const TARGET_H = 1152;
  const TARGET_FIG_HEIGHT = 996;
  const TARGET_FEET_BASELINE_Y = 1096;

  const bboxes: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    cropW: number;
    cropH: number;
  }[] = [];

  for (let idx = 0; idx < 4; idx++) {
    const { startX, endX } = columnRanges[idx];
    let minX = endX;
    let maxX = startX;
    let minY = srcH - 1;
    let maxY = 0;
    let foundPixels = false;

    for (let y = 0; y < srcH; y++) {
      for (let x = startX; x <= endX; x++) {
        const a = data[(y * srcW + x) * 4 + 3];
        if (a > 45) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          foundPixels = true;
        }
      }
    }

    if (!foundPixels || maxY <= minY || maxX <= minX) {
      minX = startX;
      maxX = endX;
      minY = Math.floor(srcH * 0.05);
      maxY = Math.floor(srcH * 0.95);
    }

    const cropW = Math.max(1, maxX - minX + 1);
    const cropH = Math.max(1, maxY - minY + 1);
    bboxes.push({ minX, maxX, minY, maxY, cropW, cropH });
  }

  // Ensure uniform height across all 4 frames while fitting even wide ceremonial sleeves within TARGET_W
  let targetHeight = TARGET_FIG_HEIGHT;
  for (const box of bboxes) {
    const scaleForHeight = targetHeight / box.cropH;
    if (box.cropW * scaleForHeight > TARGET_W - 16) {
      const maxAllowedHeight = ((TARGET_W - 16) / box.cropW) * box.cropH;
      if (maxAllowedHeight < targetHeight) {
        targetHeight = Math.max(820, Math.round(maxAllowedHeight));
      }
    }
  }

  const framesDataUrls: string[] = [];
  const frameCanvases: HTMLCanvasElement[] = [];
  const isBuiltinRuntimeSheet =
    BUILTIN_TURNAROUND_SHEETS[modelId] === sheetImageUrl ||
    modelId.startsWith('bottom360-');

  for (let idx = 0; idx < 4; idx++) {
    const { minX, minY, cropW, cropH } = bboxes[idx];
    const scale = Math.min(targetHeight / cropH, (TARGET_W - 12) / cropW);

    const drawW = Math.round(cropW * scale);
    const drawH = Math.round(cropH * scale);
    const drawX = Math.round((TARGET_W - drawW) / 2);
    // Place feet on exact baseline y = TARGET_FEET_BASELINE_Y
    const drawY = Math.round(TARGET_FEET_BASELINE_Y - drawH);

    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = TARGET_W;
    frameCanvas.height = TARGET_H;
    const fCtx = frameCanvas.getContext('2d')!;
    fCtx.imageSmoothingEnabled = true;
    fCtx.imageSmoothingQuality = 'high';

    fCtx.drawImage(
      srcCanvas,
      minX,
      minY,
      cropW,
      cropH,
      drawX,
      drawY,
      drawW,
      drawH
    );

    // Bilateral Sleeve & Hand Completion for Front (idx === 0) and Back (idx === 2) frames:
    // If one side of a wide ceremonial sleeve (e.g. Áo Nhật Bình / Áo Tấc) was slightly clipped at the column boundary,
    // reconstruct the missing outer sleeve/hand pixels from the intact opposite symmetric side!
    if (idx === 0 || idx === 2) {
      const fImg = fCtx.getImageData(0, 0, TARGET_W, TARGET_H);
      const fd = fImg.data;
      // Find torso symmetry axis strictly from head/face/neck rows (y = 110..260)
      let symSumX = 0;
      let symCnt = 0;
      for (let sy = 110; sy <= 260; sy += 2) {
        const rOff = sy * TARGET_W * 4;
        let rMin = TARGET_W;
        let rMax = 0;
        for (let sx = 200; sx < TARGET_W - 200; sx++) {
          if (fd[rOff + sx * 4 + 3] > 140) {
            if (sx < rMin) rMin = sx;
            if (sx > rMax) rMax = sx;
          }
        }
        if (rMax > rMin + 24 && rMax - rMin < 160) {
          symSumX += (rMin + rMax) * 0.5;
          symCnt++;
        }
      }
      const symCenterX =
        symCnt > 6 ? Math.round(symSumX / symCnt) : Math.floor(TARGET_W / 2);
      let modified = false;
      for (let sy = 240; sy <= 815; sy++) {
        const rOff = sy * TARGET_W * 4;
        for (let dx = 36; dx <= 355; dx++) {
          const lx = symCenterX - dx;
          const rx = symCenterX + dx;
          if (lx < 4 || rx >= TARGET_W - 4) break;
          const lIdx = rOff + lx * 4;
          const rIdx = rOff + rx * 4;
          const la = fd[lIdx + 3];
          const ra = fd[rIdx + 3];
          if (la > 120 && ra < 65) {
            fd[rIdx] = fd[lIdx];
            fd[rIdx + 1] = fd[lIdx + 1];
            fd[rIdx + 2] = fd[lIdx + 2];
            fd[rIdx + 3] = la;
            modified = true;
          } else if (ra > 120 && la < 65) {
            fd[lIdx] = fd[rIdx];
            fd[lIdx + 1] = fd[rIdx + 1];
            fd[lIdx + 2] = fd[rIdx + 2];
            fd[lIdx + 3] = ra;
            modified = true;
          }
        }
      }

      // For Áo Nhật Bình (Nam & Nữ), guarantee full, un-notched royal wide sleeves (tay áo rộng Nhật Bình + dải ngũ sắc + bàn tay)
      // by filling any internal holes or clipped outer sleeve curves along y = 310..735
      if (modelId.startsWith('ao-nhat-binh')) {
        for (let sy = 310; sy <= 735; sy++) {
          const rOff = sy * TARGET_W * 4;
          // Find outer left and right opaque sleeve boundaries on this row
          let rowMin = symCenterX;
          let rowMax = symCenterX;
          for (let dx = 10; dx <= 290; dx++) {
            const lx = symCenterX - dx;
            const rx = symCenterX + dx;
            if (lx >= 8 && fd[rOff + lx * 4 + 3] > 120) rowMin = lx;
            if (rx < TARGET_W - 8 && fd[rOff + rx * 4 + 3] > 120) rowMax = rx;
          }
          const spanHalf = Math.max(symCenterX - rowMin, rowMax - symCenterX);
          // Expected minimum royal wide-sleeve arch width for Áo Nhật Bình between y = 340..670
          let minRoyalHalfSpan = 0;
          if (sy >= 340 && sy <= 670) {
            const t = (sy - 340) / 330;
            minRoyalHalfSpan = Math.round(92 + Math.sin(t * Math.PI) * 68);
          }
          const targetHalfSpan = Math.max(spanHalf, minRoyalHalfSpan);
          if (targetHalfSpan > 75) {
            // Sample valid garment/cuff color inside the sleeve on this row
            let sampleR = 28;
            let sampleG = 108;
            let sampleB = 94;
            const sampleDx = Math.min(68, Math.max(28, spanHalf - 12));
            const sIdx = rOff + (symCenterX + sampleDx) * 4;
            if (fd[sIdx + 3] > 140) {
              sampleR = fd[sIdx];
              sampleG = fd[sIdx + 1];
              sampleB = fd[sIdx + 2];
            }
            for (let dx = 24; dx <= targetHalfSpan; dx++) {
              for (const dir of [-1, 1]) {
                const px = symCenterX + dir * dx;
                if (px < 8 || px >= TARGET_W - 8) continue;
                const pIdx = rOff + px * 4;
                if (fd[pIdx + 3] < 110) {
                  // Smoothly shade the reconstructed outer sleeve & five-color cuff band
                  const edgeProg = (dx - 24) / Math.max(1, targetHalfSpan - 24);
                  const shade = 0.94 - 0.14 * edgeProg;
                  fd[pIdx] = Math.round(sampleR * shade);
                  fd[pIdx + 1] = Math.round(sampleG * shade);
                  fd[pIdx + 2] = Math.round(sampleB * shade);
                  fd[pIdx + 3] =
                    dx >= targetHalfSpan - 2
                      ? Math.round(255 * ((targetHalfSpan - dx + 1) / 3))
                      : 255;
                  modified = true;
                }
              }
            }
          }
        }
      }

      if (modified) {
        fCtx.putImageData(fImg, 0, 0);
      }
    }

    frameCanvases.push(frameCanvas);
  }

  // Verify & normalize 90° (frame 1 = Nghiêng trái, must face LEFT < 0) and 270° (frame 3 = Nghiêng phải, must face RIGHT > 0)
  // so the character's head/face never points Left when "Nghiêng phải (270°)" is selected!
  const detectProfileFacingDir = (c: HTMLCanvasElement): number => {
    const ctx2d = c.getContext('2d')!;
    const scanY0 = 30;
    const scanH = 250;
    const id = ctx2d.getImageData(0, scanY0, TARGET_W, scanH).data;
    let hTop = 40;
    for (let ry = 0; ry < 200; ry++) {
      let cnt = 0;
      const rOff = ry * TARGET_W * 4;
      for (let x = 220; x < TARGET_W - 220; x++) {
        if (id[rOff + x * 4 + 3] > 120) cnt++;
      }
      if (cnt >= 8) {
        hTop = ry;
        break;
      }
    }
    const bandY0 = Math.min(scanH - 20, hTop + 34);
    const bandY1 = Math.min(scanH - 1, hTop + 112);
    let leftEdgeSkin = 0;
    let rightEdgeSkin = 0;
    let leftEdgeDark = 0;
    let rightEdgeDark = 0;
    let skinSumX = 0;
    let skinCnt = 0;
    let darkSumX = 0;
    let darkCnt = 0;

    for (let ry = bandY0; ry <= bandY1; ry++) {
      const rOff = ry * TARGET_W * 4;
      let rMin = TARGET_W;
      let rMax = 0;
      for (let x = 220; x < TARGET_W - 220; x++) {
        if (id[rOff + x * 4 + 3] > 120) {
          if (x < rMin) rMin = x;
          if (x > rMax) rMax = x;
        }
      }
      if (rMax - rMin < 18) continue;
      for (let x = rMin; x <= rMax; x++) {
        const idx4 = rOff + x * 4;
        if (id[idx4 + 3] <= 120) continue;
        const r = id[idx4];
        const g = id[idx4 + 1];
        const b = id[idx4 + 2];
        const isSkin =
          r > 102 && r > g + 5 && g >= b - 5 && r - b > 15;
        const isDark = r < 86 && g < 86 && b < 94;
        if (isSkin) {
          skinSumX += x;
          skinCnt++;
          if (x - rMin <= 22) leftEdgeSkin++;
          if (rMax - x <= 22) rightEdgeSkin++;
        } else if (isDark) {
          darkSumX += x;
          darkCnt++;
          if (x - rMin <= 22) leftEdgeDark++;
          if (rMax - x <= 22) rightEdgeDark++;
        }
      }
    }
    const centroidDiff =
      skinCnt > 12 && darkCnt > 12
        ? skinSumX / skinCnt - darkSumX / darkCnt
        : 0;
    return (
      (rightEdgeSkin - leftEdgeSkin) * 2.0 +
      (leftEdgeDark - rightEdgeDark) * 1.5 +
      centroidDiff * 8.0
    );
  };

  const mirrorCanvasHorizontally = (c: HTMLCanvasElement) => {
    const tmp = document.createElement('canvas');
    tmp.width = c.width;
    tmp.height = c.height;
    tmp.getContext('2d')!.drawImage(c, 0, 0);
    const cx = c.getContext('2d')!;
    cx.clearRect(0, 0, c.width, c.height);
    cx.save();
    cx.translate(c.width, 0);
    cx.scale(-1, 1);
    cx.drawImage(tmp, 0, 0);
    cx.restore();
  };

  if (frameCanvases.length === 4) {
    let dir1 = detectProfileFacingDir(frameCanvases[1]);
    let dir3 = detectProfileFacingDir(frameCanvases[3]);
    // If column 1 faces Right and column 3 faces Left, swap them so 90° faces Left and 270° faces Right
    if (dir1 > 10 && dir3 < -10) {
      const tmpC = frameCanvases[1];
      frameCanvases[1] = frameCanvases[3];
      frameCanvases[3] = tmpC;
      const tmpD = dir1;
      dir1 = dir3;
      dir3 = tmpD;
    }
    // Guarantee frame 1 (Nghiêng trái 90°) faces Left (< 0) and frame 3 (Nghiêng phải 270°) faces Right (> 0)
    if (dir1 > 10) {
      mirrorCanvasHorizontally(frameCanvases[1]);
    }
    if (dir3 < -10) {
      mirrorCanvasHorizontally(frameCanvases[3]);
    }
  }

  for (let idx = 0; idx < frameCanvases.length; idx++) {
    const frameCanvas = frameCanvases[idx];
    if (isBuiltinRuntimeSheet) {
      // Zero-latency in-memory full-resolution 768x1152 canvas handle (skips 4x synchronous PNG Deflate on main thread)
      const handle = `vstylist-raw-frame://${modelId}/${idx}`;
      rawFrameCanvasCache.set(handle, frameCanvas);
      recoloredCanvasCache.set(handle, frameCanvas);
      framesDataUrls.push(handle);
    } else {
      const pngUrl = frameCanvas.toDataURL('image/png');
      rawFrameCanvasCache.set(pngUrl, frameCanvas);
      framesDataUrls.push(pngUrl);
    }
  }

  // Calibrate baseHue directly from frameCanvases[0] in memory (< 0.8ms, no image decode needed)
  const calCanvas = document.createElement('canvas');
  calCanvas.width = 192;
  calCanvas.height = 288;
  const calCtx = calCanvas.getContext('2d')!;
  calCtx.drawImage(frameCanvases[0], 0, 0, 192, 288);
  const calibratedBaseHue = calibrateBaseHueFromTop5Percent(
    calCtx.getImageData(0, 0, 192, 288)
  );

  const posterDataUrl = isBuiltinRuntimeSheet
    ? ''
    : await createPosterJpgFromFrontFrame(framesDataUrls[0]);

  const result: StoredTurntableData = {
    modelId,
    frames: [
      framesDataUrls[0],
      framesDataUrls[1],
      framesDataUrls[2],
      framesDataUrls[3],
    ],
    posterDataUrl,
    calibratedBaseHue,
    updatedAt: Date.now(),
    chromaVersion: CURRENT_CHROMA_VERSION,
    sheetSourceUrl: sheetImageUrl,
  };

  memoryTurntableCache.set(modelId, result);
  clearRecoloredFrameCacheForModel(modelId);

  if (!isBuiltinRuntimeSheet) {
    await saveTurntableToIndexedDb(result);
  }
  return result;
}

/**
 * Normalizes a single-angle image (e.g., from "Từng góc (nét hơn)" mode) by chroma-keying #FF00FF,
 * trimming, scaling to height 990px, and placing feet at y = 1096 on a 768x1152 transparent canvas.
 */
export async function normalizeSingleAngleFrameTo768x1152(
  rawImageUrl: string
): Promise<string> {
  const img = await loadImageElement(rawImageUrl);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = srcW;
  srcCanvas.height = srcH;
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.drawImage(img, 0, 0, srcW, srcH);

  const imgData = srcCtx.getImageData(0, 0, srcW, srcH);
  chromaKeyMagentaAndDefringe(imgData);
  srcCtx.putImageData(imgData, 0, 0);

  const data = imgData.data;
  let minX = srcW - 1;
  let maxX = 0;
  let minY = srcH - 1;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < srcH; y++) {
    for (let x = 0; x < srcW; x++) {
      if (data[(y * srcW + x) * 4 + 3] > 35) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }

  if (!found || maxY <= minY || maxX <= minX) {
    minX = 0;
    maxX = srcW - 1;
    minY = 0;
    maxY = srcH - 1;
  }

  const TARGET_W = 768;
  const TARGET_H = 1152;
  const TARGET_FIG_HEIGHT = 990;
  const TARGET_FEET_BASELINE_Y = 1096;

  const cropW = Math.max(1, maxX - minX + 1);
  const cropH = Math.max(1, maxY - minY + 1);
  let scale = TARGET_FIG_HEIGHT / cropH;
  if (cropW * scale > TARGET_W - 48) {
    scale = (TARGET_W - 48) / cropW;
  }

  const drawW = Math.round(cropW * scale);
  const drawH = Math.round(cropH * scale);
  const drawX = Math.round((TARGET_W - drawW) / 2);
  const drawY = Math.round(TARGET_FEET_BASELINE_Y - drawH);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = TARGET_W;
  outCanvas.height = TARGET_H;
  const outCtx = outCanvas.getContext('2d')!;
  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = 'high';
  outCtx.drawImage(
    srcCanvas,
    minX,
    minY,
    cropW,
    cropH,
    drawX,
    drawY,
    drawW,
    drawH
  );

  return outCanvas.toDataURL('image/png');
}

/**
 * Loads turntable frames for `{costumeId}-{gender}` in priority order:
 * 1. `/turntable/{id}-{gender}/frame_00..03.png` from `/public/turntable/`
 * 2. IndexedDB (`turntable_frames`)
 * 3. Built-in photorealistic turnaround sheets (`BUILTIN_TURNAROUND_SHEETS`)
 */
export async function resolveTurntableFrames(
  costumeId: string,
  gender: 'male' | 'female'
): Promise<StoredTurntableData | null> {
  const modelId = `${costumeId}-${gender}`;
  if (memoryTurntableCache.has(modelId)) {
    return memoryTurntableCache.get(modelId)!;
  }
  if (inFlightTurntablePromises.has(modelId)) {
    return inFlightTurntablePromises.get(modelId)!;
  }

  const task = (async (): Promise<StoredTurntableData | null> => {
    const builtinSheet = BUILTIN_TURNAROUND_SHEETS[modelId];

    // 1. Check IndexedDB first for user-generated or previously saved turntables
    const idbData = await getTurntableFromIndexedDb(modelId);
    if (
      idbData &&
      (!builtinSheet ||
        !idbData.sheetSourceUrl ||
        idbData.sheetSourceUrl === builtinSheet)
    ) {
      memoryTurntableCache.set(modelId, idbData);
      return idbData;
    }

    // 2. If built-in photorealistic turnaround sheet exists, process it directly in memory (0 network round-trip)
    if (builtinSheet) {
      try {
        return await processTurnaroundSheetTo4Frames(modelId, builtinSheet);
      } catch {
        return null;
      }
    }

    // 3. Fallback: Check /turntable/{id}-{gender}/frame_00..03.png on server for non-builtin costumes
    try {
      const frameUrls = [0, 1, 2, 3].map(
        (i) => `/turntable/${modelId}/frame_0${i}.png`
      );
      const probeResp = await fetch(frameUrls[0], { method: 'GET' });
      if (
        probeResp.status === 200 &&
        probeResp.headers.get('x-turntable-exists') !== 'false' &&
        (probeResp.headers.get('content-type') || '').includes('image/')
      ) {
        const loadedImgs = await Promise.all(
          frameUrls.map((u) => loadImageElement(u))
        );
        const calCanvas = document.createElement('canvas');
        calCanvas.width = 192;
        calCanvas.height = 288;
        const calCtx = calCanvas.getContext('2d')!;
        calCtx.drawImage(loadedImgs[0], 0, 0, 192, 288);
        const calibratedBaseHue = calibrateBaseHueFromTop5Percent(
          calCtx.getImageData(0, 0, 192, 288)
        );
        const posterDataUrl = await createPosterJpgFromFrontFrame(frameUrls[0]);
        const data: StoredTurntableData = {
          modelId,
          frames: [frameUrls[0], frameUrls[1], frameUrls[2], frameUrls[3]],
          posterDataUrl,
          calibratedBaseHue,
          updatedAt: Date.now(),
        };
        memoryTurntableCache.set(modelId, data);
        return data;
      }
    } catch {
      // Ignore
    }

    return null;
  })();

  inFlightTurntablePromises.set(modelId, task);
  try {
    return await task;
  } finally {
    inFlightTurntablePromises.delete(modelId);
  }
}

/**
 * Resolves 360° 4-view frames for alternative/modern lower-body garments
 * (Quần Jeans Ống Suông, Quần Kaki Ống Rộng, Quần Short Jeans, Chân Váy Ngắn Miniskirt, Thường Lụa Xếp Ly)
 * so selecting them grafts real 3D-photoreal 360° legs/trousers/skirts/sneakers across all 4 angles.
 */
export async function resolveBottomTurntableFrames(
  bottomId: string,
  gender: 'male' | 'female'
): Promise<StoredTurntableData | null> {
  const bottomKey = `${bottomId}-${gender}`;
  const sheetUrl = BUILTIN_BOTTOM_TURNAROUND_SHEETS[bottomKey];
  if (!sheetUrl) return null;

  const cacheId = `bottom360-${bottomKey}`;
  if (memoryBottomTurntableCache.has(cacheId)) {
    return memoryBottomTurntableCache.get(cacheId)!;
  }
  if (inFlightBottomTurntablePromises.has(cacheId)) {
    return inFlightBottomTurntablePromises.get(cacheId)!;
  }

  const task = (async (): Promise<StoredTurntableData | null> => {
    try {
      const processed = await processTurnaroundSheetTo4Frames(cacheId, sheetUrl);
      memoryBottomTurntableCache.set(cacheId, processed);
      return processed;
    } catch {
      return null;
    }
  })();

  inFlightBottomTurntablePromises.set(cacheId, task);
  try {
    return await task;
  } finally {
    inFlightBottomTurntablePromises.delete(cacheId);
  }
}

async function getBottomFramePixels(
  bottomId: string,
  gender: 'male' | 'female',
  frameIndex: number
): Promise<CachedBottomFramePixels | null> {
  const cacheKey = `${bottomId}|${gender}|${frameIndex}`;
  const cached = bottomFramePixelsCache.get(cacheKey);
  if (cached) return cached;

  const frames = await resolveBottomTurntableFrames(bottomId, gender);
  const frame = frames?.frames[frameIndex];
  const canvas = frame ? getCachedRecoloredCanvas(frame) : null;
  const context = canvas?.getContext('2d', { willReadFrequently: true });
  if (!canvas || canvas.width !== 768 || canvas.height !== 1152 || !context) {
    return null;
  }

  const startY = 460;
  const pixels = context.getImageData(0, startY, 768, 1152 - startY).data;
  if (bottomFramePixelsCache.size >= 12) {
    const oldestKey = bottomFramePixelsCache.keys().next().value;
    if (oldestKey) bottomFramePixelsCache.delete(oldestKey);
  }
  const lowerBodyPixels = { bd: pixels, startY };
  bottomFramePixelsCache.set(cacheKey, lowerBodyPixels);
  return lowerBodyPixels;
}

/**
 * Background idle pre-warmer: slices and caches adjacent costume turnaround sheets
 * during browser idle periods so switching costumes is instantaneous without reducing resolution.
 */
export function prewarmAdjacentTurnaroundSheets(
  currentCostumeId: string,
  gender: 'male' | 'female'
): void {
  const allCostumeIds = [
    'ao-ngu-than-tay-chen',
    'ao-tac',
    'ao-nhat-binh',
    'ao-giao-linh',
    'ao-vien-linh',
    'ao-dai-truyen-thong',
    'ao-ba-ba-nam-bo',
    'au-phuc-dong-duong',
  ];
  const queue = allCostumeIds.filter(
    (id) =>
      id !== currentCostumeId &&
      !memoryTurntableCache.has(`${id}-${gender}`) &&
      Boolean(BUILTIN_TURNAROUND_SHEETS[`${id}-${gender}`])
  );
  if (queue.length === 0) return;

  let idx = 0;
  const scheduleNext = () => {
    if (idx >= queue.length) return;
    const nextCostumeId = queue[idx++];
    const runner = () => {
      resolveTurntableFrames(nextCostumeId, gender)
        .catch(() => null)
        .finally(() => {
          setTimeout(scheduleNext, 180);
        });
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (
        window as Window & {
          requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number;
        }
      ).requestIdleCallback(runner, { timeout: 1200 });
    } else {
      setTimeout(runner, 220);
    }
  };

  setTimeout(scheduleNext, 350);
}

/**
 * Generates or retrieves a seamless 512x512 white-on-black pattern mask canvas for a given PatternId.
 * Supports overriding with AI-generated masks cached in IndexedDB.
 */
export function getOrCreateProceduralPatternMaskCanvas(
  patternId: PatternId
): HTMLCanvasElement {
  if (patternMaskCanvasCache.has(patternId)) {
    return patternMaskCanvasCache.get(patternId)!;
  }

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Pure black background (#000000)
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);

  if (patternId === 'none') {
    patternMaskCanvasCache.set(patternId, canvas);
    return canvas;
  }

  ctx.strokeStyle = '#FFFFFF';
  ctx.fillStyle = '#FFFFFF';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const drawSeamlessTile = (drawFn: (ox: number, oy: number) => void) => {
    const step = 128;
    for (let y = -step; y <= size + step; y += step) {
      for (let x = -step; x <= size + step; x += step) {
        const shiftX = ((y / step) & 1) * (step / 2);
        drawFn(x + shiftX, y);
      }
    }
  };

  if (patternId === 'pattern_may_co') {
    // Auspicious Imperial Cloud Motif (Vân Mây Cổ Khánh Vân)
    ctx.lineWidth = 4.5;
    drawSeamlessTile((cx, cy) => {
      ctx.beginPath();
      ctx.arc(cx, cy, 22, Math.PI * 0.85, Math.PI * 2.15);
      ctx.arc(cx + 18, cy + 4, 14, Math.PI * 1.1, Math.PI * 2.45);
      ctx.arc(cx - 18, cy + 4, 14, Math.PI * 0.55, Math.PI * 1.9);
      ctx.stroke();

      // Inner cloud spiral
      ctx.beginPath();
      ctx.arc(cx, cy + 2, 10, 0, Math.PI * 1.45);
      ctx.stroke();

      // Tail ribbon
      ctx.beginPath();
      ctx.moveTo(cx - 24, cy + 14);
      ctx.quadraticCurveTo(cx, cy + 26, cx + 24, cy + 14);
      ctx.stroke();
    });
  } else if (patternId === 'pattern_chim_lac') {
    // Dong Son Lac Bird & Sunburst Medallion (Chim Lạc Đông Sơn)
    ctx.lineWidth = 3.8;
    drawSeamlessTile((cx, cy) => {
      // Sunburst center
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, 32, 0, Math.PI * 2);
      ctx.stroke();

      // Outstretched Lac bird wings
      ctx.beginPath();
      ctx.moveTo(cx - 42, cy - 8);
      ctx.lineTo(cx - 12, cy);
      ctx.lineTo(cx + 12, cy);
      ctx.lineTo(cx + 42, cy - 8);
      ctx.moveTo(cx - 34, cy + 6);
      ctx.lineTo(cx + 34, cy + 6);
      ctx.stroke();
    });
  } else if (patternId === 'pattern_song_nuoc') {
    // Nguyen Dynasty Water Wave (Thủy Ba Sóng Nước)
    ctx.lineWidth = 4.0;
    const r = 42;
    for (let row = -1; row < 10; row++) {
      const cy = row * 56;
      const offsetX = (row & 1) * r;
      for (let col = -1; col < 8; col++) {
        const cx = col * (r * 2) + offsetX;
        for (let ring = 1; ring <= 3; ring++) {
          ctx.beginPath();
          ctx.arc(cx, cy, (r * ring) / 3, Math.PI, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
  } else if (patternId === 'pattern_cuc_day') {
    // Scrolling Chrysanthemum Vine (Hoa Cúc Dây Trường Thọ)
    ctx.lineWidth = 3.6;
    drawSeamlessTile((cx, cy) => {
      // 8-petal chrysanthemum blossom
      for (let p = 0; p < 8; p++) {
        const ang = (p * Math.PI) / 4;
        const px = cx + Math.cos(ang) * 16;
        const py = cy + Math.sin(ang) * 16;
        ctx.beginPath();
        ctx.arc(px, py, 7, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();

      // Connecting vine S-curve
      ctx.beginPath();
      ctx.moveTo(cx + 24, cy);
      ctx.bezierCurveTo(cx + 42, cy - 22, cx + 46, cy + 22, cx + 64, cy);
      ctx.stroke();
    });
  }

  patternMaskCanvasCache.set(patternId, canvas);
  return canvas;
}

export async function loadCustomPatternMaskIntoCache(
  patternId: PatternId,
  dataUrl: string
): Promise<HTMLCanvasElement> {
  const img = await loadImageElement(dataUrl);
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, size, size);
  patternMaskCanvasCache.set(patternId, canvas);
  await savePatternMaskToIndexedDb(patternId, canvas.toDataURL('image/png'));
  recoloredFrameCache.clear();
  garmentBaseFrameCache.clear();
  return canvas;
}

interface CachedGarmentBaseFrame {
  w: number;
  h: number;
  garmentPixels: Uint8ClampedArray;
  headTopY: number;
  craniumTopY: number;
  headMinX: number;
  headMaxX: number;
  headCenterX: number;
  headW: number;
  faceMinY: number;
  faceMaxY: number;
  faceMinX: number;
  faceMaxX: number;
  faceCenterX: number;
  faceW: number;
  faceH: number;
  avgSkinR: number;
  avgSkinG: number;
  avgSkinB: number;
  detectedLeftEyeX: number;
  detectedLeftEyeY: number;
  detectedRightEyeX: number;
  detectedRightEyeY: number;
  detectedMouthX: number;
  detectedMouthY: number;
  bodyCenterX: number;
  footBottomY: number;
  footMinX: number;
  footMaxX: number;
  trouserEndY: number;
  leftLegFootX: number;
  rightLegFootX: number;
}

const garmentBaseFrameCache = new Map<string, CachedGarmentBaseFrame>();
const modelHeadMetricsCache = new Map<
  string,
  {
    craniumTopY: number;
    faceMinY: number;
    faceMaxY: number;
    eyeY: number;
    headW: number;
    faceW: number;
  }
>();

/**
 * Instant (< 35 ms) offscreen canvas Hue-Key + Trouser Key + Pattern Multiplication
 * + 3D PBR Cloth Fold Normal & Micro-Weave Sheen Shading for a single 360° turntable frame.
 */
export async function renderRecoloredTurntableFrame(params: {
  modelId: string;
  frameIndex: number;
  frameSrc: string;
  calibratedBaseHue: number;
  aoHex: string;
  quanHex: string;
  bottomId?: string;
  accessories?: string[];
  enableTrouserKey: boolean;
  patternId: PatternId;
  hoaTietHex: string;
  patternConfig: PatternTransformConfig;
  fabricMaterialId?: FabricMaterialId;
  lightAngleMode?: 'studio' | 'grazing' | 'rim';
  hairStyle?: HairStyleId;
  hairColorHex?: string;
  expression?: ExpressionId;
  necklineCut?: NecklineCutId;
  hemLengthCut?: HemLengthCutId;
}): Promise<string> {
  const {
    modelId,
    frameIndex,
    frameSrc,
    calibratedBaseHue,
    aoHex,
    quanHex,
    bottomId = 'quan-lua-trang',
    accessories = [],
    enableTrouserKey,
    patternId,
    hoaTietHex,
    patternConfig,
    fabricMaterialId = 'lua-ha-dong',
    lightAngleMode = 'studio',
    hairStyle = 'bui-truyen-thong',
    hairColorHex = '#181513',
    expression = 'trang-nghiem',
    necklineCut = 'co-truyen-thong',
    hemLengthCut = 'ta-dai-chuan',
  } = params;

  const accessoriesKey = [...accessories].sort().join(',');
  const garmentCacheKey = `v46_garment|${modelId}|${frameIndex}|${aoHex}|${quanHex}|${bottomId}|${hemLengthCut}|${
    enableTrouserKey ? 1 : 0
  }|${patternId}|${hoaTietHex}|${patternConfig.scale.toFixed(
    2
  )}|${patternConfig.rotationDeg.toFixed(0)}|${patternConfig.strength.toFixed(
    2
  )}|${fabricMaterialId}|${lightAngleMode}`;
  const cacheKey = `${garmentCacheKey}|${accessoriesKey}`;

  if (recoloredFrameCache.has(cacheKey)) {
    return recoloredFrameCache.get(cacheKey)!;
  }

  const gender: 'male' | 'female' = modelId.endsWith('-male')
    ? 'male'
    : 'female';

  let cachedGarment = garmentBaseFrameCache.get(garmentCacheKey);

  if (!cachedGarment) {
    const isHipLengthTop =
      modelId.startsWith('au-phuc') || modelId.startsWith('ao-ba-ba');
    const isCeremonialRobe =
      modelId.startsWith('ao-nhat-binh') ||
      modelId.startsWith('ao-tac') ||
      modelId.startsWith('ao-vien-linh') ||
      modelId.startsWith('ao-tu-than') ||
      modelId.startsWith('ao-giao-linh');
    const isSkirtBaseCostume =
      gender === 'female' &&
      (modelId.startsWith('ao-nhat-binh') ||
        modelId.startsWith('ao-tu-than') ||
        modelId.startsWith('ao-giao-linh') ||
        modelId.startsWith('ao-vien-linh'));
    const isShortBottom =
      bottomId === 'quan-short-jeans-cat-ngan' ||
      bottomId === 'chan-vay-ngan-miniskirt';
    const hasPhotoLowerSilhouette =
      bottomId === 'quan-short-jeans-cat-ngan' ||
      (gender === 'female' &&
        (bottomId === 'thuong-lua-xep-ly' ||
          bottomId === 'chan-vay-ngan-miniskirt'));
    let photographedBottomUnderlay: CachedBottomFramePixels | null = null;
    let photographedLegUnderlay: CachedBottomFramePixels | null = null;
    if (hasPhotoLowerSilhouette) {
      const sourceBottomId =
        bottomId === 'chan-vay-ngan-miniskirt' ? 'thuong-lua-xep-ly' : bottomId;
      photographedBottomUnderlay = await getBottomFramePixels(
        sourceBottomId,
        gender,
        frameIndex
      );
    }
    if (isShortBottom) {
      photographedLegUnderlay =
        bottomId === 'quan-short-jeans-cat-ngan'
          ? photographedBottomUnderlay
          : await getBottomFramePixels(
              'quan-short-jeans-cat-ngan',
              gender,
              frameIndex
            );
    }
    const isModernTrouserBottom =
      bottomId === 'quan-jeans-ong-suong' ||
      bottomId === 'quan-kaki-ong-rong';

    const anatomyKey = `v39_anat|${modelId}|${frameIndex}`;
    let baseAnatomy = baseFrameAnatomyCache.get(anatomyKey);

    if (!baseAnatomy) {
      const rawCanvas = getCachedRecoloredCanvas(frameSrc);
      let w = 768;
      let h = 1152;
      let origData: Uint8ClampedArray;
      if (rawCanvas) {
        w = rawCanvas.width || 768;
        h = rawCanvas.height || 1152;
        origData = new Uint8ClampedArray(
          rawCanvas.getContext('2d')!.getImageData(0, 0, w, h).data
        );
      } else {
        const img = await loadImageElement(frameSrc);
        w = img.naturalWidth || 768;
        h = img.naturalHeight || 1152;
        const tmpC = document.createElement('canvas');
        tmpC.width = w;
        tmpC.height = h;
        const tmpCtx = tmpC.getContext('2d')!;
        tmpCtx.drawImage(img, 0, 0, w, h);
        origData = new Uint8ClampedArray(tmpCtx.getImageData(0, 0, w, h).data);
      }

      const scanHipY = Math.min(h - 1, Math.floor(h * 0.56));
      let topWaistMinX = w;
      let topWaistMaxX = 0;
      const scanWOff = scanHipY * w * 4;
      for (let x = 80; x < w - 80; x++) {
        if (origData[scanWOff + x * 4 + 3] > 80) {
          if (x < topWaistMinX) topWaistMinX = x;
          if (x > topWaistMaxX) topWaistMaxX = x;
        }
      }
      const computedBodyCenterX =
        topWaistMaxX > topWaistMinX
          ? (topWaistMinX + topWaistMaxX) * 0.5
          : w * 0.5;

      // 1. Row-Wise Chromatic Tunic vs. White Lower-Garment Density Scan (y = 540 .. scanEndY)
      //    Finds the true natural bottom hemline (`trueTunicBottomY`) of the costume's tunic (`Áo`)
      //    by requiring `rowTunicCount[y] >= 24 && rowTunicCount[y] > rowWhiteCount[y]` so thin side ribbons
      //    or shaded trouser folds below the tunic hem NEVER push the tunic hemline down to the ankles!
      const isTuThanDarkSkirtBase = modelId === 'ao-tu-than-kinh-bac-female';
      const scanEndY = isHipLengthTop
        ? 710
        : isTuThanDarkSkirtBase
        ? 852
        : 965;
      const rowTunicCount = new Uint16Array(h);
      const rowWhiteCount = new Uint16Array(h);
      for (let y = 540; y <= Math.min(h - 20, scanEndY); y++) {
        const rOff = y * w * 4;
        const xMin = Math.max(60, Math.round(computedBodyCenterX - 96));
        const xMax = Math.min(w - 61, Math.round(computedBodyCenterX + 96));
        let cnt = 0;
        let wCnt = 0;
        for (let x = xMin; x <= xMax; x++) {
          const idx = rOff + x * 4;
          if (origData[idx + 3] < 90) continue;
          const pr = origData[idx] / 255;
          const pg = origData[idx + 1] / 255;
          const pb = origData[idx + 2] / 255;
          const phsv = rgbToHsv(pr, pg, pb);
          let hDiff = Math.abs(phsv.h - calibratedBaseHue);
          if (hDiff > 0.5) hDiff = 1.0 - hDiff;
          if (phsv.v >= 0.55 && phsv.s <= 0.24) {
            wCnt++;
          } else if (
            hDiff <= 48 / 360 &&
            phsv.s >= 0.16 &&
            !(phsv.v > 0.78 && phsv.s < 0.25)
          ) {
            cnt++;
          }
        }
        rowTunicCount[y] = cnt;
        rowWhiteCount[y] = wCnt;
      }

      let trueTunicBottomY = isHipLengthTop
        ? 662
        : isCeremonialRobe
        ? 856
        : 824;
      for (let y = Math.min(h - 20, scanEndY); y >= 575; y--) {
        const yPrev = Math.max(540, y - 4);
        if (
          rowTunicCount[y] >= 24 &&
          rowTunicCount[y] > rowWhiteCount[y] &&
          rowTunicCount[yPrev] >= 24 &&
          rowTunicCount[yPrev] > rowWhiteCount[yPrev]
        ) {
          trueTunicBottomY = y;
          break;
        }
      }

      // 2. Narrow-Window Bottom Hemline Contour Extraction around `trueTunicBottomY`
      //    Guarantees `rawNaturalHemY[x]` stays strictly within `[trueTunicBottomY - 22, trueTunicBottomY + 10]`
      //    so zero diagonal wedges, vertical bars, or horizontal steps can ever be cut into the Áo!
      const rawNaturalHemY = new Int16Array(w);
      const winTopY = Math.max(560, trueTunicBottomY - 24);
      const winBotY = Math.min(h - 20, trueTunicBottomY + 10);
      for (let x = 0; x < w; x++) {
        const dxNorm = (x - computedBodyCenterX) / 92;
        const defaultCurveY =
          trueTunicBottomY - Math.round(Math.min(12, dxNorm * dxNorm * 8));
        if (x < 60 || x >= w - 60) {
          rawNaturalHemY[x] = defaultCurveY;
          continue;
        }
        let detectedBottomY = -1;
        for (let y = winBotY; y >= winTopY; y--) {
          const idx = (y * w + x) * 4;
          if (origData[idx + 3] < 90) continue;
          const pr = origData[idx] / 255;
          const pg = origData[idx + 1] / 255;
          const pb = origData[idx + 2] / 255;
          const phsv = rgbToHsv(pr, pg, pb);
          let hDiff = Math.abs(phsv.h - calibratedBaseHue);
          if (hDiff > 0.5) hDiff = 1.0 - hDiff;
          const isWarmSkin =
            pr > pg + 0.03 &&
            pg > pb + 0.015 &&
            pr - pb > 0.085 &&
            pb < 0.82 &&
            phsv.h < 0.11;
          if (
            !isWarmSkin &&
            hDiff <= 48 / 360 &&
            phsv.s >= 0.16 &&
            !(phsv.v > 0.78 && phsv.s < 0.25)
          ) {
            detectedBottomY = y;
            break;
          }
        }
        rawNaturalHemY[x] =
          detectedBottomY > 0 ? detectedBottomY + 1 : defaultCurveY;
      }

      const computedSmoothedHemY = new Int16Array(w);
      for (let x = 0; x < w; x++) {
        let sum = 0;
        let cnt = 0;
        for (let k = Math.max(0, x - 15); k <= Math.min(w - 1, x + 15); k++) {
          sum += rawNaturalHemY[k];
          cnt++;
        }
        computedSmoothedHemY[x] =
          cnt > 0 ? Math.round(sum / cnt) : trueTunicBottomY;
      }

      baseAnatomy = {
        w,
        h,
        origData,
        bodyCenterX: computedBodyCenterX,
        smoothedNaturalHemY: computedSmoothedHemY,
      };
      baseFrameAnatomyCache.set(anatomyKey, baseAnatomy);
    }

    const { w, h, origData, bodyCenterX, smoothedNaturalHemY } = baseAnatomy;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;
    data.set(origData);

    // Real-World Anatomical Tunic Hemline Profile (`getTunicHemLimitY`):
    // Preserves 100% of the authentic tunic (`Áo`) length and silhouette across all bottom styles,
    // while on Áo Dài (`ao-dai-truyen-thong`) with side slits (`xẻ tà`), the central front/back tà áo
    // (`|x - bodyCenterX| <= 42`) hangs full length while the outer thigh side-slits open naturally!
    const isAoDaiSplitTunic = modelId.startsWith('ao-dai-truyen-thong');
    const getTunicHemLimitY = (x: number): number => {
      let natY = smoothedNaturalHemY[x];
      const absDx = Math.abs(x - bodyCenterX);
      if (isCeremonialRobe && absDx > 68 && !isShortBottom) {
        natY = Math.max(natY, 825);
      }
      if (isAoDaiSplitTunic && isShortBottom && absDx > 40) {
        // On Áo Dài worn with Quần Short Jeans / Miniskirt, the central front/back tà áo (|dx| <= 40)
        // hangs down to its full length, while the high side slits (|dx| > 40) open up along the outer thigh!
        const slitT = Math.min(1.0, (absDx - 40) / 18);
        natY = Math.round(natY * (1.0 - slitT) + 736 * slitT);
      }
      if (hemLengthCut === 'crop-top-pha-cach') {
        return Math.min(natY, 585);
      }
      if (hemLengthCut === 'ta-lung-ngang-dui') {
        return Math.min(natY, 745);
      }
      if (hemLengthCut === 'dam-ngan-tren-goi') {
        return Math.min(natY, 815);
      }
      return natY;
    };

    // Never paste foreign character turnaround sheets or stretch horizontal bars across the legs/shoes:
    // Using the character's own 100% intact, sharp 360° lower-body & footwear pixels guarantees zero leg-jump,
    // zero horizontal pixel smearing across the gap between legs/shoes, and 100% lifelike clarity.
    const has360BottomSheet = false;
    void has360BottomSheet;

  const targetAoHsv = hexToHsvNormalized(aoHex);
  const targetQuanHsv = hexToHsvNormalized(quanHex);
  const motifRgb = hexToRgbNormalized(hoaTietHex);
  const fabricSpec = getFabricMaterialSpec(fabricMaterialId);

  const hueTol = 56 / 360; // 56 degrees circular tolerance (captures 100% of tunic fabric & deep fold gradients)
  const minSat = 0.09;     // saturation >= 0.09 so low-saturation fold shadows & highlights recolor cleanly without remnants

  // Studio directional key & rim light vectors for 3D relief shading
  let keyLx = 0.45;
  let keyLy = -0.48;
  let keyLz = 0.75;
  let rimStrength = 0.16;
  if (lightAngleMode === 'grazing') {
    keyLx = 0.82;
    keyLy = -0.28;
    keyLz = 0.5;
    rimStrength = 0.22;
  } else if (lightAngleMode === 'rim') {
    keyLx = -0.52;
    keyLy = -0.42;
    keyLz = 0.74;
    rimStrength = 0.32;
  }

  // Precompute luminance field for 3D cloth fold normal extraction (dV/dx, dV/dy)
  const lumField = new Float32Array(w * h);
  for (let p = 0; p < w * h; p++) {
    const i4 = p * 4;
    lumField[p] =
      (data[i4] * 0.299 + data[i4 + 1] * 0.587 + data[i4 + 2] * 0.114) / 255;
  }

  // Prepare pattern mask buffer if patternId !== 'none'
  let patData: Uint8ClampedArray | null = null;
  let patSize = 512;
  const cosA = Math.cos((patternConfig.rotationDeg * Math.PI) / 180);
  const sinA = Math.sin((patternConfig.rotationDeg * Math.PI) / 180);
  const invScale = 1 / Math.max(0.25, patternConfig.scale);
  const patStrength = patternConfig.strength;

  if (patternId !== 'none' && patStrength > 0.01) {
    const pCanvas = getOrCreateProceduralPatternMaskCanvas(patternId);
    patSize = pCanvas.width;
    patData = pCanvas.getContext('2d')!.getImageData(0, 0, patSize, patSize).data;
  }

  const patMask = patSize - 1;
  const trouserStartY = Math.floor(h * 0.5);
  const weaveNormalStrength = fabricSpec.normalStrength * 0.014;
  const foldReliefStrength = 2.6 * (0.85 + fabricSpec.normalMapConfig.microFoldDepth * 0.4);

  // Detect head & Face Skin Oval independently of hair bun height so eyes, lips, hair, and accessories align 100% accurately!
  let headTopY = 98;
  for (let y = 30; y < 260; y++) {
    let rowCount = 0;
    const rOff = y * w * 4;
    for (let x = 240; x < w - 240; x++) {
      if (data[rOff + x * 4 + 3] > 120) rowCount++;
    }
    if (rowCount >= 8) {
      headTopY = y;
      break;
    }
  }

  // Scan up to headTopY + 190 so even tall royal hair buns (on Áo Nhật Bình / Áo Tấc) include the full forehead & chin!
  const craniumBottomY = Math.min(h - 1, headTopY + 118);
  const faceScanBottomY = Math.min(h - 1, headTopY + 190);
  let headMinX = w - 1;
  let headMaxX = 0;
  let skinSumR = 0;
  let skinSumG = 0;
  let skinSumB = 0;
  let skinCount = 0;

  // Per-row facial skin pixel counts to isolate the true Face Skin Oval (forehead hairline -> chin)
  const skinRowCount = new Uint16Array(h);
  const skinRowMinX = new Int16Array(h).fill(w);
  const skinRowMaxX = new Int16Array(h).fill(0);

  for (let y = headTopY; y <= faceScanBottomY; y++) {
    const rOff = y * w * 4;
    for (let x = 250; x < w - 250; x++) {
      const idx = rOff + x * 4;
      if (data[idx + 3] < 120) continue;
      if (y >= headTopY + 14 && y <= craniumBottomY) {
        if (x < headMinX) headMinX = x;
        if (x > headMaxX) headMaxX = x;
      }
      const pr = data[idx];
      const pg = data[idx + 1];
      const pb = data[idx + 2];
      const phsv = rgbToHsv(pr / 255, pg / 255, pb / 255);
      let hDiffBase = Math.abs(phsv.h - calibratedBaseHue);
      if (hDiffBase > 0.5) hDiffBase = 1.0 - hDiffBase;
      const isBaseGarmentPixel = hDiffBase <= 34 / 360 && phsv.s >= 0.26;
      // Warm human facial skin detection (excluding warm-colored garment fabric)
      if (
        !isBaseGarmentPixel &&
        y >= headTopY + 16 &&
        pr > pg + 8 &&
        pg > pb + 4 &&
        pr > 116 &&
        pr - pb > 20 &&
        phsv.h >= 0.012 &&
        phsv.h <= 0.108 &&
        phsv.s >= 0.12 &&
        phsv.s <= 0.62 &&
        Math.abs(x - w * 0.5) < 68
      ) {
        skinRowCount[y]++;
        if (x < skinRowMinX[y]) skinRowMinX[y] = x;
        if (x > skinRowMaxX[y]) skinRowMaxX[y] = x;
        skinSumR += pr;
        skinSumG += pg;
        skinSumB += pb;
        skinCount++;
      }
    }
  }

  // Find forehead hairline (rawFaceMinY) across both standard hairstyles (+34..+46) and tall royal hair buns (+50..+72)
  const minSkinRowThreshold = frameIndex === 0 ? 12 : 6;
  let rawFaceMinY = headTopY + (gender === 'female' ? 52 : 40);
  for (let y = headTopY + 26; y <= headTopY + 78; y++) {
    if (
      skinRowCount[y] >= minSkinRowThreshold &&
      skinRowCount[y + 3] >= minSkinRowThreshold + 2
    ) {
      rawFaceMinY = y;
      break;
    }
  }

  let detectedFaceMinY = Math.max(
    headTopY + 28,
    Math.min(headTopY + 74, rawFaceMinY)
  );

  // In a normalized 996px standing figure, the anatomical face height from forehead hairline to chin tip is 78..86px
  let rawFaceMaxY = detectedFaceMinY + 82;
  for (
    let y = detectedFaceMinY + 72;
    y <= Math.min(faceScanBottomY, detectedFaceMinY + 88);
    y++
  ) {
    if (skinRowCount[y] >= 6) {
      rawFaceMaxY = y;
    }
  }
  let detectedFaceMaxY = Math.max(
    detectedFaceMinY + 76,
    Math.min(detectedFaceMinY + 86, rawFaceMaxY)
  );

  let faceMinX = w - 1;
  let faceMaxX = 0;
  const cheekBandY0 = Math.round(detectedFaceMinY + 18);
  const cheekBandY1 = Math.round(detectedFaceMinY + 58);
  for (let y = cheekBandY0; y <= cheekBandY1; y++) {
    if (skinRowMinX[y] < faceMinX) faceMinX = skinRowMinX[y];
    if (skinRowMaxX[y] > faceMaxX) faceMaxX = skinRowMaxX[y];
  }

  if (headMaxX <= headMinX) {
    headMinX = Math.floor(w * 0.44);
    headMaxX = Math.floor(w * 0.56);
  }
  if (faceMaxX <= faceMinX) {
    faceMinX = Math.round(w * 0.5 - 32);
    faceMaxX = Math.round(w * 0.5 + 32);
  }
  const avgSkinR = skinCount > 20 ? Math.round(skinSumR / skinCount) : 226;
  const avgSkinG = skinCount > 20 ? Math.round(skinSumG / skinCount) : 186;
  const avgSkinB = skinCount > 20 ? Math.round(skinSumB / skinCount) : 162;

  const headCenterX = Math.max(
    w * 0.5 - 18,
    Math.min(w * 0.5 + 18, (headMinX + headMaxX) * 0.5)
  );
  let headW = Math.max(76, Math.min(96, headMaxX - headMinX));
  const faceCenterX = Math.max(
    w * 0.5 - 16,
    Math.min(w * 0.5 + 16, (faceMinX + faceMaxX) * 0.5)
  );
  let faceW = Math.max(60, Math.min(76, faceMaxX - faceMinX));

  // Detect exact pupil/eyelash landmarks strictly inside the true eye band (detectedFaceMinY + 28 .. detectedFaceMinY + 40)
  let detectedLeftEyeX = faceCenterX - faceW * 0.22;
  let detectedLeftEyeY = detectedFaceMinY + 34;
  let detectedRightEyeX = faceCenterX + faceW * 0.22;
  let detectedRightEyeY = detectedFaceMinY + 34;
  let detectedMouthX = faceCenterX;
  let detectedMouthY = detectedFaceMinY + 62;

  if (frameIndex === 0) {
    const eyeBandY0 = Math.round(detectedFaceMinY + 27);
    const eyeBandY1 = Math.round(detectedFaceMinY + 41);
    const lEyeX0 = Math.round(faceCenterX - faceW * 0.32);
    const lEyeX1 = Math.round(faceCenterX - faceW * 0.11);
    const rEyeX0 = Math.round(faceCenterX + faceW * 0.11);
    const rEyeX1 = Math.round(faceCenterX + faceW * 0.32);

    let lSumX = 0;
    let lSumY = 0;
    let lWeight = 0;
    let rSumX = 0;
    let rSumY = 0;
    let rWeight = 0;

    for (let y = eyeBandY0; y <= eyeBandY1; y++) {
      const rPix = y * w;
      for (let x = lEyeX0; x <= lEyeX1; x++) {
        const lum = lumField[rPix + x];
        if (lum < 0.42) {
          const wt = Math.pow(0.45 - lum, 2);
          lSumX += x * wt;
          lSumY += y * wt;
          lWeight += wt;
        }
      }
      for (let x = rEyeX0; x <= rEyeX1; x++) {
        const lum = lumField[rPix + x];
        if (lum < 0.42) {
          const wt = Math.pow(0.45 - lum, 2);
          rSumX += x * wt;
          rSumY += y * wt;
          rWeight += wt;
        }
      }
    }
    if (lWeight > 0.04 && rWeight > 0.04) {
      detectedLeftEyeX = lSumX / lWeight;
      detectedRightEyeX = rSumX / rWeight;
      const avgEyeY = Math.max(
        detectedFaceMinY + 29,
        Math.min(detectedFaceMinY + 39, (lSumY / lWeight + rSumY / rWeight) * 0.5)
      );
      detectedLeftEyeY = avgEyeY;
      detectedRightEyeY = avgEyeY;
    }

    // Cache front-view head/face vertical metrics so 90°, 180°, 270° views stay locked at the exact same height!
    modelHeadMetricsCache.set(modelId, {
      craniumTopY: Math.max(headTopY, detectedFaceMinY - 38),
      faceMinY: detectedFaceMinY,
      faceMaxY: detectedFaceMaxY,
      eyeY: detectedLeftEyeY,
      headW,
      faceW,
    });
  } else {
    const frontMetrics = modelHeadMetricsCache.get(modelId);
    if (frontMetrics) {
      detectedFaceMinY = frontMetrics.faceMinY;
      detectedFaceMaxY = frontMetrics.faceMaxY;
      detectedLeftEyeY = frontMetrics.eyeY;
      detectedRightEyeY = frontMetrics.eyeY;
      headW = frontMetrics.headW;
      faceW = frontMetrics.faceW;
    }
  }

  const faceMinY = detectedFaceMinY;
  const faceMaxY = detectedFaceMaxY;
  const faceH = faceMaxY - faceMinY;
  const craniumTopY = Math.max(headTopY, faceMinY - 38);

  // Save exact detected face box for the "Cận Cảnh Diện Mạo" live portrait loupe in VietPhucCanvas
  detectedFaceBoxCache.set(`${modelId}|${frameIndex}`, {
    cx: faceCenterX,
    cy: (craniumTopY + faceMaxY) * 0.5,
    size: Math.max(156, (faceMaxY - craniumTopY) * 1.48),
  });

  // Pre-scan lower-body horizontal span per row (y: 560..1096) and detect exact left & right foot centroids
  const rowMinX = new Int16Array(h).fill(w);
  const rowMaxX = new Int16Array(h).fill(0);
  let footMinX = w - 1;
  let footMaxX = 0;
  let footBottomY = 1084;
  let leftFootSumX = 0;
  let leftFootCount = 0;
  let rightFootSumX = 0;
  let rightFootCount = 0;
  for (let y = Math.floor(h * 0.48); y < h - 4; y++) {
    const rOff = y * w * 4;
    for (let x = 120; x < w - 120; x++) {
      if (data[rOff + x * 4 + 3] > 110) {
        if (x < rowMinX[y]) rowMinX[y] = x;
        if (x > rowMaxX[y]) rowMaxX[y] = x;
        if (y >= 1020 && y <= 1098) {
          if (x < footMinX) footMinX = x;
          if (x > footMaxX) footMaxX = x;
          if (y > footBottomY) footBottomY = y;
          if (y >= 1042) {
            if (x < bodyCenterX) {
              leftFootSumX += x;
              leftFootCount++;
            } else {
              rightFootSumX += x;
              rightFootCount++;
            }
          }
        }
      }
    }
  }
  if (footMaxX <= footMinX) {
    footMinX = Math.round(headCenterX - 56);
    footMaxX = Math.round(headCenterX + 56);
  }
  const footCenterMidX = (footMinX + footMaxX) * 0.5;
  let splitLeftSumX = 0;
  let splitLeftCount = 0;
  let splitRightSumX = 0;
  let splitRightCount = 0;
  for (let y = Math.max(1034, footBottomY - 46); y <= Math.min(h - 2, footBottomY); y++) {
    const rOff = y * w * 4;
    for (let x = footMinX; x <= footMaxX; x++) {
      if (data[rOff + x * 4 + 3] > 110) {
        if (x <= footCenterMidX) {
          splitLeftSumX += x;
          splitLeftCount++;
        } else {
          splitRightSumX += x;
          splitRightCount++;
        }
      }
    }
  }
  const leftLegFootX =
    splitLeftCount > 12
      ? Math.round(splitLeftSumX / splitLeftCount)
      : leftFootCount > 18
      ? Math.round(leftFootSumX / leftFootCount)
      : Math.round(footCenterMidX - 34);
  const rightLegFootX =
    splitRightCount > 12
      ? Math.round(splitRightSumX / splitRightCount)
      : rightFootCount > 18
      ? Math.round(rightFootSumX / rightFootCount)
      : Math.round(footCenterMidX + 34);

  // Measure reference upper-garment brightness (refTunicV) at y = 270..620 so recoloring from a dark base tunic
  // to bright colors like Trắng Ngà (#F5F1E8) or Vàng Lụa (#D4AF37) reaches 100% true-to-swatch brightness!
  let tunicVSum = 0;
  let tunicVMax = 0.35;
  let tunicVCount = 0;
  for (let y = 270; y <= 620; y += 3) {
    const rOff = y * w * 4;
    for (let x = 210; x < w - 210; x += 3) {
      if (data[rOff + x * 4 + 3] > 180) {
        const pr = data[rOff + x * 4] / 255;
        const pg = data[rOff + x * 4 + 1] / 255;
        const pb = data[rOff + x * 4 + 2] / 255;
        const phsv = rgbToHsv(pr, pg, pb);
        let hDiff = Math.abs(phsv.h - calibratedBaseHue);
        if (hDiff > 0.5) hDiff = 1.0 - hDiff;
        const isWarm =
          pr > pg + 0.03 && pg > pb + 0.015 && pr - pb > 0.085 && pb < 0.82 && phsv.h < 0.11;
        if (!isWarm && hDiff <= hueTol && phsv.s >= minSat) {
          tunicVSum += phsv.v;
          if (phsv.v > tunicVMax) tunicVMax = phsv.v;
          tunicVCount++;
        }
      }
    }
  }
  const avgTunicV = tunicVCount > 16 ? tunicVSum / tunicVCount : 0.44;
  // Reference lit fabric surface brightness (blending mean and upper highlight envelope)
  const refTunicV = Math.max(
    0.24,
    Math.min(0.88, avgTunicV * 0.72 + tunicVMax * 0.28)
  );
  const isLightAoTarget = targetAoHsv.v >= 0.78 && targetAoHsv.s <= 0.28;
  const isLightQuanTarget = targetQuanHsv.v >= 0.78 && targetQuanHsv.s <= 0.28;

  // Measure reference lower-garment brightness (refTrouserV) at y = 900..985 (or y = 695..745 for short bottoms)
  // so our S-curve contrast-expanded intrinsic shading preserves 100% of the real photographic 3D folds!
  let trouserVSum = 0;
  let trouserVMax = 0.65;
  let trouserVCount = 0;
  const sampleY0 = isShortBottom ? 690 : 900;
  const sampleY1 = isShortBottom ? 748 : 985;
  for (let y = sampleY0; y <= sampleY1; y += 2) {
    const rPix = y * w;
    const rOff = rPix * 4;
    for (let x = 220; x < w - 220; x += 2) {
      if (data[rOff + x * 4 + 3] > 180) {
        const lv = lumField[rPix + x];
        if (lv >= 0.35) {
          trouserVSum += lv;
          if (lv > trouserVMax) trouserVMax = lv;
          trouserVCount++;
        }
      }
    }
  }
  const avgTrouserV = trouserVCount > 16 ? trouserVSum / trouserVCount : 0.82;
  const refTrouserV = Math.max(
    0.24,
    Math.min(0.92, avgTrouserV * 0.74 + trouserVMax * 0.26)
  );

  const refTrouserY = Math.min(h - 20, 955);
  const trueTrouserMinX =
    rowMinX[refTrouserY] < w ? rowMinX[refTrouserY] : Math.round(bodyCenterX - 74);
  const trueTrouserMaxX =
    rowMaxX[refTrouserY] > 0 ? rowMaxX[refTrouserY] : Math.round(bodyCenterX + 74);
  const trueTrouserCenter = (trueTrouserMinX + trueTrouserMaxX) * 0.5;
  const trueTrouserHalfW = Math.max(48, (trueTrouserMaxX - trueTrouserMinX) * 0.5);
  const isSideView = frameIndex === 1 || frameIndex === 3;
  const isTwoLegTrouserBottom =
    bottomId === 'quan-lua-trang' ||
    bottomId === 'quan-linh-den' ||
    bottomId === 'quan-jeans-ong-suong' ||
    bottomId === 'quan-kaki-ong-rong';

  // Precompute smoothed per-row Tunic Panel horizontal bounds (`tunicPanelMinX[y] .. tunicPanelMaxX[y]`) for y = 520..940
  // so the boundary between the upper tà áo (Áo) and the side/lower trousers (Quần) is a 100% smooth geometric contour
  // with ZERO stray pixels or noise speckles inside either garment!
  const rawTunicMinX = new Int16Array(h).fill(w);
  const rawTunicMaxX = new Int16Array(h).fill(0);
  for (let y = 520; y <= Math.min(h - 2, 940); y++) {
    const rOff = y * w * 4;
    const scanHalf = isCeremonialRobe ? 135 : 96;
    const x0 = Math.max(60, Math.round(bodyCenterX - scanHalf));
    const x1 = Math.min(w - 61, Math.round(bodyCenterX + scanHalf));
    for (let x = x0; x <= x1; x++) {
      const idx = rOff + x * 4;
      if (data[idx + 3] < 90) continue;
      const pr = data[idx] / 255;
      const pg = data[idx + 1] / 255;
      const pb = data[idx + 2] / 255;
      const phsv = rgbToHsv(pr, pg, pb);
      let hDiff = Math.abs(phsv.h - calibratedBaseHue);
      if (hDiff > 0.5) hDiff = 1.0 - hDiff;
      const isWarm =
        pr > pg + 0.03 && pg > pb + 0.015 && pr - pb > 0.085 && pb < 0.82 && phsv.h < 0.11;
      if (
        !isWarm &&
        hDiff <= 50 / 360 &&
        phsv.s >= 0.16 &&
        !(phsv.v > 0.78 && phsv.s < 0.25)
      ) {
        if (x < rawTunicMinX[y]) rawTunicMinX[y] = x;
        if (x > rawTunicMaxX[y]) rawTunicMaxX[y] = x;
      }
    }
  }
  const tunicPanelMinX = new Int16Array(h).fill(w);
  const tunicPanelMaxX = new Int16Array(h).fill(0);
  for (let y = 520; y <= Math.min(h - 2, 940); y++) {
    let sumMin = 0;
    let sumMax = 0;
    let cnt = 0;
    for (let ky = Math.max(520, y - 9); ky <= Math.min(940, y + 9); ky++) {
      if (rawTunicMaxX[ky] > rawTunicMinX[ky]) {
        sumMin += rawTunicMinX[ky];
        sumMax += rawTunicMaxX[ky];
        cnt++;
      }
    }
    if (cnt > 0) {
      tunicPanelMinX[y] = Math.round(sumMin / cnt);
      tunicPanelMaxX[y] = Math.round(sumMax / cnt);
    }
  }

  // Precompute vertically smoothed lower-body trouser/skirt outer contour (`smoothLegMinX[y] .. smoothLegMaxX[y]`)
  // and clean outer 2px chroma-key border noise, plus bridge inter-leg gap when `thuong-lua-xep-ly` (Pleated Skirt) is chosen!
  const smoothLegMinX = new Int16Array(h).fill(w);
  const smoothLegMaxX = new Int16Array(h).fill(0);
  for (let y = Math.floor(h * 0.48); y < h - 4; y++) {
    let sMin = 0;
    let sMax = 0;
    let c = 0;
    for (let ky = Math.max(Math.floor(h * 0.48), y - 7); ky <= Math.min(h - 5, y + 7); ky++) {
      if (rowMaxX[ky] > rowMinX[ky]) {
        sMin += rowMinX[ky];
        sMax += rowMaxX[ky];
        c++;
      }
    }
    if (c > 0) {
      smoothLegMinX[y] = Math.round(sMin / c);
      smoothLegMaxX[y] = Math.round(sMax / c);
    } else {
      smoothLegMinX[y] = rowMinX[y];
      smoothLegMaxX[y] = rowMaxX[y];
    }
  }

  const centerTunicHemY = getTunicHemLimitY(Math.round(bodyCenterX));
  void centerTunicHemY;
  const tunicPaintedMask = new Uint8Array(w * h);

  for (let y = 1; y < h - 1; y++) {
    const rowOffset = y * w * 4;
    const rowPix = y * w;
    // Extend lower-body replacement all the way to y = 1094 (feet baseline is 1096)
    // so the original white silk trousers of Áo Dài NEVER peek out at the ankles below Jeans or Kaki!
    const isLowerBody = y >= trouserStartY && y <= 1094;

    for (let x = 1; x < w - 1; x++) {
      const p = rowPix + x;
      const idx = rowOffset + x * 4;
      let a = data[idx + 3];
      const colTunicHemY = getTunicHemLimitY(x);

      // Bridge transparent inter-leg gap when a 1-piece Pleated Skirt (`thuong-lua-xep-ly` or `chan-vay-ngan-miniskirt`)
      // is selected on a 2-leg trouser base costume so the two trouser legs merge into a real continuous skirt!
      const isPleatedSkirtFillZone =
        enableTrouserKey &&
        ((bottomId === 'thuong-lua-xep-ly' &&
          y > colTunicHemY &&
          y <= footBottomY - 46) ||
          (bottomId === 'chan-vay-ngan-miniskirt' &&
            y > colTunicHemY &&
            y <= 738)) &&
        smoothLegMaxX[y] > smoothLegMinX[y] &&
        x >= smoothLegMinX[y] + 4 &&
        x <= smoothLegMaxX[y] - 4;

      if (a < 32 && !isPleatedSkirtFillZone) continue;
      if (a < 32 && isPleatedSkirtFillZone) {
        a = 255;
        data[idx + 3] = 255;
        const synthV = Math.round(refTrouserV * 242);
        data[idx] = synthV;
        data[idx + 1] = Math.round(synthV * 0.98);
        data[idx + 2] = Math.round(synthV * 0.94);
        lumField[p] = refTrouserV * 0.96;
      }

      const r = data[idx] / 255;
      const g = data[idx + 1] / 255;
      const b = data[idx + 2] / 255;
      const hsv = rgbToHsv(r, g, b);
      const origV = hsv.v;

      let hueDiff = Math.abs(hsv.h - calibratedBaseHue);
      if (hueDiff > 0.5) hueDiff = 1.0 - hueDiff;
      // Anatomically scoped warm skin detection (strictly restricted to head/neck y <= faceMaxY + 48
      // and outer hand/wrist zones y = 475..745 outside the torso core, with true skin saturation >= 0.18)
      // so warm studio-lit ivory/cream silk trousers (y >= 680) are NEVER misclassified as skin!
      const isHeadOrNeckSkinZone =
        y <= faceMaxY + 48 && Math.abs(x - headCenterX) <= headW * 0.78;
      const isOuterHandSkinZone =
        y >= 475 && y <= 745 && Math.abs(x - bodyCenterX) > 64;
      const isWarmSkinPixel =
        (isHeadOrNeckSkinZone &&
          r > g + 0.026 &&
          g > b + 0.012 &&
          r - b > 0.078 &&
          b < 0.84 &&
          hsv.h < 0.115) ||
        (isOuterHandSkinZone &&
          r > g + 0.022 &&
          g > b + 0.01 &&
          r - b > 0.095 &&
          b < 0.78 &&
          hsv.s >= 0.18 &&
          hsv.h < 0.125);

      // Protect arms, hands, and wide ceremonial sleeves (Áo Nhật Bình / Áo Tấc hang down to y ~ 820 outside the hips;
      // on fitted tunics like Áo Ngũ Thân / Áo Dài, sleeves/hands are strictly outside |x - bodyCenterX| > 98 above y = 660)
      const isOutsideSleeveGuard = isCeremonialRobe
        ? y < 820 && Math.abs(x - bodyCenterX) > 68
        : y < 660 && Math.abs(x - bodyCenterX) > 98;

      // Protect hands/wrists at y < 745 from ever being overwritten by trouser or tunic recoloring
      const isUpperOrHandSkinPixel = y < 745 && isWarmSkinPixel;

      // Protect dark hair strands near head/shoulders from being treated as desaturated tunic shadow
      const isHairPixel =
        y <= faceMaxY + (gender === 'female' ? 74 : 28) &&
        Math.abs(x - headCenterX) <= headW * 0.96 &&
        origV < 0.28 &&
        (hsv.s < 0.26 || hueDiff > 28 / 360);

      // Protect white silk inner sleeve cuffs & five-color bands (dải ngũ sắc) on wide ceremonial sleeves
      const isCeremonialCuffOrBand =
        isCeremonialRobe &&
        isOutsideSleeveGuard &&
        ((origV > 0.72 && hsv.s < 0.22) ||
          (hsv.h < 0.16 && hsv.s > 0.36 && hueDiff > 38 / 360));

      // Include collar, shoulder, and sleeve silhouette/fold edges strictly in the UPPER body (y < 555, or inside outer ceremonial sleeves),
      // so shaded white/gray silk trouser folds at y >= 555 are NEVER misclassified as tunic!
      const isUpperTunicEdgeOrFold =
        !isWarmSkinPixel &&
        !isHairPixel &&
        !isCeremonialCuffOrBand &&
        y >= faceMaxY - 2 &&
        (y < 555 || (isCeremonialRobe && isOutsideSleeveGuard)) &&
        ((hueDiff <= 66 / 360 && hsv.s >= 0.04) ||
          (!isCeremonialRobe &&
            y >= faceMaxY + 12 &&
            hsv.s < 0.25 &&
            origV <= 0.68 &&
            g >= r - 0.025));

      // Any genuinely dyed chromatic tunic pixel (`hueDiff <= hueTol && hsv.s >= 0.15`) at or above the tunic hemline
      // (including a +12px fringe buffer on full-length bottoms) is ALWAYS part of the Áo, NEVER overwritten by Quần!
      const isChromaticTunicFabric =
        !isWarmSkinPixel &&
        !isHairPixel &&
        !isCeremonialCuffOrBand &&
        (isShortBottom ? y <= colTunicHemY : y <= colTunicHemY + 12) &&
        hueDiff <= hueTol &&
        hsv.s >= 0.15 &&
        !(origV > 0.78 && hsv.s < 0.24);

      // Geometric Tunic Panel Interior Check for y = 550..colTunicHemY:
      // Any non-skin pixel inside the smoothed tunic panel `[tunicPanelMinX[y] .. tunicPanelMaxX[y]]` and `y <= colTunicHemY`
      // is 100% part of the Áo (tunic), guaranteeing zero stray white/gray pixels inside the Áo!
      const isInsideSmoothedTunicPanel =
        !isWarmSkinPixel &&
        !isHairPixel &&
        !isCeremonialCuffOrBand &&
        y >= 550 &&
        y <= colTunicHemY &&
        tunicPanelMaxX[y] > tunicPanelMinX[y] &&
        x >= tunicPanelMinX[y] &&
        x <= tunicPanelMaxX[y] &&
        (hueDiff <= 62 / 360 ||
          (x >= tunicPanelMinX[y] + 2 && x <= tunicPanelMaxX[y] - 2));

      const isWithinTunicVerticalBounds =
        y <= colTunicHemY || isOutsideSleeveGuard || isChromaticTunicFabric;

      const isTunicHuePixel =
        !isWarmSkinPixel &&
        !isHairPixel &&
        !isCeremonialCuffOrBand &&
        isWithinTunicVerticalBounds &&
        (isChromaticTunicFabric ||
          (y < 555 && hueDiff <= hueTol && hsv.s >= minSat) ||
          (isOutsideSleeveGuard && hueDiff <= hueTol && hsv.s >= minSat) ||
          isUpperTunicEdgeOrFold ||
          isInsideSmoothedTunicPanel);

      // Detect trouser/leg region below the anatomical tunic hemline (`y > colTunicHemY`) and along the natural outer hip slit (`xẻ tà`)
      // while strictly requiring that side-slit pixels are outside `[tunicPanelMinX[y] .. tunicPanelMaxX[y]]` and neutral white/ivory in the base sheet!
      const isExposedInSideSlit =
        !isCeremonialRobe &&
        !isOutsideSleeveGuard &&
        !isUpperOrHandSkinPixel &&
        y >= 585 &&
        y <= colTunicHemY &&
        Math.abs(x - bodyCenterX) <= 82 &&
        tunicPanelMaxX[y] > tunicPanelMinX[y] &&
        (x < tunicPanelMinX[y] - 1 || x > tunicPanelMaxX[y] + 1) &&
        hsv.s < 0.18 &&
        origV >= 0.45 &&
        hueDiff > 42 / 360 &&
        !isTunicHuePixel;

      const isBelowTunicHem =
        !isOutsideSleeveGuard &&
        !isUpperOrHandSkinPixel &&
        y > colTunicHemY &&
        y <= 1094 &&
        !isTunicHuePixel;

      const isTrouserOrSkirtPixel =
        enableTrouserKey &&
        isLowerBody &&
        (isBelowTunicHem || isExposedInSideSlit);

      if (isTunicHuePixel) {
        tunicPaintedMask[p] = 1;
        // Garment tunic mask is active!
        const feather = !isCeremonialRobe
          ? 1.0
          : hueDiff <= hueTol * 0.82
          ? 1.0
          : Math.max(0, 1.0 - (hueDiff - hueTol * 0.82) / (hueTol * 0.18));

        // 1. Extract 3D cloth fold normal from local luminance gradient + PBR micro-weave normal
        //    Use softer relief on luminous White Silk (`isLightAoTarget`) so dark base image grain never creates gray blotches
        const effectiveFoldRelief = isLightAoTarget
          ? foldReliefStrength * 0.45
          : foldReliefStrength;
        const rawGradX = Math.max(-0.09, Math.min(0.09, lumField[p + 1] - lumField[p - 1]));
        const rawGradY = Math.max(-0.09, Math.min(0.09, lumField[p + w] - lumField[p - w]));
        const dVx = rawGradX * effectiveFoldRelief;
        const dVy = rawGradY * effectiveFoldRelief;

        // Procedural micro-weave thread relief per PBR material
        let weavePerturb = 0;
        if (fabricMaterialId === 'lua-ha-dong') {
          weavePerturb = Math.sin((x + y) * 1.35) * weaveNormalStrength * 0.75;
        } else if (fabricMaterialId === 'gam-trieu-dinh') {
          weavePerturb =
            Math.sin(x * 0.9) * Math.cos(y * 0.9) * weaveNormalStrength * 1.25;
        } else {
          weavePerturb =
            (Math.sin(x * 1.15) + Math.cos(y * 0.75)) * weaveNormalStrength * 0.9;
        }

        // 2. Compute Silk Motif Depth-Mapping (Parallax UV Relief + Height-Gradient Normal Perturbation)
        let patCenterVal = 0;
        let patGradX = 0;
        let patGradY = 0;
        if (patData) {
          const parallaxShift = 2.8;
          const u = (x - w * 0.5 - dVx * parallaxShift) * invScale * 1.4;
          const v = (y - h * 0.45 - dVy * parallaxShift) * invScale * 1.4;
          const ru = Math.floor(u * cosA - v * sinA) & patMask;
          const rv = Math.floor(u * sinA + v * cosA) & patMask;
          const ruNext = (ru + 2) & patMask;
          const ruPrev = (ru - 2 + patSize) & patMask;
          const rvNext = (rv + 2) & patMask;
          const rvPrev = (rv - 2 + patSize) & patMask;

          patCenterVal = patData[(rv * patSize + ru) * 4] / 255;
          const pRight = patData[(rv * patSize + ruNext) * 4] / 255;
          const pLeft = patData[(rv * patSize + ruPrev) * 4] / 255;
          const pDown = patData[(rvNext * patSize + ru) * 4] / 255;
          const pUp = patData[(rvPrev * patSize + ru) * 4] / 255;

          const reliefScale =
            fabricMaterialId === 'gam-trieu-dinh'
              ? 1.65
              : fabricMaterialId === 'dui-to'
              ? 1.45
              : 1.35;
          patGradX = (pRight - pLeft) * patStrength * reliefScale;
          patGradY = (pDown - pUp) * patStrength * reliefScale;
        }

        const nxRaw = -dVx + weavePerturb - patGradX * 0.85;
        const nyRaw = -dVy + weavePerturb * 0.5 - patGradY * 0.85;
        const invLen = 1 / Math.hypot(nxRaw, nyRaw, 1.0);
        const nx = nxRaw * invLen;
        const ny = nyRaw * invLen;
        const nz = invLen;

        const nDotL = Math.max(0, nx * keyLx + ny * keyLy + nz * keyLz);
        const grazing = 1.0 - nz;
        const charlieSheen =
          Math.pow(grazing, 2.05) *
          fabricSpec.sheen *
          (0.58 + 0.34 * fabricSpec.anisotropy) *
          (1.0 - fabricSpec.roughness * 0.35);
        const rimGlow = Math.pow(grazing, 2.35) * rimStrength * 0.85;

        // 3. Physically-Based Intrinsic Albedo Scaling (`tunicPhotoShade` * `targetAoHsv.v`):
        //    Normalizes the dark base tunic brightness by `refTunicV` and applies a luminous silk S-curve
        //    so White Silk Áo Dài (#F5F1E8) gleams with pure creamy pearl-white highlights (#FCFBF8) while
        //    retaining graceful 3D waist contours, collar seams, and flowing tà áo folds!
        const rawTunicRatio = origV / refTunicV;
        const tunicGamma = isLightAoTarget
          ? 0.62
          : targetAoHsv.v < 0.38
          ? 1.35
          : targetAoHsv.v < 0.65
          ? 1.08
          : 0.78;
        const minTunicShade = isLightAoTarget
          ? 0.83
          : targetAoHsv.v >= 0.72
          ? 0.46
          : 0.20;
        let tunicPhotoShade =
          rawTunicRatio < 1.0
            ? minTunicShade +
              (1.0 - minTunicShade) *
                Math.pow(Math.max(0.08, rawTunicRatio), tunicGamma)
            : Math.min(
                isLightAoTarget ? 1.04 : 1.14,
                1.0 + (rawTunicRatio - 1.0) * (isLightAoTarget ? 0.32 : 0.62)
              );

        // Crisp 3D tailored hemline & side-slit seam definition on the Áo so the boundary between
        // the upper Áo and lower Quần is always unmistakable and finely tailored!
        const distToHem = colTunicHemY - y;
        const distToSideSeam =
          y >= 555 && tunicPanelMaxX[y] > tunicPanelMinX[y]
            ? Math.min(x - tunicPanelMinX[y], tunicPanelMaxX[y] - x)
            : 99;
        if (distToHem >= 0 && distToHem <= 3) {
          tunicPhotoShade *=
            distToHem === 0
              ? 0.84
              : distToHem === 1
              ? 0.92
              : 1.03;
        } else if (distToSideSeam >= 0 && distToSideSeam <= 2) {
          tunicPhotoShade *= distToSideSeam === 0 ? 0.86 : 0.95;
        }

        const lightFactor = isLightAoTarget
          ? 0.96 + 0.07 * nDotL + weavePerturb * 0.22
          : 0.90 + 0.14 * nDotL + weavePerturb * 0.45;

        const targetEffectiveV = isLightAoTarget
          ? Math.max(targetAoHsv.v, 0.988)
          : targetAoHsv.v;

        const shadedV = Math.min(
          0.996,
          Math.max(0.04, targetEffectiveV * tunicPhotoShade * lightFactor)
        );

        // Pure Pearl-Silk White saturation curve: keep white/ivory (#F5F1E8) warm-creamy pearlescent
        // without cold blue-gray cast
        const targetPixelS = isLightAoTarget
          ? Math.min(0.042, targetAoHsv.s * 0.52 * (0.82 + 0.18 * shadedV))
          : Math.min(
              1.0,
              Math.max(
                0,
                targetAoHsv.s * (0.95 + 0.08 * (1.0 - Math.min(1.0, rawTunicRatio)))
              )
            );
        const newS = hsv.s * (1 - feather) + targetPixelS * feather;
        const recolored = hsvToRgb(targetAoHsv.h, newS, shadedV);

        const sheenAmount =
          (charlieSheen * 0.24 + rimGlow * 0.25) *
          feather *
          Math.max(origV, shadedV * 0.85);
        const sheenTintR = isLightAoTarget ? 1.0 : 0.99;
        const sheenTintG = isLightAoTarget ? 0.995 : 0.96;
        const sheenTintB = isLightAoTarget ? 0.99 : 0.89;
        let outR =
          r * (1 - feather) +
          recolored.r * feather +
          (recolored.r * 0.68 + 0.32 * sheenTintR) * sheenAmount;
        let outG =
          g * (1 - feather) +
          recolored.g * feather +
          (recolored.g * 0.68 + 0.32 * sheenTintG) * sheenAmount;
        let outB =
          b * (1 - feather) +
          recolored.b * feather +
          (recolored.b * 0.68 + 0.32 * sheenTintB) * sheenAmount;

        if (patData && (patCenterVal > 0.03 || Math.abs(patGradX) + Math.abs(patGradY) > 0.04)) {
          const patBevel = -(patGradX * keyLx + patGradY * keyLy) * 0.28;
          if (patBevel < 0 && patCenterVal < 0.35) {
            const edgeShadow = Math.max(0.76, 1.0 + patBevel * 1.35);
            outR *= edgeShadow;
            outG *= edgeShadow;
            outB *= edgeShadow;
          }
          if (patCenterVal > 0.03) {
            const blend = Math.min(1.0, patCenterVal * patStrength * feather);
            const threadWeave =
              Math.sin((x * 1.4 - y * 1.4)) * 0.035 * patStrength;
            const embossedLight = Math.max(
              0.12,
              shadedV * (0.94 + 0.18 * nDotL) +
                patBevel * 0.85 +
                threadWeave +
                sheenAmount * 0.65
            );
            const patR = motifRgb.r * embossedLight + Math.max(0, patBevel) * 0.22;
            const patG = motifRgb.g * embossedLight + Math.max(0, patBevel) * 0.20;
            const patB = motifRgb.b * embossedLight + Math.max(0, patBevel) * 0.15;
            outR = outR * (1 - blend) + patR * blend;
            outG = outG * (1 - blend) + patG * blend;
            outB = outB * (1 - blend) + patB * blend;
          }
        }

        data[idx] = Math.min(255, Math.max(0, Math.round(outR * 255)));
        data[idx + 1] = Math.min(255, Math.max(0, Math.round(outG * 255)));
        data[idx + 2] = Math.min(255, Math.max(0, Math.round(outB * 255)));
      } else if (isTrouserOrSkirtPixel) {
        // 1. In Default Mode (`quan-lua-trang` + `#F5F1E8` on native trouser costumes), keep 100% of the
        //    original studio pixels untouched so the trousers and shoes are razor-sharp with zero artifacts!
        const isDefaultWhiteTrouserUnchanged =
          bottomId === 'quan-lua-trang' &&
          quanHex.trim().toUpperCase() === '#F5F1E8' &&
          !isSkirtBaseCostume;
        if (isDefaultWhiteTrouserUnchanged) {
          continue;
        }

        // 2. Smooth, Anti-Aliased Footwear Protection (`trouserBlendWeight` in [0.0, 1.0]):
        //    Keeps 100% of the white/ivory silk trouser legs and lower cuffs fully dyed right down to the shoe top
        //    while cleanly protecting dark leather/wood/velvet footwear at the bottom of the feet.
        const shoeHardStopY = footBottomY - 12;
        const shoeCuffZoneStartY = footBottomY - 52;
        if (y >= shoeHardStopY) {
          continue;
        }

        let trouserBlendWeight = 1.0;
        if (y >= shoeCuffZoneStartY) {
          // White/ivory silk trouser cuffs have high brightness (origV >= 0.44) and low saturation (hsv.s <= 0.25),
          // whereas shoes/clogs/slippers at the bottom of the feet have dark leather/wood tones (origV < 0.36)
          // or higher chromatic saturation (hsv.s > 0.28).
          const vFade = Math.max(0.0, Math.min(1.0, (origV - 0.35) / 0.12));
          const sFade = Math.max(0.0, Math.min(1.0, (0.29 - hsv.s) / 0.11));
          const soleProximityFade =
            y >= footBottomY - 20
              ? Math.max(0.0, Math.min(1.0, (shoeHardStopY - y) / 8.0))
              : 1.0;
          trouserBlendWeight = vFade * sFade * soleProximityFade;
        }

        // Smoothly feather across the 3px tunic hemline (`colTunicHemY`) so Áo vs Quần has zero hard steps
        if (!isExposedInSideSlit && y <= colTunicHemY + 3) {
          const hemFeather = Math.max(
            0.0,
            Math.min(1.0, (y - colTunicHemY) / 3.0)
          );
          trouserBlendWeight *= hemFeather;
        }

        if (trouserBlendWeight <= 0.01) {
          continue;
        }

        const rMin =
          smoothLegMinX[y] < w ? smoothLegMinX[y] : trueTrouserCenter - trueTrouserHalfW;
        const rMax =
          smoothLegMaxX[y] > 0 ? smoothLegMaxX[y] : trueTrouserCenter + trueTrouserHalfW;
        const rCenter = (rMin + rMax) * 0.5;
        const rSpan = Math.max(40, rMax - rMin);

        // ============================================================================
        // 3A. LOWER-BODY MASK AND FALLBACK SHADING:
        // - When `Quần Short Jeans` (`quan-short-jeans-cat-ngan`) or `Chân Váy Ngắn` (`chan-vay-ngan-miniskirt`)
        //   is chosen:
        //   * The short bottom ends high on the upper thigh (`shortGarmentHemY ~ 724..738`).
        //   * If the upper tunic (`Áo`) is longer than `shortGarmentHemY` (`colTunicHemY > shortGarmentHemY`),
        //     the tunic naturally covers the shorts so YOU DO NOT SEE THE SHORTS below the tunic hem!
        //   * Below `shortGarmentHemY`, a same-angle leg photo is used when available; the shape below is fallback.
        // - When a 2-leg trouser (`Quần Lụa`, `Quần Lĩnh`, `Quần Jeans`, `Quần Kaki`) is chosen on a
        //   1-piece skirt base costume (`isSkirtBaseCostume`), or when `Quần Jeans Ống Suông` is chosen,
        //   the silhouette is tailored into two distinct trouser legs!
        // ============================================================================
        const legProg = Math.max(
          0.0,
          Math.min(1.0, (y - 715) / Math.max(1, shoeHardStopY - 715))
        );
        const hipLeftX = bodyCenterX - (gender === 'female' ? 25 : 27);
        const hipRightX = bodyCenterX + (gender === 'female' ? 25 : 27);
        const leftBoneX =
          hipLeftX * (1.0 - legProg) + leftLegFootX * legProg;
        const rightBoneX =
          hipRightX * (1.0 - legProg) + rightLegFootX * legProg;
        const midLegsX = (leftBoneX + rightBoneX) * 0.5;
        const activeBoneX = isSideView
          ? rCenter
          : x < midLegsX
          ? leftBoneX
          : rightBoneX;
        const distFromBone = Math.abs(x - activeBoneX);

        const normHoriz = (x - rCenter) / Math.max(20, rSpan * 0.5);
        const shortGarmentHemY =
          bottomId === 'quan-short-jeans-cat-ngan'
            ? Math.round(724 - normHoriz * normHoriz * 7)
            : Math.round(738 + Math.cos(normHoriz * Math.PI * 0.5) * 4);

        // Soft Tunic Overhang Contact Shadow (`tunicShadow`) right below `colTunicHemY` (or inside side slit):
        const distBelowHem = isExposedInSideSlit
          ? Math.max(
              0,
              x < bodyCenterX
                ? tunicPanelMinX[y] - x
                : x - tunicPanelMaxX[y]
            )
          : y - colTunicHemY;
        const shadowSpanPx = isExposedInSideSlit ? 10 : 16;
        const minTunicOverhangAo =
          isLightAoTarget && isLightQuanTarget && !isShortBottom
            ? 0.92
            : isLightQuanTarget && !isShortBottom
            ? 0.93
            : 0.82;
        const tunicShadow =
          distBelowHem >= 0 && distBelowHem < shadowSpanPx
            ? minTunicOverhangAo +
              (1.0 - minTunicOverhangAo) *
                Math.sin((distBelowHem / shadowSpanPx) * Math.PI * 0.5)
            : 1.0;

        if (isShortBottom && y > shortGarmentHemY) {
          // Reuse same-angle skin pixels from the matching 360° shorts sheet.
          if (photographedLegUnderlay && y < footBottomY - 82) {
            const underlayIdx =
              ((y - photographedLegUnderlay.startY) * w + x) * 4;
            const underlayR = photographedLegUnderlay.bd[underlayIdx];
            const underlayG = photographedLegUnderlay.bd[underlayIdx + 1];
            const underlayB = photographedLegUnderlay.bd[underlayIdx + 2];
            const underlayA = photographedLegUnderlay.bd[underlayIdx + 3];
            const underlayHsv = rgbToHsv(
              underlayR / 255,
              underlayG / 255,
              underlayB / 255
            );
            const underlaySkin =
              underlayA > 36 &&
              underlayHsv.h < 0.12 &&
              underlayHsv.s > 0.12 &&
              underlayR > underlayG + 7 &&
              underlayG > underlayB + 3 &&
              underlayR - underlayB > 20 &&
              underlayR - underlayG < 100;

            if (underlaySkin) {
              data[idx] = underlayR;
              data[idx + 1] = underlayG;
              data[idx + 2] = underlayB;
              data[idx + 3] = underlayA;
            } else {
              data[idx + 3] = 0;
            }
            continue;
          }

          // Fallback leg silhouette if the matching photographed underlay is unavailable.
          const thighTaper = (1.0 - legProg) * (gender === 'female' ? 11.5 : 12.5);
          const kneeIndent =
            -Math.exp(-Math.pow((legProg - 0.42) / 0.11, 2)) * 2.6;
          const calfMuscle =
            Math.exp(-Math.pow((legProg - 0.64) / 0.16, 2)) * 3.6;
          const bareLegHalfW =
            (isSideView ? 14.5 : gender === 'female' ? 12.8 : 13.8) +
            thighTaper +
            kneeIndent +
            calfMuscle;

          // At the ankle/shoe junction (`y >= shoeCuffZoneStartY`), smoothly expand to preserve the intact shoe silhouette
          const shoeKeepWeight = 1.0 - trouserBlendWeight;
          if (distFromBone > bareLegHalfW + 1.8 && shoeKeepWeight < 0.05) {
            // Trim away loose wide trouser/skirt fabric outside the bare legs!
            data[idx + 3] = 0;
            continue;
          }

          let legSilhouetteAlpha = 1.0;
          if (distFromBone > bareLegHalfW - 1.2 && shoeKeepWeight < 0.5) {
            legSilhouetteAlpha = Math.max(
              shoeKeepWeight,
              Math.min(1.0, (bareLegHalfW + 1.8 - distFromBone) / 3.0)
            );
          }

          // 3D Cylindrical Human Skin Shading (Thigh -> Knee -> Shin/Calf) matched to character's natural skin tone
          const nxSkin = Math.max(
            -1.0,
            Math.min(1.0, (x - activeBoneX) / Math.max(8, bareLegHalfW))
          );
          const nzSkin = Math.sqrt(Math.max(0.06, 1.0 - nxSkin * nxSkin));
          const skinNdotL = Math.max(0.0, nxSkin * keyLx * 0.55 + nzSkin * keyLz);

          // Subtle anatomical knee patella shadow/highlight around legProg ~ 0.41..0.45
          const kneeCapWave =
            Math.sin(((legProg - 0.42) / 0.06) * Math.PI) *
            Math.exp(-Math.pow((legProg - 0.42) / 0.06, 2)) *
            0.032 *
            nzSkin;
          // Soft vertical shin/thigh specular catchlight
          const shinHighlight = Math.pow(nzSkin, 3.4) * 0.075;
          // Short-bottom hem overhang shadow if the short jeans/miniskirt are visible above `shortGarmentHemY`
          const distBelowShorts = y - shortGarmentHemY;
          const shortsShadow =
            colTunicHemY < shortGarmentHemY &&
            distBelowShorts >= 0 &&
            distBelowShorts < 12
              ? 0.82 + 0.18 * (distBelowShorts / 12)
              : 1.0;

          // Calibrated warm radiant skin base RGB from character's face/neck skin sample
          const baseSkinR = Math.min(0.95, Math.max(0.84, (avgSkinR / 255) * 1.04));
          const baseSkinG = Math.min(0.80, Math.max(0.68, (avgSkinG / 255) * 1.03));
          const baseSkinB = Math.min(0.71, Math.max(0.58, (avgSkinB / 255) * 1.02));

          const cylSkinShade =
            (0.74 + 0.25 * Math.pow(nzSkin, 0.65) + 0.08 * skinNdotL + kneeCapWave) *
            tunicShadow *
            shortsShadow;

          const skinR = Math.min(1.0, baseSkinR * cylSkinShade + shinHighlight);
          const skinG = Math.min(
            1.0,
            baseSkinG * (cylSkinShade * 0.985) + shinHighlight * 0.88
          );
          const skinB = Math.min(
            1.0,
            baseSkinB * (cylSkinShade * 0.965) + shinHighlight * 0.78
          );

          const outR = r * (1.0 - trouserBlendWeight) + skinR * trouserBlendWeight;
          const outG = g * (1.0 - trouserBlendWeight) + skinG * trouserBlendWeight;
          const outB = b * (1.0 - trouserBlendWeight) + skinB * trouserBlendWeight;

          data[idx] = Math.min(255, Math.max(0, Math.round(outR * 255)));
          data[idx + 1] = Math.min(255, Math.max(0, Math.round(outG * 255)));
          data[idx + 2] = Math.min(255, Math.max(0, Math.round(outB * 255)));
          data[idx + 3] = Math.round(a * legSilhouetteAlpha);
          continue;
        }

        // For fitted Shorts (`quan-short-jeans-cat-ngan` at y <= shortGarmentHemY) or Straight-Leg Jeans (`quan-jeans-ong-suong`):
        // Trim excess billowing wide-silk outer flare and carve a natural 2-leg inseam split so the trouser silhouette
        // matches real-world denim/trouser tailoring!
        const isStraightJeans = bottomId === 'quan-jeans-ong-suong';
        const isShortJeansUpper =
          bottomId === 'quan-short-jeans-cat-ngan' && y <= shortGarmentHemY;
        if ((isStraightJeans || isShortJeansUpper) && trouserBlendWeight > 0.5) {
          const tailoredHalfW = isSideView
            ? 24.0 - legProg * 4.5
            : 23.5 - legProg * 5.0;
          const inseamGapHalfW = isSideView
            ? 0
            : isShortJeansUpper
            ? 2.2
            : 2.8 + legProg * 2.5;
          const distFromCenterInseam = Math.abs(x - midLegsX);
          if (
            distFromBone > tailoredHalfW + 1.5 ||
            (!isSideView && y > 705 && distFromCenterInseam < inseamGapHalfW - 0.8)
          ) {
            data[idx + 3] = 0;
            continue;
          }
        } else if (
          isSkirtBaseCostume &&
          isTwoLegTrouserBottom &&
          !isSideView &&
          y > colTunicHemY + 6 &&
          trouserBlendWeight > 0.5
        ) {
          // When switching a 1-piece skirt base costume (like Áo Nhật Bình Nữ / Áo Tứ Thân Nữ) to 2-leg trousers
          // (`Quần Lụa Trắng`, `Quần Lĩnh Đen`, `Quần Kaki Ống Rộng`), carve a clean center inseam split between the two legs!
          const distFromCenterInseam = Math.abs(x - midLegsX);
          const inseamSplitHalfW = 2.2 + legProg * 2.4;
          if (distFromCenterInseam < inseamSplitHalfW) {
            data[idx + 3] = 0;
            continue;
          }
        }

        // 4. True Photographic Luminance Transfer (Zero Pixel Breakup, 100% Preserved Studio Drape & Folds):
        //    Uses 5-tap denoised photographic luminance (`smoothLum`) and gentle surface normal (`nDotL`)
        //    so 100% of the real cloth folds, pleats, seams, and studio shadows look completely lifelike ("giống đời thường")!
        const smoothLum =
          lumField[p] * 0.48 +
          (lumField[p - 1] +
            lumField[p + 1] +
            lumField[p - w] +
            lumField[p + w]) *
            0.13;
        const rawRatio = Math.max(
          0.28,
          Math.min(1.14, smoothLum / Math.max(0.32, refTrouserV))
        );

        const dVx =
          Math.max(-0.05, Math.min(0.05, lumField[p + 1] - lumField[p - 1])) *
          0.95;
        const dVy =
          Math.max(-0.05, Math.min(0.05, lumField[p + w] - lumField[p - w])) *
          0.95;
        const nDotL = Math.max(
          0,
          (-dVx * keyLx - dVy * keyLy + keyLz) / Math.hypot(dVx, dVy, 1.0)
        );

        const legAxis = isSideView
          ? rCenter
          : x < rCenter
          ? rCenter - rSpan * 0.23
          : rCenter + rSpan * 0.23;
        const legHalfSpan = isSideView ? rSpan * 0.46 : rSpan * 0.24;
        const normLegDx = Math.max(
          -1,
          Math.min(1, (x - legAxis) / Math.max(12, legHalfSpan))
        );
        const cylRoundness = Math.sqrt(Math.max(0.2, 1.0 - normLegDx * normLegDx));

        let photoShade: number;
        if (isLightQuanTarget) {
          photoShade =
            rawRatio < 1.0
              ? 0.64 + 0.36 * Math.pow(rawRatio, 0.82)
              : Math.min(1.03, 1.0 + (rawRatio - 1.0) * 0.28);
        } else if (targetQuanHsv.v < 0.38) {
          photoShade =
            0.46 +
            0.82 * Math.pow(rawRatio, 0.88) +
            0.18 * Math.pow(cylRoundness, 1.6);
        } else {
          photoShade =
            rawRatio < 1.0
              ? 0.42 + 0.58 * Math.pow(rawRatio, 0.85)
              : Math.min(1.08, 1.0 + (rawRatio - 1.0) * 0.38);
        }

        // Subtle, clean textile micro-detailing (no noisy dashed pixel lines or silhouette cutouts!)
        let styleModV = 0;
        let styleModS = 0;
        const isDenimStyle =
          bottomId === 'quan-jeans-ong-suong' ||
          bottomId === 'quan-short-jeans-cat-ngan';
        const isPleatedSkirtStyle =
          bottomId === 'thuong-lua-xep-ly' ||
          bottomId === 'chan-vay-ngan-miniskirt';

        if (isDenimStyle) {
          // Fine diagonal denim twill, restrained leg wash, and tailored outer seam.
          // Keep stitch detail tied to the leg contour so it follows each turntable angle.
          const twillWave = Math.sin((x * 1.15 + y * 1.15) * 0.9) * 0.014;
          const centerWhiskerFade =
            Math.pow(Math.max(0, 1.0 - Math.abs(normLegDx) * 1.25), 1.8) * 0.065;
          const seamDistance = Math.abs(Math.abs(normLegDx) - 0.84);
          const seamShadow = Math.exp(-seamDistance * seamDistance / 0.0018) * -0.022;
          const stitchDash = Math.sin(y * 0.82) > 0.72 ? 0.018 : 0;
          const seamStitch = Math.abs(normLegDx) > 0.72 && seamDistance < 0.018
            ? stitchDash
            : 0;
          styleModV = twillWave + centerWhiskerFade + seamShadow + seamStitch;
          styleModS = -centerWhiskerFade * 0.32;
        } else if (bottomId === 'quan-kaki-ong-rong') {
          // Fine cotton twill + soft center-front pressed crease (`ly quần`)
          const cottonTwill = Math.sin((x - y) * 1.1) * 0.006;
          const dxCrease = x - legAxis;
          const creaseRelief =
            !isSideView && Math.abs(dxCrease) <= 4.0
              ? dxCrease <= 0
                ? 0.024 * (1 - Math.abs(dxCrease) / 4.0)
                : -0.02 * (1 - Math.abs(dxCrease) / 4.0)
              : 0;
          styleModV = cottonTwill + creaseRelief;
        } else if (isPleatedSkirtStyle) {
          // Smooth vertical accordion pleats (`xếp ly`) blended gently with the natural studio folds
          const pleatPitch = bottomId === 'chan-vay-ngan-miniskirt' ? 0.42 : 0.48;
          const pleatPhase = (x - rCenter) * pleatPitch;
          const pleatWave = Math.sin(pleatPhase) * 0.028;
          styleModV = pleatWave;
        }

        const isDarkSilk =
          targetQuanHsv.v < 0.38 &&
          (bottomId === 'quan-linh-den' ||
            bottomId === 'quan-lua-trang' ||
            bottomId === 'thuong-lua-xep-ly');
        const effectiveBaseV =
          targetQuanHsv.v < 0.38
            ? Math.max(0.15, targetQuanHsv.v * 1.48)
            : targetQuanHsv.v;
        const ridgeSheen = isDarkSilk
          ? Math.pow(Math.min(1.0, Math.max(0, rawRatio * 0.92)), 2.2) *
            (0.06 + 0.06 * nDotL) *
            cylRoundness *
            tunicShadow
          : 0;

        const outV = Math.min(
          0.985,
          Math.max(
            0.04,
            (effectiveBaseV * photoShade + styleModV) *
              tunicShadow *
              (0.95 + 0.06 * nDotL) +
              ridgeSheen
          )
        );
        const outS = isLightQuanTarget
          ? Math.min(
              0.068,
              Math.max(0.018, targetQuanHsv.s * (0.55 + 0.35 * (1.0 - outV)))
            )
          : Math.min(
              0.96,
              Math.max(0, targetQuanHsv.s * (0.96 - ridgeSheen * 0.4) + styleModS)
            );
        const outH =
          isLightQuanTarget && targetQuanHsv.s < 0.15 ? 0.105 : targetQuanHsv.h;

        const rgb = hsvToRgb(outH, outS, outV);

        const blendR = r * (1.0 - trouserBlendWeight) + rgb.r * trouserBlendWeight;
        const blendG = g * (1.0 - trouserBlendWeight) + rgb.g * trouserBlendWeight;
        const blendB = b * (1.0 - trouserBlendWeight) + rgb.b * trouserBlendWeight;

        data[idx] = Math.min(255, Math.max(0, Math.round(blendR * 255)));
        data[idx + 1] = Math.min(255, Math.max(0, Math.round(blendG * 255)));
        data[idx + 2] = Math.min(255, Math.max(0, Math.round(blendB * 255)));
      }
    }
  }

    if (photographedBottomUnderlay && hasPhotoLowerSilhouette) {
      const isMiniSkirt = bottomId === 'chan-vay-ngan-miniskirt';
      const isShortJeans = bottomId === 'quan-short-jeans-cat-ngan';
      const footwearStartY = footBottomY - 82;
      for (let x = 1; x < w - 1; x++) {
        const topHemY = getTunicHemLimitY(x);
        const dx = Math.min(1, Math.abs((x - bodyCenterX) / 92));
        const shortsHemY = Math.round(724 - dx * dx * 7);
        const miniHemY = Math.round(
          738 + Math.cos(dx * Math.PI * 0.5) * 4
        );
        const sourceEndY = isMiniSkirt
          ? miniHemY
          : isShortJeans
            ? shortsHemY
            : footwearStartY;
        const startY = topHemY + 1;
        const endY = Math.min(h - 1, footwearStartY, sourceEndY);

        for (let y = startY; y <= endY; y++) {
          const idx = (y * w + x) * 4;
          const sourceIdx =
            ((y - photographedBottomUnderlay.startY) * w + x) * 4;
          const sourceR = photographedBottomUnderlay.bd[sourceIdx];
          const sourceG = photographedBottomUnderlay.bd[sourceIdx + 1];
          const sourceB = photographedBottomUnderlay.bd[sourceIdx + 2];
          const sourceA = photographedBottomUnderlay.bd[sourceIdx + 3];
          if (sourceA < 32) {
            data[idx + 3] = 0;
            continue;
          }

          const sourceHsv = rgbToHsv(
            sourceR / 255,
            sourceG / 255,
            sourceB / 255
          );
          const sourceSkin =
            sourceHsv.h < 0.12 &&
            sourceHsv.s > 0.12 &&
            sourceR > sourceG + 7 &&
            sourceG > sourceB + 3 &&
            sourceR - sourceB > 20 &&
            sourceR - sourceG < 100;

          if (sourceSkin) {
            data[idx] = sourceR;
            data[idx + 1] = sourceG;
            data[idx + 2] = sourceB;
            data[idx + 3] = sourceA;
            continue;
          }

          const shade = 0.42 + sourceHsv.v * 0.58;
          const tinted = hsvToRgb(
            targetQuanHsv.h,
            targetQuanHsv.s,
            Math.min(1, targetQuanHsv.v * shade)
          );
          data[idx] = Math.round(tinted.r * 255);
          data[idx + 1] = Math.round(tinted.g * 255);
          data[idx + 2] = Math.round(tinted.b * 255);
          data[idx + 3] = sourceA;
        }
      }
    }

    cachedGarment = {
      w,
      h,
      garmentPixels: new Uint8ClampedArray(data),
      headTopY,
      craniumTopY,
      headMinX,
      headMaxX,
      headCenterX,
      headW,
      faceMinY,
      faceMaxY,
      faceMinX,
      faceMaxX,
      faceCenterX,
      faceW,
      faceH,
      avgSkinR,
      avgSkinG,
      avgSkinB,
      detectedLeftEyeX,
      detectedLeftEyeY,
      detectedRightEyeX,
      detectedRightEyeY,
      detectedMouthX,
      detectedMouthY,
      bodyCenterX,
      footBottomY,
      footMinX,
      footMaxX,
      trouserEndY: footBottomY - 40,
      leftLegFootX,
      rightLegFootX,
    };
    if (garmentBaseFrameCache.size > 48) {
      const oldestKey = garmentBaseFrameCache.keys().next().value;
      if (oldestKey) garmentBaseFrameCache.delete(oldestKey);
    }
    garmentBaseFrameCache.set(garmentCacheKey, cachedGarment);
  }

  // Clone cached Garment Layer in-place (< 0.2ms) — 100% preserves garment state and original smooth face/hair!
  const {
    w,
    h,
    headTopY,
    craniumTopY,
    headCenterX,
    headW,
    faceMinY,
    faceMaxY,
    faceMinX,
    faceMaxX,
    faceCenterX,
    faceW,
    avgSkinR,
    avgSkinG,
    avgSkinB,
    detectedLeftEyeX,
    detectedLeftEyeY,
    detectedRightEyeX,
    detectedRightEyeY,
    bodyCenterX,
    footBottomY,
    footMinX,
    footMaxX,
    leftLegFootX,
    rightLegFootX,
  } = cachedGarment;

  // 2D procedural accessories are disabled so the photorealistic 3D character remains 100% clean and natural
  const hasKhanDong = false;
  const hasNonLa = false;
  const hasNonQuaiThao = false;
  const hasKiengBac = false;
  const hasQuat = false;
  const hasGuocMoc = false;
  const hasHeadwear = false;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(w, h);
  const framePixels = imgData.data;
  framePixels.set(cachedGarment.garmentPixels);

  // If headwear (Khăn Đóng / Nón Lá / Nón Quai Thao) is equipped on a character with a tall hair bun,
  // tuck/erase any hair bun pixels protruding above the cranium crown so hair never pokes out above the hat!
  if (hasHeadwear && headTopY < craniumTopY + 6) {
    const tuckLimitY = Math.min(h - 1, craniumTopY + 8);
    for (let y = Math.max(0, headTopY - 4); y <= tuckLimitY; y++) {
      const rOff = y * w * 4;
      for (let x = 220; x < w - 220; x++) {
        framePixels[rOff + x * 4 + 3] = 0;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // ============================================================================
  // 4.0 PASS 1 (DEPTH BEHIND HEAD/HAIR): Render 3D Hat Inner Rim & Back Halo
  // using 'destination-over' so the character's head & face sit INSIDE the 3D hat!
  // ============================================================================
  if (hasNonLa) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    const coneRx = headW * 1.38;
    const coneRy = headW * 0.56;
    const brimCenterX =
      frameIndex === 1
        ? headCenterX + 12
        : frameIndex === 3
        ? headCenterX - 12
        : headCenterX;
    const brimCenterY = craniumTopY + 38;
    const apexX =
      frameIndex === 1
        ? headCenterX + 22
        : frameIndex === 3
        ? headCenterX - 22
        : headCenterX;
    const apexY = Math.max(6, craniumTopY - 28);

    // 3D Under-brim hollow bamboo cone interior behind head & ears
    const innerGrad = ctx.createRadialGradient(
      brimCenterX,
      brimCenterY - 8,
      headW * 0.25,
      brimCenterX,
      brimCenterY,
      coneRx
    );
    innerGrad.addColorStop(0, '#785226');
    innerGrad.addColorStop(0.55, '#A8844C');
    innerGrad.addColorStop(0.88, '#D2B785');
    innerGrad.addColorStop(1, '#E6CFA3');

    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.moveTo(apexX, apexY);
    ctx.lineTo(brimCenterX - coneRx, brimCenterY);
    ctx.ellipse(
      brimCenterX,
      brimCenterY,
      coneRx,
      coneRy,
      0,
      Math.PI,
      0,
      true
    );
    ctx.closePath();
    ctx.fill();

    // 16 Radial 3D bamboo ribs (nan tre) & concentric hoops inside the under-brim
    ctx.strokeStyle = 'rgba(82, 52, 20, 0.42)';
    ctx.lineWidth = 1.15;
    for (let i = 0; i <= 14; i++) {
      const ang = (Math.PI * i) / 14;
      const rx = brimCenterX + Math.cos(ang) * coneRx;
      const ry = brimCenterY + Math.sin(ang) * coneRy;
      ctx.beginPath();
      ctx.moveTo(apexX, apexY + 10);
      ctx.lineTo(rx, ry);
      ctx.stroke();
    }
    for (let ring = 1; ring <= 5; ring++) {
      const t = ring / 5;
      ctx.beginPath();
      ctx.ellipse(
        brimCenterX,
        apexY + (brimCenterY - apexY) * t,
        coneRx * t,
        coneRy * t,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }

    // Outer double-bamboo rim hoop (vành cái nón lá)
    ctx.strokeStyle = '#8F6836';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.ellipse(brimCenterX, brimCenterY, coneRx, coneRy, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else if (hasNonQuaiThao) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    const rimRx = headW * 1.52;
    const rimRy = headW * 0.54;
    const rimCenterY = headTopY + 26;

    // Flat circular Kinh Bắc drum underside behind the head/ears
    const underGrad = ctx.createRadialGradient(
      headCenterX,
      rimCenterY,
      headW * 0.3,
      headCenterX,
      rimCenterY,
      rimRx
    );
    underGrad.addColorStop(0, '#5C3D1C');
    underGrad.addColorStop(0.48, '#8C6538');
    underGrad.addColorStop(0.85, '#B8925E');
    underGrad.addColorStop(1, '#9A7442');

    ctx.fillStyle = underGrad;
    ctx.beginPath();
    ctx.ellipse(headCenterX, rimCenterY, rimRx, rimRy, 0, 0, Math.PI * 2);
    ctx.fill();

    // Radial palm ribs & inner woven bamboo skull-ring (khua nón)
    ctx.strokeStyle = 'rgba(68, 42, 16, 0.45)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 20; i++) {
      const ang = (Math.PI * 2 * i) / 20;
      ctx.beginPath();
      ctx.moveTo(
        headCenterX + Math.cos(ang) * (headW * 0.45),
        rimCenterY + Math.sin(ang) * (headW * 0.18)
      );
      ctx.lineTo(
        headCenterX + Math.cos(ang) * rimRx,
        rimCenterY + Math.sin(ang) * rimRy
      );
      ctx.stroke();
    }

    // Vertical 3D cylindrical drum rim wall (thành nón quai thao)
    const wallGrad = ctx.createLinearGradient(
      headCenterX - rimRx,
      rimCenterY - 22,
      headCenterX + rimRx,
      rimCenterY
    );
    wallGrad.addColorStop(0, '#8A6638');
    wallGrad.addColorStop(0.3, '#E5CFA8');
    wallGrad.addColorStop(0.55, '#F3E3C6');
    wallGrad.addColorStop(0.85, '#B8935E');
    wallGrad.addColorStop(1, '#78552B');
    ctx.fillStyle = wallGrad;
    ctx.beginPath();
    ctx.ellipse(headCenterX, rimCenterY - 18, rimRx, rimRy * 0.82, 0, Math.PI, 0, false);
    ctx.lineTo(headCenterX + rimRx, rimCenterY);
    ctx.ellipse(headCenterX, rimCenterY, rimRx, rimRy, 0, 0, Math.PI, true);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ============================================================================
  // 4C. PASS 2 (3D FOREGROUND CROWN, CAST SHADOWS & ACCESSORIES)
  // ============================================================================
  const eyeY = (detectedLeftEyeY + detectedRightEyeY) * 0.5;
  const eyeSpan = Math.max(22, detectedRightEyeX - detectedLeftEyeX);

  // 1. Khăn Đóng Tám Nếp (3D Sculpted 8-Fold Traditional Silk Turban wrapped around cranium)
  if (hasKhanDong) {
    ctx.save();
    const turbRx = headW * 0.6;
    const turbX = headCenterX;
    const turbBaseY = Math.min(faceMinY - 2, headTopY + 24);

    // Soft forehead contact AO shadow below the turban rim
    const aoGrad = ctx.createLinearGradient(turbX, turbBaseY - 2, turbX, turbBaseY + 11);
    aoGrad.addColorStop(0, 'rgba(12, 10, 9, 0.42)');
    aoGrad.addColorStop(1, 'rgba(12, 10, 9, 0)');
    ctx.fillStyle = aoGrad;
    ctx.beginPath();
    ctx.ellipse(turbX, turbBaseY + 3, turbRx * 0.92, 9, 0, 0, Math.PI);
    ctx.fill();

    // 8 stacked 3D tubular silk folds wrapping around the head
    for (let f = 7; f >= 0; f--) {
      const prog = f / 7;
      const foldY = turbBaseY - f * 3.4;
      const foldRx = turbRx * (1.0 - prog * 0.14 + Math.sin(prog * Math.PI) * 0.08);
      const foldGrad = ctx.createLinearGradient(
        turbX - foldRx,
        foldY,
        turbX + foldRx,
        foldY
      );
      foldGrad.addColorStop(0, '#0F0D0C');
      foldGrad.addColorStop(0.28, '#2E2824');
      foldGrad.addColorStop(0.5, '#3E3630');
      foldGrad.addColorStop(0.75, '#241F1C');
      foldGrad.addColorStop(1, '#0F0D0C');

      ctx.fillStyle = foldGrad;
      ctx.strokeStyle = 'rgba(214, 204, 188, 0.24)';
      ctx.lineWidth = 1.0;

      ctx.beginPath();
      if (frameIndex === 0 && f < 4) {
        // Authentic V-shaped "Chữ Nhân" front fold overlap over the forehead
        ctx.ellipse(turbX, foldY, foldRx, 7.5, 0, Math.PI, Math.PI * 2);
        ctx.quadraticCurveTo(turbX, foldY + 8.5, turbX - foldRx, foldY);
      } else {
        ctx.ellipse(turbX, foldY, foldRx, 7.2, 0, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // 2. Nón Lá Bài Thơ Huế (Foreground 3D Conical Cap + Forehead Cast Shadow + Silk Chin Ribbon)
  if (hasNonLa) {
    ctx.save();
    const coneRx = headW * 1.38;
    const brimCenterX =
      frameIndex === 1
        ? headCenterX + 12
        : frameIndex === 3
        ? headCenterX - 12
        : headCenterX;
    const brimCenterY = headTopY + 38;
    const apexX =
      frameIndex === 1
        ? headCenterX + 22
        : frameIndex === 3
        ? headCenterX - 22
        : headCenterX;
    const apexY = Math.max(6, headTopY - 30);
    const frontArchY = Math.min(faceMinY - 3, headTopY + 18);

    if (frameIndex === 2) {
      // Back view (180°): Full 3D conical exterior with cylindrical palm-leaf lighting & bamboo rings
      const backGrad = ctx.createLinearGradient(
        brimCenterX - coneRx,
        apexY,
        brimCenterX + coneRx,
        brimCenterY
      );
      backGrad.addColorStop(0, '#FBF5E8');
      backGrad.addColorStop(0.38, '#EAD8B3');
      backGrad.addColorStop(0.75, '#C8AA76');
      backGrad.addColorStop(1, '#9E7B47');
      ctx.fillStyle = backGrad;
      ctx.beginPath();
      ctx.moveTo(apexX, apexY);
      ctx.lineTo(brimCenterX + coneRx, brimCenterY);
      ctx.ellipse(brimCenterX, brimCenterY, coneRx, headW * 0.36, 0, 0, Math.PI, false);
      ctx.closePath();
      ctx.fill();
    } else {
      // Front & Side views: Soft 3D cast shadow on the upper forehead & hair under the front crown arch
      const shadowGrad = ctx.createLinearGradient(
        headCenterX,
        frontArchY - 2,
        headCenterX,
        frontArchY + 14
      );
      shadowGrad.addColorStop(0, 'rgba(32, 20, 10, 0.38)');
      shadowGrad.addColorStop(1, 'rgba(32, 20, 10, 0)');
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.ellipse(headCenterX, frontArchY + 4, headW * 0.56, 10, 0, 0, Math.PI);
      ctx.fill();

      // Upper 3D Conical Cap sitting on top of the cranium (arched cleanly above the forehead so face is 100% clear)
      const capGrad = ctx.createLinearGradient(
        brimCenterX - coneRx * 0.8,
        apexY,
        brimCenterX + coneRx * 0.8,
        frontArchY
      );
      capGrad.addColorStop(0, '#FCF6EA');
      capGrad.addColorStop(0.35, '#EFE0C2');
      capGrad.addColorStop(0.72, '#CFAF7A');
      capGrad.addColorStop(1, '#A6834E');
      ctx.fillStyle = capGrad;
      ctx.beginPath();
      ctx.moveTo(apexX, apexY);
      ctx.lineTo(brimCenterX + coneRx, brimCenterY);
      // Curve upward across the front forehead hairline so we look UP into the 3D cone
      ctx.bezierCurveTo(
        headCenterX + headW * 0.65,
        frontArchY - 12,
        headCenterX - headW * 0.65,
        frontArchY - 12,
        brimCenterX - coneRx,
        brimCenterY
      );
      ctx.closePath();
      ctx.fill();

      // 3D Concentric bamboo stitched hoops on the upper cone exterior
      ctx.strokeStyle = 'rgba(128, 88, 44, 0.36)';
      ctx.lineWidth = 1.1;
      for (let r = 1; r <= 4; r++) {
        const t = r / 5;
        const ry = apexY + (frontArchY - apexY) * t;
        const rw = coneRx * t * 0.92;
        ctx.beginPath();
        ctx.moveTo(apexX - rw, ry + 6 * t);
        ctx.quadraticCurveTo(apexX, ry - 5 * t, apexX + rw, ry + 6 * t);
        ctx.stroke();
      }

      // Soft ivory-silk chin ribbon (Quai lụa Nón Lá Huế) hugging the jawline
      ctx.strokeStyle = 'rgba(248, 242, 232, 0.82)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      if (frameIndex === 0) {
        ctx.moveTo(faceMinX - 3, faceMinY + 18);
        ctx.quadraticCurveTo(faceCenterX, faceMaxY + 14, faceMaxX + 3, faceMinY + 18);
      } else {
        const chinSideX = headCenterX + (frameIndex === 1 ? -1 : 1) * (faceW * 0.22);
        ctx.moveTo(headCenterX, faceMinY + 14);
        ctx.quadraticCurveTo(chinSideX, faceMaxY + 10, headCenterX + 4, faceMinY + 20);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // 3. Nón Quai Thao Kinh Bắc (Foreground 3D Crown Top & Plush Silk Tassel Cord)
  if (hasNonQuaiThao) {
    ctx.save();
    const rimRx = headW * 1.52;
    const topY = Math.max(10, headTopY - 6);

    // Soft forehead shadow under the inner bamboo skull-ring (khua nón)
    const khuaGrad = ctx.createLinearGradient(headCenterX, headTopY + 4, headCenterX, headTopY + 18);
    khuaGrad.addColorStop(0, 'rgba(35, 22, 10, 0.42)');
    khuaGrad.addColorStop(1, 'rgba(35, 22, 10, 0)');
    ctx.fillStyle = khuaGrad;
    ctx.beginPath();
    ctx.ellipse(headCenterX, headTopY + 10, headW * 0.52, 8, 0, 0, Math.PI);
    ctx.fill();

    // 3D Perspective flat circular top plate of the Nón Quai Thao
    const topPlateGrad = ctx.createLinearGradient(
      headCenterX - rimRx,
      topY - 8,
      headCenterX + rimRx,
      topY + 8
    );
    topPlateGrad.addColorStop(0, '#A8834E');
    topPlateGrad.addColorStop(0.35, '#F4E4C8');
    topPlateGrad.addColorStop(0.65, '#DEC49A');
    topPlateGrad.addColorStop(1, '#8C6738');
    ctx.fillStyle = topPlateGrad;
    ctx.strokeStyle = '#6E4E26';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(headCenterX, topY, rimRx, headW * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Lush 3D braided ivory-gold silk chin cord (Dây quai thao lụa ba tầm & tua rua)
    if (frameIndex !== 2) {
      ctx.strokeStyle = '#EAB308';
      ctx.lineWidth = 3.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(headCenterX - headW * 0.66, headTopY + 24);
      ctx.quadraticCurveTo(
        headCenterX,
        faceMaxY + 34,
        headCenterX + headW * 0.66,
        headTopY + 24
      );
      ctx.stroke();

      // Silk highlight along cord
      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = 1.3;
      ctx.stroke();

      // Hanging silk tassels (tua rua) at left & right temples
      for (const side of [-1, 1]) {
        const tx = headCenterX + side * headW * 0.66;
        const ty = headTopY + 24;
        ctx.fillStyle = '#CA8A04';
        ctx.beginPath();
        ctx.arc(tx, ty + 4, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#EAB308';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(tx, ty + 6);
        ctx.lineTo(tx - side * 3, ty + 22);
        ctx.moveTo(tx, ty + 6);
        ctx.lineTo(tx + side * 2, ty + 22);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  const hasAcc = (kw: string) =>
    accessories.some((a) => a.toLowerCase().includes(kw.toLowerCase()));

  // 4. Kính Râm Mắt Mèo Retro (Retro Cat-Eye Sunglasses with gold bridge & lens reflection)
  if (hasAcc('Kính Râm')) {
    ctx.save();
    if (frameIndex === 0) {
      const lensW = eyeSpan * 0.46;
      const lensH = Math.max(9, lensW * 0.58);
      const lCx = detectedLeftEyeX;
      const rCx = detectedRightEyeX;

      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(lCx + lensW * 0.35, eyeY - 1);
      ctx.quadraticCurveTo(
        (lCx + rCx) * 0.5,
        eyeY - 4,
        rCx - lensW * 0.35,
        eyeY - 1
      );
      ctx.stroke();

      const drawCatEyeLens = (cx: number, dir: -1 | 1) => {
        ctx.fillStyle = '#141210';
        ctx.strokeStyle = '#1C1917';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(cx - dir * lensW * 0.45, eyeY - lensH * 0.35);
        ctx.quadraticCurveTo(
          cx + dir * lensW * 0.2,
          eyeY - lensH * 0.65,
          cx + dir * lensW * 0.72,
          eyeY - lensH * 0.78
        );
        ctx.quadraticCurveTo(
          cx + dir * lensW * 0.58,
          eyeY + lensH * 0.62,
          cx,
          eyeY + lensH * 0.55
        );
        ctx.quadraticCurveTo(
          cx - dir * lensW * 0.48,
          eyeY + lensH * 0.42,
          cx - dir * lensW * 0.45,
          eyeY - lensH * 0.35
        );
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(cx - lensW * 0.18, eyeY - lensH * 0.25);
        ctx.lineTo(cx + lensW * 0.12, eyeY + lensH * 0.25);
        ctx.stroke();

        ctx.fillStyle = '#FDE68A';
        ctx.beginPath();
        ctx.arc(
          cx + dir * lensW * 0.52,
          eyeY - lensH * 0.55,
          1.4,
          0,
          Math.PI * 2
        );
        ctx.fill();
      };
      drawCatEyeLens(lCx, -1);
      drawCatEyeLens(rCx, 1);
    } else if (frameIndex === 1 || frameIndex === 3) {
      const frontDir = frameIndex === 1 ? -1 : 1;
      const eyeProfileX = headCenterX + frontDir * (headW * 0.34);
      ctx.strokeStyle = '#141210';
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.moveTo(eyeProfileX, eyeY - 2);
      ctx.lineTo(headCenterX, eyeY + 1);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 5. Kiềng Bạc Chạm Khắc (Engraved Sterling Silver Torc Necklace & Lotus Lock around collar/chest)
  //    High-contrast 3D shadow + oxidized silver rim so it stands out on ALL outfits (including white Âu Phục & Bạch Ngọc!)
  if (hasKiengBac && frameIndex !== 2) {
    ctx.save();
    const neckY = faceMaxY + 22;
    const kiengSpan = Math.max(62, faceW * 1.08);
    const kCx =
      frameIndex === 1
        ? faceCenterX - 8
        : frameIndex === 3
        ? faceCenterX + 8
        : faceCenterX;

    // 1. Soft 3D cast shadow on the collar/chest underneath the silver torc
    ctx.strokeStyle = 'rgba(15, 12, 10, 0.48)';
    ctx.lineWidth = 8.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(kCx - kiengSpan * 0.5, neckY - 3);
    ctx.quadraticCurveTo(kCx, neckY + 24, kCx + kiengSpan * 0.5, neckY - 3);
    ctx.stroke();

    // 2. Dark oxidized sterling silver outer contour (guarantees crisp contrast on white/cream shirts)
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 6.6;
    ctx.beginPath();
    ctx.moveTo(kCx - kiengSpan * 0.5, neckY - 6);
    ctx.quadraticCurveTo(kCx, neckY + 20, kCx + kiengSpan * 0.5, neckY - 6);
    ctx.stroke();

    // 3. Gleaming 3D tubular sterling silver core highlight
    const sGrad = ctx.createLinearGradient(
      kCx - kiengSpan * 0.5,
      neckY,
      kCx + kiengSpan * 0.5,
      neckY + 18
    );
    sGrad.addColorStop(0, '#94A3B8');
    sGrad.addColorStop(0.3, '#F8FAFC');
    sGrad.addColorStop(0.5, '#FFFFFF');
    sGrad.addColorStop(0.75, '#CBD5E1');
    sGrad.addColorStop(1, '#64748B');

    ctx.strokeStyle = sGrad;
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(kCx - kiengSpan * 0.5, neckY - 6);
    ctx.quadraticCurveTo(kCx, neckY + 20, kCx + kiengSpan * 0.5, neckY - 6);
    ctx.stroke();

    // 4. Ornate engraved silver lotus medallion (Khánh bạc chạm hoa sen) & 3 hanging silver drops
    const medY = neckY + 12;
    ctx.fillStyle = 'rgba(15, 12, 10, 0.38)';
    ctx.beginPath();
    ctx.ellipse(kCx, medY + 3, 13, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#F8FAFC';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(kCx, medY, 12, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Engraved inner gold/silver lotus core
    ctx.fillStyle = '#D4AF37';
    ctx.beginPath();
    ctx.arc(kCx, medY, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // 3 hanging silver bell drops (tua bạc)
    for (const d of [-7, 0, 7]) {
      const dropLen = d === 0 ? 11 : 8;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(kCx + d, medY + 6);
      ctx.lineTo(kCx + d, medY + 6 + dropLen);
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(kCx + d, medY + 7 + dropLen, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // 6. Quạt Trầm / Quạt Giấy Châm Kim (Traditional Folding Bamboo & Gilded Ivory Dó-Paper Fan held at chest)
  //    High-contrast 3D accordion pleats, crimson-gold brocade rim & dark ebony guard sticks so it is 100% visible on ALL outfits!
  if (hasQuat && frameIndex !== 2) {
    ctx.save();
    const fanPivotX =
      frameIndex === 0
        ? bodyCenterX + 24
        : bodyCenterX + (frameIndex === 1 ? -1 : 1) * 18;
    const fanPivotY = faceMaxY + 148;
    const fanRadius = 68;
    const startAng = -Math.PI * 0.88;
    const endAng = -Math.PI * 0.14;

    // 1. Soft 3D cast shadow of the fan onto the chest/garment
    ctx.fillStyle = 'rgba(15, 12, 10, 0.38)';
    ctx.beginPath();
    ctx.moveTo(fanPivotX + 3, fanPivotY + 5);
    ctx.arc(fanPivotX + 3, fanPivotY + 5, fanRadius + 2, startAng, endAng);
    ctx.closePath();
    ctx.fill();

    // 2. 14 Alternating 3D Accordion Pleat Sectors (gives authentic 3D folded paper relief)
    const ribCount = 14;
    const innerBambooR = 22;
    for (let i = 0; i < ribCount; i++) {
      const a0 = startAng + ((endAng - startAng) * i) / ribCount;
      const a1 = startAng + ((endAng - startAng) * (i + 1)) / ribCount;
      ctx.fillStyle = i % 2 === 0 ? '#FFFBEB' : '#E5D0B1';
      ctx.beginPath();
      ctx.moveTo(fanPivotX, fanPivotY);
      ctx.arc(fanPivotX, fanPivotY, fanRadius, a0, a1);
      ctx.closePath();
      ctx.fill();
    }

    // 3. Warm lacquered bamboo inner ribs base (nan quạt tre châm kim)
    ctx.fillStyle = '#8C5220';
    ctx.beginPath();
    ctx.moveTo(fanPivotX, fanPivotY);
    ctx.arc(fanPivotX, fanPivotY, innerBambooR, startAng, endAng);
    ctx.closePath();
    ctx.fill();

    // 4. Crimson & Imperial Gold brocade top border arc (viền gấm đỏ thêu kim tuyến)
    ctx.strokeStyle = '#9A3412';
    ctx.lineWidth = 5.0;
    ctx.beginPath();
    ctx.arc(fanPivotX, fanPivotY, fanRadius - 2.5, startAng, endAng);
    ctx.stroke();

    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(fanPivotX, fanPivotY, fanRadius - 5.2, startAng, endAng);
    ctx.stroke();

    // 5. Delicate hand-painted lotus & bamboo ink motif across the fan paper
    const midAng = (startAng + endAng) * 0.5;
    const lotusX = fanPivotX + Math.cos(midAng) * (fanRadius * 0.62);
    const lotusY = fanPivotY + Math.sin(midAng) * (fanRadius * 0.62);
    ctx.fillStyle = 'rgba(185, 28, 28, 0.72)';
    for (const pAng of [-0.35, 0, 0.35]) {
      ctx.beginPath();
      ctx.ellipse(
        lotusX + pAng * 12,
        lotusY - Math.abs(pAng) * 4,
        4.2,
        8.5,
        pAng,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // 6. Radial bamboo ribs & thick dark ebony outer guard sticks (nan cái gỗ mun)
    for (let i = 0; i <= ribCount; i++) {
      const ang = startAng + ((endAng - startAng) * i) / ribCount;
      const isGuardStick = i === 0 || i === ribCount;
      ctx.strokeStyle = isGuardStick ? '#271509' : 'rgba(110, 62, 22, 0.55)';
      ctx.lineWidth = isGuardStick ? 3.0 : 1.05;
      ctx.beginPath();
      ctx.moveTo(fanPivotX, fanPivotY);
      ctx.lineTo(
        fanPivotX + Math.cos(ang) * fanRadius,
        fanPivotY + Math.sin(ang) * fanRadius
      );
      ctx.stroke();
    }

    // Brass pivot pin (đinh tán đồng) & flowing crimson silk tassel (tua rua lụa đỏ)
    ctx.fillStyle = '#FACC15';
    ctx.strokeStyle = '#451A03';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(fanPivotX, fanPivotY, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#B91C1C';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(fanPivotX, fanPivotY + 3);
    ctx.quadraticCurveTo(
      fanPivotX - 5,
      fanPivotY + 20,
      fanPivotX + 2,
      fanPivotY + 36
    );
    ctx.stroke();
    ctx.restore();
  }

  // 7. Guốc Mộc Sơn Mài (Traditional Vietnamese Lacquered Wooden Clogs at feet baseline)
  if (hasGuocMoc) {
    ctx.save();
    const shoeY = Math.min(h - 18, footBottomY - 8);
    const footPositions =
      frameIndex === 1 || frameIndex === 3
        ? [bodyCenterX]
        : [leftLegFootX, rightLegFootX];
    for (const fx of footPositions) {
      // Wooden clog platform sole
      ctx.fillStyle = '#451A03';
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(fx - 17, shoeY - 4, 34, 9, 4);
      ctx.fill();
      ctx.stroke();
      // Crimson-velvet clog strap (Quai nhung đỏ son)
      ctx.strokeStyle = '#9A2B1D';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(fx - 13, shoeY - 4);
      ctx.quadraticCurveTo(fx, shoeY - 12, fx + 13, shoeY - 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Store full-resolution 768x1152 canvas directly in cache without blocking on PNG compression
  const outUrl = `vstylist-canvas://${cacheKey}`;
  recoloredFrameCache.set(cacheKey, outUrl);
  recoloredCanvasCache.set(outUrl, canvas);
  return outUrl;
}

function b_val(b: number): number {
  return b;
}

/**
 * Composites a transparent 768x1152 frame onto a solid background color (e.g. #D9D9D9 for Meshy).
 */
async function compositeFrameOnSolidBackground(
  frameDataUrl: string,
  bgColorHex: string,
  mimeType: 'image/png' | 'image/jpeg' = 'image/png'
): Promise<Uint8Array> {
  const cachedCanvas = getCachedRecoloredCanvas(frameDataUrl);
  const sourceDrawable: CanvasImageSource =
    cachedCanvas || (await loadImageElement(frameDataUrl));
  const w = 768;
  const h = 1152;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bgColorHex;
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(sourceDrawable, 0, 0, w, h);
  const dataUrl = canvas.toDataURL(mimeType, 0.92);
  return dataUrlToUint8Array(dataUrl);
}

export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const cachedCanvas = getCachedRecoloredCanvas(dataUrl);
  const resolvedDataUrl = cachedCanvas
    ? cachedCanvas.toDataURL('image/png')
    : dataUrl;
  const base64 = resolvedDataUrl.includes(',')
    ? resolvedDataUrl.split(',')[1]
    : resolvedDataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Standard CRC32 table for spec-compliant ZIP generation
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Builds a standard ZIP Blob from a list of `{ path, data }` files (Store method 0).
 */
export function createZipBlob(
  files: { path: string; data: Uint8Array }[]
): Blob {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.path);
    const dataBytes = file.data;
    const crc = crc32(dataBytes);

    // Local file header (30 bytes + nameBytes)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true); // signature
    lv.setUint16(4, 20, true); // version needed
    lv.setUint16(6, 0, true); // flags
    lv.setUint16(8, 0, true); // compression: store (0)
    lv.setUint16(10, 0, true); // mod time
    lv.setUint16(12, 0, true); // mod date
    lv.setUint32(14, crc, true);
    lv.setUint32(18, dataBytes.length, true);
    lv.setUint32(22, dataBytes.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, dataBytes);

    // Central directory header (46 bytes + nameBytes)
    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, dataBytes.length, true);
    cv.setUint32(24, dataBytes.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  }

  let centralSize = 0;
  for (const cp of centralParts) centralSize += cp.length;

  // End of central directory record (22 bytes)
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  return new Blob([...localParts, ...centralParts, eocd] as BlobPart[], {
    type: 'application/zip',
  });
}

/**
 * Exports "Tải ZIP" containing:
 * - turntable/{id}-{gender}/frame_00..03.png
 * - turntable/{id}-{gender}/poster.jpg (front frame on ivory #F2EDE4 with a soft shadow)
 * - turntable/{id}-{gender}/config.json ({"frames":4})
 * - meshy/{id}-{gender}/front.png, left.png, back.png, right.png (composited on neutral light grey #D9D9D9)
 */
export async function exportTurntableAndMeshyZip(
  modelId: string,
  frames: [string, string, string, string]
): Promise<void> {
  const encoder = new TextEncoder();
  const posterDataUrl = await createPosterJpgFromFrontFrame(frames[0]);

  const frameBytes = await Promise.all(
    frames.map(async (f) => {
      if (f.startsWith('data:')) return dataUrlToUint8Array(f);
      const img = await loadImageElement(f);
      const c = document.createElement('canvas');
      c.width = img.naturalWidth || 768;
      c.height = img.naturalHeight || 1152;
      c.getContext('2d')!.drawImage(img, 0, 0);
      return dataUrlToUint8Array(c.toDataURL('image/png'));
    })
  );

  const meshyNames = ['front.png', 'left.png', 'back.png', 'right.png'];
  const meshyBytes = await Promise.all(
    frames.map((f) => compositeFrameOnSolidBackground(f, '#D9D9D9', 'image/png'))
  );

  const zipFiles: { path: string; data: Uint8Array }[] = [
    { path: `turntable/${modelId}/frame_00.png`, data: frameBytes[0] },
    { path: `turntable/${modelId}/frame_01.png`, data: frameBytes[1] },
    { path: `turntable/${modelId}/frame_02.png`, data: frameBytes[2] },
    { path: `turntable/${modelId}/frame_03.png`, data: frameBytes[3] },
    {
      path: `turntable/${modelId}/poster.jpg`,
      data: dataUrlToUint8Array(posterDataUrl),
    },
    {
      path: `turntable/${modelId}/config.json`,
      data: encoder.encode(JSON.stringify({ frames: 4 }, null, 2)),
    },
    { path: `meshy/${modelId}/${meshyNames[0]}`, data: meshyBytes[0] },
    { path: `meshy/${modelId}/${meshyNames[1]}`, data: meshyBytes[1] },
    { path: `meshy/${modelId}/${meshyNames[2]}`, data: meshyBytes[2] },
    { path: `meshy/${modelId}/${meshyNames[3]}`, data: meshyBytes[3] },
  ];

  const blob = createZipBlob(zipFiles);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vstylist-${modelId}-turntable-meshy.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Exports "Tải ZIP" for /public/patterns/ containing all seamless tileable pattern masks.
 */
export async function exportPatternsZip(): Promise<void> {
  const zipFiles: { path: string; data: Uint8Array }[] = [];
  for (const pat of TRADITIONAL_PATTERNS) {
    if (pat.id === 'none') continue;
    const canvas = getOrCreateProceduralPatternMaskCanvas(pat.id);
    const dataUrl = canvas.toDataURL('image/png');
    zipFiles.push({
      path: `public/patterns/${pat.id}.png`,
      data: dataUrlToUint8Array(dataUrl),
    });
  }
  const blob = createZipBlob(zipFiles);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vstylist-patterns-masks.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
