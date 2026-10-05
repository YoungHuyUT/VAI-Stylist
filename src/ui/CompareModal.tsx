import React from 'react';
import { X, Columns, Check, Trash2, ArrowRight } from 'lucide-react';
import { Outfit } from '../types/costume';
import { culturalData } from '../data/culturalDataLoader';
import { evaluate } from '../engine/culturalGuard';

export interface SavedLook {
  id: string;
  outfit: Outfit;
  imageUrl?: string;
  createdAt: number;
}

export interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedLooks: SavedLook[];
  onApplyLook: (outfit: Outfit) => void;
  onDeleteLook: (id: string) => void;
}

export const CompareModal: React.FC<CompareModalProps> = ({
  isOpen,
  onClose,
  savedLooks,
  onApplyLook,
  onDeleteLook,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-[#F2EDE4] border border-[#DFD8C8] rounded-[12px] max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-[#1E1B18]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#DFD8C8] flex items-center justify-between bg-white/50">
          <div className="flex items-center gap-2">
            <Columns className="w-5 h-5 text-[#A33B1E]" />
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wider font-editorial">
                So Sánh Các Bản Phối ({savedLooks.length}/3)
              </h3>
              <span className="text-[11px] text-[#78716C]">
                Lưu tối đa 3 look trong phiên để đối chiếu màu sắc và bối cảnh mặc
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {savedLooks.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#78716C] space-y-2">
              <Columns className="w-8 h-8 mx-auto text-[#DFD8C8]" />
              <p className="font-bold text-[#1E1B18]">Chưa có bản phối nào được lưu để so sánh.</p>
              <p>Hoàn thiện một bản phối, mở Lookbook rồi nhấn “Lưu look” để bắt đầu so sánh.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {savedLooks.map((look) => {
                const costume = culturalData.costumes[look.outfit.costumeId];
                const evalResult = evaluate(look.outfit, culturalData);

                return (
                  <div
                    key={look.id}
                    className="bg-white rounded-[10px] border border-[#DFD8C8] p-3.5 space-y-3 shadow-xs flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      {/* Look Image / Snapshot */}
                      <div className="aspect-3/4 rounded-[8px] bg-[#F2EDE4] overflow-hidden border border-[#DFD8C8] flex items-center justify-center">
                        {look.imageUrl ? (
                          <img
                            src={look.imageUrl}
                            alt="Bản phối"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-[11px] text-[#78716C]">Không có ảnh chụp</span>
                        )}
                      </div>

                      {/* Title & Info */}
                      <div>
                        <h4 className="font-bold text-xs text-[#1E1B18] font-editorial">
                          {costume?.name || 'Áo Ngũ Thân'}
                        </h4>
                        <p className="text-[11px] text-[#78716C]">
                          {look.outfit.event} · Remix: {look.outfit.remix}%
                        </p>
                      </div>

                      {/* Swatches */}
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/20"
                          style={{ backgroundColor: look.outfit.colors.ao }}
                          title="Màu áo"
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/20"
                          style={{ backgroundColor: look.outfit.colors.quan }}
                          title="Màu quần"
                        />
                        <span className="text-[#78716C]">
                          Hòa sắc: <strong>{evalResult.harmony.score}/100</strong>
                        </span>
                      </div>

                      {/* Status Tag */}
                      <div
                        className={`px-2 py-1 rounded text-[10px] font-bold ${
                          evalResult.status === 'SAFE'
                            ? 'bg-[#2E7D5B]/15 text-[#2E7D5B]'
                            : evalResult.status === 'WARNING'
                            ? 'bg-[#B7791F]/15 text-[#B7791F]'
                            : 'bg-[#B3261E]/15 text-[#B3261E]'
                        }`}
                      >
                        {evalResult.status === 'SAFE' && '✓ Hợp bối cảnh'}
                        {evalResult.status === 'WARNING' && '⚠ Có thể cân nhắc thêm'}
                        {evalResult.status === 'CRITICAL' && '✖ Có thể chưa hợp bối cảnh'}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-[#DFD8C8] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onDeleteLook(look.id)}
                        className="p-1.5 text-[#78716C] hover:text-[#B3261E] rounded cursor-pointer"
                        title="Xóa look"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onApplyLook(look.outfit);
                          onClose();
                        }}
                        className="px-3 py-1.5 bg-[#A33B1E] text-white text-[11px] font-bold rounded-[6px] hover:bg-[#8A3017] flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>Áp dụng</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
