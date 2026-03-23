import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AI_PATH_RUN_ENQUEUED_EVENT_NAME,
  AI_PATH_RUN_QUEUE_CHANNEL,
} from '@/shared/contracts/ai-paths';
import type { TrackedAiPathRunSnapshot } from '@/shared/lib/ai-paths/client-run-tracker';

const {
  getQueuedProductSourcesMock,
  invalidateProductsAndDetailMock,
  getRecentAiPathRunEnqueueMock,
  listTriggerButtonRunFeedbackMock,
  markQueuedProductSourceMock,
  queuedSourcesByProduct,
  removeQueuedProductSourceMock,
  subscribeToTrackedAiPathRunMock,
} = vi.hoisted(() => ({
  getQueuedProductSourcesMock: vi.fn(),
  invalidateProductsAndDetailMock: vi.fn(),
  getRecentAiPathRunEnqueueMock: vi.fn(),
  listTriggerButtonRunFeedbackMock: vi.fn(),
  markQueuedProductSourceMock: vi.fn(),
  queuedSourcesByProduct: new Map<string, Set<string>>(),
  removeQueuedProductSourceMock: vi.fn(),
  subscribeToTrackedAiPathRunMock: vi.fn(),
}));

vi.mock('@/features/products/hooks/productCache', () => ({
  invalidateProductsAndDetail: (...args: unknown[]) =>
    invalidateProductsAndDetailMock(...args),
}));

vi.mock('@/features/products/state/queued-product-ops', () => ({
  buildQueuedProductAiRunSource: (runId: string) => `ai-run:${runId.trim()}`,
  getQueuedProductSources: (...args: unknown[]) => getQueuedProductSourcesMock(...args),
  markQueuedProductSource: (...args: unknown[]) => markQueuedProductSourceMock(...args),
  removeQueuedProductSource: (...args: unknown[]) => removeQueuedProductSourceMock(...args),
}));

vi.mock('@/shared/lib/query-invalidation', () => ({
  getRecentAiPathRunEnqueue: (...args: unknown[]) => getRecentAiPathRunEnqueueMock(...args),
}));

vi.mock('@/shared/lib/ai-paths/trigger-button-run-feedback', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/shared/lib/ai-paths/trigger-button-run-feedback')>();
  return {
    ...actual,
    listTriggerButtonRunFeedback: (...args: unknown[]) => listTriggerButtonRunFeedbackMock(...args),
  };
});

vi.mock('@/shared/lib/ai-paths/client-run-tracker', () => ({
  subscribeToTrackedAiPathRun: (...args: unknown[]) => subscribeToTrackedAiPathRunMock(...args),
  isTrackedAiPathRunTerminal: (snapshot: { status: string }) =>
    new Set(['completed', 'failed', 'canceled', 'dead_lettered']).has(snapshot.status),
}));

import { useProductAiPathsRunSync } from './useProductAiPathsRunSync';

const trackedRunListeners = new Map<string, (snapshot: TrackedAiPathRunSnapshot) => void>();
const trackedRunUnsubscribes = new Map<string, ReturnType<typeof vi.fn>>();
const emitTrackedRunSnapshot = (
  runId: string,
  patch: Partial<TrackedAiPathRunSnapshot>
): void => {
  const listener = trackedRunListeners.get(runId);
  if (!listener) {
    throw new Error(`Missing tracked run listener for ${runId}`);
  }
  listener({
    runId,
    status: 'queued',
    updatedAt: '2026-03-09T12:00:00.000Z',
    finishedAt: null,
    errorMessage: null,
    entityId: 'product-1',
    entityType: 'product',
    trackingState: 'active',
    ...patch,
  });
};

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const createWrapper = (queryClient: QueryClient) =>
  function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

const flushAsync = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('useProductAiPathsRunSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    invalidateProductsAndDetailMock.mockReset();
    getRecentAiPathRunEnqueueMock.mockReset();
    listTriggerButtonRunFeedbackMock.mockReset();
    getQueuedProductSourcesMock.mockReset();
    markQueuedProductSourceMock.mockReset();
    removeQueuedProductSourceMock.mockReset();
    subscribeToTrackedAiPathRunMock.mockReset();
    trackedRunListeners.clear();
    trackedRunUnsubscribes.clear();
    queuedSourcesByProduct.clear();
    getRecentAiPathRunEnqueueMock.mockReturnValue(null);
    listTriggerButtonRunFeedbackMock.mockReturnValue([]);
    getQueuedProductSourcesMock.mockImplementation((productId: string) => {
      return new Set(queuedSourcesByProduct.get(productId) ?? []);
    });
    markQueuedProductSourceMock.mockImplementation((productId: string, source: string) => {
      const current = new Set(queuedSourcesByProduct.get(productId) ?? []);
      current.add(source);
      queuedSourcesByProduct.set(productId, current);
    });
    removeQueuedProductSourceMock.mockImplementation((productId: string, source: string) => {
      const current = new Set(queuedSourcesByProduct.get(productId) ?? []);
      current.delete(source);
      if (current.size === 0) {
        queuedSourcesByProduct.delete(productId);
        return;
      }
      queuedSourcesByProduct.set(productId, current);
    });

    subscribeToTrackedAiPathRunMock.mockImplementation(
      (
        runId: string,
        listener: (snapshot: TrackedAiPathRunSnapshot) => void,
        options?: { initialSnapshot?: Partial<TrackedAiPathRunSnapshot> }
      ) => {
        trackedRunListeners.set(runId, listener);
        listener({
          runId,
          status: options?.initialSnapshot?.status ?? 'queued',
          updatedAt: '2026-03-09T12:00:00.000Z',
          finishedAt: null,
          errorMessage: null,
          entityId: options?.initialSnapshot?.entityId ?? 'product-1',
          entityType: options?.initialSnapshot?.entityType ?? 'product',
          trackingState: 'active',
        });
        const unsubscribe = vi.fn(() => {
          trackedRunListeners.delete(runId);
        });
        trackedRunUnsubscribes.set(runId, unsubscribe);
        return unsubscribe;
      }
    );
  });

  afterEach(async () => {
    await act(async () => {
      vi.runOnlyPendingTimers();
      await Promise.resolve();
    });
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('tracks product runs from window enqueue events until the run completes', async () => {
    const queryClient = createQueryClient();
    renderHook(() => useProductAiPathsRunSync(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent(AI_PATH_RUN_ENQUEUED_EVENT_NAME, {
          detail: { runId: ' run-1 ', entityType: 'PRODUCT', entityId: ' product-1 ' },
        })
      );
    });
    await flushAsync();

    expect(markQueuedProductSourceMock).toHaveBeenCalledWith('product-1', 'ai-run:run-1', 30_000);
    expect(removeQueuedProductSourceMock).not.toHaveBeenCalled();
    expect(subscribeToTrackedAiPathRunMock).toHaveBeenCalledWith(
      'run-1',
      expect.any(Function),
      expect.objectContaining({
        initialSnapshot: expect.objectContaining({
          entityId: 'product-1',
          entityType: 'product',
        }),
      })
    );

    act(() => {
      emitTrackedRunSnapshot('run-1', {
        status: 'completed',
        finishedAt: '2026-03-09T12:00:05.000Z',
        trackingState: 'stopped',
      });
    });

    expect(removeQueuedProductSourceMock).toHaveBeenCalledWith('product-1', 'ai-run:run-1');
    expect(invalidateProductsAndDetailMock).toHaveBeenCalledWith(queryClient, 'product-1');
  });

  it('exposes the tracked status for the product list and briefly shows the terminal result when the run finishes', async () => {
    const queryClient = createQueryClient();
    const view = renderHook(() => useProductAiPathsRunSync(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent(AI_PATH_RUN_ENQUEUED_EVENT_NAME, {
          detail: { runId: 'run-status', entityType: 'product', entityId: 'product-1' },
        })
      );
    });
    await flushAsync();

    expect(view.result.current.get('product-1')).toMatchObject({
      runId: 'run-status',
      status: 'queued',
      label: 'Queued',
    });

    act(() => {
      emitTrackedRunSnapshot('run-status', {
        status: 'running',
        updatedAt: '2026-03-09T12:00:03.000Z',
      });
    });

    expect(view.result.current.get('product-1')).toMatchObject({
      runId: 'run-status',
      status: 'running',
      label: 'Running',
    });

    act(() => {
      emitTrackedRunSnapshot('run-status', {
        status: 'completed',
        finishedAt: '2026-03-09T12:00:05.000Z',
        trackingState: 'stopped',
      });
    });

    expect(view.result.current.get('product-1')).toMatchObject({
      runId: 'run-status',
      status: 'completed',
      label: 'Completed',
    });

    await act(async () => {
      vi.advanceTimersByTime(15_000);
      await Promise.resolve();
    });

    expect(view.result.current.has('product-1')).toBe(false);
  });

  it('clears the previous terminal badge when a new run starts for the same product', async () => {
    const queryClient = createQueryClient();
    const view = renderHook(() => useProductAiPathsRunSync(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent(AI_PATH_RUN_ENQUEUED_EVENT_NAME, {
          detail: { runId: 'run-old', entityType: 'product', entityId: 'product-1' },
        })
      );
    });
    await flushAsync();

    act(() => {
      emitTrackedRunSnapshot('run-old', {
        status: 'completed',
        finishedAt: '2026-03-09T12:00:05.000Z',
        trackingState: 'stopped',
      });
    });

    expect(view.result.current.get('product-1')).toMatchObject({
      runId: 'run-old',
      status: 'completed',
      label: 'Completed',
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent(AI_PATH_RUN_ENQUEUED_EVENT_NAME, {
          detail: { runId: 'run-new', entityType: 'product', entityId: 'product-1' },
        })
      );
    });
    await flushAsync();

    expect(view.result.current.get('product-1')).toMatchObject({
      runId: 'run-new',
      status: 'queued',
      label: 'Queued',
    });
  });

  it('removes stale queued ai-run sources that are no longer backed by tracked runs', async () => {
    queuedSourcesByProduct.set('product-1', new Set(['ai-run:stale-run']));

    const queryClient = createQueryClient();
    renderHook(() => useProductAiPathsRunSync(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent(AI_PATH_RUN_ENQUEUED_EVENT_NAME, {
          detail: { runId: 'run-live', entityType: 'product', entityId: 'product-1' },
        })
      );
    });
    await flushAsync();

    expect(removeQueuedProductSourceMock).toHaveBeenCalledWith('product-1', 'ai-run:stale-run');
    expect(queuedSourcesByProduct.get('product-1')).toEqual(new Set(['ai-run:run-live']));
  });

  it('replays the most recent product enqueue on mount so queued badges survive remounts', async () => {
    getRecentAiPathRunEnqueueMock.mockReturnValue({
      type: 'run-enqueued',
      runId: 'run-recent',
      entityType: 'product',
      entityId: 'product-11',
      at: Date.now(),
    });

    const queryClient = createQueryClient();
    renderHook(() => useProductAiPathsRunSync(), {
      wrapper: createWrapper(queryClient),
    });
    await flushAsync();

    expect(markQueuedProductSourceMock).toHaveBeenCalledWith(
      'product-11',
      'ai-run:run-recent',
      30_000
    );
    expect(subscribeToTrackedAiPathRunMock).toHaveBeenCalledWith(
      'run-recent',
      expect.any(Function),
      expect.objectContaining({
        initialSnapshot: expect.objectContaining({
          entityId: 'product-11',
          entityType: 'product',
        }),
      })
    );
  });

  it('restores persisted active product runs on mount so list pills survive refreshes', async () => {
    const persistedUpdatedAt = new Date(Date.now() - 60_000).toISOString();
    listTriggerButtonRunFeedbackMock.mockReturnValue([
      {
        buttonId: 'button-product-modal',
        pathId: 'path-shared',
        location: 'product_modal',
        entityType: 'product',
        entityId: 'product-42',
        runId: 'run-persisted',
        status: 'running',
        updatedAt: persistedUpdatedAt,
        finishedAt: null,
        errorMessage: null,
      },
    ]);

    const queryClient = createQueryClient();
    const view = renderHook(() => useProductAiPathsRunSync(), {
      wrapper: createWrapper(queryClient),
    });
    await flushAsync();

    expect(listTriggerButtonRunFeedbackMock).toHaveBeenCalledWith({
      entityType: 'product',
      activeOnly: true,
    });
    expect(subscribeToTrackedAiPathRunMock).toHaveBeenCalledWith(
      'run-persisted',
      expect.any(Function),
      expect.objectContaining({
        initialSnapshot: expect.objectContaining({
          status: 'running',
          entityId: 'product-42',
          entityType: 'product',
        }),
      })
    );
    expect(view.result.current.get('product-42')).toMatchObject({
      runId: 'run-persisted',
      status: 'running',
      label: 'Running',
    });
  });

  it('removes only the completed run source while another run for the same product remains queued', async () => {
    const queryClient = createQueryClient();
    const view = renderHook(() => useProductAiPathsRunSync(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent(AI_PATH_RUN_ENQUEUED_EVENT_NAME, {
          detail: { runId: 'run-1', entityType: 'product', entityId: 'product-1' },
        })
      );
      window.dispatchEvent(
        new CustomEvent(AI_PATH_RUN_ENQUEUED_EVENT_NAME, {
          detail: { runId: 'run-2', entityType: 'product', entityId: 'product-1' },
        })
      );
    });
    await flushAsync();

    act(() => {
      emitTrackedRunSnapshot('run-1', {
        status: 'completed',
        finishedAt: '2026-03-09T12:00:05.000Z',
        trackingState: 'stopped',
      });
    });

    expect(removeQueuedProductSourceMock).toHaveBeenCalledWith('product-1', 'ai-run:run-1');
    expect(removeQueuedProductSourceMock).not.toHaveBeenCalledWith('product-1', 'ai-run:run-2');
    expect(view.result.current.get('product-1')).toMatchObject({
      runId: 'run-2',
      status: 'queued',
      label: 'Queued',
    });

    act(() => {
      emitTrackedRunSnapshot('run-2', {
        status: 'running',
        updatedAt: '2026-03-09T12:00:05.500Z',
      });
    });

    expect(view.result.current.get('product-1')).toMatchObject({
      runId: 'run-2',
      status: 'running',
      label: 'Running',
    });

    act(() => {
      emitTrackedRunSnapshot('run-2', {
        status: 'completed',
        finishedAt: '2026-03-09T12:00:06.000Z',
        trackingState: 'stopped',
      });
    });

    expect(removeQueuedProductSourceMock).toHaveBeenCalledWith('product-1', 'ai-run:run-2');
    expect(invalidateProductsAndDetailMock).toHaveBeenCalledTimes(2);
  });

  it('clears the queued source when a run reaches failed status', async () => {
    const queryClient = createQueryClient();
    renderHook(() => useProductAiPathsRunSync(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent(AI_PATH_RUN_ENQUEUED_EVENT_NAME, {
          detail: { runId: 'run-failed', entityType: 'product', entityId: 'product-7' },
        })
      );
    });
    await flushAsync();

    act(() => {
      emitTrackedRunSnapshot('run-failed', {
        status: 'failed',
        finishedAt: '2026-03-09T12:00:05.000Z',
        errorMessage: 'Run failed',
        trackingState: 'stopped',
      });
    });

    expect(removeQueuedProductSourceMock).toHaveBeenCalledWith('product-7', 'ai-run:run-failed');
    expect(invalidateProductsAndDetailMock).toHaveBeenCalledWith(queryClient, 'product-7');
  });

  it('clears the queued source when the shared tracker stops without a terminal status', async () => {
    const queryClient = createQueryClient();
    renderHook(() => useProductAiPathsRunSync(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent(AI_PATH_RUN_ENQUEUED_EVENT_NAME, {
          detail: { runId: 'run-missing', entityType: 'product', entityId: 'product-8' },
        })
      );
    });
    await flushAsync();

    act(() => {
      emitTrackedRunSnapshot('run-missing', {
        status: 'running',
        trackingState: 'stopped',
      });
    });

    expect(removeQueuedProductSourceMock).toHaveBeenCalledWith('product-8', 'ai-run:run-missing');
    expect(markQueuedProductSourceMock).toHaveBeenCalledWith('product-8', 'ai-run:run-missing', 30_000);
  });

  it('renews queued badges while the shared tracker remains active', async () => {
    const queryClient = createQueryClient();
    renderHook(() => useProductAiPathsRunSync(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent(AI_PATH_RUN_ENQUEUED_EVENT_NAME, {
          detail: { runId: 'run-error', entityType: 'product', entityId: 'product-5' },
        })
      );
    });
    await flushAsync();

    await act(async () => {
      vi.advanceTimersByTime(10_000);
      await Promise.resolve();
    });

    expect(markQueuedProductSourceMock).toHaveBeenNthCalledWith(
      2,
      'product-5',
      'ai-run:run-error',
      30_000
    );
    expect(removeQueuedProductSourceMock).not.toHaveBeenCalled();
  });

  it('tracks product runs from broadcast enqueue events', async () => {
    const channels: Array<{
      onmessage: ((event: MessageEvent<unknown>) => void) | null;
      close: ReturnType<typeof vi.fn>;
      name: string;
    }> = [];

    class MockBroadcastChannel {
      onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
      close = vi.fn();
      name: string;

      constructor(name: string) {
        this.name = name;
        channels.push(this);
      }
    }

    vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);

    const queryClient = createQueryClient();
    const view = renderHook(() => useProductAiPathsRunSync(), {
      wrapper: createWrapper(queryClient),
    });

    const channel = channels[0];
    if (channel?.name !== AI_PATH_RUN_QUEUE_CHANNEL) {
      throw new Error('Broadcast channel listener was not initialized.');
    }

    act(() => {
      channel.onmessage?.({
        data: { runId: 'run-channel', entityType: 'product', entityId: 'product-9' },
      } as MessageEvent<unknown>);
    });
    await flushAsync();

    expect(markQueuedProductSourceMock).toHaveBeenCalledWith(
      'product-9',
      'ai-run:run-channel',
      30_000
    );
    expect(subscribeToTrackedAiPathRunMock).toHaveBeenCalledWith(
      'run-channel',
      expect.any(Function),
      expect.any(Object)
    );

    view.unmount();
    expect(channel.close).toHaveBeenCalledTimes(1);
    expect(trackedRunUnsubscribes.get('run-channel')).toHaveBeenCalledTimes(1);
  });

  it('ignores non-product ai-path-run-enqueued events', async () => {
    const queryClient = createQueryClient();
    renderHook(() => useProductAiPathsRunSync(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent(AI_PATH_RUN_ENQUEUED_EVENT_NAME, {
          detail: { runId: 'run-2', entityType: 'note', entityId: 'note-1' },
        })
      );
    });
    await flushAsync();

    expect(markQueuedProductSourceMock).not.toHaveBeenCalled();
    expect(subscribeToTrackedAiPathRunMock).not.toHaveBeenCalled();
  });

  it('ignores malformed ai-path-run-enqueued events without runId', async () => {
    const queryClient = createQueryClient();
    renderHook(() => useProductAiPathsRunSync(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent(AI_PATH_RUN_ENQUEUED_EVENT_NAME, {
          detail: { entityType: 'product', entityId: 'product-1' },
        })
      );
    });
    await flushAsync();

    expect(markQueuedProductSourceMock).not.toHaveBeenCalled();
    expect(subscribeToTrackedAiPathRunMock).not.toHaveBeenCalled();
  });

  it('ignores the most recent enqueue replay when it is not for a product run', async () => {
    getRecentAiPathRunEnqueueMock.mockReturnValue({
      type: 'run-enqueued',
      runId: 'run-note',
      entityType: 'note',
      entityId: 'note-1',
      at: Date.now(),
    });

    const queryClient = createQueryClient();
    renderHook(() => useProductAiPathsRunSync(), {
      wrapper: createWrapper(queryClient),
    });
    await flushAsync();

    expect(markQueuedProductSourceMock).not.toHaveBeenCalled();
    expect(subscribeToTrackedAiPathRunMock).not.toHaveBeenCalled();
  });
});
