import { describe, expect, it } from 'vitest';

import {
  buildQueryErrorSignature,
  shouldEmitDedupedErrorToast,
} from '@/shared/hooks/query/useQueryErrorHandling';

describe('useQueryErrorHandling helpers', () => {
  it('builds stable signatures using query key and normalized message', () => {
    const signature = buildQueryErrorSignature(
      ['products', 'list'],
      ' Request timeout after 15000ms '
    );

    expect(signature).toBe('["products","list"]::request timeout after 15000ms');
  });

  it('suppresses duplicate toasts inside the dedupe window', () => {
    const history = new Map<string, number>();
    const signature = '["products"]::request timeout after 15000ms';

    const first = shouldEmitDedupedErrorToast({
      signature,
      dedupeWindowMs: 20_000,
      nowMs: 1_000,
      lastShownAtBySignature: history,
    });
    const second = shouldEmitDedupedErrorToast({
      signature,
      dedupeWindowMs: 20_000,
      nowMs: 5_000,
      lastShownAtBySignature: history,
    });

    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  it('allows re-emission after the dedupe window expires', () => {
    const history = new Map<string, number>();
    const signature = '["products"]::request timeout after 15000ms';

    shouldEmitDedupedErrorToast({
      signature,
      dedupeWindowMs: 2_000,
      nowMs: 1_000,
      lastShownAtBySignature: history,
    });
    const afterWindow = shouldEmitDedupedErrorToast({
      signature,
      dedupeWindowMs: 2_000,
      nowMs: 4_000,
      lastShownAtBySignature: history,
    });

    expect(afterWindow).toBe(true);
  });
});
