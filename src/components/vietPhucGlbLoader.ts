import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
  FabricMaterialId,
  FabricMaterialSpec,
  PatternId,
  HairStyleId,
  ExpressionId,
  NecklineCutId,
  HemLengthCutId,
  BUILTIN_TURNAROUND_SHEETS,
  getFabricMaterialSpec,
} from '../data/vietPhucData';
import {
  getGlbFromIndexedDb,
  saveGlbToIndexedDb,
  getOrCreateProceduralPatternMaskCanvas,
} from '../utils/vstylistStorageAndZip';

export interface HueKeyRecolorUniforms {
  uRecolorEnabled: { value: number };
  uBaseHue: { value: number };
  uTargetHue: { value: number };
  uTargetSat: { value: number };
  uTargetVal: { value: number };
  uHueTolerance: { value: number };
  uMinSaturation: { value: number };
  uEnableTrouserKey: { value: number };
  uTrouserBaseHue: { value: number };
  uTrouserTargetHue: { value: number };
  uTrouserTargetSat: { value: number };
  uTrouserTargetVal: { value: number };
  uIsTrouserMesh: { value: number };
  // Triplanar Pattern Projection Uniforms (Object Space)
  uPatternEnabled: { value: number };
  uPatternMap: { value: THREE.Texture };
  uPatternScale: { value: number };
  uPatternRotation: { value: number };
  uPatternStrength: { value: number };
  uPatternColor: { value: THREE.Color };
  // Smooth PBR Cloth Anti-Plastic Uniforms
  uClothRoughness: { value: number };
  uClothSheen: { value: number };
  uClothSheenRoughness: { value: number };
  uClothAnisotropy: { value: number };
  uClothAnisotropyRotation: { value: number };
  uSpecularAttenuation: { value: number };
  // Subtle Brocade & Weave Displacement Mapping Uniforms
  uDisplacementMap: { value: THREE.Texture };
  uDisplacementScale: { value: number };
  uDisplacementBias: { value: number };
  uWeaveRepeatUV: { value: THREE.Vector2 };
  uBrocadeReliefStrength: { value: number };
  // Boosted Normal Scale & Calibrated Environment Intensity Uniforms for seamless mesh junctions
  uNormalScale: { value: THREE.Vector2 };
  uEnvMapIntensity: { value: number };
  // Hierarchical Bone Mask Uniforms (prevents lower garment / leg clipping under longer outer robes)
  uOuterHemMaskY: { value: number };
  uHideClippedLowerMesh: { value: number };
  uIsShortBottom: { value: number };
  uShortBottomHemY: { value: number };
}

export type HierarchicalBoneZone =
  | 'pelvis_hip'
  | 'upper_leg_thigh'
  | 'lower_leg_knee_calf'
  | 'ankle_foot';

export interface HierarchicalBoneMaskState {
  costumeId: string;
  bottomId: string;
  hemLengthCut: HemLengthCutId;
  isLongOuterGarment: boolean;
  outerHemHeightMeters: number;
  maskedZones: Record<HierarchicalBoneZone, boolean>;
  hideUpperTrouserMeshes: boolean;
  hideShortBottomMesh: boolean;
}

/**
 * Computes the hierarchical bone mask state for a given outer garment (`costumeId` + `hemLengthCut`)
 * and lower garment (`bottomId`) so lower garment meshes in masked upper-leg/pelvis bone zones
 * are hidden when longer outer garments are selected, preventing leg/trouser clipping.
 */
export function computeHierarchicalBoneMask(
  costumeId: string,
  bottomId = 'quan-lua-trang',
  hemLengthCut: HemLengthCutId = 'ta-dai-chuan'
): HierarchicalBoneMaskState {
  const cleanCostumeId = costumeId.replace(/-(male|female)$/, '');
  const isHipLengthTop =
    cleanCostumeId.startsWith('au-phuc') || cleanCostumeId.startsWith('ao-ba-ba');
  const isLongOuterGarment =
    !isHipLengthTop && hemLengthCut === 'ta-dai-chuan';

  let outerHemHeightMeters = 0.24;
  if (hemLengthCut === 'crop-top-pha-cach') {
    outerHemHeightMeters = 0.88;
  } else if (isHipLengthTop && hemLengthCut === 'ta-dai-chuan') {
    outerHemHeightMeters = 0.76;
  } else if (hemLengthCut === 'ta-lung-ngang-dui') {
    outerHemHeightMeters = 0.62;
  } else if (hemLengthCut === 'dam-ngan-tren-goi') {
    outerHemHeightMeters = 0.48;
  } else {
    outerHemHeightMeters = 0.24;
  }

  const maskedZones: Record<HierarchicalBoneZone, boolean> = {
    pelvis_hip: hemLengthCut !== 'crop-top-pha-cach',
    upper_leg_thigh:
      isLongOuterGarment || hemLengthCut === 'dam-ngan-tren-goi',
    lower_leg_knee_calf: isLongOuterGarment,
    ankle_foot: false, // Always anatomically visible below outer hemline
  };

  return {
    costumeId: cleanCostumeId,
    bottomId,
    hemLengthCut,
    isLongOuterGarment,
    outerHemHeightMeters,
    maskedZones,
    hideUpperTrouserMeshes:
      maskedZones.pelvis_hip || maskedZones.upper_leg_thigh,
    hideShortBottomMesh: isLongOuterGarment,
  };
}

export interface LoadedCostumeModel {
  status: 'loaded';
  modelId: string;
  isFromUserComputer: boolean;
  rawGlbBuffer: ArrayBuffer;
  scene: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  headBone: THREE.Object3D | null;
  chestBone: THREE.Object3D | null;
  lookAtTarget: THREE.Vector3;
  getLookAtTarget: (
    out?: THREE.Vector3,
    focusMode?: 'chest' | 'head'
  ) => THREE.Vector3;
  recolorUniformSets: HueKeyRecolorUniforms[];
  calibratedBaseHueDeg: number;
  calibratedTrouserHueDeg: number;
  updateRecolorUniforms: (params: {
    primaryHex: string;
    trouserHex?: string;
    enableTrouserKey?: boolean;
  }) => void;
  updatePatternUniforms: (params: {
    patternId: PatternId;
    hoaTietHex: string;
    scale: number;
    rotationDeg: number;
    strength: number;
  }) => void;
  updateFabricNormalAndPbr: (fabricMaterialId: FabricMaterialId) => void;
  updateCharacterAppearance: (params: {
    hairStyle: HairStyleId;
    hairColorHex: string;
    expression: ExpressionId;
    costumeId?: string;
    bottomId?: string;
    trouserHex?: string;
    accessories?: string[];
    necklineCut?: NecklineCutId;
    hemLengthCut?: HemLengthCutId;
  }) => void;
  dispose: () => void;
}

export interface MissingCostumeModel {
  status: 'missing';
  modelId: string;
  expectedGlbPath: string;
  expectedPosterPath: string;
}

export type CostumeLoadResult = LoadedCostumeModel | MissingCostumeModel;

// Singleton loaders with DRACOLoader and MeshoptDecoder
let sharedGltfLoader: GLTFLoader | null = null;

function getConfiguredGltfLoader(): GLTFLoader {
  if (!sharedGltfLoader) {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    dracoLoader.setDecoderConfig({ type: 'js' });
    loader.setDRACOLoader(dracoLoader);
    loader.setMeshoptDecoder(MeshoptDecoder);
    sharedGltfLoader = loader;
  }
  return sharedGltfLoader;
}

// In-memory caches of parsed GLTF buffers, weave normal maps, pattern textures, & user-supplied GLBs
const gltfBufferCache = new Map<
  string,
  { buffer: ArrayBuffer; isFromUserComputer: boolean }
>();
const knownMissingServerModelIds = new Set<string>();
const weaveNormalMapCache = new Map<FabricMaterialId, THREE.CanvasTexture>();
const fabricDisplacementMapCache = new Map<FabricMaterialId, THREE.CanvasTexture>();
const trouserPbrNormalMapCache = new Map<string, THREE.CanvasTexture>();
const patternTextureCache = new Map<PatternId, THREE.CanvasTexture>();

export interface TrouserPbrProfile {
  bottomId: string;
  roughness: number;
  metalness: number;
  sheen: number;
  sheenRoughness: number;
  anisotropy: number;
  anisotropyRotation: number;
  specularAttenuation: number;
  normalScale: [number, number];
  envMapIntensity: number;
  repeatUV: [number, number];
  weaveType: 'silk-satin' | 'denim-twill' | 'khaki-twill' | 'pleated-silk';
}

export function getTrouserPbrProfile(bottomId = 'quan-lua-trang'): TrouserPbrProfile {
  const lower = bottomId.toLowerCase();
  if (lower.includes('jeans') || lower.includes('short')) {
    return {
      bottomId,
      roughness: 0.84,
      metalness: 0.0,
      sheen: 0.12,
      sheenRoughness: 0.82,
      anisotropy: 0.18,
      anisotropyRotation: Math.PI * 0.25,
      specularAttenuation: 0.42,
      normalScale: [0.92, 0.92],
      envMapIntensity: 0.58,
      repeatUV: [34, 34],
      weaveType: 'denim-twill',
    };
  }
  if (lower.includes('kaki')) {
    return {
      bottomId,
      roughness: 0.74,
      metalness: 0.0,
      sheen: 0.18,
      sheenRoughness: 0.72,
      anisotropy: 0.24,
      anisotropyRotation: Math.PI * 0.2,
      specularAttenuation: 0.34,
      normalScale: [0.78, 0.78],
      envMapIntensity: 0.64,
      repeatUV: [38, 38],
      weaveType: 'khaki-twill',
    };
  }
  if (lower.includes('thuong') || lower.includes('vay') || lower.includes('skirt')) {
    return {
      bottomId,
      roughness: 0.58,
      metalness: 0.0,
      sheen: 0.68,
      sheenRoughness: 0.46,
      anisotropy: 0.56,
      anisotropyRotation: 0.0,
      specularAttenuation: 0.24,
      normalScale: [0.84, 0.72],
      envMapIntensity: 0.82,
      repeatUV: [28, 28],
      weaveType: 'pleated-silk',
    };
  }
  if (lower.includes('linh-den')) {
    return {
      bottomId,
      roughness: 0.52,
      metalness: 0.0,
      sheen: 0.78,
      sheenRoughness: 0.38,
      anisotropy: 0.66,
      anisotropyRotation: 0.0,
      specularAttenuation: 0.18,
      normalScale: [0.72, 0.72],
      envMapIntensity: 0.88,
      repeatUV: [42, 42],
      weaveType: 'silk-satin',
    };
  }
  // Default: Quần Lụa Trắng ('quan-lua-trang') — Lụa Hà Đông satin
  return {
    bottomId,
    roughness: 0.56,
    metalness: 0.0,
    sheen: 0.72,
    sheenRoughness: 0.42,
    anisotropy: 0.62,
    anisotropyRotation: 0.0,
    specularAttenuation: 0.22,
    normalScale: [0.74, 0.74],
    envMapIntensity: 0.85,
    repeatUV: [40, 40],
    weaveType: 'silk-satin',
  };
}

export function getOrCreateTrouserPbrNormalMap(
  bottomId = 'quan-lua-trang',
  maxAnisotropy = 16
): THREE.CanvasTexture {
  const profile = getTrouserPbrProfile(bottomId);
  const cacheKey = `${profile.weaveType}_${profile.repeatUV[0]}`;
  if (trouserPbrNormalMapCache.has(cacheKey)) {
    return trouserPbrNormalMapCache.get(cacheKey)!;
  }

  const size = 256;
  const mask = size - 1;
  const hField = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let hVal = 0.5;
      if (profile.weaveType === 'denim-twill') {
        // 3x1 diagonal Z-twill ridge + warp/weft yarn roundness
        const diag = ((x * 1.4 + y) * Math.PI * 2) / 6.0;
        const warp = Math.cos((x * Math.PI * 2) / 3.0) * 0.18;
        const weft = Math.cos((y * Math.PI * 2) / 4.0) * 0.12;
        hVal = 0.5 + Math.sin(diag) * 0.28 + warp + weft;
      } else if (profile.weaveType === 'khaki-twill') {
        // Fine 2x2 cotton-twill diagonal weave
        const diag = ((x + y) * Math.PI * 2) / 5.0;
        const warp = Math.cos((x * Math.PI * 2) / 2.5) * 0.14;
        hVal = 0.5 + Math.sin(diag) * 0.22 + warp;
      } else if (profile.weaveType === 'pleated-silk') {
        // Vertical accordion knife-pleat micro-flutes + fine silk cross-weave
        const pleatPhase = (x / size) * Math.PI * 2 * 8.0;
        const pleatHeight = Math.cos(pleatPhase) * 0.32;
        const silkWeft = Math.sin((y * Math.PI * 2) / 3.0) * 0.08;
        hVal = 0.5 + pleatHeight + silkWeft;
      } else {
        // Smooth 5-harness silk satin weave (Lụa Hà Đông / Lãnh Mỹ A)
        const warp = Math.cos((x * Math.PI * 2) / 4.0) * 0.11;
        const weft = Math.sin((y * Math.PI * 2) / 6.0) * 0.07;
        const satinDiag = Math.sin(((x + y * 2) * Math.PI * 2) / 8.0) * 0.09;
        hVal = 0.5 + warp + weft + satinDiag;
      }
      hField[y * size + x] = hVal;
    }
  }

  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = size;
  normalCanvas.height = size;
  const nCtx = normalCanvas.getContext('2d')!;
  const outImg = nCtx.createImageData(size, size);
  const nData = outImg.data;
  const strength =
    profile.weaveType === 'denim-twill'
      ? 2.2
      : profile.weaveType === 'pleated-silk'
      ? 1.9
      : 1.45;

  for (let y = 0; y < size; y++) {
    const yU = (y - 1 + size) & mask;
    const yD = (y + 1) & mask;
    for (let x = 0; x < size; x++) {
      const xL = (x - 1 + size) & mask;
      const xR = (x + 1) & mask;
      // 3x3 Sobel operator for zero-aliasing smooth tangent normals
      const tl = hField[yU * size + xL];
      const tc = hField[yU * size + x];
      const tr = hField[yU * size + xR];
      const ml = hField[y * size + xL];
      const mr = hField[y * size + xR];
      const bl = hField[yD * size + xL];
      const bc = hField[yD * size + x];
      const br = hField[yD * size + xR];

      const dX = (tl + 2 * ml + bl - (tr + 2 * mr + br)) * 0.25 * strength;
      const dY = (tl + 2 * tc + tr - (bl + 2 * bc + br)) * 0.25 * strength;
      const dZ = 1.0;
      const invLen = 1.0 / Math.sqrt(dX * dX + dY * dY + dZ * dZ);

      const idx = (y * size + x) * 4;
      nData[idx] = Math.round((dX * invLen * 0.5 + 0.5) * 255);
      nData[idx + 1] = Math.round((dY * invLen * 0.5 + 0.5) * 255);
      nData[idx + 2] = Math.round((dZ * invLen * 0.5 + 0.5) * 255);
      nData[idx + 3] = 255;
    }
  }
  nCtx.putImageData(outImg, 0, 0);

  const normalTex = new THREE.CanvasTexture(normalCanvas);
  normalTex.wrapS = THREE.RepeatWrapping;
  normalTex.wrapT = THREE.RepeatWrapping;
  normalTex.repeat.set(profile.repeatUV[0], profile.repeatUV[1]);
  normalTex.generateMipmaps = true;
  normalTex.minFilter = THREE.LinearMipmapLinearFilter;
  normalTex.magFilter = THREE.LinearFilter;
  normalTex.anisotropy = Math.max(8, Math.min(maxAnisotropy || 16, 16));
  normalTex.needsUpdate = true;

  trouserPbrNormalMapCache.set(cacheKey, normalTex);
  return normalTex;
}

export function invalidatePatternTextureCache(patternId?: PatternId): void {
  if (patternId) {
    patternTextureCache.delete(patternId);
  } else {
    patternTextureCache.clear();
  }
}

export function getOrCreatePatternThreeTexture(
  patternId: PatternId
): THREE.CanvasTexture {
  if (patternTextureCache.has(patternId)) {
    return patternTextureCache.get(patternId)!;
  }
  const canvas = getOrCreateProceduralPatternMaskCanvas(patternId);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  patternTextureCache.set(patternId, tex);
  return tex;
}

export async function registerSuppliedGlbFile(
  costumeId: string,
  gender: 'male' | 'female',
  file: File
): Promise<ArrayBuffer> {
  const modelId = `${costumeId}-${gender}`;
  knownMissingServerModelIds.delete(modelId);
  const buffer = await file.arrayBuffer();
  gltfBufferCache.set(modelId, { buffer, isFromUserComputer: true });
  await saveGlbToIndexedDb(modelId, buffer, `${modelId}.glb`);
  return buffer;
}

/**
 * Generates a tileable Tangent-Space RGB Normal Map from `FabricMaterialSpec.normalMapConfig`
 * in `src/data/vietPhucData.ts` so cloth meshes have realistic micro-weave depth when a PBR material is selected.
 */
export function getOrCreateFabricWeaveNormalMap(
  fabricSpec: FabricMaterialSpec,
  maxAnisotropy = 8
): THREE.CanvasTexture {
  const cached = weaveNormalMapCache.get(fabricSpec.id);
  if (cached) return cached;

  const cfg = fabricSpec.normalMapConfig;
  const size = 256;
  const mask = size - 1;
  const heightCanvas = document.createElement('canvas');
  heightCanvas.width = size;
  heightCanvas.height = size;
  const hCtx = heightCanvas.getContext('2d')!;

  hCtx.fillStyle = '#808080';
  hCtx.fillRect(0, 0, size, size);

  const { warp, weft } = cfg.threadSpacing;
  hCtx.strokeStyle =
    cfg.weaveArchitecture === 'slub-linen'
      ? 'rgba(255, 255, 255, 0.25)'
      : cfg.weaveArchitecture === 'jacquard-brocade'
      ? 'rgba(255, 255, 255, 0.22)'
      : 'rgba(255, 255, 255, 0.14)';
  hCtx.lineWidth = cfg.weaveArchitecture === 'jacquard-brocade' ? 1.4 : 1.0;

  for (let y = 0; y < size; y += weft) {
    hCtx.beginPath();
    hCtx.moveTo(0, y);
    hCtx.lineTo(size, y);
    hCtx.stroke();
  }

  hCtx.strokeStyle = 'rgba(235, 235, 235, 0.16)';
  for (let x = 0; x < size; x += warp) {
    hCtx.beginPath();
    hCtx.moveTo(x, 0);
    hCtx.lineTo(x, size);
    hCtx.stroke();
  }

  if (cfg.weaveArchitecture === 'satin-twill') {
    hCtx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    for (let d = -size; d < size; d += 6) {
      hCtx.beginPath();
      hCtx.moveTo(d, 0);
      hCtx.lineTo(d + size, size);
      hCtx.stroke();
    }
  } else if (cfg.weaveArchitecture === 'slub-linen') {
    for (let i = 0; i < 90; i++) {
      const sx = (i * 53 + 11) & mask;
      const sy = (i * 97 + 29) & mask;
      const len = 8 + (i % 14);
      hCtx.strokeStyle =
        i % 2 === 0 ? 'rgba(255, 255, 255, 0.32)' : 'rgba(50, 50, 50, 0.22)';
      hCtx.beginPath();
      hCtx.moveTo(sx, sy);
      hCtx.lineTo(sx + len, sy);
      hCtx.stroke();
    }
  }

  const srcData = hCtx.getImageData(0, 0, size, size).data;
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = size;
  normalCanvas.height = size;
  const nCtx = normalCanvas.getContext('2d')!;
  const outImg = nCtx.createImageData(size, size);
  const nData = outImg.data;
  const strength = cfg.normalStrength * cfg.reliefContrast;

  for (let y = 0; y < size; y++) {
    const yU = (y - 1 + size) & mask;
    const yD = (y + 1) & mask;
    for (let x = 0; x < size; x++) {
      const xL = (x - 1 + size) & mask;
      const xR = (x + 1) & mask;
      const idx = (y * size + x) * 4;
      const hL = srcData[(y * size + xL) * 4] / 255;
      const hR = srcData[(y * size + xR) * 4] / 255;
      const hU = srcData[(yU * size + x) * 4] / 255;
      const hD = srcData[(yD * size + x) * 4] / 255;

      const dx = (hL - hR) * strength;
      const dy = (hU - hD) * strength;
      const dz = 1.0;
      const inv = 1.0 / Math.sqrt(dx * dx + dy * dy + dz * dz);

      nData[idx] = Math.round((dx * inv * 0.5 + 0.5) * 255);
      nData[idx + 1] = Math.round((dy * inv * 0.5 + 0.5) * 255);
      nData[idx + 2] = Math.round((dz * inv * 0.5 + 0.5) * 255);
      nData[idx + 3] = 255;
    }
  }
  nCtx.putImageData(outImg, 0, 0);

  const normalTex = new THREE.CanvasTexture(normalCanvas);
  normalTex.wrapS = THREE.RepeatWrapping;
  normalTex.wrapT = THREE.RepeatWrapping;
  normalTex.repeat.set(cfg.repeatUV[0], cfg.repeatUV[1]);
  normalTex.generateMipmaps = true;
  normalTex.minFilter = THREE.LinearMipmapLinearFilter;
  normalTex.magFilter = THREE.LinearFilter;
  normalTex.anisotropy = Math.max(8, Math.min(maxAnisotropy || 16, 16));
  normalTex.needsUpdate = true;

  weaveNormalMapCache.set(fabricSpec.id, normalTex);
  return normalTex;
}

export function getFabricDisplacementParams(fabricSpec: FabricMaterialSpec): {
  displacementScale: number;
  displacementBias: number;
  brocadeReliefStrength: number;
  envMapIntensity: number;
  boostedNormalScale: [number, number];
} {
  if (fabricSpec.id === 'gam-trieu-dinh') {
    // Gấm Triều Đình (Jacquard Brocade): pronounced raised silk & gold thread relief + rich environment intensity
    return {
      displacementScale: 0.0028,
      displacementBias: -0.0012,
      brocadeReliefStrength: 0.68,
      envMapIntensity: 0.92,
      boostedNormalScale: [
        fabricSpec.normalScale[0] * 1.15,
        fabricSpec.normalScale[1] * 1.15,
      ],
    };
  }
  if (fabricSpec.id === 'dui-to') {
    // Đũi Tơ Tằm (Raw Slub Silk): organic slub yarn ridges + balanced matte environment intensity
    return {
      displacementScale: 0.0021,
      displacementBias: -0.0009,
      brocadeReliefStrength: 0.52,
      envMapIntensity: 0.68,
      boostedNormalScale: [
        fabricSpec.normalScale[0] * 1.15,
        fabricSpec.normalScale[1] * 1.15,
      ],
    };
  }
  // Lụa Hà Đông (Mulberry Satin Silk): delicate satin float micro-relief + luminous silk environment intensity
  return {
    displacementScale: 0.0012,
    displacementBias: -0.0005,
    brocadeReliefStrength: 0.34,
    envMapIntensity: 0.84,
    boostedNormalScale: [
      fabricSpec.normalScale[0] * 1.18,
      fabricSpec.normalScale[1] * 1.18,
    ],
  };
}

/**
 * Generates a tileable 256x256 grayscale Height / Displacement Map for subtle GLB displacement mapping:
 * - `gam-trieu-dinh` (Jacquard Brocade): raised interlaced warp/weft brocade crowns, diamond lattice floats,
 *   and recessed binder intersections for authentic light reflection across raised brocade threads.
 * - `dui-to` (Slub Raw Silk): thick-thin organic slub knots and cross-fiber texture.
 * - `lua-ha-dong` (Satin Twill Silk): smooth 5-harness satin floats.
 */
export function getOrCreateFabricDisplacementMap(
  fabricSpec: FabricMaterialSpec,
  maxAnisotropy = 16
): THREE.CanvasTexture {
  const cached = fabricDisplacementMapCache.get(fabricSpec.id);
  if (cached) return cached;

  const cfg = fabricSpec.normalMapConfig;
  const size = 256;
  const dispCanvas = document.createElement('canvas');
  dispCanvas.width = size;
  dispCanvas.height = size;
  const ctx = dispCanvas.getContext('2d')!;
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  const warpPeriod = Math.max(2, cfg.threadSpacing.warp);
  const weftPeriod = Math.max(2, cfg.threadSpacing.weft);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let h = 0.5;
      if (cfg.weaveArchitecture === 'jacquard-brocade') {
        // Jacquard Brocade (`gam-trieu-dinh`): raised warp/weft float threads + diamond brocade ground lattice
        const warpPhase = (x / warpPeriod) * Math.PI * 2;
        const weftPhase = (y / weftPeriod) * Math.PI * 2;
        const warpCrown = Math.max(0, Math.cos(warpPhase)) * 0.24;
        const weftCrown = Math.max(0, Math.cos(weftPhase)) * 0.22;
        // Diamond lozenge brocade float pattern (vân gấm mắt võng / chữ Vạn)
        const diaU = ((x + y) / 16.0) * Math.PI * 2;
        const diaV = ((x - y) / 16.0) * Math.PI * 2;
        const brocadeFloat =
          (Math.cos(diaU) * Math.cos(diaV) * 0.5 + 0.5) * 0.26;
        // Micro-undulation across brocade yarn bundles
        const microFold =
          Math.sin((x / size) * Math.PI * 4) *
          Math.cos((y / size) * Math.PI * 4) *
          0.06;
        h = 0.28 + Math.max(warpCrown, weftCrown * 0.92) + brocadeFloat + microFold;
      } else if (cfg.weaveArchitecture === 'slub-linen') {
        // Raw Slub Silk (`dui-to`): organic uneven slub weft threads + cross warp
        const weftPhase = (y / weftPeriod) * Math.PI * 2;
        const warpPhase = (x / warpPeriod) * Math.PI * 2;
        const slubMod =
          Math.sin((x * 0.18 + y * 0.07)) * Math.cos(y * 0.31) * 0.18;
        h =
          0.46 +
          Math.cos(weftPhase) * 0.2 +
          Math.cos(warpPhase) * 0.12 +
          slubMod;
      } else {
        // Mulberry Satin Twill (`lua-ha-dong`): smooth 5-harness satin floats
        const satinDiag = ((x + y * 2) / 8.0) * Math.PI * 2;
        const warp = Math.cos((x / warpPeriod) * Math.PI * 2) * 0.12;
        const weft = Math.sin((y / weftPeriod) * Math.PI * 2) * 0.08;
        h = 0.48 + Math.sin(satinDiag) * 0.14 + warp + weft;
      }

      const byteVal = Math.min(255, Math.max(0, Math.round(h * 255)));
      const idx = (y * size + x) * 4;
      data[idx] = byteVal;
      data[idx + 1] = byteVal;
      data[idx + 2] = byteVal;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const dispTex = new THREE.CanvasTexture(dispCanvas);
  dispTex.wrapS = THREE.RepeatWrapping;
  dispTex.wrapT = THREE.RepeatWrapping;
  dispTex.repeat.set(cfg.repeatUV[0], cfg.repeatUV[1]);
  dispTex.generateMipmaps = true;
  dispTex.minFilter = THREE.LinearMipmapLinearFilter;
  dispTex.magFilter = THREE.LinearFilter;
  dispTex.anisotropy = Math.max(8, Math.min(maxAnisotropy || 16, 16));
  dispTex.needsUpdate = true;

  fabricDisplacementMapCache.set(fabricSpec.id, dispTex);
  return dispTex;
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

export function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const c = new THREE.Color(hex);
  const clean = hex.replace('#', '').trim();
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16) / 255;
    const g = parseInt(clean.slice(2, 4), 16) / 255;
    const b = parseInt(clean.slice(4, 6), 16) / 255;
    return rgbToHsv(r, g, b);
  }
  return rgbToHsv(c.r, c.g, c.b);
}

/**
 * Auto-calibrates `baseHue` (in [0, 1]) from the most saturated 5% of texels
 * (with saturation >= 0.30) of a base color texture, as required by Section D.
 */
export function calibrateBaseHueFromTexture(
  texture: THREE.Texture | null | undefined,
  fallbackColor?: THREE.Color
): { baseHue: number; trouserHue: number } {
  const defaultHue = fallbackColor
    ? rgbToHsv(fallbackColor.r, fallbackColor.g, fallbackColor.b).h
    : 170 / 360;

  if (!texture || !texture.image) {
    return { baseHue: defaultHue, trouserHue: 40 / 360 };
  }

  try {
    const img = texture.image as
      | HTMLImageElement
      | HTMLCanvasElement
      | ImageBitmap;
    const w = 64;
    const h = 64;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { baseHue: defaultHue, trouserHue: 40 / 360 };

    ctx.drawImage(img as CanvasImageSource, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;

    const saturatedSamples: { h: number; s: number; v: number }[] = [];
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 128) continue;
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      const hsv = rgbToHsv(r, g, b);
      if (hsv.s >= 0.3 && hsv.v >= 0.12) {
        saturatedSamples.push(hsv);
      }
    }

    if (saturatedSamples.length === 0) {
      return { baseHue: defaultHue, trouserHue: 40 / 360 };
    }

    // Sort by saturation descending and take the top 5% most saturated texels
    saturatedSamples.sort((a, b) => b.s - a.s);
    const top5PctCount = Math.max(1, Math.ceil(saturatedSamples.length * 0.05));

    let sinSum = 0;
    let cosSum = 0;
    for (let i = 0; i < top5PctCount; i++) {
      const rad = saturatedSamples[i].h * Math.PI * 2;
      const wgt = saturatedSamples[i].s;
      sinSum += Math.sin(rad) * wgt;
      cosSum += Math.cos(rad) * wgt;
    }

    let primaryHue = Math.atan2(sinSum, cosSum) / (Math.PI * 2);
    if (primaryHue < 0) primaryHue += 1;

    // Secondary hue for trouser key (samples at least 40 deg away from primaryHue)
    let secSin = 0;
    let secCos = 0;
    let secCount = 0;
    for (const sample of saturatedSamples) {
      let diff = Math.abs(sample.h - primaryHue);
      if (diff > 0.5) diff = 1.0 - diff;
      if (diff >= 40 / 360) {
        const rad = sample.h * Math.PI * 2;
        secSin += Math.sin(rad) * sample.s;
        secCos += Math.cos(rad) * sample.s;
        secCount++;
      }
    }

    let trouserHue = (primaryHue + 0.5) % 1.0;
    if (secCount > 0) {
      trouserHue = Math.atan2(secSin, secCos) / (Math.PI * 2);
      if (trouserHue < 0) trouserHue += 1;
    }

    return { baseHue: primaryHue, trouserHue };
  } catch {
    return { baseHue: defaultHue, trouserHue: 40 / 360 };
  }
}

/**
 * Attaches the instant GPU `onBeforeCompile` shader onto a cloth material:
 * 1. Hue-key on the base color map: pixels within 25 degrees (circular) of `baseHue`
 *    (auto-calibrated from top 5% most saturated texels) and saturation >= 0.30 take target hue,
 *    keeping original brightness `origV` so folds stay visible.
 * 2. Triplanar pattern projection in object space: projects seamless white-on-black pattern mask
 *    with scale, rotation, strength, and tint color multiplied by original brightness `origV`
 *    only where the garment mask is active.
 * 3. Smooth PBR roughness, sheen, and anisotropy calculation preventing any plastic glare.
 */
function attachHueKeyShaderToClothMaterial(
  material: THREE.MeshPhysicalMaterial,
  baseHue: number,
  trouserHue: number,
  isTrouserMesh: boolean,
  fabricSpec: FabricMaterialSpec
): HueKeyRecolorUniforms {
  const defaultPatternTex = getOrCreatePatternThreeTexture('none');
  const defaultDispTex = getOrCreateFabricDisplacementMap(fabricSpec, 16);
  const dispParams = getFabricDisplacementParams(fabricSpec);
  const repeatUV = fabricSpec.normalMapConfig.repeatUV;

  const uniforms: HueKeyRecolorUniforms = {
    uRecolorEnabled: { value: 1.0 },
    uBaseHue: { value: baseHue },
    uTargetHue: { value: baseHue },
    uTargetSat: { value: 0.75 },
    uTargetVal: { value: 0.85 },
    uHueTolerance: { value: 38.0 / 360.0 }, // 38 degrees circular
    uMinSaturation: { value: 0.14 }, // saturation >= 0.14
    uEnableTrouserKey: { value: 0.0 },
    uTrouserBaseHue: { value: trouserHue },
    uTrouserTargetHue: { value: trouserHue },
    uTrouserTargetSat: { value: 0.06 },
    uTrouserTargetVal: { value: 0.96 },
    uIsTrouserMesh: { value: isTrouserMesh ? 1.0 : 0.0 },
    // Triplanar Pattern Projection
    uPatternEnabled: { value: 0.0 },
    uPatternMap: { value: defaultPatternTex },
    uPatternScale: { value: 1.2 },
    uPatternRotation: { value: 0.0 },
    uPatternStrength: { value: 0.55 },
    uPatternColor: { value: new THREE.Color('#D4AF37') },
    // Smooth PBR Cloth Anti-Plastic Uniforms
    uClothRoughness: { value: Math.max(0.65, fabricSpec.roughness) },
    uClothSheen: { value: fabricSpec.sheen ?? 0.5 },
    uClothSheenRoughness: { value: fabricSpec.sheenRoughness ?? 0.6 },
    uClothAnisotropy: { value: fabricSpec.anisotropy ?? 0.45 },
    uClothAnisotropyRotation: { value: fabricSpec.anisotropyRotation ?? 0.0 },
    uSpecularAttenuation: { value: fabricSpec.specularAttenuation ?? 0.22 },
    // Subtle Brocade & Weave Displacement Mapping Uniforms
    uDisplacementMap: { value: defaultDispTex },
    uDisplacementScale: {
      value: isTrouserMesh
        ? dispParams.displacementScale * 0.45
        : dispParams.displacementScale,
    },
    uDisplacementBias: {
      value: isTrouserMesh
        ? dispParams.displacementBias * 0.45
        : dispParams.displacementBias,
    },
    uWeaveRepeatUV: { value: new THREE.Vector2(repeatUV[0], repeatUV[1]) },
    uBrocadeReliefStrength: {
      value: isTrouserMesh
        ? dispParams.brocadeReliefStrength * 0.42
        : dispParams.brocadeReliefStrength,
    },
    uNormalScale: {
      value: isTrouserMesh
        ? new THREE.Vector2(0.74, 0.74)
        : new THREE.Vector2(
            dispParams.boostedNormalScale[0],
            dispParams.boostedNormalScale[1]
          ),
    },
    uEnvMapIntensity: {
      value: isTrouserMesh ? 0.85 : dispParams.envMapIntensity,
    },
    uOuterHemMaskY: { value: 0.24 },
    uHideClippedLowerMesh: { value: 1.0 },
    uIsShortBottom: { value: 0.0 },
    uShortBottomHemY: { value: 0.62 },
  };

  material.userData.recolorUniforms = uniforms;
  material.customProgramCacheKey = () =>
    `vstylist_pbr_disp_v11_${isTrouserMesh ? 'trouser' : 'tunic'}`;

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRecolorEnabled = uniforms.uRecolorEnabled;
    shader.uniforms.uBaseHue = uniforms.uBaseHue;
    shader.uniforms.uTargetHue = uniforms.uTargetHue;
    shader.uniforms.uTargetSat = uniforms.uTargetSat;
    shader.uniforms.uTargetVal = uniforms.uTargetVal;
    shader.uniforms.uHueTolerance = uniforms.uHueTolerance;
    shader.uniforms.uMinSaturation = uniforms.uMinSaturation;
    shader.uniforms.uEnableTrouserKey = uniforms.uEnableTrouserKey;
    shader.uniforms.uTrouserBaseHue = uniforms.uTrouserBaseHue;
    shader.uniforms.uTrouserTargetHue = uniforms.uTrouserTargetHue;
    shader.uniforms.uTrouserTargetSat = uniforms.uTrouserTargetSat;
    shader.uniforms.uTrouserTargetVal = uniforms.uTrouserTargetVal;
    shader.uniforms.uIsTrouserMesh = uniforms.uIsTrouserMesh;
    shader.uniforms.uPatternEnabled = uniforms.uPatternEnabled;
    shader.uniforms.uPatternMap = uniforms.uPatternMap;
    shader.uniforms.uPatternScale = uniforms.uPatternScale;
    shader.uniforms.uPatternRotation = uniforms.uPatternRotation;
    shader.uniforms.uPatternStrength = uniforms.uPatternStrength;
    shader.uniforms.uPatternColor = uniforms.uPatternColor;
    shader.uniforms.uClothRoughness = uniforms.uClothRoughness;
    shader.uniforms.uClothSheen = uniforms.uClothSheen;
    shader.uniforms.uClothSheenRoughness = uniforms.uClothSheenRoughness;
    shader.uniforms.uClothAnisotropy = uniforms.uClothAnisotropy;
    shader.uniforms.uClothAnisotropyRotation = uniforms.uClothAnisotropyRotation;
    shader.uniforms.uSpecularAttenuation = uniforms.uSpecularAttenuation;
    shader.uniforms.uDisplacementMap = uniforms.uDisplacementMap;
    shader.uniforms.uDisplacementScale = uniforms.uDisplacementScale;
    shader.uniforms.uDisplacementBias = uniforms.uDisplacementBias;
    shader.uniforms.uWeaveRepeatUV = uniforms.uWeaveRepeatUV;
    shader.uniforms.uBrocadeReliefStrength = uniforms.uBrocadeReliefStrength;
    shader.uniforms.uNormalScale = uniforms.uNormalScale;
    shader.uniforms.uEnvMapIntensity = uniforms.uEnvMapIntensity;
    shader.uniforms.uOuterHemMaskY = uniforms.uOuterHemMaskY;
    shader.uniforms.uHideClippedLowerMesh = uniforms.uHideClippedLowerMesh;
    shader.uniforms.uIsShortBottom = uniforms.uIsShortBottom;
    shader.uniforms.uShortBottomHemY = uniforms.uShortBottomHemY;

    // Pass object-space position/normal and normalized world-space Y (0..1.75m) without splitting UV/normal seams
    shader.vertexShader =
      `
      varying vec3 vVpObjPos;
      varying vec3 vVpObjNormal;
      varying float vVpWorldY;
      ` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      vVpObjPos = position;
      vVpObjNormal = normal;
      vVpWorldY = (modelMatrix * vec4(transformed, 1.0)).y;
      `
    );

    shader.fragmentShader =
      `
      varying vec3 vVpObjPos;
      varying vec3 vVpObjNormal;
      varying float vVpWorldY;
      uniform float uRecolorEnabled;
      uniform float uBaseHue;
      uniform float uTargetHue;
      uniform float uTargetSat;
      uniform float uTargetVal;
      uniform float uHueTolerance;
      uniform float uMinSaturation;
      uniform float uEnableTrouserKey;
      uniform float uTrouserBaseHue;
      uniform float uTrouserTargetHue;
      uniform float uTrouserTargetSat;
      uniform float uTrouserTargetVal;
      uniform float uIsTrouserMesh;
      uniform float uPatternEnabled;
      uniform sampler2D uPatternMap;
      uniform float uPatternScale;
      uniform float uPatternRotation;
      uniform float uPatternStrength;
      uniform vec3 uPatternColor;
      uniform float uClothRoughness;
      uniform float uClothSheen;
      uniform float uClothSheenRoughness;
      uniform float uClothAnisotropy;
      uniform float uClothAnisotropyRotation;
      uniform float uSpecularAttenuation;
      uniform sampler2D uDisplacementMap;
      uniform float uDisplacementScale;
      uniform float uDisplacementBias;
      uniform vec2 uWeaveRepeatUV;
      uniform float uBrocadeReliefStrength;
      uniform vec2 uNormalScale;
      uniform float uEnvMapIntensity;
      uniform float uOuterHemMaskY;
      uniform float uHideClippedLowerMesh;
      uniform float uIsShortBottom;
      uniform float uShortBottomHemY;

      vec3 vstylist_rgb2hsv(vec3 c) {
        vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
        vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
        float d = q.x - min(q.w, q.y);
        float e = 1.0e-10;
        return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
      }

      vec3 vstylist_hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }

      vec2 vstylist_rotateUV(vec2 uv, float rad) {
        float c = cos(rad);
        float s = sin(rad);
        return vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
      }

      float vstylist_sampleTriplanarPattern(vec3 objPos, vec3 objNorm, float scale, float rotRad) {
        vec3 blend = abs(normalize(objNorm));
        blend = max(blend - 0.2, 0.0);
        blend /= max(blend.x + blend.y + blend.z, 1e-5);

        vec3 scaledP = objPos * (2.6 / max(0.25, scale));
        vec2 uvX = vstylist_rotateUV(scaledP.zy, rotRad);
        vec2 uvY = vstylist_rotateUV(scaledP.xz, rotRad);
        vec2 uvZ = vstylist_rotateUV(scaledP.xy, rotRad);

        float pX = texture2D(uPatternMap, uvX).r;
        float pY = texture2D(uPatternMap, uvY).r;
        float pZ = texture2D(uPatternMap, uvZ).r;
        return pX * blend.x + pY * blend.y + pZ * blend.z;
      }

      // Triplanar Brocade Weave Height Sampler from uDisplacementMap
      float vstylist_sampleTriplanarWeaveHeight(vec3 objPos, vec3 objNorm, vec2 repeatUV) {
        vec3 blend = abs(normalize(objNorm));
        blend = max(blend - 0.2, 0.0);
        blend /= max(blend.x + blend.y + blend.z, 1e-5);

        vec3 scaledP = objPos * (repeatUV.x * 0.42);
        float wX = texture2D(uDisplacementMap, scaledP.zy).r;
        float wY = texture2D(uDisplacementMap, scaledP.xz).r;
        float wZ = texture2D(uDisplacementMap, scaledP.xy).r;
        return wX * blend.x + wY * blend.y + wZ * blend.z;
      }

      // Subtle Brocade Weave Displacement Mapping (Parallax Relief + Finite-Difference Thread Slope Gradient)
      float vstylist_sampleBrocadeDisplacement(
        vec3 objPos,
        vec3 objNorm,
        vec3 viewDir,
        vec2 repeatUV,
        float dispScale,
        float reliefStrength,
        out vec2 outWeaveGrad
      ) {
        float h0 = vstylist_sampleTriplanarWeaveHeight(objPos, objNorm, repeatUV);
        vec3 parallaxPos = objPos + viewDir * ((h0 - 0.5) * dispScale * 2.2);
        float eps = 0.0016;
        float hC = vstylist_sampleTriplanarWeaveHeight(parallaxPos, objNorm, repeatUV);
        float hR = vstylist_sampleTriplanarWeaveHeight(parallaxPos + vec3(eps, 0.0, eps * 0.35), objNorm, repeatUV);
        float hU = vstylist_sampleTriplanarWeaveHeight(parallaxPos + vec3(0.0, eps, 0.0), objNorm, repeatUV);
        outWeaveGrad = vec2(hR - hC, hU - hC) * (2.8 * reliefStrength);
        return hC;
      }

      // Silk Motif Depth-Mapping: computes parallax relief offset and 2D height gradient (dMotif/du, dMotif/dv)
      float vstylist_sampleMotifDepthMap(
        vec3 objPos,
        vec3 objNorm,
        vec3 viewDir,
        float scale,
        float rotRad,
        float strength,
        out vec2 outHeightGrad
      ) {
        float h0 = vstylist_sampleTriplanarPattern(objPos, objNorm, scale, rotRad);
        // Parallax offset along view vector for 3D woven thread depth
        vec3 parallaxP = objPos + viewDir * ((h0 - 0.5) * 0.0085 * strength);
        float eps = 0.0035 * max(0.35, scale);
        float hCenter = vstylist_sampleTriplanarPattern(parallaxP, objNorm, scale, rotRad);
        float hRight = vstylist_sampleTriplanarPattern(parallaxP + vec3(eps, 0.0, eps * 0.5), objNorm, scale, rotRad);
        float hUp = vstylist_sampleTriplanarPattern(parallaxP + vec3(0.0, eps, 0.0), objNorm, scale, rotRad);
        outHeightGrad = vec2(hRight - hCenter, hUp - hCenter) * (3.6 * strength);
        return hCenter;
      }

      float vpActiveMotifHeight = 0.0;
      vec2 vpActiveMotifGrad = vec2(0.0);
      float vpActiveWeaveHeight = 0.5;
      vec2 vpActiveWeaveGrad = vec2(0.0);
      ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `
      #include <map_fragment>
      {
        vec3 hsv = vstylist_rgb2hsv(diffuseColor.rgb);
        float origV = clamp(hsv.z, 0.02, 0.99);
        // Smooth ankle & shoe protection mask in normalized world height (shoes sit at vVpWorldY < 0.135m)
        float vpAnkleShoeMask = smoothstep(0.115, 0.155, vVpWorldY);
        float isDefaultWhiteTrouserTarget = step(0.90, uTrouserTargetVal) * step(uTrouserTargetSat, 0.10);

        if (uIsTrouserMesh > 0.5) {
          // Hierarchical bone mask: hide separate lower-garment mesh fragments above the active outer garment hemline
          if (uHideClippedLowerMesh > 0.5 && vVpWorldY > uOuterHemMaskY + 0.015) {
            discard;
          }
          if (uIsShortBottom > 0.5 && vpAnkleShoeMask > 0.01 && vVpWorldY < uShortBottomHemY) {
            // Below short jeans / miniskirt hemline (and when outer tunic is longer than shorts),
            // expose natural 3D cylindrical human thigh/calf skin instead of long trousers!
            float cylN = clamp(abs(normalize(vVpObjNormal).z) * 0.55 + 0.45, 0.45, 1.0);
            float hemShadow = smoothstep(uOuterHemMaskY - 0.055, uOuterHemMaskY, vVpWorldY);
            float skinShade = (0.76 + 0.24 * cylN) * (1.0 - 0.14 * hemShadow);
            vec3 bareSkinRgb = vec3(0.91, 0.75, 0.65) * skinShade;
            diffuseColor.rgb = mix(diffuseColor.rgb, bareSkinRgb, vpAnkleShoeMask);
          } else if (uEnableTrouserKey > 0.5 && isDefaultWhiteTrouserTarget < 0.5 && vpAnkleShoeMask > 0.01) {
            float newSat = clamp(uTrouserTargetSat, 0.0, 1.0);
            float tRawRatio = origV / 0.78;
            float isLightTrouser = step(0.78, uTrouserTargetVal) * step(uTrouserTargetSat, 0.28);
            float tShade = mix(
              clamp(pow(max(tRawRatio, 0.22), 0.92), 0.34, 1.08),
              clamp(0.84 + 0.16 * pow(max(tRawRatio, 0.18), 0.52), 0.84, 1.03),
              isLightTrouser
            );
            float newVal = clamp(uTrouserTargetVal * tShade, 0.04, 0.99);
            vec3 tRecolored = vstylist_hsv2rgb(vec3(uTrouserTargetHue, newSat, newVal));
            diffuseColor.rgb = mix(diffuseColor.rgb, tRecolored, vpAnkleShoeMask);
          }
        } else {
          // Primary costume hue-key with fwidth() screen-space edge anti-aliasing so Áo vs Quần boundary has zero jagged pixel steps
          float hueDiff = abs(hsv.x - uBaseHue);
          hueDiff = min(hueDiff, 1.0 - hueDiff);
          float hueEdgeAA = max(fwidth(hueDiff) * 1.35, 0.014);
          float satEdgeAA = max(fwidth(hsv.y) * 1.35, 0.022);
          float hueMask = 1.0 - smoothstep(uHueTolerance - hueEdgeAA, uHueTolerance + hueEdgeAA, hueDiff);
          float satMask = smoothstep(uMinSaturation - satEdgeAA, uMinSaturation + satEdgeAA, hsv.y);
          float feather = hueMask * satMask;

          if (uRecolorEnabled > 0.5 && feather > 0.005) {
            float targetS = clamp(uTargetSat, 0.0, 1.0);
            float rawRatio = origV / 0.46;
            float isLightTarget = step(0.78, uTargetVal) * step(uTargetSat, 0.28);
            float shadeRatio = mix(
              clamp(pow(max(rawRatio, 0.14), 0.86), 0.24, 1.14),
              clamp(0.80 + 0.20 * pow(max(rawRatio, 0.12), 0.52), 0.80, 1.05),
              isLightTarget
            );
            float targetV = clamp(uTargetVal * shadeRatio, 0.04, 0.99);
            vec3 recolored = vstylist_hsv2rgb(vec3(uTargetHue, targetS, targetV));

            // Evaluate Subtle Brocade Weave Displacement Mapping (raised thread crowns + micro-cavity self-shadowing)
            vec2 weaveGrad = vec2(0.0);
            float weaveH = vstylist_sampleBrocadeDisplacement(
              vVpObjPos,
              vVpObjNormal,
              normalize(vViewPosition),
              uWeaveRepeatUV,
              uDisplacementScale,
              uBrocadeReliefStrength,
              weaveGrad
            );
            vpActiveWeaveHeight = mix(0.5, weaveH, feather);
            vpActiveWeaveGrad = weaveGrad * feather;
            float brocadeBevel = clamp(
              1.0 + (weaveGrad.x * 0.36 - weaveGrad.y * 0.44) + (weaveH - 0.5) * 0.14 * uBrocadeReliefStrength,
              0.84,
              1.18
            );
            diffuseColor.rgb = mix(diffuseColor.rgb, recolored * brocadeBevel, feather);

            // Triplanar pattern with Silk Depth-Mapping (embossed thread relief + self-shadow bevel)
            if (uPatternEnabled > 0.5 && uPatternStrength > 0.01) {
              vec2 motifGrad = vec2(0.0);
              float patMask = vstylist_sampleMotifDepthMap(
                vVpObjPos,
                vVpObjNormal,
                normalize(vViewPosition),
                uPatternScale,
                uPatternRotation,
                uPatternStrength,
                motifGrad
              );
              vpActiveMotifHeight = patMask * feather;
              vpActiveMotifGrad = motifGrad * feather;

              // Embossed silk thread bevel lighting (top-left catchlight, bottom-right micro-shadow)
              float threadBevel = clamp(1.0 + (motifGrad.x * 0.58 - motifGrad.y * 0.72), 0.74, 1.28);
              float patAlpha = clamp(patMask * uPatternStrength * feather, 0.0, 1.0);
              vec3 patTinted = uPatternColor * (targetV * threadBevel);
              diffuseColor.rgb = mix(diffuseColor.rgb, patTinted, patAlpha);
            }
          } else if (
            uEnableTrouserKey > 0.5 &&
            (isDefaultWhiteTrouserTarget < 0.5 || uIsShortBottom > 0.5) &&
            vpAnkleShoeMask > 0.01 &&
            vVpWorldY <= 0.82
          ) {
            // Smoothly identify white/ivory silk trouser regions on unified GLB meshes without touching dark/warm shoes
            float whiteSilkMask =
              (1.0 - smoothstep(0.14, 0.24, hsv.y)) *
              smoothstep(0.46, 0.62, origV);
            float upperHemFade = 1.0 - smoothstep(0.72, 0.82, vVpWorldY);
            float tFeather = clamp(whiteSilkMask * vpAnkleShoeMask * upperHemFade * (1.0 - feather), 0.0, 1.0);
            if (tFeather > 0.005) {
              if (uIsShortBottom > 0.5 && vVpWorldY < uShortBottomHemY) {
                float cylN = clamp(abs(normalize(vVpObjNormal).z) * 0.55 + 0.45, 0.45, 1.0);
                vec3 bareSkinRgb = vec3(0.91, 0.75, 0.65) * (0.76 + 0.24 * cylN);
                diffuseColor.rgb = mix(diffuseColor.rgb, bareSkinRgb, tFeather);
              } else {
                float tSat = clamp(uTrouserTargetSat, 0.0, 1.0);
                float tRawRatio = origV / 0.82;
                float isLightTrouser = step(0.78, uTrouserTargetVal) * step(uTrouserTargetSat, 0.28);
                float tShade = mix(
                  clamp(pow(max(tRawRatio, 0.24), 0.90), 0.36, 1.08),
                  clamp(0.84 + 0.16 * pow(max(tRawRatio, 0.18), 0.52), 0.84, 1.03),
                  isLightTrouser
                );
                float tVal = clamp(uTrouserTargetVal * tShade, 0.04, 0.99);
                vec3 tRecolored = vstylist_hsv2rgb(vec3(uTrouserTargetHue, tSat, tVal));
                diffuseColor.rgb = mix(diffuseColor.rgb, tRecolored, tFeather);
              }
            }
          }
        }
      }
      `
    );

    // Smooth roughness map evaluation + Toksvig Geometric Specular Anti-Aliasing on trouser & cloth surfaces
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `
      #include <roughnessmap_fragment>
      {
        float vpMinRough = uIsTrouserMesh > 0.5 ? 0.48 : 0.65;
        float vpTargetRough = max(uClothRoughness, vpMinRough);
        roughnessFactor = mix(vpTargetRough, max(roughnessFactor, vpTargetRough * 0.92), 0.55);
        roughnessFactor = clamp(roughnessFactor, vpMinRough, 0.97);
      }
      `
    );

    // Smooth PBR Cloth Roughness, Sheen, Boosted Normal Scale, Environment Intensity & Mesh-Junction Continuity
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_physical_fragment>',
      `
      #include <lights_physical_fragment>
      {
        vec3 vpViewDir = normalize(vViewPosition);
        // Continuous analytical tangent basis (zero dFdx quad-stepping at mesh seams or silhouettes)
        vec3 vpUpRef = abs(normal.y) < 0.992 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
        vec3 vpBaseT = normalize(cross(vpUpRef, normal));
        vec3 vpBaseB = normalize(cross(normal, vpBaseT));

        // Smooth mesh-junction transition weight across ankle/shoe cuff (0.115..0.175m) and hemline/waist seams
        float vpAnkleJunction = smoothstep(0.112, 0.172, vVpWorldY);
        float vpHemJunction = 1.0 - 0.18 * exp(-pow((vVpWorldY - uOuterHemMaskY) / 0.065, 2.0));
        float vpJunctionSmooth = clamp(vpAnkleJunction * vpHemJunction, 0.0, 1.0);

        // Apply boosted uNormalScale to weave & motif normal perturbation for rich, continuous micro-relief across seams
        vec2 vpEffectiveNormalScale = mix(vec2(0.72), uNormalScale, vpJunctionSmooth);
        vec2 vpTotalDispGrad =
          (vpActiveWeaveGrad * uBrocadeReliefStrength + vpActiveMotifGrad * 0.48) *
          vpEffectiveNormalScale;
        if (length(vpTotalDispGrad) > 1e-4) {
          normal = normalize(normal - (vpBaseT * vpTotalDispGrad.x + vpBaseB * vpTotalDispGrad.y));
        }

        // Raised Brocade Thread Crown factor (0 = recessed binder intersection, 1 = raised brocade float crown)
        float vpThreadCrown = smoothstep(0.38, 0.72, vpActiveWeaveHeight);
        float vpCavityAO = mix(1.0 - 0.12 * uBrocadeReliefStrength, 1.0 + 0.08 * uBrocadeReliefStrength, vpThreadCrown);

        float vpNdotV = clamp(abs(dot(normal, vpViewDir)), 0.001, 1.0);
        float vpGrazing = 1.0 - vpNdotV;
        float vpSmoothGrazing = smoothstep(0.0, 1.0, vpGrazing);

        // Toksvig / Kaplanyan Geometric Specular Anti-Aliasing: eliminates normal-map aliasing & sparkling pixels on trouser folds
        vec3 vpNdx = dFdx(normal);
        vec3 vpNdy = dFdy(normal);
        float vpKernelRoughness2 = min(2.0 * (dot(vpNdx, vpNdx) + dot(vpNdy, vpNdy)), 0.32);

        float vpCosRot = cos(uClothAnisotropyRotation);
        float vpSinRot = sin(uClothAnisotropyRotation);
        vec3 vpFiberT = normalize(vpBaseT * vpCosRot + vpBaseB * vpSinRot);
        vec3 vpFiberB = normalize(vpBaseB * vpCosRot - vpBaseT * vpSinRot);

        float vpTdotV = dot(vpFiberT, vpViewDir);
        float vpAnisoComb = clamp(1.0 - vpTdotV * vpTdotV, 0.0, 1.0);
        float vpAnisoStrength = clamp(uClothAnisotropy, 0.0, 0.92);
        float vpAnisoSpread = mix(1.0, sqrt(vpAnisoComb), vpAnisoStrength);

        float vpMinRough = uIsTrouserMesh > 0.5 ? 0.48 : 0.65;
        float vpBaseRough = max(uClothRoughness, vpMinRough);
        float vpAnisoRoughMod = (1.0 - vpAnisoSpread) * vpAnisoStrength * 0.11;
        float vpHorizonRoughMod = vpSmoothGrazing * 0.08;
        float vpMergedRough2 = pow2(mix(material.roughness, vpBaseRough, 0.65)) + vpKernelRoughness2;
        material.roughness = clamp(
          sqrt(vpMergedRough2) + vpAnisoRoughMod + vpHorizonRoughMod,
          vpMinRough,
          0.97
        );

        #ifdef USE_ANISOTROPY
          material.anisotropy = vpAnisoStrength;
          material.alphaT = mix(pow2(material.roughness), 1.0, pow2(vpAnisoStrength));
          material.anisotropyT = vpFiberT;
          material.anisotropyB = vpFiberB;
        #endif

        float vpDielectricDamp = clamp(
          1.0 - uSpecularAttenuation * (0.72 + 0.28 * vpSmoothGrazing),
          0.18,
          0.86
        );
        // Raised brocade threads (vpThreadCrown) reflect crisper micro-specular catchlights while recessed cavities self-shadow
        float vpBrocadeCrownReflect = mix(0.84, 1.24, vpThreadCrown * clamp(uBrocadeReliefStrength, 0.25, 1.0));
        float vpFiberSpecMod = (0.74 + 0.26 * vpAnisoSpread) * vpBrocadeCrownReflect * vpCavityAO;
        material.specularColor *= vpDielectricDamp * vpFiberSpecMod;
        material.specularColorBlended *= vpDielectricDamp * vpFiberSpecMod;
        material.specularF90 = clamp(
          material.specularF90 * vpDielectricDamp * vpBrocadeCrownReflect * (1.0 - 0.34 * vpSmoothGrazing),
          0.12,
          0.74
        );

        #ifdef USE_SHEEN
          vec3 vpWarmSilk = vec3(1.0, 0.975, 0.93);
          vec3 vpDyeTint = mix(clamp(diffuseColor.rgb, vec3(0.06), vec3(0.96)), vpWarmSilk, 0.42);
          float vpSheenHorizon = smoothstep(0.0, 0.22, vpNdotV) * (0.76 + 0.24 * vpAnisoSpread) * mix(0.88, 1.18, vpThreadCrown);
          material.sheenColor = vpDyeTint * clamp(uClothSheen, 0.15, 0.88) * vpSheenHorizon;
          material.sheenRoughness = clamp(
            mix(uClothSheenRoughness, material.roughness, 0.34) + 0.05 * (1.0 - vpAnisoSpread) - 0.04 * vpThreadCrown,
            0.44,
            0.92
          );
        #endif
      }
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <aomap_fragment>',
      `
      reflectedLight.directSpecular = reflectedLight.directSpecular / (1.0 + reflectedLight.directSpecular * (1.35 + uSpecularAttenuation));
      #include <aomap_fragment>
      {
        // Calibrated Environment Intensity across mesh junctions to unify IBL reflections between tunic, trousers & footwear
        float vpJunctionEnvSmooth = smoothstep(0.112, 0.172, vVpWorldY);
        float vpEnvIntensity = mix(0.76, clamp(uEnvMapIntensity, 0.45, 1.25), vpJunctionEnvSmooth);
        reflectedLight.indirectSpecular *= vpEnvIntensity * (0.88 + 0.12 * (1.0 - material.roughness));
        reflectedLight.indirectDiffuse *= mix(0.94, 1.08, (vpEnvIntensity - 0.5) * 1.2);
      }
      `
    );
  };

  return uniforms;
}

function configureModelMaterialsAndRecolor(
  root: THREE.Group,
  fabricMaterialId: FabricMaterialId,
  maxAnisotropy: number
): {
  recolorUniformSets: HueKeyRecolorUniforms[];
  clothMaterials: {
    mat: THREE.MeshPhysicalMaterial;
    hasNativeNormalMap: boolean;
  }[];
  calibratedBaseHueDeg: number;
  calibratedTrouserHueDeg: number;
} {
  const anisotropyLevel = Math.max(8, Math.min(maxAnisotropy || 8, 16));
  const fabricSpec = getFabricMaterialSpec(fabricMaterialId);
  const fallbackWeaveNormalMap = getOrCreateFabricWeaveNormalMap(
    fabricSpec,
    anisotropyLevel
  );

  const recolorUniformSets: HueKeyRecolorUniforms[] = [];
  const clothMaterials: {
    mat: THREE.MeshPhysicalMaterial;
    hasNativeNormalMap: boolean;
  }[] = [];
  let detectedPrimaryHue = 170 / 360;
  let detectedTrouserHue = 40 / 360;
  let calibratedOnce = false;

  const enhanceTexture = (
    tex: THREE.Texture | null | undefined,
    isColorMap = false
  ) => {
    if (!tex) return;
    tex.anisotropy = anisotropyLevel;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    if (isColorMap) {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    tex.needsUpdate = true;
  };

  const defaultTrouserNormalMap = getOrCreateTrouserPbrNormalMap(
    'quan-lua-trang',
    anisotropyLevel
  );
  const defaultTrouserPbr = getTrouserPbrProfile('quan-lua-trang');

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Recompute smooth vertex normals if missing or flat-shaded to eliminate polygon facet edges on trousers
    if (mesh.geometry && !mesh.geometry.attributes.normal) {
      mesh.geometry.computeVertexNormals();
    }

    const meshNameLower = (mesh.name || '').toLowerCase();
    const isButtonMesh = meshNameLower.includes('button');
    const isTrouserMesh =
      meshNameLower.includes('trouser') ||
      meshNameLower.includes('pant') ||
      meshNameLower.includes('quan') ||
      meshNameLower.includes('skirt') ||
      meshNameLower.includes('thuong') ||
      meshNameLower.includes('bottom');
    const isSkinOrHairOrEye =
      meshNameLower.includes('head') ||
      meshNameLower.includes('face') ||
      meshNameLower.includes('skin') ||
      meshNameLower.includes('body') ||
      meshNameLower.includes('hand') ||
      meshNameLower.includes('hair') ||
      meshNameLower.includes('eye') ||
      meshNameLower.includes('teeth') ||
      meshNameLower.includes('shoe') ||
      meshNameLower.includes('boot') ||
      meshNameLower.includes('footwear') ||
      meshNameLower.includes('giay') ||
      meshNameLower.includes('guoc') ||
      meshNameLower.includes('dep') ||
      meshNameLower.includes('slipper') ||
      meshNameLower.includes('sandal') ||
      meshNameLower.includes('foot');

    const origMaterials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];

    const upgradedMaterials = origMaterials.map((origMat) => {
      if (!origMat) return origMat;
      const stdMat = origMat as THREE.MeshStandardMaterial;
      const matNameLower = (stdMat.name || '').toLowerCase();
      const isButton = isButtonMesh || matNameLower.includes('button');

      enhanceTexture(stdMat.map, true);
      enhanceTexture(stdMat.normalMap, false);
      enhanceTexture(stdMat.roughnessMap, false);
      enhanceTexture(stdMat.metalnessMap, false);
      enhanceTexture(stdMat.aoMap, false);
      enhanceTexture(stdMat.emissiveMap, true);
      enhanceTexture(stdMat.alphaMap, false);

      if (isButton) {
        // Metal ONLY for meshes whose name contains "button"
        const buttonMat = new THREE.MeshPhysicalMaterial({
          name: stdMat.name,
          color: stdMat.color
            ? stdMat.color.clone()
            : new THREE.Color(0xd4af37),
          map: stdMat.map || null,
          normalMap: stdMat.normalMap || null,
          normalScale: stdMat.normalScale
            ? stdMat.normalScale.clone()
            : new THREE.Vector2(1, 1),
          roughnessMap: stdMat.roughnessMap || null,
          metalnessMap: stdMat.metalnessMap || null,
          aoMap: stdMat.aoMap || null,
          roughness: Math.min(stdMat.roughness ?? 0.28, 0.35),
          metalness: Math.max(stdMat.metalness || 0.85, 0.8),
          side: stdMat.side,
        });
        return buttonMat;
      }

      const fabricDispParams = getFabricDisplacementParams(fabricSpec);
      const hasNativeNormalMap = Boolean(stdMat.normalMap);
      const activeNormalMap =
        stdMat.normalMap ||
        (isSkinOrHairOrEye
          ? null
          : isTrouserMesh
          ? defaultTrouserNormalMap
          : fallbackWeaveNormalMap);
      const nativeBoost = Math.max(1.15, fabricSpec.normalScale[0]);
      const activeNormalScale = hasNativeNormalMap
        ? stdMat.normalScale
          ? stdMat.normalScale.clone().multiplyScalar(nativeBoost)
          : new THREE.Vector2(nativeBoost, nativeBoost)
        : isTrouserMesh
        ? new THREE.Vector2(
            defaultTrouserPbr.normalScale[0],
            defaultTrouserPbr.normalScale[1]
          )
        : new THREE.Vector2(
            fabricDispParams.boostedNormalScale[0],
            fabricDispParams.boostedNormalScale[1]
          );
      const activeEnvMapIntensity = isSkinOrHairOrEye
        ? 0.74
        : isTrouserMesh
        ? defaultTrouserPbr.envMapIntensity
        : fabricDispParams.envMapIntensity;

      const physMat = new THREE.MeshPhysicalMaterial({
        name: stdMat.name,
        color: stdMat.color
          ? stdMat.color.clone()
          : new THREE.Color(0xffffff),
        map: stdMat.map || null,
        normalMap: activeNormalMap,
        normalScale: activeNormalScale,
        envMapIntensity: activeEnvMapIntensity,
        roughnessMap: stdMat.roughnessMap || null,
        aoMap: stdMat.aoMap || null,
        aoMapIntensity: stdMat.aoMapIntensity ?? 1.0,
        emissive: stdMat.emissive
          ? stdMat.emissive.clone()
          : new THREE.Color(0x000000),
        emissiveMap: stdMat.emissiveMap || null,
        emissiveIntensity: stdMat.emissiveIntensity ?? 1.0,
        alphaMap: stdMat.alphaMap || null,
        alphaTest: stdMat.alphaTest ?? 0,
        transparent: stdMat.transparent ?? false,
        opacity: stdMat.opacity ?? 1.0,
        side: stdMat.side,
        vertexColors: stdMat.vertexColors ?? false,
        roughness: isTrouserMesh
          ? defaultTrouserPbr.roughness
          : Math.max(
              stdMat.roughness ?? 0.68,
              fabricSpec.roughness,
              0.65
            ),
        metalness: isTrouserMesh ? defaultTrouserPbr.metalness : 0.0,
        clearcoat: 0.0,
        ior: isSkinOrHairOrEye ? 1.4 : 1.35,
        specularIntensity: isSkinOrHairOrEye
          ? 0.45
          : isTrouserMesh
          ? Math.max(0.25, 1.0 - defaultTrouserPbr.specularAttenuation)
          : Math.max(0.25, 1.0 - (fabricSpec.specularAttenuation ?? 0.22)),
        sheen: isSkinOrHairOrEye
          ? 0.15
          : isTrouserMesh
          ? defaultTrouserPbr.sheen
          : fabricSpec.sheen ?? 0.5,
        sheenRoughness: isTrouserMesh
          ? defaultTrouserPbr.sheenRoughness
          : fabricSpec.sheenRoughness ?? 0.6,
        sheenColor: new THREE.Color(0xfffaf2),
        anisotropy: isSkinOrHairOrEye
          ? 0.0
          : isTrouserMesh
          ? defaultTrouserPbr.anisotropy
          : fabricSpec.anisotropy ?? 0.45,
        anisotropyRotation: isSkinOrHairOrEye
          ? 0.0
          : isTrouserMesh
          ? defaultTrouserPbr.anisotropyRotation
          : fabricSpec.anisotropyRotation ?? 0.0,
      });

      if (!isSkinOrHairOrEye) {
        clothMaterials.push({ mat: physMat, hasNativeNormalMap });
        const calibrated = calibrateBaseHueFromTexture(
          physMat.map,
          physMat.color
        );
        if (!calibratedOnce && physMat.map) {
          detectedPrimaryHue = calibrated.baseHue;
          detectedTrouserHue = calibrated.trouserHue;
          calibratedOnce = true;
        }
        const uniformSet = attachHueKeyShaderToClothMaterial(
          physMat,
          calibrated.baseHue,
          calibrated.trouserHue,
          isTrouserMesh,
          fabricSpec
        );
        recolorUniformSets.push(uniformSet);
      }

      return physMat;
    });

    mesh.material = Array.isArray(mesh.material)
      ? upgradedMaterials
      : upgradedMaterials[0];
  });

  return {
    recolorUniformSets,
    clothMaterials,
    calibratedBaseHueDeg: Math.round(detectedPrimaryHue * 360),
    calibratedTrouserHueDeg: Math.round(detectedTrouserHue * 360),
  };
}

export function normalizeModelTo175m(model: THREE.Object3D): void {
  model.position.set(0, 0, 0);
  model.rotation.set(0, 0, 0);
  model.scale.set(1, 1, 1);
  model.updateMatrixWorld(true);

  const initialBox = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  initialBox.getSize(size);

  if (size.y > 0.0001) {
    const targetHeightMeters = 1.75;
    const scaleFactor = targetHeightMeters / size.y;
    model.scale.setScalar(scaleFactor);
    model.updateMatrixWorld(true);
  }

  const scaledBox = new THREE.Box3().setFromObject(model);
  const center = new THREE.Vector3();
  scaledBox.getCenter(center);

  model.position.x = -center.x;
  model.position.z = -center.z;
  model.position.y = -scaledBox.min.y;
  model.updateMatrixWorld(true);
}

/**
 * Resolves GLB binary buffer in priority order:
 * 1. `/public/models/{id}-{gender}.glb` from server
 * 2. User-loaded GLB from computer stored in IndexedDB (`getGlbFromIndexedDb`)
 */
async function resolveGlbBufferWithPriority(
  modelId: string,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<{ buffer: ArrayBuffer; isFromUserComputer: boolean } | null> {
  if (gltfBufferCache.has(modelId)) {
    onProgress?.(100);
    return gltfBufferCache.get(modelId)!;
  }

  // 1. Check IndexedDB first for instant local 0ms access (user-uploaded GLBs)
  const idbGlb = await getGlbFromIndexedDb(modelId);
  if (
    idbGlb &&
    idbGlb.buffer.byteLength >= 12 &&
    new DataView(idbGlb.buffer).getUint32(0, true) === 0x46546c67
  ) {
    const entry = { buffer: idbGlb.buffer, isFromUserComputer: true };
    gltfBufferCache.set(modelId, entry);
    onProgress?.(100);
    return entry;
  }

  // Built-in 360° photorealistic turnaround costumes do not ship static .glb files on the server;
  // skip the network probe so turnaround loading starts immediately with zero network latency.
  if (BUILTIN_TURNAROUND_SHEETS[modelId]) {
    knownMissingServerModelIds.add(modelId);
    return null;
  }

  // 2. Check /public/models/{id}-{gender}.glb on server if not known missing
  if (!knownMissingServerModelIds.has(modelId)) {
    try {
      const response = await fetch(`/models/${modelId}.glb`, {
        method: 'GET',
        headers: { Accept: 'model/gltf-binary,application/octet-stream,*/*' },
        signal,
      });

      if (
        response.status !== 204 &&
        response.ok &&
        response.headers.get('x-model-exists') !== 'false'
      ) {
        const contentType = (
          response.headers.get('content-type') || ''
        ).toLowerCase();
        if (
          !contentType.includes('text/html') &&
          !contentType.includes('application/json')
        ) {
          const contentLength = Number(
            response.headers.get('content-length') || 0
          );
          let buffer: ArrayBuffer;

          if (response.body && contentLength > 0) {
            const reader = response.body.getReader();
            const chunks: Uint8Array[] = [];
            let received = 0;

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) {
                chunks.push(value);
                received += value.byteLength;
                const pct = Math.min(
                  98,
                  Math.round((received / contentLength) * 100)
                );
                onProgress?.(pct);
              }
            }

            const merged = new Uint8Array(received);
            let offset = 0;
            for (const chunk of chunks) {
              merged.set(chunk, offset);
              offset += chunk.byteLength;
            }
            buffer = merged.buffer;
          } else {
            onProgress?.(50);
            buffer = await response.arrayBuffer();
          }

          if (
            buffer.byteLength >= 12 &&
            new DataView(buffer).getUint32(0, true) === 0x46546c67
          ) {
            const entry = { buffer, isFromUserComputer: false };
            gltfBufferCache.set(modelId, entry);
            onProgress?.(100);
            return entry;
          }
        }
      }
      knownMissingServerModelIds.add(modelId);
    } catch {
      // No server GLB found
    }
  }

  return null;
}

export async function loadSuppliedCostumeGlb(params: {
  costumeId: string;
  gender: 'male' | 'female';
  primaryHex: string;
  trouserHex?: string;
  enableTrouserKey?: boolean;
  patternId?: PatternId;
  hoaTietHex?: string;
  patternScale?: number;
  patternRotationDeg?: number;
  patternStrength?: number;
  fabricMaterialId?: FabricMaterialId;
  maxAnisotropy?: number;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}): Promise<CostumeLoadResult> {
  const {
    costumeId,
    gender,
    primaryHex,
    trouserHex = '#F5F1E8',
    enableTrouserKey = false,
    patternId = 'none',
    hoaTietHex = '#D4AF37',
    patternScale = 1.2,
    patternRotationDeg = 0,
    patternStrength = 0.55,
    fabricMaterialId = 'lua-ha-dong',
    maxAnisotropy = 8,
    onProgress,
    signal,
  } = params;

  const modelId = `${costumeId}-${gender}`;
  const expectedGlbPath = `/public/models/${modelId}.glb`;
  const expectedPosterPath = `/public/models/${modelId}.jpg`;

  onProgress?.(8);

  const resolved = await resolveGlbBufferWithPriority(
    modelId,
    onProgress,
    signal
  );

  if (!resolved) {
    return {
      status: 'missing',
      modelId,
      expectedGlbPath,
      expectedPosterPath,
    };
  }

  const loader = getConfiguredGltfLoader();

  let gltf: GLTF;
  try {
    gltf = await new Promise<GLTF>((resolve, reject) => {
      loader.parse(resolved.buffer.slice(0), '/models/', resolve, reject);
    });
  } catch {
    return {
      status: 'missing',
      modelId,
      expectedGlbPath,
      expectedPosterPath,
    };
  }

  const clonedScene = SkeletonUtils.clone(gltf.scene) as THREE.Group;

  // Normalize bounding box: scale to 1.75 m tall, center X/Z, feet at y = 0
  normalizeModelTo175m(clonedScene);
  clonedScene.updateMatrixWorld(true);

  // Measure exact 3D anatomical anchors (Head Cranium, Face Surface Z, Crown Y, Neck, Shoulders, Hips, Feet)
  // directly from the normalized 3D mesh & skeleton so Hair, Expressions & 3D Accessories fit 100% accurately!
  let headBone: THREE.Object3D | null = null;
  let chestBone: THREE.Object3D | null = null;
  let headMinX = Infinity;
  let headMaxX = -Infinity;
  let headMinY = Infinity;
  let headMaxY = -Infinity;
  let headMinZ = Infinity;
  let headMaxZ = -Infinity;
  let faceMaxZ = -Infinity;
  let chestSumX = 0;
  let chestSumY = 0;
  let chestSumZ = 0;
  let chestCount = 0;
  let shoulderMinX = Infinity;
  let shoulderMaxX = -Infinity;
  let hipMinX = Infinity;
  let hipMaxX = -Infinity;
  let leftFootSumX = 0;
  let leftFootSumZ = 0;
  let leftFootCount = 0;
  let rightFootSumX = 0;
  let rightFootSumZ = 0;
  let rightFootCount = 0;

  const tmpV = new THREE.Vector3();
  clonedScene.traverse((obj) => {
    const nLower = (obj.name || '').toLowerCase();
    if (((obj as THREE.Bone).isBone || obj.type === 'Bone')) {
      if (
        !headBone &&
        (nLower.includes('head') || nLower.includes('neck') || nLower.includes('dau')) &&
        !nLower.includes('top') &&
        !nLower.includes('end')
      ) {
        headBone = obj;
      }
      if (
        !chestBone &&
        (nLower.includes('chest') ||
          nLower.includes('upperchest') ||
          nLower.includes('spine2') ||
          nLower.includes('spine1') ||
          nLower.includes('spine_02') ||
          nLower.includes('spine_03') ||
          nLower.includes('thorax') ||
          nLower.includes('nguc'))
      ) {
        chestBone = obj;
      }
    }

    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const posAttr = mesh.geometry.attributes.position;
    if (!posAttr) return;

    const step = Math.max(1, Math.floor(posAttr.count / 1200));
    for (let i = 0; i < posAttr.count; i += step) {
      tmpV.fromBufferAttribute(posAttr, i).applyMatrix4(mesh.matrixWorld);
      const vx = tmpV.x;
      const vy = tmpV.y;
      const vz = tmpV.z;

      // Head cranium slice (1.49m .. 1.75m)
      if (vy >= 1.49 && vy <= 1.75 && Math.abs(vx) < 0.24) {
        if (vx < headMinX) headMinX = vx;
        if (vx > headMaxX) headMaxX = vx;
        if (vy < headMinY) headMinY = vy;
        if (vy > headMaxY) headMaxY = vy;
        if (vz < headMinZ) headMinZ = vz;
        if (vz > headMaxZ) headMaxZ = vz;
      }
      // Upper chest / sternum slice (1.12m .. 1.38m)
      if (vy >= 1.12 && vy <= 1.38 && Math.abs(vx) < 0.22) {
        chestSumX += vx;
        chestSumY += vy;
        chestSumZ += vz;
        chestCount++;
      }
      // Face front surface slice (eye/nose/mouth height: 1.52m .. 1.64m, central X)
      if (vy >= 1.52 && vy <= 1.64 && Math.abs(vx) < 0.065) {
        if (vz > faceMaxZ) faceMaxZ = vz;
      }
      // Shoulder slice (1.33m .. 1.44m)
      if (vy >= 1.33 && vy <= 1.44 && Math.abs(vx) < 0.32) {
        if (vx < shoulderMinX) shoulderMinX = vx;
        if (vx > shoulderMaxX) shoulderMaxX = vx;
      }
      // Hip slice (0.76m .. 0.96m)
      if (vy >= 0.76 && vy <= 0.96 && Math.abs(vx) < 0.28) {
        if (vx < hipMinX) hipMinX = vx;
        if (vx > hipMaxX) hipMaxX = vx;
      }
      // Foot slice (0.0m .. 0.11m)
      if (vy >= 0.0 && vy <= 0.11 && Math.abs(vx) < 0.25) {
        if (vx < -0.01) {
          leftFootSumX += vx;
          leftFootSumZ += vz;
          leftFootCount++;
        } else if (vx > 0.01) {
          rightFootSumX += vx;
          rightFootSumZ += vz;
          rightFootCount++;
        }
      }
    }
  });

  const headCenterX =
    headMaxX > headMinX ? (headMinX + headMaxX) * 0.5 : 0;
  const headCenterY =
    headMaxY > headMinY ? (headMinY + headMaxY) * 0.5 : 1.59;
  const headCenterZ =
    headMaxZ > headMinZ ? (headMinZ + headMaxZ) * 0.5 : 0.0;
  const headRadiusX =
    headMaxX > headMinX
      ? Math.max(0.068, Math.min(0.115, (headMaxX - headMinX) * 0.5))
      : 0.082;
  const headRadiusY =
    headMaxY > headMinY
      ? Math.max(0.085, Math.min(0.135, (headMaxY - headMinY) * 0.5))
      : 0.105;
  const headRadiusZ =
    headMaxZ > headMinZ
      ? Math.max(0.072, Math.min(0.12, (headMaxZ - headMinZ) * 0.5))
      : 0.088;
  // Local Z offset from headCenter to the front facial skin surface
  const localFaceFrontZ =
    faceMaxZ > -Infinity
      ? Math.max(0.065, Math.min(0.125, faceMaxZ - headCenterZ))
      : headRadiusZ * 0.96;
  const shoulderHalfW =
    shoulderMaxX > shoulderMinX
      ? Math.max(0.13, Math.min(0.22, (shoulderMaxX - shoulderMinX) * 0.45))
      : 0.155;
  const hipRadius =
    hipMaxX > hipMinX
      ? Math.max(0.12, Math.min(0.19, (hipMaxX - hipMinX) * 0.48))
      : 0.145;
  const leftFootX = leftFootCount > 0 ? leftFootSumX / leftFootCount : -0.085;
  const leftFootZ = leftFootCount > 0 ? leftFootSumZ / leftFootCount : 0.025;
  const rightFootX = rightFootCount > 0 ? rightFootSumX / rightFootCount : 0.085;
  const rightFootZ = rightFootCount > 0 ? rightFootSumZ / rightFootCount : 0.025;

  const chestCenterX =
    chestCount > 0 ? chestSumX / chestCount : headCenterX;
  const chestCenterY =
    chestCount > 0
      ? Math.max(1.14, Math.min(1.28, chestSumY / chestCount))
      : 1.18;
  const chestCenterZ =
    chestCount > 0 ? chestSumZ / chestCount : headCenterZ;

  // Prioritized camera 'look-at' target anchored on the character's chest/head spine axis
  // rather than the global model origin (0, 0, 0), keeping the character upright and centered during rotation!
  const defaultLookAtTarget = new THREE.Vector3(
    (headCenterX + chestCenterX) * 0.5,
    chestCenterY,
    (headCenterZ + chestCenterZ) * 0.5
  );
  const tmpHeadWorld = new THREE.Vector3();
  const tmpChestWorld = new THREE.Vector3();

  const getLookAtTarget = (
    out: THREE.Vector3 = new THREE.Vector3(),
    focusMode: 'chest' | 'head' = 'chest'
  ): THREE.Vector3 => {
    clonedScene.updateMatrixWorld(true);
    let hasHead = false;
    let hasChest = false;

    if (headBone) {
      (headBone as THREE.Object3D).getWorldPosition(tmpHeadWorld);
      if (
        Number.isFinite(tmpHeadWorld.y) &&
        tmpHeadWorld.y > 1.25 &&
        tmpHeadWorld.y < 1.85
      ) {
        hasHead = true;
      }
    }
    if (chestBone) {
      (chestBone as THREE.Object3D).getWorldPosition(tmpChestWorld);
      if (
        Number.isFinite(tmpChestWorld.y) &&
        tmpChestWorld.y > 0.85 &&
        tmpChestWorld.y < 1.55
      ) {
        hasChest = true;
      }
    }

    if (focusMode === 'head') {
      if (hasHead) {
        out.set(
          Math.max(-0.08, Math.min(0.08, tmpHeadWorld.x)),
          Math.max(1.48, Math.min(1.64, tmpHeadWorld.y)),
          Math.max(-0.08, Math.min(0.08, tmpHeadWorld.z))
        );
      } else {
        headAnchorGroup.getWorldPosition(tmpHeadWorld);
        out.set(
          Math.max(-0.08, Math.min(0.08, tmpHeadWorld.x)),
          Math.max(1.48, Math.min(1.64, tmpHeadWorld.y || headCenterY)),
          Math.max(-0.08, Math.min(0.08, tmpHeadWorld.z))
        );
      }
      return out;
    }

    // Default 'chest' mode: prioritize chestBone & headBone spine alignment so full figure + head/hat stay centered in view
    if (hasChest && hasHead) {
      out.set(
        Math.max(-0.08, Math.min(0.08, (tmpChestWorld.x + tmpHeadWorld.x) * 0.5)),
        Math.max(1.12, Math.min(1.26, tmpChestWorld.y * 0.72 + tmpHeadWorld.y * 0.28)),
        Math.max(-0.08, Math.min(0.08, (tmpChestWorld.z + tmpHeadWorld.z) * 0.5))
      );
    } else if (hasChest) {
      out.set(
        Math.max(-0.08, Math.min(0.08, tmpChestWorld.x)),
        Math.max(1.12, Math.min(1.26, tmpChestWorld.y)),
        Math.max(-0.08, Math.min(0.08, tmpChestWorld.z))
      );
    } else if (hasHead) {
      out.set(
        Math.max(-0.08, Math.min(0.08, tmpHeadWorld.x)),
        Math.max(1.12, Math.min(1.26, tmpHeadWorld.y - 0.38)),
        Math.max(-0.08, Math.min(0.08, tmpHeadWorld.z))
      );
    } else {
      out.copy(defaultLookAtTarget);
    }
    return out;
  };

  const {
    recolorUniformSets,
    clothMaterials,
    calibratedBaseHueDeg,
    calibratedTrouserHueDeg,
  } = configureModelMaterialsAndRecolor(
    clonedScene,
    fabricMaterialId,
    maxAnisotropy
  );

  const updateRecolorUniforms = ({
    primaryHex: nextPrimaryHex,
    trouserHex: nextTrouserHex = '#F5F1E8',
    enableTrouserKey: nextEnableTrouserKey = false,
  }: {
    primaryHex: string;
    trouserHex?: string;
    enableTrouserKey?: boolean;
  }) => {
    const primaryHsv = hexToHsv(nextPrimaryHex);
    const trouserHsv = hexToHsv(nextTrouserHex);

    for (const u of recolorUniformSets) {
      u.uRecolorEnabled.value = 1.0;
      u.uTargetHue.value = primaryHsv.h;
      u.uTargetSat.value = primaryHsv.s;
      u.uTargetVal.value = primaryHsv.v;
      u.uEnableTrouserKey.value = nextEnableTrouserKey ? 1.0 : 0.0;
      u.uTrouserTargetHue.value = trouserHsv.h;
      u.uTrouserTargetSat.value = trouserHsv.s;
      u.uTrouserTargetVal.value = trouserHsv.v;
    }
  };

  const updatePatternUniforms = ({
    patternId: nextPatternId,
    hoaTietHex: nextHoaTietHex,
    scale,
    rotationDeg,
    strength,
  }: {
    patternId: PatternId;
    hoaTietHex: string;
    scale: number;
    rotationDeg: number;
    strength: number;
  }) => {
    const isEnabled = nextPatternId !== 'none' && strength > 0.01;
    const patTex = getOrCreatePatternThreeTexture(nextPatternId);
    const patColor = new THREE.Color(nextHoaTietHex);
    const rotRad = (rotationDeg * Math.PI) / 180;

    for (const u of recolorUniformSets) {
      u.uPatternEnabled.value = isEnabled ? 1.0 : 0.0;
      u.uPatternMap.value = patTex;
      u.uPatternScale.value = scale;
      u.uPatternRotation.value = rotRad;
      u.uPatternStrength.value = strength;
      u.uPatternColor.value.copy(patColor);
    }
  };

  const updateFabricNormalAndPbr = (nextFabricId: FabricMaterialId) => {
    const spec = getFabricMaterialSpec(nextFabricId);
    const weaveNorm = getOrCreateFabricWeaveNormalMap(spec, maxAnisotropy);
    const dispTex = getOrCreateFabricDisplacementMap(spec, maxAnisotropy);
    const dispParams = getFabricDisplacementParams(spec);
    const repUV = spec.normalMapConfig.repeatUV;
    for (const u of recolorUniformSets) {
      const isTrouser = u.uIsTrouserMesh.value > 0.5;
      u.uClothRoughness.value = Math.max(0.65, spec.roughness);
      u.uClothSheen.value = spec.sheen ?? 0.5;
      u.uClothSheenRoughness.value = spec.sheenRoughness ?? 0.6;
      u.uClothAnisotropy.value = spec.anisotropy ?? 0.45;
      u.uClothAnisotropyRotation.value = spec.anisotropyRotation ?? 0.0;
      u.uSpecularAttenuation.value = spec.specularAttenuation ?? 0.22;
      u.uDisplacementMap.value = dispTex;
      u.uDisplacementScale.value = isTrouser
        ? dispParams.displacementScale * 0.45
        : dispParams.displacementScale;
      u.uDisplacementBias.value = isTrouser
        ? dispParams.displacementBias * 0.45
        : dispParams.displacementBias;
      u.uWeaveRepeatUV.value.set(repUV[0], repUV[1]);
      u.uBrocadeReliefStrength.value = isTrouser
        ? dispParams.brocadeReliefStrength * 0.42
        : dispParams.brocadeReliefStrength;
      if (!isTrouser) {
        u.uNormalScale.value.set(
          dispParams.boostedNormalScale[0],
          dispParams.boostedNormalScale[1]
        );
        u.uEnvMapIntensity.value = dispParams.envMapIntensity;
      }
    }
    for (const item of clothMaterials) {
      item.mat.roughness = Math.max(0.65, spec.roughness);
      item.mat.metalness = 0.0;
      item.mat.sheen = spec.sheen ?? 0.5;
      item.mat.sheenRoughness = spec.sheenRoughness ?? 0.6;
      item.mat.anisotropy = spec.anisotropy ?? 0.45;
      item.mat.anisotropyRotation = spec.anisotropyRotation ?? 0.0;
      item.mat.envMapIntensity = dispParams.envMapIntensity;
      item.mat.specularIntensity = Math.max(
        0.25,
        1.0 - (spec.specularAttenuation ?? 0.22)
      );
      if (!item.hasNativeNormalMap) {
        item.mat.normalMap = weaveNorm;
        item.mat.normalScale.set(
          dispParams.boostedNormalScale[0],
          dispParams.boostedNormalScale[1]
        );
      } else {
        const nativeBoost = Math.max(1.15, spec.normalScale[0]);
        item.mat.normalScale.set(nativeBoost, nativeBoost);
      }
    }
  };

  updateRecolorUniforms({
    primaryHex,
    trouserHex,
    enableTrouserKey,
  });

  updatePatternUniforms({
    patternId,
    hoaTietHex,
    scale: patternScale,
    rotationDeg: patternRotationDeg,
    strength: patternStrength,
  });

  // ============================================================================
  // Dedicated Modular 3D Character Layer System (Hair, Expression, Headwear, Garment Cuts, Footwear)
  // Separates object layers from the base garment model and uses Three.js .attach() to attach/swap
  // each layer in world/socket space with ZERO GLB reload and 100% preserved garment state!
  // ============================================================================
  const characterRigGroup = new THREE.Group();
  characterRigGroup.name = 'VStylist_Character3DRig';
  clonedScene.updateMatrixWorld(true);
  clonedScene.attach(characterRigGroup);

  const headAnchorGroup = new THREE.Group();
  headAnchorGroup.name = 'VStylist_HeadAnchor';
  headAnchorGroup.position.set(headCenterX, headCenterY, headCenterZ);
  headAnchorGroup.updateMatrixWorld(true);
  characterRigGroup.attach(headAnchorGroup);

  let hairSubGroup = new THREE.Group();
  hairSubGroup.name = 'VStylist_HairLayer';
  let expressionSubGroup = new THREE.Group();
  expressionSubGroup.name = 'VStylist_ExpressionLayer';
  let headAccessorySubGroup = new THREE.Group();
  headAccessorySubGroup.name = 'VStylist_HeadAccessoryLayer';
  headAnchorGroup.attach(hairSubGroup);
  headAnchorGroup.attach(expressionSubGroup);
  headAnchorGroup.attach(headAccessorySubGroup);

  let garmentModSubGroup = new THREE.Group();
  garmentModSubGroup.name = 'VStylist_GarmentModLayer';
  let footwearSubGroup = new THREE.Group();
  footwearSubGroup.name = 'VStylist_FootwearLayer';
  characterRigGroup.attach(garmentModSubGroup);
  characterRigGroup.attach(footwearSubGroup);

  // Detach & dispose an existing object layer, then attach a freshly built layer via Three.js .attach()
  const replaceAttachedLayer = (
    parentSocket: THREE.Object3D,
    oldLayer: THREE.Group,
    layerName: string,
    alignToSocketOrigin = true
  ): THREE.Group => {
    oldLayer.removeFromParent();
    oldLayer.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.isMesh && m.geometry) {
        m.geometry.dispose();
      }
    });
    const nextLayer = new THREE.Group();
    nextLayer.name = layerName;
    parentSocket.updateMatrixWorld(true);
    if (alignToSocketOrigin) {
      nextLayer.matrixWorld.copy(parentSocket.matrixWorld);
      nextLayer.matrix.copy(parentSocket.matrixWorld);
      nextLayer.matrix.decompose(
        nextLayer.position,
        nextLayer.quaternion,
        nextLayer.scale
      );
    }
    parentSocket.attach(nextLayer);
    return nextLayer;
  };

  const hairMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#181513'),
    roughness: 0.42,
    metalness: 0.05,
    sheen: 0.75,
    sheenRoughness: 0.35,
    sheenColor: new THREE.Color('#ffffff'),
  });

  const accGoldMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#D4AF37'),
    roughness: 0.25,
    metalness: 0.85,
  });

  const accSilverMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#E2E8F0'),
    roughness: 0.2,
    metalness: 0.9,
  });

  const accDarkMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#181513'),
    roughness: 0.22,
    metalness: 0.1,
    clearcoat: 0.6,
  });

  const accBambooMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#DEC89E'),
    roughness: 0.68,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });

  const exprLipMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#C85A62'),
    roughness: 0.38,
    metalness: 0.02,
  });

  const exprBlushMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#E87A88'),
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });

  // Collect native hair, morph-target, skeletal bone hierarchy, lower-garment & native footwear meshes once
  const nativeHairMaterials: THREE.MeshStandardMaterial[] = [];
  const nativeMorphMeshes: THREE.Mesh[] = [];
  const nativeFootwearMeshes: THREE.Mesh[] = [];
  const lowerGarmentMeshes: { mesh: THREE.Mesh; maxLocalY: number; minLocalY: number }[] = [];
  const classifiedBones: { bone: THREE.Object3D; zone: HierarchicalBoneZone }[] = [];
  clonedScene.traverse((obj) => {
    if (obj === characterRigGroup) return;
    const nLower = (obj.name || '').toLowerCase();
    if ((obj as THREE.Bone).isBone || obj.type === 'Bone') {
      const bPos = new THREE.Vector3();
      obj.getWorldPosition(bPos);
      let zone: HierarchicalBoneZone = 'pelvis_hip';
      if (
        nLower.includes('foot') ||
        nLower.includes('ankle') ||
        nLower.includes('toe') ||
        bPos.y < 0.22
      ) {
        zone = 'ankle_foot';
      } else if (
        nLower.includes('calf') ||
        nLower.includes('shin') ||
        nLower.includes('knee') ||
        (nLower.includes('leg') && !nLower.includes('up')) ||
        bPos.y < 0.5
      ) {
        zone = 'lower_leg_knee_calf';
      } else if (
        nLower.includes('thigh') ||
        nLower.includes('upleg') ||
        bPos.y < 0.78
      ) {
        zone = 'upper_leg_thigh';
      }
      obj.userData.boneZone = zone;
      classifiedBones.push({ bone: obj, zone });
    }

    const m = obj as THREE.Mesh;
    if (!m.isMesh) return;
    const nameLower = (m.name || '').toLowerCase();
    if (nameLower.includes('hair') || nameLower.includes('toc')) {
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      mats.forEach((mat) => {
        const std = mat as THREE.MeshStandardMaterial;
        if (std?.color) nativeHairMaterials.push(std);
      });
    }
    if (
      nameLower.includes('trouser') ||
      nameLower.includes('pant') ||
      nameLower.includes('quan') ||
      nameLower.includes('skirt') ||
      nameLower.includes('short') ||
      nameLower.includes('thuong') ||
      nameLower.includes('bottom')
    ) {
      m.geometry?.computeBoundingBox?.();
      const bb = m.geometry?.boundingBox;
      lowerGarmentMeshes.push({
        mesh: m,
        maxLocalY: bb ? bb.max.y : 0.9,
        minLocalY: bb ? bb.min.y : 0.0,
      });
    }
    if (m.morphTargetDictionary && m.morphTargetInfluences) {
      nativeMorphMeshes.push(m);
    }
    if (
      nameLower.includes('shoe') ||
      nameLower.includes('boot') ||
      nameLower.includes('footwear') ||
      nameLower.includes('giay') ||
      nameLower.includes('guoc') ||
      nameLower.includes('dep') ||
      nameLower.includes('slipper') ||
      nameLower.includes('sandal')
    ) {
      nativeFootwearMeshes.push(m);
    }
  });

  let lastHairStyleKey = '';
  let lastHairColorKey = '';
  let lastExpressionKey = '';
  let lastAccessoriesKey = '';
  let lastGarmentModKey = '';
  const activeAccessoryMeshes = new Map<
    string,
    { parent: THREE.Object3D; mesh: THREE.Object3D }
  >();

  const updateCharacterAppearance = ({
    hairStyle: nextHairStyle,
    hairColorHex: nextHairColorHex,
    expression: nextExpression,
    costumeId: nextCostumeId = modelId,
    bottomId: nextBottomId = 'quan-lua-trang',
    trouserHex: nextTrouserHex = trouserHex,
    accessories: nextAccessories = [],
    necklineCut: nextNecklineCut = 'co-truyen-thong',
    hemLengthCut: nextHemLengthCut = 'ta-dai-chuan',
  }: {
    hairStyle: HairStyleId;
    hairColorHex: string;
    expression: ExpressionId;
    costumeId?: string;
    bottomId?: string;
    trouserHex?: string;
    accessories?: string[];
    necklineCut?: NecklineCutId;
    hemLengthCut?: HemLengthCutId;
  }) => {
    // Sync headAnchorGroup to skeletal headBone if present and animated
    if (headBone) {
      const boneWorldPos = new THREE.Vector3();
      (headBone as THREE.Object3D).getWorldPosition(boneWorldPos);
      clonedScene.worldToLocal(boneWorldPos);
      if (boneWorldPos.y > 1.35 && boneWorldPos.y < 1.75) {
        headAnchorGroup.position.set(
          boneWorldPos.x,
          headCenterY,
          boneWorldPos.z
        );
      }
    }

    // 1-3. Keep original character hair & facial expression untouched (no synthetic hair/face overlays)
    void nextHairColorHex;
    void nextHairStyle;
    void nextExpression;
    void hairMat;
    void exprLipMat;
    void exprBlushMat;
    void nativeHairMaterials;
    void nativeMorphMeshes;
    if (lastHairStyleKey !== 'clean') {
      lastHairStyleKey = 'clean';
      lastHairColorKey = 'clean';
      lastExpressionKey = 'clean';
      hairSubGroup = replaceAttachedLayer(
        headAnchorGroup,
        hairSubGroup,
        'VStylist_HairLayer',
        true
      );
      expressionSubGroup = replaceAttachedLayer(
        headAnchorGroup,
        expressionSubGroup,
        'VStylist_ExpressionLayer',
        true
      );
    }

    // 4. Granular Per-Accessory Diffing: triggers targeted parentSocket.remove(mesh) / parentSocket.add(mesh)
    //    ONLY for the specific accessory meshes that were added or removed!
    const nextAccSet = new Set(nextAccessories);
    const sortedAccKey = [...nextAccSet].sort().join('|');
    if (sortedAccKey !== lastAccessoriesKey) {
      lastAccessoriesKey = sortedAccKey;

      // 4A. Targeted scene.remove() for any deselected accessory mesh
      for (const [accName, entry] of activeAccessoryMeshes.entries()) {
        if (!nextAccSet.has(accName)) {
          entry.parent.remove(entry.mesh);
          entry.mesh.traverse((obj) => {
            const m = obj as THREE.Mesh;
            if (m.isMesh && m.geometry) {
              m.geometry.dispose();
            }
          });
          activeAccessoryMeshes.delete(accName);
        }
      }

      // 4B. Targeted scene.add() / .attach() ONLY for newly selected accessory meshes
      for (const accName of nextAccSet) {
        if (activeAccessoryMeshes.has(accName)) continue;
        const lower = accName.toLowerCase();
        const meshGroup = new THREE.Group();
        meshGroup.name = `VStylist_AccMesh_${accName}`;
        let targetSocket: THREE.Object3D = headAccessorySubGroup;

        if (lower.includes('khăn đóng')) {
          const turbanMesh = new THREE.Mesh(
            new THREE.TorusGeometry(
              headRadiusX * 1.06,
              headRadiusX * 0.34,
              18,
              36
            ),
            accDarkMat
          );
          turbanMesh.rotation.x = Math.PI / 2;
          turbanMesh.scale.set(1.0, headRadiusZ / headRadiusX, 1.0);
          turbanMesh.position.set(0, headRadiusY * 0.58, 0);
          meshGroup.add(turbanMesh);
        } else if (lower.includes('nón lá')) {
          const coneMesh = new THREE.Mesh(
            new THREE.ConeGeometry(
              headRadiusX * 2.85,
              headRadiusY * 1.38,
              36,
              1,
              true
            ),
            accBambooMat
          );
          coneMesh.position.set(0, headRadiusY * 1.18, -0.008);
          coneMesh.rotation.x = -0.1;
          const rimRing = new THREE.Mesh(
            new THREE.TorusGeometry(headRadiusX * 2.85, 0.0045, 10, 36),
            accBambooMat
          );
          rimRing.rotation.x = Math.PI / 2 - 0.1;
          rimRing.position.set(0, headRadiusY * 0.5, 0.004);
          meshGroup.add(coneMesh, rimRing);
        } else if (lower.includes('nón quai thao')) {
          const quaiThaoMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(
              headRadiusX * 3.1,
              headRadiusX * 3.1,
              headRadiusY * 0.44,
              36
            ),
            accBambooMat
          );
          quaiThaoMesh.position.set(0, headRadiusY * 1.02, 0);
          meshGroup.add(quaiThaoMesh);
        } else if (lower.includes('kính râm')) {
          const fZ = localFaceFrontZ + 0.008;
          const eyeOffsetX = headRadiusX * 0.39;
          const eyeOffsetY = headRadiusY * 0.06;
          const leftLens = new THREE.Mesh(
            new THREE.BoxGeometry(headRadiusX * 0.52, headRadiusY * 0.24, 0.008),
            accDarkMat
          );
          leftLens.position.set(-eyeOffsetX, eyeOffsetY, fZ);
          leftLens.rotation.z = -0.1;
          const rightLens = new THREE.Mesh(
            new THREE.BoxGeometry(headRadiusX * 0.52, headRadiusY * 0.24, 0.008),
            accDarkMat
          );
          rightLens.position.set(eyeOffsetX, eyeOffsetY, fZ);
          rightLens.rotation.z = 0.1;
          const bridge = new THREE.Mesh(
            new THREE.CylinderGeometry(0.0028, 0.0028, headRadiusX * 0.3, 8),
            accGoldMat
          );
          bridge.rotation.z = Math.PI / 2;
          bridge.position.set(0, eyeOffsetY + 0.004, fZ + 0.002);
          meshGroup.add(leftLens, rightLens, bridge);
        } else if (lower.includes('kiềng bạc') || lower.includes('ngọc trai')) {
          const torcMesh = new THREE.Mesh(
            new THREE.TorusGeometry(headRadiusX * 0.94, 0.007, 14, 32),
            lower.includes('ngọc trai') ? accGoldMat : accSilverMat
          );
          torcMesh.rotation.x = Math.PI / 2 + 0.26;
          torcMesh.position.set(0, -headRadiusY * 1.32, 0.015);
          meshGroup.add(torcMesh);
        } else if (lower.includes('quạt') || lower.includes('châm kim')) {
          targetSocket = characterRigGroup;
          const isChamKim = lower.includes('châm kim');
          const fanLeafMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(isChamKim ? '#FDFBF7' : '#C8372D'),
            roughness: 0.45,
            metalness: isChamKim ? 0.12 : 0.05,
            side: THREE.DoubleSide,
          });
          const fanArc = new THREE.Mesh(
            new THREE.RingGeometry(0.032, 0.145, 24, 1, Math.PI * 0.12, Math.PI * 0.76),
            fanLeafMat
          );
          fanArc.position.set(shoulderHalfW * 0.58, 1.15, 0.14);
          fanArc.rotation.z = -0.22;
          const fanPivot = new THREE.Mesh(
            new THREE.CylinderGeometry(0.012, 0.008, 0.014, 12),
            accGoldMat
          );
          fanPivot.rotation.x = Math.PI / 2;
          fanPivot.position.set(shoulderHalfW * 0.58, 1.15, 0.142);
          meshGroup.add(fanArc, fanPivot);
        } else {
          continue;
        }

        targetSocket.add(meshGroup);
        activeAccessoryMeshes.set(accName, {
          parent: targetSocket,
          mesh: meshGroup,
        });
      }

      // Always keep native footwear sub-meshes intact and visible
      for (const fwMesh of nativeFootwearMeshes) {
        fwMesh.visible = true;
      }
    }

    // 5. Apply Hierarchical Bone Mask & Update Lower Garment PBR Material Properties
    void nextNecklineCut;
    void footwearSubGroup;
    const boneMask = computeHierarchicalBoneMask(
      nextCostumeId || modelId,
      nextBottomId,
      nextHemLengthCut
    );
    clonedScene.userData.hierarchicalBoneMask = boneMask;

    for (const entry of classifiedBones) {
      entry.bone.userData.isMaskedByOuterGarment =
        boneMask.maskedZones[entry.zone];
    }

    const isShortBottom =
      nextBottomId === 'quan-short-jeans-cat-ngan' ||
      nextBottomId === 'chan-vay-ngan-miniskirt';
    const shortBottomHemMeters =
      nextBottomId === 'quan-short-jeans-cat-ngan' ? 0.64 : 0.6;

    for (const u of recolorUniformSets) {
      u.uOuterHemMaskY.value = boneMask.outerHemHeightMeters;
      u.uHideClippedLowerMesh.value = 0.0;
      u.uIsShortBottom.value = isShortBottom ? 1.0 : 0.0;
      u.uShortBottomHemY.value = shortBottomHemMeters;
      if (isShortBottom) {
        u.uEnableTrouserKey.value = 1.0;
      }
    }

    const garmentModKey = `${boneMask.costumeId}|${nextBottomId}|${nextTrouserHex}`;
    if (garmentModKey !== lastGarmentModKey) {
      lastGarmentModKey = garmentModKey;
      garmentModSubGroup = replaceAttachedLayer(
        characterRigGroup,
        garmentModSubGroup,
        'VStylist_GarmentModLayer',
        true
      );

      // Update lower garment mesh PBR Roughness, Metallic, Sheen, Anisotropy & Normal Map to match real trouser fabric
      const trouserPbr = getTrouserPbrProfile(nextBottomId);
      const trouserNormalMap = getOrCreateTrouserPbrNormalMap(
        nextBottomId,
        maxAnisotropy
      );
      for (const lg of lowerGarmentMeshes) {
        lg.mesh.visible = true;
        const mats = Array.isArray(lg.mesh.material)
          ? lg.mesh.material
          : [lg.mesh.material];
        for (const mat of mats) {
          const physMat = mat as THREE.MeshPhysicalMaterial;
          if (physMat && typeof physMat.roughness === 'number') {
            physMat.roughness = trouserPbr.roughness;
            physMat.metalness = trouserPbr.metalness;
            physMat.sheen = trouserPbr.sheen;
            physMat.sheenRoughness = trouserPbr.sheenRoughness;
            physMat.anisotropy = trouserPbr.anisotropy;
            physMat.anisotropyRotation = trouserPbr.anisotropyRotation;
            physMat.specularIntensity = Math.max(
              0.25,
              1.0 - trouserPbr.specularAttenuation
            );
            physMat.normalMap = trouserNormalMap;
            physMat.normalScale.set(
              trouserPbr.normalScale[0],
              trouserPbr.normalScale[1]
            );
            physMat.envMapIntensity = trouserPbr.envMapIntensity;
            const uSet = physMat.userData?.recolorUniforms as
              | HueKeyRecolorUniforms
              | undefined;
            if (uSet) {
              uSet.uClothRoughness.value = trouserPbr.roughness;
              uSet.uClothSheen.value = trouserPbr.sheen;
              uSet.uClothSheenRoughness.value = trouserPbr.sheenRoughness;
              uSet.uClothAnisotropy.value = trouserPbr.anisotropy;
              uSet.uClothAnisotropyRotation.value =
                trouserPbr.anisotropyRotation;
              uSet.uSpecularAttenuation.value = trouserPbr.specularAttenuation;
              uSet.uNormalScale.value.set(
                trouserPbr.normalScale[0],
                trouserPbr.normalScale[1]
              );
              uSet.uEnvMapIntensity.value = trouserPbr.envMapIntensity;
            }
            physMat.needsUpdate = true;
          }
        }
      }
    }
  };

  let mixer: THREE.AnimationMixer | null = null;
  if (gltf.animations && gltf.animations.length > 0) {
    mixer = new THREE.AnimationMixer(clonedScene);
    const action = mixer.clipAction(gltf.animations[0]);
    action.play();
  }

  const dispose = () => {
    if (mixer) {
      mixer.stopAllAction();
    }
    clonedScene.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (!m.isMesh) return;
      if (m.geometry) m.geometry.dispose();
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      mats.forEach((mat) => mat?.dispose?.());
    });
  };

  return {
    status: 'loaded',
    modelId,
    isFromUserComputer: resolved.isFromUserComputer,
    rawGlbBuffer: resolved.buffer,
    scene: clonedScene,
    mixer,
    headBone,
    chestBone,
    lookAtTarget: defaultLookAtTarget,
    getLookAtTarget,
    recolorUniformSets,
    calibratedBaseHueDeg,
    calibratedTrouserHueDeg,
    updateRecolorUniforms,
    updatePatternUniforms,
    updateFabricNormalAndPbr,
    updateCharacterAppearance,
    dispose,
  };
}
