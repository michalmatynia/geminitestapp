import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AI_PATH_RUN_ENQUEUED_EVENT_NAME } from '@/shared/contracts/ai-paths';

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
      new CustomEvent(AI_PATH_RUN_ENQUEUED_EVENT_NAME, {
        detail: { runId: ' run-1 ', entityType: 'PRODUCT', entityId: ' product-1 ' },
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
      new CustomEvent(AI_PATH_RUN_ENQUEUED_EVENT_NAME, {
        detail: { runId: 'run-2', entityType: 'note', entityId: 'note-1' },
      })
    );

    expect(addQueuedProductIdMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(30_000);
    expect(removeQueuedProductIdMock).not.toHaveBeenCalled();
  });

  it('ignores malformed ai-path-run-enqueued events without runId', () => {
    renderHook(() => useProductAiPathsRunSync());

    window.dispatchEvent(
      new CustomEvent(AI_PATH_RUN_ENQUEUED_EVENT_NAME, {
        detail: { entityType: 'product', entityId: 'product-1' },
      })
    );

    expect(addQueuedProductIdMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(30_000);
    expect(removeQueuedProductIdMock).not.toHaveBeenCalled();
  });

  it('ignores malformed ai-path-run-enqueued events without entityId', () => {
    renderHook(() => useProductAiPathsRunSync());

    window.dispatchEvent(
      new CustomEvent(AI_PATH_RUN_ENQUEUED_EVENT_NAME, {
        detail: { runId: 'run-3', entityType: 'product' },
      })
    );

    expect(addQueuedProductIdMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(30_000);
    expect(removeQueuedProductIdMock).not.toHaveBeenCalled();
  });

  it('ignores removed legacy ai-path-product-run-queued events', () => {
    renderHook(() => useProductAiPathsRunSync());

    window.dispatchEvent(
      new CustomEvent('ai-path-product-run-queued', {
        detail: { productId: 'product-legacy' },
      })
    );

    expect(addQueuedProductIdMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(30_000);
    expect(removeQueuedProductIdMock).not.toHaveBeenCalled();
  });
});
