import { useEffect, useRef } from 'react';
import {
  ExpressionId,
  HairStyleId,
  HemLengthCutId,
  NecklineCutId,
} from '../data/vietPhucData';
import { LoadedCostumeModel } from './vietPhucGlbLoader';

export interface GranularCharacterState {
  hairStyle: HairStyleId;
  hairColorHex: string;
  expression: ExpressionId;
}

export interface GranularGarmentCutSnapshot {
  costumeId?: string;
  bottomId: string;
  trouserHex: string;
  necklineCut: NecklineCutId;
  hemLengthCut: HemLengthCutId;
}

/**
 * Granular state management hook that observes changes ONLY to `character`
 * (hairStyle, hairColorHex, expression) or `accessories` state properties
 * and triggers a targeted `scene.add` / `scene.remove` sequence for those
 * specific meshes + direct canvas buffer sync, without re-rendering the
 * whole component hierarchy or resetting garment state.
 */
export function useGranularSceneAttachments(params: {
  character: GranularCharacterState;
  accessories: string[];
  garmentCutRef: React.MutableRefObject<GranularGarmentCutSnapshot>;
  loadedModelRef: React.MutableRefObject<LoadedCostumeModel | null>;
  onDirectCanvasBufferSync: (
    nextCharacter: GranularCharacterState,
    nextAccessories: string[]
  ) => void;
}): void {
  const {
    character,
    accessories,
    garmentCutRef,
    loadedModelRef,
    onDirectCanvasBufferSync,
  } = params;

  const prevCharacterRef = useRef<GranularCharacterState | null>(null);
  const prevAccessoriesKeyRef = useRef<string | null>(null);
  const syncCallbackRef = useRef(onDirectCanvasBufferSync);
  syncCallbackRef.current = onDirectCanvasBufferSync;

  const accessoriesKey = [...accessories].sort().join('|');

  useEffect(() => {
    const prevChar = prevCharacterRef.current;
    const prevAccKey = prevAccessoriesKeyRef.current;

    const isInitialMount = prevChar === null || prevAccKey === null;
    const charChanged =
      !prevChar ||
      prevChar.hairStyle !== character.hairStyle ||
      prevChar.hairColorHex !== character.hairColorHex ||
      prevChar.expression !== character.expression;
    const accChanged = prevAccKey !== accessoriesKey;

    prevCharacterRef.current = { ...character };
    prevAccessoriesKeyRef.current = accessoriesKey;

    if (!charChanged && !accChanged) {
      return;
    }

    // 1. Trigger targeted Three.js scene.remove / scene.add sequence ONLY for changed meshes
    const loaded = loadedModelRef.current;
    const gSnap = garmentCutRef.current;
    if (loaded) {
      loaded.updateCharacterAppearance({
        hairStyle: character.hairStyle,
        hairColorHex: character.hairColorHex,
        expression: character.expression,
        accessories,
        costumeId: gSnap.costumeId,
        bottomId: gSnap.bottomId,
        trouserHex: gSnap.trouserHex,
        necklineCut: gSnap.necklineCut,
        hemLengthCut: gSnap.hemLengthCut,
      });
    }

    // 2. Sync 360° canvas buffer directly in-place on subsequent character/accessory edits
    //    (skips React state setRecoloredFrames to avoid re-rendering the component hierarchy)
    if (!isInitialMount) {
      syncCallbackRef.current(character, accessories);
    }
  }, [
    character.hairStyle,
    character.hairColorHex,
    character.expression,
    accessoriesKey,
    accessories,
    garmentCutRef,
    loadedModelRef,
  ]);
}
