import React from 'react';
import { X, BookOpen, Lock, CheckCircle2 } from 'lucide-react';
import { culturalData } from '../data/culturalDataLoader';

export interface LoreNotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  unlockedIds: string[];
}

export const LoreNotebookModal: React.FC<LoreNotebookModalProps> = ({
  isOpen,
  onClose,
  unlockedIds,
}) => {
  if (!isOpen) return null;

  const cards = culturalData.loreCards;
  const unlockedCount = cards.filter((c) => unlockedIds.includes(c.id)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-[#F2EDE4] border border-[#DFD8C8] rounded-[12px] max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-[#1E1B18]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#DFD8C8] flex items-center justify-between bg-white/50">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#A33B1E]" />
            <div>
              <h2 className="text-sm font-bold font-editorial uppercase tracking-wider text-[#1E1B18]">
                Sổ Tay Điển Tích & Văn Hóa Cổ Phục
              </h2>
              <span className="text-[11px] text-[#78716C]">
                Đã mở khóa: {unlockedCount}/{cards.length} thẻ điển tích
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-black/5 rounded cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cards.map((card) => {
            const isUnlocked = unlockedIds.includes(card.id);
            const costume = culturalData.costumes[card.costumeId];
            const sources = (card.sources || [])
              .map((id) => culturalData.sources[id])
              .filter(Boolean);

            if (!isUnlocked) {
              return (
                <div
                  key={card.id}
                  className="p-4 rounded-[10px] border border-dashed border-[#DFD8C8] bg-black/5 flex items-center gap-3 text-xs text-[#78716C]"
                >
                  <Lock className="w-4 h-4 text-[#78716C] shrink-0" />
                  <div>
                    <span className="font-bold text-[#44403C]">Thẻ điển tích ẩn</span>
                    <p className="text-[11px]">
                      Hãy thiết kế và phối hoàn chỉnh bộ{' '}
                      <strong>{costume?.name || 'Cổ phục tương ứng'}</strong> để mở khóa!
                    </p>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={card.id}
                className="p-4 rounded-[10px] border border-[#DFD8C8] bg-white space-y-2 text-xs shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#A33B1E] font-editorial">
                    {card.title}
                  </span>
                  <span className="text-[10px] text-[#78716C] font-mono-tabular">
                    {costume?.name}
                  </span>
                </div>

                <p className="text-[#44403C] leading-relaxed text-[11px]">{card.text}</p>

                {/* Source Verification Badge */}
                <div className="pt-2 border-t border-[#DFD8C8]/60 flex flex-wrap items-center gap-2">
                  {card.verified && card.sources.length > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#2E7D5B]/15 text-[#2E7D5B]">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Đã đối chiếu nguồn</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-black/5 text-[#78716C]">
                      <span>Chưa đối chiếu nguồn</span>
                    </span>
                  )}

                  {sources.map((s) => (
                    <span key={s.id} className="text-[10px] text-[#78716C] italic">
                      Nguồn: {s.title}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
