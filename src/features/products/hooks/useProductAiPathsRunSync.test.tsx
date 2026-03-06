import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AI_PATH_RUN_ENQUEUED_EVENT_NAME } from '@/shared/contracts/ai-paths';

const { markQueuedProductIdMock } = vi.hoisted(() => ({
  markQueuedProductIdMock: vi.fn(),
}));

vi.mock('@/features/products/state/queued-product-ops', () => ({
  markQueuedProductId: (...args: unknown[]) => markQueuedProductIdMock(...args),
}));

import { useProductAiPathsRunSync } from './useProductAiPathsRunSync';

describe('useProductAiPathsRunSync', () => {
  beforeEach(() => {
    markQueuedProductIdMock.mockReset();
  });

  it('marks product badge from canonical ai-path-run-enqueued events', () => {
    renderHook(() => useProductAiPathsRunSync());

    window.dispatchEvent(
      new CustomEvent(AI_PATH_RUN_ENQUEUED_EVENT_NAME, {
        detail: { runId: ' run-1 ', entityType: 'PRODUCT', entityId: ' product-1 ' },
      })
    );

    expect(markQueuedProductIdMock).toHaveBeenCalledWith('product-1', 30_000);
  });

  it('ignores non-product ai-path-run-enqueued events', () => {
    renderHook(() => useProductAiPathsRunSync());

    window.dispatchEvent(
      new CustomEvent(AI_PATH_RUN_ENQUEUED_EVENT_NAME, {
        detail: { runId: 'run-2', entityType: 'note', entityId: 'note-1' },
      })
    );

    expect(markQueuedProductIdMock).not.toHaveBeenCalled();
  });

  it('ignores malformed ai-path-run-enqueued events without runId', () => {
    renderHook(() => useProductAiPathsRunSync());

    window.dispatchEvent(
      new CustomEvent(AI_PATH_RUN_ENQUEUED_EVENT_NAME, {
        detail: { entityType: 'product', entityId: 'product-1' },
      })
    );

    expect(markQueuedProductIdMock).not.toHaveBeenCalled();
  });

  it('ignores malformed ai-path-run-enqueued events without entityId', () => {
    renderHook(() => useProductAiPathsRunSync());

    window.dispatchEvent(
      new CustomEvent(AI_PATH_RUN_ENQUEUED_EVENT_NAME, {
        detail: { runId: 'run-3', entityType: 'product' },
      })
    );

    expect(markQueuedProductIdMock).not.toHaveBeenCalled();
  });

  it('ignores removed legacy ai-path-product-run-queued events', () => {
    renderHook(() => useProductAiPathsRunSync());

    window.dispatchEvent(
      new CustomEvent('ai-path-product-run-queued', {
        detail: { productId: 'product-legacy' },
      })
    );

    expect(markQueuedProductIdMock).not.toHaveBeenCalled();
  });
});
