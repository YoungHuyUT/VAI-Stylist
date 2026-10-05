/**
 * Cultural Data Model & Domain Types
 * In accordance with Section 1 & Section 2 Specification
 */

export interface Source {
  id: string;
  title: string;
  author?: string;
  publisher?: string;
  year?: number;
  url?: string;
  note?: string;
}

export interface Costume {
  id: string;
  name: string;
  era: string;
  region: 'bac' | 'trung' | 'nam' | null;
  genders: ('male' | 'female')[];
  features: string[];
  meaning: string;
  occasions: string[];
  defaultColors: {
    main: string;
    bottom: string;
  };
  allowedPatternIds: string[];
  allowedAccessoryIds: string[];
  referenceImage?: string;
  sources: string[];
  verified: boolean;
}

export interface ColorEntry {
  id: string;
  name: string;
  hex: string;
  meaning?: string;
  occasions?: string[];
  sources: string[];
  verified: boolean;
}

export type PatternId =
  | 'pattern_may_co'
  | 'pattern_chim_lac'
  | 'pattern_song_nuoc'
  | 'pattern_cuc_day'
  | 'none';

export interface Pattern {
  id: string;
  name: string;
  description: string;
  mask?: string;
  sources: string[];
  verified: boolean;
}

export interface Accessory {
  id: string;
  name: string;
  slot: 'head' | 'hand' | 'waist' | 'neck';
  features: string[];
  sources: string[];
  verified: boolean;
}

export interface RuleWhen {
  costumeIds?: string[];
  genders?: ('male' | 'female')[];
  events?: string[];
  colorIds?: string[];
  patternIds?: string[];
  accessoryIds?: string[];
  remixAtLeast?: number;
  remixAtMost?: number;
}

export interface Rule {
  id: string;
  level: 'safe' | 'warning' | 'critical';
  when: RuleWhen;
  message: string;
  reason: string;
  fix?: {
    set: Partial<Outfit>;
  };
  sources: string[];
  verified: boolean;
}

export interface LoreCard {
  id: string;
  costumeId: string;
  title: string;
  text: string;
  sources: string[];
  verified: boolean;
}

export interface Outfit {
  gender: 'male' | 'female';
  costumeId: string;
  region: 'bac' | 'trung' | 'nam' | null;
  patternId?: string;
  colors: {
    ao: string;
    quan: string;
    hoaTiet?: string;
  };
  accessories: string[];
  event: string;
  remix: number; // 0..100 (0 = Thuần truyền thống, 100 = Tối đa phá cách)
}

export interface HarmonyResult {
  score: number;
  label: string;
  notes: string[];
}

export interface CulturalEvaluationResult {
  status: 'SAFE' | 'WARNING' | 'CRITICAL';
  fired: Rule[];
  harmony: HarmonyResult;
  suggestions: Array<{
    ruleId: string;
    message: string;
    fix?: Partial<Outfit>;
  }>;
}

export interface CulturalDataSet {
  sources: Record<string, Source>;
  costumes: Record<string, Costume>;
  colors: Record<string, ColorEntry>;
  patterns: Record<string, Pattern>;
  accessories: Record<string, Accessory>;
  rules: Rule[];
  loreCards: LoreCard[];
}
