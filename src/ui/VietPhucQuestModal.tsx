import React, { useEffect, useRef, useState } from 'react';
import {
  BadgeCheck,
  Check,
  Compass,
  Lightbulb,
  RotateCcw,
  Shirt,
  Sparkles,
  Trophy,
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { VIET_PHUC_QUEST_STAGES } from '../data/vietPhucQuest';
import { culturalData } from '../data/culturalDataLoader';
import { TOP_GARMENTS } from '../data/vietPhucData';

const PROGRESS_KEY = 'vai-stylist:quest-progress:v2';

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
}) => {
  const [completedIds, setCompletedIds] = useState<string[]>(readSavedProgress);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState<boolean>(false);

  const activeStage = VIET_PHUC_QUEST_STAGES[currentIndex] || VIET_PHUC_QUEST_STAGES[0];
  const costume = culturalData.costumes[activeStage.costumeId];
  const stageGarment = TOP_GARMENTS.find(
    (garment) => garment.id === activeStage.costumeId
  );
  const isCurrentComplete = completedIds.includes(activeStage.id);
  const isAnswered = selectedChoiceId !== null || isCurrentComplete;
  const isAnswerCorrect =
    selectedChoiceId === activeStage.correctChoiceId || isCurrentComplete;
  const isAllComplete = completedIds.length === VIET_PHUC_QUEST_STAGES.length;
  const progressPercent = Math.round(
    (completedIds.length / VIET_PHUC_QUEST_STAGES.length) * 100
  );

  useEffect(() => {
    if (!isOpen) return;
    const firstIncompleteIdx = VIET_PHUC_QUEST_STAGES.findIndex(
      (stage) => !completedIds.includes(stage.id)
    );
    setCurrentIndex(firstIncompleteIdx >= 0 ? firstIncompleteIdx : 0);
    setSelectedChoiceId(null);
    setShowHint(false);
  }, [isOpen]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(completedIds));
    } catch {
      // Ignore if storage is disabled
    }
  }, [completedIds]);

  if (!isOpen) return null;

  const goToStage = (idx: number) => {
    setCurrentIndex(idx);
    setSelectedChoiceId(null);
    setShowHint(false);
  };

  const handleSelectChoice = (choiceId: string) => {
    if (isCurrentComplete) return;
    setSelectedChoiceId(choiceId);
    if (choiceId === activeStage.correctChoiceId) {
      setCompletedIds((current) =>
        current.includes(activeStage.id) ? current : [...current, activeStage.id]
      );
    }
  };

  const handleNext = () => {
    if (currentIndex < VIET_PHUC_QUEST_STAGES.length - 1) {
      goToStage(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      goToStage(currentIndex - 1);
    }
  };

  const handleReset = () => {
    setCompletedIds([]);
    setCurrentIndex(0);
    setSelectedChoiceId(null);
    setShowHint(false);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#1C1917]/75 backdrop-blur-sm p-3 sm:p-5">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-title"
        className="relative flex max-h-[min(860px,94vh)] w-full max-w-3xl flex-col overflow-hidden border border-[#CBB991] bg-[#FBF9F5] text-[#1C1917] shadow-2xl"
      >
        {/* Header: Clean & Minimalist */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#DFD8C8] bg-[#F4EFE5] px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#9A3412] text-[#FDE68A] shadow-xs">
              <Compass className="h-4 w-4" />
            </div>
            <div>
              <h2 id="quiz-title" className="font-editorial text-base sm:text-lg font-bold text-[#1C1917]">
                Khảo Cứu Điển Tích Việt Phục
              </h2>
              <p className="text-[10px] text-[#786044] font-medium">
                10 câu đố lịch sử · Cải cách y phục & Triết lý cổ phong
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#EBE4D5] border border-[#D5CBB4] text-[11px] font-bold text-[#78350F]">
              <Trophy className="w-3.5 h-3.5 text-[#9A3412]" />
              <span>
                {completedIds.length}/{VIET_PHUC_QUEST_STAGES.length} câu
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng Quiz"
              className="flex h-8 w-8 items-center justify-center border border-[#DFD8C8] bg-[#FBF9F5] text-[#686259] hover:text-[#1C1917] hover:border-[#1C1917] transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-[#E5DDCB] w-full">
          <div
            className="h-full bg-[#9A3412] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Question Selector Tabs (1 to 10 Pills) */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto border-b border-[#DFD8C8] bg-[#EFE9DC] px-3 py-2 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            {VIET_PHUC_QUEST_STAGES.map((stage, idx) => {
              const isDone = completedIds.includes(stage.id);
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => goToStage(idx)}
                  className={`h-7 min-w-[28px] px-1.5 flex items-center justify-center text-xs font-mono-tabular font-bold transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-[#9A3412] text-white shadow-xs'
                      : isDone
                      ? 'bg-[#2E7D5B] text-white'
                      : 'bg-[#DFD8C8] text-[#57534E] hover:bg-[#D5CBB4]'
                  }`}
                  title={`${stage.title} (${stage.era})`}
                >
                  {isDone && !isCurrent ? <Check className="w-3 h-3" /> : idx + 1}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="text-[10px] text-[#786044] hover:text-[#9A3412] flex items-center gap-1 transition-colors shrink-0 ml-2 cursor-pointer font-medium"
            title="Làm lại từ đầu"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Chơi lại</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {isAllComplete && isAnswerCorrect && (
            <div className="p-3 bg-[#ECFDF5] border border-[#10B981]/40 text-[#065F46] flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎉</span>
                <div>
                  <strong className="text-xs font-bold block">
                    Xuất sắc! Bạn đã hoàn thành 100% Khảo Cứu Việt Phục
                  </strong>
                  <p className="text-[11px] text-[#047857]">
                    Danh hiệu: Bậc Thầy Điển Tích & Sử Liệu Cổ Phong.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onApplyCostume(activeStage.costumeId)}
                className="px-2.5 py-1 text-[11px] font-bold bg-[#047857] hover:bg-[#065F46] text-white transition-colors cursor-pointer shrink-0"
              >
                Mặc Lên 3D
              </button>
            </div>
          )}

          {/* Era and Chapter Badge */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#EAE2D2] text-[#78350F] border border-[#D8CDB8]">
                {activeStage.era}
              </span>
              <span className="text-xs text-[#686259] font-medium">
                {activeStage.chapter}
              </span>
            </div>

            {isCurrentComplete && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2E7D5B]">
                <CheckCircle2 className="w-3.5 h-3.5" /> Đã hoàn thành
              </span>
            )}
          </div>

          {/* Question Title & Prompt */}
          <div className="space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold font-editorial text-[#1C1917] leading-snug">
              Câu {currentIndex + 1}: {activeStage.question}
            </h3>
          </div>

          {/* Multiple Choices */}
          <div className="space-y-2 pt-1">
            {activeStage.choices.map((choice, cIdx) => {
              const letter = String.fromCharCode(65 + cIdx);
              const isSelected = selectedChoiceId === choice.id;
              const isCorrectChoice = choice.id === activeStage.correctChoiceId;
              const showResult = isAnswered;

              let choiceStyle =
                'border-[#DFD8C8] bg-[#F4EFE5] text-[#1C1917] hover:border-[#9A3412] hover:bg-[#FAF7F2]';

              if (showResult) {
                if (isCorrectChoice) {
                  choiceStyle =
                    'border-[#10B981] bg-[#ECFDF5] text-[#065F46] font-semibold';
                } else if (isSelected && !isCorrectChoice) {
                  choiceStyle =
                    'border-[#EF4444] bg-[#FEF2F2] text-[#991B1B]';
                } else {
                  choiceStyle = 'border-[#DFD8C8] bg-[#F4EFE5]/50 text-[#78716C] opacity-60';
                }
              }

              return (
                <button
                  key={choice.id}
                  type="button"
                  disabled={isCurrentComplete}
                  onClick={() => handleSelectChoice(choice.id)}
                  className={`w-full p-3 text-left border flex items-start gap-3 transition-all cursor-pointer ${choiceStyle}`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center text-xs font-bold font-mono-tabular ${
                      showResult && isCorrectChoice
                        ? 'bg-[#10B981] text-white'
                        : showResult && isSelected && !isCorrectChoice
                        ? 'bg-[#EF4444] text-white'
                        : 'bg-[#DFD8C8] text-[#1C1917]'
                    }`}
                  >
                    {showResult && isCorrectChoice ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : showResult && isSelected && !isCorrectChoice ? (
                      <XCircle className="w-3.5 h-3.5" />
                    ) : (
                      letter
                    )}
                  </span>
                  <span className="text-xs sm:text-sm leading-relaxed pt-0.5">
                    {choice.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Learning Note & Historical Explanation */}
          {isAnswered && (
            <div
              className={`p-3.5 sm:p-4 border text-xs leading-relaxed space-y-2 animate-in fade-in duration-200 ${
                isAnswerCorrect
                  ? 'bg-[#F0FDF4] border-[#86EFAC] text-[#14532D]'
                  : 'bg-[#FFFBEB] border-[#FDE68A] text-[#78350F]'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px]">
                <BadgeCheck className="w-4 h-4 text-[#2E7D5B]" />
                <span>Điển tích lịch sử & Sử liệu</span>
              </div>
              <p className="leading-relaxed text-[#1C1917] font-normal">
                {activeStage.learningNote}
              </p>
              <div className="pt-1.5 border-t border-black/10 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#57534E]">
                <span>Nguồn: {activeStage.sourceLabel}</span>
                {stageGarment && (
                  <button
                    type="button"
                    onClick={() => onApplyCostume(activeStage.costumeId)}
                    className="font-bold text-[#9A3412] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Shirt className="w-3 h-3" />
                    <span>Thử {stageGarment.baseName} lên 3D Studio →</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Hint Trigger */}
          {!isAnswered && (
            <div className="pt-1">
              {!showHint ? (
                <button
                  type="button"
                  onClick={() => setShowHint(true)}
                  className="text-[11px] text-[#786044] hover:text-[#9A3412] flex items-center gap-1 transition-colors cursor-pointer font-medium"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-[#B45309]" />
                  <span>Cần manh mối gợi ý?</span>
                </button>
              ) : (
                <div className="p-2.5 bg-[#FFFBEB] border border-[#FDE68A] text-[#78350F] text-xs leading-relaxed flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
                  <p>
                    <strong>Manh mối:</strong> {activeStage.hint}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Controls: Prev / Next */}
        <div className="flex shrink-0 items-center justify-between border-t border-[#DFD8C8] bg-[#F4EFE5] px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`px-3 py-1.5 text-xs font-medium border flex items-center gap-1.5 transition-colors ${
              currentIndex === 0
                ? 'opacity-40 cursor-not-allowed border-[#DFD8C8] bg-transparent text-[#A8A29E]'
                : 'border-[#DFD8C8] bg-[#FBF9F5] text-[#1C1917] hover:border-[#1C1917] cursor-pointer'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Câu trước</span>
          </button>

          <div className="flex items-center gap-2">
            {stageGarment && (
              <button
                type="button"
                onClick={() => onApplyCostume(activeStage.costumeId)}
                className="hidden sm:flex px-3 py-1.5 text-xs font-semibold border border-[#9A3412] bg-[#FBF9F5] text-[#9A3412] hover:bg-[#9A3412] hover:text-white transition-colors items-center gap-1.5 cursor-pointer"
              >
                <Shirt className="w-3.5 h-3.5" />
                <span>Xem 3D</span>
              </button>
            )}

            {currentIndex < VIET_PHUC_QUEST_STAGES.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-1.5 text-xs font-bold bg-[#9A3412] hover:bg-[#7C2D12] text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <span>Câu tiếp theo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-bold bg-[#1C1917] hover:bg-[#2E7D5B] text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <span>Hoàn tất & Về Studio</span>
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
