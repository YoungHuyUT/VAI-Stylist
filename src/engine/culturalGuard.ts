import {
  Outfit,
  CulturalDataSet,
  CulturalEvaluationResult,
  Rule,
  HarmonyResult,
} from '../types/costume';

// ----------------------------------------------------------------------
// OKLCH & COLOR HARMONY ENGINE
// ----------------------------------------------------------------------

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) / 255;
    const g = parseInt(clean[1] + clean[1], 16) / 255;
    const b = parseInt(clean[2] + clean[2], 16) / 255;
    return [r, g, b];
  }
  const r = parseInt(clean.substring(0, 2), 16) / 255 || 0;
  const g = parseInt(clean.substring(2, 4), 16) / 255 || 0;
  const b = parseInt(clean.substring(4, 6), 16) / 255 || 0;
  return [r, g, b];
}

export function hexToOklch(hex: string): { L: number; C: number; H: number } {
  const [r, g, b] = hexToRgb(hex);
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const b_ = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const C = Math.hypot(a, b_);
  let H = (Math.atan2(b_, a) * 180) / Math.PI;
  if (H < 0) H += 360;

  return { L, C, H };
}

export function calculateHueDistance(hue1: number, hue2: number): number {
  const d = Math.abs(hue1 - hue2) % 360;
  return d > 180 ? 360 - d : d;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const bright = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (bright + 0.05) / (dark + 0.05);
}

/**
 * Computes color harmony in OKLCH:
 * - classifies hue relations: monochrome (<15°), analogous (<45°), complementary (150°-210°), other
 * - penalizes more than 3 hue families
 * - penalizes high chroma over large areas (C > 0.22)
 * - penalizes low luminance contrast between garment and trousers (< 1.3)
 */
export function harmonyScore(colors: {
  ao: string;
  quan: string;
  hoaTiet?: string;
}): HarmonyResult {
  const oklchAo = hexToOklch(colors.ao);
  const oklchQuan = hexToOklch(colors.quan);

  const notes: string[] = [];
  let score = 92;

  // 1. Hue classification between main garment and trousers
  const hueDiff = calculateHueDistance(oklchAo.H, oklchQuan.H);
  let relationLabel = 'Hài hòa tự nhiên';

  // Check if either color is achromatic / neutral (low chroma)
  const isNeutralAo = oklchAo.C < 0.035;
  const isNeutralQuan = oklchQuan.C < 0.035;

  if (isNeutralAo || isNeutralQuan) {
    relationLabel = 'Phối màu kinh điển với gam màu trung tính';
    score += 4;
  } else if (hueDiff < 15) {
    relationLabel = 'Đơn sắc (Monochrome) trang nhã';
    score += 3;
  } else if (hueDiff < 45) {
    relationLabel = 'Tương đồng (Analogous) êm dịu';
    score += 2;
  } else if (hueDiff >= 150 && hueDiff <= 210) {
    relationLabel = 'Tương phản bổ túc (Complementary) rực rỡ';
    score += 1;
  } else {
    relationLabel = 'Phối màu tam giác hoặc tương phản tự do';
  }

  // 2. Luminance contrast check (below 1.3 ratio between ao and quan)
  const cr = contrastRatio(colors.ao, colors.quan);
  if (cr < 1.3) {
    score -= 14;
    notes.push(
      `Độ tương phản sáng - tối giữa áo và hạ y còn thấp (${cr.toFixed(
        2
      )} < 1.3), nên tăng độ chênh lệch để làm nổi bật phom tà áo.`
    );
  }

  // 3. High chroma check (C > 0.22 on large fabric areas)
  if (oklchAo.C > 0.22) {
    score -= 10;
    notes.push(
      'Màu áo có độ no màu (Chroma) rất cao, hãy cân nhắc lụa tơ tằm dệt chìm để giảm cảm giác chói gắt.'
    );
  }

  // 4. More than 3 distinct hue families check (if accent color hoaTiet is supplied)
  if (colors.hoaTiet) {
    const oklchHoaTiet = hexToOklch(colors.hoaTiet);
    if (oklchHoaTiet.C > 0.04) {
      const d1 = calculateHueDistance(oklchAo.H, oklchQuan.H);
      const d2 = calculateHueDistance(oklchAo.H, oklchHoaTiet.H);
      const d3 = calculateHueDistance(oklchQuan.H, oklchHoaTiet.H);
      if (d1 > 45 && d2 > 45 && d3 > 45 && !isNeutralAo && !isNeutralQuan) {
        score -= 12;
        notes.push(
          'Bản phối xuất hiện hơn 3 hệ màu khác biệt cùng lúc, nên tối giản họa tiết để giữ nét nền nã cổ điển.'
        );
      }
    }
  }

  score = Math.max(35, Math.min(100, score));

  return {
    score,
    label: relationLabel,
    notes,
  };
}

// ----------------------------------------------------------------------
// CULTURAL GUARD EVALUATION ENGINE
// ----------------------------------------------------------------------

export function doesRuleFire(rule: Rule, outfit: Outfit): boolean {
  const { when } = rule;

  // Wildcard: empty condition always passes
  if (when.costumeIds && when.costumeIds.length > 0) {
    if (!when.costumeIds.includes(outfit.costumeId)) {
      return false;
    }
  }

  if (when.genders && when.genders.length > 0) {
    if (!when.genders.includes(outfit.gender)) {
      return false;
    }
  }

  if (when.events && when.events.length > 0) {
    if (!when.events.includes(outfit.event)) {
      return false;
    }
  }

  if (when.patternIds && when.patternIds.length > 0) {
    const curPattern = outfit.patternId || 'none';
    if (!when.patternIds.includes(curPattern)) {
      return false;
    }
  }

  if (when.accessoryIds && when.accessoryIds.length > 0) {
    const hasAnyAccessory = when.accessoryIds.some((accId) =>
      outfit.accessories.includes(accId)
    );
    if (!hasAnyAccessory) {
      return false;
    }
  }

  // Remix bounds handling
  if (when.remixAtLeast !== undefined) {
    if (outfit.remix < when.remixAtLeast) {
      return false;
    }
  }

  if (when.remixAtMost !== undefined) {
    if (outfit.remix > when.remixAtMost) {
      return false;
    }
  }

  return true;
}

/**
 * Pure evaluation function:
 * evaluate(outfit, data) -> { status, fired, harmony, suggestions }
 * - status: highest fired level ("CRITICAL" > "WARNING" > "SAFE")
 * - fired: list of rules that matched
 * - harmony: OKLCH color harmony calculations
 * - suggestions: exposed fixes for the "Sửa chuẩn" action
 */
export function evaluate(
  outfit: Outfit,
  data: CulturalDataSet
): CulturalEvaluationResult {
  const firedRules = data.rules.filter((rule) => doesRuleFire(rule, outfit));

  // Determine overall status based on highest level
  let status: 'SAFE' | 'WARNING' | 'CRITICAL' = 'SAFE';
  if (firedRules.some((r) => r.level === 'critical')) {
    status = 'CRITICAL';
  } else if (firedRules.some((r) => r.level === 'warning')) {
    status = 'WARNING';
  }

  // Calculate OKLCH harmony
  const harmony = harmonyScore(outfit.colors);

  // Expose suggestions only for fired warning or critical rules with a fix
  const suggestions: Array<{
    ruleId: string;
    message: string;
    fix?: Partial<Outfit>;
  }> = [];

  for (const rule of firedRules) {
    if ((rule.level === 'critical' || rule.level === 'warning') && rule.fix) {
      suggestions.push({
        ruleId: rule.id,
        message: rule.message,
        fix: rule.fix.set,
      });
    }
  }

  return {
    status,
    fired: firedRules,
    harmony,
    suggestions,
  };
}
