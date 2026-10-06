import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Camera,
  Check,
  CheckCircle2,
  Compass,
  Lightbulb,
  LoaderCircle,
  RotateCcw,
  Share2,
  Shirt,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import { VIET_PHUC_QUEST_STAGES } from '../data/vietPhucQuest';
import { culturalData } from '../data/culturalDataLoader';

const PROGRESS_KEY = 'vai-stylist:quest-progress:v1';

function readSavedProgress(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = window.localStorage.getItem(PROGRESS_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string =>
          VIET_PHUC_QUEST_STAGES.some((stage) => stage.id === id)
        )
      : [];
  } catch {
    return [];
  }
}

export interface VietPhucQuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCostume: (costumeId: string) => void;
  onOpenScan: () => void;
}

export const VietPhucQuestModal: React.FC<VietPhucQuestModalProps> = ({
  isOpen,
  onClose,
  onApplyCostume,
  onOpenScan,
}) => {
  const [completedIds, setCompletedIds] = useState<string[]>(readSavedProgress);
  const [activeStageId, setActiveStageId] = useState<string>(
    VIET_PHUC_QUEST_STAGES[0].id
  );
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [hintText, setHintText] = useState<string | null>(null);
  const [isLoadingHint, setIsLoadingHint] = useState(false);
  const [guideEngine, setGuideEngine] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const activeStage =
    VIET_PHUC_QUEST_STAGES.find((stage) => stage.id === activeStageId) ||
    VIET_PHUC_QUEST_STAGES[0];
  const costume = culturalData.costumes[activeStage.costumeId];
  const isComplete = completedIds.length === VIET_PHUC_QUEST_STAGES.length;
  const isCurrentComplete = completedIds.includes(activeStage.id);
  const isAnswerCorrect = selectedChoiceId === activeStage.correctChoiceId;
  const correctChoice = activeStage.choices.find(
    (choice) => choice.id === activeStage.correctChoiceId
  );
  const progressPercent = Math.round(
    (completedIds.length / VIET_PHUC_QUEST_STAGES.length) * 100
  );

  useEffect(() => {
    if (!isOpen) return;
    setActiveStageId(
      VIET_PHUC_QUEST_STAGES.find((stage) => !completedIds.includes(stage.id))?.id ||
        VIET_PHUC_QUEST_STAGES[0].id
    );
    setSelectedChoiceId(null);
    setHintText(null);
    setGuideEngine(null);
  }, [isOpen]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(completedIds));
    } catch {
      // The quest still works when browser storage is unavailable.
    }
  }, [completedIds]);

  if (!isOpen) return null;

  const selectStage = (stageId: string) => {
    setActiveStageId(stageId);
    setSelectedChoiceId(null);
    setHintText(null);
    setGuideEngine(null);
  };

  const requestHint = async () => {
    setIsLoadingHint(true);
    setHintText(activeStage.hint);
    try {
      const response = await fetch('/api/quest-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId: activeStage.id }),
      });
      if (!response.ok) throw new Error('Quest guide unavailable');
      const result = await response.json();
      if (typeof result.hint === 'string' && result.hint.trim()) {
        setHintText(result.hint.trim());
      }
      setGuideEngine(result.engine || 'Gợi ý Gemini');
    } catch {
      setGuideEngine('Manh mối trong sổ tư liệu');
    } finally {
      setIsLoadingHint(false);
    }
  };

  const handleAnswer = (choiceId: string) => {
    if (isCurrentComplete || isAnswerCorrect) return;
    setSelectedChoiceId(choiceId);
    if (choiceId === activeStage.correctChoiceId) {
      setCompletedIds((current) =>
        current.includes(activeStage.id) ? current : [...current, activeStage.id]
      );
    }
  };

  const advanceStage = () => {
    const nextStage = VIET_PHUC_QUEST_STAGES.find(
      (stage) => !completedIds.includes(stage.id)
    );
    if (nextStage) selectStage(nextStage.id);
  };

  const resetProgress = () => {
    setCompletedIds([]);
    setSelectedChoiceId(null);
    setHintText(null);
    setGuideEngine(null);
    setActiveStageId(VIET_PHUC_QUEST_STAGES[0].id);
  };

  const shareProgress = async () => {
    const message = `Tôi đã khám phá ${completedIds.length}/${VIET_PHUC_QUEST_STAGES.length} dấu ấn trong Việt Phục Quest. Đến lượt bạn!`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Việt Phục Quest', text: message });
      } else {
        await navigator.clipboard.writeText(message);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      // Sharing is optional; leave the quest state untouched if it is dismissed.
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#1C1917]/70 backdrop-blur-sm p-3 sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="quest-title"
        className="relative flex max-h-[min(900px,94vh)] w-full max-w-5xl flex-col overflow-hidden border border-[#CBB991] bg-[#F4EFE5] text-[#1C1917] shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#D8CDB8] bg-[#EEE5D5] px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#CBB991] bg-[#FBF9F5] text-[#9A3412]">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8B5E34]">
                Chơi · khám phá · phối đồ
              </p>
              <h2 id="quest-title" className="font-editorial text-lg font-bold sm:text-xl">
                Việt Phục Quest
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng Việt Phục Quest"
            className="flex h-10 w-10 items-center justify-center border border-[#D8CDB8] bg-[#FBF9F5] transition hover:border-[#9A3412]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden lg:grid-cols-[260px_minmax(0,1fr)] lg:grid-rows-1">
          <aside className="flex max-h-[260px] min-h-0 flex-col border-b border-[#D8CDB8] bg-[#EAE1D0] lg:max-h-none lg:border-b-0 lg:border-r">
            <div className="p-4 sm:p-5">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#786044]">
                    Hành trình của bạn
                  </p>
                  <p className="mt-1 font-editorial text-3xl font-bold">
                    {completedIds.length}
                    <span className="text-lg text-[#8A8173]">/{VIET_PHUC_QUEST_STAGES.length}</span>
                  </p>
                </div>
                <Trophy className="mb-1 h-6 w-6 text-[#A33B1E]" />
              </div>
              <div className="mt-3 h-2 overflow-hidden bg-[#D6CBB7]">
                <div
                  className="h-full bg-[#A33B1E] transition-[width] duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-[#655B4D]">
                Giải mật thư, đọc nguồn, rồi thử bộ đồ ngay trên mẫu 3D.
              </p>
              <button
                type="button"
                onClick={onOpenScan}
                className="mt-4 flex w-full items-center justify-center gap-2 border border-[#9A3412] bg-[#9A3412] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-[#7C2D12]"
              >
                <Camera className="h-4 w-4" /> Soi ảnh Việt Phục bằng AI
              </button>
            </div>

            <nav aria-label="Các chặng Quest" className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
              {VIET_PHUC_QUEST_STAGES.map((stage, index) => {
                const complete = completedIds.includes(stage.id);
                const active = stage.id === activeStage.id;
                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => selectStage(stage.id)}
                    className={`flex w-full items-center gap-3 border px-3 py-2.5 text-left transition ${
                      active
                        ? 'border-[#9A3412] bg-[#FBF9F5] shadow-sm'
                        : 'border-transparent hover:border-[#D0C2AA] hover:bg-white/50'
                    }`}
                  >
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${complete ? 'bg-[#2E7D5B] text-white' : active ? 'bg-[#9A3412] text-white' : 'bg-[#D8CDB8] text-[#5D5143]'}`}>
                      {complete ? <Check className="h-3.5 w-3.5" /> : `0${index + 1}`}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold">{stage.title}</span>
                      <span className="mt-0.5 block truncate text-[10px] text-[#776B5B]">{stage.chapter}</span>
                    </span>
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center justify-between border-t border-[#D8CDB8] p-3">
              <span className="flex items-center gap-1.5 text-[10px] text-[#736653]">
                <BadgeCheck className="h-3.5 w-3.5 text-[#2E7D5B]" /> Đọc rõ nguồn & diễn giải
              </span>
              <button
                type="button"
                onClick={resetProgress}
                className="inline-flex items-center gap-1 text-[10px] text-[#8A5B3D] hover:text-[#9A3412]"
              >
                <RotateCcw className="h-3 w-3" /> Chơi lại
              </button>
            </div>
          </aside>

          <main className="min-h-0 overflow-y-auto bg-[#FBF9F5]">
            <div className="mx-auto max-w-2xl p-4 sm:p-7">
              {isComplete ? (
                <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#D8C28D] bg-[#F7EBC8] text-[#9A3412] shadow-inner">
                    <Trophy className="h-9 w-9" />
                  </div>
                  <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.24em] text-[#8B5E34]">
                    Huy hiệu đã mở khóa
                  </p>
                  <h3 className="mt-2 font-editorial text-3xl font-bold">Người kể chuyện Việt Phục</h3>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-[#655B4D]">
                    Bạn đã mở đủ năm dấu ấn. Xem nguồn của từng câu chuyện, rồi mang bộ yêu thích sang studio 3D.
                  </p>
                  <div className="mt-5 max-w-xl border border-[#D7C9AA] bg-[#FBF9F5] p-4 text-left">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#806542]">Dấu ấn vừa mở · {activeStage.chapter}</p>
                    <p className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#58705E]">
                      {activeStage.knowledgeType === 'documented' ? <BadgeCheck className="h-3.5 w-3.5" /> : <Lightbulb className="h-3.5 w-3.5" />}
                      {activeStage.knowledgeType === 'documented' ? 'Thông tin có căn cứ tư liệu' : 'Cách diễn giải văn hóa'}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[#4F473C]">{activeStage.learningNote}</p>
                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-[#E4DAC8] pt-2">
                      <span className="text-[9px] text-[#58705E]">{activeStage.sourceLabel}</span>
                    </div>
                    {activeStage.sourceUrl && <a href={activeStage.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-[10px] font-semibold text-[#8D3E22] underline underline-offset-2">Mở bài nghiên cứu / tư liệu ↗</a>}
                  </div>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => onApplyCostume(activeStage.costumeId)}
                      className="inline-flex items-center gap-2 bg-[#9A3412] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#7C2D12]"
                    >
                      <Shirt className="h-4 w-4" /> Thử phối {costume?.name || 'cổ phục'}
                    </button>
                    <button
                      type="button"
                      onClick={shareProgress}
                      className="inline-flex items-center gap-2 border border-[#D8CDB8] px-4 py-2.5 text-xs font-semibold hover:border-[#9A3412]"
                    >
                      <Share2 className="h-4 w-4" /> {copied ? 'Đã chép thẻ' : 'Chia sẻ thành tích'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 border border-[#E0D2B8] bg-[#F6EFDF] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[#81582F]">
                      <Sparkles className="h-3.5 w-3.5" /> Chặng {VIET_PHUC_QUEST_STAGES.findIndex((stage) => stage.id === activeStage.id) + 1}
                    </span>
                    {isCurrentComplete && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#2E7D5B]">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Đã mở dấu ấn
                      </span>
                    )}
                  </div>

                  <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B5E34]">{activeStage.chapter}</p>
                  <h3 className="mt-1 font-editorial text-2xl font-bold leading-tight sm:text-3xl">{activeStage.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#655B4D]">
                    Lần theo manh mối, chọn đáp án, rồi mở thẻ tư liệu để biết câu chuyện phía sau bộ áo.
                  </p>

                  <section className="mt-6 border border-[#E1D7C5] bg-[#F5F0E7] p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7D9BE] text-[#8B4A28]">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#806542]">Mật thư</p>
                        <p className="mt-1 text-sm font-semibold leading-relaxed">{activeStage.question}</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {activeStage.choices.map((choice, index) => {
                        const selected = selectedChoiceId === choice.id;
                        const correct = choice.id === activeStage.correctChoiceId;
                        const reveal = isCurrentComplete && correct;
                        return (
                          <button
                            key={choice.id}
                            type="button"
                            disabled={isCurrentComplete}
                            onClick={() => handleAnswer(choice.id)}
                            className={`flex w-full items-start gap-3 border px-3 py-3 text-left text-xs leading-relaxed transition ${
                              reveal
                                ? 'border-[#4B8B69] bg-[#EAF3EA] text-[#214C37]'
                                : selected
                                  ? 'border-[#B2462B] bg-[#F8E6DC] text-[#7C2D12]'
                                  : 'border-[#DED3C0] bg-[#FBF9F5] hover:border-[#A33B1E] hover:bg-white'
                            } ${isCurrentComplete ? 'cursor-default' : 'cursor-pointer'}`}
                          >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current/30 text-[10px] font-bold">{String.fromCharCode(65 + index)}</span>
                            <span className="flex-1">{choice.label}</span>
                            {reveal && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
                            {selected && !correct && <span className="shrink-0 text-[10px] font-bold">Thử lại</span>}
                          </button>
                        );
                      })}
                    </div>

                    {selectedChoiceId && !isAnswerCorrect && !isCurrentComplete && (
                      <p role="status" className="mt-3 text-xs font-semibold text-[#9A3412]">
                        Chưa trúng manh mối này. Thử một đáp án khác nhé.
                      </p>
                    )}
                  </section>

                  {!isCurrentComplete ? (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={requestHint}
                        disabled={isLoadingHint}
                        className="inline-flex items-center gap-2 border border-[#D6C7AB] bg-[#FBF9F5] px-3 py-2 text-xs font-semibold text-[#674624] transition hover:border-[#A33B1E] disabled:opacity-60"
                      >
                        {isLoadingHint ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Lightbulb className="h-3.5 w-3.5" />}
                        {isLoadingHint ? 'Gemini đang gợi ý…' : 'Xin gợi ý từ Gemini'}
                      </button>
                      {hintText && (
                        <div className="mt-3 border-l-2 border-[#B88745] bg-[#F8F1E3] px-3 py-2.5 text-xs leading-relaxed text-[#5E4B35]">
                          <p>{hintText}</p>
                          {guideEngine && <p className="mt-1 text-[9px] uppercase tracking-wider text-[#927C5F]">{guideEngine}</p>}
                        </div>
                      )}
                    </div>
                  ) : (
                    <section className="mt-4 border border-[#BFD5C5] bg-[#EDF4EE] p-4">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#2E6A47]">
                        <CheckCircle2 className="h-4 w-4" /> Dấu ấn đã mở
                      </div>
                      <p className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#2E6A47]">
                        {activeStage.knowledgeType === 'documented' ? <BadgeCheck className="h-3.5 w-3.5" /> : <Lightbulb className="h-3.5 w-3.5" />}
                        {activeStage.knowledgeType === 'documented' ? 'Thông tin có căn cứ tư liệu' : 'Cách diễn giải văn hóa'}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-[#304C39]">{activeStage.learningNote}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[#CFE0D2] pt-2">
                        <span className="text-[9px] text-[#58705E]">{activeStage.sourceLabel}</span>
                      </div>
                      {activeStage.sourceUrl && <a href={activeStage.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-[10px] font-semibold text-[#2E6A47] underline underline-offset-2">Mở bài nghiên cứu / tư liệu ↗</a>}
                      <p className="mt-2 text-[10px] text-[#58705E]">
                        {correctChoice?.label ? `Manh mối: ${correctChoice.label}` : ''}
                      </p>
                    </section>
                  )}

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#E4DAC8] pt-4">
                    <button
                      type="button"
                      onClick={() => onApplyCostume(activeStage.costumeId)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8D3E22] hover:text-[#672D19]"
                    >
                      <Shirt className="h-3.5 w-3.5" /> Thử phối {costume?.name || 'bộ áo này'}
                    </button>
                    {isCurrentComplete && (
                      <button
                        type="button"
                        onClick={advanceStage}
                        className="inline-flex items-center gap-2 bg-[#1C1917] px-4 py-2.5 text-xs font-bold text-[#FBF9F5] transition hover:bg-[#3B3029]"
                      >
                        Chặng tiếp theo <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </section>
    </div>
  );
};
