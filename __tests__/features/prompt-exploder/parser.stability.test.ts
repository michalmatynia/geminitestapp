import { describe, expect, it } from 'vitest';

import {
  explodePromptText,
  updatePromptExploderDocument,
} from '@/features/prompt-exploder/parser';

const REFERENCE_PROMPT = [
  'REFERENCE',
  'RL1 (Target): keep',
  '',
  'CONSUMER',
  'Use RL1 and foo.bar',
  '',
  'PARAMS',
  'params = {"foo":{"bar":"x"}}',
].join('\n');

describe('prompt exploder parser stability', () => {
  it('keeps deterministic segment and auto-binding ids across repeated explosions', () => {
    const first = explodePromptText({ prompt: REFERENCE_PROMPT });
    const second = explodePromptText({ prompt: REFERENCE_PROMPT });

    expect(second.segments.map((segment) => segment.id)).toEqual(
      first.segments.map((segment) => segment.id)
    );
    expect(second.bindings.map((binding) => binding.id)).toEqual(
      first.bindings.map((binding) => binding.id)
    );
    expect(second.bindings.length).toBeGreaterThan(0);
  });

  it('reuses cached output text when only manual bindings are updated', () => {
    const base = explodePromptText({ prompt: REFERENCE_PROMPT });
    const next = updatePromptExploderDocument(base, base.segments, base.bindings);

    expect(next.reassembledPrompt).toBe(base.reassembledPrompt);
    expect(next.segments).toBe(base.segments);
  });
});
