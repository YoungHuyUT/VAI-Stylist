import {
  PatternId,
  FabricMaterialId,
  NecklineCutId,
  HemLengthCutId,
} from '../data/vietPhucData';

export type RemixThemeId =
  | 'all'
  | 'heritage'
  | 'everyday'
  | 'editorial'
  | 'festival'
  | 'formal';

export interface RemixLook {
  id: RemixThemeId;
  uid?: string;
  title: string;
  tagline: string;
  stylistNote: string;
  costumeId: string;
  mainColor: string;
  bottomName: string;
  bottomColor: string;
  patternId: PatternId;
  hoaTietHex?: string;
  fabricMaterialId?: FabricMaterialId;
  necklineCut?: NecklineCutId;
  hemLengthCut?: HemLengthCutId;
  accessoryIds: string[];
  remix: number;
  contextNote: string;
}

export interface RemixStudioRequest {
  theme: RemixThemeId;
  gender: 'male' | 'female';
  event: string;
  styleVotes?: StylePreferenceVote[];
  currentOutfit: {
    costumeId: string;
    mainColor: string;
    bottomName: string;
    patternId: PatternId;
    accessoryIds: string[];
    remix: number;
  };
}

export interface StylePreferenceVote {
  costumeId: string;
  mainColor: string;
  bottomName: string;
  bottomColor: string;
  patternId: PatternId;
  liked: boolean;
}

export interface RemixStudioResponse {
  looks: RemixLook[];
  engine: string;
}
