import { describe, it, expect, beforeEach, vi } from 'vitest';

import { GraphExecutionCancelled } from '@/shared/lib/ai-paths/core/runtime/engine-core';
import { evaluateGraphWithIteratorAutoContinue } from '@/shared/lib/ai-paths/core/runtime/engine-server';
import { executePathRun } from '@/features/ai/ai-paths/services/path-run-executor';
import type {
  AiNode,
  Edge,
  AiPathRunRecord,
  AiPathRunRepository,
  AiPathRunUpdate,
  AiPathRunStatus,
} from '@/shared/contracts/ai-paths';
import type { EvaluateGraphArgs } from '@/shared/lib/ai-paths/core/runtime/engine-modules/engine-types';

// Mock evaluateGraphWithIteratorAutoContinue directly in its source module
vi.mock('@/shared/lib/ai-paths/core/runtime/engine-server', () => ({
  evaluateGraphWithIteratorAutoContinue: vi.fn(),
}));

// Define stateful mockRepo
let runStore: Record<string, AiPathRunRecord> = {};

const mockRepo = vi.hoisted(() => {
  const repo: Partial<AiPathRunRepository> = {
    createRun: vi.fn().mockImplementation((args: any) => {
      const id = args.id || 'mock-run-id';
      const run: AiPathRunRecord = {
        id,
        status: (args.status as AiPathRunStatus) || 'queued',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: args.userId || null,
        pathId: args.pathId,
        requestId: args.requestId || null,
        source: args.source || 'api',
        triggerEvent: args.triggerEvent || null,
        triggerNodeId: args.triggerNodeId || null,
        triggerContext: args.triggerContext || null,
        graph: args.graph || null,
        meta: args.meta || {},
        runtimeState: args.runtimeState || null,
      } as any;
      runStore[id] = run;
      return Promise.resolve(run);
    }),
    listRunNodes: vi.fn().mockResolvedValue([]),
    listRunEvents: vi.fn().mockResolvedValue([]),
    findRunById: vi.fn().mockImplementation((id: string) => Promise.resolve(runStore[id] || null)),
    createRunNodes: vi.fn().mockResolvedValue(undefined),
    createRunEvent: vi.fn().mockResolvedValue({ id: 'mock-event-id' } as any),
    updateRun: vi.fn().mockImplementation((id: string, data: AiPathRunUpdate) => {
      if (runStore[id]) {
        runStore[id] = { ...runStore[id], ...data, updatedAt: new Date().toISOString() };
      }
      return Promise.resolve(runStore[id]);
    }),
    updateRunIfStatus: vi
      .fn()
      .mockImplementation((id: string, statuses: AiPathRunStatus[], data: AiPathRunUpdate) => {
        const run = runStore[id];
        if (run && statuses.includes(run.status)) {
          runStore[id] = { ...run, ...data, updatedAt: new Date().toISOString() };
          return Promise.resolve(runStore[id]);
        }
        return Promise.resolve(null);
      }),
    upsertRunNode: vi.fn().mockResolvedValue(undefined as any),
  };
  return repo as AiPathRunRepository;
});

vi.mock('@/features/ai/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: vi.fn().mockResolvedValue(mockRepo),
}));

describe('PathRunExecutor', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    runStore = {};

    // Default mocks
    vi.mocked(mockRepo.findRunById).mockImplementation((id: string) =>
      Promise.resolve(runStore[id] || null)
    );
    vi.mocked(mockRepo.listRunNodes).mockResolvedValue([]);
    vi.mocked(mockRepo.listRunEvents).mockResolvedValue([]);
  });

  const mockNodes: AiNode[] = [
    {
      id: 'node-111111111111111111111111',
      type: 'constant',
      title: 'Const',
      description: '',
      position: { x: 0, y: 0 },
      inputs: [],
      outputs: ['value'],
      config: { constant: { valueType: 'string', value: 'test' } },
    },
  ];

  const mockEdges: Edge[] = [];
  const disconnectedCompileNodes: AiNode[] = [
    {
      id: 'node-trigger-111111111111111111111111',
      type: 'trigger',
      title: 'Trigger',
      description: '',
      position: { x: 0, y: 0 },
      inputs: ['context'],
      outputs: ['trigger', 'context'],
      config: { trigger: { event: 'manual' } },
    },
    {
      id: 'node-model-111111111111111111111111',
      type: 'model',
      title: 'Model',
      description: '',
      position: { x: 180, y: 0 },
      inputs: ['prompt', 'context', 'images'],
      outputs: ['result'],
      inputContracts: {
        prompt: { required: true },
        images: { required: false },
      },
      config: {},
    },
    {
      id: 'node-viewer-111111111111111111111111',
      type: 'viewer',
      title: 'Viewer',
      description: '',
      position: { x: 360, y: 0 },
      inputs: ['result'],
      outputs: [],
      config: {},
    },
  ];
  const disconnectedCompileEdges: Edge[] = [
    {
      id: 'edge-model-viewer',
      from: 'node-model-111111111111111111111111',
      to: 'node-viewer-111111111111111111111111',
      fromPort: 'result',
      toPort: 'result',
    },
  ];

  it('should execute a run successfully', async () => {
    vi.mocked(evaluateGraphWithIteratorAutoContinue).mockResolvedValue({
      status: 'completed',
      nodeStatuses: { 'node-111111111111111111111111': 'completed' },
      nodeOutputs: { 'node-111111111111111111111111': { value: 'test' } },
      variables: {},
      events: [],
      inputs: { 'node-111111111111111111111111': {} },
      outputs: { 'node-111111111111111111111111': { value: 'test' } },
      history: {},
      hashes: { 'node-111111111111111111111111': 'hash' },
    });

    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: mockNodes, edges: mockEdges },
      meta: { aiPathsValidation: { enabled: false } },
    });

    await executePathRun(run);
    expect(evaluateGraphWithIteratorAutoContinue).toHaveBeenCalledTimes(1);

    const updatedRun = await mockRepo.findRunById(run.id);
    expect(updatedRun?.status).toBe('completed');
  });

  it('should fail the run if graph is invalid', async () => {
    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: null, // Invalid graph
    });

    try {
      await executePathRun(run);
    } catch {
      // Expected to throw
    }

    const updatedRun = await mockRepo.findRunById(run.id);
    expect(updatedRun?.status).toBe('failed');
    expect(updatedRun?.errorMessage).toBeTruthy();
  });

  it('should update node records during execution', async () => {
    vi.mocked(evaluateGraphWithIteratorAutoContinue).mockImplementation(
      async (options: EvaluateGraphArgs) => {
        const runStartedAt = new Date().toISOString();
        if (options.onNodeStart) {
          await options.onNodeStart({
            runId: options.runId!,
            runStartedAt,
            node: options.nodes[0]!,
            nodeInputs: {},
            prevOutputs: {},
            iteration: 0,
          });
        }
        if (options.onNodeFinish) {
          await options.onNodeFinish({
            runId: options.runId!,
            runStartedAt,
            node: options.nodes[0]!,
            nodeInputs: {},
            prevOutputs: {},
            nextOutputs: { value: 'done' },
            iteration: 0,
            changed: true,
          });
        }
        return {
          status: 'completed',
          outputs: { [options.nodes[0]!.id]: { value: 'done' } },
        } as any;
      }
    );

    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: mockNodes, edges: mockEdges },
      meta: { aiPathsValidation: { enabled: false } },
    });

    await executePathRun(run);

    expect(mockRepo.upsertRunNode).toHaveBeenCalled();
  });

  it('should persist cached node finishes as cached status', async () => {
    vi.mocked(evaluateGraphWithIteratorAutoContinue).mockImplementation(
      async (options: EvaluateGraphArgs) => {
        if (options.onNodeFinish) {
          await options.onNodeFinish({
            runId: options.runId!,
            runStartedAt: new Date().toISOString(),
            node: options.nodes[0]!,
            nodeInputs: {},
            prevOutputs: {},
            nextOutputs: { value: 'cached' },
            iteration: 0,
            changed: false,
            cached: true,
          });
        }
        return {
          status: 'completed',
          outputs: { [options.nodes[0]!.id]: { value: 'cached' } },
        } as any;
      }
    );

    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: mockNodes, edges: mockEdges },
      meta: { aiPathsValidation: { enabled: false } },
    });

    await executePathRun(run);

    expect(mockRepo.upsertRunNode).toHaveBeenCalledWith(
      expect.anything(),
      mockNodes[0]!.id,
      expect.objectContaining({ status: 'cached' })
    );
  });

  it('should persist blocked node finishes as blocked status', async () => {
    vi.mocked(evaluateGraphWithIteratorAutoContinue).mockImplementation(
      async (options: EvaluateGraphArgs) => {
        if (options.onNodeBlocked) {
          await options.onNodeBlocked({
            runId: options.runId!,
            node: options.nodes[0]!,
            reason: 'missing_inputs',
            waitingOnPorts: ['trigger'],
          });
        }
        return {
          status: 'blocked',
          outputs: { [options.nodes[0]!.id]: { waitingOnPorts: ['trigger'] } },
        } as any;
      }
    );

    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: mockNodes, edges: mockEdges },
      meta: { aiPathsValidation: { enabled: false } },
    });

    await executePathRun(run);

    expect(mockRepo.upsertRunNode).toHaveBeenCalledWith(
      expect.anything(),
      mockNodes[0]!.id,
      expect.objectContaining({ status: 'blocked' })
    );
  });

  it('does not fail run when halt is blocked but all blocked nodes are waiting_callback', async () => {
    const triggerNode: AiNode = {
      id: 'node-trigger-111111111111111111111111',
      type: 'trigger',
      title: 'Trigger',
      description: '',
      position: { x: 0, y: 0 },
      inputs: ['context'],
      outputs: ['trigger', 'triggerName'],
      config: { trigger: { event: 'manual' } },
    };

    vi.mocked(evaluateGraphWithIteratorAutoContinue).mockImplementation(
      async (options: EvaluateGraphArgs) => {
        if (options.onNodeBlocked) {
          await options.onNodeBlocked({
            runId: options.runId!,
            node: options.nodes[0]!,
            reason: 'missing_inputs',
            status: 'waiting_callback',
            waitingOnPorts: ['trigger'],
            message: 'Waiting for upstream trigger signal.',
          });
        }
        if (options.onHalt) {
          await options.onHalt({
            runId: options.runId!,
            reason: 'blocked',
            nodeStatuses: {
              [options.nodes[0]!.id]: 'waiting_callback',
            },
          });
        }
        return {
          status: 'running',
          outputs: {
            [options.nodes[0]!.id]: {
              status: 'waiting_callback',
              waitingOnPorts: ['trigger'],
            },
          },
          nodeOutputs: {
            [options.nodes[0]!.id]: {
              status: 'waiting_callback',
              waitingOnPorts: ['trigger'],
            },
          },
        } as any;
      }
    );

    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: [triggerNode], edges: [] },
      meta: {
        aiPathsValidation: { enabled: true },
        blockedRunPolicy: 'fail_run',
      },
    });

    await executePathRun(run);

    const updatedRun = await mockRepo.findRunById(run.id);
    expect(updatedRun?.status).toBe('completed');
    expect(updatedRun?.errorMessage ?? null).toBeNull();
  });

  it('should fail run when required processing node finishes with failed status', async () => {
    vi.mocked(evaluateGraphWithIteratorAutoContinue).mockImplementation(
      async (options: EvaluateGraphArgs) => {
        if (options.onNodeFinish) {
          await options.onNodeFinish({
            runId: options.runId!,
            runStartedAt: new Date().toISOString(),
            node: options.nodes[0]!,
            nodeInputs: {},
            prevOutputs: {},
            nextOutputs: {
              status: 'failed',
              error: 'Model provider timed out',
            },
            iteration: 0,
            changed: true,
          });
        }
        return {
          status: 'completed',
          outputs: {
            [options.nodes[0]!.id]: {
              status: 'failed',
              error: 'Model provider timed out',
            },
          },
        } as any;
      }
    );

    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: mockNodes, edges: mockEdges },
      meta: { aiPathsValidation: { enabled: false } },
    });

    await executePathRun(run);

    const updatedRun = await mockRepo.findRunById(run.id);
    expect(updatedRun?.status).toBe('failed');
    expect(updatedRun?.errorMessage).toContain('Run failed at Const');
    expect(updatedRun?.errorMessage).toContain('Model provider timed out');
  });

  it('should handle node errors correctly', async () => {
    vi.mocked(evaluateGraphWithIteratorAutoContinue).mockImplementation(
      async (options: EvaluateGraphArgs) => {
        const error = new Error('Execution failed');
        if (options.onNodeError) {
          await options.onNodeError({
            runId: options.runId!,
            runStartedAt: new Date().toISOString(),
            node: options.nodes[0]!,
            nodeInputs: {},
            prevOutputs: {},
            error,
            iteration: 0,
          });
        }
        throw error;
      }
    );

    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: mockNodes, edges: mockEdges },
      meta: { aiPathsValidation: { enabled: false } },
    });

    await expect(executePathRun(run)).rejects.toThrow('Execution failed');

    expect(mockRepo.upsertRunNode).toHaveBeenCalledWith(
      expect.anything(),
      mockNodes[0]!.id,
      expect.objectContaining({ status: 'failed' })
    );
  });

  it('should propagate cancellation to runtime evaluation via abort signal', async () => {
    vi.mocked(evaluateGraphWithIteratorAutoContinue).mockImplementation(
      async (_options: EvaluateGraphArgs) => {
        return new Promise(() => {});
      }
    );

    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: mockNodes, edges: mockEdges },
      meta: { aiPathsValidation: { enabled: false } },
    });

    const executionPromise = executePathRun(run);

    runStore[run.id]!.status = 'canceled';

    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      await executionPromise;
    } catch (e) {
      expect(e).toBeInstanceOf(GraphExecutionCancelled);

      const callArgs = vi.mocked(evaluateGraphWithIteratorAutoContinue).mock.calls[0]?.[0];
      expect(callArgs?.abortSignal).toBeDefined();
      expect(callArgs?.abortSignal).toBeInstanceOf(AbortSignal);
    }
  });

  it('should persist runtime trace profile summary for completed runs', async () => {
    vi.mocked(evaluateGraphWithIteratorAutoContinue).mockImplementation(
      async (options: EvaluateGraphArgs) => {
        if (options.profile?.onSummary) {
          options.profile.onSummary({
            runId: 'mock-run-id',
            durationMs: 1200,
            iterationCount: 1,
            nodeCount: 1,
            edgeCount: 0,
            nodes: [],
            hottestNodes: [],
          });
        }
        return {
          status: 'completed',
          outputs: { 'node-111111111111111111111111': { value: 'trace-ok' } },
        } as any;
      }
    );

    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: mockNodes, edges: mockEdges },
      meta: { aiPathsValidation: { enabled: false } },
    });

    await executePathRun(run);

    expect(mockRepo.updateRunIfStatus).toHaveBeenCalledWith(
      run.id,
      expect.anything(),
      expect.objectContaining({
        meta: expect.objectContaining({
          runtimeTrace: expect.objectContaining({
            profile: expect.objectContaining({
              summary: expect.objectContaining({
                durationMs: 1200,
              }),
            }),
          }),
        }),
      })
    );
  });

  it('should persist structured node spans in runtime trace metadata', async () => {
    vi.mocked(evaluateGraphWithIteratorAutoContinue).mockImplementation(
      async (options: EvaluateGraphArgs) => {
        const node = options.nodes[0]!;
        const spanId = `${node.id}:1:1`;
        if (options.onNodeStart) {
          await options.onNodeStart({
            runId: options.runId!,
            traceId: options.runId!,
            spanId,
            runStartedAt: new Date().toISOString(),
            node,
            nodeInputs: {},
            prevOutputs: {},
            iteration: 1,
            attempt: 1,
          });
        }
        if (options.onNodeFinish) {
          await options.onNodeFinish({
            runId: options.runId!,
            traceId: options.runId!,
            spanId,
            runStartedAt: new Date().toISOString(),
            node,
            nodeInputs: {},
            prevOutputs: {},
            nextOutputs: { value: 'span-ok' },
            iteration: 1,
            attempt: 1,
            changed: true,
          });
        }

        return {
          status: 'completed',
          outputs: { [node.id]: { value: 'span-ok' } },
        } as any;
      }
    );

    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: mockNodes, edges: mockEdges },
      meta: { aiPathsValidation: { enabled: false } },
    });

    await executePathRun(run);

    const updateCall = vi
      .mocked(mockRepo.updateRunIfStatus)
      .mock.calls.find((c) => (c[2] as any).meta?.runtimeTrace);
    const runtimeTrace = (updateCall?.[2] as any).meta.runtimeTrace;
    const nodeSpans = runtimeTrace?.profile?.nodeSpans ?? [];
    expect(nodeSpans.length).toBeGreaterThan(0);
    expect(nodeSpans[0]).toMatchObject({
      nodeId: mockNodes[0]!.id,
      status: 'completed',
    });
  });

  it('should persist effect metadata in runtime trace spans', async () => {
    vi.mocked(evaluateGraphWithIteratorAutoContinue).mockImplementation(
      async (options: EvaluateGraphArgs) => {
        const node = {
          ...options.nodes[0]!,
          type: 'http',
          config: {
            runtime: {
              sideEffectPolicy: 'per_activation',
            },
          },
        } as AiNode;
        const spanId = `${node.id}:1:1`;
        if (options.onNodeStart) {
          await options.onNodeStart({
            runId: options.runId!,
            traceId: options.runId!,
            spanId,
            runStartedAt: new Date().toISOString(),
            node,
            nodeInputs: { url: 'https://example.test/items' },
            prevOutputs: {},
            iteration: 1,
            attempt: 1,
          });
        }
        if (options.onNodeFinish) {
          await options.onNodeFinish({
            runId: options.runId!,
            traceId: options.runId!,
            spanId,
            runStartedAt: new Date().toISOString(),
            node,
            nodeInputs: { url: 'https://example.test/items' },
            prevOutputs: {},
            nextOutputs: { value: { ok: true } },
            iteration: 1,
            attempt: 1,
            changed: false,
            cached: true,
            cacheDecision: 'seed',
            sideEffectPolicy: 'per_activation',
            sideEffectDecision: 'skipped_duplicate',
            activationHash: 'activation-hash-1',
            idempotencyKey: 'http-node:activation-hash-1',
            effectSourceSpanId: 'node-111111111111111111111111:1:1',
          });
        }

        return {
          status: 'completed',
          outputs: { [node.id]: { value: { ok: true } } },
        } as any;
      }
    );

    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: mockNodes, edges: mockEdges },
      meta: { aiPathsValidation: { enabled: false } },
    });

    await executePathRun(run);

    const updateCall = vi
      .mocked(mockRepo.updateRunIfStatus)
      .mock.calls.find((c) => (c[2] as any).meta?.runtimeTrace);
    const runtimeTrace = (updateCall?.[2] as any).meta.runtimeTrace;
    expect(runtimeTrace?.spans?.[0]).toMatchObject({
      nodeId: mockNodes[0]!.id,
      cache: {
        decision: 'seed',
      },
      effect: {
        policy: 'per_activation',
        decision: 'skipped_duplicate',
        sourceSpanId: 'node-111111111111111111111111:1:1',
      },
      activationHash: 'activation-hash-1',
    });
  });

  it('should block execution when disabled node policy is violated', async () => {
    const previous = process.env['AI_PATHS_DISABLED_NODE_TYPES'];
    process.env['AI_PATHS_DISABLED_NODE_TYPES'] = 'constant';

    try {
      const run = await mockRepo.createRun({
        pathId: 'test',
        graph: { nodes: mockNodes, edges: mockEdges },
        meta: { aiPathsValidation: { enabled: false } },
      });

      await expect(executePathRun(run)).rejects.toThrow('Path blocked by node policy');
    } finally {
      if (previous === undefined) {
        delete process.env['AI_PATHS_DISABLED_NODE_TYPES'];
      } else {
        process.env['AI_PATHS_DISABLED_NODE_TYPES'] = previous;
      }
    }
  });

  it('should block strict runs when dependency inspector reports errors and node validation is enabled', async () => {
    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: disconnectedCompileNodes, edges: disconnectedCompileEdges },
      meta: {
        strictFlowMode: true,
        aiPathsValidation: { enabled: true },
      },
    });

    await expect(executePathRun(run)).rejects.toThrow(
      /is missing required input wiring for port "prompt"/
    );
  });

  it('should bypass strict-flow preflight when node validation is disabled', async () => {
    vi.mocked(evaluateGraphWithIteratorAutoContinue).mockResolvedValue({
      status: 'completed',
      outputs: {},
    } as any);

    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: disconnectedCompileNodes, edges: disconnectedCompileEdges },
      meta: {
        strictFlowMode: true,
        aiPathsValidation: { enabled: false },
      },
    });

    await executePathRun(run);
    expect(evaluateGraphWithIteratorAutoContinue).toHaveBeenCalledTimes(1);
  });

  it('should bypass compile blockers when node validation is disabled', async () => {
    vi.mocked(evaluateGraphWithIteratorAutoContinue).mockResolvedValue({
      status: 'completed',
      outputs: {},
    } as any);

    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: disconnectedCompileNodes, edges: disconnectedCompileEdges },
      meta: {
        strictFlowMode: false,
        aiPathsValidation: { enabled: false },
      },
    });

    await executePathRun(run);
    expect(evaluateGraphWithIteratorAutoContinue).toHaveBeenCalledTimes(1);
  });

  it('should block compile errors when node validation is enabled', async () => {
    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: disconnectedCompileNodes, edges: disconnectedCompileEdges },
      meta: {
        strictFlowMode: false,
        aiPathsValidation: { enabled: true },
      },
    });

    await expect(executePathRun(run)).rejects.toThrow(
      /is missing required input wiring for port "prompt"/
    );
    expect(evaluateGraphWithIteratorAutoContinue).not.toHaveBeenCalled();
  });

  it('should block run when AI Paths validation preflight policy fails', async () => {
    // A database node without a collection should fail validation
    const invalidNodes: AiNode[] = [
      {
        id: 'node-trigger-111111111111111111111111',
        type: 'trigger',
        title: 'Trigger',
        description: '',
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: ['trigger'],
        config: { trigger: { event: 'manual' } },
      },
      {
        id: 'node-db-111111111111111111111111',
        type: 'database',
        title: 'Database',
        description: '',
        position: { x: 300, y: 0 },
        inputs: ['trigger'],
        outputs: [],
        config: {
          database: {
            operation: 'query',
            query: {
              provider: 'auto',
              collection: '', // EMPTY collection should fail validation rule database.query.collection_declared
              mode: 'custom',
              preset: 'by_id',
              field: 'id',
              idType: 'string',
              queryTemplate: '{}',
              limit: 1,
              sort: '{}',
              projection: '{}',
              single: false,
            },
          },
        },
      },
    ];

    const invalidEdges: Edge[] = [
      {
        id: 'edge-1',
        from: 'node-trigger-111111111111111111111111',
        to: 'node-db-111111111111111111111111',
        fromPort: 'trigger',
        toPort: 'trigger',
      },
    ];

    const run = await mockRepo.createRun({
      pathId: 'test-validation-failure',
      graph: { nodes: invalidNodes, edges: invalidEdges },
      meta: {
        aiPathsValidation: {
          enabled: true,
          blockThreshold: 80,
        },
      },
    });

    await expect(executePathRun(run)).rejects.toThrow('Validation blocked run');
  });
});
