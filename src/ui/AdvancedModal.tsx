import React, { useState } from 'react';
import { X, Copy, Check, Code2, Cpu } from 'lucide-react';
import { useOutfitState } from '../state/outfitStore';
import { toCanonicalOutfit } from '../state/outfitStore';

export interface AdvancedModalProps {
  isOpen: boolean;
  onClose: () => void;
  discoveredModels?: {
    imageModel: string;
    textModel: string;
    visionModel: string;
  };
}

export const AdvancedModal: React.FC<AdvancedModalProps> = ({
  isOpen,
  onClose,
  discoveredModels = {
    imageModel: 'gemini-3.1-flash-image',
    textModel: 'gemini-3.8-flash',
    visionModel: 'gemini-3.8-flash',
  },
}) => {
  const { outfit } = useOutfitState();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const jsonStr = JSON.stringify(toCanonicalOutfit(outfit), null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-[#F2EDE4] border border-[#DFD8C8] rounded-[12px] max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-[#1E1B18]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#DFD8C8] flex items-center justify-between bg-white/50">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-[#A33B1E]" />
            <h2 className="text-sm font-bold font-editorial uppercase tracking-wider text-[#1E1B18]">
              Nâng Cao · Diagnostics & Schema
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-black/5 rounded cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Discovered Model IDs */}
          <div className="p-3 bg-white rounded-[8px] border border-[#DFD8C8] space-y-2">
            <span className="font-bold text-[#1E1B18] flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <Cpu className="w-4 h-4 text-[#A33B1E]" />
              Model Discovery (Gemini Models Active)
            </span>
            <div className="grid grid-cols-1 gap-1 text-[11px] font-mono-tabular">
              <div className="flex justify-between py-0.5 border-b border-[#EBE6DF]">
                <span className="text-[#78716C]">Text Advisor:</span>
                <span className="font-bold text-[#1E1B18]">{discoveredModels.textModel}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-[#EBE6DF]">
                <span className="text-[#78716C]">Vision Scan:</span>
                <span className="font-bold text-[#1E1B18]">{discoveredModels.visionModel}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-[#78716C]">Image Synthesis:</span>
                <span className="font-bold text-[#1E1B18]">{discoveredModels.imageModel}</span>
              </div>
            </div>
          </div>

          {/* Raw JSON State */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#1E1B18] uppercase tracking-wider text-[11px]">
                Raw Outfit State (Canonical Schema)
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="px-2 py-1 rounded border border-[#DFD8C8] bg-white hover:bg-black/5 text-[#A33B1E] flex items-center gap-1 font-semibold cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#2E7D5B]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
              </button>
            </div>
            <pre className="p-3 bg-[#1E1B18] text-[#FDE68A] rounded-[8px] font-mono-tabular text-[11px] overflow-x-auto max-h-56">
              {jsonStr}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
