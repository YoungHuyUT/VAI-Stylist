import { describe, it, expect } from 'vitest';
import { calculateHueDistance, relativeLuminance, hexToRgb } from '../culturalGuard';

describe('Hue-Key Math & Recolor Preservation', () => {
  it('correctly wraps hue difference across the 360-degree boundary', () => {
    // 350 deg and 10 deg are 20 deg apart
    expect(calculateHueDistance(350, 10)).toBe(20);
    // 5 deg and 355 deg are 10 deg apart
    expect(calculateHueDistance(5, 355)).toBe(10);
    // 180 deg and 0 deg are 180 deg apart
    expect(calculateHueDistance(180, 0)).toBe(180);
  });

  it('verifies texel is within 25 degree hue-key acceptance window', () => {
    const baseHue = 175; // Emerald teal base hue
    const sampleNearHue = 190; // 15 deg difference -> accepted (< 25 deg)
    const sampleFarHue = 210; // 35 deg difference -> rejected (> 25 deg)

    expect(calculateHueDistance(baseHue, sampleNearHue)).toBeLessThanOrEqual(25);
    expect(calculateHueDistance(baseHue, sampleFarHue)).toBeGreaterThan(25);
  });

  it('preserves luminance and brightness contrast ratio calculation', () => {
    const lumLight = relativeLuminance('#F5F1E8');
    const lumDark = relativeLuminance('#134E4A');
    expect(lumLight).toBeGreaterThan(lumDark);
    expect(lumLight).toBeGreaterThan(0.5);
    expect(lumDark).toBeLessThan(0.2);
  });
});
