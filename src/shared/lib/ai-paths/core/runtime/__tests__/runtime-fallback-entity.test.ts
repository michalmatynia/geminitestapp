import { describe, expect, it } from 'vitest';

import { buildFallbackEntity } from '@/shared/lib/ai-paths/core/runtime/utils';

describe('buildFallbackEntity', () => {
  it('returns an empty object (no synthetic fallback payload)', () => {
    const fallback = buildFallbackEntity();

    expect(fallback).toEqual({});
  });
});
