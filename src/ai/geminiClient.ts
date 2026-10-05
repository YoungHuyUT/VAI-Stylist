import { Outfit, CulturalEvaluationResult } from '../types/costume';
import { hashOutfit } from '../state/outfitStore';
import { culturalData } from '../data/culturalDataLoader';

export interface AdvisorOutput {
  lookbook_title: string;
  cultural_message: string;
  history_fact: string;
  harmony_comment: string;
  source_ids: string[];
}

export interface ScanResult {
  garmentId: string | null;
  garmentName: string;
  mainColors: Array<{ name: string; hex: string }>;
  hasPattern: boolean;
  accessories: string[];
  confidence: number;
}

// In-memory cache for advisor responses keyed by hashOutfit
const advisorCache = new Map<string, AdvisorOutput>();
let activeAdvisorAbortController: AbortController | null = null;
let advisorDebounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Validates that an AI output's source_ids contains only IDs from the input knowledge.
 * Rejects any hallucinated source citation.
 */
export function validateSourceIds(outputSourceIds: string[], allowedSourceIds: string[]): boolean {
  if (!outputSourceIds || !Array.isArray(outputSourceIds)) return false;
  return outputSourceIds.every((id) => allowedSourceIds.includes(id));
}

/**
 * Debounced and cached Advisor caller (cancels in-flight requests on change, ~600ms debounce).
 */
export async function fetchAdvisorDebounced(
  outfit: Outfit,
  evaluation: CulturalEvaluationResult,
  onResult: (res: AdvisorOutput) => void
): Promise<void> {
  const hash = hashOutfit(outfit);

  // Return cached result immediately if available
  if (advisorCache.has(hash)) {
    onResult(advisorCache.get(hash)!);
    return;
  }

  // Cancel prior in-flight request
  if (activeAdvisorAbortController) {
    activeAdvisorAbortController.abort();
    activeAdvisorAbortController = null;
  }

  // Clear prior debounce timer
  if (advisorDebounceTimer) {
    clearTimeout(advisorDebounceTimer);
  }

  advisorDebounceTimer = setTimeout(async () => {
    const controller = new AbortController();
    activeAdvisorAbortController = controller;

    const costume = culturalData.costumes[outfit.costumeId];
    const lore = culturalData.loreCards.filter((l) => l.costumeId === outfit.costumeId);
    const allowedSources = costume?.sources || ['src-nn-aomu', 'src-kddn-hdsl'];

    const fallbackResponse: AdvisorOutput = {
      lookbook_title: `${costume?.name || 'Việt Phục'} Khí Chất`,
      cultural_message:
        evaluation.fired[0]?.message || 'Bản phối tôn vinh nét đẹp văn hóa truyền thống.',
      history_fact:
        costume?.meaning ||
        'Áo Ngũ Thân năm thân tượng trưng cho tứ thân phụ mẫu và chính bản thân người mặc.',
      harmony_comment: evaluation.harmony.notes[0] || `Hòa sắc ${evaluation.harmony.label}.`,
      source_ids: allowedSources.slice(0, 2),
    };

    try {
      const resp = await fetch('/api/advisor', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gender: outfit.gender,
          outfit,
          event: outfit.event,
          remix: outfit.remix,
          ruleResults: evaluation.fired,
          harmonyResult: evaluation.harmony,
          knowledge: {
            costumeName: costume?.name || '',
            meaning: costume?.meaning || '',
            features: costume?.features || [],
            lore: lore.map((l) => l.text),
            allowedSources,
          },
        }),
      });

      if (resp.ok) {
        const json = await resp.json();
        if (json.advisor) {
          const adv = json.advisor as AdvisorOutput;
          // Validate source citations strictly
          if (validateSourceIds(adv.source_ids, allowedSources)) {
            advisorCache.set(hash, adv);
            onResult(adv);
            return;
          }
        }
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      console.warn('Advisor fetch aborted or failed, using fallback rule text', e);
    }

    // Safe deterministic fallback
    advisorCache.set(hash, fallbackResponse);
    onResult(fallbackResponse);
  }, 600);
}

/**
 * Scans a user photo using Gemini 3.8 Flash Vision to pick matching costume and colors.
 */
export async function scanCostumeFromPhoto(photoBase64: string): Promise<ScanResult> {
  const resp = await fetch('/api/scan-costume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photoBase64 }),
  });
  if (!resp.ok) {
    throw new Error('Lỗi khi quét ảnh trang phục');
  }
  const json = await resp.json();
  return json.scan;
}
