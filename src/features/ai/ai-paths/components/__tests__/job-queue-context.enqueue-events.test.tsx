import React from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AI_PATH_RUN_ENQUEUED_EVENT_NAME } from '@/shared/contracts/ai-paths';
import { rememberRecentAiPathRunEnqueue } from '@/shared/lib/query-invalidation';
import { JobQueueProvider } from '../JobQueueContext';

const mocks = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
  toastMock: vi.fn(),
  createListQueryV2Mock: vi.fn(),
  createMutationV2Mock: vi.fn(),
  createDeleteMutationV2Mock: vi.fn(),
  refetchSettingsMock: vi.fn(),
  refetchRunsMock: vi.fn(),
  refetchQueueStatusMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: (...args: unknown[]) => mocks.usePathnameMock(...args),
}));

vi.mock('@/shared/ui', () => ({
  useToast: () => ({ toast: mocks.toastMock }),
}));

vi.mock('@/shared/lib/query-factories-v2', () => ({
  createListQueryV2: (...args: unknown[]) => mocks.createListQueryV2Mock(...args),
  createMutationV2: (...args: unknown[]) => mocks.createMutationV2Mock(...args),
  createDeleteMutationV2: (...args: unknown[]) => mocks.createDeleteMutationV2Mock(...args),
}));

const renderProvider = () =>
  render(
    <JobQueueProvider>
      <div data-testid='queue-content'>queue</div>
    </JobQueueProvider>
  );

describe('JobQueueProvider enqueue event listeners', () => {
  beforeEach(() => {
    mocks.usePathnameMock.mockReset();
    mocks.toastMock.mockReset();
    mocks.createListQueryV2Mock.mockReset();
    mocks.createMutationV2Mock.mockReset();
    mocks.createDeleteMutationV2Mock.mockReset();
    mocks.refetchSettingsMock.mockReset();
    mocks.refetchRunsMock.mockReset();
    mocks.refetchQueueStatusMock.mockReset();

    mocks.usePathnameMock.mockReturnValue('/admin/ai-paths/queue');
    mocks.refetchSettingsMock.mockResolvedValue(undefined);
    mocks.refetchRunsMock.mockResolvedValue(undefined);
    mocks.refetchQueueStatusMock.mockResolvedValue(undefined);

    mocks.createListQueryV2Mock.mockImplementation((config: { queryKey?: unknown }) => {
      const queryKey = JSON.stringify(config?.queryKey ?? []);
      if (queryKey.includes('"settings"')) {
        return {
          data: [],
          isLoading: false,
          error: null,
          refetch: mocks.refetchSettingsMock,
        };
      }
      if (queryKey.includes('"job-queue"')) {
        return {
          data: { runs: [], total: 0 },
          isLoading: false,
          error: null,
          refetch: mocks.refetchRunsMock,
        };
      }
      return {
        data: {
          status: {
            queuedCount: 0,
            activeRuns: 0,
            waitingCount: 0,
            delayedCount: 0,
            failedCount: 0,
            queueLagMs: 0,
            throughputPerMinute: 0,
          },
        },
        isLoading: false,
        error: null,
        refetch: mocks.refetchQueueStatusMock,
      };
    });

    const baseMutationValue = {
      isPending: false,
      variables: undefined,
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    };
    mocks.createMutationV2Mock.mockReturnValue(baseMutationValue);
    mocks.createDeleteMutationV2Mock.mockReturnValue(baseMutationValue);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it('refreshes queue only for valid window enqueue events', () => {
    renderProvider();

    mocks.refetchRunsMock.mockClear();
    mocks.refetchQueueStatusMock.mockClear();

    act(() => {
      window.dispatchEvent(new CustomEvent(AI_PATH_RUN_ENQUEUED_EVENT_NAME, { detail: {} }));
    });
    expect(mocks.refetchRunsMock).not.toHaveBeenCalled();
    expect(mocks.refetchQueueStatusMock).not.toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(
        new CustomEvent(AI_PATH_RUN_ENQUEUED_EVENT_NAME, {
          detail: { runId: 'run-valid' },
        })
      );
    });

    expect(mocks.refetchRunsMock).toHaveBeenCalledTimes(1);
    expect(mocks.refetchQueueStatusMock).toHaveBeenCalledTimes(1);
  });

  it('refreshes queue only for valid broadcast enqueue events', () => {
    const channels: Array<{
      onmessage: ((event: MessageEvent<unknown>) => void) | null;
      close: ReturnType<typeof vi.fn>;
    }> = [];

    class MockBroadcastChannel {
      onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
      close = vi.fn();

      constructor() {
        channels.push(this);
      }
    }

    vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);

    const view = renderProvider();
    const channel = channels[0];
    if (!channel?.onmessage) {
      throw new Error('Broadcast channel listener was not initialized.');
    }

    mocks.refetchRunsMock.mockClear();
    mocks.refetchQueueStatusMock.mockClear();

    act(() => {
      channel.onmessage?.({ data: { invalid: true } } as MessageEvent<unknown>);
    });
    expect(mocks.refetchRunsMock).not.toHaveBeenCalled();
    expect(mocks.refetchQueueStatusMock).not.toHaveBeenCalled();

    act(() => {
      channel.onmessage?.({ data: { runId: 'run-from-channel' } } as MessageEvent<unknown>);
    });
    expect(mocks.refetchRunsMock).toHaveBeenCalledTimes(1);
    expect(mocks.refetchQueueStatusMock).toHaveBeenCalledTimes(1);

    view.unmount();
    expect(channel.close).toHaveBeenCalledTimes(1);
  });

  it('defers queue refresh until the panel becomes active after an enqueue event', () => {
    mocks.usePathnameMock.mockReturnValue('/admin/products');
    const view = renderProvider();

    mocks.refetchRunsMock.mockClear();
    mocks.refetchQueueStatusMock.mockClear();

    act(() => {
      window.dispatchEvent(
        new CustomEvent(AI_PATH_RUN_ENQUEUED_EVENT_NAME, {
          detail: { runId: 'run-valid' },
        })
      );
    });

    expect(mocks.refetchRunsMock).not.toHaveBeenCalled();
    expect(mocks.refetchQueueStatusMock).not.toHaveBeenCalled();

    mocks.usePathnameMock.mockReturnValue('/admin/ai-paths/queue');
    act(() => {
      view.rerender(
        <JobQueueProvider>
          <div data-testid='queue-content'>queue</div>
        </JobQueueProvider>
      );
    });

    expect(mocks.refetchRunsMock).toHaveBeenCalledTimes(1);
    expect(mocks.refetchQueueStatusMock).toHaveBeenCalledTimes(1);
  });

  it('forces a fresh queue refresh on mount when a recent enqueue marker already exists', () => {
    rememberRecentAiPathRunEnqueue({
      runId: 'run-recent',
      entityId: 'product-1',
      entityType: 'product',
      at: Date.now(),
    });

    renderProvider();

    expect(mocks.refetchRunsMock).toHaveBeenCalledTimes(1);
    expect(mocks.refetchQueueStatusMock).toHaveBeenCalledTimes(1);
  });
});
