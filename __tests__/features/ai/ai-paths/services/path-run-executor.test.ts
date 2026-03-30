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

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', () => ({
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

});
