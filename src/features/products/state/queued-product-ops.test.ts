// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type QueuedProductOps = typeof import('./queued-product-ops');

describe('queued-product-ops', () => {
  let ops: QueuedProductOps;

  beforeEach(async () => {
    vi.resetModules();
    window.localStorage.clear();
    ops = await import('./queued-product-ops');
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it('returns an empty set when nothing has been added', () => {
    expect(ops.getQueuedProductIds().size).toBe(0);
  });

  it('tracks AI-run queued ids separately from offline sources', () => {
    const updateSource = ops.buildQueuedProductOfflineMutationSource('update');
    const aiRunSource = ops.buildQueuedProductAiRunSource('run-1');
    if (!aiRunSource) throw new Error('Expected ai-run source');

    ops.addQueuedProductSource('product-offline', updateSource);
    ops.addQueuedProductSource('product-run', aiRunSource);

    expect(ops.getQueuedProductIds()).toEqual(
      new Set(['product-offline', 'product-run'])
    );
    expect(ops.getQueuedAiRunProductIds()).toEqual(new Set(['product-run']));
  });

  it('keeps a product queued while at least one source remains', () => {
    const updateSource = ops.buildQueuedProductOfflineMutationSource('update');
    const aiRunSource = ops.buildQueuedProductAiRunSource('run-1');
    if (!aiRunSource) throw new Error('Expected ai-run source');

    ops.addQueuedProductSource('product-1', updateSource);
    ops.addQueuedProductSource('product-1', aiRunSource);

    expect(ops.getQueuedProductIds()).toEqual(new Set(['product-1']));
    expect(ops.getQueuedProductSources('product-1')).toEqual(new Set([updateSource, aiRunSource]));

    ops.removeQueuedProductSource('product-1', aiRunSource);

    expect(ops.getQueuedProductIds()).toEqual(new Set(['product-1']));
    expect(ops.getQueuedProductSources('product-1')).toEqual(new Set([updateSource]));

    ops.removeQueuedProductSource('product-1', updateSource);

    expect(ops.getQueuedProductIds().size).toBe(0);
  });

  it('expires only the timed source and leaves persistent sources intact', () => {
    vi.useFakeTimers();
    const updateSource = ops.buildQueuedProductOfflineMutationSource('update');
    const aiRunSource = ops.buildQueuedProductAiRunSource('run-ttl');
    if (!aiRunSource) throw new Error('Expected ai-run source');

    ops.addQueuedProductSource('product-1', updateSource);
    ops.markQueuedProductSource('product-1', aiRunSource, 5_000);

    expect(ops.getQueuedProductSources('product-1')).toEqual(new Set([updateSource, aiRunSource]));

    vi.advanceTimersByTime(5_001);

    expect(ops.getQueuedProductIds()).toEqual(new Set(['product-1']));
    expect(ops.getQueuedProductSources('product-1')).toEqual(new Set([updateSource]));
  });

  it('resets the expiry for the same timed source when re-marked', () => {
    vi.useFakeTimers();
    const aiRunSource = ops.buildQueuedProductAiRunSource('run-reset');
    if (!aiRunSource) throw new Error('Expected ai-run source');

    ops.markQueuedProductSource('product-1', aiRunSource, 5_000);
    vi.advanceTimersByTime(4_000);
    ops.markQueuedProductSource('product-1', aiRunSource, 5_000);

    vi.advanceTimersByTime(4_000);
    expect(ops.getQueuedProductIds()).toEqual(new Set(['product-1']));

    vi.advanceTimersByTime(1_100);
    expect(ops.getQueuedProductIds().size).toBe(0);
  });

  it('persists source-aware entries to localStorage', () => {
    const updateSource = ops.buildQueuedProductOfflineMutationSource('update');
    ops.addQueuedProductSource('product-1', updateSource);

    const stored = JSON.parse(
      window.localStorage.getItem('queued-product-ids') ?? 'null'
    ) as {
      version: number;
      products: Record<string, Array<{ source: string }>>;
    } | null;

    expect(stored?.version).toBe(2);
    expect(stored?.products['product-1']).toEqual([{ source: updateSource }]);
  });

  it('restores source-aware storage values and prunes expired sources', async () => {
    const now = Date.now();
    window.localStorage.setItem(
      'queued-product-ids',
      JSON.stringify({
        version: 2,
        products: {
          'product-1': [
            { source: 'offline:update' },
            { source: 'ai-run:run-active', expiresAt: now + 10_000 },
            { source: 'ai-run:run-expired', expiresAt: now - 10_000 },
          ],
        },
      })
    );

    vi.resetModules();
    const freshOps = await import('./queued-product-ops');

    expect(freshOps.getQueuedProductIds()).toEqual(new Set(['product-1']));
    expect(freshOps.getQueuedProductSources('product-1')).toEqual(
      new Set(['offline:update', 'ai-run:run-active'])
    );
  });

  it('ignores malformed localStorage values gracefully', async () => {
    window.localStorage.setItem('queued-product-ids', '{not-valid-json}');
    vi.resetModules();
    const freshOps = await import('./queued-product-ops');

    expect(freshOps.getQueuedProductIds().size).toBe(0);
  });

  it('useQueuedProductIds reflects source-aware changes', async () => {
    const { renderHook, act } = await import('@testing-library/react');
    const updateSource = ops.buildQueuedProductOfflineMutationSource('update');
    const aiRunSource = ops.buildQueuedProductAiRunSource('run-live');
    if (!aiRunSource) throw new Error('Expected ai-run source');

    const { result } = renderHook(() => ops.useQueuedProductIds());
    expect(result.current.size).toBe(0);

    act(() => {
      ops.addQueuedProductSource('product-1', updateSource);
      ops.addQueuedProductSource('product-1', aiRunSource);
    });
    expect(result.current).toEqual(new Set(['product-1']));

    act(() => {
      ops.removeQueuedProductSource('product-1', aiRunSource);
    });
    expect(result.current).toEqual(new Set(['product-1']));

    act(() => {
      ops.removeQueuedProductSource('product-1', updateSource);
    });
    expect(result.current.size).toBe(0);
  });

  it('useQueuedAiRunProductIds reflects only ai-run source changes', async () => {
    const { renderHook, act } = await import('@testing-library/react');
    const updateSource = ops.buildQueuedProductOfflineMutationSource('update');
    const aiRunSource = ops.buildQueuedProductAiRunSource('run-live');
    if (!aiRunSource) throw new Error('Expected ai-run source');

    const { result } = renderHook(() => ops.useQueuedAiRunProductIds());
    expect(result.current.size).toBe(0);

    act(() => {
      ops.addQueuedProductSource('product-1', updateSource);
    });
    expect(result.current.size).toBe(0);

    act(() => {
      ops.addQueuedProductSource('product-1', aiRunSource);
    });
    expect(result.current).toEqual(new Set(['product-1']));

    act(() => {
      ops.removeQueuedProductSource('product-1', aiRunSource);
    });
    expect(result.current.size).toBe(0);
  });

  it('keeps queued ai-run hook state stable when only source expiry is refreshed', async () => {
    const { renderHook, act } = await import('@testing-library/react');
    vi.useFakeTimers();
    const aiRunSource = ops.buildQueuedProductAiRunSource('run-stable');
    if (!aiRunSource) throw new Error('Expected ai-run source');

    const { result } = renderHook(() => ops.useQueuedAiRunProductIds());

    act(() => {
      ops.markQueuedProductSource('product-1', aiRunSource, 5_000);
    });
    const stableReference = result.current;

    act(() => {
      vi.advanceTimersByTime(1_000);
      ops.markQueuedProductSource('product-1', aiRunSource, 5_000);
    });

    expect(result.current).toBe(stableReference);
    expect(result.current).toEqual(new Set(['product-1']));
  });
});
