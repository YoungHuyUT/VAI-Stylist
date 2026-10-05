import React, { useState, useEffect } from 'react';
import { X, Download, Share2, Columns, BookmarkCheck } from 'lucide-react';
import { toCanonicalOutfit, useOutfitState } from '../state/outfitStore';
import { culturalData } from '../data/culturalDataLoader';
import { getDesignSnapshot } from '../state/outfitStore';
import type { SavedLook } from './CompareModal';

export interface LookbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  customImageUrl?: string | null;
  onSaveLook: (look: SavedLook) => boolean;
  savedCount: number;
  onOpenCompare: () => void;
}

export const LookbookModal: React.FC<LookbookModalProps> = ({
  isOpen,
  onClose,
  customImageUrl,
  onSaveLook,
  savedCount,
  onOpenCompare,
}) => {
  const { outfit: outfitState } = useOutfitState();
  const outfit = toCanonicalOutfit(outfitState);
  const [lookbookUrl, setLookbookUrl] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const costume = culturalData.costumes[outfit.costumeId];
  const lore = culturalData.loreCards.find(
    (card) => card.costumeId === outfit.costumeId && card.verified && card.sources.length > 0
  );
  const isCostumeVerified = Boolean(costume?.verified && costume.sources.length > 0);
  const sourceId = lore?.sources[0] || (isCostumeVerified ? costume?.sources[0] : undefined);
  const source = sourceId ? culturalData.sources[sourceId] : null;

  useEffect(() => {
    if (!isOpen) return;

    const generateCard = async () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1920; // 9:16 ratio
        const ctx = canvas.getContext('2d')!;

        // 1. Background #F2EDE4 with silk grain gradient
        ctx.fillStyle = '#F2EDE4';
        ctx.fillRect(0, 0, 1080, 1920);

        // Soft royal radial glow
        const glow = ctx.createRadialGradient(540, 720, 100, 540, 720, 900);
        glow.addColorStop(0, 'rgba(255, 248, 235, 0.8)');
        glow.addColorStop(1, 'rgba(242, 237, 228, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, 1080, 1920);

        // Decorative hairline border
        ctx.strokeStyle = '#DFD8C8';
        ctx.lineWidth = 4;
        ctx.strokeRect(40, 40, 1000, 1840);

        // 2. Title & Header
        ctx.fillStyle = '#A33B1E';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('V-STYLIST · VIỆT PHỤC REMIX 2026', 540, 130);

        ctx.fillStyle = '#1E1B18';
        ctx.font = 'bold 64px serif';
        ctx.fillText(costume?.name || 'Áo Ngũ Thân', 540, 220);

        ctx.fillStyle = '#78716C';
        ctx.font = '28px sans-serif';
        ctx.fillText(`${costume?.era || 'Triều Nguyễn'} · ${outfit.event}`, 540, 275);

        // 3. Central Image (Photobooth result or front-view snapshot)
        const imgSrc = customImageUrl || getDesignSnapshot();
        if (imgSrc) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise((resolve) => {
            img.onload = resolve;
            img.src = imgSrc;
          });

          // Draw image centered in frame
          const imgW = 760;
          const imgH = 1080;
          const imgX = (1080 - imgW) / 2;
          const imgY = 320;

          // Shadow
          ctx.save();
          ctx.fillStyle = 'rgba(28, 25, 23, 0.15)';
          ctx.beginPath();
          ctx.ellipse(540, imgY + imgH, 260, 28, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          ctx.drawImage(img, imgX, imgY, imgW, imgH);
        }

        // 4. Cultural Lore & Citation Box
        const loreY = 1460;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(80, loreY, 920, 300);
        ctx.strokeStyle = '#DFD8C8';
        ctx.lineWidth = 2;
        ctx.strokeRect(80, loreY, 920, 300);

        // Lore title
        ctx.fillStyle = '#A33B1E';
        ctx.font = 'bold 36px serif';
        ctx.textAlign = 'left';
        ctx.fillText(lore?.title || 'Điển Tích Cổ Phục', 120, loreY + 65);

        // Lore text wrapped
        ctx.fillStyle = '#44403C';
        ctx.font = '26px sans-serif';
        const loreText = lore?.text || (isCostumeVerified ? costume?.meaning : '') ||
          'Thông tin tư liệu cho bộ trang phục này đang được đối chiếu nguồn.';
        const words = loreText.split(' ');
        let line = '';
        let lineY = loreY + 120;
        for (const w of words) {
          const testLine = line + w + ' ';
          if (ctx.measureText(testLine).width > 840) {
            ctx.fillText(line, 120, lineY);
            line = w + ' ';
            lineY += 40;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, 120, lineY);

        // Verified Source citation
        ctx.fillStyle = source ? '#2E7D5B' : '#78716C';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText(
          source
            ? `✓ Đã đối chiếu nguồn: ${source.title}`
            : 'Tư liệu đang được rà soát nguồn',
          120,
          loreY + 255
        );

        // 5. Footer Watermark
        ctx.fillStyle = '#78716C';
        ctx.font = '22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Được tạo bởi V-Stylist 3D · BADLUCK', 540, 1835);

        setLookbookUrl(canvas.toDataURL('image/jpeg', 0.94));
      } catch (err) {
        console.error('Failed to generate lookbook card', err);
      }
    };

    generateCard();
  }, [isOpen, customImageUrl, outfitState]);

  if (!isOpen) return null;

  const handleShare = async () => {
    if (!lookbookUrl) return;
    try {
      if (navigator.share) {
        const blob = await (await fetch(lookbookUrl)).blob();
        const file = new File([blob], 'vstylist-lookbook.jpg', { type: 'image/jpeg' });
        await navigator.share({
          title: `Lookbook Việt Phục - ${costume?.name}`,
          text: `Khám phá bộ trang phục ${costume?.name} thiết kế trên V-Stylist 3D!`,
          files: [file],
        });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } else {
        // Fallback to direct download
        const a = document.createElement('a');
        a.href = lookbookUrl;
        a.download = `vstylist-lookbook-${Date.now()}.jpg`;
        a.click();
      }
    } catch {
      // ignore share dismissal
    }
  };

  const handleSaveLook = async () => {
    const imageUrl = getDesignSnapshot();
    let compactImage: string | undefined;
    if (imageUrl) {
      try {
        const image = new Image();
        image.src = imageUrl;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = 360;
        canvas.height = 480;
        canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
        compactImage = canvas.toDataURL('image/jpeg', 0.68);
      } catch {
        compactImage = undefined;
      }
    }
    const saved = onSaveLook({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      outfit,
      ...(compactImage ? { imageUrl: compactImage } : {}),
      createdAt: Date.now(),
    });
    setSaveMessage(saved ? 'Đã lưu bản phối để so sánh.' : 'Đã đủ 3 bản phối. Xóa một look rồi thử lại.');
    window.setTimeout(() => setSaveMessage(''), 2400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-[#F2EDE4] border border-[#DFD8C8] rounded-[12px] max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-[#1E1B18]">
        {/* Header */}
        <div className="px-5 py-3 border-b border-[#DFD8C8] flex items-center justify-between bg-white/50">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-[#A33B1E]" />
            <h3 className="font-bold text-sm uppercase tracking-wider font-editorial">
              Lookbook Việt Phục 9:16
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

        {/* Preview Card */}
        <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
          {lookbookUrl ? (
            <div className="max-w-[320px] rounded-[10px] overflow-hidden shadow-lg border border-[#DFD8C8]">
              <img src={lookbookUrl} alt="Lookbook 9:16" className="w-full h-auto object-contain" />
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-[#78716C]">
              <span>Đang tạo Lookbook 9:16 độ nét cao...</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#DFD8C8] bg-white/70 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={handleSaveLook} disabled={savedCount >= 3} className="min-h-[44px] px-3 bg-[#233D39] text-white font-bold text-xs rounded-[8px] flex items-center justify-center gap-2 disabled:opacity-50">
              <BookmarkCheck className="w-4 h-4" /> Lưu look {savedCount}/3
            </button>
            <button type="button" onClick={onOpenCompare} className="min-h-[44px] px-3 border border-[#D9CEBC] text-[#233D39] font-bold text-xs rounded-[8px] flex items-center justify-center gap-2">
              <Columns className="w-4 h-4" /> So sánh
            </button>
          </div>
          {saveMessage && <p role="status" className="text-[11px] text-[#4C443B]">{saveMessage}</p>}
          <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleShare}
            disabled={!lookbookUrl}
            className="flex-1 min-h-[44px] px-4 py-2 bg-[#1E1B18] text-[#F2EDE4] font-bold text-xs rounded-[8px] flex items-center justify-center gap-2 hover:bg-[#292524] transition-colors cursor-pointer disabled:opacity-50"
          >
            <Share2 className="w-4 h-4 text-[#FDE68A]" />
            <span>{shared ? 'Đã chia sẻ!' : 'Chia sẻ Lookbook'}</span>
          </button>

          {lookbookUrl && (
            <a
              href={lookbookUrl}
              download={`vstylist-lookbook-${Date.now()}.jpg`}
              className="min-h-[44px] px-4 py-2 bg-[#A33B1E] text-white font-bold text-xs rounded-[8px] flex items-center justify-center gap-1.5 hover:bg-[#8A3017] transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Tải ảnh</span>
            </a>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};
