import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  AiNode,
  AiPathRuntimeNodeStatus,
  RuntimePortValues,
  RuntimeState,
} from '@/shared/lib/ai-paths';
import { normalizeAiPathRuntimeNodeStatus } from '@/shared/contracts/ai-paths-runtime';
import {
  DEPRECATED_RUNTIME_KERNEL_CONFIG_MODE_FIELD,
  DEPRECATED_RUNTIME_KERNEL_CONFIG_NODE_TYPES_FIELD,
  DEPRECATED_RUNTIME_KERNEL_CONFIG_RESOLVER_IDS_FIELD,
  DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_ALIAS_FIELD,
} from '@/shared/lib/ai-paths/core/runtime/runtime-kernel-legacy-aliases';

const enqueueAiPathRunMock = vi.hoisted(() => vi.fn());
const streamAiPathRunMock = vi.hoisted(() => vi.fn());
const createAiPathTriggerRequestIdMock = vi.hoisted(() => vi.fn());
const isRecoverableTriggerEnqueueErrorMock = vi.hoisted(() => vi.fn());
const recoverEnqueuedRunByRequestIdMock = vi.hoisted(() => vi.fn());
const logClientErrorMock = vi.hoisted(() => vi.fn());

const invalidateAiPathQueueMock = vi.hoisted(() => vi.fn());
const invalidateAiPathRunsMock = vi.hoisted(() => vi.fn());
const notifyAiPathRunEnqueuedMock = vi.hoisted(() => vi.fn());
const optimisticallyInsertAiPathRunInQueueCacheMock = vi.hoisted(() => vi.fn());

const setPathConfigsMock = vi.hoisted(() => vi.fn());
const graphActionsMock = vi.hoisted(() => ({
  setPathConfigs: setPathConfigsMock,
}));

vi.mock('@/shared/lib/ai-paths', async () => {
  const actual =
    await vi.importActual<typeof import('@/shared/lib/ai-paths')>('@/shared/lib/ai-paths');
  return {
    ...actual,
    enqueueAiPathRun: enqueueAiPathRunMock,
    streamAiPathRun: streamAiPathRunMock,
  };
});

vi.mock('@/shared/lib/query-invalidation', () => ({
  invalidateAiPathQueue: invalidateAiPathQueueMock,
  invalidateAiPathRuns: invalidateAiPathRunsMock,
  notifyAiPathRunEnqueued: notifyAiPathRunEnqueuedMock,
  optimisticallyInsertAiPathRunInQueueCache: optimisticallyInsertAiPathRunInQueueCacheMock,
}));

vi.mock('@/features/ai/ai-paths/context/GraphContext', () => ({
  useGraphActions: () => graphActionsMock,
}));

vi.mock('@/shared/lib/ai-paths/hooks/trigger-event-utils', () => ({
  createAiPathTriggerRequestId: createAiPathTriggerRequestIdMock,
  isRecoverableTriggerEnqueueError: isRecoverableTriggerEnqueueErrorMock,
}));

vi.mock('@/shared/lib/ai-paths/hooks/trigger-event-recovery', () => ({
  recoverEnqueuedRunByRequestId: recoverEnqueuedRunByRequestIdMock,
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: logClientErrorMock,
}));

import { useAiPathsServerExecution } from '../useAiPathsServerExecution';

const createWrapper = (): React.ComponentType<{ children: React.ReactNode }> => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

const buildTriggerNode = (): AiNode =>
  ({
    id: 'node-trigger',
    type: 'trigger',
    title: 'Trigger',
    description: '',
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: ['trigger'],
    data: {},
    config: {
      trigger: { event: 'manual' },
    },
    createdAt: '2026-03-05T00:00:00.000Z',
    updatedAt: null,
  }) as AiNode;

const buildFetcherNode = (): AiNode =>
  ({
    id: 'node-fetcher',
    type: 'fetcher',
    title: 'Fetcher',
    description: '',
    position: { x: 200, y: 0 },
    inputs: ['trigger'],
    outputs: ['status', 'value'],
    data: {},
    config: {},
    createdAt: '2026-03-05T00:00:00.000Z',
    updatedAt: null,
  }) as AiNode;

const normalizeNodeStatus = normalizeAiPathRuntimeNodeStatus;

describe('useAiPathsServerExecution history streaming', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('appends node history entries when SSE node updates arrive', async () => {
    let runtimeState: RuntimeState = {
      status: 'idle',
      nodeStatuses: {},
      nodeOutputs: {},
      variables: {},
      events: [],
      currentRun: null,
      inputs: {},
      outputs: {},
      history: {},
    };
    const runtimeStateRef = { current: runtimeState };
    const currentRunIdRef = { current: null as string | null };
    const currentRunStartedAtRef = { current: null as string | null };

    const setRuntimeState = vi.fn(
      (next: RuntimeState | ((prev: RuntimeState) => RuntimeState)): void => {
        runtimeState = typeof next === 'function' ? next(runtimeState) : next;
        runtimeStateRef.current = runtimeState;
      }
    );

    const listeners = new Map<string, Array<(event: Event) => void>>();
    const eventSource = {
      addEventListener: (type: string, listener: (event: Event) => void): void => {
        const existing = listeners.get(type) ?? [];
        existing.push(listener);
        listeners.set(type, existing);
      },
      close: vi.fn(),
      readyState: 1,
      onerror: null,
    } as unknown as EventSource;

    enqueueAiPathRunMock.mockResolvedValue({
      ok: true,
      data: {
        run: {
          id: 'run_server_1',
          status: 'queued',
          createdAt: '2026-03-05T07:10:00.000Z',
          updatedAt: '2026-03-05T07:10:00.000Z',
          pathId: 'path-main',
        },
      },
    });
    streamAiPathRunMock.mockReturnValue(eventSource);

    const triggerNode = buildTriggerNode();
    const fetcherNode = buildFetcherNode();

    const { result } = renderHook(
      () =>
        useAiPathsServerExecution({
          activePathId: 'path-main',
          pathName: 'Main Path',
          pathDescription: '',
          runtimeKernelConfig: {
            mode: 'auto',
            nodeTypes: ['template'],
            codeObjectResolverIds: ['resolver.path'],
          },
          activeTrigger: 'manual',
          executionMode: 'server',
          runMode: 'manual',
          strictFlowMode: true,
          blockedRunPolicy: 'fail_run',
          aiPathsValidation: { enabled: false },
          historyRetentionPasses: 5,
          normalizedNodes: [triggerNode, fetcherNode],
          sanitizedEdges: [],
          parserSamples: {},
          updaterSamples: {},
          runtimeStateRef,
          resetRuntimeNodeStatuses: vi.fn(),
          setRuntimeState,
          setRuntimeEvents: vi.fn(),
          appendRuntimeEvent: vi.fn(),
          setNodeStatus: vi.fn(),
          normalizeNodeStatus,
          formatStatusLabel: (status: AiPathRuntimeNodeStatus) => status,
          settleTransientNodeStatuses: vi.fn(),
          setRunStatus: vi.fn(),
          setLastRunAt: vi.fn(),
          toast: vi.fn(),
          currentRunIdRef,
          currentRunStartedAtRef,
          setCurrentRunId: vi.fn(),
          openRunDetail: vi.fn(),
        }),
      {
        wrapper: createWrapper(),
      }
    );

    await act(async () => {
      await result.current.runServerStream(triggerNode, 'manual', {});
    });
    const enqueueArgs = enqueueAiPathRunMock.mock.calls[0]?.[0] as
      | { meta?: Record<string, unknown> }
      | undefined;
    expect(enqueueArgs?.meta).toEqual(
      expect.objectContaining({
        runtimeKernelConfig: {
          nodeTypes: ['template'],
          codeObjectResolverIds: ['resolver.path'],
        },
      })
    );
    expect(enqueueAiPathRunMock.mock.calls[0]?.[1]).toEqual({ timeoutMs: 90_000 });

    const nodePayload = [
      {
        id: 'run_node_1',
        runId: 'run_server_1',
        traceId: 'run_server_1',
        spanId: 'node-fetcher:1:2',
        nodeId: fetcherNode.id,
        nodeType: fetcherNode.type,
        nodeTitle: fetcherNode.title,
        status: 'completed',
        iteration: 2,
        attempt: 1,
        inputs: {
          trigger: true,
        } as RuntimePortValues,
        outputs: {
          status: 'completed',
          value: 42,
        } as RuntimePortValues,
      },
    ];

    act(() => {
      const nodeHandlers = listeners.get('nodes') ?? [];
      const event = new MessageEvent('nodes', {
        data: JSON.stringify(nodePayload),
      });
      nodeHandlers.forEach((handler) => handler(event));
    });

    const nodeHistory = runtimeStateRef.current.history?.[fetcherNode.id] ?? [];
    expect(nodeHistory).toHaveLength(1);
    expect(nodeHistory[0]?.nodeType).toBe('fetcher');
    expect(nodeHistory[0]?.status).toBe('completed');
    expect(nodeHistory[0]?.traceId).toBe('run_server_1');
    expect(nodeHistory[0]?.spanId).toBe('node-fetcher:1:2');
    expect(nodeHistory[0]?.attempt).toBe(1);
    expect(nodeHistory[0]?.iteration).toBe(2);
    expect(nodeHistory[0]?.outputs?.['value']).toBe(42);
    expect(invalidateAiPathRunsMock).toHaveBeenCalled();
  });

  it('drops legacy runtime-kernel path aliases from enqueue metadata', async () => {
    let runtimeState: RuntimeState = {
      status: 'idle',
      nodeStatuses: {},
      nodeOutputs: {},
      variables: {},
      events: [],
      currentRun: null,
      inputs: {},
      outputs: {},
      history: {},
    };
    const runtimeStateRef = { current: runtimeState };
    const currentRunIdRef = { current: null as string | null };
    const currentRunStartedAtRef = { current: null as string | null };
    const setRuntimeState = vi.fn(
      (next: RuntimeState | ((prev: RuntimeState) => RuntimeState)): void => {
        runtimeState = typeof next === 'function' ? next(runtimeState) : next;
        runtimeStateRef.current = runtimeState;
      }
    );

    enqueueAiPathRunMock.mockResolvedValue({
      ok: true,
      data: {
        run: {
          id: 'run_server_2',
          status: 'queued',
          createdAt: '2026-03-05T07:10:00.000Z',
          updatedAt: '2026-03-05T07:10:00.000Z',
          pathId: 'path-main',
        },
      },
    });
    streamAiPathRunMock.mockReturnValue({
      addEventListener: vi.fn(),
      close: vi.fn(),
      readyState: 1,
      onerror: null,
    } as unknown as EventSource);

    const triggerNode = buildTriggerNode();

    const { result } = renderHook(
      () =>
        useAiPathsServerExecution({
          activePathId: 'path-main',
          pathName: 'Main Path',
          pathDescription: '',
          runtimeKernelConfig: {
            [DEPRECATED_RUNTIME_KERNEL_CONFIG_MODE_FIELD]: 'auto',
            [DEPRECATED_RUNTIME_KERNEL_CONFIG_NODE_TYPES_FIELD]: ['template'],
            [DEPRECATED_RUNTIME_KERNEL_CONFIG_RESOLVER_IDS_FIELD]: ['resolver.path'],
            [DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_ALIAS_FIELD]: true,
          },
          activeTrigger: 'manual',
          executionMode: 'server',
          runMode: 'manual',
          strictFlowMode: true,
          blockedRunPolicy: 'fail_run',
          aiPathsValidation: { enabled: false },
          historyRetentionPasses: 5,
          normalizedNodes: [triggerNode],
          sanitizedEdges: [],
          parserSamples: {},
          updaterSamples: {},
          runtimeStateRef,
          resetRuntimeNodeStatuses: vi.fn(),
          setRuntimeState,
          setRuntimeEvents: vi.fn(),
          appendRuntimeEvent: vi.fn(),
          setNodeStatus: vi.fn(),
          normalizeNodeStatus,
          formatStatusLabel: (status: AiPathRuntimeNodeStatus) => status,
          settleTransientNodeStatuses: vi.fn(),
          setRunStatus: vi.fn(),
          setLastRunAt: vi.fn(),
          toast: vi.fn(),
          currentRunIdRef,
          currentRunStartedAtRef,
          setCurrentRunId: vi.fn(),
          openRunDetail: vi.fn(),
        }),
      {
        wrapper: createWrapper(),
      }
    );

    await act(async () => {
      await result.current.runServerStream(triggerNode, 'manual', {});
    });

    const enqueueArgs = enqueueAiPathRunMock.mock.calls[0]?.[0] as
      | { meta?: Record<string, unknown> }
      | undefined;
    expect(enqueueArgs?.meta).not.toHaveProperty('runtimeKernelConfig');
    expect(enqueueAiPathRunMock.mock.calls[0]?.[1]).toEqual({ timeoutMs: 90_000 });
  });

  it('recovers queued server runs after a transport failure', async () => {
    let runtimeState: RuntimeState = {
      status: 'idle',
      nodeStatuses: {},
      nodeOutputs: {},
      variables: {},
      events: [],
      currentRun: null,
      inputs: {},
      outputs: {},
      history: {},
    };
    const runtimeStateRef = { current: runtimeState };
    const currentRunIdRef = { current: null as string | null };
    const currentRunStartedAtRef = { current: null as string | null };
    const setRuntimeState = vi.fn(
      (next: RuntimeState | ((prev: RuntimeState) => RuntimeState)): void => {
        runtimeState = typeof next === 'function' ? next(runtimeState) : next;
        runtimeStateRef.current = runtimeState;
      }
    );
    const appendRuntimeEvent = vi.fn();
    const setNodeStatus = vi.fn();
    const settleTransientNodeStatuses = vi.fn();
    const setRunStatus = vi.fn();
    const toast = vi.fn();

    createAiPathTriggerRequestIdMock.mockReturnValue('trigger:path-main:req-1');
    enqueueAiPathRunMock.mockResolvedValue({
      ok: false,
      error: 'Failed to fetch',
    });
    isRecoverableTriggerEnqueueErrorMock.mockReturnValue(true);
    recoverEnqueuedRunByRequestIdMock.mockResolvedValue({
      runId: 'run_server_recovered',
      runRecord: {
        id: 'run_server_recovered',
        status: 'queued',
        pathId: 'path-main',
        createdAt: '2026-03-05T07:10:00.000Z',
        updatedAt: '2026-03-05T07:10:00.000Z',
      },
    });
    streamAiPathRunMock.mockReturnValue({
      addEventListener: vi.fn(),
      close: vi.fn(),
      readyState: 1,
      onerror: null,
    } as unknown as EventSource);

    const triggerNode = buildTriggerNode();

    const { result } = renderHook(
      () =>
        useAiPathsServerExecution({
          activePathId: 'path-main',
          pathName: 'Main Path',
          pathDescription: '',
          runtimeKernelConfig: {
            mode: 'auto',
            nodeTypes: ['template'],
            codeObjectResolverIds: ['resolver.path'],
          },
          activeTrigger: 'manual',
          executionMode: 'server',
          runMode: 'manual',
          strictFlowMode: true,
          blockedRunPolicy: 'fail_run',
          aiPathsValidation: { enabled: false },
          historyRetentionPasses: 5,
          normalizedNodes: [triggerNode],
          sanitizedEdges: [],
          parserSamples: {},
          updaterSamples: {},
          runtimeStateRef,
          resetRuntimeNodeStatuses: vi.fn(),
          setRuntimeState,
          setRuntimeEvents: vi.fn(),
          appendRuntimeEvent,
          setNodeStatus,
          normalizeNodeStatus,
          formatStatusLabel: (status: AiPathRuntimeNodeStatus) => status,
          settleTransientNodeStatuses,
          setRunStatus,
          setLastRunAt: vi.fn(),
          toast,
          currentRunIdRef,
          currentRunStartedAtRef,
          setCurrentRunId: vi.fn(),
          openRunDetail: vi.fn(),
        }),
      {
        wrapper: createWrapper(),
      }
    );

    await act(async () => {
      await result.current.runServerStream(triggerNode, 'manual', {});
    });

    expect(createAiPathTriggerRequestIdMock).toHaveBeenCalledWith({
      pathId: 'path-main',
      triggerEventId: 'manual',
      entityType: 'custom',
      entityId: null,
    });
    const enqueueArgs = enqueueAiPathRunMock.mock.calls[0]?.[0] as
      | { requestId?: string; meta?: Record<string, unknown> }
      | undefined;
    expect(enqueueArgs?.requestId).toBe('trigger:path-main:req-1');
    expect(enqueueArgs?.meta?.['requestId']).toBe('trigger:path-main:req-1');
    expect(enqueueAiPathRunMock.mock.calls[0]?.[1]).toEqual({ timeoutMs: 90_000 });
    expect(recoverEnqueuedRunByRequestIdMock).toHaveBeenCalledWith({
      pathId: 'path-main',
      requestId: 'trigger:path-main:req-1',
    });
    expect(appendRuntimeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'run_warning',
        message: 'Recovered queued server run after losing the enqueue response.',
      })
    );
    expect(notifyAiPathRunEnqueuedMock).toHaveBeenCalledWith('run_server_recovered', {
      entityId: null,
      entityType: null,
    });
    expect(toast).not.toHaveBeenCalledWith(expect.stringContaining('Failed to enqueue'), {
      variant: 'error',
    });
    expect(settleTransientNodeStatuses).not.toHaveBeenCalledWith(
      'failed',
      {},
      { settleQueued: true }
    );
  });

  it('logs reconnecting server stream failures as warn-level client reports', async () => {
    vi.stubGlobal('EventSource', { CONNECTING: 0 });

    let runtimeState: RuntimeState = {
      status: 'idle',
      nodeStatuses: {},
      nodeOutputs: {},
      variables: {},
      events: [],
      currentRun: null,
      inputs: {},
      outputs: {},
      history: {},
    };
    const runtimeStateRef = { current: runtimeState };
    const currentRunIdRef = { current: null as string | null };
    const currentRunStartedAtRef = { current: null as string | null };
    const setRuntimeState = vi.fn(
      (next: RuntimeState | ((prev: RuntimeState) => RuntimeState)): void => {
        runtimeState = typeof next === 'function' ? next(runtimeState) : next;
        runtimeStateRef.current = runtimeState;
      }
    );
    const appendRuntimeEvent = vi.fn();
    const listeners = new Map<string, Array<(event: Event) => void>>();
    const eventSource = {
      addEventListener: (type: string, listener: (event: Event) => void): void => {
        const existing = listeners.get(type) ?? [];
        existing.push(listener);
        listeners.set(type, existing);
      },
      close: vi.fn(),
      readyState: 0,
      onerror: null,
    } as unknown as EventSource;

    enqueueAiPathRunMock.mockResolvedValue({
      ok: true,
      data: {
        run: {
          id: 'run_server_warn',
          status: 'queued',
          createdAt: '2026-03-05T07:10:00.000Z',
          updatedAt: '2026-03-05T07:10:00.000Z',
          pathId: 'path-main',
        },
      },
    });
    streamAiPathRunMock.mockReturnValue(eventSource);

    const triggerNode = buildTriggerNode();

    const { result } = renderHook(
      () =>
        useAiPathsServerExecution({
          activePathId: 'path-main',
          pathName: 'Main Path',
          pathDescription: '',
          runtimeKernelConfig: null,
          activeTrigger: 'manual',
          executionMode: 'server',
          runMode: 'manual',
          strictFlowMode: true,
          blockedRunPolicy: 'fail_run',
          aiPathsValidation: { enabled: false },
          historyRetentionPasses: 5,
          normalizedNodes: [triggerNode],
          sanitizedEdges: [],
          parserSamples: {},
          updaterSamples: {},
          runtimeStateRef,
          resetRuntimeNodeStatuses: vi.fn(),
          setRuntimeState,
          setRuntimeEvents: vi.fn(),
          appendRuntimeEvent,
          setNodeStatus: vi.fn(),
          normalizeNodeStatus,
          formatStatusLabel: (status: AiPathRuntimeNodeStatus) => status,
          settleTransientNodeStatuses: vi.fn(),
          setRunStatus: vi.fn(),
          setLastRunAt: vi.fn(),
          toast: vi.fn(),
          currentRunIdRef,
          currentRunStartedAtRef,
          setCurrentRunId: vi.fn(),
          openRunDetail: vi.fn(),
        }),
      {
        wrapper: createWrapper(),
      }
    );

    await act(async () => {
      await result.current.runServerStream(triggerNode, 'manual', {});
    });

    act(() => {
      eventSource.onerror?.(new Event('error'));
    });

    expect(logClientErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Server run stream disconnected — reconnecting',
      }),
      expect.objectContaining({
        context: expect.objectContaining({
          source: 'useAiPathsServerExecution',
          action: 'eventSourceOnError',
          level: 'warn',
          runId: 'run_server_warn',
          readyState: 0,
        }),
      })
    );
    expect(appendRuntimeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'run_warning',
        level: 'warn',
        message: 'Stream disconnected — attempting to reconnect...',
      })
    );
  });
});
