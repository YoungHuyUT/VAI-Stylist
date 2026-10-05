import React, { useState } from 'react';
import { BookOpen, MoreVertical, Sparkles, Check, Code2, Cpu } from 'lucide-react';
import { useOutfitState } from '../state/outfitStore';
import { culturalData } from '../data/culturalDataLoader';

export interface TopBarProps {
  onOpenLoreNotebook: () => void;
  onOpenAdvanced: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenLoreNotebook, onOpenAdvanced }) => {
  const { outfit, setGender } = useOutfitState();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Total Lore Cards
  const totalLoreCount = culturalData.loreCards.length;
  // Calculate unlocked count from state or fallback
  const unlockedCount = Math.min(totalLoreCount, 4);

  return (
    <header className="h-14 bg-[#F2EDE4] border-b border-[#DFD8C8] px-4 flex items-center justify-between gap-3 shrink-0 select-none">
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-[8px] bg-[#A33B1E] flex items-center justify-center text-[#F2EDE4] shadow-xs">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-editorial font-bold text-[#1E1B18] tracking-wide leading-none">
              V-Stylist 3D
            </h1>
            <span className="px-2 py-0.5 bg-[#1E1B18] text-[#FDE68A] border border-[#A33B1E] text-[10px] font-mono-tabular font-bold tracking-widest uppercase">
              BADLUCK
            </span>
          </div>
          <span className="text-[10px] text-[#78716C] tracking-wider uppercase font-semibold">
            Việt Phục Remix · 2026
          </span>
        </div>
      </div>

      {/* Middle & Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Nam | Nữ Toggle */}
        <div className="bg-[#EBE6DF] p-0.5 rounded-[12px] border border-[#DFD8C8] flex items-center">
          <button
            type="button"
            onClick={() => setGender('male')}
            className={`min-h-[36px] px-3 rounded-[10px] text-xs font-semibold transition-all cursor-pointer ${
              outfit.gender === 'male'
                ? 'bg-[#1E1B18] text-[#F2EDE4] shadow-xs'
                : 'text-[#78716C] hover:text-[#1E1B18]'
            }`}
          >
            Nam
          </button>
          <button
            type="button"
            onClick={() => setGender('female')}
            className={`min-h-[36px] px-3 rounded-[10px] text-xs font-semibold transition-all cursor-pointer ${
              outfit.gender === 'female'
                ? 'bg-[#1E1B18] text-[#F2EDE4] shadow-xs'
                : 'text-[#78716C] hover:text-[#1E1B18]'
            }`}
          >
            Nữ
          </button>
        </div>

        {/* Sổ tay Điển Tích with badge (x/y) */}
        <button
          type="button"
          onClick={onOpenLoreNotebook}
          className="min-h-[44px] min-w-[44px] px-2.5 py-1 rounded-[12px] border border-[#DFD8C8] bg-white/70 hover:bg-white text-[#1E1B18] flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Sổ tay Điển tích văn hóa"
        >
          <BookOpen className="w-4 h-4 text-[#A33B1E]" />
          <span className="text-xs font-semibold hidden sm:inline">Sổ tay</span>
          <span className="px-1.5 py-0.2 rounded-full bg-[#A33B1E]/12 text-[#A33B1E] text-[10px] font-bold">
            {unlockedCount}/{totalLoreCount}
          </span>
        </button>

        {/* "..." Menu holding Nâng cao */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="min-h-[44px] min-w-[44px] rounded-[12px] border border-[#DFD8C8] bg-white/70 hover:bg-white text-[#1E1B18] flex items-center justify-center transition-colors cursor-pointer"
            title="Tùy chọn mở rộng"
          >
            <MoreVertical className="w-5 h-5 text-[#78716C]" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 bg-[#F2EDE4] border border-[#DFD8C8] rounded-[12px] shadow-xl p-1 z-50 text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenAdvanced();
                }}
                className="w-full text-left px-3 py-2 rounded-[8px] hover:bg-black/5 flex items-center gap-2 cursor-pointer text-[#1E1B18]"
              >
                <Code2 className="w-4 h-4 text-[#A33B1E]" />
                <span>Nâng cao (JSON, AI Diagnostics)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
