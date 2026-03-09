import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AI_PATH_RUN_ENQUEUED_EVENT_NAME,
  AI_PATH_RUN_QUEUE_CHANNEL,
} from '@/shared/contracts/ai-paths';

const {
  getAiPathRunMock,
  invalidateProductsCountsAndDetailMock,
  markQueuedProductSourceMock,
  removeQueuedProductSourceMock,
} = vi.hoisted(() => ({
  getAiPathRunMock: vi.fn(),
  invalidateProductsCountsAndDetailMock: vi.fn(),
  markQueuedProductSourceMock: vi.fn(),
  removeQueuedProductSourceMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/api/client', () => ({
  getAiPathRun: (...args: unknown[]) => getAiPathRunMock(...args),
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

import { useProductAiPathsRunSync } from './useProductAiPathsRunSync';

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
    getAiPathRunMock.mockReset();
    invalidateProductsCountsAndDetailMock.mockReset();
    markQueuedProductSourceMock.mockReset();
    removeQueuedProductSourceMock.mockReset();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('tracks product runs from window enqueue events until the run completes', async () => {
    getAiPathRunMock
      .mockResolvedValueOnce({ ok: true, data: { run: { status: 'running' } } })
      .mockResolvedValueOnce({ ok: true, data: { run: { status: 'completed' } } });

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
    expect(getAiPathRunMock).toHaveBeenNthCalledWith(1, 'run-1');
    expect(removeQueuedProductSourceMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });

    expect(getAiPathRunMock).toHaveBeenNthCalledWith(2, 'run-1');
    expect(removeQueuedProductSourceMock).toHaveBeenCalledWith('product-1', 'ai-run:run-1');
    expect(invalidateProductsCountsAndDetailMock).toHaveBeenCalledWith(queryClient, 'product-1');
  });

  it('removes only the completed run source while another run for the same product remains queued', async () => {
    const statusByRunId = new Map<string, string[]>([
      ['run-1', ['completed']],
      ['run-2', ['running', 'completed']],
    ]);
    getAiPathRunMock.mockImplementation(async (runId: string) => ({
      ok: true,
      data: {
        run: {
          status: statusByRunId.get(runId)?.shift() ?? 'completed',
        },
      },
    }));

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

    expect(removeQueuedProductSourceMock).toHaveBeenCalledWith('product-1', 'ai-run:run-1');
    expect(removeQueuedProductSourceMock).not.toHaveBeenCalledWith('product-1', 'ai-run:run-2');

    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });

    expect(removeQueuedProductSourceMock).toHaveBeenCalledWith('product-1', 'ai-run:run-2');
    expect(invalidateProductsCountsAndDetailMock).toHaveBeenCalledTimes(2);
  });

  it('clears the queued source when a run reaches failed status', async () => {
    getAiPathRunMock.mockResolvedValueOnce({ ok: true, data: { run: { status: 'failed' } } });

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

    expect(removeQueuedProductSourceMock).toHaveBeenCalledWith('product-7', 'ai-run:run-failed');
    expect(invalidateProductsCountsAndDetailMock).toHaveBeenCalledWith(queryClient, 'product-7');
  });

  it('clears the queued source when run details return a non-ok response', async () => {
    getAiPathRunMock.mockResolvedValueOnce({ ok: false, error: 'run lookup failed' });

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

    expect(removeQueuedProductSourceMock).toHaveBeenCalledWith('product-8', 'ai-run:run-missing');
    expect(markQueuedProductSourceMock).toHaveBeenCalledWith('product-8', 'ai-run:run-missing', 30_000);
  });

  it('clears the queued source after repeated poll errors instead of renewing it forever', async () => {
    getAiPathRunMock.mockRejectedValue(new Error('temporary failure'));

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
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });

    expect(removeQueuedProductSourceMock).toHaveBeenCalledWith('product-5', 'ai-run:run-error');
    expect(markQueuedProductSourceMock).toHaveBeenCalledTimes(3);
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
    getAiPathRunMock.mockResolvedValue({ ok: true, data: { run: { status: 'running' } } });

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
    expect(getAiPathRunMock).toHaveBeenCalledWith('run-channel');

    view.unmount();
    expect(channel.close).toHaveBeenCalledTimes(1);
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
    expect(getAiPathRunMock).not.toHaveBeenCalled();
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
    expect(getAiPathRunMock).not.toHaveBeenCalled();
  });
});
