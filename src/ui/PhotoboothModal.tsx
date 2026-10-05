import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Upload,
  RefreshCw,
  Sliders,
  Download,
  Eye,
  Trash2,
  Check,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useOutfitState } from '../state/outfitStore';
import { culturalData } from '../data/culturalDataLoader';
import { getDesignSnapshot } from '../state/outfitStore';
import { SavedLook } from './CompareModal';
import { toCanonicalOutfit } from '../state/outfitStore';

export interface PhotoboothModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveLook: (look: SavedLook) => void;
  onOpenCompare: () => void;
}

export const PhotoboothModal: React.FC<PhotoboothModalProps> = ({
  isOpen,
  onClose,
  onSaveLook,
  onOpenCompare,
}) => {
  const { outfit } = useOutfitState();
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [mode, setMode] = useState<'uom_thu' | 'ai_tryon'>('uom_thu');

  // "Ướm thử" overlay transform controls (fallback, no AI, no network)
  const [overlayScale, setOverlayScale] = useState<number>(1.0);
  const [overlayRotation, setOverlayRotation] = useState<number>(0);
  const [overlayOpacity, setOverlayOpacity] = useState<number>(90);
  const [overlayOffsetX, setOverlayOffsetX] = useState<number>(0);
  const [overlayOffsetY, setOverlayOffsetY] = useState<number>(0);

  // Before/after comparison
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [sliderPos, setSliderPos] = useState<number>(50);

  // AI try-on state
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);
  const [aiResultUrl, setAiResultUrl] = useState<string | null>(null);
  const [aiErrorCard, setAiErrorCard] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const costume = culturalData.costumes[outfit.costumeId];
  const designSnapshot = getDesignSnapshot();

  useEffect(() => {
    // Stop camera stream when modal closes
    if (!isOpen && cameraActive) {
      stopCamera();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch {
      setCameraError('Không thể truy cập máy ảnh. Vui lòng cấp quyền hoặc tải ảnh từ thiết bị.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const captureCamera = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 720;
    canvas.height = videoRef.current.videoHeight || 960;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setUserPhotoUrl(dataUrl);
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.name.toLowerCase().endsWith('.heic')) {
      alert('Định dạng HEIC không được hỗ trợ trực tiếp. Vui lòng chọn ảnh định dạng JPG hoặc PNG.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setUserPhotoUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const clearPhoto = () => {
    setUserPhotoUrl(null);
    setAiResultUrl(null);
    setAiErrorCard(null);
    setIsSaved(false);
  };

  const handleSaveCurrentLook = () => {
    onSaveLook({
      id: `look_${Date.now()}`,
      outfit: toCanonicalOutfit(outfit),
      imageUrl: aiResultUrl || designSnapshot || undefined,
      createdAt: Date.now(),
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleCallAiTryOn = async () => {
    if (!userPhotoUrl) return;
    setIsAiGenerating(true);
    setAiErrorCard(null);

    try {
      const [header, b64] = userPhotoUrl.split(',');
      const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';

      const resp = await fetch('/api/virtual-try-on', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPhotoBase64: b64,
          userPhotoMimeType: mime,
          designSnapshotBase64: designSnapshot ? designSnapshot.split(',')[1] : undefined,
          tryOnStyle: 'photorealistic',
          outfitSpec: {
            garmentName: costume?.name,
            garmentFeaturesEn: costume?.features.join(', '),
            colorMainEn: outfit.colors.ao,
            bottomNameEn: outfit.colors.quan,
            accessoriesEn: outfit.accessories.join(', '),
            genderEn: outfit.gender,
          },
        }),
      });

      const json = await resp.json();
      if (resp.ok && json.imageUrl) {
        setAiResultUrl(json.imageUrl);
      } else {
        setAiErrorCard(
          'Tính năng ghép ảnh AI tạm chưa dùng được. Ứng dụng đã tự động kích hoạt chế độ "Ướm thử" để bạn căn chỉnh trực quan!'
        );
        setMode('uom_thu');
      }
    } catch {
      setAiErrorCard(
        'Tính năng ghép ảnh AI tạm chưa dùng được. Ứng dụng đã tự động kích hoạt chế độ "Ướm thử" để bạn căn chỉnh trực quan!'
      );
      setMode('uom_thu');
    } finally {
      setIsAiGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-[#F2EDE4] border border-[#DFD8C8] rounded-[12px] max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-[#1E1B18]">
        {/* Header */}
        <div className="px-5 py-3 border-b border-[#DFD8C8] flex items-center justify-between bg-white/50">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#A33B1E]" />
            <h3 className="font-bold text-sm uppercase tracking-wider font-editorial">
              Photobooth · Thử Lên Ảnh Của Tôi
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-black/5 rounded cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Left Canvas Preview Area */}
          <div className="md:col-span-7 flex flex-col gap-2.5">
            <div className="relative aspect-3/4 max-h-[520px] rounded-[10px] overflow-hidden bg-black/10 border border-[#DFD8C8] flex items-center justify-center">
              {cameraActive ? (
                <div className="relative w-full h-full bg-black flex items-center justify-center">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={captureCamera}
                    className="absolute bottom-4 px-5 py-2.5 bg-[#A33B1E] text-white font-bold text-xs rounded-full shadow-lg cursor-pointer"
                  >
                    Chụp ngay
                  </button>
                </div>
              ) : userPhotoUrl ? (
                <div className="relative w-full h-full">
                  {/* Base User Photo */}
                  <img src={userPhotoUrl} alt="Ảnh người dùng" className="w-full h-full object-contain" />

                  {/* Ướm Thử Overlay (Front View Cutout) */}
                  {mode === 'uom_thu' && designSnapshot && (
                    <div
                      onPointerDown={(e) => {
                        isDraggingRef.current = true;
                        dragStartRef.current = { x: e.clientX, y: e.clientY };
                        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                      }}
                      onPointerMove={(e) => {
                        if (!isDraggingRef.current) return;
                        const dx = e.clientX - dragStartRef.current.x;
                        const dy = e.clientY - dragStartRef.current.y;
                        dragStartRef.current = { x: e.clientX, y: e.clientY };
                        setOverlayOffsetX((prev) => prev + dx);
                        setOverlayOffsetY((prev) => prev + dy);
                      }}
                      onPointerUp={(e) => {
                        isDraggingRef.current = false;
                        try {
                          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                        } catch {}
                      }}
                      className="absolute inset-0 flex items-center justify-center cursor-move"
                      style={{
                        transform: `translate(${overlayOffsetX}px, ${overlayOffsetY}px) scale(${overlayScale}) rotate(${overlayRotation}deg)`,
                        opacity: overlayOpacity / 100,
                      }}
                    >
                      <img
                        src={designSnapshot}
                        alt="Áo ướm thử"
                        className="w-full h-full object-contain pointer-events-none select-none drop-shadow-md"
                      />
                    </div>
                  )}

                  {/* AI Generated Result with comparison slider */}
                  {mode === 'ai_tryon' && aiResultUrl && (
                    isComparing ? (
                      <div className="absolute inset-0">
                        <div
                          className="absolute inset-0 overflow-hidden"
                          style={{ width: `${sliderPos}%` }}
                        >
                          <img
                            src={aiResultUrl}
                            alt="Sau khi ghép"
                            className="w-full h-full object-contain max-w-none"
                            style={{ width: '100%', height: '100%' }}
                          />
                        </div>
                        <div
                          className="absolute top-0 bottom-0 w-1 bg-[#A33B1E] cursor-ew-resize flex items-center justify-center"
                          style={{ left: `${sliderPos}%` }}
                        >
                          <div className="w-5 h-5 bg-[#A33B1E] text-white rounded-full flex items-center justify-center text-[10px]">
                            ↔
                          </div>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={sliderPos}
                          onChange={(e) => setSliderPos(Number(e.target.value))}
                          className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full"
                        />
                      </div>
                    ) : (
                      <img
                        src={aiResultUrl}
                        alt="Kết quả AI"
                        className="absolute inset-0 w-full h-full object-contain"
                      />
                    )
                  )}

                  {isAiGenerating && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white text-xs gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-[#FDE68A]" />
                      <span>Đang tạo ảnh ghép Cổ Phục chân thực...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-[#78716C] space-y-3">
                  <Camera className="w-10 h-10 mx-auto text-[#DFD8C8]" />
                  <p className="font-bold text-[#1E1B18]">Chưa có ảnh chân dung của bạn</p>
                  <p className="text-[11px]">
                    Chụp trực tiếp bằng camera hoặc tải ảnh từ máy tính để ướm thử trang phục.
                  </p>
                </div>
              )}
            </div>

            {/* In-Memory Consent Line & Clear Action (N4) */}
            <div className="p-2.5 bg-white/70 rounded-[8px] border border-[#DFD8C8] flex items-center justify-between gap-2 text-[11px] text-[#78716C]">
              <span>
                🔒 Ảnh chỉ dùng để tạo kết quả. Ứng dụng không lưu ảnh; ảnh được gửi tới Gemini để xử lý.
              </span>
              {userPhotoUrl && (
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="text-[#B3261E] font-bold hover:underline shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa ảnh</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Control & Adjustment Area */}
          <div className="md:col-span-5 space-y-3.5">
            {/* Input Actions (Camera / File) */}
            <div className="p-3 bg-white rounded-[10px] border border-[#DFD8C8] space-y-2">
              <span className="text-xs font-bold text-[#1E1B18] uppercase tracking-wider block">
                Nguồn ảnh người dùng
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={startCamera}
                  className="min-h-[44px] px-3 py-2 bg-white hover:bg-black/5 border border-[#DFD8C8] rounded-[8px] text-xs font-semibold text-[#1E1B18] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-[#A33B1E]" />
                  <span>Chụp ảnh</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[44px] px-3 py-2 bg-white hover:bg-black/5 border border-[#DFD8C8] rounded-[8px] text-xs font-semibold text-[#1E1B18] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-[#A33B1E]" />
                  <span>Tải ảnh lên</span>
                </button>
              </div>
              {cameraError && (
                <p className="text-[11px] text-[#B3261E] bg-[#B3261E]/10 p-2 rounded">
                  {cameraError}
                </p>
              )}
            </div>

            {/* Calm Error Card if AI unavailable */}
            {aiErrorCard && (
              <div className="p-3 bg-[#FFFBEB] border border-[#B7791F]/40 rounded-[8px] text-xs text-[#78350F] space-y-1">
                <strong className="block">Tính năng ghép ảnh AI tạm chưa dùng được</strong>
                <p className="text-[11px] leading-relaxed">{aiErrorCard}</p>
              </div>
            )}

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 bg-[#EBE6DF] p-0.5 rounded-[8px] border border-[#DFD8C8] text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMode('uom_thu')}
                className={`py-1.5 rounded-[6px] transition-colors cursor-pointer ${
                  mode === 'uom_thu' ? 'bg-[#1E1B18] text-[#F2EDE4]' : 'text-[#78716C]'
                }`}
              >
                Ướm thử (Offline 100%)
              </button>
              <button
                type="button"
                onClick={() => setMode('ai_tryon')}
                className={`py-1.5 rounded-[6px] transition-colors cursor-pointer ${
                  mode === 'ai_tryon' ? 'bg-[#1E1B18] text-[#F2EDE4]' : 'text-[#78716C]'
                }`}
              >
                Ghép AI (Gemini)
              </button>
            </div>

            {/* Controls for "Ướm thử" fallback */}
            {mode === 'uom_thu' && (
              <div className="p-3 bg-white rounded-[10px] border border-[#DFD8C8] space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#1E1B18] uppercase tracking-wider text-[11px]">
                    Căn Chỉnh Tà Áo Trực Quan
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setOverlayScale(1.0);
                      setOverlayRotation(0);
                      setOverlayOpacity(90);
                      setOverlayOffsetX(0);
                      setOverlayOffsetY(0);
                    }}
                    className="text-[10px] text-[#A33B1E] hover:underline cursor-pointer"
                  >
                    Đặt lại
                  </button>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#78716C]">Tỉ lệ (Scale):</span>
                      <span className="font-mono-tabular font-bold">
                        {Math.round(overlayScale * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.6}
                      max={1.5}
                      step={0.01}
                      value={overlayScale}
                      onChange={(e) => setOverlayScale(Number(e.target.value))}
                      className="w-full accent-[#A33B1E]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#78716C]">Góc xoay (Rotate):</span>
                      <span className="font-mono-tabular font-bold">{overlayRotation}°</span>
                    </div>
                    <input
                      type="range"
                      min={-30}
                      max={30}
                      step={1}
                      value={overlayRotation}
                      onChange={(e) => setOverlayRotation(Number(e.target.value))}
                      className="w-full accent-[#A33B1E]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#78716C]">Độ mờ tà áo:</span>
                      <span className="font-mono-tabular font-bold">{overlayOpacity}%</span>
                    </div>
                    <input
                      type="range"
                      min={40}
                      max={100}
                      step={1}
                      value={overlayOpacity}
                      onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                      className="w-full accent-[#A33B1E]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Controls for AI Try-On */}
            {mode === 'ai_tryon' && (
              <div className="p-3 bg-white rounded-[10px] border border-[#DFD8C8] space-y-2 text-xs">
                <button
                  type="button"
                  onClick={handleCallAiTryOn}
                  disabled={!userPhotoUrl || isAiGenerating}
                  className="w-full min-h-[44px] py-2 bg-[#A33B1E] hover:bg-[#8A3017] text-white font-bold rounded-[8px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-[#FDE68A]" />
                  <span>Tạo ảnh ghép với Gemini</span>
                </button>

                {aiResultUrl && (
                  <button
                    type="button"
                    onClick={() => setIsComparing(!isComparing)}
                    className="w-full min-h-[38px] py-1.5 border border-[#DFD8C8] bg-white hover:bg-black/5 text-[#1E1B18] font-bold rounded-[8px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-[#A33B1E]" />
                    <span>{isComparing ? 'Tắt so sánh' : 'Kéo thanh so sánh trước / sau'}</span>
                  </button>
                )}
              </div>
            )}

            {/* Session Actions: Lưu Look & So sánh */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveCurrentLook}
                className="flex-1 min-h-[44px] px-3 py-2 bg-[#1E1B18] hover:bg-[#292524] text-[#F2EDE4] font-bold text-xs rounded-[8px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4 text-[#FDE68A]" />
                <span>{isSaved ? 'Đã lưu look!' : 'Lưu look (tối đa 3)'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCompare();
                }}
                className="px-3 py-2 min-h-[44px] border border-[#DFD8C8] bg-white hover:bg-black/5 text-[#1E1B18] font-bold text-xs rounded-[8px] flex items-center gap-1 cursor-pointer"
              >
                <span>So sánh</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
