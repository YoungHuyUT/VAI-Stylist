/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  CloudSun,
  BookOpen,
  Copy,
  Check,
  RefreshCw,
  Shuffle,
  Code2,
  Wand2,
  Minus,
  Plus,
  Shirt,
  Footprints,
  MapPin,
  Smile,
  ScrollText,
  Download,
  UserCheck,
  Share2,
  Volume2,
  Square,
  Compass,
} from 'lucide-react';
import {
  TOP_GARMENTS,
  TRADITIONAL_COLORS,
  TRADITIONAL_PATTERNS,
  FABRIC_MATERIALS,
  BOTTOM_GARMENTS,
  ACCESSORIES,
  WEATHER_PRESETS,
  EVENT_TYPES,
  CURATED_PRESETS,
  HAIR_STYLES,
  HAIR_COLORS,
  EXPRESSIONS,
  NECKLINE_CUT_OPTIONS,
  HEM_LENGTH_CUT_OPTIONS,
  FOOTWEAR_ACCESSORY_NAMES,
  IMAGE_MODEL,
  PatternId,
  FabricMaterialId,
  HairStyleId,
  ExpressionId,
  NecklineCutId,
  HemLengthCutId,
  OutfitEvaluationOutput,
  OutfitInputPayload,
  VStylistConsultationOutput,
  buildVPhucPrecisionAudit,
  buildDeterministicVStylistConsultation,
  mapAccessoryIdToName,
  mapAccessoryNameToId,
  CATALOG_COLOR_SWATCHES,
} from './data/vietPhucData';
import { VietPhucCanvas, getDesignSnapshot } from './components/VietPhucCanvas';
import { BodyShapeAndFitModal } from './components/BodyShapeAndFitModal';
import { RemixStudioModal } from './components/RemixStudioModal';
import { LookbookModal } from './ui/LookbookModal';
import { CompareModal, SavedLook } from './ui/CompareModal';
import { VietPhucQuestModal } from './ui/VietPhucQuestModal';
import { ScanModal } from './ui/ScanModal';
import { RemixLook } from './types/remix';
import {
  OutfitStateProvider,
  useOutfitState,
  OutfitState,
} from './state/outfitStore';
import {
  loadCustomPatternMaskIntoCache,
  getPatternMaskFromIndexedDb,
  prunePatternMasksInIndexedDb,
  invalidatePatternMaskInIndexedDb,
  exportPatternsZip,
} from './utils/vstylistStorageAndZip';
import { invalidatePatternTextureCache } from './components/vietPhucGlbLoader';
import { harmonyScore, buildGenZStylistComment } from './engine/culturalGuard';

export { getDesignSnapshot, useOutfitState };
export type { OutfitState };

/**
 * Instant zero-latency local evaluation so the Paper & Silk lookbook card updates immediately on every button press.
 */
function computeInstantPreview(
  topFullString: string,
  bottomName: string,
  selectedPattern: PatternId,
  accessories: string[],
  location: string,
  temperature: string,
  condition: string,
  eventType: string,
  userCustomRequest: string,
  historySnippet: string,
  colors?: { ao: string; quan: string; hoaTiet?: string }
): OutfitEvaluationOutput {
  const lowerBottom = bottomName.toLowerCase();
  const lowerTop = topFullString.toLowerCase();
  const lowerAcc = accessories.join(' ').toLowerCase();
  const lowerEvent = eventType.toLowerCase();
  const customReq = userCustomRequest.trim();
  const lowerReq = customReq.toLowerCase();

  const patternLabelMap: Record<PatternId, string> = {
    pattern_may_co: 'hoa văn Mây Cổ chìm',
    pattern_chim_lac: 'họa tiết Chim Lạc Đông Sơn ánh kim',
    pattern_song_nuoc: 'hoa văn Thủy Ba Sóng Nước',
    pattern_cuc_day: 'hoa văn Cúc Dây trường thọ',
    none: 'lụa trơn truyền thống',
  };
  const patternLabel = patternLabelMap[selectedPattern] || 'lụa truyền thống';

  // Exact match check for Few-Shot Example 1
  if (
    topFullString === 'Áo Ngũ Thân Tay Chẽn (Màu Xanh Cổ Vịt)' &&
    bottomName === 'Quần Lụa Trắng' &&
    selectedPattern === 'pattern_may_co' &&
    location === 'Hà Nội' &&
    temperature === '22°C' &&
    eventType === 'Đi Lễ Chùa' &&
    !customReq
  ) {
    return CURATED_PRESETS[0].precomputedOutput;
  }

  // Exact match check for Few-Shot Example 3 (CRITICAL)
  if (
    topFullString.includes('Áo Nhật Bình') &&
    bottomName === 'Quần Short Jeans Cắt Ngắn' &&
    location === 'TP.HCM' &&
    temperature === '34°C' &&
    eventType === 'Đi Lễ Đền' &&
    !customReq
  ) {
    return CURATED_PRESETS[2].precomputedOutput;
  }

  const isSacredPlace =
    lowerEvent.includes('chùa') ||
    lowerEvent.includes('đền') ||
    lowerEvent.includes('hôn lễ');
  const isCeremonialGarment =
    lowerTop.includes('nhật bình') ||
    lowerTop.includes('áo tấc') ||
    lowerTop.includes('áo thụng');
  const isVeryShortBottom =
    lowerBottom.includes('short') ||
    lowerBottom.includes('miniskirt') ||
    lowerBottom.includes('váy ngắn');
  const isCritical =
    isVeryShortBottom && (isSacredPlace || isCeremonialGarment);

  const isWarning =
    !isCritical &&
    (lowerBottom.includes('jeans') ||
      lowerBottom.includes('kaki') ||
      isVeryShortBottom ||
      lowerAcc.includes('sneaker') ||
      lowerAcc.includes('kính') ||
      lowerAcc.includes('cao gót'));

  const tempNum = parseInt(temperature.replace(/[^0-9-]/g, ''), 10) || 24;
  let weatherAdvice = `Thời tiết ${location} ${temperature} (${condition}) vô cùng lý tưởng để diện cổ phục kết hợp ${patternLabel} mà không lo oi nóng.`;
  if (tempNum >= 31) {
    weatherAdvice = `Dưới tiết trời ${location} ${temperature} (${condition}), nên ưu tiên lụa tơ tằm mỏng hoặc sa nhẹ để tránh oi nóng.`;
  } else if (tempNum <= 18) {
    weatherAdvice = `Tiết trời ${location} ${temperature} (${condition}) rất hợp để khoác Việt phục lụa gấm dày dặn kèm khăn đóng ấm áp.`;
  }

  let customFeedback: string | null = null;
  let recColorHex: string | null = null;
  let recPatternId: PatternId | null = selectedPattern;

  if (customReq.length > 0) {
    if (
      lowerReq.includes('kỷ yếu') ||
      lowerReq.includes('phá cách') ||
      lowerReq.includes('gen z') ||
      lowerReq.includes('nổi bật')
    ) {
      customFeedback =
        "Để nổi bật hơn mà vẫn tinh tế cho bộ ảnh kỷ yếu, AI gợi ý bạn phủ thêm họa tiết 'Chim Lạc' ánh kim ở viền tay áo và giữ tông màu Đỏ Son chủ đạo.";
      recColorHex = '#9A2B1D';
      recPatternId = 'pattern_chim_lac';
    } else if (
      lowerReq.includes('chùa') ||
      lowerReq.includes('lễ') ||
      lowerReq.includes('nhã nhặn') ||
      lowerReq.includes('trang nghiêm')
    ) {
      customFeedback =
        "Để tôn nét thanh tịnh nơi cửa Phật, AI gợi ý chuyển sang sắc Xanh Cổ Vịt (#134E4A) kết hợp vân 'Mây Cổ' dệt chìm trang nhã.";
      recColorHex = '#134E4A';
      recPatternId = 'pattern_may_co';
    } else if (
      lowerReq.includes('cưới') ||
      lowerReq.includes('hoàng gia') ||
      lowerReq.includes('sang trọng')
    ) {
      customFeedback =
        "Cho dịp lễ nghi trọng đại, AI gợi ý sắc Vàng Mai (#B45309) phối cùng hoa văn 'Cúc Dây' hoặc 'Sóng Nước' cung đình.";
      recColorHex = '#B45309';
      recPatternId = 'pattern_cuc_day';
    } else {
      customFeedback = `Để thực hiện ý tưởng "${customReq}" hài hòa nhất với chuẩn mực Việt phục, AI gợi ý kết hợp hoa văn 'Mây Cổ' cùng sắc lụa truyền thống.`;
      recColorHex = '#134E4A';
      recPatternId = selectedPattern === 'none' ? 'pattern_may_co' : selectedPattern;
    }
  }

  const harmony = colors ? harmonyScore(colors) : null;
  const isColorCritical = Boolean(harmony && harmony.score < 52);
  const isColorWarning = Boolean(harmony && (harmony.score < 75 || harmony.notes.length > 0));

  const effectiveCritical = isCritical || isColorCritical;
  const effectiveWarning = !effectiveCritical && (isWarning || isColorWarning);
  const effectiveStatus = effectiveCritical
    ? 'CRITICAL'
    : effectiveWarning
    ? 'WARNING'
    : 'SAFE';

  const genzComment = buildGenZStylistComment({
    culturalStatus: effectiveStatus,
    topName: topFullString,
    bottomName,
    eventName: eventType,
    harmonyScore: harmony ? harmony.score : 92,
    harmonyNotes: harmony ? harmony.notes : [],
    isSacredPlace,
    isCeremonialGarment,
    isVeryShortBottom,
    hasStreetwearAccessory: accessories.some((a) => {
      const l = a.toLowerCase();
      return l.includes('sneaker') || l.includes('kính') || l.includes('sunglasses');
    }),
  });

  if (effectiveCritical) {
    const colorReason = isColorCritical && harmony?.notes.length ? ` ${harmony.notes.join(' ')}` : '';
    return {
      lookbook_title: 'Bất Hòa Phong Cách',
      style_score: harmony ? Math.min(30, Math.max(15, harmony.score - 20)) : 30,
      weather_advice: weatherAdvice,
      cultural_status: 'CRITICAL',
      cultural_warning_msg: isCritical
        ? `${bottomName} tạo điểm nhấn phá cách, nhưng độ dài này có thể chưa hợp với ${eventType} hoặc sắc thái lễ phục của ${topFullString.split('(')[0].trim()}. Nếu muốn giữ không khí trang trọng, bạn có thể thử quần lụa ống rộng.${colorReason}`
        : `Phối màu giữa áo và hạ y xung đột sắc độ nghiêm trọng.${colorReason} Hãy chọn Quần Lụa Trắng hoặc hạ bớt độ no màu để đạt chuẩn mực cổ phong.`,
      cultural_history_fact: historySnippet,
      custom_request_feedback: customFeedback,
      recommended_color_hex: recColorHex || '#2C221E',
      recommended_pattern_id: 'none',
      genz_ai_comment: genzComment,
    };
  }

  if (effectiveWarning) {
    let warningScore = isSacredPlace ? 68 : 85;
    if (harmony) {
      const penalty = Math.max(0, 85 - harmony.score);
      warningScore = Math.max(48, warningScore - Math.round(penalty * 0.8));
    }
    const colorWarningText = isColorWarning && harmony?.notes.length ? ` Lưu ý màu sắc: ${harmony.notes[0]}` : '';
    const baseWarningText = isWarning
      ? (isSacredPlace
          ? `Bản phối Gen Z rất cá tính nhưng cần tiết chế khi ${eventType}. Hãy đổi sang quần lụa truyền thống và tháo phụ kiện đường phố khi vào nơi tôn nghiêm nhé!`
          : `Bản phối rất cá tính! Việc kết hợp phụ kiện hiện đại mang lại tinh thần Gen Z năng động cho dịp ${eventType}. Tuy nhiên, nếu ghé thăm các di tích lịch sử, bạn nên tháo kính râm để giữ sự trang trọng.`)
      : `Phối màu giữa áo và hạ y cần thêm độ tương phản hoặc giảm sắc độ để tôn trọn nét nhã nhặn cổ phong.`;

    return {
      lookbook_title: 'Đông Kinh Phá Cách',
      style_score: warningScore,
      weather_advice: weatherAdvice,
      cultural_status: 'WARNING',
      cultural_warning_msg: `${baseWarningText}${colorWarningText ? ' ' + colorWarningText : ''}`,
      cultural_history_fact: historySnippet,
      custom_request_feedback: customFeedback,
      recommended_color_hex: recColorHex || '#9A2B1D',
      recommended_pattern_id: recPatternId === 'none' ? 'pattern_chim_lac' : recPatternId,
      genz_ai_comment: genzComment,
    };
  }

  let poeticTitle = 'Thanh Phong Trụ Vũ';
  if (lowerTop.includes('áo dài')) poeticTitle = 'Dáng Ngọc Kinh Kỳ';
  else if (lowerTop.includes('tứ thân')) poeticTitle = 'Xuân Miền Kinh Bắc';
  else if (lowerTop.includes('bà ba')) poeticTitle = 'Hương Sắc Phương Nam';
  else if (lowerTop.includes('viên lĩnh')) poeticTitle = 'Đoàn Hoa Cát Tường';
  else if (lowerTop.includes('đỏ son')) poeticTitle = 'Đan Tâm Nhã Vận';
  else if (lowerTop.includes('vàng mai')) poeticTitle = 'Kim Chi Ngọc Diệp';
  else if (lowerTop.includes('tím huế')) poeticTitle = 'Mộng Đẹp Cố Đô';
  else if (lowerTop.includes('hồng đào')) poeticTitle = 'Đào Hoa Nhất Tiếu';
  else if (lowerTop.includes('chàm')) poeticTitle = 'Sơn Thủy Hữu Tình';
  else if (lowerTop.includes('bạch ngọc')) poeticTitle = 'Bạch Hạc Tầm Xuân';

  let safeScore = 98;
  if (harmony) {
    safeScore = Math.max(80, Math.min(100, Math.round(92 * 0.3 + harmony.score * 0.7)));
  }

  return {
    lookbook_title: poeticTitle,
    style_score: safeScore,
    weather_advice: weatherAdvice,
    cultural_status: 'SAFE',
    cultural_warning_msg: `Trang phục hoàn hảo! Sự kết hợp giữa ${topFullString}, ${patternLabel} và ${bottomName} thể hiện trọn vẹn nét nhã nhặn, tôn nghiêm đúng chuẩn mực truyền thống.`,
    cultural_history_fact: historySnippet,
    custom_request_feedback: customFeedback,
    recommended_color_hex: recColorHex,
    recommended_pattern_id: recPatternId,
    genz_ai_comment: genzComment,
  };
}

function VStylistWorkspace() {
  // Single Unified Outfit State: { gender, costumeId, colors, accessories, event }
  // Read by the 3D viewer, the advisor panel, and the AI request.
  const {
    outfit,
    setOutfit,
    setGender: setGenderEn,
    setCostumeId: setSelectedTopId,
    setPatternId: setSelectedPattern,
    setPrimaryColorById: setSelectedColorId,
    setPrimaryColorHex,
    setTrouserByName: setSelectedBottomName,
    setPatternColorHex,
    setPatternConfig,
    toggleAccessory: toggleOutfitAccessory,
    setAccessories: setSelectedAccessories,
    setNecklineCut,
    setHemLengthCut,
    setTrouserColorHex,
    setEvent: setSelectedEvent,
  } = useOutfitState();

  const genderEn = outfit.gender;
  const selectedTopId = outfit.costumeId;
  const selectedPattern = outfit.patternId;
  const selectedColorId = outfit.colors.primaryId;
  const selectedBottomName = outfit.colors.trouserName;
  const selectedAccessories = outfit.accessories;
  const selectedNecklineCut: NecklineCutId =
    outfit.necklineCut || 'co-truyen-thong';
  const selectedHemLengthCut: HemLengthCutId =
    outfit.hemLengthCut || 'ta-dai-chuan';
  const selectedEvent = outfit.event;

  // Additional Character & Context State
  const [hairStyle, setHairStyle] = useState<HairStyleId>('bui-truyen-thong');
  const [hairColorHex, setHairColorHex] = useState<string>(HAIR_COLORS[0].hex);
  const [expression, setExpression] = useState<ExpressionId>('trang-nghiem');

  const [selectedFabricMaterial, setSelectedFabricMaterial] =
    useState<FabricMaterialId>('lua-ha-dong');
  const [isGeneratingPatternMask, setIsGeneratingPatternMask] =
    useState<boolean>(false);
  const [patternMaskError, setPatternMaskError] = useState<{
    finishReason?: string;
    promptFeedback?: unknown;
    text?: string;
  } | null>(null);

  // Prune expired/excess pattern masks and hydrate valid cached pattern masks from IndexedDB on mount
  useEffect(() => {
    prunePatternMasksInIndexedDb().finally(() => {
      TRADITIONAL_PATTERNS.forEach((pat) => {
        if (pat.id === 'none') return;
        getPatternMaskFromIndexedDb(pat.id).then((cachedUrl) => {
          if (cachedUrl) {
            loadCustomPatternMaskIntoCache(pat.id, cachedUrl, false).then(() => {
              invalidatePatternTextureCache(pat.id);
            });
          }
        });
      });
    });
  }, []);
  const [selectedWeatherId, setSelectedWeatherId] = useState<string>('hanoi-autumn');
  const [tempValue, setTempValue] = useState<number>(22);
  const [customCondition, setCustomCondition] = useState<string>('Mát mẻ');
  const [customLocation, setCustomLocation] = useState<string>('Hà Nội');
  const [userCustomRequest, setUserCustomRequest] = useState<string>('');
  const [isBodyShapeModalOpen, setIsBodyShapeModalOpen] = useState<boolean>(false);
  const [isRemixStudioOpen, setIsRemixStudioOpen] = useState<boolean>(false);
  const [isLookbookOpen, setIsLookbookOpen] = useState<boolean>(false);
  const [isCompareOpen, setIsCompareOpen] = useState<boolean>(false);
  const [isQuestOpen, setIsQuestOpen] = useState<boolean>(false);
  const [isScanOpen, setIsScanOpen] = useState<boolean>(false);
  const [savedLooks, setSavedLooks] = useState<SavedLook[]>([]);

  // UI Navigation Tabs inside Left Control Dock
  const [activeControlTab, setActiveControlTab] = useState<
    'top' | 'bottom_acc' | 'character' | 'context'
  >('top');
  const [activePresetId, setActivePresetId] = useState<string>('preset-safe-standard');
  // Right Panel Output State ('card' = Stylist AI, 'lore' = Sổ Tay Điển Tích, 'json' = Advanced JSON)
  const [evaluation, setEvaluation] = useState<OutfitEvaluationOutput>(
    CURATED_PRESETS[0].precomputedOutput
  );
  const [vStylistConsultation, setVStylistConsultation] =
    useState<VStylistConsultationOutput>(() =>
      buildDeterministicVStylistConsultation({
        location: 'Hà Nội',
        weather: '22°C (Mát mẻ)',
        event: 'Đi Lễ Chùa',
        freeformRequest: '',
      })
    );
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isConsultingAi, setIsConsultingAi] = useState<boolean>(false);
  const [isPlayingAudioGuide, setIsPlayingAudioGuide] = useState<boolean>(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [rightTab, setRightTab] = useState<'card' | 'lore' | 'json'>('card');
  const [jsonSchemaMode, setJsonSchemaMode] = useState<
    'vstylist_ai' | 'vphuc_precision' | 'stylist'
  >('vstylist_ai');
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [customJsonInput, setCustomJsonInput] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isGenzAlertOpen, setIsGenzAlertOpen] = useState<boolean>(true);

  useEffect(() => {
    if (evaluation.genz_ai_comment) {
      setIsGenzAlertOpen(true);
    }
  }, [evaluation.genz_ai_comment]);

  const currentTop =
    TOP_GARMENTS.find((t) => t.id === selectedTopId) || TOP_GARMENTS[0];
  const currentColor =
    TRADITIONAL_COLORS.find((c) => c.id === selectedColorId) || TRADITIONAL_COLORS[0];
  const currentBottom =
    BOTTOM_GARMENTS.find((b) => b.name === selectedBottomName) || BOTTOM_GARMENTS[0];
  const colorHarmony = harmonyScore({
    ao: outfit.colors.ao,
    quan: outfit.colors.quan,
    hoaTiet: outfit.colors.hoaTiet,
  });
  const colorHarmonyNeedsAttention =
    colorHarmony.notes.length > 0 || colorHarmony.score < 76;
  const currentFabric =
    FABRIC_MATERIALS.find((f) => f.id === selectedFabricMaterial) || FABRIC_MATERIALS[0];

  const vPhucPrecisionAudit = buildVPhucPrecisionAudit({
    genderEn,
    topGarment: currentTop,
    bottomGarment: currentBottom,
    fabricMaterialId: selectedFabricMaterial,
    patternId: selectedPattern,
    culturalStatus: evaluation.cultural_status,
  });

  const formattedTopName = `${currentTop.baseName} (${currentColor.name})`;
  const formattedTemp = `${tempValue}°C`;

  const currentPayload: OutfitInputPayload = {
    selected_items: {
      top: currentTop.baseName,
      bottom: selectedBottomName,
      primary_color: `${currentColor.name.replace('Màu ', '')} (${currentColor.hex})`,
      accessories: selectedAccessories,
    },
    selected_pattern: selectedPattern,
    weather_data: {
      location: customLocation,
      temperature: formattedTemp,
      condition: customCondition,
    },
    event_type: selectedEvent,
    user_custom_request: userCustomRequest,
  };

  useEffect(() => {
    setCustomJsonInput(JSON.stringify(currentPayload, null, 2));
  }, [
    currentTop.baseName,
     currentColor.name,
    currentColor.hex,
    selectedPattern,
    selectedBottomName,
    selectedAccessories,
    customLocation,
    formattedTemp,
    customCondition,
    selectedEvent,
    userCustomRequest,
  ]);

  useEffect(() => {
    const instant = computeInstantPreview(
      formattedTopName,
      selectedBottomName,
      selectedPattern,
      selectedAccessories,
      customLocation,
      formattedTemp,
      customCondition,
      selectedEvent,
      userCustomRequest,
      currentTop.historySnippet,
      {
        ao: outfit.colors.ao,
        quan: outfit.colors.quan,
        hoaTiet: outfit.colors.hoaTiet,
      }
    );
    setEvaluation(instant);
  }, [
    formattedTopName,
    selectedBottomName,
    selectedPattern,
    selectedAccessories,
    customLocation,
    formattedTemp,
    customCondition,
    selectedEvent,
    userCustomRequest,
    currentTop.historySnippet,
    outfit.colors.ao,
    outfit.colors.quan,
    outfit.colors.hoaTiet,
  ]);

  useEffect(() => {
    const localConsult = buildDeterministicVStylistConsultation({
      location: customLocation,
      weather: `${formattedTemp} (${customCondition})`,
      event: selectedEvent,
      freeformRequest: userCustomRequest,
      gender: genderEn,
      selectedCostumeId: selectedTopId,
      selectedMainColor: outfit.colors.ao || currentColor.hex,
      selectedMainColorName: currentColor.name,
      selectedBottomColor: outfit.colors.quan || '#F5F1E8',
      selectedBottomName,
      selectedPatternId: selectedPattern,
      selectedAccessoryIds: selectedAccessories.map((acc) => mapAccessoryNameToId(acc)),
    });
    setVStylistConsultation(localConsult);
  }, [
    customLocation,
    formattedTemp,
    customCondition,
    selectedEvent,
    userCustomRequest,
    genderEn,
    selectedTopId,
    outfit.colors.ao,
    currentColor.hex,
    currentColor.name,
    outfit.colors.quan,
    selectedBottomName,
    selectedPattern,
    selectedAccessories,
  ]);

  // Stop any playing audio guide automatically if the user switches costume so it never plays stale audio
  useEffect(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudioGuide(false);
  }, [selectedTopId]);

  const handleToggleGender = (g: 'male' | 'female') => {
    setGenderEn(g);
    if (g === 'female') {
      if (hairStyle === 're-ngoi-thu-sinh' || hairStyle === 'toc-ivy') {
        setHairStyle('bui-truyen-thong');
      }
    } else {
      if (hairStyle === 'bui-truyen-thong' || hairStyle === 'xoa-tu-nhien') {
        setHairStyle('toc-ivy');
      }
    }
  };

  const handleResetPatternMaskCache = async () => {
    if (selectedPattern === 'none') return;
    await invalidatePatternMaskInIndexedDb(selectedPattern);
    invalidatePatternTextureCache(selectedPattern);
    setPatternConfig({ strength: outfit.patternConfig.strength });
  };

  const handleGenerateAiPatternMask = async () => {
    if (selectedPattern === 'none') return;
    const patObj = TRADITIONAL_PATTERNS.find((p) => p.id === selectedPattern);
    if (!patObj) return;

    setIsGeneratingPatternMask(true);
    setPatternMaskError(null);
    const prompt = `Seamless tileable fabric pattern, flat top-down, motif: ${patObj.name} - ${patObj.desc}, white motifs on a pure black background, high contrast, no shading, no folds, no text.`;

    try {
      const resp = await fetch('/api/gemini/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          aspectRatio: '1:1',
        }),
      });
      const json = await resp.json();
      if (!resp.ok || !json.ok || !json.imageDataUrl) {
        const errInfo = {
          finishReason: json.finishReason || 'NO_IMAGE_RETURNED',
          promptFeedback: json.promptFeedback || null,
          text: json.text || json.error || 'No inlineData image returned.',
        };
        console.error('[V-Stylist Pattern Mask AI Error]', errInfo);
        setPatternMaskError(errInfo);
        return;
      }

      await loadCustomPatternMaskIntoCache(selectedPattern, json.imageDataUrl);
      invalidatePatternTextureCache(selectedPattern);
      // Trigger re-render of pattern config
      setPatternConfig({ strength: outfit.patternConfig.strength });
    } catch (err) {
      setPatternMaskError({
        finishReason: 'NETWORK_ERROR',
        text: String(err),
      });
    } finally {
      setIsGeneratingPatternMask(false);
    }
  };

  const applyVStylistRecommendationTo3D = useCallback(
    (rec: VStylistConsultationOutput['recommendation']) => {
      setActivePresetId('');
      if (rec.costumeId) {
        setSelectedTopId(rec.costumeId);
      }
      if (rec.mainColor) {
        const matchedColor = TRADITIONAL_COLORS.find(
          (c) => c.hex.toLowerCase() === rec.mainColor.toLowerCase()
        );
        if (matchedColor) {
          setSelectedColorId(matchedColor.id);
        } else {
          setPrimaryColorHex(rec.mainColor);
        }
      }
      if (rec.bottomColor) {
        const normBot = rec.bottomColor.toLowerCase();
        if (normBot === '#334155') {
          setSelectedBottomName('Quần Lĩnh Đen Ống Rộng');
        } else if (
          rec.costumeId === 'ao-nhat-binh' ||
          rec.costumeId === 'ao-tu-than-kinh-bac'
        ) {
          setSelectedBottomName('Thường Lụa Xếp Ly');
        } else {
          setSelectedBottomName('Quần Lụa Trắng');
        }
        setTrouserColorHex(rec.bottomColor);
      }
      if (rec.patternId) {
        setSelectedPattern(rec.patternId);
      }
      setSelectedAccessories(
        (rec.accessoryIds || []).map((accessoryId) =>
          mapAccessoryIdToName(accessoryId)
        )
      );
    },
    [
      setSelectedTopId,
      setSelectedColorId,
      setPrimaryColorHex,
      setSelectedBottomName,
      setTrouserColorHex,
      setSelectedPattern,
      setSelectedAccessories,
    ]
  );

  const runVStylistConsultation = useCallback(
    async (autoApplyTo3D = true) => {
      setIsConsultingAi(true);
      try {
        const res = await fetch('/api/vstylist-consult', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: customLocation,
            weather: `${formattedTemp} (${customCondition})`,
            event: selectedEvent,
            freeformRequest: userCustomRequest,
            gender: genderEn,
            selectedCostumeId: selectedTopId,
            selectedMainColor: outfit.colors.ao || currentColor.hex,
            selectedMainColorName: currentColor.name,
            selectedBottomColor: outfit.colors.quan || '#F5F1E8',
            selectedBottomName,
            selectedPatternId: selectedPattern,
            selectedAccessoryIds: selectedAccessories.map((acc) =>
              mapAccessoryNameToId(acc)
            ),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.consultation) {
            setVStylistConsultation(data.consultation);
            if (autoApplyTo3D && data.consultation.recommendation) {
              applyVStylistRecommendationTo3D(data.consultation.recommendation);
            }
          }
        }
      } catch (err) {
        console.error('[V-Stylist Consult Error]', err);
      } finally {
        setIsConsultingAi(false);
      }
    },
    [
      customLocation,
      formattedTemp,
      customCondition,
      selectedEvent,
      userCustomRequest,
      genderEn,
      selectedTopId,
      outfit.colors.ao,
      currentColor.hex,
      currentColor.name,
      outfit.colors.quan,
      selectedBottomName,
      selectedPattern,
      selectedAccessories,
      applyVStylistRecommendationTo3D,
    ]
  );

  const ttsAudioCacheRef = useRef<Map<string, string>>(new Map());
  const ttsQuotaFallbackRef = useRef<boolean>(false);

  const handleToggleAudioGuide = useCallback(async () => {
    if (isPlayingAudioGuide) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingAudioGuide(false);
      return;
    }

    const scriptText = vStylistConsultation.audioGuideScript;
    if (!scriptText) return;

    setIsPlayingAudioGuide(true);

    const playAudioUrlFast = async (audioUrl: string) => {
      const audio = new Audio(audioUrl);
      audio.playbackRate = 1.28;
      audioPlayerRef.current = audio;
      audio.onended = () => setIsPlayingAudioGuide(false);
      audio.onerror = () => setIsPlayingAudioGuide(false);
      await audio.play();
    };

    const cachedUrl = ttsAudioCacheRef.current.get(scriptText);
    if (cachedUrl) {
      try {
        await playAudioUrlFast(cachedUrl);
        return;
      } catch {
        // Fallback below
      }
    }

    if (!ttsQuotaFallbackRef.current) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const resp = await fetch('/api/vstylist-tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: scriptText }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (resp.ok) {
          const data = await resp.json();
          if (data.ok && data.audioDataUrl) {
            ttsAudioCacheRef.current.set(scriptText, data.audioDataUrl);
            await playAudioUrlFast(data.audioDataUrl);
            return;
          }
          if (data.quotaExhausted) {
            ttsQuotaFallbackRef.current = true;
          }
        }
      } catch {
        // Fallback to instant browser SpeechSynthesis below
      }
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(scriptText);
      utterance.lang = 'vi-VN';
      utterance.rate = 1.28;
      utterance.onend = () => setIsPlayingAudioGuide(false);
      utterance.onerror = () => setIsPlayingAudioGuide(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlayingAudioGuide(false);
    }
  }, [isPlayingAudioGuide, vStylistConsultation.audioGuideScript]);

  const runGeminiEvaluation = useCallback(
    async (overridePayload?: OutfitInputPayload) => {
      const payloadToSend = overridePayload || currentPayload;
      setIsAnalyzing(true);
      setJsonError(null);
      try {
        await Promise.all([
          (async () => {
            const res = await fetch('/api/evaluate-outfit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payloadToSend),
            });
            if (!res.ok) throw new Error('Lỗi kết nối máy chủ');
            const data = await res.json();
            if (data.evaluation) {
              setEvaluation(data.evaluation);
            }
          })(),
          runVStylistConsultation(false),
        ]);
      } catch (err) {
        console.error(err);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [currentPayload, runVStylistConsultation]
  );

  const handleApplyPreset = (presetId: string) => {
    const preset = CURATED_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setActivePresetId(preset.id);
    handleToggleGender(preset.genderEn);
    setSelectedTopId(preset.topId);
    setSelectedColorId(preset.colorId);
    setSelectedPattern(preset.patternId);
    setSelectedBottomName(preset.bottomName);
    setSelectedAccessories(preset.accessories);
    setSelectedWeatherId(preset.weatherId);
    const weatherObj = WEATHER_PRESETS.find((w) => w.id === preset.weatherId);
    if (weatherObj) {
      setCustomLocation(weatherObj.location);
      setTempValue(parseInt(weatherObj.temperature, 10) || 22);
      setCustomCondition(weatherObj.condition);
    }
    setSelectedEvent(preset.eventType);
    setUserCustomRequest(preset.userCustomRequest);
    setEvaluation(preset.precomputedOutput);
  };

  const handleApplyAiRecommendations = () => {
    if (evaluation.recommended_pattern_id) {
      setSelectedPattern(evaluation.recommended_pattern_id);
    }
    if (evaluation.recommended_color_hex) {
      const targetHex = evaluation.recommended_color_hex.toLowerCase();
      const matchedColor = TRADITIONAL_COLORS.find(
        (c) => c.hex.toLowerCase() === targetHex
      );
      if (matchedColor) {
        setSelectedColorId(matchedColor.id);
      } else if (targetHex.includes('a83232') || targetHex.includes('9a2b1d')) {
        setSelectedColorId('do-son');
      } else if (targetHex.includes('d4a359') || targetHex.includes('b45309') || targetHex.includes('e6b800')) {
        setSelectedColorId('vang-mai');
      } else if (targetHex.includes('2d5a75') || targetHex.includes('134e4a')) {
        setSelectedColorId('xanh-co-vit');
      }
    }
  };

  const handleApplyBodyShapePreset = (preset: {
    topId: string;
    bottomName: string;
    colorId: string;
    patternId: PatternId;
    accessories: string[];
  }) => {
    setActivePresetId('');
    setSelectedTopId(preset.topId);
    setSelectedBottomName(preset.bottomName);
    setSelectedColorId(preset.colorId);
    setSelectedPattern(preset.patternId);
    setSelectedAccessories(preset.accessories);
  };

  const handleApplyRemixLook = (look: RemixLook) => {
    const selectedColor = TRADITIONAL_COLORS.find(
      (color) => color.hex.toLowerCase() === look.mainColor.toLowerCase()
    );
    const selectedBottom = BOTTOM_GARMENTS.find(
      (bottom) => bottom.name === look.bottomName
    ) || BOTTOM_GARMENTS[0];
    const targetAoHex = look.mainColor || selectedColor?.hex || TRADITIONAL_COLORS[0].hex;
    const targetQuanHex = look.bottomColor || selectedBottom.hex;

    if (look.fabricMaterialId) {
      setSelectedFabricMaterial(look.fabricMaterialId);
    }

    setOutfit((current) => ({
      ...current,
      costumeId: look.costumeId,
      patternId: look.patternId,
      necklineCut: look.necklineCut || 'co-truyen-thong',
      hemLengthCut: look.hemLengthCut || 'ta-dai-chuan',
      colors: {
        ...current.colors,
        ao: targetAoHex,
        primary: targetAoHex,
        primaryId: selectedColor ? selectedColor.id : current.colors.primaryId,
        quan: targetQuanHex,
        trouser: targetQuanHex,
        trouserName: selectedBottom.name,
        hoaTiet: look.hoaTietHex || current.colors.hoaTiet,
        enableTrouserKey: true,
      },
      accessories: look.accessoryIds.map((accessoryId) => mapAccessoryIdToName(accessoryId)),
      remix: look.remix,
    }));
    setActivePresetId('');
    setIsRemixStudioOpen(false);
  };

  const handleSaveLook = (look: SavedLook) => {
    if (savedLooks.length >= 3) return false;
    setSavedLooks((current) => current.length >= 3 ? current : [look, ...current]);
    return true;
  };

  const handleApplySavedLook = (saved: SavedLook['outfit']) => {
    const color = TRADITIONAL_COLORS.find((item) => item.hex.toLowerCase() === saved.colors.ao.toLowerCase()) || TRADITIONAL_COLORS[0];
    const bottom = BOTTOM_GARMENTS.find((item) => item.hex.toLowerCase() === saved.colors.quan.toLowerCase()) || BOTTOM_GARMENTS[0];
    setOutfit((current) => ({
      ...current,
      gender: saved.gender,
      costumeId: saved.costumeId,
      region: saved.region,
      patternId: (saved.patternId as PatternId) || 'none',
      colors: { ...current.colors, ao: saved.colors.ao, primary: saved.colors.ao, primaryId: color.id, quan: saved.colors.quan, trouser: saved.colors.quan, trouserName: bottom.name, hoaTiet: saved.colors.hoaTiet || current.colors.hoaTiet, enableTrouserKey: true },
      accessories: saved.accessories,
      event: saved.event,
      remix: saved.remix,
    }));
    setIsCompareOpen(false);
    setIsLookbookOpen(false);
  };

  const handleFixToTraditionalSafe = () => {
    setActivePresetId('');
    setSelectedBottomName(
      currentTop.silhouetteType === 'nhat-binh' || currentTop.silhouetteType === 'tu-than'
        ? 'Thường Lụa Xếp Ly'
        : 'Quần Lụa Trắng'
    );
    setSelectedAccessories(
      currentTop.silhouetteType === 'tu-than'
        ? ['Nón Quai Thao Kinh Bắc']
        : ['Khăn Đóng Tám Nếp']
    );
  };

  const handleRandomizeOutfit = () => {
    setActivePresetId('');
    const randTop = TOP_GARMENTS[Math.floor(Math.random() * TOP_GARMENTS.length)];
    const randColor =
      TRADITIONAL_COLORS[Math.floor(Math.random() * TRADITIONAL_COLORS.length)];
    const randBottom =
      BOTTOM_GARMENTS[Math.floor(Math.random() * BOTTOM_GARMENTS.length)];
    const randWeather =
      WEATHER_PRESETS[Math.floor(Math.random() * WEATHER_PRESETS.length)];
    const randEvent = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
    const randExp = EXPRESSIONS[Math.floor(Math.random() * EXPRESSIONS.length)];

    setSelectedTopId(randTop.id);
    setSelectedColorId(randColor.id);
    setSelectedBottomName(randBottom.name);
    setSelectedWeatherId(randWeather.id);
    setCustomLocation(randWeather.location);
    setTempValue(parseInt(randWeather.temperature, 10) || 24);
    setCustomCondition(randWeather.condition);
    setSelectedEvent(randEvent);
    setExpression(randExp.id);
  };

  const cycleTop = (dir: -1 | 1) => {
    setActivePresetId('');
    const idx = TOP_GARMENTS.findIndex((t) => t.id === selectedTopId);
    const nextIdx = (idx + dir + TOP_GARMENTS.length) % TOP_GARMENTS.length;
    setSelectedTopId(TOP_GARMENTS[nextIdx].id);
  };

  const cycleColor = (dir: -1 | 1) => {
    setActivePresetId('');
    const idx = TRADITIONAL_COLORS.findIndex((c) => c.id === selectedColorId);
    const nextIdx = (idx + dir + TRADITIONAL_COLORS.length) % TRADITIONAL_COLORS.length;
    setSelectedColorId(TRADITIONAL_COLORS[nextIdx].id);
  };

  const cycleBottom = (dir: -1 | 1) => {
    setActivePresetId('');
    const idx = BOTTOM_GARMENTS.findIndex((b) => b.name === selectedBottomName);
    const nextIdx = (idx + dir + BOTTOM_GARMENTS.length) % BOTTOM_GARMENTS.length;
    setSelectedBottomName(BOTTOM_GARMENTS[nextIdx].name);
  };

  const toggleAccessory = (accName: string) => {
    setActivePresetId('');
    toggleOutfitAccessory(accName);
  };

  const adjustTemp = (delta: number) => {
    setActivePresetId('');
    const next = Math.min(40, Math.max(10, tempValue + delta));
    setTempValue(next);
    if (next >= 31) setCustomCondition('Nắng Nóng');
    else if (next <= 18) setCustomCondition('Se lạnh');
    else setCustomCondition('Mát mẻ');
  };

  const handleCopyRawJson = () => {
    const payloadToCopy =
      jsonSchemaMode === 'vstylist_ai'
        ? vStylistConsultation
        : jsonSchemaMode === 'vphuc_precision'
        ? vPhucPrecisionAudit
        : evaluation;
    navigator.clipboard.writeText(JSON.stringify(payloadToCopy, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 1600);
  };

  const handleRunCustomJson = async () => {
    try {
      setJsonError(null);
      const parsed = JSON.parse(customJsonInput) as OutfitInputPayload;
      if (!parsed.selected_items?.top || !parsed.selected_items?.bottom) {
        setJsonError('Thiếu selected_items.top hoặc bottom');
        return;
      }
      await runGeminiEvaluation(parsed);
    } catch {
      setJsonError('JSON không hợp lệ');
    }
  };

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden paper-surface text-[#1C1917] flex flex-col">
      {/* Compact 3-Zone App Bar */}
      <header className="shrink-0 bg-[#FBF9F5] border-b border-[#DFD8C8] px-4 lg:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 shrink-0">
          <a
            href="#app"
            className="text-xl font-editorial font-bold tracking-tight text-[#1C1917]"
          >
            VAI-Stylist 3D
          </a>
          <span
            title="Nhóm BADLUCK"
            className="px-2.5 py-0.5 bg-[#1C1917] text-[#FDE68A] border border-[#9A3412] text-[11px] font-mono-tabular font-bold tracking-widest uppercase"
          >
            BADLUCK
          </span>
        </div>

        <nav className="hidden xl:flex items-center gap-2">
          {CURATED_PRESETS.map((preset) => {
            const active = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handleApplyPreset(preset.id)}
                className={`px-3 py-1.5 text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#1C1917] text-[#FBF9F5] border-[#1C1917]'
                    : 'bg-[#F5F1E8] text-[#44403C] border-[#DFD8C8] hover:border-[#1C1917]'
                }`}
              >
                {preset.label} · {preset.badgeTier}
              </button>
            );
          })}

          <button
            onClick={handleRandomizeOutfit}
            className="px-3 py-1.5 text-xs font-medium border border-[#DFD8C8] bg-[#FBF9F5] hover:border-[#1C1917] text-[#1C1917] transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
          >
            <Shuffle className="w-3.5 h-3.5 text-[#9A3412]" />
            <span>Phối Ngẫu Nhiên</span>
          </button>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsQuestOpen(true)}
            aria-label="Mở Việt Phục Quest"
            className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold border border-[#8B5E34] bg-[#F6EFDF] hover:bg-[#EAE1D0] text-[#674624] transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
            title="Mở hành trình khám phá Việt Phục Quest"
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline xl:hidden">Quest</span>
            <span className="hidden xl:inline">Việt Phục Quest</span>
          </button>
          <button
            type="button"
            onClick={() => setIsRemixStudioOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold border border-[#233D39] bg-[#233D39] hover:bg-[#182E2B] text-[#FBF9F5] transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#E8C98D]" />
            <span className="hidden lg:inline">Remix Studio</span>
          </button>
          <button
            type="button"
            onClick={() => setIsLookbookOpen(true)}
            className="hidden sm:flex px-3 py-1.5 text-xs font-medium border border-[#DFD8C8] bg-[#FBF9F5] hover:border-[#1C1917] text-[#1C1917] transition-colors cursor-pointer items-center gap-1.5 whitespace-nowrap"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Lookbook</span>
          </button>
          <button
            onClick={() => setIsBodyShapeModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold border border-[#9A3412] bg-[#FFFBEB] hover:bg-[#9A3412] text-[#9A3412] hover:text-[#FBF9F5] transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shadow-xs"
            title="Gợi ý Cổ phục theo dáng người"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#9A3412]" />
            <span>Thử Phom Cổ Phục</span>
          </button>

          <button
            onClick={() => setRightTab((prev) => (prev === 'card' ? 'json' : 'card'))}
            className={`px-3 py-1.5 text-xs font-mono-tabular border transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              rightTab === 'json'
                ? 'bg-[#1C1917] text-[#FDE68A] border-[#1C1917]'
                : 'bg-[#FBF9F5] text-[#1C1917] border-[#DFD8C8] hover:border-[#1C1917]'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>{rightTab === 'json' ? 'Đóng JSON' : 'JSON'}</span>
          </button>

          <button
            onClick={() => runGeminiEvaluation()}
            disabled={isAnalyzing}
            className="px-3.5 py-1.5 text-xs font-semibold text-[#FBF9F5] bg-[#9A3412] hover:bg-[#7C2D12] transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isAnalyzing ? 'Đang xem phối...' : 'Stylist AI'}</span>
          </button>
        </div>
      </header>

      {/* Main 3-Column Interactive Studio Workspace */}
      <main
        id="app"
        className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3.5 p-3.5 lg:p-5 max-w-[1720px] w-full mx-auto"
      >
        {/* COLUMN 1 (Left, 4 cols on laptop, 3 on wide screens): Wardrobe, Character & Context */}
        <section className="lg:col-span-4 xl:col-span-3 bg-[#F5F1E8] border border-[#DFD8C8] flex flex-col min-h-0 overflow-hidden">
          {/* 3 Category Segmented Tabs */}
          <div className="grid grid-cols-3 border-b border-[#DFD8C8] bg-[#EBE6DF] p-1 gap-1 shrink-0">
            <button
              onClick={() => setActiveControlTab('top')}
              className={`py-2 px-1.5 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                activeControlTab === 'top'
                  ? 'bg-[#FBF9F5] text-[#1C1917] shadow-xs'
                  : 'text-[#686259] hover:text-[#1C1917]'
              }`}
            >
              <Shirt className="w-3.5 h-3.5 shrink-0" />
              <span>Áo & Màu</span>
            </button>

            <button
              onClick={() => setActiveControlTab('bottom_acc')}
              className={`py-2 px-1.5 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                activeControlTab === 'bottom_acc'
                  ? 'bg-[#FBF9F5] text-[#1C1917] shadow-xs'
                  : 'text-[#686259] hover:text-[#1C1917]'
              }`}
            >
              <Footprints className="w-3.5 h-3.5 shrink-0" />
              <span>Quần & Hạ Y</span>
            </button>

            <button
              onClick={() => setActiveControlTab('context')}
              className={`py-2 px-1.5 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                activeControlTab === 'context'
                  ? 'bg-[#FBF9F5] text-[#1C1917] shadow-xs'
                  : 'text-[#686259] hover:text-[#1C1917]'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>Bối Cảnh</span>
            </button>
          </div>

          {/* Quick Character Gender Switcher (Nam / Nữ) always visible at top of Left Dock */}
          <div className="px-4 py-2 bg-[#F5F1E8] border-b border-[#DFD8C8] flex items-center justify-between gap-2 shrink-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1C1917]">
              Nhân Vật 3D:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleToggleGender('male')}
                className={`px-3 py-1 text-xs font-semibold border transition-colors cursor-pointer ${
                  genderEn === 'male'
                    ? 'bg-[#1C1917] text-[#FDE68A] border-[#1C1917]'
                    : 'bg-[#FBF9F5] text-[#57534E] border-[#DFD8C8] hover:text-[#1C1917]'
                }`}
              >
                Nam (Male .GLB)
              </button>
              <button
                onClick={() => handleToggleGender('female')}
                className={`px-3 py-1 text-xs font-semibold border transition-colors cursor-pointer ${
                  genderEn === 'female'
                    ? 'bg-[#9A3412] text-[#FBF9F5] border-[#9A3412]'
                    : 'bg-[#FBF9F5] text-[#57534E] border-[#DFD8C8] hover:text-[#1C1917]'
                }`}
              >
                Nữ (Female .GLB)
              </button>
            </div>
          </div>

          {/* Active Control Panel Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeControlTab === 'top' && (
              <>
                {/* 1. COSTUME: 8 Traditional Vietnamese Garments Grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#686259]">
                    <span className="font-semibold uppercase tracking-wider text-[#1C1917]">
                      1. Chọn Cổ Phục & Áo Truyền Thống (8 Loại)
                    </span>
                    <span>{currentTop.dynasty}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {TOP_GARMENTS.map((garment) => {
                      const selected = selectedTopId === garment.id;
                      return (
                        <button
                          key={garment.id}
                          onClick={() => {
                            setActivePresetId('');
                            setSelectedTopId(garment.id);
                            setSelectedFabricMaterial('lua-ha-dong');
                            setHairStyle(
                              genderEn === 'female'
                                ? 'bui-truyen-thong'
                                : 'toc-ivy'
                            );
                            setHairColorHex(HAIR_COLORS[0].hex);
                            setExpression('trang-nghiem');
                            setPatternMaskError(null);
                          }}
                          className={`p-2.5 border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            selected
                              ? 'bg-[#1C1917] text-[#FBF9F5] border-[#1C1917]'
                              : 'bg-[#FBF9F5] text-[#1C1917] border-[#DFD8C8] hover:border-[#1C1917]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span
                              className={`text-[10px] font-mono-tabular ${
                                selected ? 'text-[#FDE68A]' : 'text-[#9A3412]'
                              }`}
                            >
                              {garment.formality}
                            </span>
                          </div>
                          <p className="text-xs font-semibold leading-snug line-clamp-1">
                            {garment.baseName}
                          </p>
                          <p
                            className={`text-[11px] mt-0.5 line-clamp-1 ${
                              selected ? 'text-[#D6CEBE]' : 'text-[#686259]'
                            }`}
                          >
                            {garment.dynasty}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. PATTERN ("Họa tiết"): Seamless tileable mask picker + Scale, Rotation, Strength, Tint Color, AI Mask & ZIP */}
                <div className="space-y-2.5 border-t border-[#DFD8C8] pt-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold uppercase tracking-wider text-[#1C1917]">
                      2. Họa Tiết Dệt Lụa (Triplanar / Garment Mask)
                    </span>
                    <button
                      type="button"
                      onClick={() => exportPatternsZip()}
                      className="px-2 py-0.5 bg-[#FBF9F5] border border-[#DFD8C8] hover:border-[#1C1917] text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                      title="Tải gói ZIP chứa các mask họa tiết cho /public/patterns/"
                    >
                      <Download className="w-2.5 h-2.5 text-[#9A3412]" />
                      <span>Tải ZIP (/public/patterns/)</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {TRADITIONAL_PATTERNS.map((pat) => {
                      const active = selectedPattern === pat.id;
                      return (
                        <button
                          key={pat.id}
                          onClick={() => {
                            setActivePresetId('');
                            setSelectedPattern(pat.id);
                            setPatternMaskError(null);
                          }}
                          className={`p-2 border text-left transition-all cursor-pointer ${
                            active
                              ? 'bg-[#1C1917] text-[#FBF9F5] border-[#1C1917]'
                              : 'bg-[#FBF9F5] text-[#1C1917] border-[#DFD8C8] hover:border-[#1C1917]'
                          }`}
                        >
                          <p className="text-xs font-semibold">{pat.name}</p>
                          <p
                            className={`text-[10px] line-clamp-1 ${
                              active ? 'text-[#FDE68A]' : 'text-[#686259]'
                            }`}
                          >
                            {pat.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Pattern Sliders (Scale, Rotation, Strength), Tint Color & AI Mask Generator */}
                  {selectedPattern !== 'none' && (
                    <div className="p-2.5 bg-[#FBF9F5] border border-[#DFD8C8] space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-[#57534E]">
                            Màu họa tiết:
                          </span>
                          <input
                            type="color"
                            value={outfit.colors.hoaTiet}
                            onChange={(e) => setPatternColorHex(e.target.value)}
                            className="w-5 h-5 cursor-pointer border border-[#DFD8C8] bg-transparent"
                          />
                          <span className="text-[11px] font-mono-tabular">
                            {outfit.colors.hoaTiet}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={handleResetPatternMaskCache}
                            disabled={isGeneratingPatternMask}
                            className="px-2 py-1 bg-[#EBE6DF] hover:bg-[#1C1917] hover:text-[#FBF9F5] text-[#1C1917] border border-[#DFD8C8] text-[10px] font-medium flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
                            title="Xóa cache mask AI của họa tiết này trong IndexedDB và khôi phục hoa văn gốc"
                          >
                            <RefreshCw className="w-2.5 h-2.5" />
                            <span>Xóa cache</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleGenerateAiPatternMask}
                            disabled={isGeneratingPatternMask}
                            className="px-2 py-1 bg-[#9A3412] hover:bg-[#7C2D12] text-[#FBF9F5] text-[10px] font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            title={`Tạo mask liền mạch bằng ${IMAGE_MODEL} và lưu vào IndexedDB`}
                          >
                            <Sparkles className="w-3 h-3 text-[#FDE68A]" />
                            <span>
                              {isGeneratingPatternMask
                                ? 'Đang tạo mask AI...'
                                : 'Tạo mask AI'}
                            </span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[10px]">
                        <div>
                          <div className="flex justify-between font-mono-tabular text-[#57534E]">
                            <span>Tỷ lệ</span>
                            <span>{outfit.patternConfig.scale.toFixed(1)}x</span>
                          </div>
                          <input
                            type="range"
                            min={0.5}
                            max={2.6}
                            step={0.1}
                            value={outfit.patternConfig.scale}
                            onChange={(e) =>
                              setPatternConfig({
                                scale: parseFloat(e.target.value),
                              })
                            }
                            className="w-full accent-[#9A3412]"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between font-mono-tabular text-[#57534E]">
                            <span>Xoay</span>
                            <span>{outfit.patternConfig.rotationDeg}°</span>
                          </div>
                          <input
                            type="range"
                            min={-90}
                            max={90}
                            step={5}
                            value={outfit.patternConfig.rotationDeg}
                            onChange={(e) =>
                              setPatternConfig({
                                rotationDeg: parseInt(e.target.value, 10),
                              })
                            }
                            className="w-full accent-[#9A3412]"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between font-mono-tabular text-[#57534E]">
                            <span>Độ đậm</span>
                            <span>
                              {Math.round(outfit.patternConfig.strength * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0.1}
                            max={1.0}
                            step={0.05}
                            value={outfit.patternConfig.strength}
                            onChange={(e) =>
                              setPatternConfig({
                                strength: parseFloat(e.target.value),
                              })
                            }
                            className="w-full accent-[#9A3412]"
                          />
                        </div>
                      </div>

                      {patternMaskError && (
                        <div className="p-2 bg-[#FEF2F2] border border-[#991B1B] text-[#7F1D1D] text-[10px] space-y-1">
                          <div className="flex items-center justify-between">
                            <strong>
                              Lỗi {IMAGE_MODEL}: {patternMaskError.finishReason}
                            </strong>
                            <button
                              type="button"
                              onClick={handleGenerateAiPatternMask}
                              className="px-1.5 py-0.5 bg-[#991B1B] text-white font-bold cursor-pointer"
                            >
                              Thử lại
                            </button>
                          </div>
                          <div className="font-mono-tabular truncate">
                            feedback:{' '}
                            {JSON.stringify(patternMaskError.promptFeedback)} ·{' '}
                            {patternMaskError.text}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. COLORS: 7 Traditional Vietnamese Silk Colors + Custom HEX */}
                <div className="space-y-2 border-t border-[#DFD8C8] pt-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold uppercase tracking-wider text-[#1C1917]">
                      3. Màu Lụa Cổ Truyền (Đổi Màu Tức Thì &lt;100ms)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#686259] text-[11px]">
                        Ngũ hành: <strong>{currentColor.element}</strong>
                      </span>
                      <input
                        type="color"
                        value={outfit.colors.ao}
                        onChange={(e) => {
                          setActivePresetId('');
                          setPrimaryColorHex(e.target.value);
                        }}
                        title="Tùy chỉnh mã màu HEX cho Áo"
                        className="w-4 h-4 cursor-pointer border border-[#DFD8C8] bg-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                    {TRADITIONAL_COLORS.map((c) => {
                      const selected =
                        selectedColorId === c.id &&
                        outfit.colors.ao.toLowerCase() === c.hex.toLowerCase();
                      return (
                        <button
                          key={c.id}
                          onClick={() => {
                            setActivePresetId('');
                            setSelectedColorId(c.id);
                          }}
                          className={`p-1.5 border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                            selected
                              ? 'bg-[#FBF9F5] border-[#1C1917] ring-1 ring-[#1C1917]'
                              : 'bg-[#FBF9F5] border-[#DFD8C8] hover:border-[#1C1917]'
                          }`}
                        >
                          <span
                            className="w-6 h-6 rounded-full border border-black/20 shadow-inner"
                            style={{ backgroundColor: c.hex }}
                          />
                          <span className="text-[10px] font-medium text-center leading-tight line-clamp-1">
                            {c.name.replace('Màu ', '')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Authentic PBR Fabric Materials (Lụa Hà Đông / Gấm Triều Đình / Lãnh Mỹ A) */}
                <div className="space-y-2 border-t border-[#DFD8C8] pt-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold uppercase tracking-wider text-[#1C1917]">
                      5. Chất Liệu Vải & PBR Silk Depth-Mapping
                    </span>
                    <span className="font-mono-tabular text-[11px] text-[#9A3412]">
                      Roughness {currentFabric.roughness} · Sheen {currentFabric.sheen}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {FABRIC_MATERIALS.map((fab) => {
                      const active = selectedFabricMaterial === fab.id;
                      return (
                        <button
                          key={fab.id}
                          onClick={() => {
                            setActivePresetId('');
                            setSelectedFabricMaterial(fab.id);
                          }}
                          className={`p-2 border text-left transition-all cursor-pointer ${
                            active
                              ? 'bg-[#9A3412] text-[#FBF9F5] border-[#9A3412]'
                              : 'bg-[#FBF9F5] text-[#1C1917] border-[#DFD8C8] hover:border-[#1C1917]'
                          }`}
                        >
                          <p className="text-xs font-semibold">{fab.shortName}</p>
                          <p
                            className={`text-[10px] line-clamp-1 ${
                              active ? 'text-[#FDE68A]' : 'text-[#686259]'
                            }`}
                          >
                            R:{fab.roughness} · {fab.normalMapDetail}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {activeControlTab === 'bottom_acc' && (
              <>
                {/* Hạ Y Selector: Realistic Trouser & Skirt Replacement */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold uppercase tracking-wider text-[#1C1917]">
                      1. Thay Quần / Hạ Y Chân Thật (360° Real-Fit)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-[#686259]">Màu quần:</span>
                      <input
                        type="color"
                        value={outfit.colors.quan}
                        onChange={(e) => {
                          setActivePresetId('');
                          setTrouserColorHex(e.target.value);
                        }}
                        title="Tùy chỉnh màu cho Quần / Chân Váy"
                        className="w-4 h-4 cursor-pointer border border-[#DFD8C8] bg-transparent"
                      />
                    </div>
                  </div>

                  {/* Quick Trouser Dye Swatches */}
                  <div className="bg-[#FBF9F5] border border-[#DFD8C8] p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-[#57534E]">
                        Bảng màu vải quần thực tế:
                      </span>
                      <span className="font-mono-tabular text-[#9A3412] font-semibold">
                        {outfit.colors.quan}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {CATALOG_COLOR_SWATCHES.map((sw) => {
                        const isSwActive =
                          outfit.colors.quan.toLowerCase() === sw.hex.toLowerCase();
                        return (
                          <button
                            key={sw.hex}
                            type="button"
                            onClick={() => {
                              setActivePresetId('');
                              setTrouserColorHex(sw.hex);
                            }}
                            className={`px-2 py-1 text-[10px] font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
                              isSwActive
                                ? 'bg-[#1C1917] text-[#FBF9F5] border-[#1C1917]'
                                : 'bg-[#F5F1E8] text-[#1C1917] border-[#DFD8C8] hover:border-[#1C1917]'
                            }`}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-black/25 shrink-0"
                              style={{ backgroundColor: sw.hex }}
                            />
                            <span>{sw.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div
                    role="status"
                    aria-live="polite"
                    className={`border p-2.5 transition-colors ${
                      colorHarmonyNeedsAttention
                        ? 'border-[#D97706]/60 bg-[#FFFBEB] text-[#78350F] shadow-xs'
                        : 'border-[#2E7D5B]/25 bg-[#2E7D5B]/8 text-[#214C37]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-bold flex items-center gap-1.5">
                        {colorHarmonyNeedsAttention ? (
                          <>
                            <span className="text-sm leading-none">⚠️</span>
                            <span className="text-[#B45309]">Màu sắc chưa hợp bạn uii!</span>
                          </>
                        ) : (
                          <>
                            <span className="text-sm leading-none">✨</span>
                            <span className="text-[#14532D]">Hài hòa màu sắc</span>
                          </>
                        )}
                      </span>
                      <span className="font-mono-tabular font-bold">
                        {colorHarmony.score}/100
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] leading-relaxed">
                      {colorHarmonyNeedsAttention
                        ? colorHarmony.notes[0] ||
                          'Áo và quần đang hơi lệch tông, bạn thử đổi sang Quần lụa trắng ngà (#F5F1E8) hoặc chọn màu trung tính cho hài hòa nhen!'
                        : colorHarmony.label}
                    </p>
                    {colorHarmonyNeedsAttention && (
                      <button
                        type="button"
                        onClick={() => {
                          setActivePresetId('');
                          setTrouserColorHex('#F5F1E8');
                        }}
                        className="mt-2 px-2.5 py-1 text-[10px] font-bold bg-[#9A3412] hover:bg-[#7C2D12] text-white flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                      >
                        <span>✨ Đổi sang Quần Trắng Ngà chuẩn đẹp</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {BOTTOM_GARMENTS.map((bottom) => {
                      const selected = selectedBottomName === bottom.name;
                      return (
                        <button
                          key={bottom.id}
                          onClick={() => {
                            setActivePresetId('');
                            setSelectedBottomName(bottom.name);
                          }}
                          className={`p-2.5 border text-left transition-colors cursor-pointer space-y-1 ${
                            selected
                              ? 'bg-[#1C1917] text-[#FBF9F5] border-[#1C1917]'
                              : 'bg-[#FBF9F5] text-[#1C1917] border-[#DFD8C8] hover:border-[#1C1917]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-3.5 h-3.5 shrink-0 border border-black/25"
                                style={{
                                  backgroundColor: selected
                                    ? outfit.colors.quan
                                    : bottom.hex,
                                }}
                              />
                              <span className="text-xs font-semibold truncate">
                                {bottom.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className={`text-[10px] px-1.5 py-0.5 border font-mono-tabular ${
                                  selected
                                    ? 'border-white/25 text-[#D6CEBE]'
                                    : 'border-[#DFD8C8] text-[#686259]'
                                }`}
                              >
                                {bottom.material}
                              </span>
                              <span
                                className={`text-[11px] font-mono-tabular font-semibold ${
                                  selected
                                    ? 'text-[#FDE68A]'
                                    : bottom.tierHint === 'SAFE'
                                    ? 'text-[#14532D]'
                                    : bottom.tierHint === 'WARNING'
                                    ? 'text-[#92400E]'
                                    : 'text-[#991B1B]'
                                }`}
                              >
                                {bottom.tierHint}
                              </span>
                            </div>
                          </div>
                          <p
                            className={`text-[11px] leading-snug line-clamp-1 pl-5 ${
                              selected ? 'text-[#D6CEBE]' : 'text-[#686259]'
                            }`}
                          >
                            {bottom.note}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {activeControlTab === 'context' && (
              <>
                <div className="space-y-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#1C1917] block">
                    Địa Điểm & Thời Tiết
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    {WEATHER_PRESETS.map((w) => (
                      <button
                        key={w.id}
                        onClick={() => {
                          setActivePresetId('');
                          setSelectedWeatherId(w.id);
                          setCustomLocation(w.location);
                          setTempValue(parseInt(w.temperature, 10) || 22);
                          setCustomCondition(w.condition);
                        }}
                        className={`p-2.5 border text-left transition-colors cursor-pointer ${
                          selectedWeatherId === w.id
                            ? 'bg-[#1C1917] text-[#FBF9F5] border-[#1C1917]'
                            : 'bg-[#FBF9F5] text-[#1C1917] border-[#DFD8C8] hover:border-[#1C1917]'
                        }`}
                      >
                        <p className="text-xs font-semibold">{w.location}</p>
                        <p
                          className={`text-[11px] ${
                            selectedWeatherId === w.id ? 'text-[#D6CEBE]' : 'text-[#686259]'
                          }`}
                        >
                          {w.temperature} · {w.condition}
                        </p>
                      </button>
                    ))}
                  </div>

                  <div className="bg-[#FBF9F5] border border-[#DFD8C8] p-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[#686259] block">Điều chỉnh nhiệt độ</span>
                      <span className="text-sm font-semibold text-[#1C1917]">
                        {customLocation} · {formattedTemp} ({customCondition})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => adjustTemp(-2)}
                        className="w-8 h-8 border border-[#DFD8C8] bg-[#F5F1E8] hover:bg-[#1C1917] hover:text-[#FBF9F5] flex items-center justify-center cursor-pointer transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => adjustTemp(2)}
                        className="w-8 h-8 border border-[#DFD8C8] bg-[#F5F1E8] hover:bg-[#1C1917] hover:text-[#FBF9F5] flex items-center justify-center cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 border-t border-[#DFD8C8] pt-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#1C1917] block">
                    Sự Kiện / Không Gian (event_type)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {EVENT_TYPES.map((evt) => {
                      const active = selectedEvent === evt;
                      return (
                        <button
                          key={evt}
                          onClick={() => {
                            setActivePresetId('');
                            setSelectedEvent(evt);
                          }}
                          className={`px-3 py-2.5 text-xs font-medium border text-left transition-colors cursor-pointer truncate ${
                            active
                              ? 'bg-[#1C1917] text-[#FBF9F5] border-[#1C1917]'
                              : 'bg-[#FBF9F5] text-[#1C1917] border-[#DFD8C8] hover:border-[#1C1917]'
                          }`}
                        >
                          {evt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom User Design Request (user_custom_request) & 1-Click V-Stylist AI Consultation */}
                <div className="space-y-2.5 border-t border-[#DFD8C8] pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#1C1917]">
                      Yêu Cầu Ngữ Cảnh Tự Do (V-Stylist AI)
                    </span>
                    {userCustomRequest && (
                      <button
                        onClick={() => setUserCustomRequest('')}
                        className="text-[11px] text-[#9A3412] hover:underline cursor-pointer"
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                  <textarea
                    value={userCustomRequest}
                    onChange={(e) => {
                      setActivePresetId('');
                      setUserCustomRequest(e.target.value);
                    }}
                    rows={2}
                    placeholder="VD: Đi lễ chùa ở Huế trời nắng nóng 34°C, muốn bộ đồ vừa trang nghiêm vừa thoáng mát..."
                    className="w-full bg-[#FBF9F5] border border-[#DFD8C8] p-2.5 text-xs text-[#1C1917] focus:outline-none focus:border-[#1C1917]"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Nắng nóng 34°C di chuyển ngoài trời thoáng mát',
                      'Lễ chùa tôn nghiêm kín đáo tại Cố Đô Huế',
                      'Chụp ảnh kỷ yếu hoài cổ tại Hoàng Thành',
                    ].map((chip) => (
                      <button
                        key={chip}
                        onClick={() => {
                          setActivePresetId('');
                          setUserCustomRequest(chip);
                        }}
                        className="px-2 py-1 text-[10px] bg-[#EBE6DF] hover:bg-[#1C1917] hover:text-[#FBF9F5] border border-[#DFD8C8] transition-colors cursor-pointer"
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => runVStylistConsultation(true)}
                    disabled={isConsultingAi}
                    className="w-full py-2.5 px-3 bg-[#9A3412] hover:bg-[#7C2D12] text-[#FBF9F5] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 shadow-xs"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-[#FDE68A]" />
                    <span>
                      {isConsultingAi
                        ? 'V-Stylist AI đang tra cứu Catalog...'
                        : 'Cố Vấn & Tự Động Phối Đồ (V-Stylist AI)'}
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Quick Summary Footer inside Left Dock */}
          <div className="shrink-0 border-t border-[#DFD8C8] bg-[#EBE6DF]/70 px-4 py-2.5 flex items-center justify-between text-xs">
            <span className="text-[#57534E] truncate">
              {currentTop.baseName} + {selectedBottomName}
            </span>
            <button
              onClick={() =>
                setActiveControlTab(
                  activeControlTab === 'top'
                    ? 'bottom_acc'
                    : activeControlTab === 'bottom_acc'
                    ? 'character'
                    : activeControlTab === 'character'
                    ? 'context'
                    : 'top'
                )
              }
              className="text-[#9A3412] font-semibold hover:underline shrink-0 cursor-pointer ml-2"
            >
              Mục tiếp →
            </button>
          </div>
        </section>

        {/* COLUMN 2 (Center, 4 cols on laptop, 5 on wide screens): Interactive 3D Studio */}
        <section className="lg:col-span-4 xl:col-span-5 flex flex-col min-h-[440px] lg:min-h-0 relative">
          {evaluation.genz_ai_comment && isGenzAlertOpen && (
            <div className="absolute top-2 left-2 right-2 z-30 transition-all">
              <div className="bg-[#FFFBEB]/95 backdrop-blur-md border border-[#F59E0B] p-2.5 sm:p-3 shadow-lg flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#D97706] text-white flex items-center justify-center shrink-0 text-sm shadow-xs font-bold">
                  🔥
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#92400E]">
                        AI Stylist GenZ "bắt bài"
                      </span>
                      <span className="px-1.5 py-0.2 text-[9px] font-bold bg-[#FDE68A] text-[#92400E] uppercase">
                        {evaluation.cultural_status === 'CRITICAL' ? 'Bất hòa' : 'Lệch quẻ'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsGenzAlertOpen(false)}
                      className="text-[#92400E] hover:text-[#78350F] text-xs font-bold px-1.5 cursor-pointer"
                      title="Đóng"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-xs text-[#78350F] font-medium leading-relaxed mt-1">
                    {evaluation.genz_ai_comment}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleFixToTraditionalSafe}
                      className="px-2.5 py-1 text-[11px] font-bold bg-[#9A3412] hover:bg-[#7C2D12] text-[#FBF9F5] flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                    >
                      <Wand2 className="w-3 h-3" />
                      <span>Sửa chuẩn liền ní ơi ✨</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <VietPhucCanvas
            genderEn={genderEn}
            onToggleGender={handleToggleGender}
            hairStyle={hairStyle}
            hairColorHex={hairColorHex}
            expression={expression}
            isCharacterTab={activeControlTab === 'character'}
            topGarment={currentTop}
            color={currentColor}
            patternId={selectedPattern}
            fabricMaterialId={selectedFabricMaterial}
            bottomGarment={currentBottom}
            accessories={selectedAccessories}
            culturalStatus={evaluation.cultural_status}
            onCycleTop={cycleTop}
            onCycleColor={cycleColor}
            onCycleBottom={cycleBottom}
            isNotebookActive={rightTab === 'lore'}
            onToggleNotebook={() =>
              setRightTab((prev) => (prev === 'lore' ? 'card' : 'lore'))
            }
            onOpenBodyShapeModal={() => setIsBodyShapeModalOpen(true)}
          />
        </section>

        {/* COLUMN 3 (Right, 4 cols): Stylist Suggestions, Historical Notebook & Advanced JSON */}
        <section className="lg:col-span-4 silk-shimmer border border-[#D6CEBE] flex flex-col min-h-0 overflow-hidden">
          {/* Top Segmented Switcher inside Right Panel */}
          <div className="grid grid-cols-3 border-b border-[#DFD8C8] bg-[#EBE6DF] p-1 gap-1 shrink-0">
            <button
              onClick={() => setRightTab('card')}
              className={`py-1.5 px-2 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                rightTab === 'card'
                  ? 'bg-[#FBF9F5] text-[#1C1917] shadow-xs'
                  : 'text-[#686259] hover:text-[#1C1917]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#9A3412]" />
              <span>Stylist AI</span>
            </button>

            <button
              onClick={() => setRightTab('lore')}
              className={`py-1.5 px-2 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                rightTab === 'lore'
                  ? 'bg-[#9A3412] text-[#FDE68A] shadow-xs'
                  : 'text-[#7C2D12] hover:text-[#1C1917]'
              }`}
            >
              <ScrollText className="w-3.5 h-3.5" />
              <span>Sổ Tay Điển Tích</span>
            </button>

            <button
              onClick={() => setRightTab('json')}
              className={`py-1.5 px-2 text-xs font-mono-tabular font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                rightTab === 'json'
                  ? 'bg-[#1C1917] text-[#FDE68A] shadow-xs'
                  : 'text-[#686259] hover:text-[#1C1917]'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Raw JSON</span>
            </button>
          </div>

          {rightTab === 'card' && (
            <div className="flex-1 overflow-y-auto p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#DFD8C8] pb-3">
                  <div className="text-xs text-[#686259]">
                    <span>{customLocation}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{formattedTemp}</span>
                    <span aria-hidden="true"> · </span>
                    <strong className="text-[#1C1917]">{selectedEvent}</strong>
                  </div>

                  <span className="text-xs font-mono-tabular text-[#686259]">
                    STYLE SCORE
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] uppercase tracking-widest text-[#686259] block">
                      Danh Xưng Bản Phối
                    </span>
                    <h2 className="text-3xl font-editorial font-bold text-[#1C1917] leading-tight">
                      “{evaluation.lookbook_title}”
                    </h2>
                  </div>

                  <div className="w-16 h-16 shrink-0 border-2 border-[#9A3412] bg-[#FBF9F5] flex flex-col items-center justify-center">
                    <span className="text-2xl font-editorial font-bold font-mono-tabular text-[#9A3412] leading-none">
                      {evaluation.style_score}
                    </span>
                    <span className="text-[10px] font-mono-tabular text-[#686259] mt-0.5">
                      /100
                    </span>
                  </div>
                </div>

                {/* V-Stylist AI — Chuyên Gia Cố Vấn Phục Sức & Thuyết Minh Di Sản (30s Audio Guide) */}
                <div className="bg-[#FBF9F5] border-2 border-[#134E4A] p-3.5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between gap-2 border-b border-[#DFD8C8] pb-2">
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#134E4A]">
                        <Compass className="w-3.5 h-3.5" />
                        <span>VAI-Stylist 3D · Cố Vấn Phục Sức Tối Ưu</span>
                      </div>
                      <p className="text-[11px] text-[#57534E] mt-0.5">
                        {vStylistConsultation.contextAnalysis.location}
                        <span aria-hidden="true"> · </span>
                        {vStylistConsultation.contextAnalysis.weather}
                        <span aria-hidden="true"> · </span>
                        {vStylistConsultation.contextAnalysis.event}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        applyVStylistRecommendationTo3D(
                          vStylistConsultation.recommendation
                        )
                      }
                      className="px-2.5 py-1 text-[11px] font-semibold bg-[#134E4A] hover:bg-[#1C1917] text-[#FBF9F5] transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      Mặc Bộ Này Lên 3D
                    </button>
                  </div>

                  {/* Catalog Recommendation Summary */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono-tabular bg-[#F5F1E8] p-2.5 border border-[#DFD8C8]">
                    <div>
                      <span className="text-[#686259] block text-[10px]">COSTUME ID</span>
                      <strong className="text-[#1C1917] truncate block">
                        {vStylistConsultation.recommendation.costumeId}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#686259] block text-[10px]">PATTERN ID</span>
                      <strong className="text-[#9A3412] truncate block">
                        {vStylistConsultation.recommendation.patternId}
                      </strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/25 shrink-0"
                        style={{
                          backgroundColor: vStylistConsultation.recommendation.mainColor,
                        }}
                      />
                      <span className="truncate">
                        Áo: <strong>{vStylistConsultation.recommendation.mainColor}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/25 shrink-0"
                        style={{
                          backgroundColor:
                            vStylistConsultation.recommendation.bottomColor,
                        }}
                      />
                      <span className="truncate">
                        Quần:{' '}
                        <strong>{vStylistConsultation.recommendation.bottomColor}</strong>
                      </span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-[#DFD8C8] text-[#44403C] truncate">
                      Phụ kiện:{' '}
                      <strong>
                        {vStylistConsultation.recommendation.accessoryIds.join(', ')}
                      </strong>
                    </div>
                  </div>

                  {/* Stylist Note */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono-tabular uppercase tracking-widest text-[#686259] block">
                      STYLIST NOTE · LỜI KHUYÊN LỄ NGHI & THỜI TIẾT
                    </span>
                    <p className="text-xs text-[#1C1917] leading-relaxed">
                      {vStylistConsultation.stylistNote}
                    </p>
                  </div>

                  {/* Audio Guide Script (30s Heritage Narration) */}
                  <div className="bg-[#EFE8D8] border border-[#D5CBB4] p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono-tabular font-bold uppercase tracking-widest text-[#78350F]">
                        AUDIO GUIDE SCRIPT (30 GIÂY ĐỌC)
                      </span>
                      <button
                        type="button"
                        onClick={handleToggleAudioGuide}
                        className={`px-2 py-0.5 text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                          isPlayingAudioGuide
                            ? 'bg-[#991B1B] text-white'
                            : 'bg-[#1C1917] text-[#FDE68A] hover:bg-[#9A3412]'
                        }`}
                      >
                        {isPlayingAudioGuide ? (
                          <>
                            <Square className="w-2.5 h-2.5 fill-current" />
                            <span>Dừng Thuyết Minh</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3" />
                            <span>Nghe Thuyết Minh 30s</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs font-editorial italic text-[#1C1917] leading-relaxed">
                      “{vStylistConsultation.audioGuideScript}”
                    </p>
                  </div>
                </div>

                {/* Body Shape & Real Face Try-On Trigger Banner */}
                <div className="bg-[#FFFBEB] border border-[#FDE68A] p-3 flex items-center justify-between gap-3 shadow-xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#92400E]">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Thử Phom & Ghép Ảnh Tùy Chọn</span>
                    </div>
                    <p className="text-xs text-[#78350F] truncate mt-0.5">
                      Gemini gợi ý phom mặc · Tùy chọn ghép ảnh cá nhân để xem thử
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBodyShapeModalOpen(true)}
                    className="px-3 py-1.5 text-xs font-bold bg-[#9A3412] hover:bg-[#7C2D12] text-[#FBF9F5] shrink-0 transition-colors cursor-pointer shadow-xs"
                  >
                    Thử Đồ →
                  </button>
                </div>

                {/* Cultural Guardrail Status Box */}
                <div
                  className={`p-3.5 border-l-4 ${
                    evaluation.cultural_status === 'SAFE'
                      ? 'bg-[#14532D]/8 border-[#14532D]'
                      : evaluation.cultural_status === 'WARNING'
                      ? 'bg-[#92400E]/10 border-[#92400E]'
                      : 'bg-[#991B1B]/10 border-[#991B1B]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div
                      className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${
                        evaluation.cultural_status === 'SAFE'
                          ? 'text-[#14532D]'
                          : evaluation.cultural_status === 'WARNING'
                          ? 'text-[#92400E]'
                          : 'text-[#991B1B]'
                      }`}
                    >
                      {evaluation.cultural_status === 'SAFE' && (
                        <>
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>HỢP BỐI CẢNH · Giữ tinh thần cổ phục</span>
                        </>
                      )}
                      {evaluation.cultural_status === 'WARNING' && (
                        <>
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>GIAO THOA · Hiện đại và hoài cổ</span>
                        </>
                      )}
                      {evaluation.cultural_status === 'CRITICAL' && (
                        <>
                          <ShieldAlert className="w-4 h-4 shrink-0" />
                          <span>CÂN NHẮC · Chưa hợp dịp hiện tại</span>
                        </>
                      )}
                    </div>

                    {evaluation.cultural_status !== 'SAFE' && (
                      <button
                        onClick={handleFixToTraditionalSafe}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-[#1C1917] text-[#FBF9F5] hover:bg-[#9A3412] transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Wand2 className="w-3 h-3" />
                        <span>Thử gợi ý cổ điển</span>
                      </button>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-[#1C1917] leading-relaxed">
                    {evaluation.cultural_warning_msg}
                  </p>

                  {evaluation.genz_ai_comment && (
                    <div className="mt-2.5 p-2.5 bg-[#FFFBEB] border border-[#F59E0B]/50 text-[#78350F] text-xs leading-relaxed flex items-start gap-2 shadow-xs">
                      <span className="text-base leading-none shrink-0 select-none">🔥</span>
                      <div className="space-y-0.5 min-w-0">
                        <strong className="text-[11px] uppercase tracking-wider font-bold text-[#B45309] block">
                          AI Stylist GenZ "bắt bài":
                        </strong>
                        <p className="text-xs text-[#78350F] leading-relaxed italic">
                          "{evaluation.genz_ai_comment}"
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Weather Advice */}
                <div className="bg-[#FBF9F5] border border-[#DFD8C8] p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#686259]">
                    <CloudSun className="w-3.5 h-3.5 text-[#9A3412]" />
                    <span>Lời Khuyên Thời Tiết</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#292524] leading-relaxed">
                    {evaluation.weather_advice}
                  </p>
                </div>

                {/* Custom User Request & AI Stylist Recommendation Card */}
                {(evaluation.custom_request_feedback ||
                  evaluation.recommended_color_hex ||
                  (evaluation.recommended_pattern_id &&
                    evaluation.recommended_pattern_id !== selectedPattern)) && (
                  <div className="bg-[#FBF9F5] border border-[#134E4A]/40 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#134E4A]">
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>Đề Xuất Phối Đồ & Hoa Văn AI</span>
                      </div>
                      <button
                        onClick={handleApplyAiRecommendations}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-[#134E4A] text-[#FBF9F5] hover:bg-[#1C1917] transition-colors cursor-pointer"
                      >
                        Áp Dụng Gợi Ý 3D
                      </button>
                    </div>
                    {evaluation.custom_request_feedback && (
                      <p className="text-xs text-[#1C1917] leading-relaxed">
                        {evaluation.custom_request_feedback}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono-tabular text-[#57534E]">
                      {evaluation.recommended_color_hex && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#EBE6DF] border border-[#DFD8C8]">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-black/20"
                            style={{ backgroundColor: evaluation.recommended_color_hex }}
                          />
                          Màu: {evaluation.recommended_color_hex}
                        </span>
                      )}
                      {evaluation.recommended_pattern_id && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#EBE6DF] border border-[#DFD8C8]">
                          Hoa văn: {evaluation.recommended_pattern_id}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* V-Phuc Heritage Guard & Precision 3D Engine Verification Card */}
                <div className="bg-[#FBF9F5] border border-[#1C1917] p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-[#DFD8C8] pb-2">
                    <div>
                      <span className="text-[10px] font-mono-tabular uppercase tracking-widest text-[#9A3412] font-bold block">
                        V-PHUC HERITAGE GUARD & PRECISION 3D ENGINE
                      </span>
                      <span className="text-xs font-bold text-[#1C1917]">
                        {vPhucPrecisionAudit.garment_identification}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 bg-[#1C1917] text-[#FDE68A] font-mono-tabular text-xs font-bold shrink-0">
                      {vPhucPrecisionAudit.historical_accuracy_score}%
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono-tabular bg-[#F5F1E8] p-2 border border-[#DFD8C8]">
                    <div>
                      <span className="text-[#686259] block text-[10px]">MATERIAL</span>
                      <strong className="text-[#1C1917] truncate block">
                        {currentFabric.shortName}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#686259] block text-[10px]">ROUGHNESS / SHEEN</span>
                      <strong className="text-[#1C1917]">
                        {vPhucPrecisionAudit.fabric_pbr_properties.roughness} /{' '}
                        {vPhucPrecisionAudit.fabric_pbr_properties.sheen}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#686259] block text-[10px]">NORMAL MAP</span>
                      <strong className="text-[#9A3412] truncate block">
                        {vPhucPrecisionAudit.fabric_pbr_properties.normal_map_detail}
                      </strong>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-[#292524]">
                    <p className="leading-snug">
                      <strong className="text-[#1C1917]">• Cổ & Khuy (Collar):</strong>{' '}
                      {vPhucPrecisionAudit.tailoring_verification.collar_status}
                    </p>
                    <p className="leading-snug">
                      <strong className="text-[#1C1917]">• Thân & Tà Áo (Panels):</strong>{' '}
                      {vPhucPrecisionAudit.tailoring_verification.panel_cut_status}
                    </p>
                    <p className="leading-snug">
                      <strong className="text-[#1C1917]">• Tay Áo (Sleeves):</strong>{' '}
                      {vPhucPrecisionAudit.tailoring_verification.sleeve_status}
                    </p>
                  </div>
                </div>

                {/* Highlighted Historical Fact Card + Direct Trigger to Sổ Tay Điển Tích */}
                <div className="bg-[#FBF9F5] border-2 border-[#9A3412]/40 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#9A3412]">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Điển Tích Cổ Phục</span>
                    </div>
                    <button
                      onClick={() => setRightTab('lore')}
                      className="text-[11px] font-semibold text-[#134E4A] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <ScrollText className="w-3 h-3" />
                      <span>Mở Sổ Tay Điển Tích →</span>
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm font-editorial italic text-[#1C1917] leading-relaxed">
                    “{evaluation.cultural_history_fact}”
                  </p>
                </div>
              </div>

              {/* Bottom Action Bar inside Right Card */}
              <div className="pt-3 border-t border-[#DFD8C8] flex items-center justify-between gap-2">
                <button
                  onClick={() => runGeminiEvaluation()}
                  disabled={isAnalyzing}
                  className="flex-1 py-2 px-3 text-xs font-semibold bg-[#1C1917] text-[#FBF9F5] hover:bg-[#292524] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  <span>{isAnalyzing ? 'Đang Phân Tích...' : 'Chẩn Đoán AI (Gemini)'}</span>
                </button>

                <button
                  onClick={handleCopyRawJson}
                  className="py-2 px-3 text-xs font-mono-tabular border border-[#DFD8C8] bg-[#FBF9F5] hover:border-[#1C1917] text-[#1C1917] flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedJson ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#14532D]" />
                      <span>Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {rightTab === 'lore' && (
            /* NOSTALGIC & HISTORICAL LORE NOTEBOOK ("Châu Bản Cổ Học") right beside the 3D Stage */
            <div className="flex-1 bg-[#EFE8D8] flex flex-col justify-between overflow-hidden">
              <div className="px-4 py-3 bg-[#E6DEC8] border-b border-[#C8B99E] flex items-start justify-between gap-2 shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono-tabular uppercase tracking-widest text-[#78350F]">
                    <span>SỔ TAY ĐIỂN TÍCH</span>
                    <span>·</span>
                    <span>{currentTop.dynasty}</span>
                  </div>
                  <h2 className="text-xl font-editorial font-bold text-[#1C1917] leading-snug truncate">
                    {currentTop.baseName}
                  </h2>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleToggleAudioGuide}
                    className={`px-2 py-0.5 text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                      isPlayingAudioGuide
                        ? 'bg-[#991B1B] text-white'
                        : 'bg-[#1C1917] text-[#FDE68A] hover:bg-[#9A3412]'
                    }`}
                  >
                    {isPlayingAudioGuide ? (
                      <>
                        <Square className="w-2.5 h-2.5 fill-current" />
                        <span>Dừng Đọc</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3 h-3" />
                        <span>Nghe Thuyết Minh</span>
                      </>
                    )}
                  </button>
                  <div className="px-2 py-0.5 border border-[#9A2B1D] bg-[#9A2B1D]/10 text-[#9A2B1D] text-[10px] font-editorial font-bold tracking-widest uppercase">
                    Châu Bản Cổ Học
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs sm:text-[13px] text-[#292524]">
                <div className="border-l-2 border-[#9A2B1D] pl-3 py-0.5">
                  <p className="font-editorial font-bold italic text-base text-[#7C2D12] leading-snug">
                    {currentTop.historicalLore.eraTitle}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#78350F] flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#9A2B1D]" />
                    <span>I. Khởi Nguồn & Điển Chế</span>
                  </h3>
                  <p className="leading-relaxed text-[#1C1917] first-letter:text-3xl first-letter:font-editorial first-letter:font-bold first-letter:text-[#9A2B1D] first-letter:float-left first-letter:mr-2 first-letter:leading-none">
                    {currentTop.historicalLore.originStory}
                  </p>
                </div>

                <div className="space-y-2 bg-[#F7F3E8] border border-[#D5CBB4] p-3">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#78350F]">
                    II. Giải Mã Quy Chuẩn & Triết Lý
                  </h3>
                  <ul className="space-y-1.5">
                    {currentTop.historicalLore.symbolismDecode.map((point, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 leading-relaxed text-[#292524]"
                      >
                        <span className="text-[#9A2B1D] font-bold">❖</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1.5 bg-[#E5DEC9]/75 border-y border-[#C8B99E] py-3 px-3">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#7C2D12]">
                    III. Giai Thoại Chốn Kinh Kỳ & Dân Gian
                  </h3>
                  <p className="font-editorial italic text-sm text-[#1C1917] leading-relaxed">
                    “{currentTop.historicalLore.famousAnecdote}”
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#134E4A]">
                    IV. Dòng Chảy Đương Đại (Gen Z)
                  </h3>
                  <p className="leading-relaxed text-[#292524]">
                    {currentTop.historicalLore.youthRevivalNote}
                  </p>
                </div>
              </div>

              <div className="px-4 py-2.5 bg-[#E6DEC8] border-t border-[#C8B99E] flex items-center justify-between text-xs text-[#57534E] shrink-0">
                <span className="font-mono-tabular truncate">{currentTop.accessionCode}</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => cycleTop(-1)}
                    className="hover:text-[#9A2B1D] font-semibold cursor-pointer"
                  >
                    ← Áo trước
                  </button>
                  <button
                    onClick={() => cycleTop(1)}
                    className="hover:text-[#9A2B1D] font-semibold cursor-pointer"
                  >
                    Áo tiếp →
                  </button>
                </div>
              </div>
            </div>
          )}

          {rightTab === 'json' && (
            /* Pure Raw JSON Output & Input Tester Panel */
            <div className="flex-1 overflow-y-auto p-4 bg-[#1C1917] text-[#F5F1E8] flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-white/15 pb-2 gap-2">
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      onClick={() => setJsonSchemaMode('vstylist_ai')}
                      className={`px-2 py-1 text-[11px] font-mono-tabular font-semibold border cursor-pointer ${
                        jsonSchemaMode === 'vstylist_ai'
                          ? 'bg-[#9A3412] text-[#FDE68A] border-[#9A3412]'
                          : 'bg-transparent text-[#A8A29E] border-white/20'
                      }`}
                    >
                      VAI-Stylist 3D JSON (Chuẩn Catalog)
                    </button>
                    <button
                      onClick={() => setJsonSchemaMode('vphuc_precision')}
                      className={`px-2 py-1 text-[11px] font-mono-tabular font-semibold border cursor-pointer ${
                        jsonSchemaMode === 'vphuc_precision'
                          ? 'bg-[#9A3412] text-[#FDE68A] border-[#9A3412]'
                          : 'bg-transparent text-[#A8A29E] border-white/20'
                      }`}
                    >
                      Precision 3D JSON
                    </button>
                    <button
                      onClick={() => setJsonSchemaMode('stylist')}
                      className={`px-2 py-1 text-[11px] font-mono-tabular font-semibold border cursor-pointer ${
                        jsonSchemaMode === 'stylist'
                          ? 'bg-[#9A3412] text-[#FDE68A] border-[#9A3412]'
                          : 'bg-transparent text-[#A8A29E] border-white/20'
                      }`}
                    >
                      Guardrail JSON
                    </button>
                  </div>
                  <button
                    onClick={handleCopyRawJson}
                    className="text-xs font-mono-tabular text-[#D6CEBE] hover:text-white cursor-pointer shrink-0"
                  >
                    {copiedJson ? '✓ Đã sao chép' : 'Sao chép'}
                  </button>
                </div>

                <pre className="text-xs font-mono-tabular leading-relaxed bg-black/40 p-3 border border-white/10 overflow-x-auto whitespace-pre-wrap text-[#E7E5E4]">
                  {JSON.stringify(
                    jsonSchemaMode === 'vstylist_ai'
                      ? vStylistConsultation
                      : jsonSchemaMode === 'vphuc_precision'
                      ? vPhucPrecisionAudit
                      : evaluation,
                    null,
                    2
                  )}
                </pre>
              </div>

              <div className="space-y-2 border-t border-white/15 pt-3">
                <span className="text-xs font-mono-tabular text-[#A8A29E] block">
                  KIỂM THỬ INPUT JSON TRỰC TIẾP:
                </span>
                <textarea
                  value={customJsonInput}
                  onChange={(e) => setCustomJsonInput(e.target.value)}
                  rows={6}
                  aria-label="Custom JSON Input"
                  className="w-full bg-black/40 border border-white/20 p-2.5 text-xs font-mono-tabular text-[#F5F1E8] focus:outline-none focus:border-[#FDE68A]"
                />
                {jsonError && <p className="text-xs text-[#FCA5A5]">{jsonError}</p>}
                <button
                  onClick={handleRunCustomJson}
                  disabled={isAnalyzing}
                  className="w-full py-2 text-xs font-semibold bg-[#9A3412] text-white hover:bg-[#7C2D12] transition-colors cursor-pointer"
                >
                  {isAnalyzing ? 'Đang Chạy...' : 'Gửi Payload JSON Tới AI'}
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Optional photo fitting and silhouette suggestions */}
      <BodyShapeAndFitModal
        isOpen={isBodyShapeModalOpen}
        onClose={() => setIsBodyShapeModalOpen(false)}
        gender={genderEn}
        topGarment={currentTop}
        bottomGarment={currentBottom}
        aoHex={outfit.colors.ao || currentColor.hex}
        quanHex={outfit.colors.quan || '#FFFFFF'}
        patternId={selectedPattern}
        accessories={selectedAccessories}
        onApplyRecommendedPreset={handleApplyBodyShapePreset}
      />
      <RemixStudioModal
        isOpen={isRemixStudioOpen}
        onClose={() => setIsRemixStudioOpen(false)}
        request={{
          gender: genderEn,
          event: selectedEvent,
          currentOutfit: {
            costumeId: selectedTopId,
            mainColor: outfit.colors.ao,
            bottomName: selectedBottomName,
            patternId: selectedPattern,
            accessoryIds: selectedAccessories.map((accessory) => mapAccessoryNameToId(accessory)),
            remix: outfit.remix,
          },
        }}
        onApply={handleApplyRemixLook}
      />
      <LookbookModal
        isOpen={isLookbookOpen}
        onClose={() => setIsLookbookOpen(false)}
        onSaveLook={handleSaveLook}
        savedCount={savedLooks.length}
        onOpenCompare={() => setIsCompareOpen(true)}
      />
      <CompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        savedLooks={savedLooks}
        onApplyLook={handleApplySavedLook}
        onDeleteLook={(id) => setSavedLooks((current) => current.filter((look) => look.id !== id))}
      />
      <VietPhucQuestModal
        isOpen={isQuestOpen}
        onClose={() => setIsQuestOpen(false)}
        onOpenScan={() => {
          setIsQuestOpen(false);
          setIsScanOpen(true);
        }}
        onApplyCostume={(costumeId) => {
          if (TOP_GARMENTS.some((garment) => garment.id === costumeId)) {
            setSelectedTopId(costumeId);
            setActiveControlTab('top');
            setRightTab('lore');
          }
          setIsQuestOpen(false);
        }}
      />
      <ScanModal isOpen={isScanOpen} onClose={() => setIsScanOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <OutfitStateProvider>
      <VStylistWorkspace />
    </OutfitStateProvider>
  );
}
