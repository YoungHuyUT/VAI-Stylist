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
    relationLabel = 'Phối màu tự do';
  }

  // 2. Luminance contrast check (below 1.35 ratio between ao and quan)
  const cr = contrastRatio(colors.ao, colors.quan);
  if (cr < 1.35) {
    score -= 16;
    notes.push(
      `Độ tương phản sáng - tối giữa áo và hạ y còn thấp (${cr.toFixed(
        2
      )} < 1.35), nên tăng độ chênh lệch để làm nổi bật phom tà áo và ranh giới trang phục.`
    );
  }

  // 3. High chroma and saturation clash check
  if (oklchAo.C > 0.22) {
    score -= 10;
    notes.push(
      'Màu áo có độ no màu (Chroma) rất cao, hãy cân nhắc lụa tơ tằm dệt chìm để giảm cảm giác chói gắt.'
    );
  }

  // Check competing saturated colors (both non-neutral with high chroma)
  if (!isNeutralAo && !isNeutralQuan && oklchAo.C > 0.14 && oklchQuan.C > 0.14) {
    if (hueDiff > 35 && (hueDiff < 150 || hueDiff > 210)) {
      score -= 20;
      notes.push(
        'Cả áo và hạ y đều mang sắc độ rực (Chroma cao) và lệch pha thị giác. Cổ phục Việt tôn vinh sự nền nã: nên ưu tiên quần lụa trắng ngà (#F5F1E8) hoặc quần lĩnh đen (#18181B) để tạo khoảng nghỉ thanh thoát.'
      );
    }
  } else if (!isNeutralAo && !isNeutralQuan && hueDiff >= 65 && hueDiff <= 135) {
    score -= 14;
    notes.push(
      'Hệ màu giữa thân áo và hạ y có góc lệch sắc độ gắt, thiếu điểm tựa trung hòa. Hãy cân nhắc phối cùng Quần Lụa Trắng hoặc Quần Lĩnh Đen truyền thống.'
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
        score -= 14;
        notes.push(
          'Bản phối xuất hiện hơn 3 hệ màu khác biệt cùng lúc, nên tối giản họa tiết để giữ nét nền nã cổ điển.'
        );
      }
    }
  }

  score = Math.max(30, Math.min(100, score));

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
  const harmony = harmonyScore(outfit.colors);

  // Determine overall status based on highest level, including color harmony
  let status: 'SAFE' | 'WARNING' | 'CRITICAL' = 'SAFE';
  if (firedRules.some((r) => r.level === 'critical') || harmony.score < 50) {
    status = 'CRITICAL';
  } else if (firedRules.some((r) => r.level === 'warning') || harmony.score < 75) {
    status = 'WARNING';
  }

  // Expose suggestions for fired warning or critical rules with a fix
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

  if (harmony.score < 75 && harmony.notes.length > 0) {
    suggestions.push({
      ruleId: 'rule-color-harmony-adjustment',
      message: harmony.notes[0],
      fix: {
        colors: {
          ...outfit.colors,
          quan: '#F5F1E8',
        },
      },
    });
  }

  return {
    status,
    fired: firedRules,
    harmony,
    suggestions,
  };
}

/**
 * Lời bình AI Stylist dí dỏm, vui vẻ, đậm chất GenZ Việt Nam khi phát hiện trang phục "lạc quẻ" hoặc "cấn".
 */
export function buildGenZStylistComment(params: {
  culturalStatus: 'SAFE' | 'WARNING' | 'CRITICAL';
  topName: string;
  bottomName: string;
  eventName: string;
  harmonyScore: number;
  harmonyNotes: string[];
  isSacredPlace?: boolean;
  isCeremonialGarment?: boolean;
  isVeryShortBottom?: boolean;
  hasStreetwearAccessory?: boolean;
}): string | null {
  const {
    culturalStatus,
    topName,
    bottomName,
    eventName,
    harmonyScore: score,
    harmonyNotes,
    isSacredPlace,
    isCeremonialGarment,
    isVeryShortBottom,
    hasStreetwearAccessory,
  } = params;

  if (culturalStatus === 'SAFE' && score >= 78) {
    return null;
  }

  // 1. Lễ phục trang nghiêm / Cung đình kết hợp quần short / váy ngắn (CRITICAL đại kỵ)
  if (isCeremonialGarment && isVeryShortBottom) {
    const roasts = [
      `Gì dợ má? ${topName.split('(')[0].trim()} hoàng tộc uy nghi ngút ngàn mà mix với ${bottomName} là kiếp nạn thứ 82 của cụ cố tổ gòi á! Phá cách này hơi bị "flex" quá đà, đổi qua quần lụa ống rộng dài chấm gót cho đúng chuẩn "con nhà gia giáo" liền nè ní ơi! 👑`,
      `Ét o ét! Phối đồ kiểu này là các cụ gõ đầu liền á! Tà áo cung đình trang trọng mà lấp ló ${bottomName} là "cấn" dữ dội nha ní. Đổi quần lụa dài thướt tha liền cho chuẩn quý tộc nha! 💅`,
      `Ủa alo? Outfit này nhìn muốn "tiền đình" luôn á ní! Thân trên hoàng gia quyền quý, thân dưới quẩy bar bãi biển. Cứu tui cứu tui, đổi quần lụa trắng gấp đi ní ơi! 😭`,
    ];
    return roasts[Math.abs(topName.length + bottomName.length) % roasts.length];
  }

  // 2. Đi lễ chùa / đền / hôn lễ nhưng đồ ngắn hoặc phụ kiện chọi
  if (isSacredPlace && (isVeryShortBottom || hasStreetwearAccessory)) {
    const roasts = [
      `Ní ơi ní à! Đi ${eventName} cửa Phật mà outfit "cháy phố" quá là duyên trốn luôn á! Tháo kính râm, đổi quần dài kín đáo để các cụ độ cho nè homie ơi! 🙏`,
      `10 điểm thần thái nhưng vô nơi tôn nghiêm mà chơi combo này là bị các cụ "nhìn bằng nửa con mắt" nha ní! Thay quần lụa trang nghiêm cho tâm tịnh an yên nào! ✨`,
      `Vô chùa cầu duyên mà lên đồ ngầu như đi concert thế này thì duyên cũng xỉu ngang á! Đổi quần lụa dài truyền thống liền cho chuẩn phong thái trang nghiêm nha ní! 🌸`,
    ];
    return roasts[Math.abs(topName.length + eventName.length) % roasts.length];
  }

  // 3. Xung đột màu sắc nghiêm trọng (Chroma cao combat hoặc điểm hòa hợp cực thấp < 55)
  if (score < 55) {
    const roasts = [
      `Màu sắc chưa hợp bạn uii! Màu áo với màu quần đang combat 1-1 giành spotlight căng đét luôn á. Cứu đôi mắt tui bằng một chiếc Quần Lụa Trắng ngà (#F5F1E8) liền đi ní ơi! 😂`,
      `Màu sắc chưa hợp bạn uii! Áo một đằng quần một nẻo, nhìn như 2 vũ trụ đa chiều đang va chạm zậy á. Điểm độc lạ 10/10 mà điểm hòa hợp thì xin phép "quay xe" gấp nhen! 💅`,
      `Màu sắc chưa hợp bạn uii! Hai gam màu này đang giành spotlight như drama showbiz dị á. Đổi Quần Lụa Trắng hoặc Quần Lĩnh Đen cho mắt được thở xíu nè homie! 🔥`,
    ];
    return roasts[Math.abs(topName.length + score) % roasts.length];
  }

  // 4. Lỗi tương phản sáng tối thấp (Tàng hình / Nhập làm một)
  if (harmonyNotes.some((n) => n.includes('tương phản'))) {
    const roasts = [
      `Màu sắc chưa hợp bạn uii! Giao diện này nhìn hơi bị "tàng hình" nha homie! Áo với quần tiệp màu quá làm phom tà áo trôi dạt nơi nao luôn rồi, thêm xíu sáng tối cho nét căng đét coi nè! 👀`,
      `Màu sắc chưa hợp bạn uii! Áo với quần nhập làm một luôn gòi! Tăng độ chênh lệch sáng tối lên cho thiên hạ còn chiêm ngưỡng tà áo thướt tha chứ ní! ✨`,
    ];
    return roasts[Math.abs(bottomName.length) % roasts.length];
  }

  // 5. Màu sắc lệch pha nhẹ (55 <= score < 76)
  if (score < 76) {
    const roasts = [
      `Màu sắc chưa hợp bạn uii! Set đồ này 10 điểm thần thái nhưng trừ 1 điểm hòa hợp màu nha! Áo với quần hơi bị lệch pha nhẹ, đổi sang Quần Lụa Trắng ngà là lên hình bao bén liền nè! ✨`,
      `Màu sắc chưa hợp bạn uii! Hai gam màu này đứng cạnh nhau hơi bị "chiến" quá đà nha ní ơi! Giảm sắc độ hoặc chọn màu quần trung tính cho chuẩn vibe quý tộc cổ phong nè! 🍵`,
      `Màu sắc chưa hợp bạn uii! Phối màu chưa được "keo lỳ" cho lắm, thử đổi màu quần sang trắng ngà hoặc đen tuyền xem sao nha ní ơi! 🎨`,
    ];
    return roasts[Math.abs(score) % roasts.length];
  }

  // 6. Giao thoa hiện đại (Jeans/Kaki mix Cổ phục thường ngày - WARNING)
  if (culturalStatus === 'WARNING') {
    const roasts = [
      `Bản phối Gen Z này "cháy phố" dữ dằn nha ní! Mix đồ kiểu này dạo phố chụp ảnh thì bao chất, nhưng nếu ghé thăm di tích lịch sử thì nhớ tém tém lại xíu nhen! 😎`,
      `Giao diện giao thoa Đông Tây nhìn cũng "ra gì và này nọ" phết! Cơ mà nếu muốn đúng điệu cổ phục thanh tao thì quần lụa vẫn là chân ái nha ní! 🌿`,
    ];
    return roasts[Math.abs(topName.length) % roasts.length];
  }

  return null;
}
