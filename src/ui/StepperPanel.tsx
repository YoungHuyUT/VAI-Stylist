import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Camera,
  Shirt,
  Palette,
  Sliders,
  Sparkles,
  Check,
  BookOpen,
  Image as ImageIcon,
  Share2,
  Columns,
  Info,
} from 'lucide-react';
import { useOutfitState } from '../state/outfitStore';
import { culturalData } from '../data/culturalDataLoader';
import { PatternId } from '../types/costume';

export interface StepperPanelProps {
  onOpenPhotobooth: () => void;
  onOpenLookbook: () => void;
  onOpenCompare: () => void;
  onOpenScanModal: () => void;
}

export const StepperPanel: React.FC<StepperPanelProps> = ({
  onOpenPhotobooth,
  onOpenLookbook,
  onOpenCompare,
  onOpenScanModal,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedRegion, setSelectedRegion] = useState<'all' | 'bac' | 'trung' | 'nam'>('all');
  const [isMoreCollapsed, setIsMoreCollapsed] = useState<boolean>(true);
  const [inspectedColorId, setInspectedColorId] = useState<string | null>(null);

  const {
    outfit,
    setCostumeId,
    setRegion,
    setPatternId,
    setPrimaryColorById,
    setPrimaryColorHex,
    setTrouserColorHex,
    toggleAccessory,
    setEvent,
    setRemix,
  } = useOutfitState();

  const costumes = Object.values(culturalData.costumes).filter((c) => {
    if (selectedRegion !== 'all' && c.region !== selectedRegion) return false;
    return c.genders.includes(outfit.gender);
  });

  const colors = Object.values(culturalData.colors).slice(0, 8);
  const patterns = Object.values(culturalData.patterns);
  const accessories = Object.values(culturalData.accessories);
  const eventOptions = [
    'Đi Lễ Chùa',
    'Hôn Lễ Truyền Thống',
    'Chụp Ảnh Kỷ Yếu',
    'Dạo Phố Cổ',
    'Hội Thảo Văn Hóa',
  ];

  return (
    <div className="bg-[#F2EDE4] border border-[#DFD8C8] rounded-[12px] p-4 flex flex-col h-full overflow-hidden select-none">
      {/* 3-Step Indicator Header */}
      <div className="flex items-center justify-between border-b border-[#DFD8C8] pb-3 mb-3.5 shrink-0">
        <div className="flex items-center gap-2">
          {[
            { num: 1, label: 'Chọn bộ' },
            { num: 2, label: 'Màu & họa tiết' },
            { num: 3, label: 'Xem & chụp' },
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => setStep(s.num as 1 | 2 | 3)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-[8px] transition-colors cursor-pointer ${
                step === s.num
                  ? 'bg-[#1E1B18] text-[#F2EDE4]'
                  : 'text-[#78716C] hover:text-[#1E1B18]'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === s.num ? 'bg-[#A33B1E] text-white' : 'bg-black/10 text-[#78716C]'
                }`}
              >
                {s.num}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>

        {/* Step Navigation Actions */}
        <div className="flex items-center gap-1.5">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((prev) => (prev - 1) as 1 | 2 | 3)}
              className="px-2 py-1 text-xs text-[#78716C] hover:text-[#1E1B18] font-semibold cursor-pointer"
            >
              Quay lại
            </button>
          )}
          {step < 3 && (
            <button
              type="button"
              onClick={() => setStep((prev) => (prev + 1) as 1 | 2 | 3)}
              className="px-3 py-1 bg-[#A33B1E] hover:bg-[#8A3017] text-[#F2EDE4] text-xs font-semibold rounded-[8px] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Tiếp</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Step Content Area */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4">
        {/* STEP 1: CHỌN BỘ */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Region Chips */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'bac', label: 'Bắc Bộ' },
                  { id: 'trung', label: 'Trung Bộ' },
                  { id: 'nam', label: 'Nam Bộ' },
                ].map((reg) => (
                  <button
                    key={reg.id}
                    type="button"
                    onClick={() => {
                      setSelectedRegion(reg.id as any);
                      setRegion(reg.id === 'all' ? null : (reg.id as any));
                    }}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-all cursor-pointer whitespace-nowrap ${
                      selectedRegion === reg.id
                        ? 'bg-[#1E1B18] text-[#F2EDE4] border-[#1E1B18]'
                        : 'bg-white/60 text-[#78716C] border-[#DFD8C8] hover:border-[#1E1B18]'
                    }`}
                  >
                    {reg.label}
                  </button>
                ))}
              </div>

              {/* Link to scan costume from image */}
              <button
                type="button"
                onClick={onOpenScanModal}
                className="text-[11px] font-semibold text-[#A33B1E] hover:underline flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Camera className="w-3 h-3" />
                <span>Quét đồ của bạn</span>
              </button>
            </div>

            {/* Horizontal / Grid Costume Cards */}
            <div className="space-y-2.5">
              {costumes.map((c) => {
                const isSelected = outfit.costumeId === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setCostumeId(c.id)}
                    className={`p-3 rounded-[10px] border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-white border-[#A33B1E] shadow-sm ring-1 ring-[#A33B1E]'
                        : 'bg-white/70 border-[#DFD8C8] hover:bg-white'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#1E1B18] truncate">{c.name}</span>
                        {c.verified && c.sources.length > 0 && (
                          <span
                            className="w-2 h-2 rounded-full bg-[#2E7D5B]"
                            title="Đã đối chiếu nguồn học thuật"
                          />
                        )}
                      </div>
                      <p className="text-[11px] text-[#78716C] font-mono-tabular">{c.era}</p>
                      <p className="text-[11px] text-[#44403C] line-clamp-2 leading-relaxed">
                        {c.meaning}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center justify-center">
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'bg-[#A33B1E] border-[#A33B1E] text-white'
                            : 'border-[#DFD8C8]'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: MÀU & HỌA TIẾT */}
        {step === 2 && (
          <div className="space-y-4">
            {/* 8 Named Swatches */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#1E1B18] block uppercase tracking-wider">
                Màu sắc chủ đạo (Áo)
              </span>
              <div className="grid grid-cols-4 gap-2">
                {colors.map((clr) => {
                  const isSelected =
                    outfit.colors.ao.toLowerCase() === clr.hex.toLowerCase();
                  return (
                    <div key={clr.id} className="relative group">
                      <button
                        type="button"
                        onClick={() => {
                          setPrimaryColorById(clr.id);
                          setPrimaryColorHex(clr.hex);
                        }}
                        className={`w-full p-2 rounded-[8px] border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-white border-[#A33B1E] ring-1 ring-[#A33B1E]'
                            : 'bg-white/60 border-[#DFD8C8] hover:bg-white'
                        }`}
                      >
                        <span
                          className="w-7 h-7 rounded-full border border-black/10 shadow-xs flex items-center justify-center"
                          style={{ backgroundColor: clr.hex }}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                        </span>
                        <span className="text-[10px] font-semibold text-[#1E1B18] truncate w-full text-center">
                          {clr.name}
                        </span>
                      </button>

                      {/* Small info icon to inspect meaning */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectedColorId(inspectedColorId === clr.id ? null : clr.id);
                        }}
                        className="absolute top-1 right-1 p-0.5 text-[#78716C] hover:text-[#1E1B18] opacity-60 hover:opacity-100"
                        title="Ý nghĩa màu sắc"
                      >
                        <Info className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Inspected Color Meaning Popover */}
              {inspectedColorId && (
                <div className="p-3 bg-white rounded-[8px] border border-[#DFD8C8] text-xs space-y-1">
                  {(() => {
                    const c = colors.find((x) => x.id === inspectedColorId);
                    if (!c) return null;
                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <strong className="text-[#1E1B18]">{c.name}</strong>
                          {c.verified && c.sources.length > 0 ? (
                            <span className="text-[10px] text-[#2E7D5B] font-bold">
                              Đã đối chiếu nguồn
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#78716C]">
                              Chưa đối chiếu nguồn
                            </span>
                          )}
                        </div>
                        <p className="text-[#44403C] text-[11px] leading-relaxed">{c.meaning}</p>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Pattern Thumbnails */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#1E1B18] block uppercase tracking-wider">
                Hoa văn dệt
              </span>
              <div className="grid grid-cols-2 gap-2">
                {patterns.map((pat) => {
                  const isSelected = (outfit.patternId || 'none') === pat.id;
                  return (
                    <button
                      key={pat.id}
                      type="button"
                      onClick={() => setPatternId(pat.id as PatternId)}
                      className={`p-2.5 rounded-[8px] border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-white border-[#A33B1E] ring-1 ring-[#A33B1E]'
                          : 'bg-white/60 border-[#DFD8C8] hover:bg-white'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-[#1E1B18] block truncate">
                          {pat.name}
                        </span>
                        <span className="text-[10px] text-[#78716C] line-clamp-1">
                          {pat.description}
                        </span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#A33B1E] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Collapsed "Thêm" for Trousers, Accessories, Event, Remix Slider */}
            <div className="border-t border-[#DFD8C8] pt-2">
              <button
                type="button"
                onClick={() => setIsMoreCollapsed(!isMoreCollapsed)}
                className="w-full py-2 text-xs font-bold text-[#A33B1E] flex items-center justify-between cursor-pointer"
              >
                <span>{isMoreCollapsed ? '+ Thêm tùy chỉnh (Quần, Phụ kiện, Sự kiện, Remix)' : '− Thu gọn tùy chỉnh'}</span>
              </button>

              {!isMoreCollapsed && (
                <div className="space-y-3.5 pt-2">
                  {/* Trouser Color */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-[#1E1B18] uppercase">
                      Màu quần / Hạ y
                    </span>
                    <div className="flex gap-2">
                      {[
                        { name: 'Trắng Ngà', hex: '#F5F1E8' },
                        { name: 'Đen Lĩnh', hex: '#181513' },
                        { name: 'Đỏ Tía', hex: '#701A75' },
                      ].map((t) => (
                        <button
                          key={t.hex}
                          type="button"
                          onClick={() => setTrouserColorHex(t.hex)}
                          className={`px-2.5 py-1 rounded-[6px] border text-[11px] flex items-center gap-1.5 cursor-pointer ${
                            outfit.colors.quan.toLowerCase() === t.hex.toLowerCase()
                              ? 'bg-white border-[#A33B1E] font-bold'
                              : 'bg-white/60 border-[#DFD8C8]'
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full border border-black/10"
                            style={{ backgroundColor: t.hex }}
                          />
                          <span>{t.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Accessories */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-[#1E1B18] uppercase">
                      Phụ kiện đi kèm
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {accessories.map((acc) => {
                        const isAttached = outfit.accessories.includes(acc.id);
                        return (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => toggleAccessory(acc.id)}
                            className={`px-2 py-1 rounded-[6px] text-[11px] border transition-colors cursor-pointer ${
                              isAttached
                                ? 'bg-[#1E1B18] text-[#F2EDE4] border-[#1E1B18]'
                                : 'bg-white/60 text-[#78716C] border-[#DFD8C8]'
                            }`}
                          >
                            {acc.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Event */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-[#1E1B18] uppercase">
                      Không gian / Sự kiện
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {eventOptions.map((evt) => (
                        <button
                          key={evt}
                          type="button"
                          onClick={() => setEvent(evt)}
                          className={`p-1.5 text-left text-[11px] rounded-[6px] border truncate cursor-pointer ${
                            outfit.event === evt
                              ? 'bg-[#A33B1E] text-white border-[#A33B1E] font-semibold'
                              : 'bg-white/60 border-[#DFD8C8] text-[#44403C]'
                          }`}
                        >
                          {evt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Remix Slider "Truyền thống - Gen Z" (0..100) */}
                  <div className="space-y-1.5 p-2.5 bg-white/70 rounded-[8px] border border-[#DFD8C8]">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[#1E1B18]">Truyền thống</span>
                      <span className="font-mono-tabular font-bold text-[#A33B1E]">
                        Remix: {outfit.remix}%
                      </span>
                      <span className="font-semibold text-[#1E1B18]">Gen Z</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={outfit.remix}
                      onChange={(e) => setRemix(Number(e.target.value))}
                      className="w-full accent-[#A33B1E] cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: XEM & CHỤP */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Primary Action: Thử lên ảnh của tôi */}
            <div className="bg-white/80 p-4 rounded-[10px] border border-[#DFD8C8] space-y-2 text-center">
              <span className="text-xs font-bold text-[#1E1B18] block uppercase tracking-wider">
                Photobooth Ghép Đồ AI
              </span>
              <p className="text-[11px] text-[#78716C] leading-relaxed">
                Tải ảnh hoặc chụp trực tiếp để ướm thử bộ đồ bạn vừa thiết kế, giữ nguyên khuôn mặt thật 100%.
              </p>
              <button
                type="button"
                onClick={onOpenPhotobooth}
                className="w-full min-h-[44px] py-2.5 px-4 bg-[#A33B1E] hover:bg-[#8A3017] text-[#F2EDE4] font-bold text-xs rounded-[8px] flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                <Camera className="w-4 h-4" />
                <span>Thử lên ảnh của tôi</span>
              </button>
            </div>

            {/* Secondary Actions: Lookbook & So sánh */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onOpenLookbook}
                className="min-h-[44px] p-2.5 bg-white/70 hover:bg-white border border-[#DFD8C8] rounded-[8px] text-xs font-bold text-[#1E1B18] flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-[#A33B1E]" />
                <span>Tạo Lookbook 9:16</span>
              </button>

              <button
                type="button"
                onClick={onOpenCompare}
                className="min-h-[44px] p-2.5 bg-white/70 hover:bg-white border border-[#DFD8C8] rounded-[8px] text-xs font-bold text-[#1E1B18] flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <Columns className="w-4 h-4 text-[#A33B1E]" />
                <span>So sánh các Look</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
