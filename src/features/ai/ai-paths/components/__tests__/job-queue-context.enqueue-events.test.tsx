import React from 'react';
import { act, render } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AI_PATH_RUN_ENQUEUED_EVENT_NAME } from '@/shared/contracts/ai-paths';
import type { AiPathRunRecord } from '@/shared/lib/ai-paths';
import {
  listOptimisticAiPathRuns,
  rememberOptimisticAiPathRun,
  removeOptimisticAiPathRuns,
} from '@/shared/lib/ai-paths/optimistic-run-queue';
import {
  clearRecentAiPathRunEnqueue,
  rememberRecentAiPathRunEnqueue,
} from '@/shared/lib/query-invalidation';
import { JobQueueProvider, useJobQueueState } from '../JobQueueContext';

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
  usePathname: mocks.usePathnameMock as typeof import('next/navigation').usePathname,
}));

vi.mock('@/shared/ui', () => ({
  useToast: () => ({ toast: mocks.toastMock }),
}));

vi.mock('@/shared/lib/query-factories-v2', () => ({
  createListQueryV2:
    mocks.createListQueryV2Mock as typeof import('@/shared/lib/query-factories-v2').createListQueryV2,
  createMutationV2:
    mocks.createMutationV2Mock as typeof import('@/shared/lib/query-factories-v2').createMutationV2,
  createDeleteMutationV2:
    mocks.createDeleteMutationV2Mock as typeof import('@/shared/lib/query-factories-v2').createDeleteMutationV2,
}));

const renderProvider = () =>
  render(
    <JobQueueProvider>
      <div data-testid='queue-content'>queue</div>
    </JobQueueProvider>
  );

const buildOptimisticRun = (): AiPathRunRecord =>
  ({
    id: 'optimistic-run-1',
    status: 'queued',
    pathId: 'path-1',
    pathName: 'Path 1',
    createdAt: '2026-03-09T07:25:00.000Z',
    updatedAt: '2026-03-09T07:25:00.000Z',
    entityId: 'product-1',
    entityType: 'product',
    meta: {
      source: 'trigger_button',
    },
  }) as AiPathRunRecord;

const resetOptimisticQueue = (): void => {
  const runIds = listOptimisticAiPathRuns().map((run) => run.id);
  if (runIds.length > 0) {
    removeOptimisticAiPathRuns(runIds);
  }
  window.localStorage.clear();
};

function QueueCountProbe(): React.JSX.Element {
  const { runs, total } = useJobQueueState();

  return <div data-testid='queue-counts'>{`${runs.length}:${total}`}</div>;
}

describe('JobQueueProvider enqueue event listeners', () => {
  beforeEach(() => {
    resetOptimisticQueue();
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
    clearRecentAiPathRunEnqueue();
    vi.unstubAllGlobals();
    resetOptimisticQueue();
  });

  it('hydrates without a text mismatch when optimistic runs are already in client storage', async () => {
    const serverMarkup = renderToString(
      <JobQueueProvider>
        <QueueCountProbe />
      </JobQueueProvider>
    );
    expect(serverMarkup).toContain('0:0');

    rememberOptimisticAiPathRun(buildOptimisticRun());

    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = serverMarkup;

    const recoverableErrors: string[] = [];
    let root: ReturnType<typeof hydrateRoot> | null = null;

    await act(async () => {
      root = hydrateRoot(
        container,
        <JobQueueProvider>
          <QueueCountProbe />
        </JobQueueProvider>,
        {
          onRecoverableError: (error) => {
            recoverableErrors.push(error.message);
          },
        }
      );
      await Promise.resolve();
    });

    expect(recoverableErrors).toEqual([]);
    expect(container.textContent).toContain('1:1');

    await act(async () => {
      root?.unmount();
    });
    container.remove();
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

  it('still refreshes queue when recent enqueue persistence fails', () => {
    renderProvider();

    mocks.refetchRunsMock.mockClear();
    mocks.refetchQueueStatusMock.mockClear();

    const originalSetItem = window.localStorage.setItem.bind(window.localStorage);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string
    ): void {
      if (key === 'ai-path-run-recent-enqueue') {
        throw new Error('Quota exceeded');
      }
      return originalSetItem(key, value);
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent(AI_PATH_RUN_ENQUEUED_EVENT_NAME, {
          detail: { runId: 'run-quota' },
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
