import React, { useState } from 'react';
import { ArrowRight, LoaderCircle, Sparkles, X } from 'lucide-react';
import { RemixLook, RemixStudioRequest, RemixStudioResponse, RemixThemeId } from '../types/remix';
import { culturalData } from '../data/culturalDataLoader';
import { TOP_GARMENTS } from '../data/vietPhucData';

const THEMES: Array<{ id: RemixThemeId; label: string; hint: string }> = [
  { id: 'everyday', label: 'Phố cổ cuối tuần', hint: 'Thoải mái, dễ mặc' },
  { id: 'editorial', label: 'Kỷ yếu hoài cổ', hint: 'Có điểm nhấn lên ảnh' },
  { id: 'festival', label: 'Concert & lễ hội', hint: 'Năng lượng, cá tính' },
  { id: 'formal', label: 'Lễ nghi trang trọng', hint: 'Tôn trọng bối cảnh' },
  { id: 'heritage', label: 'Tự do khám phá', hint: 'Bắt đầu từ di sản' },
];

interface RemixStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: Omit<RemixStudioRequest, 'theme'>;
  onApply: (look: RemixLook) => void;
}

export const RemixStudioModal: React.FC<RemixStudioModalProps> = ({
  isOpen,
  onClose,
  request,
  onApply,
}) => {
  const [theme, setTheme] = useState<RemixThemeId>('everyday');
  const [looks, setLooks] = useState<RemixLook[]>([]);
  const [engine, setEngine] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const generateLooks = async () => {
    setError('');
    setIsLoading(true);
    try {
      const response = await fetch('/api/remix-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...request, theme }),
      });
      const data = (await response.json()) as RemixStudioResponse & { error?: string };
      if (!response.ok || !Array.isArray(data.looks) || data.looks.length !== 3) {
        throw new Error(data.error || 'Chưa tạo được 3 gợi ý phối đồ.');
      }
      setLooks(data.looks);
      setEngine(data.engine || 'V-Stylist');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kết nối cố vấn chưa sẵn sàng.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-[#171512]/75 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="remix-studio-title"
        className="w-full max-w-6xl max-h-[94vh] overflow-hidden flex flex-col bg-[#F6F1E8] border border-[#D9CEBC] shadow-2xl"
      >
        <header className="px-5 sm:px-7 py-4 border-b border-[#DED4C3] flex items-start justify-between gap-4 bg-[#FBF8F1]">
          <div>
            <div className="flex items-center gap-2 text-[#9A3412] text-[10px] uppercase tracking-[0.22em] font-semibold">
              <Sparkles className="w-4 h-4" />
              <span>VAI-Stylist · Di Sản Remix Studio</span>
            </div>
            <h2 id="remix-studio-title" className="mt-1 text-2xl sm:text-3xl font-editorial font-semibold text-[#201B17]">
              Một bộ cổ phục, ba cách kể
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[#685F54] max-w-2xl">
              Chọn một mood. Gemini sẽ gợi ý ba hướng phối; bạn tự chọn món nào sẽ mặc lên mẫu 3D.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng Studio" className="p-2 text-[#554D44] hover:bg-black/5">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="overflow-y-auto p-4 sm:p-7 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3 lg:gap-5">
            <div className="flex-1">
              <p className="mb-2 text-[10px] uppercase tracking-[0.18em] font-semibold text-[#74695C]">Bạn muốn lên vibe nào?</p>
              <div className="flex flex-wrap gap-2">
                {THEMES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTheme(item.id)}
                    aria-pressed={theme === item.id}
                    className={`px-3 py-2 border text-left transition-colors ${
                      theme === item.id
                        ? 'bg-[#233D39] text-[#FBF8F1] border-[#233D39]'
                        : 'bg-[#FBF8F1] text-[#302A24] border-[#D9CEBC] hover:border-[#233D39]'
                    }`}
                  >
                    <span className="block text-xs font-semibold">{item.label}</span>
                    <span className={`block mt-0.5 text-[10px] ${theme === item.id ? 'text-[#D4C8B5]' : 'text-[#766D62]'}`}>
                      {item.hint}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={generateLooks}
              disabled={isLoading}
              className="min-h-11 px-5 bg-[#9A3412] hover:bg-[#7C2D12] text-white text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isLoading ? 'Đang phối ba hướng…' : looks.length ? 'Tạo bộ gợi ý mới' : 'Tạo 3 bản phối'}
            </button>
          </div>

          {error && <p role="alert" className="text-sm text-[#9A3412] bg-[#F5E8DB] border border-[#E6C8AC] p-3">{error}</p>}

          {looks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              {looks.map((look, index) => (
                <article key={look.id} className="min-h-[340px] flex flex-col bg-[#FBF8F1] border border-[#D9CEBC]">
                  {(() => {
                    const garment = TOP_GARMENTS.find((item) => item.id === look.costumeId);
                    return garment ? (
                      <div className="relative h-48 overflow-hidden bg-[#E8E0D3]">
                        <img src={garment.image} alt={garment.baseName} className="h-full w-full object-cover object-center" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#171512]/75 via-transparent to-transparent" />
                        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3 text-white">
                          <div><p className="text-[9px] uppercase tracking-[0.16em] text-white/75">{garment.dynasty}</p><p className="mt-0.5 text-lg font-editorial font-semibold">{garment.baseName}</p></div>
                          <span className="mb-1 h-6 w-6 rounded-full border-2 border-white/80 shadow" style={{ backgroundColor: look.mainColor }} title="Màu áo" />
                        </div>
                      </div>
                    ) : null;
                  })()}
                  <div className="px-4 pt-4 pb-3 border-b border-[#E7DED0] flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[9px] uppercase tracking-[0.18em] text-[#8C7964]">Hướng {index + 1}</span>
                      <h3 className="mt-1 text-xl font-editorial font-semibold text-[#233D39]">{look.title}</h3>
                      <p className="mt-0.5 text-xs text-[#756A5E]">{look.tagline}</p>
                    </div>
                    <span className="shrink-0 px-2 py-1 bg-[#EEE7DB] text-[10px] font-mono-tabular text-[#62584C]">{look.remix}% remix</span>
                  </div>

                  <div className="p-4 flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 border border-black/10 rounded-full" style={{ backgroundColor: look.mainColor }} title="Màu áo" />
                      <span className="w-7 h-7 border border-black/10 rounded-full" style={{ backgroundColor: look.bottomColor }} title="Màu hạ y" />
                      <span className="text-xs text-[#4C443B]">{look.bottomName}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-[#3D362F]">{look.stylistNote}</p>
                    {(() => {
                      const costume = culturalData.costumes[look.costumeId];
                      const isVerified = Boolean(costume?.verified && costume.sources.length > 0);
                      const source = isVerified && costume?.sources[0]
                        ? culturalData.sources[costume.sources[0]]
                        : null;
                      if (!isVerified || !costume?.meaning || !source) return null;
                      return (
                        <div className="p-3 bg-[#F1ECE2] border-l-2 border-[#8A765D]">
                          <p className="text-[9px] uppercase tracking-[0.15em] text-[#766D62]">Một lát cắt di sản · Đã đối chiếu</p>
                          <p className="mt-1 text-[11px] leading-relaxed text-[#4C443B]">{costume.meaning}</p>
                          <p className="mt-1 text-[9px] text-[#766D62]">Nguồn: {source.title}</p>
                        </div>
                      );
                    })()}
                    {look.contextNote && (
                      <p className="text-[11px] leading-relaxed text-[#73552F] bg-[#F3EBDD] border-l-2 border-[#B7791F] px-3 py-2">{look.contextNote}</p>
                    )}
                    <div className="pt-1 text-[10px] text-[#74695C]">
                      {look.patternId === 'none' ? 'Lụa trơn' : look.patternId.replace('pattern_', '').replaceAll('_', ' ')}
                      {look.accessoryIds.length > 0 && ` · ${look.accessoryIds.length} phụ kiện`}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onApply(look)}
                    className="m-3 mt-0 min-h-10 px-3 bg-[#233D39] hover:bg-[#182E2B] text-[#FBF8F1] text-xs font-semibold flex items-center justify-center gap-2"
                  >
                    Mặc thử trên mẫu 3D <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="min-h-44 border border-dashed border-[#D9CEBC] flex flex-col items-center justify-center text-center px-6">
              <div className="w-12 h-12 rounded-full bg-[#EAE3D7] flex items-center justify-center text-[#9A3412]"><Sparkles className="w-5 h-5" /></div>
              <p className="mt-3 text-sm font-semibold text-[#352E27]">Ba hướng phối sẽ xuất hiện ở đây</p>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-[#74695C]">AI sẽ gợi ý một hướng tôn di sản, một hướng dễ mặc và một hướng editorial. Bạn có thể áp dụng rồi tiếp tục chỉnh từng món trong Studio.</p>
            </div>
          )}

          {engine && <p className="text-[10px] text-[#8C7964]">Gợi ý bởi {engine}. Thông tin lịch sử và nguồn dẫn được lấy từ hồ sơ trang phục của dự án.</p>}
        </div>
      </section>
    </div>
  );
};
