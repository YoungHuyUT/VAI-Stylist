import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import {
  TOP_GARMENTS,
  TRADITIONAL_COLORS,
  BOTTOM_GARMENTS,
  EVENT_TYPES,
  PatternId,
  NecklineCutId,
  HemLengthCutId,
} from '../data/vietPhucData';
import { Outfit } from '../types/costume';

export interface OutfitColors {
  ao: string;
  quan: string;
  hoaTiet: string;
  // Aliases for full compatibility across advisor & viewer
  primary: string;
  primaryId: string;
  trouser: string;
  trouserName: string;
  enableTrouserKey: boolean;
}

export interface PatternTransformConfig {
  scale: number;       // 0.4 .. 3.0 (default 1.2)
  rotationDeg: number; // -180 .. 180 (default 0)
  strength: number;    // 0.05 .. 1.0 (default 0.55)
}

/**
 * Single source of truth Outfit State:
 * { gender, costumeId, region, patternId, colors: { ao, quan, hoaTiet }, accessories, event, remix }
 * Read by the viewport, the status chip, advisor, photobooth, and lookbook.
 */
export interface OutfitState {
  gender: 'male' | 'female';
  costumeId: string;
  region: 'bac' | 'trung' | 'nam' | null;
  patternId: PatternId;
  colors: OutfitColors;
  patternConfig: PatternTransformConfig;
  accessories: string[];
  necklineCut: NecklineCutId;
  hemLengthCut: HemLengthCutId;
  event: string;
  remix: number; // 0..100 (0 = Thuần truyền thống, 100 = Tối đa phá cách Gen Z)
}

export interface OutfitStateContextValue {
  outfit: OutfitState;
  setOutfit: React.Dispatch<React.SetStateAction<OutfitState>>;
  setGender: (gender: 'male' | 'female') => void;
  setCostumeId: (costumeId: string) => void;
  setRegion: (region: 'bac' | 'trung' | 'nam' | null) => void;
  setPatternId: (patternId: PatternId) => void;
  setPrimaryColorById: (colorId: string) => void;
  setPrimaryColorHex: (hex: string) => void;
  setTrouserByName: (bottomName: string) => void;
  setTrouserColorHex: (hex: string) => void;
  setPatternColorHex: (hex: string) => void;
  setEnableTrouserKey: (enabled: boolean) => void;
  setPatternConfig: (patch: Partial<PatternTransformConfig>) => void;
  toggleAccessory: (accName: string) => void;
  setAccessories: (accessories: string[]) => void;
  setNecklineCut: (cut: NecklineCutId) => void;
  setHemLengthCut: (cut: HemLengthCutId) => void;
  setEvent: (event: string) => void;
  setRemix: (remix: number) => void;
  unlockedLoreIds: string[];
  unlockLoreId: (id: string) => void;
}

const DEFAULT_PRIMARY_COLOR = TRADITIONAL_COLORS[0]; // #134E4A (Xanh Ngọc)
const DEFAULT_BOTTOM = BOTTOM_GARMENTS[0]; // Quần Lụa Trắng (#F5F1E8)

export function getCostumeDefaultColors(
  costumeId: string,
  gender: 'male' | 'female'
): OutfitColors {
  let defaultColorId = 'xanh-co-vit';
  if (costumeId === 'ao-ngu-than-tay-chen') {
    defaultColorId = gender === 'male' ? 'xanh-hai-quan' : 'xanh-co-vit';
  } else if (costumeId === 'ao-tac') {
    defaultColorId = 'xanh-hai-quan';
  } else if (costumeId === 'ao-nhat-binh') {
    defaultColorId = gender === 'male' ? 'vang-mai' : 'do-son';
  } else if (
    costumeId === 'ao-tu-than-kinh-bac' ||
    costumeId === 'ao-vien-linh'
  ) {
    defaultColorId = 'do-son';
  } else if (costumeId === 'ao-ba-ba-nam-bo') {
    defaultColorId = 'cham-co';
  }

  const matchedColor =
    TRADITIONAL_COLORS.find((c) => c.id === defaultColorId) ||
    DEFAULT_PRIMARY_COLOR;
  const matchedBottom = DEFAULT_BOTTOM;

  return {
    ao: matchedColor.hex,
    quan: matchedBottom.hex,
    hoaTiet: '#D4AF37',
    primary: matchedColor.hex,
    primaryId: matchedColor.id,
    trouser: matchedBottom.hex,
    trouserName: matchedBottom.name,
    enableTrouserKey: true,
  };
}

const FOOTWEAR_KEYWORDS = ['guốc', 'sneaker', 'cao gót', 'caotót', 'dép tổ ong', 'hài thêu'];
const HEADWEAR_KEYWORDS = ['khăn đóng', 'nón lá', 'nón quai thao'];

function isFootwearName(name: string): boolean {
  const low = name.toLowerCase();
  return FOOTWEAR_KEYWORDS.some((kw) => low.includes(kw));
}

function isHeadwearName(name: string): boolean {
  const low = name.toLowerCase();
  return HEADWEAR_KEYWORDS.some((kw) => low.includes(kw));
}

export const INITIAL_OUTFIT_STATE: OutfitState = {
  gender: 'female',
  costumeId: TOP_GARMENTS[0].id, // 'ao-ngu-than-tay-chen'
  region: null,
  patternId: 'none',
  colors: {
    ao: DEFAULT_PRIMARY_COLOR.hex,
    quan: DEFAULT_BOTTOM.hex,
    hoaTiet: '#D4AF37', // Imperial gold default motif tint
    primary: DEFAULT_PRIMARY_COLOR.hex,
    primaryId: DEFAULT_PRIMARY_COLOR.id,
    trouser: DEFAULT_BOTTOM.hex,
    trouserName: DEFAULT_BOTTOM.name,
    enableTrouserKey: true,
  },
  patternConfig: {
    scale: 1.2,
    rotationDeg: 0,
    strength: 0.55,
  },
  accessories: [],
  necklineCut: 'co-truyen-thong',
  hemLengthCut: 'ta-dai-chuan',
  event: EVENT_TYPES[0], // 'Đi Lễ Chùa'
  remix: 15,
};

/**
 * Deterministic hash of an Outfit for caching AI advisor and image synthesis results.
 * Cancels or reuses cached results when identical outfit is revisited.
 */
export function hashOutfit(outfit: Outfit | OutfitState): string {
  const acc = [...(outfit.accessories || [])].sort().join(',');
  const hoaTiet = outfit.colors?.hoaTiet || '';
  const raw = `${outfit.gender}|${outfit.costumeId}|${outfit.region || ''}|${
    outfit.patternId || 'none'
  }|${outfit.colors?.ao || ''}|${outfit.colors?.quan || ''}|${hoaTiet}|${acc}|${
    outfit.event || ''
  }|${Math.round(outfit.remix || 0)}`;

  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return `outfit_${Math.abs(hash).toString(36)}`;
}

export function toCanonicalOutfit(state: OutfitState): Outfit {
  return {
    gender: state.gender,
    costumeId: state.costumeId,
    region: state.region,
    patternId: state.patternId,
    colors: {
      ao: state.colors.ao,
      quan: state.colors.quan,
      hoaTiet: state.colors.hoaTiet,
    },
    accessories: state.accessories,
    event: state.event,
    remix: state.remix,
  };
}

const OutfitStateContext = createContext<OutfitStateContextValue | null>(null);

// Snapshot provider registry so getDesignSnapshot() can be called from anywhere
let activeSnapshotProvider: (() => string | null) | null = null;

export function registerDesignSnapshotProvider(
  provider: (() => string | null) | null
): void {
  activeSnapshotProvider = provider;
}

/**
 * Returns a PNG data URL of the current front view (3:4 aspect ratio, max 1024 px).
 * Uses preserveDrawingBuffer or captures right after rendering the front view.
 */
export function getDesignSnapshot(): string | null {
  if (!activeSnapshotProvider) return null;
  return activeSnapshotProvider();
}

if (typeof window !== 'undefined') {
  (window as Window & { getDesignSnapshot?: () => string | null }).getDesignSnapshot =
    getDesignSnapshot;
}

export const OutfitStateProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [outfit, setOutfit] = useState<OutfitState>(() => INITIAL_OUTFIT_STATE);

  const [unlockedLoreIds, setUnlockedLoreIds] = useState<string[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('vstylist_unlocked_lore');
        if (saved) {
          return JSON.parse(saved);
        }
      }
    } catch {
      // Ignore local storage errors
    }
    return ['lore-ngu-than-five-virtues'];
  });

  const unlockLoreId = useCallback((id: string) => {
    setUnlockedLoreIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('vstylist_unlocked_lore', JSON.stringify(next));
        }
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  const setGender = useCallback((gender: 'male' | 'female') => {
    setOutfit((prev) => ({
      ...prev,
      gender,
      patternId: 'none',
      colors: getCostumeDefaultColors(prev.costumeId, gender),
      patternConfig: {
        scale: 1.2,
        rotationDeg: 0,
        strength: 0.55,
      },
      accessories: [],
      necklineCut: 'co-truyen-thong',
      hemLengthCut: 'ta-dai-chuan',
    }));
  }, []);

  const setCostumeId = useCallback((costumeId: string) => {
    setOutfit((prev) => ({
      ...prev,
      costumeId,
      patternId: 'none',
      colors: getCostumeDefaultColors(costumeId, prev.gender),
      patternConfig: {
        scale: 1.2,
        rotationDeg: 0,
        strength: 0.55,
      },
      accessories: [],
      necklineCut: 'co-truyen-thong',
      hemLengthCut: 'ta-dai-chuan',
    }));
  }, []);

  const setRegion = useCallback((region: 'bac' | 'trung' | 'nam' | null) => {
    setOutfit((prev) => ({
      ...prev,
      region,
    }));
  }, []);

  const setRemix = useCallback((remix: number) => {
    setOutfit((prev) => ({
      ...prev,
      remix: Math.max(0, Math.min(100, remix)),
    }));
  }, []);

  const setPatternId = useCallback((patternId: PatternId) => {
    setOutfit((prev) => ({
      ...prev,
      patternId,
    }));
  }, []);

  const setPrimaryColorById = useCallback((colorId: string) => {
    const matched =
      TRADITIONAL_COLORS.find((c) => c.id === colorId) || TRADITIONAL_COLORS[0];
    setOutfit((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        ao: matched.hex,
        primary: matched.hex,
        primaryId: matched.id,
      },
    }));
  }, []);

  const setPrimaryColorHex = useCallback((hex: string) => {
    const norm = hex.trim().toLowerCase();
    const matched = TRADITIONAL_COLORS.find((c) => c.hex.toLowerCase() === norm);
    setOutfit((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        ao: hex,
        primary: hex,
        primaryId: matched ? matched.id : prev.colors.primaryId,
      },
    }));
  }, []);

  const setTrouserByName = useCallback((bottomName: string) => {
    const matched =
      BOTTOM_GARMENTS.find((b) => b.name === bottomName) || BOTTOM_GARMENTS[0];
    setOutfit((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        quan: matched.hex,
        trouser: matched.hex,
        trouserName: matched.name,
        enableTrouserKey: true,
      },
    }));
  }, []);

  const setTrouserColorHex = useCallback((hex: string) => {
    setOutfit((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        quan: hex,
        trouser: hex,
        enableTrouserKey: true,
      },
    }));
  }, []);

  const setPatternColorHex = useCallback((hex: string) => {
    setOutfit((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        hoaTiet: hex,
      },
    }));
  }, []);

  const setEnableTrouserKey = useCallback((enabled: boolean) => {
    setOutfit((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        enableTrouserKey: enabled,
      },
    }));
  }, []);

  const setPatternConfig = useCallback((patch: Partial<PatternTransformConfig>) => {
    setOutfit((prev) => ({
      ...prev,
      patternConfig: {
        ...prev.patternConfig,
        ...patch,
      },
    }));
  }, []);

  const toggleAccessory = useCallback((accName: string) => {
    setOutfit((prev) => {
      const exists = prev.accessories.includes(accName);
      if (exists) {
        return {
          ...prev,
          accessories: prev.accessories.filter((a) => a !== accName),
        };
      }
      let filtered = prev.accessories;
      if (isFootwearName(accName)) {
        filtered = filtered.filter((a) => !isFootwearName(a));
      } else if (isHeadwearName(accName)) {
        filtered = filtered.filter((a) => !isHeadwearName(a));
      }
      return {
        ...prev,
        accessories: [...filtered, accName],
      };
    });
  }, []);

  const setAccessories = useCallback((accessories: string[]) => {
    setOutfit((prev) => ({
      ...prev,
      accessories,
    }));
  }, []);

  const setNecklineCut = useCallback((necklineCut: NecklineCutId) => {
    setOutfit((prev) => ({
      ...prev,
      necklineCut,
    }));
  }, []);

  const setHemLengthCut = useCallback((hemLengthCut: HemLengthCutId) => {
    setOutfit((prev) => ({
      ...prev,
      hemLengthCut,
    }));
  }, []);

  const setEvent = useCallback((event: string) => {
    setOutfit((prev) => ({
      ...prev,
      event,
    }));
  }, []);

  const value = useMemo<OutfitStateContextValue>(
    () => ({
      outfit,
      setOutfit,
      setGender,
      setCostumeId,
      setRegion,
      setPatternId,
      setPrimaryColorById,
      setPrimaryColorHex,
      setTrouserByName,
      setTrouserColorHex,
      setPatternColorHex,
      setEnableTrouserKey,
      setPatternConfig,
      toggleAccessory,
      setAccessories,
      setNecklineCut,
      setHemLengthCut,
      setEvent,
      setRemix,
      unlockedLoreIds,
      unlockLoreId,
    }),
    [
      outfit,
      setGender,
      setCostumeId,
      setRegion,
      setPatternId,
      setPrimaryColorById,
      setPrimaryColorHex,
      setTrouserByName,
      setTrouserColorHex,
      setPatternColorHex,
      setEnableTrouserKey,
      setPatternConfig,
      toggleAccessory,
      setAccessories,
      setNecklineCut,
      setHemLengthCut,
      setEvent,
      setRemix,
      unlockedLoreIds,
      unlockLoreId,
    ]
  );

  return React.createElement(OutfitStateContext.Provider, { value }, children);
};

export function useOutfitState(): OutfitStateContextValue {
  const ctx = useContext(OutfitStateContext);
  if (!ctx) {
    throw new Error('useOutfitState must be used within an OutfitStateProvider');
  }
  return ctx;
}
