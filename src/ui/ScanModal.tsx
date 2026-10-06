import React, { useState, useRef } from 'react';
import { X, Camera, Upload, RefreshCw, Check } from 'lucide-react';
import { scanCostumeFromPhoto, ScanResult } from '../ai/geminiClient';
import { useOutfitState } from '../state/outfitStore';
import { culturalData } from '../data/culturalDataLoader';

export interface ScanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScanModal: React.FC<ScanModalProps> = ({ isOpen, onClose }) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { setCostumeId, setPrimaryColorHex, toggleAccessory } = useOutfitState();

  if (!isOpen) return null;

  const matchLabel = !scanResult?.garmentId
    ? 'Chưa đủ dấu hiệu'
    : scanResult.confidence >= 0.72
      ? 'Khá giống'
      : scanResult.confidence >= 0.4
        ? 'Có thể giống'
        : 'Cần xem lại';
  const matchedSources = scanResult?.garmentId
    ? culturalData.costumes[scanResult.garmentId]?.sources
        .map((sourceId) => culturalData.sources[sourceId])
        .filter((source) => source !== undefined) || []
    : [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setScanResult(null);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setPhotoUrl(dataUrl);
      setIsScanning(true);
      try {
        const res = await scanCostumeFromPhoto(dataUrl);
        setScanResult(res);
      } catch (err: any) {
        setErrorMsg('Không thể quét trang phục từ ảnh. Vui lòng thử ảnh rõ nét hơn.');
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApply = () => {
    if (!scanResult) return;
    if (scanResult.garmentId) {
      setCostumeId(scanResult.garmentId);
    }
    if (scanResult.mainColors && scanResult.mainColors.length > 0) {
      setPrimaryColorHex(scanResult.mainColors[0].hex);
    }
    if (scanResult.accessories) {
      scanResult.accessories.forEach((acc) => toggleAccessory(acc));
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-[#F2EDE4] border border-[#DFD8C8] rounded-[12px] max-w-md w-full p-5 space-y-4 shadow-2xl text-[#1E1B18]">
        <div className="flex items-center justify-between border-b border-[#DFD8C8] pb-3">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#A33B1E]" />
            <h3 className="font-bold text-sm uppercase tracking-wider font-editorial">
              Soi dấu tích Việt Phục
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

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onClick={(event) => {
            event.currentTarget.value = '';
          }}
          onChange={handleFileChange}
          className="hidden"
        />

        {!photoUrl ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-8 border-2 border-dashed border-[#DFD8C8] hover:border-[#A33B1E] rounded-[10px] bg-white/50 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors text-center"
          >
            <Upload className="w-7 h-7 text-[#A33B1E]" />
            <span className="text-xs font-bold">Chụp hoặc tải ảnh trang phục</span>
            <span className="text-[11px] text-[#78716C]">
              Gemini tìm nét tương đồng về phom, màu và phụ kiện
            </span>
            <span className="max-w-xs text-[10px] leading-relaxed text-[#8A8173]">
              Kết quả là gợi ý thị giác, không xác nhận niên đại hay tính xác thực của hiện vật.
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative aspect-4/3 max-h-52 rounded-[8px] overflow-hidden bg-black/10 border border-[#DFD8C8]">
              <img src={photoUrl} alt="Ảnh quét" className="w-full h-full object-contain" />
              {isScanning && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white text-xs gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#FDE68A]" />
                  <span>Gemini Vision đang phân tích...</span>
                </div>
              )}
            </div>

            {errorMsg && (
              <p className="text-xs text-[#B3261E] bg-[#B3261E]/10 p-2.5 rounded-[6px]">
                {errorMsg}
              </p>
            )}

            {scanResult && !isScanning && (
              <div className="p-3 bg-white rounded-[8px] border border-[#DFD8C8] space-y-2 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-bold text-[#A33B1E] block">Gợi ý nhận diện</span>
                    <p className="mt-1 font-semibold text-[#1E1B18]">{scanResult.garmentName}</p>
                  </div>
                  <span className={`shrink-0 border px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${scanResult.confidence >= 0.72 && scanResult.garmentId ? 'border-[#BFD5C5] bg-[#EDF4EE] text-[#2E6A47]' : 'border-[#E7D9BE] bg-[#F8F1E3] text-[#806542]'}`}>
                    {matchLabel} · {Math.round(scanResult.confidence * 100)}%
                  </span>
                </div>
                <p className="text-[10px] leading-relaxed text-[#70685C]">
                  {scanResult.message || 'AI so sánh hình dáng nhìn thấy với danh mục Việt phục. Đây không phải kết luận xác thực lịch sử.'}
                </p>
                {scanResult.mainColors.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[#78716C]">Màu phát hiện:</span>
                    <span
                      className="w-4 h-4 rounded-full border border-black/20"
                      style={{ backgroundColor: scanResult.mainColors[0].hex }}
                    />
                    <span className="font-mono-tabular">{scanResult.mainColors[0].name}</span>
                  </div>
                )}
                {matchedSources.length > 0 && (
                  <div className="border-t border-[#E8E1D5] pt-2">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#76654C]">Nguồn tham khảo trong danh mục</p>
                    <ul className="mt-1 space-y-1">
                      {matchedSources.slice(0, 2).map((source) => (
                        <li key={source.id} className="text-[10px] leading-relaxed text-[#625B50]">
                          {source.title}{source.year ? ` · ${source.year}` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="pt-2 flex items-center justify-between border-t border-[#DFD8C8]">
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoUrl(null);
                      setScanResult(null);
                      setErrorMsg(null);
                    }}
                    className="text-xs text-[#78716C] hover:underline cursor-pointer"
                  >
                    Chọn lại
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!scanResult.garmentId && scanResult.mainColors.length === 0) {
                        setPhotoUrl(null);
                        setScanResult(null);
                        setErrorMsg(null);
                        return;
                      }
                      handleApply();
                    }}
                    className="px-3 py-1.5 bg-[#A33B1E] text-white font-bold rounded-[6px] flex items-center gap-1 cursor-pointer"
                  >
                    {scanResult.garmentId || scanResult.mainColors.length > 0 ? <Check className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span>{scanResult.garmentId ? 'Thử bộ này' : scanResult.mainColors.length > 0 ? 'Dùng màu gợi ý' : 'Chọn ảnh khác'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
