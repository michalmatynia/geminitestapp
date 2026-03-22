// @vitest-environment jsdom

import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';
const { getAiPathRunMock, streamAiPathRunMock } = vi.hoisted(() => ({
  getAiPathRunMock: vi.fn(),
  streamAiPathRunMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/api/client', () => ({
  getAiPathRun: (...args: unknown[]) => getAiPathRunMock(...args),
  streamAiPathRun: (...args: unknown[]) => streamAiPathRunMock(...args),
}));

import {
  __resetTrackedAiPathRunClientStateForTests,
  isTrackedAiPathRunTerminal,
  readTrackedAiPathRunSnapshot,
  subscribeToTrackedAiPathRun,
  type TrackedAiPathRunSnapshot,
} from '../client-run-tracker';

const flushAsync = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
  });
};

const createRunRecord = (
  patch: Partial<AiPathRunRecord> & Pick<AiPathRunRecord, 'id' | 'status'>
): AiPathRunRecord => ({
  id: patch.id,
  status: patch.status,
  createdAt: patch.createdAt ?? '2026-03-09T12:00:00.000Z',
  updatedAt: patch.updatedAt ?? patch.createdAt ?? '2026-03-09T12:00:00.000Z',
  startedAt: patch.startedAt ?? null,
  finishedAt: patch.finishedAt ?? null,
  errorMessage: patch.errorMessage ?? null,
  pathId: patch.pathId ?? null,
  pathName: patch.pathName ?? null,
  triggerEvent: patch.triggerEvent ?? null,
  triggerNodeId: patch.triggerNodeId ?? null,
  entityId: patch.entityId ?? null,
  entityType: patch.entityType ?? null,
  requestId: patch.requestId ?? null,
  meta: patch.meta ?? null,
  graph: patch.graph ?? null,
  runtimeState: patch.runtimeState ?? null,
  triggerContext: patch.triggerContext ?? null,
});

class MockEventSource {
  close = vi.fn();
  private listeners = new Map<string, Set<(event: Event) => void>>();

  addEventListener(type: string, listener: (event: Event) => void): void {
    const listeners = this.listeners.get(type) ?? new Set<(event: Event) => void>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: (event: Event) => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string, event: Event): void {
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }
}

describe('client-run-tracker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getAiPathRunMock.mockReset();
    streamAiPathRunMock.mockReset();
    __resetTrackedAiPathRunClientStateForTests();
    vi.stubGlobal('EventSource', MockEventSource as unknown as typeof EventSource);
  });

  afterEach(() => {
    __resetTrackedAiPathRunClientStateForTests();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('streams run updates and finalizes with terminal details on done', async () => {
    const eventSource = new MockEventSource();
    streamAiPathRunMock.mockReturnValue(eventSource as unknown as EventSource);
    getAiPathRunMock.mockResolvedValue({
      ok: true,
      data: {
        run: createRunRecord({
          id: 'run-1',
          status: 'completed',
          updatedAt: '2026-03-09T12:00:05.000Z',
          finishedAt: '2026-03-09T12:00:05.000Z',
          entityId: 'product-1',
          entityType: 'product',
        }),
      },
    });

    const snapshots: TrackedAiPathRunSnapshot[] = [];
    const unsubscribe = subscribeToTrackedAiPathRun(
      'run-1',
      (snapshot: TrackedAiPathRunSnapshot) => {
        snapshots.push(snapshot);
      },
      {
        initialSnapshot: {
          entityId: 'product-1',
          entityType: 'product',
        },
      }
    );

    expect(streamAiPathRunMock).toHaveBeenCalledWith('run-1');
    expect(snapshots.at(-1)).toMatchObject({
      runId: 'run-1',
      status: 'queued',
      trackingState: 'active',
    });

    act(() => {
      eventSource.emit(
        'run',
        new MessageEvent('message', {
          data: JSON.stringify(
            createRunRecord({
              id: 'run-1',
              status: 'running',
              updatedAt: '2026-03-09T12:00:02.000Z',
              entityId: 'product-1',
              entityType: 'product',
            })
          ),
        })
      );
    });

    expect(snapshots.at(-1)).toMatchObject({
      runId: 'run-1',
      status: 'running',
      trackingState: 'active',
    });

    act(() => {
      eventSource.emit('done', new Event('done'));
    });
    await flushAsync();

    expect(getAiPathRunMock).toHaveBeenCalledWith(
      'run-1',
      expect.objectContaining({
        cache: 'no-store',
        timeoutMs: 60_000,
      })
    );
    expect(snapshots.at(-1)).toMatchObject({
      runId: 'run-1',
      status: 'completed',
      finishedAt: '2026-03-09T12:00:05.000Z',
      trackingState: 'stopped',
      entityId: 'product-1',
      entityType: 'product',
    });

    unsubscribe();
    expect(eventSource.close).toHaveBeenCalledTimes(1);
  });

  it('falls back to polling when the run stream errors', async () => {
    const eventSource = new MockEventSource();
    streamAiPathRunMock.mockReturnValue(eventSource as unknown as EventSource);
    getAiPathRunMock
      .mockResolvedValueOnce({
        ok: true,
        data: {
          run: createRunRecord({
            id: 'run-2',
            status: 'running',
            updatedAt: '2026-03-09T12:00:03.000Z',
          }),
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          run: createRunRecord({
            id: 'run-2',
            status: 'completed',
            updatedAt: '2026-03-09T12:00:05.000Z',
            finishedAt: '2026-03-09T12:00:05.000Z',
          }),
        },
      });

    const snapshots: TrackedAiPathRunSnapshot[] = [];
    subscribeToTrackedAiPathRun('run-2', (snapshot: TrackedAiPathRunSnapshot) => {
      snapshots.push(snapshot);
    });

    act(() => {
      eventSource.emit('error', new Event('error'));
    });
    await act(async () => {
      vi.advanceTimersByTime(0);
      await Promise.resolve();
    });

    expect(getAiPathRunMock).toHaveBeenCalledTimes(1);
    expect(snapshots.at(-1)).toMatchObject({
      runId: 'run-2',
      status: 'running',
      trackingState: 'active',
    });

    await act(async () => {
      vi.advanceTimersByTime(5_000);
      await Promise.resolve();
    });

    expect(getAiPathRunMock).toHaveBeenCalledTimes(2);
    expect(snapshots.at(-1)).toMatchObject({
      runId: 'run-2',
      status: 'completed',
      trackingState: 'stopped',
    });
  });

  it('shares one stream per run and closes it after the last unsubscribe', () => {
    const eventSource = new MockEventSource();
    streamAiPathRunMock.mockReturnValue(eventSource as unknown as EventSource);

    const firstListener = vi.fn();
    const secondListener = vi.fn();

    const unsubscribeFirst = subscribeToTrackedAiPathRun('run-3', firstListener);
    const unsubscribeSecond = subscribeToTrackedAiPathRun('run-3', secondListener);

    expect(streamAiPathRunMock).toHaveBeenCalledTimes(1);
    expect(firstListener).toHaveBeenCalledTimes(1);
    expect(secondListener).toHaveBeenCalledTimes(1);

    unsubscribeFirst();
    expect(eventSource.close).not.toHaveBeenCalled();

    unsubscribeSecond();
    expect(eventSource.close).toHaveBeenCalledTimes(1);
  });

  it('retries transient poll timeouts without stopping the tracked run', async () => {
    const eventSource = new MockEventSource();
    streamAiPathRunMock.mockReturnValue(eventSource as unknown as EventSource);
    getAiPathRunMock
      .mockResolvedValueOnce({
        ok: false,
        error: 'Request timeout after 15000ms',
      })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          run: createRunRecord({
            id: 'run-4',
            status: 'running',
            updatedAt: '2026-03-09T12:00:08.000Z',
          }),
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          run: createRunRecord({
            id: 'run-4',
            status: 'completed',
            updatedAt: '2026-03-09T12:00:10.000Z',
            finishedAt: '2026-03-09T12:00:10.000Z',
          }),
        },
      });

    const snapshots: TrackedAiPathRunSnapshot[] = [];
    subscribeToTrackedAiPathRun('run-4', (snapshot: TrackedAiPathRunSnapshot) => {
      snapshots.push(snapshot);
    });

    act(() => {
      eventSource.emit('error', new Event('error'));
    });
    await act(async () => {
      vi.advanceTimersByTime(0);
      await Promise.resolve();
    });

    expect(getAiPathRunMock).toHaveBeenCalledTimes(1);
    expect(snapshots.at(-1)).toMatchObject({
      runId: 'run-4',
      status: 'queued',
      trackingState: 'active',
      errorMessage: null,
    });

    await act(async () => {
      vi.advanceTimersByTime(5_000);
      await Promise.resolve();
    });

    expect(getAiPathRunMock).toHaveBeenCalledTimes(2);
    expect(snapshots.at(-1)).toMatchObject({
      runId: 'run-4',
      status: 'running',
      trackingState: 'active',
      errorMessage: null,
    });

    await act(async () => {
      vi.advanceTimersByTime(5_000);
      await Promise.resolve();
    });

    expect(getAiPathRunMock).toHaveBeenCalledTimes(3);
    expect(snapshots.at(-1)).toMatchObject({
      runId: 'run-4',
      status: 'completed',
      trackingState: 'stopped',
      errorMessage: null,
    });
    expect(
      snapshots.some(
        (snapshot) =>
          snapshot.trackingState === 'stopped' &&
          snapshot.errorMessage?.includes('Request timeout after 15000ms')
      )
    ).toBe(false);
  });

  it('keeps polling briefly when a newly tracked run detail returns not found', async () => {
    const eventSource = new MockEventSource();
    streamAiPathRunMock.mockReturnValue(eventSource as unknown as EventSource);
    getAiPathRunMock
      .mockResolvedValueOnce({
        ok: false,
        error: 'Run not found',
      })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          run: createRunRecord({
            id: 'run-not-found-grace',
            status: 'running',
            updatedAt: '2026-03-09T12:00:04.000Z',
          }),
        },
      });

    const snapshots: TrackedAiPathRunSnapshot[] = [];
    subscribeToTrackedAiPathRun('run-not-found-grace', (snapshot: TrackedAiPathRunSnapshot) => {
      snapshots.push(snapshot);
    });

    act(() => {
      eventSource.emit('error', new Event('error'));
    });
    await act(async () => {
      vi.advanceTimersByTime(0);
      await Promise.resolve();
    });

    expect(getAiPathRunMock).toHaveBeenCalledTimes(1);
    expect(snapshots.at(-1)).toMatchObject({
      runId: 'run-not-found-grace',
      status: 'queued',
      trackingState: 'active',
    });

    await act(async () => {
      vi.advanceTimersByTime(5_000);
      await Promise.resolve();
    });

    expect(getAiPathRunMock).toHaveBeenCalledTimes(2);
    expect(snapshots.at(-1)).toMatchObject({
      runId: 'run-not-found-grace',
      status: 'running',
      trackingState: 'active',
      errorMessage: null,
    });
  });

  it('returns a no-op unsubscribe for an empty runId', () => {
    const listener = vi.fn();
    const unsub = subscribeToTrackedAiPathRun('', listener);
    expect(listener).not.toHaveBeenCalled();
    expect(() => unsub()).not.toThrow();
  });

  it('returns a no-op unsubscribe for a whitespace-only runId', () => {
    const listener = vi.fn();
    const unsub = subscribeToTrackedAiPathRun('   ', listener);
    expect(listener).not.toHaveBeenCalled();
    expect(() => unsub()).not.toThrow();
  });

  it('surfaces errorSummary.primary.userMessage when run.errorMessage is absent', async () => {
    const eventSource = new MockEventSource();
    streamAiPathRunMock.mockReturnValue(eventSource as unknown as EventSource);
    getAiPathRunMock.mockResolvedValue({
      ok: true,
      data: {
        run: createRunRecord({
          id: 'run-err-summary',
          status: 'failed',
          finishedAt: '2026-03-09T12:00:05.000Z',
          updatedAt: '2026-03-09T12:00:05.000Z',
          errorMessage: null,
        }),
        errorSummary: {
          primary: {
            version: 1,
            code: 'AI_PATHS_NODE_FAILED',
            category: 'runtime',
            severity: 'error',
            scope: 'node',
            message: 'Internal node error.',
            userMessage: 'Database write affected 0 records for update.',
            timestamp: '2026-03-09T12:00:05.000Z',
            traceId: null,
            runId: 'run-err-summary',
            nodeId: 'node-1',
            nodeType: 'database',
            nodeTitle: 'DB Update',
            attempt: 1,
            iteration: null,
            retryable: false,
            retryAfterMs: null,
            statusCode: null,
            cause: null,
            causeChain: [],
            hints: [],
            metadata: null,
          },
          totalErrors: 1,
          reportCount: 1,
          retryable: false,
          lastErrorAt: '2026-03-09T12:00:05.000Z',
          codes: [{ code: 'AI_PATHS_NODE_FAILED', count: 1 }],
          nodeFailures: [],
        },
      },
    });

    const snapshots: TrackedAiPathRunSnapshot[] = [];
    subscribeToTrackedAiPathRun('run-err-summary', (snapshot) => {
      snapshots.push(snapshot);
    });

    act(() => {
      eventSource.emit('done', new Event('done'));
    });
    await flushAsync();

    expect(snapshots.at(-1)).toMatchObject({
      status: 'failed',
      trackingState: 'stopped',
      errorMessage: 'Database write affected 0 records for update.',
    });
  });

  it('clears errorMessage from snapshot for non-terminal run statuses', async () => {
    const eventSource = new MockEventSource();
    streamAiPathRunMock.mockReturnValue(eventSource as unknown as EventSource);
    getAiPathRunMock.mockResolvedValue({
      ok: true,
      data: {
        run: createRunRecord({
          id: 'run-non-term-err',
          status: 'running',
          updatedAt: '2026-03-09T12:00:03.000Z',
          errorMessage: 'Some transient warning',
        }),
      },
    });

    const snapshots: TrackedAiPathRunSnapshot[] = [];
    subscribeToTrackedAiPathRun('run-non-term-err', (snapshot) => {
      snapshots.push(snapshot);
    });

    act(() => {
      eventSource.emit('done', new Event('done'));
    });
    await flushAsync();

    const runningSnapshot = snapshots.find((s) => s.status === 'running');
    expect(runningSnapshot?.errorMessage).toBeNull();
  });

  it('finalizes with trackingState=stopped after max consecutive poll failures', async () => {
    const eventSource = new MockEventSource();
    streamAiPathRunMock.mockReturnValue(eventSource as unknown as EventSource);
    getAiPathRunMock.mockResolvedValue({
      ok: false,
      error: 'Internal Server Error',
    });

    const snapshots: TrackedAiPathRunSnapshot[] = [];
    subscribeToTrackedAiPathRun('run-maxfail', (snapshot) => {
      snapshots.push(snapshot);
    });

    // trigger stream error → switches to polling
    act(() => {
      eventSource.emit('error', new Event('error'));
    });
    // 3 poll failures (MAX_RUN_DETAIL_POLL_FAILURES = 3)
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        vi.advanceTimersByTime(5_000);
        await Promise.resolve();
      });
    }

    expect(snapshots.at(-1)?.trackingState).toBe('stopped');
    expect(getAiPathRunMock.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('finalizes terminal stream updates without surfacing transient detail timeouts', async () => {
    const eventSource = new MockEventSource();
    streamAiPathRunMock.mockReturnValue(eventSource as unknown as EventSource);
    getAiPathRunMock.mockResolvedValue({
      ok: false,
      error: 'Request timeout after 15000ms',
    });

    const snapshots: TrackedAiPathRunSnapshot[] = [];
    subscribeToTrackedAiPathRun('run-5', (snapshot: TrackedAiPathRunSnapshot) => {
      snapshots.push(snapshot);
    });

    act(() => {
      eventSource.emit(
        'run',
        new MessageEvent('message', {
          data: JSON.stringify(
            createRunRecord({
              id: 'run-5',
              status: 'completed',
              updatedAt: '2026-03-09T12:00:12.000Z',
              finishedAt: '2026-03-09T12:00:12.000Z',
            })
          ),
        })
      );
    });
    await flushAsync();

    expect(getAiPathRunMock).toHaveBeenCalledWith(
      'run-5',
      expect.objectContaining({
        cache: 'no-store',
        timeoutMs: 60_000,
      })
    );
    expect(snapshots.at(-1)).toMatchObject({
      runId: 'run-5',
      status: 'completed',
      trackingState: 'stopped',
      errorMessage: null,
      finishedAt: '2026-03-09T12:00:12.000Z',
    });
  });
});

// ── readTrackedAiPathRunSnapshot ──────────────────────────────────────────────

describe('readTrackedAiPathRunSnapshot', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getAiPathRunMock.mockReset();
    streamAiPathRunMock.mockReset();
    __resetTrackedAiPathRunClientStateForTests();
    vi.stubGlobal('EventSource', MockEventSource as unknown as typeof EventSource);
  });

  afterEach(() => {
    __resetTrackedAiPathRunClientStateForTests();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('returns null for an untracked runId', () => {
    expect(readTrackedAiPathRunSnapshot('run-not-tracked')).toBeNull();
  });

  it('returns the current snapshot for an actively tracked runId', () => {
    streamAiPathRunMock.mockReturnValue(new MockEventSource() as unknown as EventSource);
    subscribeToTrackedAiPathRun('run-read', vi.fn(), {
      initialSnapshot: { status: 'queued', entityId: 'product-42', entityType: 'product' },
    });

    const snapshot = readTrackedAiPathRunSnapshot('run-read');
    expect(snapshot).not.toBeNull();
    expect(snapshot!.runId).toBe('run-read');
    expect(snapshot!.entityId).toBe('product-42');
    expect(snapshot!.status).toBe('queued');
  });

  it('returns null after the last listener unsubscribes', () => {
    streamAiPathRunMock.mockReturnValue(new MockEventSource() as unknown as EventSource);
    const unsub = subscribeToTrackedAiPathRun('run-cleanup-read', vi.fn());
    unsub();
    expect(readTrackedAiPathRunSnapshot('run-cleanup-read')).toBeNull();
  });
});

// ── isTrackedAiPathRunTerminal ────────────────────────────────────────────────

describe('isTrackedAiPathRunTerminal', () => {
  const makeSnapshot = (status: TrackedAiPathRunSnapshot['status']): TrackedAiPathRunSnapshot => ({
    runId: 'run-1',
    status,
    updatedAt: null,
    finishedAt: null,
    errorMessage: null,
    entityId: null,
    entityType: null,
    trackingState: 'active',
  });

  it.each(['completed', 'failed', 'canceled', 'dead_lettered'] as const)(
    'returns true for terminal status %s',
    (status) => {
      expect(isTrackedAiPathRunTerminal(makeSnapshot(status))).toBe(true);
    }
  );

  it.each(['queued', 'running', 'blocked_on_lease', 'paused', 'handoff_ready'] as const)(
    'returns false for non-terminal status %s',
    (status) => {
      expect(isTrackedAiPathRunTerminal(makeSnapshot(status))).toBe(false);
    }
  );
});
