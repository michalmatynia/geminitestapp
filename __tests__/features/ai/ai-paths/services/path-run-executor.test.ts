import { describe, it, expect, beforeEach, vi } from 'vitest';

import { 
  GraphExecutionCancelled,
} from '@/shared/lib/ai-paths';
import { evaluateGraphWithIteratorAutoContinue } from '@/shared/lib/ai-paths/core/runtime/engine-server';
import { executePathRun } from '@/features/ai/ai-paths/services/path-run-executor';
import type { AiNode, Edge, AiPathRunRecord } from '@/shared/contracts/ai-paths';

// Mock evaluateGraphWithIteratorAutoContinue directly in its source module
vi.mock('@/shared/lib/ai-paths/core/runtime/engine-server', () => ({
  evaluateGraphWithIteratorAutoContinue: vi.fn(),
}));

// Define stateful mockRepo
let runStore: Record<string, any> = {};

const mockRepo = vi.hoisted(() => ({
  createRun: vi.fn().mockImplementation((args) => {
    const id = args.id || 'mock-run-id';
    const run = { 
      id, 
      status: 'queued',
      createdAt: new Date().toISOString(),
      ...args 
    };
    runStore[id] = run;
    return Promise.resolve(run);
  }),
  listRunNodes: vi.fn().mockResolvedValue([]),
  listRunEvents: vi.fn().mockResolvedValue([]),
  findRunById: vi.fn().mockImplementation((id) => Promise.resolve(runStore[id] || null)),
  createRunNodes: vi.fn().mockResolvedValue(undefined),
  createRunEvent: vi.fn().mockResolvedValue({ id: 'mock-event-id' }),
  updateRun: vi.fn().mockImplementation((id, data) => {
    if (runStore[id]) {
      runStore[id] = { ...runStore[id], ...data };
    }
    return Promise.resolve(runStore[id]);
  }),
  updateRunIfStatus: vi.fn().mockImplementation((id, statuses, data) => {
    if (runStore[id] && statuses.includes(runStore[id].status)) {
      runStore[id] = { ...runStore[id], ...data };
      return Promise.resolve(runStore[id]);
    }
    return Promise.resolve(null);
  }),
  updateRunNode: vi.fn().mockResolvedValue(undefined),
  upsertRunNode: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/ai/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: vi.fn().mockResolvedValue(mockRepo),
}));

describe('PathRunExecutor', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    runStore = {};
    
    // Default mocks
    mockRepo.findRunById.mockImplementation((id) => Promise.resolve(runStore[id] || null));
    mockRepo.listRunNodes.mockResolvedValue([]);
    mockRepo.listRunEvents.mockResolvedValue([]);
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
      config: { constant: { valueType: 'string', value: 'test' } }
    }
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
    (evaluateGraphWithIteratorAutoContinue as any).mockResolvedValue({
      inputs: { 'node-111111111111111111111111': {} },
      outputs: { 'node-111111111111111111111111': { value: 'test' } },
      hashes: { 'node-111111111111111111111111': 'hash' }
    });

    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: mockNodes, edges: mockEdges },
      meta: { aiPathsValidation: { enabled: false } },
    });

    await executePathRun(run as AiPathRunRecord);
    expect(evaluateGraphWithIteratorAutoContinue).toHaveBeenCalledTimes(1);

    const updatedRun = await mockRepo.findRunById(run.id);
    expect(updatedRun.status).toBe('completed');
  });

  it('should fail the run if graph is invalid', async () => {
    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: null as any // Invalid graph
    });

    await executePathRun(run as AiPathRunRecord);

    const updatedRun = await mockRepo.findRunById(run.id);
    expect(updatedRun.status).toBe('failed');
    expect(updatedRun.errorMessage).toContain('Run graph is missing or invalid.');
  });

  it('should update node records during execution', async () => {
    (evaluateGraphWithIteratorAutoContinue as any).mockImplementation(async (options: any) => {
      const runStartedAt = options.runStartedAt;
      await options.onNodeStart({
        node: options.nodes[0],
        nodeInputs: {},
        prevOutputs: {},
        iteration: 0,
        runStartedAt,
      });
      await options.onNodeFinish({
        node: options.nodes[0],
        nodeInputs: {},
        nextOutputs: { value: 'done' },
        iteration: 0,
        runStartedAt,
      });
      return { outputs: { [options.nodes[0].id]: { value: 'done' } } };
    });

    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: mockNodes, edges: mockEdges },
      meta: { aiPathsValidation: { enabled: false } },
    });

    await executePathRun(run as AiPathRunRecord);
    
    expect(mockRepo.upsertRunNode).toHaveBeenCalled();
  });

  it('should persist cached node finishes as cached status', async () => {
    (evaluateGraphWithIteratorAutoContinue as any).mockImplementation(async (options: any) => {
      await options.onNodeFinish({
        node: options.nodes[0],
        nodeInputs: {},
        prevOutputs: {},
        nextOutputs: { value: 'cached' },
        iteration: 0,
        cached: true,
      });
      return { outputs: { [options.nodes[0].id]: { value: 'cached' } } };
    });

    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: mockNodes, edges: mockEdges },
      meta: { aiPathsValidation: { enabled: false } },
    });

    await executePathRun(run as AiPathRunRecord);
    
    expect(mockRepo.upsertRunNode).toHaveBeenCalledWith(
      expect.anything(),
      mockNodes[0]!.id,
      expect.objectContaining({ status: 'cached' })
    );
  });

  it('should persist blocked node finishes as blocked status', async () => {
    (evaluateGraphWithIteratorAutoContinue as any).mockImplementation(async (options: any) => {
      await options.onNodeBlocked({
        node: options.nodes[0],
        reason: 'missing_inputs',
        waitingOnPorts: ['trigger'],
      });
      return { outputs: { [options.nodes[0].id]: { waitingOnPorts: ['trigger'] } } };
    });

    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: mockNodes, edges: mockEdges },
      meta: { aiPathsValidation: { enabled: false } },
    });

    await executePathRun(run as AiPathRunRecord);
    
    expect(mockRepo.upsertRunNode).toHaveBeenCalledWith(
      expect.anything(),
      mockNodes[0]!.id,
      expect.objectContaining({ status: 'blocked' })
    );
  });

  it('should handle node errors correctly', async () => {
    (evaluateGraphWithIteratorAutoContinue as any).mockImplementation(async (options: any) => {
      const error = new Error('Execution failed');
      await options.onNodeError({
        node: options.nodes[0],
        nodeInputs: {},
        prevOutputs: {},
        error,
        iteration: 0,
      });
      throw error;
    });

    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: mockNodes, edges: mockEdges },
      meta: { aiPathsValidation: { enabled: false } },
    });

    await expect(executePathRun(run as AiPathRunRecord)).rejects.toThrow('Execution failed');
    
    expect(mockRepo.upsertRunNode).toHaveBeenCalledWith(
      expect.anything(),
      mockNodes[0]!.id,
      expect.objectContaining({ status: 'failed' })
    );
  });

  it('should propagate cancellation to runtime evaluation via abort signal', async () => {
    (evaluateGraphWithIteratorAutoContinue as any).mockImplementation(async (_options: any) => {
      return new Promise(() => {});
    });

    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: mockNodes, edges: mockEdges },
      meta: { aiPathsValidation: { enabled: false } },
    });

    const executionPromise = executePathRun(run as AiPathRunRecord);

    runStore[run.id].status = 'canceled';

    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      await executionPromise;
    } catch (e) {
      expect(e).toBeInstanceOf(GraphExecutionCancelled);
      
      const callArgs = (evaluateGraphWithIteratorAutoContinue as any).mock.calls[0]?.[0];
      expect(callArgs?.control?.signal).toBeDefined();
      expect(callArgs?.control?.signal).toBeInstanceOf(AbortSignal);
    }
  });

  it('should persist runtime trace profile summary for completed runs', async () => {
    (evaluateGraphWithIteratorAutoContinue as any).mockImplementation(async (options: any) => {
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
      return { outputs: { 'node-111111111111111111111111': { value: 'trace-ok' } } };
    });

    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: mockNodes, edges: mockEdges },
      meta: { aiPathsValidation: { enabled: false } },
    });

    await executePathRun(run as AiPathRunRecord);

    expect(mockRepo.updateRunIfStatus).toHaveBeenCalledWith(
      run.id,
      expect.anything(),
      expect.objectContaining({
        meta: expect.objectContaining({
          runtimeTrace: expect.objectContaining({
            profile: expect.objectContaining({
              summary: expect.objectContaining({
                durationMs: 1200
              })
            })
          })
        })
      })
    );
  });

  it('should persist structured node spans in runtime trace metadata', async () => {
    (evaluateGraphWithIteratorAutoContinue as any).mockImplementation(async (options: any) => {
      const node = options.nodes[0];
      await options.onNodeStart({ node, nodeInputs: {}, prevOutputs: {}, iteration: 1 });
      await options.onNodeFinish({ node, nodeInputs: {}, prevOutputs: {}, nextOutputs: { value: 'span-ok' }, iteration: 1 });
      
      return { outputs: { [node.id]: { value: 'span-ok' } } };
    });

    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: mockNodes, edges: mockEdges },
      meta: { aiPathsValidation: { enabled: false } },
    });

    await executePathRun(run as AiPathRunRecord);

    const updateCall = mockRepo.updateRunIfStatus.mock.calls.find((c: any) => c[2].meta?.runtimeTrace);
    const runtimeTrace = updateCall?.[2].meta.runtimeTrace;
    const nodeSpans = runtimeTrace?.profile?.nodeSpans ?? [];
    expect(nodeSpans.length).toBeGreaterThan(0);
    expect(nodeSpans[0]).toMatchObject({
      nodeId: mockNodes[0]!.id,
      status: 'completed',
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
      } as any);

      await expect(executePathRun(run as AiPathRunRecord)).rejects.toThrow('Path blocked by node policy');
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
    } as any);

    await expect(executePathRun(run as AiPathRunRecord)).rejects.toThrow(/is missing required input wiring for port "prompt"/);
  });

  it('should bypass strict-flow preflight when node validation is disabled', async () => {
    (evaluateGraphWithIteratorAutoContinue as any).mockResolvedValue({ outputs: {} });

    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: disconnectedCompileNodes, edges: disconnectedCompileEdges },
      meta: {
        strictFlowMode: true,
        aiPathsValidation: { enabled: false },
      },
    } as any);

    await executePathRun(run as AiPathRunRecord);
    expect(evaluateGraphWithIteratorAutoContinue).toHaveBeenCalledTimes(1);
  });

  it('should bypass compile blockers when node validation is disabled', async () => {
    (evaluateGraphWithIteratorAutoContinue as any).mockResolvedValue({ outputs: {} });

    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: disconnectedCompileNodes, edges: disconnectedCompileEdges },
      meta: {
        strictFlowMode: false,
        aiPathsValidation: { enabled: false },
      },
    } as any);

    await executePathRun(run as AiPathRunRecord);
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
    } as any);

    await expect(executePathRun(run as AiPathRunRecord)).rejects.toThrow(/is missing required input wiring for port "prompt"/);
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
        config: { trigger: { event: 'manual' } }
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
            }
          }
        }
      }
    ];
    
    const invalidEdges: Edge[] = [
      {
        id: 'edge-1',
        from: 'node-trigger-111111111111111111111111',
        to: 'node-db-111111111111111111111111',
        fromPort: 'trigger',
        toPort: 'trigger'
      }
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
    } as any);

    await expect(executePathRun(run as AiPathRunRecord)).rejects.toThrow('Validation blocked run');
  });
});
