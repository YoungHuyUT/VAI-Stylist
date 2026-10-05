import { describe, it, expect } from 'vitest';
import { validateSourceIds } from '../../ai/geminiClient';

describe('AI Output Validation & Cultural Grounding', () => {
  const allowedSources = ['src-nn-aomu', 'src-kddn-hdsl', 'src-dntl'];

  it('accepts output when all source IDs are within allowed input sources', () => {
    const validOutputSources = ['src-nn-aomu', 'src-kddn-hdsl'];
    expect(validateSourceIds(validOutputSources, allowedSources)).toBe(true);
  });

  it('rejects output with fabricated or hallucinated source IDs', () => {
    const invalidOutputSources = ['src-nn-aomu', 'fabricated-wikipedia-source'];
    expect(validateSourceIds(invalidOutputSources, allowedSources)).toBe(false);
  });

  it('rejects empty or non-array source outputs', () => {
    expect(validateSourceIds(null as any, allowedSources)).toBe(false);
    expect(validateSourceIds(undefined as any, allowedSources)).toBe(false);
  });
});
