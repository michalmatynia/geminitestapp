import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiNode } from '@/shared/contracts/ai-paths';
import type { AiPathRuntimeNodeStatus, RuntimeState } from '@/shared/contracts/ai-paths-runtime';
import { GraphExecutionCancelled, GraphExecutionError } from '@/shared/lib/ai-paths/core/runtime';
import { normalizeAiPathRuntimeNodeStatus } from '@/shared/contracts/ai-paths-runtime';
import {
  DEPRECATED_RUNTIME_KERNEL_CONFIG_NODE_TYPES_FIELD,
  DEPRECATED_RUNTIME_KERNEL_CONFIG_RESOLVER_IDS_FIELD,
  DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_ALIAS_FIELD,
} from '@/shared/lib/ai-paths/core/runtime/runtime-kernel-legacy-aliases';

import type { LocalExecutionArgs } from '../types';

const evaluateGraphClientMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/lib/ai-paths/core/runtime', async () => {
  const actual =
    await vi.importActual<typeof import('@/shared/lib/ai-paths/core/runtime')>(
      '@/shared/lib/ai-paths/core/runtime'
    );
  return {
    ...actual,
    evaluateGraphClient: evaluateGraphClientMock,
  };
});

vi.mock('@/shared/lib/ai-paths', async () => {
  const actual =
    await vi.importActual<typeof import('@/shared/lib/ai-paths')>('@/shared/lib/ai-paths');
  return {
    ...actual,
    evaluateGraphClient: evaluateGraphClientMock,
  };
});

import { useLocalExecutionLoop } from '../segments/useLocalExecutionLoop';

const normalizeNodeStatus = normalizeAiPathRuntimeNodeStatus;

const buildLocalExecutionArgs = (): LocalExecutionArgs => {
  const triggerNode = {
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
  } as AiNode;
  const runtimeStateRef = {
    current: {
      status: 'idle',
      nodeStatuses: {},
      nodeOutputs: {},
      variables: {},
      events: [],
      currentRun: null,
      inputs: {},
      outputs: {},
      history: {},
    } as RuntimeState,
  };

  const setRuntimeState = vi.fn(
    (next: RuntimeState | ((previous: RuntimeState) => RuntimeState)): void => {
      runtimeStateRef.current = typeof next === 'function' ? next(runtimeStateRef.current) : next;
    }
  );

  return {
    activePathId: 'path-main',
    activeTab: 'runtime',
    activeTrigger: 'manual',
    executionMode: 'local',
    runMode: 'manual',
    strictFlowMode: true,
    blockedRunPolicy: 'fail_run',
    aiPathsValidation: {
      enabled: false,
    },
    historyRetentionPasses: 5,
    isPathActive: true,
    edges: [],
    normalizedNodes: [triggerNode],
    sanitizedEdges: [],
    pathName: 'Path Main',
    pathDescription: '',
    runtimeKernelConfig: {
      nodeTypes: 'Template Node, parser',
      codeObjectResolverIds: ' resolver.primary , resolver.fallback ',
      [DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_ALIAS_FIELD]: 'yes',
    },
    parserSamples: {},
    updaterSamples: {},
    sessionUser: null,
    runtimeStateRef,
    currentRunIdRef: { current: null },
    currentRunStartedAtRef: { current: null },
    currentRunStartedAtMsRef: { current: null },
    lastTriggerNodeIdRef: { current: null },
    lastTriggerEventRef: { current: null },
    triggerContextRef: { current: null },
    runLoopActiveRef: { current: false },
    runInFlightRef: { current: false },
    abortControllerRef: { current: null },
    pauseRequestedRef: { current: false },
    queuedRunsRef: { current: [] },
    serverRunActiveRef: { current: false },
    setRunStatus: vi.fn(),
    appendRuntimeEvent: vi.fn(),
    setNodeStatus: vi.fn(),
    setRuntimeState,
    setLastRunAt: vi.fn(),
    settleTransientNodeStatuses: vi.fn(),
    resetRuntimeNodeStatuses: vi.fn(),
    normalizeNodeStatus,
    formatStatusLabel: (status: AiPathRuntimeNodeStatus): string => status,
    hasPendingIteratorAdvance: vi.fn(() => false),
    fetchEntityByType: vi.fn(async () => null),
    reportAiPathsError: vi.fn(),
    toast: vi.fn(),
    stopServerRunStream: vi.fn(),
    runServerStream: vi.fn(async () => undefined),
  };
};

describe('useLocalExecutionLoop runtime kernel forwarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards normalized runtime-kernel options to local graph evaluation', async () => {
    evaluateGraphClientMock.mockResolvedValue({
      status: 'idle',
      nodeStatuses: {},
      nodeOutputs: {},
      variables: {},
      events: [],
      currentRun: null,
      inputs: {},
      outputs: {},
      history: {},
    } satisfies RuntimeState);

    const args = buildLocalExecutionArgs();
    const { result } = renderHook(() => useLocalExecutionLoop(args));

    await act(async () => {
      await result.current.runLocalLoop('run');
    });

    expect(evaluateGraphClientMock).toHaveBeenCalledTimes(1);
    expect(evaluateGraphClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        runtimeKernelNodeTypes: ['template_node', 'parser'],
        runtimeKernelCodeObjectResolverIds: ['resolver.primary', 'resolver.fallback'],
      })
    );
  });

  it('ignores legacy path-config runtime-kernel aliases during local execution', async () => {
    evaluateGraphClientMock.mockResolvedValue({
      status: 'idle',
      nodeStatuses: {},
      nodeOutputs: {},
      variables: {},
      events: [],
      currentRun: null,
      inputs: {},
      outputs: {},
      history: {},
    } satisfies RuntimeState);

    const args = buildLocalExecutionArgs();
    args.runtimeKernelConfig = {
      [DEPRECATED_RUNTIME_KERNEL_CONFIG_NODE_TYPES_FIELD]: 'Template Node, parser',
      [DEPRECATED_RUNTIME_KERNEL_CONFIG_RESOLVER_IDS_FIELD]:
        ' resolver.primary , resolver.fallback ',
      [DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_ALIAS_FIELD]: 'yes',
    };
    const { result } = renderHook(() => useLocalExecutionLoop(args));

    await act(async () => {
      await result.current.runLocalLoop('run');
    });

    const forwardedArgs = evaluateGraphClientMock.mock.calls.at(-1)?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(forwardedArgs?.['runtimeKernelNodeTypes']).toBeUndefined();
    expect(forwardedArgs?.['runtimeKernelCodeObjectResolverIds']).toBeUndefined();
  });

  it('returns paused immediately when a local run loop is already active', async () => {
    const args = buildLocalExecutionArgs();
    args.runLoopActiveRef.current = true;

    const { result } = renderHook(() => useLocalExecutionLoop(args));
    let outcome: Awaited<ReturnType<typeof result.current.runLocalLoop>> | null = null;

    await act(async () => {
      outcome = await result.current.runLocalLoop('run');
    });

    expect(outcome).toMatchObject({
      status: 'paused',
      state: args.runtimeStateRef.current,
    });
    expect(evaluateGraphClientMock).not.toHaveBeenCalled();
  });

  it('records node lifecycle callbacks, blocked nodes, and runtime validation warnings', async () => {
    const args = buildLocalExecutionArgs();
    const databaseNode = {
      id: 'node-db',
      type: 'database',
      title: 'Database Node',
      description: '',
      position: { x: 0, y: 0 },
      inputs: ['query'],
      outputs: ['rows'],
      data: {},
      createdAt: '2026-03-05T00:00:00.000Z',
      updatedAt: null,
    } as AiNode;
    const waitingNode = {
      ...databaseNode,
      id: 'node-waiting',
      title: 'Waiting Node',
    } as AiNode;
    args.normalizedNodes = [databaseNode, waitingNode];
    args.aiPathsValidation = {
      enabled: true,
    };

    evaluateGraphClientMock.mockImplementationOnce(async (options) => {
      options.onNodeStart?.({
        runId: 'run-1',
        runStartedAt: '2026-03-10T00:00:00.000Z',
        node: databaseNode,
        nodeInputs: { query: 'select * from products' },
        iteration: 1,
        runtimeStrategy: 'code_object_v3',
        runtimeResolutionSource: 'registry',
        runtimeCodeObjectId: 'resolver.db',
      });
      options.onNodeFinish?.({
        runId: 'run-1',
        runStartedAt: '2026-03-10T00:00:00.000Z',
        node: databaseNode,
        nodeInputs: { query: 'select * from products' },
        nextOutputs: {
          status: 'cached',
          provider: 'mongo',
          collection: 'products',
          rows: [{ id: 'product-1' }],
        },
        cached: true,
        iteration: 1,
        runtimeStrategy: 'code_object_v3',
        runtimeResolutionSource: 'registry',
        runtimeCodeObjectId: 'resolver.db',
      });
      options.onNodeError?.({
        runId: 'run-1',
        runStartedAt: '2026-03-10T00:00:00.000Z',
        node: databaseNode,
        nodeInputs: { query: 'select * from products' },
        prevOutputs: { status: 'running' },
        error: new Error('database failed'),
        iteration: 2,
        runtimeStrategy: 'compatibility',
        runtimeResolutionSource: 'override',
        runtimeCodeObjectId: 'resolver.fallback',
      });
      options.onNodeBlocked?.({
        runId: 'run-1',
        runStartedAt: '2026-03-10T00:00:00.000Z',
        traceId: 'trace-1',
        spanId: 'span-1',
        iteration: 3,
        attempt: 1,
        node: waitingNode,
        reason: 'waiting_callback',
        status: 'waiting_callback',
        waitingOnPorts: ['callback'],
        waitingOnDetails: [{ port: 'callback' }],
        message: 'Waiting for callback',
        runtimeStrategy: 'compatibility',
        runtimeResolutionSource: 'missing',
        runtimeCodeObjectId: null,
      });
      options.onRuntimeValidation?.({
        node: databaseNode,
        stage: 'node_post_execute',
        decision: 'warn',
        message: 'Validation warning',
        iteration: 3,
        issues: [{ id: 'issue-1', severity: 'warn', message: 'Warn' }],
        runtimeStrategy: 'compatibility',
        runtimeResolutionSource: 'registry',
        runtimeCodeObjectId: 'resolver.db',
      });
      return {
        ...args.runtimeStateRef.current,
        currentRun: {
          id: 'run-1',
          status: 'running',
          startedAt: '2026-03-10T00:00:00.000Z',
        },
      } satisfies RuntimeState;
    });

    const { result } = renderHook(() => useLocalExecutionLoop(args));
    let outcome: Awaited<ReturnType<typeof result.current.runLocalLoop>> | null = null;

    await act(async () => {
      outcome = await result.current.runLocalLoop('run');
    });

    expect(outcome?.status).toBe('completed');
    expect(args.setRunStatus).toHaveBeenCalledWith('running');
    expect(args.setNodeStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        nodeId: databaseNode.id,
        status: 'running',
        metadata: expect.objectContaining({
          runtimeStrategy: 'code_object_v3',
          runtimeResolutionSource: 'registry',
          runtimeCodeObjectId: 'resolver.db',
        }),
      })
    );
    expect(args.setNodeStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        nodeId: databaseNode.id,
        status: 'cached',
        message: 'Node Database Node reused cached outputs.',
        metadata: expect.objectContaining({
          runtimeStrategy: 'code_object_v3',
          runtimeResolutionSource: 'registry',
          runtimeCodeObjectId: 'resolver.db',
        }),
      })
    );
    expect(args.setNodeStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        nodeId: databaseNode.id,
        status: 'failed',
        metadata: expect.objectContaining({
          error: 'database failed',
          runtimeStrategy: 'compatibility',
          runtimeResolutionSource: 'override',
          runtimeCodeObjectId: 'resolver.fallback',
        }),
      })
    );
    expect(args.setNodeStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        nodeId: waitingNode.id,
        status: 'waiting_callback',
        message: 'Waiting for callback',
        metadata: expect.objectContaining({
          reason: 'waiting_callback',
          waitingOnPorts: ['callback'],
          runtimeStrategy: 'compatibility',
          runtimeResolutionSource: 'missing',
          runtimeCodeObjectId: null,
        }),
      })
    );
    expect(args.appendRuntimeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'runtime_validation_warn',
        message: 'Validation warning',
        metadata: expect.objectContaining({
          stage: 'node_post_execute',
          decision: 'warn',
          issueCount: 1,
          runtimeStrategy: 'compatibility',
          runtimeResolutionSource: 'registry',
          runtimeCodeObjectId: 'resolver.db',
        }),
      })
    );
  });

  it('treats blocked runs as errors when the blocked-run policy requires failure', async () => {
    const args = buildLocalExecutionArgs();
    const blockedNode = {
      id: 'node-blocked',
      type: 'parser',
      title: 'Blocked Node',
      description: '',
      position: { x: 0, y: 0 },
      inputs: ['value'],
      outputs: ['result'],
      data: {},
      createdAt: '2026-03-05T00:00:00.000Z',
      updatedAt: null,
    } as AiNode;
    args.normalizedNodes = [blockedNode];
    args.aiPathsValidation = {
      enabled: true,
    };
    args.blockedRunPolicy = 'fail_run';

    evaluateGraphClientMock.mockImplementationOnce(async (options) => {
      options.onHalt?.({ reason: 'blocked', iteration: 1 });
      return {
        ...args.runtimeStateRef.current,
        outputs: {
          [blockedNode.id]: {
            status: 'blocked',
            message: 'Blocked on missing input',
          },
        },
      } satisfies RuntimeState;
    });

    const { result } = renderHook(() => useLocalExecutionLoop(args));
    let outcome: Awaited<ReturnType<typeof result.current.runLocalLoop>> | null = null;

    await act(async () => {
      outcome = await result.current.runLocalLoop('run');
    });

    expect(outcome?.status).toBe('error');
    expect(outcome?.error).toBeInstanceOf(Error);
    expect((outcome?.error as Error).message).toBe('Blocked on missing input');
    expect(args.appendRuntimeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'run_blocked',
        level: 'error',
        message: 'Blocked on missing input',
      })
    );
  });

  it('continues through iterator-driven passes and pauses stepped runs at max iterations', async () => {
    const args = buildLocalExecutionArgs();
    const nextState = {
      ...args.runtimeStateRef.current,
      currentRun: {
        id: 'run-iterator',
        status: 'running',
        startedAt: '2026-03-10T00:00:00.000Z',
      },
    } satisfies RuntimeState;
    let iteration = 0;

    args.hasPendingIteratorAdvance = vi.fn(() => iteration === 1);
    evaluateGraphClientMock.mockImplementation(async (options) => {
      iteration += 1;
      if (iteration === 2) {
        options.onHalt?.({ reason: 'max_iterations', iteration });
      }
      return nextState;
    });

    const { result } = renderHook(() => useLocalExecutionLoop(args));
    let runOutcome: Awaited<ReturnType<typeof result.current.runLocalLoop>> | null = null;
    let stepOutcome: Awaited<ReturnType<typeof result.current.runLocalLoop>> | null = null;

    await act(async () => {
      runOutcome = await result.current.runLocalLoop('run');
    });

    expect(runOutcome?.status).toBe('completed');
    expect(evaluateGraphClientMock).toHaveBeenCalledTimes(3);

    iteration = 0;
    args.hasPendingIteratorAdvance = vi.fn(() => false);
    evaluateGraphClientMock.mockImplementationOnce(async (options) => {
      iteration += 1;
      options.onHalt?.({ reason: 'max_iterations', iteration });
      return nextState;
    });

    await act(async () => {
      stepOutcome = await result.current.runLocalLoop('step');
    });

    expect(stepOutcome?.status).toBe('paused');
  });

  it('returns canceled and error outcomes when the graph evaluator throws execution exceptions', async () => {
    const args = buildLocalExecutionArgs();
    const canceledState = {
      ...args.runtimeStateRef.current,
      currentRun: {
        id: 'run-canceled',
        status: 'running',
        startedAt: '2026-03-10T00:00:00.000Z',
      },
    } satisfies RuntimeState;
    const failedState = {
      ...args.runtimeStateRef.current,
      currentRun: {
        id: 'run-failed',
        status: 'running',
        startedAt: '2026-03-10T00:00:00.000Z',
      },
    } satisfies RuntimeState;

    evaluateGraphClientMock.mockRejectedValueOnce(
      new GraphExecutionCancelled('run canceled', canceledState)
    );
    evaluateGraphClientMock.mockRejectedValueOnce(
      new GraphExecutionError('run failed', failedState, 'node-trigger')
    );

    const { result } = renderHook(() => useLocalExecutionLoop(args));
    let canceledOutcome: Awaited<ReturnType<typeof result.current.runLocalLoop>> | null = null;
    let failedOutcome: Awaited<ReturnType<typeof result.current.runLocalLoop>> | null = null;

    await act(async () => {
      canceledOutcome = await result.current.runLocalLoop('run');
    });

    expect(canceledOutcome).toMatchObject({
      status: 'canceled',
      state: canceledState,
    });

    await act(async () => {
      failedOutcome = await result.current.runLocalLoop('run');
    });

    expect(failedOutcome).toMatchObject({
      status: 'error',
      state: failedState,
    });
    expect((failedOutcome?.error as Error).message).toBe('run failed');
  });
});
