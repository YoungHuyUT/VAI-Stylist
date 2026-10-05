import React, { useState, useRef } from 'react';
import { X, Camera, Upload, RefreshCw, Check, Sparkles } from 'lucide-react';
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
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
              Quét Cổ Phục Từ Ảnh
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
          onChange={handleFileChange}
          className="hidden"
        />

        {!photoUrl ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-8 border-2 border-dashed border-[#DFD8C8] hover:border-[#A33B1E] rounded-[10px] bg-white/50 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors text-center"
          >
            <Upload className="w-7 h-7 text-[#A33B1E]" />
            <span className="text-xs font-bold">Chọn hoặc chụp ảnh trang phục cổ phong</span>
            <span className="text-[11px] text-[#78716C]">
              Gemini Vision sẽ tự nhận diện phom áo và bảng màu
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
                <span className="font-bold text-[#A33B1E] block">Kết quả quét được:</span>
                <p className="font-semibold text-[#1E1B18]">
                  Trang phục: {scanResult.garmentName} (Độ tin cậy:{' '}
                  {Math.round(scanResult.confidence * 100)}%)
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
                <div className="pt-2 flex items-center justify-between border-t border-[#DFD8C8]">
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoUrl(null);
                      setScanResult(null);
                    }}
                    className="text-xs text-[#78716C] hover:underline cursor-pointer"
                  >
                    Chọn lại
                  </button>
                  <button
                    type="button"
                    onClick={handleApply}
                    className="px-3 py-1.5 bg-[#A33B1E] text-white font-bold rounded-[6px] flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Dùng bộ này</span>
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
