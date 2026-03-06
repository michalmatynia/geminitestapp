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
  markQueuedProductIdMock,
  removeQueuedProductIdMock,
} = vi.hoisted(() => ({
  getAiPathRunMock: vi.fn(),
  invalidateProductsCountsAndDetailMock: vi.fn(),
  markQueuedProductIdMock: vi.fn(),
  removeQueuedProductIdMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/api/client', () => ({
  getAiPathRun: (...args: unknown[]) => getAiPathRunMock(...args),
}));

vi.mock('@/features/products/hooks/productCache', () => ({
  invalidateProductsCountsAndDetail: (...args: unknown[]) =>
    invalidateProductsCountsAndDetailMock(...args),
}));

vi.mock('@/features/products/state/queued-product-ops', () => ({
  markQueuedProductId: (...args: unknown[]) => markQueuedProductIdMock(...args),
  removeQueuedProductId: (...args: unknown[]) => removeQueuedProductIdMock(...args),
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
    markQueuedProductIdMock.mockReset();
    removeQueuedProductIdMock.mockReset();
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

    expect(markQueuedProductIdMock).toHaveBeenCalledWith('product-1', 30_000);
    expect(getAiPathRunMock).toHaveBeenNthCalledWith(1, 'run-1');
    expect(removeQueuedProductIdMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });

    expect(getAiPathRunMock).toHaveBeenNthCalledWith(2, 'run-1');
    expect(removeQueuedProductIdMock).toHaveBeenCalledWith('product-1');
    expect(invalidateProductsCountsAndDetailMock).toHaveBeenCalledWith(queryClient, 'product-1');
  });

  it('keeps the queued badge until the last tracked run for a product completes', async () => {
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

    expect(removeQueuedProductIdMock).not.toHaveBeenCalled();
    expect(invalidateProductsCountsAndDetailMock).toHaveBeenCalledWith(queryClient, 'product-1');

    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });

    expect(removeQueuedProductIdMock).toHaveBeenCalledTimes(1);
    expect(removeQueuedProductIdMock).toHaveBeenCalledWith('product-1');
    expect(invalidateProductsCountsAndDetailMock).toHaveBeenCalledTimes(2);
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
    if (!channel || channel.name !== AI_PATH_RUN_QUEUE_CHANNEL) {
      throw new Error('Broadcast channel listener was not initialized.');
    }

    act(() => {
      channel.onmessage?.({
        data: { runId: 'run-channel', entityType: 'product', entityId: 'product-9' },
      } as MessageEvent<unknown>);
    });
    await flushAsync();

    expect(markQueuedProductIdMock).toHaveBeenCalledWith('product-9', 30_000);
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

    expect(markQueuedProductIdMock).not.toHaveBeenCalled();
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

    expect(markQueuedProductIdMock).not.toHaveBeenCalled();
    expect(getAiPathRunMock).not.toHaveBeenCalled();
  });
});
