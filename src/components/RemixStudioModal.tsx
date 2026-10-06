import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  LoaderCircle,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';
import {
  RemixLook,
  RemixStudioRequest,
  RemixStudioResponse,
  RemixThemeId,
  StylePreferenceVote,
} from '../types/remix';
import { culturalData } from '../data/culturalDataLoader';
import { TOP_GARMENTS } from '../data/vietPhucData';

const THEMES: Array<{ id: RemixThemeId; label: string; hint: string }> = [
  { id: 'everyday', label: 'Phố cổ cuối tuần', hint: 'Thoải mái, dễ mặc' },
  { id: 'editorial', label: 'Kỷ yếu hoài cổ', hint: 'Có điểm nhấn lên ảnh' },
  { id: 'festival', label: 'Concert & lễ hội', hint: 'Năng lượng, cá tính' },
  { id: 'formal', label: 'Lễ nghi trang trọng', hint: 'Tôn trọng bối cảnh' },
  { id: 'heritage', label: 'Tự do khám phá', hint: 'Bắt đầu từ di sản' },
];

const STYLE_PROFILE_KEY = 'vai-stylist:style-shuffle:v1';

function readStyleProfile(): StylePreferenceVote[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(STYLE_PROFILE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed)
      ? parsed.filter(
          (vote): vote is StylePreferenceVote =>
            vote &&
            typeof vote.costumeId === 'string' &&
            typeof vote.mainColor === 'string' &&
            typeof vote.bottomName === 'string' &&
            typeof vote.bottomColor === 'string' &&
            typeof vote.patternId === 'string' &&
            typeof vote.liked === 'boolean'
        ).slice(-24)
      : [];
  } catch {
    return [];
  }
}

interface RemixStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: Omit<RemixStudioRequest, 'theme' | 'styleVotes'>;
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
  const [styleProfile, setStyleProfile] = useState<StylePreferenceVote[]>(readStyleProfile);
  const [lookIndex, setLookIndex] = useState(0);
  const [sessionLikes, setSessionLikes] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const generationId = useRef(0);
  const swipeStartX = useRef<number | null>(null);

  useEffect(() => {
    generationId.current += 1;
    if (!isOpen) setIsLoading(false);
  }, [isOpen]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STYLE_PROFILE_KEY, JSON.stringify(styleProfile));
    } catch {
      // Ratings remain usable for the current session if storage is unavailable.
    }
  }, [styleProfile]);

  if (!isOpen) return null;

  const closeStudio = () => {
    generationId.current += 1;
    setIsLoading(false);
    onClose();
  };

  const chooseTheme = (nextTheme: RemixThemeId) => {
    if (nextTheme === theme) return;
    generationId.current += 1;
    setTheme(nextTheme);
    setLooks([]);
    setEngine('');
    setError('');
    setIsLoading(false);
  };

  const rateLook = (look: RemixLook, liked: boolean) => {
    const vote: StylePreferenceVote = {
      costumeId: look.costumeId,
      mainColor: look.mainColor,
      bottomName: look.bottomName,
      bottomColor: look.bottomColor,
      patternId: look.patternId,
      liked,
    };
    setStyleProfile((current) => [...current, vote].slice(-24));
    if (liked) setSessionLikes((current) => current + 1);
    setLookIndex((current) => current + 1);
  };

  const handleSwipeEnd = (event: React.PointerEvent<HTMLDivElement>, look: RemixLook) => {
    if (swipeStartX.current === null) return;
    const distance = event.clientX - swipeStartX.current;
    swipeStartX.current = null;
    setIsDragging(false);
    if (Math.abs(distance) >= 70) {
      setSwipeOffset(0);
      rateLook(look, distance > 0);
    } else {
      setSwipeOffset(0);
    }
  };

  const generateLooks = async () => {
    const requestId = ++generationId.current;
    setError('');
    setIsLoading(true);
    try {
      const response = await fetch('/api/remix-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...request, theme, styleVotes: styleProfile }),
      });
      const data = (await response.json()) as RemixStudioResponse & { error?: string };
      if (!response.ok || !Array.isArray(data.looks) || data.looks.length !== 3) {
        throw new Error(data.error || 'Chưa tạo được 3 gợi ý phối đồ.');
      }
      if (requestId !== generationId.current) return;
      setLooks(data.looks);
      setLookIndex(0);
      setSessionLikes(0);
      setEngine(data.engine || 'V-Stylist');
    } catch (err) {
      if (requestId !== generationId.current) return;
      setError(err instanceof Error ? err.message : 'Kết nối cố vấn chưa sẵn sàng.');
    } finally {
      if (requestId === generationId.current) setIsLoading(false);
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
              <span>VAI-Stylist · Style Shuffle</span>
            </div>
            <h2 id="remix-studio-title" className="mt-1 text-2xl sm:text-3xl font-editorial font-semibold text-[#201B17]">
              Lướt gu Việt, thử ngay 3D
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[#685F54] max-w-2xl">
              Chọn vibe, lướt thích hoặc bỏ qua. Gemini dùng lựa chọn của bạn để cá nhân hóa vòng phối tiếp theo.
            </p>
          </div>
          <button type="button" onClick={closeStudio} aria-label="Đóng Studio" className="p-2 text-[#554D44] hover:bg-black/5">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="overflow-y-auto p-4 sm:p-7 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3 lg:gap-5">
            <div className="flex-1">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#74695C]">Bạn muốn lên vibe nào?</p>
                <span className="text-[10px] text-[#766D62]">Gu đã học trên thiết bị: {styleProfile.length} lượt</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {THEMES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => chooseTheme(item.id)}
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
              {isLoading ? 'Đang phối ba hướng…' : looks.length ? 'Tạo 3 bản phối' : 'Bắt đầu lướt gu'}
            </button>
          </div>

          {error && <p role="alert" className="text-sm text-[#9A3412] bg-[#F5E8DB] border border-[#E6C8AC] p-3">{error}</p>}

          {looks.length > 0 && lookIndex < looks.length ? (
            (() => {
              const look = looks[lookIndex];
              const garment = TOP_GARMENTS.find((item) => item.id === look.costumeId);
              const costume = culturalData.costumes[look.costumeId];
              const isVerified = Boolean(costume?.verified && costume.sources.length > 0);
              const source = isVerified && costume?.sources[0]
                ? culturalData.sources[costume.sources[0]]
                : null;
              return (
                <div className="mx-auto max-w-4xl">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-[#3D362F]">Bản phối {lookIndex + 1} / {looks.length}</p>
                    <div className="flex gap-1.5" aria-label={`Đã xem ${lookIndex} trên ${looks.length} bản phối`}>
                      {looks.map((item, index) => <span key={item.id} className={`h-1.5 w-8 ${index < lookIndex ? 'bg-[#2E7D5B]' : index === lookIndex ? 'bg-[#9A3412]' : 'bg-[#D9CEBC]'}`} />)}
                    </div>
                  </div>
                  <article
                    className="grid overflow-hidden border border-[#D9CEBC] bg-[#FBF8F1] shadow-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"
                    style={{
                      transform: `translateX(${swipeOffset}px) rotate(${swipeOffset / 32}deg)`,
                      opacity: Math.max(0.72, 1 - Math.abs(swipeOffset) / 520),
                      transition: isDragging ? 'none' : 'transform 180ms ease, opacity 180ms ease',
                    }}
                  >
                    <div
                      className="relative min-h-64 select-none overflow-hidden bg-[#E8E0D3] sm:min-h-[420px]"
                      style={{ touchAction: 'pan-y' }}
                      onPointerDown={(event) => {
                        swipeStartX.current = event.clientX;
                        setIsDragging(true);
                        event.currentTarget.setPointerCapture(event.pointerId);
                      }}
                      onPointerMove={(event) => {
                        if (swipeStartX.current !== null) {
                          setSwipeOffset(event.clientX - swipeStartX.current);
                        }
                      }}
                      onPointerUp={(event) => handleSwipeEnd(event, look)}
                      onPointerCancel={() => {
                        swipeStartX.current = null;
                        setIsDragging(false);
                        setSwipeOffset(0);
                      }}
                      role="group"
                      aria-label="Vuốt phải để thích, vuốt trái để bỏ qua"
                    >
                      {garment && <img src={garment.image} alt={garment.baseName} className="absolute inset-0 h-full w-full object-cover object-center" draggable={false} />}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#171512]/80 via-transparent to-[#171512]/5" />
                      <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 text-white">
                        <div><p className="text-[9px] uppercase tracking-[0.16em] text-white/75">{garment?.dynasty || 'Việt phục'}</p><p className="mt-0.5 font-editorial text-2xl font-semibold">{garment?.baseName || look.title}</p></div>
                        <span className="mb-1 h-8 w-8 rounded-full border-2 border-white/80 shadow" style={{ backgroundColor: look.mainColor }} title="Màu áo" />
                      </div>
                      <span className="absolute left-3 top-3 bg-[#171512]/65 px-2 py-1 text-[10px] font-semibold text-white">← Bỏ qua</span>
                      <span className="absolute right-3 top-3 bg-[#171512]/65 px-2 py-1 text-[10px] font-semibold text-white">Thích →</span>
                    </div>
                    <div className="flex flex-col p-4 sm:p-6">
                      <div className="flex items-start justify-between gap-3 border-b border-[#E7DED0] pb-3">
                        <div><p className="text-[9px] uppercase tracking-[0.18em] text-[#8C7964]">{look.title}</p><h3 className="mt-1 font-editorial text-2xl font-semibold text-[#233D39]">{look.tagline}</h3></div>
                        <span className="shrink-0 bg-[#EEE7DB] px-2 py-1 text-[10px] font-mono-tabular text-[#62584C]">{look.remix}% remix</span>
                      </div>
                      <div className="flex items-center gap-2 py-3">
                        <span className="h-7 w-7 rounded-full border border-black/10" style={{ backgroundColor: look.mainColor }} title="Màu áo" />
                        <span className="h-7 w-7 rounded-full border border-black/10" style={{ backgroundColor: look.bottomColor }} title="Màu hạ y" />
                        <span className="text-xs text-[#4C443B]">{look.bottomName}</span>
                      </div>
                      <p className="text-xs leading-relaxed text-[#3D362F]">{look.stylistNote}</p>
                      {isVerified && costume?.meaning && source && (
                        <div className="mt-3 border-l-2 border-[#8A765D] bg-[#F1ECE2] p-3">
                          <p className="text-[9px] uppercase tracking-[0.15em] text-[#766D62]">Lát cắt di sản · Đã đối chiếu</p>
                          <p className="mt-1 text-[11px] leading-relaxed text-[#4C443B]">{costume.meaning}</p>
                          <p className="mt-1 text-[9px] text-[#766D62]">Nguồn: {source.title}</p>
                        </div>
                      )}
                      {look.contextNote && <p className="mt-3 border-l-2 border-[#B7791F] bg-[#F3EBDD] px-3 py-2 text-[11px] leading-relaxed text-[#73552F]">{look.contextNote}</p>}
                      <p className="mt-auto pt-3 text-[10px] text-[#74695C]">{look.patternId === 'none' ? 'Lụa trơn' : look.patternId.replace('pattern_', '').replaceAll('_', ' ')}{look.accessoryIds.length > 0 && ` · ${look.accessoryIds.length} phụ kiện`}</p>
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <button type="button" onClick={() => rateLook(look, false)} className="flex min-h-11 items-center justify-center gap-1 border border-[#D9CEBC] bg-white text-[11px] font-semibold text-[#665B4D] hover:border-[#9A3412]"><ThumbsDown className="h-4 w-4" /> Bỏ qua</button>
                        <button type="button" onClick={() => onApply(look)} className="flex min-h-11 items-center justify-center gap-1 bg-[#233D39] px-2 text-[11px] font-semibold text-[#FBF8F1] hover:bg-[#182E2B]">Thử 3D <ArrowRight className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => rateLook(look, true)} className="flex min-h-11 items-center justify-center gap-1 border border-[#B7D0C0] bg-[#EAF3EA] text-[11px] font-semibold text-[#214C37] hover:bg-[#DDEBDD]"><ThumbsUp className="h-4 w-4" /> Thích</button>
                      </div>
                    </div>
                  </article>
                  <p className="mt-2 text-center text-[10px] text-[#766D62]">Vuốt trái để bỏ qua, vuốt phải để thích. Lượt chọn lưu trên thiết bị và được gửi cùng yêu cầu để cá nhân hóa vòng phối sau.</p>
                </div>
              );
            })()
          ) : looks.length > 0 ? (
            <div className="mx-auto flex min-h-64 max-w-2xl flex-col items-center justify-center border border-[#D9CEBC] bg-[#FBF8F1] px-6 py-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EAE3D7] text-[#2E7D5B]"><ThumbsUp className="h-6 w-6" /></div>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8C7964]">Vòng phối đã xong</p>
              <h3 className="mt-1 font-editorial text-2xl font-semibold text-[#233D39]">Bạn thích {sessionLikes} / {looks.length} bản phối</h3>
              <p className="mt-2 max-w-md text-xs leading-relaxed text-[#685F54]">
                Đã ghi nhận {styleProfile.length} lượt chọn trên thiết bị này.{' '}
                {engine.toLowerCase().includes('ngoại tuyến')
                  ? 'Khi Gemini chưa kết nối, hệ thống vẫn dùng gu của bạn để xếp lại các gợi ý có sẵn.'
                  : 'Gemini sẽ dùng chúng làm tín hiệu gu cho vòng phối kế tiếp.'}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={generateLooks} disabled={isLoading} className="flex min-h-11 items-center gap-2 bg-[#9A3412] px-4 text-xs font-semibold text-white hover:bg-[#7C2D12] disabled:opacity-60"><Sparkles className="h-4 w-4" /> Phối tiếp theo gu của tôi</button>
                <button type="button" onClick={() => setStyleProfile([])} className="min-h-11 border border-[#D9CEBC] px-4 text-xs font-semibold text-[#665B4D] hover:border-[#9A3412]">Xóa gu đã học</button>
              </div>
            </div>
          ) : (
            <div className="min-h-44 border border-dashed border-[#D9CEBC] flex flex-col items-center justify-center text-center px-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EAE3D7] text-[#9A3412]"><Sparkles className="h-5 w-5" /></div>
              <p className="mt-3 text-sm font-semibold text-[#352E27]">Lướt gu Việt phục của bạn</p>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-[#74695C]">Gemini đưa ra ba bản phối. Thích hoặc bỏ qua để lưu tín hiệu gu trên thiết bị, rồi nhận vòng phối cá nhân hóa hơn.</p>
            </div>
          )}

          {engine && <p className="text-[10px] text-[#8C7964]">Gợi ý bởi {engine}. Thông tin lịch sử và nguồn dẫn được lấy từ hồ sơ trang phục của dự án.</p>}
        </div>
      </section>
    </div>
  );
};
