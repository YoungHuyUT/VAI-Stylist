import { describe, it, expect } from 'vitest';
import {
  evaluate,
  doesRuleFire,
  harmonyScore,
  calculateHueDistance,
  contrastRatio,
  hexToOklch,
} from '../culturalGuard';
import { culturalData } from '../../data/culturalDataLoader';
import { Outfit, Rule } from '../../types/costume';

describe('Cultural Guard Engine (Rules & Verification)', () => {
  const baseOutfit: Outfit = {
    gender: 'female',
    costumeId: 'ao-ngu-than-tay-chen',
    region: 'trung',
    patternId: 'pattern_may_co',
    colors: {
      ao: '#134E4A',
      quan: '#F5F1E8',
      hoaTiet: '#D4AF37',
    },
    accessories: ['acc-khan-dong'],
    event: 'Đi Lễ Chùa',
    remix: 20,
  };

  it('evaluates traditional outfit with standard accessories as SAFE', () => {
    const result = evaluate(baseOutfit, culturalData);
    expect(result.status).toBe('SAFE');
    expect(result.fired.length).toBeGreaterThan(0);
    expect(result.fired.some((r) => r.id === 'rule-traditional-standard-safe')).toBe(true);
  });

  it('fires critical rule when sacred ceremonial costume lacks formal bottom/shoes', () => {
    const sacredNhatBinh: Outfit = {
      ...baseOutfit,
      costumeId: 'ao-nhat-binh',
      event: 'Đi Lễ Chùa',
      accessories: [], // missing formal accessories
    };
    const result = evaluate(sacredNhatBinh, culturalData);
    expect(result.status).toBe('CRITICAL');
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions[0].fix).toBeDefined();
  });

  it('fires warning rule when modern sneakers are worn at sacred temple', () => {
    const sneakerOutfit: Outfit = {
      ...baseOutfit,
      accessories: ['acc-khan-dong', 'acc-sneaker'],
      event: 'Đi Lễ Chùa',
    };
    const result = evaluate(sneakerOutfit, culturalData);
    expect(result.status).toBe('WARNING');
    expect(result.fired.some((r) => r.id === 'rule-ceremonial-sneaker')).toBe(true);
    expect(result.suggestions.some((s) => s.ruleId === 'rule-ceremonial-sneaker')).toBe(true);
  });

  it('handles remix bounds correctly (wildcards vs remix limits)', () => {
    const highRemixOutfit: Outfit = {
      ...baseOutfit,
      event: 'Chụp Ảnh Kỷ Yếu',
      remix: 75,
    };
    const result = evaluate(highRemixOutfit, culturalData);
    expect(result.status).toBe('SAFE');
    expect(result.fired.some((r) => r.id === 'rule-remix-streetwear-safe')).toBe(true);

    const lowRemixOutfit: Outfit = {
      ...highRemixOutfit,
      remix: 10,
    };
    const lowResult = evaluate(lowRemixOutfit, culturalData);
    expect(lowResult.fired.some((r) => r.id === 'rule-remix-streetwear-safe')).toBe(false);
  });

  it('wildcard rule with empty when condition always matches', () => {
    const wildcardRule: Rule = {
      id: 'rule-wildcard-test',
      level: 'safe',
      when: {},
      message: 'Always matches',
      reason: 'No filters',
      sources: ['src-nn-aomu'],
      verified: true,
    };
    expect(doesRuleFire(wildcardRule, baseOutfit)).toBe(true);
  });
});

describe('OKLCH Color Harmony Engine', () => {
  it('correctly calculates hue distance across 360 degree boundary', () => {
    expect(calculateHueDistance(10, 350)).toBe(20);
    expect(calculateHueDistance(350, 10)).toBe(20);
    expect(calculateHueDistance(180, 0)).toBe(180);
    expect(calculateHueDistance(45, 90)).toBe(45);
  });

  it('computes contrast ratio between light and dark fabrics', () => {
    const cr = contrastRatio('#134E4A', '#F5F1E8');
    expect(cr).toBeGreaterThan(3.0);
  });

  it('penalizes very low luminance contrast below 1.3', () => {
    const lowContrastColors = {
      ao: '#292524',
      quan: '#1C1917',
    };
    const harmony = harmonyScore(lowContrastColors);
    expect(harmony.notes.some((n) => n.includes('Độ tương phản sáng - tối'))).toBe(true);
    expect(harmony.score).toBeLessThan(90);
  });

  it('identifies classic neutral harmony with high aesthetic score', () => {
    const classicColors = {
      ao: '#134E4A', // Teal
      quan: '#F5F1E8', // Ivory White
    };
    const harmony = harmonyScore(classicColors);
    expect(harmony.score).toBeGreaterThanOrEqual(85);
    expect(harmony.label).toContain('gam màu trung tính');
  });

  it('accurately parses OKLCH lightness and chroma from hex', () => {
    const oklch = hexToOklch('#FFFFFF');
    expect(oklch.L).toBeCloseTo(1.0, 1);
    expect(oklch.C).toBeCloseTo(0.0, 1);
  });
});
