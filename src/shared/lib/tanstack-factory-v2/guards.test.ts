import { describe, expect, it } from 'vitest';

import {
  DEFAULT_STALE_TIME_MS,
  applyInfiniteQueryRuntimeGuards,
  applyQueryRuntimeGuards,
} from './guards';

describe('tanstack runtime guards', () => {
  it('applies query defaults when runtime options are omitted', () => {
    const guarded = applyQueryRuntimeGuards({
      queryKey: ['settings'],
      queryFn: async () => [],
    });

    expect(guarded.staleTime).toBe(DEFAULT_STALE_TIME_MS);
    expect(guarded.refetchOnMount).toBe(false);
    expect(guarded.refetchOnWindowFocus).toBe(false);
    expect(guarded.refetchOnReconnect).toBe(false);
    expect(guarded.refetchIntervalInBackground).toBe(false);
    expect(guarded.refetchInterval).toBeUndefined();
  });

  it('forces refetchInterval off when a query is statically disabled', () => {
    const guarded = applyQueryRuntimeGuards({
      queryKey: ['settings'],
      queryFn: async () => [],
      enabled: false,
      refetchInterval: 5000,
    });

    expect(guarded.refetchInterval).toBe(false);
  });

  it('sanitizes invalid infinite-query refetch intervals', () => {
    const guarded = applyInfiniteQueryRuntimeGuards({
      queryKey: ['settings'],
      queryFn: async () => ({ items: [], nextCursor: null }),
      initialPageParam: null,
      getNextPageParam: () => null,
      refetchInterval: 0,
    });

    expect(guarded.refetchInterval).toBe(false);
  });
});
