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
  invalidateProductsCountsAndDetailMock,
  markQueuedProductSourceMock,
  removeQueuedProductSourceMock,
  subscribeToTrackedAiPathRunMock,
} = vi.hoisted(() => ({
  invalidateProductsCountsAndDetailMock: vi.fn(),
  markQueuedProductSourceMock: vi.fn(),
  removeQueuedProductSourceMock: vi.fn(),
  subscribeToTrackedAiPathRunMock: vi.fn(),
}));

vi.mock('@/features/products/hooks/productCache', () => ({
  invalidateProductsCountsAndDetail: (...args: unknown[]) =>
    invalidateProductsCountsAndDetailMock(...args),
}));

vi.mock('@/features/products/state/queued-product-ops', () => ({
  buildQueuedProductAiRunSource: (runId: string) => `ai-run:${runId.trim()}`,
  markQueuedProductSource: (...args: unknown[]) => markQueuedProductSourceMock(...args),
  removeQueuedProductSource: (...args: unknown[]) => removeQueuedProductSourceMock(...args),
}));

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
    invalidateProductsCountsAndDetailMock.mockReset();
    markQueuedProductSourceMock.mockReset();
    removeQueuedProductSourceMock.mockReset();
    subscribeToTrackedAiPathRunMock.mockReset();
    trackedRunListeners.clear();
    trackedRunUnsubscribes.clear();

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

  afterEach(() => {
    vi.runOnlyPendingTimers();
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
    expect(invalidateProductsCountsAndDetailMock).toHaveBeenCalledWith(queryClient, 'product-1');
  });

  it('removes only the completed run source while another run for the same product remains queued', async () => {
    const queryClient = createQueryClient();
    renderHook(() => useProductAiPathsRunSync(), {
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

    act(() => {
      emitTrackedRunSnapshot('run-2', {
        status: 'completed',
        finishedAt: '2026-03-09T12:00:06.000Z',
        trackingState: 'stopped',
      });
    });

    expect(removeQueuedProductSourceMock).toHaveBeenCalledWith('product-1', 'ai-run:run-2');
    expect(invalidateProductsCountsAndDetailMock).toHaveBeenCalledTimes(2);
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
    expect(invalidateProductsCountsAndDetailMock).toHaveBeenCalledWith(queryClient, 'product-7');
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
});
