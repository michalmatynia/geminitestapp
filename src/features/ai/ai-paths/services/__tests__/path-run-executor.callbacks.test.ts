import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { recordRuntimeNodeStatusMock, logClientErrorMock, logSystemEventMock } = vi.hoisted(() => ({
  recordRuntimeNodeStatusMock: vi.fn(),
  logClientErrorMock: vi.fn(),
  logSystemEventMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/services/runtime-analytics-service', () => ({
  recordRuntimeNodeStatus: recordRuntimeNodeStatusMock,
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: logClientErrorMock,
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: logSystemEventMock,
}));

const loadModule = async () =>
  await import('@/features/ai/ai-paths/services/path-run-executor/callbacks');

type TestContextOptions = {
  runId?: string;
  pathId?: string | null;
  pathName?: string | null;
  traceId?: string;
  resumeByNodeId?: Map<string, {
    mode: 'resume' | 'retry' | 'replay';
    decision: 'reused' | 'reexecuted';
    reason:
      | 'completed_upstream'
      | 'failed_node'
      | 'downstream_of_failure'
      | 'retry_target'
      | 'downstream_of_retry'
      | 'incomplete'
      | 'replay_requested';
    sourceTraceId?: string | null;
    sourceSpanId?: string | null;
    sourceRunStartedAt?: string | null;
    sourceStatus?:
      | 'pending'
      | 'running'
      | 'completed'
      | 'cached'
      | 'failed'
      | 'blocked'
      | 'waiting_callback'
      | 'advance_pending'
      | 'timeout'
      | 'canceled'
      | 'skipped'
      | null;
  }>;
};

const buildTestContext = (options: TestContextOptions = {}) => {
  const repo = {
    upsertRunNode: vi.fn().mockResolvedValue(undefined),
    createRunEvent: vi.fn().mockResolvedValue(undefined),
  };
  const profiling = {
    beginRuntimeNodeSpan: vi.fn(),
    finalizeRuntimeNodeSpan: vi.fn(),
  };
  const upsertRuntimeTraceSpan = vi.fn();
  const syncRuntimeTraceMeta = vi.fn();
  const publishNodeUpdate = vi.fn();
  const throttledSaveIntermediateState = vi.fn().mockResolvedValue(undefined);
  const reportAiPathsError = vi.fn();
  const appendRuntimeHistoryEntry = vi.fn();
  const setRuntimeNodeStatus = vi.fn();
  const accInputs: Record<string, Record<string, unknown>> = {};
  const accOutputs: Record<string, Record<string, unknown>> = {};
  const ctx = {
    run: {
      id: options.runId ?? 'run-callbacks-1',
      pathId: options.pathId ?? 'path-callbacks-1',
      pathName: options.pathName ?? 'Callback Test Path',
    },
    repo,
    traceId: options.traceId ?? 'trace-callbacks-1',
    profiling,
    upsertRuntimeTraceSpan,
    syncRuntimeTraceMeta,
    publishNodeUpdate,
    throttledSaveIntermediateState,
    reportAiPathsError,
    runtimeKernelExecutionTelemetry: {
      runtimeKernelNodeTypes: [],
      runtimeKernelNodeTypesSource: 'default',
      runtimeKernelCodeObjectResolverIds: [],
      runtimeKernelCodeObjectResolverIdsSource: 'default',
    },
    accInputs,
    accOutputs,
    logNodeStartEvents: false,
    resumeByNodeId: options.resumeByNodeId ?? new Map(),
    appendRuntimeHistoryEntry,
    setRuntimeNodeStatus,
  };

  return {
    ctx,
    repo,
    profiling,
    upsertRuntimeTraceSpan,
    syncRuntimeTraceMeta,
    publishNodeUpdate,
    throttledSaveIntermediateState,
    reportAiPathsError,
    appendRuntimeHistoryEntry,
    setRuntimeNodeStatus,
    accInputs,
    accOutputs,
  };
};

describe('path-run-executor callbacks', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-09T13:00:00.000Z'));
    recordRuntimeNodeStatusMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('records cached database finishes with event metadata and analytics', async () => {
    const resumeByNodeId = new Map([
      [
        'node-db',
        {
          mode: 'resume' as const,
          decision: 'reused' as const,
          reason: 'completed_upstream' as const,
          sourceTraceId: 'trace-prev',
          sourceSpanId: 'span-prev',
          sourceRunStartedAt: '2026-04-09T12:55:00.000Z',
          sourceStatus: 'completed' as const,
        },
      ],
    ]);
    const {
      ctx,
      repo,
      profiling,
      upsertRuntimeTraceSpan,
      syncRuntimeTraceMeta,
      publishNodeUpdate,
      throttledSaveIntermediateState,
      reportAiPathsError,
      accInputs,
      accOutputs,
    } = buildTestContext({ resumeByNodeId });

    const { createCallbacks } = await loadModule();
    const callbacks = createCallbacks(ctx as never);

    await callbacks.onNodeFinish({
      runId: 'run-callbacks-1',
      traceId: 'trace-callbacks-1',
      spanId: 'span-db-1',
      node: {
        id: 'node-db',
        type: 'database',
        title: 'Orders Query',
      } as never,
      nodeInputs: {
        collection: 'orders',
      },
      prevOutputs: {
        status: 'running',
      },
      nextOutputs: {
        status: 'completed',
        bundle: {
          collection: 'orders',
          requestedProvider: 'mongodb',
          resolvedProvider: 'mongodb',
          count: 3,
        },
      },
      iteration: 2,
      attempt: 1,
      changed: true,
      cached: true,
      sideEffectPolicy: 'per_activation',
      sideEffectDecision: 'skipped_duplicate',
      activationHash: 'activation-1',
      idempotencyKey: 'idempotency-1',
      effectSourceSpanId: 'span-source-1',
      runtimeStrategy: 'code_object_v3',
      runtimeResolutionSource: 'registry',
      runtimeCodeObjectId: 'code-object-1',
    });

    expect(profiling.finalizeRuntimeNodeSpan).toHaveBeenCalledWith({
      spanId: 'span-db-1',
      status: 'cached',
      finishedAt: '2026-04-09T13:00:00.000Z',
    });
    expect(upsertRuntimeTraceSpan).toHaveBeenCalledWith(
      'span-db-1',
      expect.objectContaining({
        nodeId: 'node-db',
        nodeType: 'database',
        iteration: 2,
        attempt: 1,
        status: 'cached',
        finishedAt: '2026-04-09T13:00:00.000Z',
        activationHash: 'activation-1',
        cache: expect.objectContaining({
          decision: 'hit',
        }),
        effect: expect.objectContaining({
          policy: 'per_activation',
          decision: 'skipped_duplicate',
          sourceSpanId: 'span-source-1',
        }),
        resume: expect.objectContaining({
          mode: 'resume',
          decision: 'reused',
        }),
      })
    );
    expect(syncRuntimeTraceMeta).toHaveBeenCalledTimes(1);
    expect(publishNodeUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        nodeId: 'node-db',
        status: 'cached',
        traceId: 'trace-callbacks-1',
        spanId: 'span-db-1',
        finishedAt: '2026-04-09T13:00:00.000Z',
        errorMessage: null,
      })
    );
    expect(repo.upsertRunNode).toHaveBeenCalledWith('run-callbacks-1', 'node-db', {
      status: 'cached',
      attempt: 1,
      inputs: {
        collection: 'orders',
      },
      outputs: {
        status: 'completed',
        bundle: {
          collection: 'orders',
          requestedProvider: 'mongodb',
          resolvedProvider: 'mongodb',
          count: 3,
        },
      },
      finishedAt: '2026-04-09T13:00:00.000Z',
      nodeType: 'database',
      error: null,
    });
    expect(repo.createRunEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-callbacks-1',
        level: 'info',
        message: 'Node Orders Query reused cached outputs.',
        metadata: expect.objectContaining({
          traceId: 'trace-callbacks-1',
          spanId: 'span-db-1',
          nodeId: 'node-db',
          nodeType: 'database',
          cached: true,
          cacheDecision: 'hit',
          sideEffectPolicy: 'per_activation',
          sideEffectDecision: 'skipped_duplicate',
          activationHash: 'activation-1',
          idempotencyKey: 'idempotency-1',
          effectSourceSpanId: 'span-source-1',
          runtimeStrategy: 'code_object_v3',
          runtimeResolutionSource: 'registry',
          runtimeCodeObjectId: 'code-object-1',
          resumeMode: 'resume',
          resumeDecision: 'reused',
          nodeMetadata: {
            database: {
              collection: 'orders',
              requestedProvider: 'mongodb',
              resolvedProvider: 'mongodb',
              count: 3,
            },
          },
        }),
      })
    );
    expect(recordRuntimeNodeStatusMock).toHaveBeenCalledWith({
      runId: 'run-callbacks-1',
      nodeId: 'node-db',
      status: 'cached',
    });
    expect(throttledSaveIntermediateState).toHaveBeenCalledTimes(1);
    expect(reportAiPathsError).not.toHaveBeenCalled();
    expect(logClientErrorMock).not.toHaveBeenCalled();
    expect(accInputs['node-db']).toEqual({
      collection: 'orders',
    });
    expect(accOutputs['node-db']).toEqual(
      expect.objectContaining({
        status: 'cached',
        bundle: {
          collection: 'orders',
          requestedProvider: 'mongodb',
          resolvedProvider: 'mongodb',
          count: 3,
        },
      })
    );
  });

  it('emits structured lifecycle system logs with node durations when enabled', async () => {
    const { ctx, repo } = buildTestContext();
    ctx.logNodeStartEvents = true;

    const { createCallbacks } = await loadModule();
    const callbacks = createCallbacks(ctx as never);

    await callbacks.onNodeStart({
      runId: 'run-callbacks-1',
      traceId: 'trace-callbacks-1',
      spanId: 'span-lifecycle-1',
      runStartedAt: '2026-04-09T12:59:00.000Z',
      node: {
        id: 'node-model',
        type: 'model',
        title: 'Normalize Name',
      } as never,
      nodeInputs: {
        prompt: 'normalize this product',
      },
      prevOutputs: null,
      iteration: 1,
      attempt: 1,
      runtimeStrategy: 'code_object_v3',
      runtimeResolutionSource: 'registry',
      runtimeCodeObjectId: 'code-object-9',
    });

    vi.setSystemTime(new Date('2026-04-09T13:00:00.250Z'));

    await callbacks.onNodeFinish({
      runId: 'run-callbacks-1',
      traceId: 'trace-callbacks-1',
      spanId: 'span-lifecycle-1',
      runStartedAt: '2026-04-09T12:59:00.000Z',
      node: {
        id: 'node-model',
        type: 'model',
        title: 'Normalize Name',
      } as never,
      nodeInputs: {
        prompt: 'normalize this product',
      },
      prevOutputs: null,
      nextOutputs: {
        status: 'completed',
        title: 'Normalized Product Name',
      },
      iteration: 1,
      attempt: 1,
      changed: true,
      cached: false,
      runtimeStrategy: 'code_object_v3',
      runtimeResolutionSource: 'registry',
      runtimeCodeObjectId: 'code-object-9',
    });

    expect(logSystemEventMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        level: 'info',
        source: 'ai-paths-executor',
        context: expect.objectContaining({
          event: 'node.started',
          runId: 'run-callbacks-1',
          traceId: 'trace-callbacks-1',
          spanId: 'span-lifecycle-1',
          nodeId: 'node-model',
          nodeType: 'model',
          status: 'running',
          startedAt: '2026-04-09T13:00:00.000Z',
          durationMs: null,
          runtimeStrategy: 'code_object_v3',
          runtimeResolutionSource: 'registry',
          runtimeCodeObjectId: 'code-object-9',
        }),
      })
    );
    expect(logSystemEventMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        level: 'info',
        source: 'ai-paths-executor',
        context: expect.objectContaining({
          event: 'node.finished',
          runId: 'run-callbacks-1',
          traceId: 'trace-callbacks-1',
          spanId: 'span-lifecycle-1',
          nodeId: 'node-model',
          nodeType: 'model',
          status: 'completed',
          startedAt: '2026-04-09T13:00:00.000Z',
          finishedAt: '2026-04-09T13:00:00.250Z',
          durationMs: 250,
          cacheDecision: 'miss',
        }),
      })
    );
    expect(repo.createRunEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Node Normalize Name started.',
      })
    );
    expect(repo.createRunEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Node Normalize Name finished with status: completed.',
        metadata: expect.objectContaining({
          durationMs: 250,
        }),
      })
    );
  });

  it('tracks waiting-callback blocks without marking node analytics complete', async () => {
    const resumeByNodeId = new Map([
      [
        'node-callback',
        {
          mode: 'replay' as const,
          decision: 'reexecuted' as const,
          reason: 'replay_requested' as const,
          sourceTraceId: 'trace-original',
          sourceSpanId: 'span-original',
          sourceRunStartedAt: '2026-04-09T12:40:00.000Z',
          sourceStatus: 'blocked' as const,
        },
      ],
    ]);
    const {
      ctx,
      repo,
      upsertRuntimeTraceSpan,
      syncRuntimeTraceMeta,
      publishNodeUpdate,
      throttledSaveIntermediateState,
      reportAiPathsError,
      accOutputs,
    } = buildTestContext({ resumeByNodeId });

    const { createCallbacks } = await loadModule();
    const callbacks = createCallbacks(ctx as never);

    await callbacks.onNodeBlocked({
      runId: 'run-callbacks-1',
      traceId: 'trace-callbacks-1',
      spanId: 'span-callback-1',
      node: {
        id: 'node-callback',
        type: 'http',
        title: 'Await Callback',
      } as never,
      iteration: 4,
      attempt: 2,
      reason: 'waiting_callback',
      status: 'waiting_callback',
      message: 'Awaiting webhook callback.',
      waitingOnPorts: ['callback_url'],
      waitingOnDetails: [{ kind: 'webhook', attempt: 2 }],
      runtimeStrategy: 'code_object_v3',
      runtimeResolutionSource: 'override',
      runtimeCodeObjectId: null,
    });

    expect(upsertRuntimeTraceSpan).toHaveBeenCalledWith(
      'span-callback-1',
      expect.objectContaining({
        nodeId: 'node-callback',
        nodeType: 'http',
        iteration: 4,
        attempt: 2,
        finishedAt: '2026-04-09T13:00:00.000Z',
        status: 'waiting_callback',
        resume: expect.objectContaining({
          mode: 'replay',
          decision: 'reexecuted',
        }),
        error: {
          message: 'Awaiting webhook callback.',
        },
      })
    );
    expect(syncRuntimeTraceMeta).toHaveBeenCalledTimes(1);
    expect(publishNodeUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        nodeId: 'node-callback',
        status: 'waiting_callback',
        traceId: 'trace-callbacks-1',
        spanId: 'span-callback-1',
        errorMessage: 'Awaiting webhook callback.',
        outputs: {
          status: 'waiting_callback',
          skipReason: 'waiting_callback',
          message: 'Awaiting webhook callback.',
          blockedReason: 'waiting_callback',
          waitingOnPorts: ['callback_url'],
          waitingOnDetails: [{ kind: 'webhook', attempt: 2 }],
        },
      })
    );
    expect(repo.upsertRunNode).toHaveBeenCalledWith('run-callbacks-1', 'node-callback', {
      status: 'waiting_callback',
      attempt: 2,
      outputs: {
        status: 'waiting_callback',
        skipReason: 'waiting_callback',
        message: 'Awaiting webhook callback.',
        blockedReason: 'waiting_callback',
        waitingOnPorts: ['callback_url'],
        waitingOnDetails: [{ kind: 'webhook', attempt: 2 }],
      },
      finishedAt: '2026-04-09T13:00:00.000Z',
      nodeType: 'http',
      error: 'Awaiting webhook callback.',
    });
    expect(repo.createRunEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-callbacks-1',
        level: 'info',
        message: 'Node Await Callback waiting: Awaiting webhook callback.',
        metadata: expect.objectContaining({
          traceId: 'trace-callbacks-1',
          spanId: 'span-callback-1',
          runId: 'run-callbacks-1',
          nodeId: 'node-callback',
          nodeType: 'http',
          reason: 'waiting_callback',
          status: 'waiting_callback',
          waitingOnPorts: ['callback_url'],
          runtimeResolutionSource: 'override',
          runtimeCodeObjectId: null,
          resumeMode: 'replay',
          resumeDecision: 'reexecuted',
        }),
      })
    );
    expect(recordRuntimeNodeStatusMock).not.toHaveBeenCalled();
    expect(throttledSaveIntermediateState).toHaveBeenCalledTimes(1);
    expect(reportAiPathsError).not.toHaveBeenCalled();
    expect(logClientErrorMock).not.toHaveBeenCalled();
    expect(accOutputs['node-callback']).toEqual(
      expect.objectContaining({
        status: 'waiting_callback',
        waitingOnPorts: ['callback_url'],
        waitingOnDetails: [{ kind: 'webhook', attempt: 2 }],
      })
    );
  });

  it('records seeded node reuse into runtime history, trace spans, and status state', async () => {
    const {
      ctx,
      repo,
      profiling,
      upsertRuntimeTraceSpan,
      syncRuntimeTraceMeta,
      publishNodeUpdate,
      throttledSaveIntermediateState,
      reportAiPathsError,
      appendRuntimeHistoryEntry,
      setRuntimeNodeStatus,
      accInputs,
      accOutputs,
    } = buildTestContext({
      runId: 'run-callbacks-2',
      pathId: 'path-seeded',
      pathName: 'Seeded Path',
      traceId: 'trace-seeded',
    });

    const { createCallbacks } = await loadModule();
    const callbacks = createCallbacks(ctx as never);

    await callbacks.recordNodeReuse({
      node: {
        id: 'node-seeded',
        type: 'agent',
        title: 'Seeded Agent',
      } as never,
      spanId: 'span-seeded-1',
      iteration: 3,
      attempt: 0,
      nodeInputs: {
        prompt: 'hello',
      },
      nodeOutputs: {
        status: 'completed',
        answer: 'world',
      },
      resume: {
        mode: 'resume',
        decision: 'reused',
        reason: 'completed_upstream',
        sourceTraceId: 'trace-origin',
        sourceSpanId: null,
        sourceRunStartedAt: '2026-04-09T12:10:00.000Z',
        sourceStatus: 'completed',
      },
      sourceHistory: {
        timestamp: '2026-04-09T12:12:00.000Z',
        nodeId: 'node-seeded',
        nodeType: 'agent',
        nodeTitle: 'Seeded Agent',
        status: 'completed',
        iteration: 1,
        attempt: 0,
        inputs: {
          prompt: 'hello',
        },
        outputs: {
          status: 'completed',
          answer: 'world',
        },
        inputHash: 'input-hash-origin',
        sideEffectPolicy: 'per_run',
        sideEffectDecision: 'executed',
        activationHash: 'activation-origin',
        idempotencyKey: 'idempotency-origin',
        spanId: 'span-source-history',
        inputsFrom: [{ nodeId: 'node-a', nodeType: 'input', nodeTitle: 'Input', fromPort: null, toPort: 'prompt' }],
        outputsTo: [{ nodeId: 'node-b', nodeType: 'output', nodeTitle: 'Output', fromPort: 'answer', toPort: null }],
        durationMs: 25,
        runtimeStrategy: 'code_object_v3',
        runtimeResolutionSource: 'registry',
        runtimeCodeObjectId: 'code-origin',
        pathId: 'path-origin',
        pathName: 'Origin Path',
      },
    });

    expect(profiling.beginRuntimeNodeSpan).toHaveBeenCalledWith({
      spanId: 'span-seeded-1',
      nodeId: 'node-seeded',
      nodeType: 'agent',
      nodeTitle: 'Seeded Agent',
      iteration: 3,
      attempt: 0,
      startedAt: '2026-04-09T13:00:00.000Z',
    });
    expect(profiling.finalizeRuntimeNodeSpan).toHaveBeenCalledWith({
      spanId: 'span-seeded-1',
      status: 'cached',
      finishedAt: '2026-04-09T13:00:00.000Z',
    });
    expect(upsertRuntimeTraceSpan).toHaveBeenCalledWith(
      'span-seeded-1',
      expect.objectContaining({
        nodeId: 'node-seeded',
        nodeType: 'agent',
        iteration: 3,
        attempt: 0,
        startedAt: '2026-04-09T13:00:00.000Z',
        finishedAt: '2026-04-09T13:00:00.000Z',
        status: 'cached',
        activationHash: 'activation-origin',
        cache: expect.objectContaining({
          decision: 'seed',
        }),
        effect: expect.objectContaining({
          policy: 'per_run',
          sourceSpanId: 'span-source-history',
        }),
        resume: expect.objectContaining({
          mode: 'resume',
          decision: 'reused',
          sourceTraceId: 'trace-origin',
        }),
      })
    );
    expect(syncRuntimeTraceMeta).toHaveBeenCalledTimes(1);
    expect(setRuntimeNodeStatus).toHaveBeenCalledWith('node-seeded', 'cached');
    expect(appendRuntimeHistoryEntry).toHaveBeenCalledWith(
      'node-seeded',
      expect.objectContaining({
        timestamp: '2026-04-09T13:00:00.000Z',
        pathId: 'path-seeded',
        pathName: 'Seeded Path',
        traceId: 'trace-seeded',
        spanId: 'span-seeded-1',
        nodeId: 'node-seeded',
        nodeType: 'agent',
        nodeTitle: 'Seeded Agent',
        status: 'cached',
        iteration: 3,
        attempt: 0,
        inputs: {
          prompt: 'hello',
        },
        outputs: {
          status: 'completed',
          answer: 'world',
        },
        cacheDecision: 'seed',
        sideEffectPolicy: 'per_run',
        sideEffectDecision: 'executed',
        activationHash: 'activation-origin',
        idempotencyKey: 'idempotency-origin',
        effectSourceSpanId: 'span-source-history',
        resumeMode: 'resume',
        resumeDecision: 'reused',
        resumeReason: 'completed_upstream',
        resumeSourceTraceId: 'trace-origin',
        resumeSourceSpanId: null,
        resumeSourceRunStartedAt: '2026-04-09T12:10:00.000Z',
        resumeSourceStatus: 'completed',
        inputsFrom: [{ nodeId: 'node-a', nodeType: 'input', nodeTitle: 'Input', fromPort: null, toPort: 'prompt' }],
        outputsTo: [{ nodeId: 'node-b', nodeType: 'output', nodeTitle: 'Output', fromPort: 'answer', toPort: null }],
        durationMs: 0,
        runtimeStrategy: 'code_object_v3',
        runtimeResolutionSource: 'registry',
        runtimeCodeObjectId: 'code-origin',
      })
    );
    expect(publishNodeUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        nodeId: 'node-seeded',
        status: 'cached',
        traceId: 'trace-seeded',
        spanId: 'span-seeded-1',
        startedAt: '2026-04-09T13:00:00.000Z',
        finishedAt: '2026-04-09T13:00:00.000Z',
        errorMessage: null,
      })
    );
    expect(repo.upsertRunNode).toHaveBeenCalledWith('run-callbacks-2', 'node-seeded', {
      nodeType: 'agent',
      nodeTitle: 'Seeded Agent',
      status: 'cached',
      attempt: 0,
      inputs: {
        prompt: 'hello',
      },
      outputs: {
        status: 'completed',
        answer: 'world',
      },
      startedAt: '2026-04-09T13:00:00.000Z',
      finishedAt: '2026-04-09T13:00:00.000Z',
      error: null,
    });
    expect(repo.createRunEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-callbacks-2',
        level: 'info',
        message: 'Node Seeded Agent reused seeded outputs during resume.',
        metadata: expect.objectContaining({
          traceId: 'trace-seeded',
          spanId: 'span-seeded-1',
          nodeId: 'node-seeded',
          nodeType: 'agent',
          cached: true,
          cacheDecision: 'seed',
          sideEffectPolicy: 'per_run',
          effectSourceSpanId: 'span-source-history',
          activationHash: 'activation-origin',
          resumeMode: 'resume',
          resumeDecision: 'reused',
          resumeReason: 'completed_upstream',
        }),
      })
    );
    expect(recordRuntimeNodeStatusMock).toHaveBeenCalledWith({
      runId: 'run-callbacks-2',
      nodeId: 'node-seeded',
      status: 'cached',
    });
    expect(throttledSaveIntermediateState).toHaveBeenCalledTimes(1);
    expect(reportAiPathsError).not.toHaveBeenCalled();
    expect(logClientErrorMock).not.toHaveBeenCalled();
    expect(accInputs['node-seeded']).toEqual({
      prompt: 'hello',
    });
    expect(accOutputs['node-seeded']).toEqual(
      expect.objectContaining({
        status: 'cached',
        answer: 'world',
      })
    );
  });
});
