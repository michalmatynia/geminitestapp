import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { addQueuedProductIdMock, removeQueuedProductIdMock } = vi.hoisted(() => ({
  addQueuedProductIdMock: vi.fn(),
  removeQueuedProductIdMock: vi.fn(),
}));

vi.mock('@/features/products/state/queued-product-ops', () => ({
  addQueuedProductId: (...args: unknown[]) => addQueuedProductIdMock(...args),
  removeQueuedProductId: (...args: unknown[]) => removeQueuedProductIdMock(...args),
}));

import { useProductAiPathsRunSync } from './useProductAiPathsRunSync';

describe('useProductAiPathsRunSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    addQueuedProductIdMock.mockReset();
    removeQueuedProductIdMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('queues and clears product badge from canonical ai-path-run-enqueued events', () => {
    renderHook(() => useProductAiPathsRunSync());

    window.dispatchEvent(
      new CustomEvent('ai-path-run-enqueued', {
        detail: { runId: 'run-1', entityType: 'product', entityId: 'product-1' },
      })
    );

    expect(addQueuedProductIdMock).toHaveBeenCalledWith('product-1');
    expect(removeQueuedProductIdMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(30_000);

    expect(removeQueuedProductIdMock).toHaveBeenCalledWith('product-1');
  });

  it('ignores non-product ai-path-run-enqueued events', () => {
    renderHook(() => useProductAiPathsRunSync());

    window.dispatchEvent(
      new CustomEvent('ai-path-run-enqueued', {
        detail: { runId: 'run-2', entityType: 'note', entityId: 'note-1' },
      })
    );

    expect(addQueuedProductIdMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(30_000);
    expect(removeQueuedProductIdMock).not.toHaveBeenCalled();
  });

  it('still supports legacy ai-path-product-run-queued events', () => {
    renderHook(() => useProductAiPathsRunSync());

    window.dispatchEvent(
      new CustomEvent('ai-path-product-run-queued', {
        detail: { productId: 'product-legacy' },
      })
    );

    expect(addQueuedProductIdMock).toHaveBeenCalledWith('product-legacy');
    vi.advanceTimersByTime(30_000);
    expect(removeQueuedProductIdMock).toHaveBeenCalledWith('product-legacy');
  });
});
