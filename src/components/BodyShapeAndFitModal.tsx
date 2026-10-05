import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Sparkles,
  Upload,
  User,
  Check,
  Download,
  Sliders,
  RefreshCw,
  Eye,
  ShieldCheck,
  Camera,
  Shirt,
  ArrowRight,
  Maximize2,
  Info,
  Trash2,
} from 'lucide-react';
import {
  TopGarmentOption,
  BottomGarmentOption,
  PatternId,
  TOP_GARMENTS,
  BOTTOM_GARMENTS,
  TRADITIONAL_COLORS,
  TRADITIONAL_PATTERNS,
} from '../data/vietPhucData';
import {
  resolveTurntableFrames,
  renderRecoloredTurntableFrame,
  loadImageElement,
} from '../utils/vstylistStorageAndZip';

export interface BodyShapeAnalysisResult {
  bodyShapeId: string;
  bodyShapeName: string;
  proportionsSummary: string;
  faceShape?: string;
  skinUndertone?: string;
  stylingRationale: string;
  recommendedPreset: {
    topId: string;
    topName: string;
    bottomName: string;
    colorId: string;
    colorHex: string;
    colorName: string;
    patternId: string;
    patternName: string;
    accessories: string[];
  };
  faceLandmarks: {
    faceBox: { x: number; y: number; width: number; height: number };
    neckX: number;
    neckY: number;
    chinY: number;
    shoulderWidth: number;
    headTiltDeg: number;
  };
  fittingGuidance: string;
}

export interface BodyShapeAndFitModalProps {
  isOpen: boolean;
  onClose: () => void;
  gender: 'male' | 'female';
  topGarment: TopGarmentOption;
  bottomGarment: BottomGarmentOption;
  aoHex: string;
  quanHex: string;
  patternId: PatternId;
  accessories?: string[];
  onApplyRecommendedPreset: (preset: {
    topId: string;
    bottomName: string;
    colorId: string;
    patternId: PatternId;
    accessories: string[];
  }) => void;
}

const BODY_SHAPES_INFO = [
  {
    id: 'hourglass',
    name: 'Vai và hông cân bằng',
    desc: 'Tỷ lệ vai và hông gần tương đương',
    icon: '⏳',
    suitedCostume: 'Áo Nhật Bình / Ngũ Thân tay chẽn',
  },
  {
    id: 'pear',
    name: 'Hạ thân rõ nét',
    desc: 'Hông có tỷ lệ rộng hơn phần vai',
    icon: '🍐',
    suitedCostume: 'Áo Tấc / Ngũ Thân tà chữ A',
  },
  {
    id: 'inverted_triangle',
    name: 'Vai rõ nét',
    desc: 'Vai có tỷ lệ rộng hơn phần hông',
    icon: '🔻',
    suitedCostume: 'Áo Ngũ Thân Nam / Áo Giao Lĩnh cổ chéo',
  },
  {
    id: 'rectangle',
    name: 'Tỷ lệ thẳng',
    desc: 'Vai, eo và hông có tỷ lệ tương đối thẳng',
    icon: '📏',
    suitedCostume: 'Áo Tấc nhiều tầng lớp / Thường xếp ly',
  },
  {
    id: 'apple',
    name: 'Thân giữa rõ nét',
    desc: 'Phần thân giữa là điểm nhấn trong phom tổng thể',
    icon: '🍎',
    suitedCostume: 'Áo Ngũ Thân phom suông, tà rủ',
  },
];

export const BodyShapeAndFitModal: React.FC<BodyShapeAndFitModalProps> = ({
  isOpen,
  onClose,
  gender,
  topGarment,
  bottomGarment,
  aoHex,
  quanHex,
  patternId,
  accessories = [],
  onApplyRecommendedPreset,
}) => {
  const [activeTab, setActiveTab] = useState<'analysis' | 'fitting'>('analysis');
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] =
    useState<BodyShapeAnalysisResult | null>(null);
  const [selectedSilhouette, setSelectedSilhouette] = useState<string>('hourglass');
  const [analysisEngine, setAnalysisEngine] = useState<string>('');
  const [photoError, setPhotoError] = useState<string>('');

  // Fine-tuning adjustments for face grafting
  const [faceOffsetX, setFaceOffsetX] = useState<number>(0);
  const [faceOffsetY, setFaceOffsetY] = useState<number>(0);
  const [faceScale, setFaceScale] = useState<number>(1.0);
  const [faceRotationDeg, setFaceRotationDeg] = useState<number>(0);
  const [featherRadius, setFeatherRadius] = useState<number>(24);
  const [faceBrightness, setFaceBrightness] = useState<number>(100);
  const [splitSliderPos, setSplitSliderPos] = useState<number>(50);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [isGeneratingFittedImage, setIsGeneratingFittedImage] = useState<boolean>(false);
  const [fittedDataUrl, setFittedDataUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingFaceRef = useRef<boolean>(false);
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError('');
    if (file.size > 15 * 1024 * 1024) {
      setPhotoError('Ảnh tối đa 15 MB.');
      e.target.value = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      setPhotoError('Hãy chọn tệp ảnh PNG, JPG hoặc WebP.');
      e.target.value = '';
      return;
    }

    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Không thể đọc ảnh trong trình duyệt.');
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const compressed = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('Không thể tối ưu ảnh.')),
          'image/jpeg',
          0.84
        )
      );
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Không thể đọc ảnh.'));
        reader.readAsDataURL(compressed);
      });
      setUserPhotoUrl(dataUrl);
      runVisionAnalysis(dataUrl);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Không thể xử lý ảnh này.');
      e.target.value = '';
    }
  };

  const runVisionAnalysis = async (photoDataUrl: string) => {
    setIsAnalyzing(true);
    try {
      const [header, b64] = photoDataUrl.split(',');
      const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
      const resp = await fetch('/api/analyze-body-shape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPhotoBase64: b64,
          userPhotoMimeType: mime,
          gender,
        }),
      });
      const data = await resp.json();
      if (data.ok && data.analysis) {
        setAnalysisResult(data.analysis);
        setSelectedSilhouette(data.analysis.bodyShapeId);
        setAnalysisEngine(data.engine || 'Gemini 3.8 Flash Cultural Vision');
      } else {
        setAnalysisResult(null);
        setAnalysisEngine('');
        setPhotoError(data.error || 'Nhận dạng ảnh cần Gemini. Bạn vẫn có thể chọn phom thủ công.');
      }
    } catch (err) {
      console.warn('Vision analysis error', err);
      setAnalysisResult(null);
      setPhotoError('Không kết nối được Gemini. Hãy thử lại hoặc chọn phom thủ công.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeBodyShape = async (silhouetteId: string) => {
    setSelectedSilhouette(silhouetteId);
    setIsAnalyzing(true);
    try {
      const resp = await fetch('/api/analyze-body-shape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manualBodyShape: silhouetteId,
          gender,
        }),
      });
      const data = await resp.json();
      if (data.ok && data.analysis) {
        setAnalysisResult(data.analysis);
        setAnalysisEngine(data.engine || 'V-Stylist Rule Engine');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Render the Guaranteed Face & Identity-Preserving Outfit Composite
  const renderCompositedPortrait = useCallback(async () => {
    if (!userPhotoUrl) return;
    setIsGeneratingFittedImage(true);

    try {
      // 1. Resolve & render the exact custom garment base frame (front view)
      const resolved = await resolveTurntableFrames(topGarment.id, gender);
      if (!resolved || !resolved.frames || !resolved.frames[0]) {
        setIsGeneratingFittedImage(false);
        return;
      }

      const frontFrameSrc = resolved.frames[0];
      const recoloredGarmentUrl = await renderRecoloredTurntableFrame({
        modelId: `${topGarment.id}-${gender}`,
        frameIndex: 0,
        frameSrc: frontFrameSrc,
        calibratedBaseHue: resolved.calibratedBaseHue,
        aoHex,
        quanHex,
        bottomId: bottomGarment.id,
        accessories,
        enableTrouserKey: true,
        patternId,
        hoaTietHex: '#D4AF37',
        patternConfig: { scale: 1.2, rotationDeg: 0, strength: 0.55 },
      });

      // 2. Load both images: Custom Garment and User Photo
      const [garmentImg, userImg] = await Promise.all([
        loadImageElement(recoloredGarmentUrl),
        loadImageElement(userPhotoUrl),
      ]);

      const canvas = document.createElement('canvas');
      const w = 768;
      const h = 1024;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;

      // 3. Draw background (#F2EDE4 Studio Backdrop)
      ctx.fillStyle = '#F2EDE4';
      ctx.fillRect(0, 0, w, h);

      // Radial Studio key light
      const grad = ctx.createRadialGradient(w * 0.5, h * 0.38, 40, w * 0.5, h * 0.42, 540);
      grad.addColorStop(0, 'rgba(255, 250, 240, 0.7)');
      grad.addColorStop(1, 'rgba(242, 237, 228, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // 4. Draw the customized traditional garment body (front view centered)
      const garmentAspect = garmentImg.naturalWidth / garmentImg.naturalHeight;
      const gHeight = 940;
      const gWidth = gHeight * garmentAspect;
      const gX = (w - gWidth) / 2;
      const gY = 90;

      // Soft contact shadow
      ctx.save();
      ctx.fillStyle = 'rgba(28, 25, 23, 0.22)';
      ctx.beginPath();
      ctx.ellipse(w / 2, gY + gHeight - 20, 180, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.drawImage(garmentImg, gX, gY, gWidth, gHeight);

      // 5. Detect and Extract User's REAL Face with soft feathered mask
      const lm = analysisResult?.faceLandmarks || {
        faceBox: { x: 0.35, y: 0.1, width: 0.3, height: 0.3 },
        neckX: 0.5,
        neckY: 0.35,
        chinY: 0.3,
        shoulderWidth: 0.42,
        headTiltDeg: 0,
      };

      const userW = userImg.naturalWidth;
      const userH = userImg.naturalHeight;
      const fb = lm.faceBox;
      const srcFaceX = fb.x * userW;
      const srcFaceY = fb.y * userH;
      const srcFaceW = fb.width * userW;
      const srcFaceH = fb.height * userH;

      // Offscreen canvas for user's isolated face with feathering
      const faceCanvas = document.createElement('canvas');
      const fcW = Math.max(120, Math.round(srcFaceW * 1.3));
      const fcH = Math.max(140, Math.round(srcFaceH * 1.4));
      faceCanvas.width = fcW;
      faceCanvas.height = fcH;
      const fCtx = faceCanvas.getContext('2d')!;

      // Draw face cropped
      fCtx.drawImage(
        userImg,
        Math.max(0, srcFaceX - srcFaceW * 0.15),
        Math.max(0, srcFaceY - srcFaceH * 0.15),
        Math.min(userW, srcFaceW * 1.3),
        Math.min(userH, srcFaceH * 1.4),
        0,
        0,
        fcW,
        fcH
      );

      // Apply feathered oval alpha mask so the face blends seamlessly
      fCtx.save();
      fCtx.globalCompositeOperation = 'destination-in';
      const radGrad = fCtx.createRadialGradient(
        fcW / 2,
        fcH * 0.48,
        fcW * 0.28,
        fcW / 2,
        fcH * 0.48,
        fcW * 0.52
      );
      radGrad.addColorStop(0, 'rgba(0,0,0,1)');
      radGrad.addColorStop(0.75, 'rgba(0,0,0,1)');
      radGrad.addColorStop(1, 'rgba(0,0,0,0)');
      fCtx.fillStyle = radGrad;
      fCtx.fillRect(0, 0, fcW, fcH);
      fCtx.restore();

      // 6. Draw User Face onto Canvas at Collar Anchor position
      const targetCollarX = w * 0.5 + faceOffsetX;
      const targetCollarY = gY + 165 + faceOffsetY;
      const destFaceW = 168 * faceScale;
      const destFaceH = (destFaceW * (fcH / fcW));

      ctx.save();
      ctx.translate(targetCollarX, targetCollarY);
      ctx.rotate((faceRotationDeg * Math.PI) / 180);
      if (faceBrightness !== 100) {
        ctx.filter = `brightness(${faceBrightness}%)`;
      }
      ctx.drawImage(
        faceCanvas,
        -destFaceW / 2,
        -destFaceH * 0.88,
        destFaceW,
        destFaceH
      );
      ctx.restore();

      // 7. Subtle collar rim overdraw for realistic depth
      // (cổ áo ôm nhẹ quanh chân cổ)
      ctx.save();
      ctx.beginPath();
      ctx.arc(targetCollarX, targetCollarY + 14, 28, 0, Math.PI);
      ctx.lineWidth = 4;
      ctx.strokeStyle = aoHex;
      ctx.stroke();
      ctx.restore();

      // 8. Watermark badge "V-Stylist Authentic Heritage Fit"
      ctx.save();
      ctx.fillStyle = 'rgba(28, 25, 23, 0.65)';
      ctx.font = '600 12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('V-Stylist · Việt Phục Chân Thực 100% Chính Chủ', w - 24, h - 20);
      ctx.restore();

      const finalUrl = canvas.toDataURL('image/jpeg', 0.95);
      setFittedDataUrl(finalUrl);
    } catch (e) {
      console.error('Failed to composite portrait', e);
    } finally {
      setIsGeneratingFittedImage(false);
    }
  }, [
    userPhotoUrl,
    topGarment,
    gender,
    bottomGarment,
    aoHex,
    quanHex,
    patternId,
    accessories,
    faceOffsetX,
    faceOffsetY,
    faceScale,
    faceRotationDeg,
    faceBrightness,
    analysisResult,
  ]);

  // Re-render composition whenever parameters update in Fitting tab
  useEffect(() => {
    if (activeTab === 'fitting' && userPhotoUrl) {
      renderCompositedPortrait();
    }
  }, [activeTab, userPhotoUrl, renderCompositedPortrait]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-5">
      <div className="bg-[#FBF9F5] border-2 border-[#1C1917] max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-[#1C1917] text-[#FBF9F5] flex items-center justify-between border-b border-[#292524] shrink-0">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-[#FDE68A]" />
            <div>
              <h2 className="text-sm sm:text-base font-editorial font-bold text-[#FDE68A] uppercase tracking-wider">
                Thử Phom Cổ Phục
              </h2>
              <p className="text-[11px] text-[#D6CEBE]">
                Gợi ý phom áo theo ảnh hoặc theo mô tả bạn tự chọn
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 text-[#D6CEBE] hover:text-white transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F5F1E8]">
          {/* BODY SHAPE ANALYSIS & RECOMMENDATIONS */}
          {true && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Photo Upload or Silhouette Picker */}
              <div className="lg:col-span-5 space-y-4">
                {/* Upload User Photo */}
                <div className="bg-[#FBF9F5] border border-[#DFD8C8] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#1C1917] flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-[#9A3412]" />
                      Ảnh thử phom của bạn
                    </span>
                    {userPhotoUrl && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[11px] text-[#134E4A] hover:underline cursor-pointer"
                        >
                          Đổi ảnh
                        </button>
                        <span className="text-[#D5CBB4]">·</span>
                        <button
                          type="button"
                          onClick={() => {
                            setUserPhotoUrl(null);
                            setFittedDataUrl(null);
                            setAnalysisResult(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                            handleAnalyzeBodyShape(selectedSilhouette);
                          }}
                          className="text-[11px] text-[#9A2B1D] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                          title="Xóa ảnh khỏi bộ nhớ (quy chuẩn bảo mật N4)"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Xóa ảnh</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  {userPhotoUrl ? (
                    <div className="relative border border-[#DFD8C8] bg-black/5 aspect-3/4 max-h-[280px] overflow-hidden flex items-center justify-center">
                      <img
                        src={userPhotoUrl}
                        alt="Ảnh người dùng"
                        className="w-full h-full object-contain"
                      />
                      {isAnalyzing && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-[#FDE68A] p-4 text-center">
                          <RefreshCw className="w-6 h-6 animate-spin mb-2" />
                          <span className="text-xs font-semibold">
                            Gemini đang phân tích tỷ lệ vai, thân và dáng áo...
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-[#DFD8C8] hover:border-[#9A3412] bg-[#F5F1E8]/70 p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors text-center"
                    >
                      <Upload className="w-8 h-8 text-[#9A3412]" />
                      <span className="text-xs font-bold text-[#1C1917]">
                        Tải ảnh toàn thân hoặc nửa người lên
                      </span>
                      <span className="text-[11px] text-[#686259]">
                        JPG, PNG hoặc WebP · ảnh được thu nhỏ trước khi gửi Gemini
                      </span>
                    </div>
                  )}
                  {photoError && <p role="alert" className="text-[11px] text-[#9A3412]">{photoError}</p>}
                  <p className="text-[10px] leading-relaxed text-[#74695C]">
                    Ảnh chỉ dùng để phân tích trong phiên này; ứng dụng không thêm ảnh vào bộ sưu tập. Bạn có thể xóa ảnh bất cứ lúc nào.
                  </p>
                </div>

                {/* Manual Silhouette Selection */}
                <div className="bg-[#FBF9F5] border border-[#DFD8C8] p-4 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#1C1917] block">
                    Hoặc chọn tỷ lệ phom gần với bạn
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    {BODY_SHAPES_INFO.map((shape) => {
                      const active = selectedSilhouette === shape.id;
                      return (
                        <button
                          key={shape.id}
                          type="button"
                          onClick={() => handleAnalyzeBodyShape(shape.id)}
                          className={`p-2.5 text-left border transition-all flex items-start gap-2.5 cursor-pointer ${
                            active
                              ? 'bg-[#1C1917] text-[#FBF9F5] border-[#1C1917]'
                              : 'bg-[#FBF9F5] text-[#1C1917] border-[#DFD8C8] hover:border-[#1C1917]'
                          }`}
                        >
                          <span className="text-xl shrink-0">{shape.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold">{shape.name}</span>
                              {active && <Check className="w-3.5 h-3.5 text-[#FDE68A]" />}
                            </div>
                            <p
                              className={`text-[11px] truncate ${
                                active ? 'text-[#D6CEBE]' : 'text-[#686259]'
                              }`}
                            >
                              {shape.desc}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: AI Analysis & Flattering Costume Recommendation */}
              <div className="lg:col-span-7 space-y-4">
                {analysisResult ? (
                  <>
                    {/* Body Shape & Facial Feature Overview Card */}
                    <div className="bg-[#FBF9F5] border border-[#DFD8C8] p-4.5 space-y-3">
                      <div className="flex items-center justify-between border-b border-[#DFD8C8] pb-2">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-[#14532D]" />
                          <span className="text-xs font-bold uppercase tracking-wider text-[#1C1917]">
                            Gợi Ý Tỷ Lệ Phom
                          </span>
                        </div>
                        <span className="text-[11px] font-mono-tabular text-[#9A3412] bg-[#9A3412]/10 px-2 py-0.5">
                          {analysisEngine}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-[#686259]">
                            Tỷ lệ tham khảo
                          </span>
                          <h3 className="text-xl font-editorial font-bold text-[#9A3412]">
                            {analysisResult.bodyShapeName}
                          </h3>
                        </div>
                      </div>

                      <p className="text-xs text-[#44403C] leading-relaxed bg-[#F5F1E8] p-3 border-l-3 border-[#9A3412]">
                        {analysisResult.proportionsSummary}
                      </p>
                    </div>

                    {/* Styling Rationale (Why this costume flatters) */}
                    <div className="bg-[#FFFBEB] border border-[#FDE68A] p-4 space-y-2 text-[#78350F]">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#92400E]">
                        <Sparkles className="w-4 h-4" />
                        <span>Vì sao phom này có thể hợp</span>
                      </div>
                      <p className="text-xs sm:text-sm leading-relaxed">
                        {analysisResult.stylingRationale}
                      </p>
                    </div>

                    {/* Recommended Costume Preset Card */}
                    <div className="bg-[#FBF9F5] border border-[#DFD8C8] p-4.5 space-y-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#1C1917] block">
                        Gợi ý phối để bạn thử
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-[#F5F1E8] p-3 space-y-1">
                          <span className="text-[10px] text-[#686259] uppercase block">
                            Áo Cổ Phục Tôn Phom
                          </span>
                          <span className="font-bold text-[#1C1917] text-sm block">
                            {analysisResult.recommendedPreset.topName}
                          </span>
                          <span className="text-[11px] text-[#686259]">
                            Phối cùng: {analysisResult.recommendedPreset.bottomName}
                          </span>
                        </div>

                        <div className="bg-[#F5F1E8] p-3 space-y-1">
                          <span className="text-[10px] text-[#686259] uppercase block">
                            Màu Sắc & Hoa Văn Đề Xuất
                          </span>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-4 h-4 rounded-full border border-black/20 shrink-0"
                              style={{
                                backgroundColor:
                                  analysisResult.recommendedPreset.colorHex,
                              }}
                            />
                            <span className="font-bold text-[#1C1917]">
                              {analysisResult.recommendedPreset.colorName}
                            </span>
                          </div>
                          <span className="text-[11px] text-[#686259] block">
                            Họa tiết: {analysisResult.recommendedPreset.patternName}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-2 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            const rec = analysisResult.recommendedPreset;
                            onApplyRecommendedPreset({
                              topId: rec.topId,
                              bottomName: rec.bottomName,
                              colorId: rec.colorId,
                              patternId: rec.patternId as PatternId,
                              accessories: rec.accessories,
                            });
                            onClose();
                          }}
                          className="flex-1 py-2.5 px-4 bg-[#14532D] hover:bg-[#166534] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
                        >
                          <Check className="w-4 h-4" />
                          <span>Áp Dụng Bản Phối Này Vào Studio 3D</span>
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-64 flex items-center justify-center text-xs text-[#686259] bg-[#FBF9F5] border border-[#DFD8C8]">
                    <span>{isAnalyzing ? 'Đang phân tích tỷ lệ phom…' : 'Tải ảnh lên hoặc chọn một tỷ lệ phom để nhận gợi ý.'}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
