// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Use vi.resetModules() + dynamic re-import so module-level state starts fresh
// for each test (cachedIds, listeners, removalTimers are module-level singletons).

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

  // ── getQueuedProductIds / addQueuedProductId ────────────────────────────

  it('getQueuedProductIds returns an empty set when nothing has been added', () => {
    expect(ops.getQueuedProductIds().size).toBe(0);
  });

  it('addQueuedProductId makes the id visible via getQueuedProductIds', () => {
    ops.addQueuedProductId('product-1');
    expect(ops.getQueuedProductIds().has('product-1')).toBe(true);
  });

  it('addQueuedProductId is idempotent — same id twice stays size 1', () => {
    ops.addQueuedProductId('product-1');
    ops.addQueuedProductId('product-1');
    expect(ops.getQueuedProductIds().size).toBe(1);
  });

  it('addQueuedProductId ignores empty strings', () => {
    ops.addQueuedProductId('');
    expect(ops.getQueuedProductIds().size).toBe(0);
  });

  // ── removeQueuedProductId ───────────────────────────────────────────────

  it('removeQueuedProductId removes a previously added id', () => {
    ops.addQueuedProductId('product-1');
    ops.removeQueuedProductId('product-1');
    expect(ops.getQueuedProductIds().has('product-1')).toBe(false);
  });

  it('removeQueuedProductId is a no-op for an unknown id', () => {
    ops.addQueuedProductId('product-1');
    ops.removeQueuedProductId('product-unknown');
    expect(ops.getQueuedProductIds().size).toBe(1);
  });

  // ── markQueuedProductId ─────────────────────────────────────────────────

  it('markQueuedProductId adds the id immediately', () => {
    ops.markQueuedProductId('product-1', 30_000);
    expect(ops.getQueuedProductIds().has('product-1')).toBe(true);
  });

  it('markQueuedProductId auto-removes the id after the TTL elapses', () => {
    vi.useFakeTimers();
    ops.markQueuedProductId('product-1', 5_000);
    expect(ops.getQueuedProductIds().has('product-1')).toBe(true);

    vi.advanceTimersByTime(5_001);

    expect(ops.getQueuedProductIds().has('product-1')).toBe(false);
  });

  it('markQueuedProductId resets the removal timer when called a second time', () => {
    vi.useFakeTimers();
    ops.markQueuedProductId('product-1', 5_000);

    vi.advanceTimersByTime(4_000); // 4 s in — id still present
    expect(ops.getQueuedProductIds().has('product-1')).toBe(true);

    ops.markQueuedProductId('product-1', 5_000); // restart timer

    vi.advanceTimersByTime(4_000); // 8 s from first call — would have expired without reset
    expect(ops.getQueuedProductIds().has('product-1')).toBe(true);

    vi.advanceTimersByTime(1_100); // past the reset window
    expect(ops.getQueuedProductIds().has('product-1')).toBe(false);
  });

  it('markQueuedProductId enforces a 1 s minimum TTL', () => {
    vi.useFakeTimers();
    ops.markQueuedProductId('product-1', 0); // 0 ms → clamped to 1 000 ms
    expect(ops.getQueuedProductIds().has('product-1')).toBe(true);

    vi.advanceTimersByTime(999);
    expect(ops.getQueuedProductIds().has('product-1')).toBe(true);

    vi.advanceTimersByTime(2);
    expect(ops.getQueuedProductIds().has('product-1')).toBe(false);
  });

  // ── localStorage persistence ────────────────────────────────────────────

  it('persists ids to localStorage after addQueuedProductId', () => {
    ops.addQueuedProductId('product-1');
    const stored = JSON.parse(
      window.localStorage.getItem('queued-product-ids') ?? '[]'
    ) as string[];
    expect(stored).toContain('product-1');
  });

  it('removes the localStorage key entirely when the last id is removed', () => {
    ops.addQueuedProductId('product-1');
    ops.removeQueuedProductId('product-1');
    expect(window.localStorage.getItem('queued-product-ids')).toBeNull();
  });

  it('getQueuedProductIds restores ids from localStorage on first call', async () => {
    // Pre-seed storage before module load
    window.localStorage.setItem('queued-product-ids', JSON.stringify(['product-seed']));
    vi.resetModules();
    const freshOps = await import('./queued-product-ops');

    expect(freshOps.getQueuedProductIds().has('product-seed')).toBe(true);
  });

  it('getQueuedProductIds ignores malformed localStorage values gracefully', async () => {
    window.localStorage.setItem('queued-product-ids', '{not-an-array}');
    vi.resetModules();
    const freshOps = await import('./queued-product-ops');

    expect(freshOps.getQueuedProductIds().size).toBe(0);
  });

  // ── listener notifications ──────────────────────────────────────────────

  it('useQueuedProductIds returns current ids and updates when ids change', async () => {
    const { renderHook, act } = await import('@testing-library/react');
    const freshOps = ops;

    const { result } = renderHook(() => freshOps.useQueuedProductIds());
    expect(result.current.size).toBe(0);

    await act(() => {
      freshOps.addQueuedProductId('product-1');
    });

    expect(result.current.has('product-1')).toBe(true);

    await act(() => {
      freshOps.removeQueuedProductId('product-1');
    });

    expect(result.current.size).toBe(0);
  });
});
