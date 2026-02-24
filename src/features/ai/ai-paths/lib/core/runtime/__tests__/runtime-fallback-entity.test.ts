import { describe, expect, it } from 'vitest';

import { buildFallbackEntity } from '@/features/ai/ai-paths/lib/core/runtime/utils';

describe('buildFallbackEntity', () => {
  it('returns an empty object (no synthetic fallback payload)', () => {
    const fallback = buildFallbackEntity();

    expect(fallback).toEqual({});
  });
});
