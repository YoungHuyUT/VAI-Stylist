import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, ShieldAlert, Wand2, BookOpen, X, ExternalLink } from 'lucide-react';
import { CulturalEvaluationResult, Rule } from '../types/costume';
import { culturalData } from '../data/culturalDataLoader';

export interface StatusChipProps {
  evaluation: CulturalEvaluationResult;
  onApplyFix?: (fix: Record<string, unknown>) => void;
}

export const StatusChip: React.FC<StatusChipProps> = ({ evaluation, onApplyFix }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { status, fired, harmony, suggestions } = evaluation;

  const topRule = fired[0];
  const summaryMessage = topRule
    ? topRule.message
    : status === 'SAFE'
    ? 'Bản phối đạt chuẩn mực mỹ tục Cổ Phục truyền thống.'
    : 'Bản phối có điểm cần lưu ý.';

  const dotColor =
    status === 'SAFE'
      ? 'bg-[#2E7D5B]'
      : status === 'WARNING'
      ? 'bg-[#B7791F]'
      : 'bg-[#B3261E]';

  const badgeBorder =
    status === 'SAFE'
      ? 'border-[#2E7D5B]/30 bg-[#2E7D5B]/8 text-[#1E1B18]'
      : status === 'WARNING'
      ? 'border-[#B7791F]/40 bg-[#B7791F]/10 text-[#1E1B18]'
      : 'border-[#B3261E]/40 bg-[#B3261E]/10 text-[#1E1B18]';

  return (
    <div className="relative inline-block w-full">
      {/* Slim Status Chip below Viewport */}
      <div
        className={`px-3 py-2 border rounded-[12px] flex items-center justify-between gap-2.5 transition-all text-xs ${badgeBorder}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor} animate-pulse`} />
          <span className="font-semibold truncate">{summaryMessage}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {suggestions.length > 0 && onApplyFix && suggestions[0].fix && (
            <button
              type="button"
              onClick={() => onApplyFix(suggestions[0].fix!)}
              className="px-2.5 py-1 text-[11px] font-semibold bg-[#A33B1E] hover:bg-[#8A3017] text-[#F2EDE4] rounded-[8px] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Wand2 className="w-3 h-3" />
              <span>Sửa chuẩn</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="px-2 py-1 text-[11px] font-bold text-[#A33B1E] hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>Vì sao?</span>
          </button>
        </div>
      </div>

      {/* Popover with reason, sources and academic citations */}
      {isOpen && (
        <div className="absolute left-0 right-0 bottom-full mb-2 z-40 bg-[#F2EDE4] border border-[#DFD8C8] rounded-[12px] p-4 shadow-xl text-xs space-y-3 max-h-[380px] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-[#DFD8C8] pb-2">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#1E1B18]">
              {status === 'SAFE' && <CheckCircle2 className="w-4 h-4 text-[#2E7D5B]" />}
              {status === 'WARNING' && <AlertTriangle className="w-4 h-4 text-[#B7791F]" />}
              {status === 'CRITICAL' && <ShieldAlert className="w-4 h-4 text-[#B3261E]" />}
              <span>Thẩm Định Quy Chuẩn & Nguồn Gốc</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-black/5 rounded cursor-pointer text-[#1E1B18]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Fired rules list */}
          <div className="space-y-2.5">
            {fired.map((rule) => {
              const ruleSources = (rule.sources || [])
                .map((sId) => culturalData.sources[sId])
                .filter(Boolean);

              return (
                <div
                  key={rule.id}
                  className="bg-white/70 p-3 rounded-[8px] border border-[#DFD8C8] space-y-1.5"
                >
                  <p className="font-semibold text-[#1E1B18]">{rule.message}</p>
                  <p className="text-[#44403C] leading-relaxed text-[11px]">{rule.reason}</p>

                  {/* Academic Source Badge (N1: verified === true AND sources is non-empty) */}
                  <div className="pt-1.5 border-t border-[#DFD8C8]/60 flex flex-wrap items-center gap-2">
                    {rule.verified && rule.sources && rule.sources.length > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#2E7D5B]/15 text-[#2E7D5B]">
                        <BookOpen className="w-3 h-3" />
                        <span>Đã đối chiếu nguồn</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-black/5 text-[#78716C]">
                        <span>Chưa đối chiếu nguồn</span>
                      </span>
                    )}

                    {ruleSources.map((src) => (
                      <span
                        key={src.id}
                        className="text-[10px] text-[#78716C] italic"
                        title={src.note || src.title}
                      >
                        Nguồn: {src.title} {src.year ? `(${src.year})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Harmony Notes */}
          {harmony.notes.length > 0 && (
            <div className="p-2.5 bg-[#B7791F]/10 border border-[#B7791F]/30 rounded-[8px] text-[11px] text-[#78350F] space-y-1">
              <span className="font-bold block">Đánh giá hòa sắc OKLCH:</span>
              <ul className="list-disc pl-4 space-y-0.5">
                {harmony.notes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
