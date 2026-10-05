import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Download,
  RefreshCw,
  Upload,
  AlertTriangle,
  Check,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';
import {
  TopGarmentOption,
  BottomGarmentOption,
  HairStyleId,
  ExpressionId,
  HAIR_STYLES,
  HAIR_COLORS,
  EXPRESSIONS,
  IMAGE_MODEL,
} from '../data/vietPhucData';
import {
  StoredTurntableData,
  processTurnaroundSheetTo4Frames,
  normalizeSingleAngleFrameTo768x1152,
  createPosterJpgFromFrontFrame,
  calibrateBaseHueFromTop5Percent,
  loadImageElement,
  saveTurntableToIndexedDb,
  exportTurntableAndMeshyZip,
  getCachedRecoloredCanvas,
  resolveTurntableFrames,
} from '../utils/vstylistStorageAndZip';

export interface TurnaroundAiStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  gender: 'male' | 'female';
  topGarment: TopGarmentOption;
  bottomGarment?: BottomGarmentOption;
  accessories?: string[];
  hairStyle?: HairStyleId;
  hairColorHex?: string;
  expression?: ExpressionId;
  aoHex: string;
  quanHex: string;
  existingTurntable: StoredTurntableData | null;
  onAppliedTurntable: (data: StoredTurntableData) => void;
}

interface GeminiImageApiErrorInfo {
  finishReason?: string;
  promptFeedback?: unknown;
  text?: string;
  error?: string;
  model?: string;
}

interface CandidateTurntable {
  id: number;
  rawSheetUrl?: string;
  data: StoredTurntableData;
}

const ANGLE_LABELS = [
  { index: 0, label: 'Chính diện (frame_00)', en: 'front view' },
  { index: 1, label: 'Nghiêng trái (frame_01)', en: 'left side profile' },
  { index: 2, label: 'Phía sau (frame_02)', en: 'back view' },
  { index: 3, label: 'Nghiêng phải (frame_03)', en: 'right side profile' },
] as const;

export function buildSheetPromptTemplate(params: {
  gender: 'male' | 'female';
  look: 'ban-thuc' | 'nguoi-that';
  costumeName: string;
  garmentFeatures: string;
  aoHex: string;
  quanHex: string;
  hair: string;
  hasReferenceImage: boolean;
}): string {
  const genderWord = params.gender === 'male' ? 'man' : 'woman';
  const lookPhrase =
    params.look === 'ban-thuc'
      ? 'semi-realistic 3D character, realistic proportions, smooth even skin with soft natural shading, slightly simplified clean facial details'
      : 'photorealistic real-looking human, natural proportions, natural skin with subtle texture, realistic hair and eyes';

  const refPrefix = params.hasReferenceImage
    ? 'Use the attached image as the exact reference for face, proportions and outfit. '
    : '';

  return `${refPrefix}Create a character turnaround sheet of ONE fictional young Vietnamese ${genderWord}, adult around 22, not resembling any real person or celebrity. FOUR full-body views in ONE wide image, side by side, same scale, same height, feet on the same baseline: front, left side profile, back, right side profile. LOOK: ${lookPhrase}. OUTFIT: ${params.costumeName}. ${params.garmentFeatures.trim()}. Main top color ${params.aoHex}, lower garment color ${params.quanHex}. Realistic matte fabric with visible weave, natural folds and stitching, not glossy, not plastic. HAIR, EXPRESSION AND ACCESSORIES: ${params.hair.trim()}. POSE: upright A-pose, arms about 30 degrees from the body, hands open with fingers slightly apart and visible. Back view: plain back with the same seams and slits, no invented patterns, logos or text. LIGHTING: soft even studio lighting, identical in all views, no hard shadows. BACKGROUND: perfectly flat solid pure magenta #FF00FF, no gradient, no floor, no shadow. Full body head to toe in every view. No text, no watermark, no extra people. Modest, dignified depiction.`;
}

export function buildFrontSinglePromptTemplate(params: {
  gender: 'male' | 'female';
  look: 'ban-thuc' | 'nguoi-that';
  costumeName: string;
  garmentFeatures: string;
  aoHex: string;
  quanHex: string;
  hair: string;
  hasReferenceImage: boolean;
}): string {
  const genderWord = params.gender === 'male' ? 'man' : 'woman';
  const lookPhrase =
    params.look === 'ban-thuc'
      ? 'semi-realistic 3D character, realistic proportions, smooth even skin with soft natural shading, slightly simplified clean facial details'
      : 'photorealistic real-looking human, natural proportions, natural skin with subtle texture, realistic hair and eyes';

  const refPrefix = params.hasReferenceImage
    ? 'Use the attached image as the exact reference for face, proportions and outfit. '
    : '';

  return `${refPrefix}Create ONE full-body front view of ONE fictional young Vietnamese ${genderWord}, adult around 22, not resembling any real person or celebrity. LOOK: ${lookPhrase}. OUTFIT: ${params.costumeName}. ${params.garmentFeatures.trim()}. Main top color ${params.aoHex}, lower garment color ${params.quanHex}. Realistic matte fabric with visible weave, natural folds and stitching, not glossy, not plastic. HAIR, EXPRESSION AND ACCESSORIES: ${params.hair.trim()}. POSE: upright A-pose, arms about 30 degrees from the body, hands open with fingers slightly apart and visible. LIGHTING: soft even studio lighting, no hard shadows. BACKGROUND: perfectly flat solid pure magenta #FF00FF, no gradient, no floor, no shadow. Full body head to toe. No text, no watermark, no extra people. Modest, dignified depiction.`;
}

export function buildRotatedAngleEditPrompt(
  angleEn: 'left side profile' | 'back view' | 'right side profile'
): string {
  return `Same character and outfit as the attached image, rotate the camera to an exact ${angleEn}; keep face, proportions, garment, colors, scale and background identical; change nothing else`;
}

export const TurnaroundAiStudioModal: React.FC<TurnaroundAiStudioModalProps> = ({
  isOpen,
  onClose,
  gender,
  topGarment,
  bottomGarment,
  accessories = [],
  hairStyle = 'bui-truyen-thong',
  hairColorHex = '#181513',
  expression = 'trang-nghiem',
  aoHex,
  quanHex,
  existingTurntable,
  onAppliedTurntable,
}) => {
  const modelId = `${topGarment.id}-${gender}`;
  const refInputRef = useRef<HTMLInputElement | null>(null);

  const [costumeName, setCostumeName] = useState(topGarment.baseName);
  const [era, setEra] = useState(topGarment.dynasty);
  const [garmentFeatures, setGarmentFeatures] = useState(
    topGarment.garmentFeaturesEn || topGarment.description || ''
  );
  const [mainColorHex, setMainColorHex] = useState(aoHex);
  const [trouserColorHex, setTrouserColorHex] = useState(quanHex);
  const [hairDesc, setHairDesc] = useState(
    gender === 'male' ? 'neat short black hair' : 'neat low bun black hair'
  );
  const [lookMode, setLookMode] = useState<'ban-thuc' | 'nguoi-that'>('nguoi-that');
  const [genMode, setGenMode] = useState<'sheet-4' | 'per-angle'>('sheet-4');
  const [referenceImageDataUrl, setReferenceImageDataUrl] = useState<string | null>(
    null
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [regeneratingFrameIdx, setRegeneratingFrameIdx] = useState<number | null>(
    null
  );
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [apiError, setApiError] = useState<GeminiImageApiErrorInfo | null>(null);
  const [candidates, setCandidates] = useState<CandidateTurntable[]>([]);
  const [selectedCandidateIdx, setSelectedCandidateIdx] = useState<number>(0);
  const [isExportingZip, setIsExportingZip] = useState(false);

  // Sync prefilled costume fields + appearance + bottom garment + accessories when opened or changed
  useEffect(() => {
    setCostumeName(topGarment.baseName);
    setEra(topGarment.dynasty);
    const baseFeat =
      topGarment.garmentFeaturesEn || topGarment.description || '';
    const bottomFeat = bottomGarment
      ? ` Paired with lower garment: ${bottomGarment.name} (${bottomGarment.nameEn})`
      : '';
    setGarmentFeatures(`${baseFeat}.${bottomFeat}`);
    setMainColorHex(aoHex);
    setTrouserColorHex(quanHex);

    const hairObj = HAIR_STYLES.find((h) => h.id === hairStyle);
    const colorObj = HAIR_COLORS.find(
      (c) => c.hex.toLowerCase() === hairColorHex.toLowerCase()
    );
    const exprObj = EXPRESSIONS.find((e) => e.id === expression);
    const accList =
      accessories.length > 0
        ? `, wearing accessories: ${accessories.join(', ')}`
        : ', bare head, no hat, no glasses';
    setHairDesc(
      `${hairObj?.label || 'neat traditional Vietnamese hair'} in ${
        colorObj?.label || 'natural black'
      } (${hairColorHex}), facial expression: ${
        exprObj?.desc || 'serene composed gaze'
      }${accList}`
    );
    if (existingTurntable && candidates.length === 0) {
      setCandidates([{ id: 1, data: existingTurntable }]);
      setSelectedCandidateIdx(0);
    } else if (candidates.length === 0) {
      // Auto-load built-in studio turnaround so user immediately has full 4-angle frames
      resolveTurntableFrames(topGarment.id, gender)
        .then((resolved) => {
          if (resolved) {
            setCandidates([
              {
                id: 1,
                rawSheetUrl: resolved.frames[0],
                data: resolved,
              },
            ]);
            setSelectedCandidateIdx(0);
          }
        })
        .catch(() => {});
    }
  }, [
    isOpen,
    topGarment,
    bottomGarment,
    accessories,
    hairStyle,
    hairColorHex,
    expression,
    gender,
    aoHex,
    quanHex,
  ]);

  if (!isOpen) return null;

  const callGeminiImageApi = async (payload: {
    prompt: string;
    aspectRatio: '16:9' | '3:4' | '1:1';
    referenceImageDataUrl?: string | null;
  }): Promise<string> => {
    let referenceImageBase64: string | undefined;
    let referenceImageMimeType: string | undefined;

    if (payload.referenceImageDataUrl) {
      const [header, b64] = payload.referenceImageDataUrl.split(',');
      referenceImageBase64 = b64;
      const mimeMatch = header?.match(/data:([^;]+);/);
      referenceImageMimeType = mimeMatch ? mimeMatch[1] : 'image/png';
    }

    const resp = await fetch('/api/gemini/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: payload.prompt,
        aspectRatio: payload.aspectRatio,
        referenceImageBase64,
        referenceImageMimeType,
      }),
    });

    const json = await resp.json();
    if (!resp.ok || !json.ok || !json.imageDataUrl) {
      const errObj: GeminiImageApiErrorInfo = {
        finishReason: json.finishReason || 'NO_IMAGE_RETURNED',
        promptFeedback: json.promptFeedback || null,
        text: json.text || json.error || 'Model did not return inlineData image.',
        model: json.model || IMAGE_MODEL,
      };
      console.error('[V-Stylist IMAGE_MODEL Error]', errObj);
      throw errObj;
    }

    return json.imageDataUrl as string;
  };

  const generateSingleCandidate = async (
    candidateNumber: number
  ): Promise<CandidateTurntable> => {
    if (genMode === 'sheet-4') {
      setStatusMessage(
        `Đang tạo Ứng viên #${candidateNumber} (Chế độ Sheet 4 góc 16:9 · ${IMAGE_MODEL})...`
      );
      const prompt = buildSheetPromptTemplate({
        gender,
        look: lookMode,
        costumeName,
        garmentFeatures,
        aoHex: mainColorHex,
        quanHex: trouserColorHex,
        hair: hairDesc,
        hasReferenceImage: Boolean(referenceImageDataUrl),
      });

      const rawSheetUrl = await callGeminiImageApi({
        prompt,
        aspectRatio: '16:9',
        referenceImageDataUrl,
      });

      const processed = await processTurnaroundSheetTo4Frames(
        modelId,
        rawSheetUrl
      );
      return {
        id: candidateNumber,
        rawSheetUrl,
        data: processed,
      };
    } else {
      // "Từng góc (nét hơn)": front first, then each other view as an edit of the front image
      setStatusMessage(
        `Ứng viên #${candidateNumber}: Đang tạo góc Chính diện (1/4)...`
      );
      const frontPrompt = buildFrontSinglePromptTemplate({
        gender,
        look: lookMode,
        costumeName,
        garmentFeatures,
        aoHex: mainColorHex,
        quanHex: trouserColorHex,
        hair: hairDesc,
        hasReferenceImage: Boolean(referenceImageDataUrl),
      });

      const rawFront = await callGeminiImageApi({
        prompt: frontPrompt,
        aspectRatio: '3:4',
        referenceImageDataUrl,
      });

      setStatusMessage(
        `Ứng viên #${candidateNumber}: Đang xoay góc Nghiêng trái, Phía sau, Nghiêng phải từ ảnh Chính diện (2-4/4)...`
      );

      const [rawLeft, rawBack, rawRight] = await Promise.all([
        callGeminiImageApi({
          prompt: buildRotatedAngleEditPrompt('left side profile'),
          aspectRatio: '3:4',
          referenceImageDataUrl: rawFront,
        }),
        callGeminiImageApi({
          prompt: buildRotatedAngleEditPrompt('back view'),
          aspectRatio: '3:4',
          referenceImageDataUrl: rawFront,
        }),
        callGeminiImageApi({
          prompt: buildRotatedAngleEditPrompt('right side profile'),
          aspectRatio: '3:4',
          referenceImageDataUrl: rawFront,
        }),
      ]);

      const [f0, f1, f2, f3] = await Promise.all([
        normalizeSingleAngleFrameTo768x1152(rawFront),
        normalizeSingleAngleFrameTo768x1152(rawLeft),
        normalizeSingleAngleFrameTo768x1152(rawBack),
        normalizeSingleAngleFrameTo768x1152(rawRight),
      ]);

      const frontImg = await loadImageElement(f0);
      const calCanvas = document.createElement('canvas');
      calCanvas.width = 192;
      calCanvas.height = 288;
      const calCtx = calCanvas.getContext('2d')!;
      calCtx.drawImage(frontImg, 0, 0, 192, 288);
      const calibratedBaseHue = calibrateBaseHueFromTop5Percent(
        calCtx.getImageData(0, 0, 192, 288)
      );
      const posterDataUrl = await createPosterJpgFromFrontFrame(f0);

      const data: StoredTurntableData = {
        modelId,
        frames: [f0, f1, f2, f3],
        posterDataUrl,
        calibratedBaseHue,
        updatedAt: Date.now(),
      };

      return {
        id: candidateNumber,
        data,
      };
    }
  };

  const handleLoadBuiltinTurntable = async () => {
    setIsGenerating(true);
    setApiError(null);
    try {
      const resolved = await resolveTurntableFrames(topGarment.id, gender);
      if (resolved) {
        const cand: CandidateTurntable = {
          id: 1,
          rawSheetUrl: resolved.frames[0],
          data: resolved,
        };
        setCandidates([cand]);
        setSelectedCandidateIdx(0);
        await saveTurntableToIndexedDb(resolved);
        onAppliedTurntable(resolved);
        setStatusMessage('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateTwoCandidates = async () => {
    if (!garmentFeatures.trim()) return;
    setIsGenerating(true);
    setApiError(null);

    try {
      const cand1 = await generateSingleCandidate(1);
      let cand2: CandidateTurntable | null = null;
      try {
        cand2 = await generateSingleCandidate(2);
      } catch (err2) {
        console.warn('[V-Stylist] Second candidate generation warning:', err2);
      }

      const nextList = cand2 ? [cand1, cand2] : [cand1];
      setCandidates(nextList);
      setSelectedCandidateIdx(0);
      await saveTurntableToIndexedDb(cand1.data);
      onAppliedTurntable(cand1.data);
      setStatusMessage('');
    } catch (err) {
      const errMsg = String(
        (err as { text?: string })?.text ||
        (err as { message?: string })?.message ||
        err ||
        ''
      );
      const isQuotaZero =
        errMsg.includes('429') ||
        errMsg.includes('quota') ||
        errMsg.includes('limit: 0') ||
        errMsg.includes('FREE_TIER');

      if (isQuotaZero) {
        try {
          const resolved = await resolveTurntableFrames(topGarment.id, gender);
          if (resolved) {
            const cand: CandidateTurntable = {
              id: 1,
              rawSheetUrl: resolved.frames[0],
              data: resolved,
            };
            setCandidates([cand]);
            setSelectedCandidateIdx(0);
            await saveTurntableToIndexedDb(resolved);
            onAppliedTurntable(resolved);
            setStatusMessage('Đã tự động nạp bộ 360° Studio chuẩn nét cao.');
            setApiError({
              finishReason: 'FREE_TIER_QUOTA_ZERO',
              promptFeedback: null,
              model: (err as { model?: string })?.model || IMAGE_MODEL,
              text: 'Khóa API của bạn thuộc gói Google AI Studio Miễn phí (Free Tier) - Google quy định hạn mức sinh ảnh mới (gemini-3.1-flash-image) là limit: 0 (chỉ mở cho tài khoản có gắn thẻ thanh toán Pay-as-you-go). Hệ thống đã tự động chuyển sang bộ khung hình 360° Studio chuẩn nét cao bên phải để bạn trải nghiệm và tải ZIP ngay lập tức!',
            });
            return;
          }
        } catch {
          // ignore
        }
      }

      setApiError(
        err && typeof err === 'object'
          ? (err as GeminiImageApiErrorInfo)
          : { error: String(err) }
      );
      setStatusMessage('');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateSingleFrame = async (frameIndex: 0 | 1 | 2 | 3) => {
    const activeCand = candidates[selectedCandidateIdx];
    if (!activeCand || !garmentFeatures.trim()) return;

    setRegeneratingFrameIdx(frameIndex);
    setApiError(null);

    try {
      let rawNewAngle: string;
      if (frameIndex === 0) {
        const frontPrompt = buildFrontSinglePromptTemplate({
          gender,
          look: lookMode,
          costumeName,
          garmentFeatures,
          aoHex: mainColorHex,
          quanHex: trouserColorHex,
          hair: hairDesc,
          hasReferenceImage: Boolean(referenceImageDataUrl),
        });
        rawNewAngle = await callGeminiImageApi({
          prompt: frontPrompt,
          aspectRatio: '3:4',
          referenceImageDataUrl,
        });
      } else {
        const angleMap: Record<
          1 | 2 | 3,
          'left side profile' | 'back view' | 'right side profile'
        > = {
          1: 'left side profile',
          2: 'back view',
          3: 'right side profile',
        };
        rawNewAngle = await callGeminiImageApi({
          prompt: buildRotatedAngleEditPrompt(angleMap[frameIndex]),
          aspectRatio: '3:4',
          referenceImageDataUrl: activeCand.data.frames[0],
        });
      }

      const normalizedFrame =
        await normalizeSingleAngleFrameTo768x1152(rawNewAngle);
      const nextFrames: [string, string, string, string] = [
        ...activeCand.data.frames,
      ] as [string, string, string, string];
      nextFrames[frameIndex] = normalizedFrame;

      const nextPoster =
        frameIndex === 0
          ? await createPosterJpgFromFrontFrame(normalizedFrame)
          : activeCand.data.posterDataUrl;

      const updatedData: StoredTurntableData = {
        ...activeCand.data,
        frames: nextFrames,
        posterDataUrl: nextPoster,
        updatedAt: Date.now(),
      };

      const nextCandidates = [...candidates];
      nextCandidates[selectedCandidateIdx] = {
        ...activeCand,
        data: updatedData,
      };
      setCandidates(nextCandidates);
      await saveTurntableToIndexedDb(updatedData);
      onAppliedTurntable(updatedData);
    } catch (err) {
      setApiError(
        err && typeof err === 'object'
          ? (err as GeminiImageApiErrorInfo)
          : { error: String(err) }
      );
    } finally {
      setRegeneratingFrameIdx(null);
    }
  };

  const handleSelectCandidate = async (idx: number) => {
    setSelectedCandidateIdx(idx);
    const chosen = candidates[idx];
    if (chosen) {
      await saveTurntableToIndexedDb(chosen.data);
      onAppliedTurntable(chosen.data);
    }
  };

  const handleExportZip = async () => {
    const activeCand = candidates[selectedCandidateIdx];
    if (!activeCand) return;
    setIsExportingZip(true);
    try {
      await exportTurntableAndMeshyZip(modelId, activeCand.data.frames);
    } finally {
      setIsExportingZip(false);
    }
  };

  const activeCandidate = candidates[selectedCandidateIdx] || null;
  const isMissingFeatures = !garmentFeatures.trim();

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#FBF9F5] border-2 border-[#1C1917] w-full max-w-5xl max-h-[92vh] flex flex-col shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#1C1917] text-[#FBF9F5] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-[#FDE68A]" />
            <div>
              <h2 className="text-sm sm:text-base font-editorial font-bold">
                Studio Tạo Ảnh 360° Bằng AI ({modelId})
              </h2>
              <p className="text-[11px] text-[#D6CEBE] font-mono-tabular">
                IMAGE_MODEL: {IMAGE_MODEL} · Chroma-key #FF00FF · Chuẩn hóa 768×1152 px · Xuất Meshy Multi-View
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#D6CEBE] hover:text-white cursor-pointer"
            title="Đóng Studio"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Costume Parameters & Mode Controls */}
          <div className="lg:col-span-5 space-y-3.5">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#57534E] mb-1">
                  Tên cổ phục
                </label>
                <input
                  type="text"
                  value={costumeName}
                  onChange={(e) => setCostumeName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#F5F1E8] border border-[#DFD8C8] text-[#1C1917] font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#57534E] mb-1">
                  Triều đại / Niên đại
                </label>
                <input
                  type="text"
                  value={era}
                  onChange={(e) => setEra(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#F5F1E8] border border-[#DFD8C8] text-[#1C1917]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#57534E]">
                  Đặc điểm phom dáng & cắt may (Bắt buộc)
                </label>
                {isMissingFeatures && (
                  <span className="text-[10px] font-bold text-[#991B1B]">
                    * Vui lòng nhập đặc điểm trang phục
                  </span>
                )}
              </div>
              <textarea
                rows={3}
                value={garmentFeatures}
                onChange={(e) => setGarmentFeatures(e.target.value)}
                placeholder="Nhập chi tiết cấu trúc cổ áo, tà áo, tay áo, hàng khuy..."
                className={`w-full p-2.5 text-xs bg-[#F5F1E8] border text-[#1C1917] leading-relaxed ${
                  isMissingFeatures ? 'border-[#991B1B]' : 'border-[#DFD8C8]'
                }`}
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#57534E] mb-1">
                  Màu Áo (HEX)
                </label>
                <div className="flex items-center gap-1.5 bg-[#F5F1E8] border border-[#DFD8C8] px-2 py-1">
                  <input
                    type="color"
                    value={mainColorHex}
                    onChange={(e) => setMainColorHex(e.target.value)}
                    className="w-5 h-5 cursor-pointer border-0 bg-transparent"
                  />
                  <span className="text-xs font-mono-tabular">{mainColorHex}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#57534E] mb-1">
                  Màu Quần (HEX)
                </label>
                <div className="flex items-center gap-1.5 bg-[#F5F1E8] border border-[#DFD8C8] px-2 py-1">
                  <input
                    type="color"
                    value={trouserColorHex}
                    onChange={(e) => setTrouserColorHex(e.target.value)}
                    className="w-5 h-5 cursor-pointer border-0 bg-transparent"
                  />
                  <span className="text-xs font-mono-tabular">
                    {trouserColorHex}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#57534E] mb-1">
                  Kiểu Tóc (Đầu Trần)
                </label>
                <input
                  type="text"
                  value={hairDesc}
                  onChange={(e) => setHairDesc(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs bg-[#F5F1E8] border border-[#DFD8C8] text-[#1C1917]"
                />
              </div>
            </div>

            {/* Look & Mode Switchers */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#57534E] mb-1">
                  Phong cách (Look)
                </label>
                <div className="grid grid-cols-2 bg-[#EBE6DF] p-0.5 border border-[#DFD8C8] text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setLookMode('nguoi-that')}
                    className={`py-1.5 cursor-pointer transition-colors ${
                      lookMode === 'nguoi-that'
                        ? 'bg-[#1C1917] text-[#FDE68A]'
                        : 'text-[#57534E]'
                    }`}
                  >
                    Người thật
                  </button>
                  <button
                    type="button"
                    onClick={() => setLookMode('ban-thuc')}
                    className={`py-1.5 cursor-pointer transition-colors ${
                      lookMode === 'ban-thuc'
                        ? 'bg-[#1C1917] text-[#FDE68A]'
                        : 'text-[#57534E]'
                    }`}
                  >
                    Bán thực
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#57534E] mb-1">
                  Chế độ sinh góc
                </label>
                <div className="grid grid-cols-2 bg-[#EBE6DF] p-0.5 border border-[#DFD8C8] text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setGenMode('sheet-4')}
                    className={`py-1.5 cursor-pointer transition-colors ${
                      genMode === 'sheet-4'
                        ? 'bg-[#9A3412] text-[#FBF9F5]'
                        : 'text-[#57534E]'
                    }`}
                  >
                    Sheet 4 góc
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenMode('per-angle')}
                    className={`py-1.5 cursor-pointer transition-colors ${
                      genMode === 'per-angle'
                        ? 'bg-[#9A3412] text-[#FBF9F5]'
                        : 'text-[#57534E]'
                    }`}
                  >
                    Từng góc (nét hơn)
                  </button>
                </div>
              </div>
            </div>

            {/* Optional Reference Image */}
            <div className="p-2.5 bg-[#F5F1E8] border border-[#DFD8C8] flex items-center justify-between gap-2">
              <input
                ref={refInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () =>
                    setReferenceImageDataUrl(String(reader.result || ''));
                  reader.readAsDataURL(file);
                }}
                className="hidden"
              />
              <div className="flex items-center gap-2 min-w-0">
                <ImageIcon className="w-4 h-4 text-[#9A3412] shrink-0" />
                <span className="text-xs text-[#57534E] truncate">
                  {referenceImageDataUrl
                    ? 'Đã đính kèm ảnh tham chiếu (Reference)'
                    : 'Ảnh tham chiếu tùy chọn (Reference)'}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => refInputRef.current?.click()}
                  className="px-2 py-1 text-[11px] font-semibold bg-[#FBF9F5] border border-[#DFD8C8] hover:border-[#1C1917] cursor-pointer"
                >
                  Chọn ảnh
                </button>
                {referenceImageDataUrl && (
                  <button
                    type="button"
                    onClick={() => setReferenceImageDataUrl(null)}
                    className="px-2 py-1 text-[11px] text-[#991B1B] hover:underline cursor-pointer"
                  >
                    Xóa
                  </button>
                )}
              </div>
            </div>

            {/* Generate 2 Candidates Button */}
            <button
              type="button"
              onClick={handleGenerateTwoCandidates}
              disabled={isGenerating || isMissingFeatures}
              className="w-full py-2.5 px-4 bg-[#9A3412] hover:bg-[#7C2D12] text-[#FBF9F5] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{statusMessage || 'Đang tạo 2 ứng viên 360°...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Tạo 2 Ứng Viên 360° ({genMode === 'sheet-4' ? 'Sheet 4 Góc 16:9' : 'Từng Góc Nét Hơn'})</span>
                </>
              )}
            </button>

            {/* Quick 1-Click Load Built-in Studio 360° Frames (Free, Instant, No Quota Required) */}
            <button
              type="button"
              onClick={handleLoadBuiltinTurntable}
              disabled={isGenerating}
              className="w-full py-2 px-3 bg-[#F5F1E8] hover:bg-[#EBE6DF] text-[#14532D] border border-[#14532D]/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Nạp ngay bộ khung hình 360° chất lượng cao chuẩn studio của trang phục này (không tốn quota Google AI)"
            >
              <Check className="w-3.5 h-3.5 text-[#14532D]" />
              <span>Nạp Bộ 360° Studio Có Sẵn (Không Cần Quota)</span>
            </button>

            {/* Error Card with finishReason, promptFeedback, text and Retry */}
            {apiError && (
              <div
                className={`p-3.5 border-2 space-y-2 text-xs ${
                  apiError.finishReason === 'FREE_TIER_QUOTA_ZERO' ||
                  String(apiError.text).includes('429') ||
                  String(apiError.text).includes('quota') ||
                  String(apiError.text).includes('limit: 0')
                    ? 'bg-[#FFFBEB] border-[#D97706] text-[#92400E]'
                    : 'bg-[#FEF2F2] border-[#991B1B] text-[#7F1D1D]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle
                      className={`w-4 h-4 ${
                        apiError.finishReason === 'FREE_TIER_QUOTA_ZERO' ||
                        String(apiError.text).includes('429') ||
                        String(apiError.text).includes('quota') ||
                        String(apiError.text).includes('limit: 0')
                          ? 'text-[#D97706]'
                          : 'text-[#991B1B]'
                      }`}
                    />
                    <span>
                      {apiError.finishReason === 'FREE_TIER_QUOTA_ZERO' ||
                      String(apiError.text).includes('429') ||
                      String(apiError.text).includes('quota') ||
                      String(apiError.text).includes('limit: 0')
                        ? 'Google Free Tier (Quota sinh ảnh = 0)'
                        : `Không nhận được ảnh từ ${apiError.model || IMAGE_MODEL}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleLoadBuiltinTurntable}
                    className="px-2.5 py-1 bg-[#14532D] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    <span>Nạp Bộ 360° Chuẩn</span>
                  </button>
                </div>

                <div className="text-[11px] leading-relaxed">
                  {apiError.finishReason === 'FREE_TIER_QUOTA_ZERO' ||
                  String(apiError.text).includes('429') ||
                  String(apiError.text).includes('quota') ||
                  String(apiError.text).includes('limit: 0') ? (
                    <div className="space-y-2 bg-white/80 p-3 border border-[#FDE68A] text-[#78350F]">
                      <p>
                        Khóa API của bạn thuộc gói <strong>Google AI Studio Miễn Phí (Free Tier)</strong>. Google đặt hạn mức sinh ảnh mới (<code>gemini-3.1-flash-image</code>) trên gói miễn phí là <strong>limit: 0</strong> (chỉ miễn phí cho văn bản, chấm điểm văn hóa và thị giác Vision).
                      </p>
                      <div className="pt-1.5 border-t border-[#FDE68A]/60 space-y-1 text-[11px]">
                        <p className="font-bold text-[#1C1917]">💡 Các cách bạn có thể tiếp tục sử dụng ngay:</p>
                        <ul className="list-disc pl-4 space-y-1">
                          <li>
                            <strong className="text-[#14532D]">Cách 1 (Khuyên dùng - 100% Miễn phí):</strong> Sử dụng <strong>Bộ 360° Studio Chuẩn Nét Cao</strong> có sẵn bên phải. Bạn vẫn có thể đổi màu áo, màu quần và tải file ZIP 4 góc cho Meshy 3D mà không tốn chi phí.
                          </li>
                          <li>
                            <strong>Cách 2:</strong> Nhấn <strong>"Tải ảnh mẫu lên"</strong> ở trên nếu bạn có sẵn ảnh Cổ phục hoặc ảnh người mẫu từ máy tính.
                          </li>
                          <li>
                            <strong>Cách 3 (Nếu muốn tạo ảnh mới bằng AI Google):</strong> Truy cập{' '}
                            <a
                              href="https://aistudio.google.com"
                              target="_blank"
                              rel="noreferrer"
                              className="underline font-bold text-[#9A3412] hover:text-[#C2410C]"
                            >
                              aistudio.google.com
                            </a>{' '}
                            → Kích hoạt gói <strong>Pay-as-you-go</strong> (thêm thẻ thanh toán) để mở hạn mức sinh ảnh trực tiếp.
                          </li>
                        </ul>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <button
                          type="button"
                          onClick={handleLoadBuiltinTurntable}
                          className="px-3 py-1.5 bg-[#14532D] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm hover:bg-[#166534]"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Áp dụng Bộ 360° Studio Có Sẵn</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setApiError(null)}
                          className="text-[11px] text-[#78350F] hover:text-[#1C1917] underline cursor-pointer"
                        >
                          Đóng thông báo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="font-mono-tabular text-[11px] space-y-1 bg-white/80 p-2 border border-[#FECACA]">
                      <div>
                        <strong>finishReason:</strong>{' '}
                        {String(apiError.finishReason || 'N/A')}
                      </div>
                      <div>
                        <strong>promptFeedback:</strong>{' '}
                        {JSON.stringify(apiError.promptFeedback || null)}
                      </div>
                      {apiError.text && (
                        <div>
                          <strong>text:</strong> {apiError.text}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: 2 Candidates Grid, 4 Frames Preview & Single-Frame Regeneration, and ZIP Export */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Candidate Picker Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DFD8C8] pb-2.5">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#9A3412]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#1C1917]">
                  Danh sách ứng viên ({candidates.length}/2)
                </span>
                {candidates.map((cand, idx) => (
                  <button
                    key={cand.id}
                    type="button"
                    onClick={() => handleSelectCandidate(idx)}
                    className={`px-3 py-1 text-xs font-semibold border cursor-pointer flex items-center gap-1 ${
                      selectedCandidateIdx === idx
                        ? 'bg-[#1C1917] text-[#FDE68A] border-[#1C1917]'
                        : 'bg-[#F5F1E8] text-[#57534E] border-[#DFD8C8]'
                    }`}
                  >
                    {selectedCandidateIdx === idx && <Check className="w-3 h-3" />}
                    <span>Ứng viên #{idx + 1}</span>
                  </button>
                ))}
              </div>

              {activeCandidate && (
                <button
                  type="button"
                  onClick={handleExportZip}
                  disabled={isExportingZip}
                  className="px-3 py-1.5 bg-[#14532D] hover:bg-[#166534] text-[#FBF9F5] text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {isExportingZip
                      ? 'Đang đóng gói ZIP...'
                      : 'Tải ZIP (/turntable + /meshy)'}
                  </span>
                </button>
              )}
            </div>

            {activeCandidate ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {ANGLE_LABELS.map((angle) => {
                  const rawFrameUrl = activeCandidate.data.frames[angle.index];
                  const cachedCanvas = getCachedRecoloredCanvas(rawFrameUrl);
                  const frameUrl = cachedCanvas
                    ? cachedCanvas.toDataURL('image/png')
                    : rawFrameUrl;
                  const isRegenThis = regeneratingFrameIdx === angle.index;
                  return (
                    <div
                      key={angle.index}
                      className="bg-[#F5F1E8] border border-[#DFD8C8] p-2 flex flex-col gap-2"
                    >
                      <div className="aspect-2/3 bg-[#F2EDE4] border border-[#DFD8C8] relative overflow-hidden flex items-center justify-center">
                        <img
                          src={frameUrl}
                          alt={angle.label}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain"
                        />
                        {isRegenThis && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-[11px] font-semibold">
                            Đang tạo lại...
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-semibold text-[#1C1917] truncate">
                          {angle.label}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleRegenerateSingleFrame(
                            angle.index as 0 | 1 | 2 | 3
                          )
                        }
                        disabled={isGenerating || regeneratingFrameIdx !== null}
                        className="w-full py-1 px-2 bg-[#FBF9F5] hover:bg-[#1C1917] hover:text-[#FBF9F5] border border-[#DFD8C8] text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-40"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Tạo lại góc này</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 min-h-[260px] bg-[#F5F1E8] border border-dashed border-[#DFD8C8] flex flex-col items-center justify-center p-6 text-center text-xs text-[#686259]">
                <Sparkles className="w-8 h-8 text-[#9A3412] mb-2" />
                <p className="font-semibold text-[#1C1917]">
                  Chưa có khung hình 360° cho bộ {costumeName} (
                  {gender === 'male' ? 'Nam' : 'Nữ'})
                </p>
                <p className="mt-1 max-w-md">
                  Nhấn nút <strong>Tạo 2 Ứng Viên 360°</strong> ở cột trái để gọi{' '}
                  <code>{IMAGE_MODEL}</code> tách nền #FF00FF và căn chuẩn 4 góc nhìn
                  trên khung 768×1152 px.
                </p>
              </div>
            )}

            <div className="p-3 bg-[#F5F1E8] border border-[#DFD8C8] text-[11px] text-[#57534E] space-y-1">
              <div className="font-bold text-[#1C1917]">
                Quy chuẩn xử lý tự động (768×1152 PNG trong suốt & Gói Meshy 3D):
              </div>
              <p>
                • Tách 4 góc nhìn theo mật độ cột pixel không phải #FF00FF (fallback chia 4 phần bằng nhau), khử viền hồng cánh sen mà không chạm vào màu da, quần lụa trắng hoặc áo xanh cổ vịt.
              </p>
              <p>
                • Gói <strong>Tải ZIP</strong> bao gồm{' '}
                <code>/turntable/{modelId}/frame_00..03.png</code>,{' '}
                <code>poster.jpg</code>, <code>config.json</code> và{' '}
                <code>/meshy/{modelId}/front.png, left.png, back.png, right.png</code>{' '}
                (nền xám trung tính #D9D9D9 sẵn sàng đưa vào công cụ Image-to-3D).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
