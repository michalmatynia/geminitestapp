/**
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  AiPathRunEventRecord,
  AiPathRunNodeRecord,
  AiPathRunRecord,
} from '@/shared/contracts/ai-paths';

import { useDeadLetterRuns } from '../useDeadLetterRuns';

const mocks = vi.hoisted(() => ({
  listAiPathRunsMock: vi.fn(),
  getAiPathRunMock: vi.fn(),
  requeueAiPathDeadLetterRunsMock: vi.fn(),
  resumeAiPathRunMock: vi.fn(),
  retryAiPathRunNodeMock: vi.fn(),
  createMutationV2Mock: vi.fn(),
  createPaginatedListQueryV2Mock: vi.fn(),
  toastMock: vi.fn(),
  logClientErrorMock: vi.fn(),
  refetchMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/api', () => ({
  listAiPathRuns: (...args: unknown[]) => mocks.listAiPathRunsMock(...args),
  getAiPathRun: (...args: unknown[]) => mocks.getAiPathRunMock(...args),
  requeueAiPathDeadLetterRuns: (...args: unknown[]) => mocks.requeueAiPathDeadLetterRunsMock(...args),
  resumeAiPathRun: (...args: unknown[]) => mocks.resumeAiPathRunMock(...args),
  retryAiPathRunNode: (...args: unknown[]) => mocks.retryAiPathRunNodeMock(...args),
}));

vi.mock('@/shared/lib/query-factories-v2', () => ({
  createMutationV2:
    mocks.createMutationV2Mock as typeof import('@/shared/lib/query-factories-v2').createMutationV2,
  createPaginatedListQueryV2:
    mocks.createPaginatedListQueryV2Mock as typeof import('@/shared/lib/query-factories-v2').createPaginatedListQueryV2,
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  useToast: () => ({ toast: mocks.toastMock }),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: mocks.logClientErrorMock,
  logClientCatch: vi.fn(),
}));

const buildRun = (overrides: Partial<AiPathRunRecord> = {}): AiPathRunRecord =>
  ({
    id: overrides.id ?? 'run-1',
    status: overrides.status ?? 'dead_lettered',
    pathId: overrides.pathId ?? 'path-1',
    pathName: overrides.pathName ?? 'Path 1',
    createdAt: overrides.createdAt ?? '2026-03-09T12:00:00.000Z',
    updatedAt: overrides.updatedAt ?? overrides.createdAt ?? '2026-03-09T12:00:00.000Z',
    finishedAt: overrides.finishedAt ?? null,
    nextRetryAt: overrides.nextRetryAt ?? null,
    errorMessage: overrides.errorMessage ?? null,
    meta: overrides.meta ?? null,
    ...overrides,
  }) as AiPathRunRecord;

const buildNode = (overrides: Partial<AiPathRunNodeRecord> = {}): AiPathRunNodeRecord =>
  ({
    id: overrides.id ?? `row-${overrides.nodeId ?? 'node-1'}`,
    runId: overrides.runId ?? 'run-1',
    nodeId: overrides.nodeId ?? 'node-1',
    nodeType: overrides.nodeType ?? 'database',
    nodeTitle: overrides.nodeTitle ?? 'Node',
    status: overrides.status ?? 'failed',
    attempt: overrides.attempt ?? 1,
    createdAt: overrides.createdAt ?? '2026-03-09T12:00:01.000Z',
    updatedAt: overrides.updatedAt ?? '2026-03-09T12:00:02.000Z',
    startedAt: overrides.startedAt ?? null,
    finishedAt: overrides.finishedAt ?? null,
    completedAt: overrides.completedAt ?? null,
    errorMessage: overrides.errorMessage ?? null,
    ...overrides,
  }) as AiPathRunNodeRecord;

const buildEvent = (overrides: Partial<AiPathRunEventRecord> = {}): AiPathRunEventRecord =>
  ({
    id: overrides.id ?? 'event-1',
    runId: overrides.runId ?? 'run-1',
    type: overrides.type ?? 'run.updated',
    level: overrides.level ?? 'info',
    message: overrides.message ?? 'Event message',
    createdAt: overrides.createdAt ?? '2026-03-09T12:00:01.000Z',
    meta: overrides.meta ?? null,
    ...overrides,
  }) as AiPathRunEventRecord;

let runsQueryState: {
  data: { items: AiPathRunRecord[]; total: number } | undefined;
  error: Error | null;
  isLoading: boolean;
  isFetching: boolean;
  refetch: typeof mocks.refetchMock;
};

const eventSources: MockEventSource[] = [];

class MockEventSource {
  close = vi.fn();
  listeners = new Map<string, Set<(event: Event) => void>>();

  constructor(public url: string) {
    eventSources.push(this);
  }

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

describe('useDeadLetterRuns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventSources.length = 0;
    runsQueryState = {
      data: {
        items: [buildRun({ id: 'run-1' }), buildRun({ id: 'run-2' })],
        total: 2,
      },
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: mocks.refetchMock,
    };

    mocks.refetchMock.mockResolvedValue(undefined);
    mocks.createPaginatedListQueryV2Mock.mockImplementation(() => runsQueryState);
    mocks.createMutationV2Mock.mockImplementation((config: {
      mutationFn?: (variables: unknown) => Promise<unknown>;
      onSuccess?: (data: unknown, variables: unknown) => void | Promise<void>;
      onError?: (error: Error, variables: unknown) => void | Promise<void>;
    }) => {
      let variables: unknown;
      const runMutation = async (nextVariables: unknown): Promise<unknown> => {
        variables = nextVariables;
        try {
          const data = config.mutationFn ? await config.mutationFn(nextVariables) : undefined;
          await config.onSuccess?.(data, nextVariables);
          return data;
        } catch (error) {
          await config.onError?.(error as Error, nextVariables);
          return undefined;
        }
      };

      return {
        isPending: false,
        get variables() {
          return variables;
        },
        mutateAsync: runMutation,
        mutate: (nextVariables: unknown) => {
          void runMutation(nextVariables);
        },
      };
    });

    mocks.getAiPathRunMock.mockResolvedValue({
      ok: true,
      data: {
        run: buildRun({ id: 'run-1' }),
        nodes: [buildNode({ nodeId: 'node-1', status: 'failed' })],
        events: [buildEvent({ id: 'event-1' })],
      },
    });
    mocks.requeueAiPathDeadLetterRunsMock.mockResolvedValue({
      ok: true,
      data: { requeued: 2 },
    });
    mocks.resumeAiPathRunMock.mockResolvedValue({ ok: true, data: { run: {} } });
    mocks.retryAiPathRunNodeMock.mockResolvedValue({ ok: true, data: { run: {} } });
    vi.stubGlobal('EventSource', MockEventSource as unknown as typeof EventSource);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('surfaces dead-letter list query errors', async () => {
    runsQueryState = {
      ...runsQueryState,
      data: { items: [], total: 0 },
      error: new Error('Dead-letter runs failed to load.'),
    };

    renderHook(() => useDeadLetterRuns());

    await waitFor(() => {
      expect(mocks.toastMock).toHaveBeenCalledWith('Dead-letter runs failed to load.', {
        variant: 'error',
      });
    });

    expect(mocks.logClientErrorMock).toHaveBeenCalledWith(
      runsQueryState.error,
      expect.objectContaining({
        context: expect.objectContaining({
          source: 'useDeadLetterRuns',
          action: 'loadRuns',
        }),
      })
    );
  });

  it('selects visible runs and requeues them successfully', async () => {
    const { result } = renderHook(() => useDeadLetterRuns());

    act(() => {
      result.current.toggleSelectVisible();
    });

    await waitFor(() => {
      expect(Array.from(result.current.selectedIds)).toEqual(['run-1', 'run-2']);
    });

    act(() => {
      result.current.requeueSelected();
    });

    await waitFor(() => {
      expect(mocks.requeueAiPathDeadLetterRunsMock).toHaveBeenCalledWith({
        runIds: ['run-1', 'run-2'],
        mode: 'resume',
      });
    }, { timeout: 10000 });

    await waitFor(() => {
      expect(result.current.selectedIds.size).toBe(0);
    });

    expect(result.current.requeueingSelected).toBe(false);
    expect(mocks.refetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.toastMock).toHaveBeenCalledWith('Requeued 2 run(s) (resume).', {
      variant: 'success',
    });
  });

  it('loads run detail and applies streaming updates from SSE events', async () => {
    const { result } = renderHook(() => useDeadLetterRuns());

    await act(async () => {
      await result.current.handleOpenDetail('run-1');
    });

    await waitFor(() => {
      expect(eventSources).toHaveLength(1);
    });

    const source = eventSources[0];
    expect(source?.url).toContain(
      '/api/ai-paths/runs/run-1/stream?since=2026-03-09T12%3A00%3A01.000Z'
    );

    act(() => {
      source?.emit('ready', new Event('ready'));
    });

    await waitFor(() => {
      expect(result.current.streamStatus).toBe('live');
    });

    act(() => {
      source?.emit(
        'run',
        new MessageEvent('run', {
          data: JSON.stringify(buildRun({ id: 'run-1', status: 'running' })),
        })
      );
      source?.emit(
        'nodes',
        new MessageEvent('nodes', {
          data: JSON.stringify([
            buildNode({ nodeId: 'node-1', status: 'completed' }),
            buildNode({ nodeId: 'node-2', status: 'blocked' }),
          ]),
        })
      );
      source?.emit(
        'events',
        new MessageEvent('events', {
          data: JSON.stringify({
            events: [
              buildEvent({ id: 'event-1', createdAt: '2026-03-09T12:00:01.000Z' }),
              buildEvent({ id: 'event-2', createdAt: '2026-03-09T12:00:03.000Z' }),
            ],
            overflow: true,
            limit: 25,
          }),
        })
      );
    });

    expect(result.current.detail?.run.status).toBe('running');
    expect(result.current.detail?.nodes.map((node: AiPathRunNodeRecord) => node.nodeId)).toEqual([
      'node-1',
      'node-2',
    ]);
    expect(
      result.current.detail?.events.map((event: AiPathRunEventRecord) => event.id)
    ).toEqual(['event-1', 'event-2']);
    expect(result.current.eventsOverflow).toBe(true);
    expect(result.current.eventsBatchLimit).toBe(25);

    const latestSource = eventSources.at(-1);

    act(() => {
      latestSource?.emit('ready', new Event('ready'));
    });

    act(() => {
      latestSource?.emit('done', new Event('done'));
    });

    await waitFor(() => {
      expect(result.current.streamStatus).toBe('stopped');
    });
  });

  it('retries only failed or blocked nodes and reports partial retry failures', async () => {
    mocks.getAiPathRunMock.mockResolvedValue({
      ok: true,
      data: {
        run: buildRun({ id: 'run-1' }),
        nodes: [
          buildNode({ nodeId: 'node-failed', status: 'failed' }),
          buildNode({ nodeId: 'node-blocked', status: 'blocked' }),
          buildNode({ nodeId: 'node-completed', status: 'completed' }),
        ],
        events: [],
      },
    });
    mocks.retryAiPathRunNodeMock
      .mockResolvedValueOnce({ ok: true, data: { run: {} } })
      .mockResolvedValueOnce({ ok: false, error: 'Blocked node retry failed.' });

    const { result } = renderHook(() => useDeadLetterRuns());

    await act(async () => {
      await result.current.handleOpenDetail('run-1');
    });

    await waitFor(() => {
      expect(result.current.detail?.nodes).toHaveLength(3);
    });

    await act(async () => {
      await result.current.handleRetryFailedNodes();
    });

    expect(mocks.retryAiPathRunNodeMock).toHaveBeenCalledTimes(2);
    expect(mocks.retryAiPathRunNodeMock).toHaveBeenNthCalledWith(1, 'run-1', 'node-failed');
    expect(mocks.retryAiPathRunNodeMock).toHaveBeenNthCalledWith(2, 'run-1', 'node-blocked');
    expect(mocks.retryAiPathRunNodeMock).not.toHaveBeenCalledWith('run-1', 'node-completed');
    expect(mocks.toastMock).toHaveBeenCalledWith('Queued 1 node(s) for retry.', {
      variant: 'success',
    });
    expect(mocks.toastMock).toHaveBeenCalledWith('1 node(s) failed to retry.', {
      variant: 'error',
    });
    expect(mocks.refetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.getAiPathRunMock).toHaveBeenCalledTimes(2);
  });
});
