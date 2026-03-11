import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const listAiPathRunsMock = vi.hoisted(() => vi.fn());
const getAiPathRunMock = vi.hoisted(() => vi.fn());
const cancelAiPathRunMock = vi.hoisted(() => vi.fn());
const resumeAiPathRunMock = vi.hoisted(() => vi.fn());
const retryAiPathRunNodeMock = vi.hoisted(() => vi.fn());
const eventSourceInstances = vi.hoisted((): MockEventSource[] => []);

class MockEventSource {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  readonly url: string;
  readonly close = vi.fn(() => {
    this.readyState = MockEventSource.CLOSED;
  });
  readonly listeners = new Map<string, Array<(event: Event) => void>>();
  readyState = MockEventSource.OPEN;
  onerror: ((this: EventSource, ev: Event) => unknown) | null = null;

  constructor(url: string | URL) {
    this.url = String(url);
    eventSourceInstances.push(this);
  }

  addEventListener(type: string, listener: (event: Event) => void): void {
    const existing = this.listeners.get(type) ?? [];
    existing.push(listener);
    this.listeners.set(type, existing);
  }

  removeEventListener(type: string, listener: (event: Event) => void): void {
    const existing = this.listeners.get(type) ?? [];
    this.listeners.set(
      type,
      existing.filter((candidate) => candidate !== listener)
    );
  }

  dispatch(type: string, payload: unknown): void {
    const event = new MessageEvent(type, {
      data: JSON.stringify(payload),
    });
    (this.listeners.get(type) ?? []).forEach((listener) => listener(event));
  }
}

vi.mock('@/shared/lib/ai-paths', async () => {
  const actual =
    await vi.importActual<typeof import('@/shared/lib/ai-paths')>('@/shared/lib/ai-paths');
  return {
    ...actual,
    listAiPathRuns: listAiPathRunsMock,
    getAiPathRun: getAiPathRunMock,
    cancelAiPathRun: cancelAiPathRunMock,
    resumeAiPathRun: resumeAiPathRunMock,
    retryAiPathRunNode: retryAiPathRunNodeMock,
  };
});

import {
  RunHistoryProvider,
  useRunHistoryActions,
  useRunHistoryState,
} from '@/features/ai/ai-paths/context/RunHistoryContext';

import { useAiPathsRunHistory } from '../useAiPathsRunHistory';

const toastMock = vi.fn();

const createWrapper = (): React.ComponentType<{ children: React.ReactNode }> => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
    return (
      <QueryClientProvider client={queryClient}>
        <RunHistoryProvider>{children}</RunHistoryProvider>
      </QueryClientProvider>
    );
  };
};

const useHarness = (): {
  state: ReturnType<typeof useRunHistoryState>;
  actions: ReturnType<typeof useRunHistoryActions>;
} => {
  useAiPathsRunHistory({
    activePathId: 'path-legacy',
    toast: toastMock,
  });
  return {
    state: useRunHistoryState(),
    actions: useRunHistoryActions(),
  };
};

describe('useAiPathsRunHistory run coercion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventSourceInstances.length = 0;
    vi.stubGlobal('EventSource', MockEventSource as unknown as typeof EventSource);
  });

  it('keeps legacy runs visible by coercing _id and cancelled status', async () => {
    listAiPathRunsMock.mockResolvedValue({
      ok: true,
      data: {
        runs: [
          {
            _id: 'run_legacy_1',
            pathId: 'path-legacy',
            pathName: 'Legacy Path',
            status: 'cancelled',
            createdAt: '2026-03-05T06:12:00.000Z',
            finishedAt: '2026-03-05T06:13:00.000Z',
          },
        ],
        total: 1,
      },
    });

    const { result } = renderHook(() => useHarness(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.state.runList).toHaveLength(1);
    });

    expect(result.current.state.runList[0]?.id).toBe('run_legacy_1');
    expect(result.current.state.runList[0]?.status).toBe('canceled');
    expect(listAiPathRunsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pathId: 'path-legacy',
        limit: 100,
      })
    );
  });

  it('registers node retry actions through the run history context', async () => {
    listAiPathRunsMock.mockResolvedValue({
      ok: true,
      data: {
        runs: [],
        total: 0,
      },
    });
    retryAiPathRunNodeMock.mockResolvedValue({
      ok: true,
      data: {
        run: {
          id: 'run-retry-1',
          status: 'queued',
          createdAt: '2026-03-07T11:00:00.000Z',
        },
      },
    });

    const { result } = renderHook(() => useHarness(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(listAiPathRunsMock).toHaveBeenCalled();
    });

    await act(async () => {
      await result.current.actions.retryRunNode('run-retry-1', 'node-failed');
    });

    expect(retryAiPathRunNodeMock).toHaveBeenCalledWith('run-retry-1', 'node-failed');
    expect(toastMock).toHaveBeenCalledWith('Node retry queued.', { variant: 'success' });
  });

  it('does not recreate the run detail stream when streamed events are merged', async () => {
    listAiPathRunsMock.mockResolvedValue({
      ok: true,
      data: {
        runs: [],
        total: 0,
      },
    });

    const { result } = renderHook(() => useHarness(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(listAiPathRunsMock).toHaveBeenCalled();
    });

    act(() => {
      result.current.actions.setRunDetail({
        run: {
          id: 'run-stream-1',
          status: 'running',
          createdAt: '2026-03-11T08:00:00.000Z',
          updatedAt: '2026-03-11T08:00:00.000Z',
        },
        nodes: [],
        events: [],
        errorSummary: null,
      });
      result.current.actions.setRunDetailOpen(true);
    });

    await waitFor(() => {
      expect(eventSourceInstances).toHaveLength(1);
    });

    const activeSource = eventSourceInstances[0];
    expect(activeSource?.close).not.toHaveBeenCalled();

    act(() => {
      activeSource?.dispatch('events', {
        events: [
          {
            id: 'evt-1',
            level: 'info',
            message: 'stream event',
            createdAt: '2026-03-11T08:00:01.000Z',
          },
        ],
        overflow: false,
        limit: 200,
      });
    });

    await waitFor(() => {
      expect(result.current.state.runDetail?.events).toHaveLength(1);
    });

    expect(eventSourceInstances).toHaveLength(1);
    expect(activeSource?.close).not.toHaveBeenCalled();
  });
});
