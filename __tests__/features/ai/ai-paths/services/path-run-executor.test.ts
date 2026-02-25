import { describe, it, expect, beforeEach, vi } from 'vitest';

import { 
  evaluateGraphWithIteratorAutoContinue,
  GraphExecutionCancelled,
} from '@/features/ai/ai-paths/lib';
import { executePathRun } from '@/features/ai/ai-paths/services/path-run-executor';
import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import type { AiNode, Edge, AiPathRunRecord } from '@/shared/contracts/ai-paths';
import prisma from '@/shared/lib/db/prisma';

// Mock evaluateGraphWithIteratorAutoContinue to avoid real runtime complexity
vi.mock('@/features/ai/ai-paths/lib', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    evaluateGraphWithIteratorAutoContinue: vi.fn(),
  };
});

// Define mockRepo in hoisted scope
const mockRepo = vi.hoisted(() => ({
  createRun: vi.fn(),
  listRunNodes: vi.fn(),
  listRunEvents: vi.fn(),
  findRunById: vi.fn(),
  createRunNodes: vi.fn(),
  createRunEvent: vi.fn(),
  updateRun: vi.fn(),
  updateRunIfStatus: vi.fn(),
  updateRunNode: vi.fn(),
  upsertRunNode: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: vi.fn().mockResolvedValue(mockRepo),
}));

describe('PathRunExecutor', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Configure default mock behavior
    mockRepo.createRun.mockImplementation((args) => Promise.resolve({ 
      id: 'mock-run-id', 
      status: 'queued',
      createdAt: new Date().toISOString(),
      ...args 
    }));
    mockRepo.findRunById.mockResolvedValue({ id: 'mock-run-id', status: 'completed' });
    mockRepo.listRunNodes.mockResolvedValue([]);
    mockRepo.listRunEvents.mockResolvedValue([]);
    mockRepo.updateRun.mockImplementation((id, data) => Promise.resolve({ id, ...data }));
    mockRepo.updateRunIfStatus.mockImplementation((id, statuses, data) => Promise.resolve({ id, ...data }));
    mockRepo.createRunNodes.mockResolvedValue(undefined);
    mockRepo.createRunEvent.mockResolvedValue({ id: 'mock-event-id' });
    mockRepo.updateRunNode.mockResolvedValue(undefined);
    mockRepo.upsertRunNode.mockResolvedValue(undefined);
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
      id: 'trigger-1',
      type: 'trigger',
      title: 'Trigger',
      description: '',
      position: { x: 0, y: 0 },
      inputs: ['context'],
      outputs: ['trigger', 'context'],
      config: { trigger: { event: 'manual' } },
    },
    {
      id: 'model-1',
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
      id: 'viewer-1',
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
      from: 'model-1',
      to: 'viewer-1',
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
    // Setup evaluateGraphWithIteratorAutoContinue to call onNodeStart and onNodeFinish
    (evaluateGraphWithIteratorAutoContinue as any).mockImplementation(async (options: any) => {
      const runStartedAt = options.runStartedAt;
      const runId = options.runId;
      await options.onNodeStart({
        node: mockNodes[0],
        nodeInputs: {},
        prevOutputs: {},
        iteration: 0,
        runStartedAt,
      });
      await options.onNodeFinish({
        node: mockNodes[0],
        nodeInputs: {},
        nextOutputs: { value: 'done' },
        iteration: 0,
        runStartedAt,
        runId,
      });
      return { outputs: { 'node-111111111111111111111111': { value: 'done' } } };
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
        node: mockNodes[0],
        nodeInputs: {},
        prevOutputs: {},
        nextOutputs: { value: 'cached' },
        iteration: 0,
        cached: true,
      });
      return { outputs: { 'node-111111111111111111111111': { value: 'cached' } } };
    });

    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: mockNodes, edges: mockEdges },
      meta: { aiPathsValidation: { enabled: false } },
    });

    await executePathRun(run as AiPathRunRecord);
    
    expect(mockRepo.upsertRunNode).toHaveBeenCalledWith(
      expect.anything(),
      mockNodes[0].id,
      expect.objectContaining({ status: 'cached' })
    );
  });

  it('should persist blocked node finishes as blocked status', async () => {
    (evaluateGraphWithIteratorAutoContinue as any).mockImplementation(async (options: any) => {
      await options.onNodeBlocked({
        node: mockNodes[0],
        reason: 'missing_inputs',
        waitingOnPorts: ['trigger'],
      });
      return { outputs: { 'node-111111111111111111111111': { waitingOnPorts: ['trigger'] } } };
    });

    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: mockNodes, edges: mockEdges },
      meta: { aiPathsValidation: { enabled: false } },
    });

    await executePathRun(run as AiPathRunRecord);
    
    expect(mockRepo.upsertRunNode).toHaveBeenCalledWith(
      expect.anything(),
      mockNodes[0].id,
      expect.objectContaining({ status: 'blocked' })
    );
  });

  it('should handle node errors correctly', async () => {
    (evaluateGraphWithIteratorAutoContinue as any).mockImplementation(async (options: any) => {
      const error = new Error('Execution failed');
      await options.onNodeError({
        node: mockNodes[0],
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
      mockNodes[0].id,
      expect.objectContaining({ status: 'failed' })
    );
  });

  it('should propagate cancellation to runtime evaluation via abort signal', async () => {
    (evaluateGraphWithIteratorAutoContinue as any).mockImplementation(async (options: any) => {
      // Return a promise that never resolves to simulate long running task
      return new Promise(() => {});
    });

    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: mockNodes, edges: mockEdges },
      meta: { aiPathsValidation: { enabled: false } },
    });

    // Execute but don't await yet
    const executionPromise = executePathRun(run as AiPathRunRecord);

    // Cancel the run via mock repo
    mockRepo.findRunById.mockResolvedValue({
      ...run,
      status: 'canceled',
    });

    // We need to wait a bit for the executor to check the status
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
    (evaluateGraphWithIteratorAutoContinue as any).mockResolvedValue({
      outputs: { 'node-111111111111111111111111': { value: 'trace-ok' } }
    });

    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: mockNodes, edges: mockEdges },
      meta: { aiPathsValidation: { enabled: false } },
    });

    const summary = {
      runId: run.id,
      durationMs: 1200,
      iterationCount: 1,
      nodeCount: 1,
      edgeCount: 0,
      nodes: [],
      hottestNodes: [],
    };

    // Trigger profile summary via mock implementation
    (evaluateGraphWithIteratorAutoContinue as any).mockImplementation(async (options: any) => {
      if (options.profile?.onSummary) {
        options.profile.onSummary(summary);
      }
      return { outputs: { 'node-111111111111111111111111': { value: 'trace-ok' } } };
    });

    await executePathRun(run as AiPathRunRecord);

    expect(mockRepo.updateRun).toHaveBeenCalledWith(
      run.id,
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
    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: mockNodes, edges: mockEdges },
      meta: { aiPathsValidation: { enabled: false } },
    });

    (evaluateGraphWithIteratorAutoContinue as any).mockImplementation(async (options: any) => {
      const node = mockNodes[0];
      await options.onNodeStart({ node, nodeInputs: {}, prevOutputs: {}, iteration: 1 });
      await options.onNodeFinish({ node, nodeInputs: {}, prevOutputs: {}, nextOutputs: { value: 'span-ok' }, iteration: 1 });
      
      return { outputs: { 'node-111111111111111111111111': { value: 'span-ok' } } };
    });

    await executePathRun(run as AiPathRunRecord);

    const updateCall = mockRepo.updateRun.mock.calls.find((c: any) => c[1].meta?.runtimeTrace);
    const runtimeTrace = updateCall?.[1].meta.runtimeTrace;
    const nodeSpans = runtimeTrace?.profile?.nodeSpans ?? [];
    expect(nodeSpans.length).toBe(1);
    expect(nodeSpans[0]).toMatchObject({
      nodeId: 'node-111111111111111111111111',
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

    await expect(executePathRun(run as AiPathRunRecord)).rejects.toThrow('Strict flow blocked run');
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

    await expect(executePathRun(run as AiPathRunRecord)).rejects.toThrow('Required input "prompt" on node "Model" has no incoming edge');
    expect(evaluateGraphWithIteratorAutoContinue).not.toHaveBeenCalled();
  });

  it('should block run when AI Paths validation preflight policy fails', async () => {
    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: mockNodes, edges: mockEdges },
      meta: {
        strictFlowMode: false,
        aiPathsValidation: {
          enabled: true,
          blockThreshold: 80,
        },
      },
    } as any);

    await expect(executePathRun(run as AiPathRunRecord)).rejects.toThrow('Validation blocked run');
  });
});
