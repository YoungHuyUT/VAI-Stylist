import { describe, it, expect } from 'vitest';
import {
  applyHierarchicalBoneMaskUniforms,
  computeHierarchicalBoneMask,
} from '../vietPhucGlbLoader';

function createUniformSet(isTrouserMesh: boolean) {
  return {
    uIsTrouserMesh: { value: isTrouserMesh ? 1 : 0 },
    uOuterHemMaskY: { value: 0 },
    uHideClippedLowerMesh: { value: 0 },
    uIsShortBottom: { value: 0 },
    uIsShortSkirt: { value: 0 },
    uShortBottomHemY: { value: 0 },
    uCanRevealLegUnderlay: { value: 0 },
    uEnableTrouserKey: { value: 0 },
  };
}

describe('hierarchical lower-garment mask uniforms', () => {
  it('clips trousers above the hem of a long outer garment', () => {
    const uniforms = createUniformSet(true);
    const mask = computeHierarchicalBoneMask(
      'ao-nhat-binh-female',
      'quan-lua-trang',
      'ta-dai-chuan'
    );

    applyHierarchicalBoneMaskUniforms([uniforms], mask, 'quan-lua-trang');

    expect(uniforms.uHideClippedLowerMesh.value).toBe(1);
    expect(uniforms.uOuterHemMaskY.value).toBe(mask.outerHemHeightMeters);
    expect(uniforms.uIsShortBottom.value).toBe(0);
  });

  it('does not apply lower-garment clipping to non-trouser materials', () => {
    const uniforms = createUniformSet(false);
    const mask = computeHierarchicalBoneMask(
      'ao-nhat-binh-female',
      'quan-lua-trang',
      'ta-dai-chuan'
    );

    applyHierarchicalBoneMaskUniforms([uniforms], mask, 'quan-lua-trang');

    expect(uniforms.uHideClippedLowerMesh.value).toBe(0);
    expect(uniforms.uIsShortBottom.value).toBe(0);
  });

  it('keeps a mini-skirt distinct and reveals real legs below its hem', () => {
    const uniforms = createUniformSet(true);
    const mask = computeHierarchicalBoneMask(
      'ao-tu-than-female',
      'chan-vay-ngan-miniskirt',
      'crop-top-pha-cach'
    );

    applyHierarchicalBoneMaskUniforms(
      [uniforms],
      mask,
      'chan-vay-ngan-miniskirt',
      true
    );

    expect(uniforms.uIsShortBottom.value).toBe(0);
    expect(uniforms.uIsShortSkirt.value).toBe(1);
    expect(uniforms.uShortBottomHemY.value).toBe(0.6);
    expect(uniforms.uCanRevealLegUnderlay.value).toBe(1);
    expect(uniforms.uEnableTrouserKey.value).toBe(0);
  });

  it('keeps the existing fallback when a model has no skinned leg underlay', () => {
    const uniforms = createUniformSet(true);
    const mask = computeHierarchicalBoneMask(
      'ao-tu-than-female',
      'quan-short-jeans-cat-ngan',
      'crop-top-pha-cach'
    );

    applyHierarchicalBoneMaskUniforms(
      [uniforms],
      mask,
      'quan-short-jeans-cat-ngan'
    );

    expect(uniforms.uCanRevealLegUnderlay.value).toBe(0);
    expect(uniforms.uIsShortBottom.value).toBe(1);
  });
});
