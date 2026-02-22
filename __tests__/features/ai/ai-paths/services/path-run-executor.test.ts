import { describe, it, expect, beforeEach, vi } from 'vitest';

import { 
  evaluateGraphWithIteratorAutoContinue,
  GraphExecutionCancelled,
} from '@/features/ai/ai-paths/lib';
import { executePathRun } from '@/features/ai/ai-paths/services/path-run-executor';
import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import type { AiNode, Edge } from '@/shared/contracts/ai-paths';
import prisma from '@/shared/lib/db/prisma';

// Mock evaluateGraphWithIteratorAutoContinue to avoid real runtime complexity
vi.mock('@/features/ai/ai-paths/lib', async () => {
  const actual = await vi.importActual('@/features/ai/ai-paths/lib');
  return {
    ...actual,
    evaluateGraphWithIteratorAutoContinue: vi.fn(),
  };
});

describe('PathRunExecutor', () => {
  let repo: any;

  beforeEach(async () => {
    repo = await getPathRunRepository();
    await prisma.aiPathRunEvent.deleteMany();
    await prisma.aiPathRunNode.deleteMany();
    await prisma.aiPathRun.deleteMany();
    vi.clearAllMocks();
  });

  const mockNodes: AiNode[] = [
    {
      id: 'node-1',
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

  it('should execute a run successfully', async () => {
    (evaluateGraphWithIteratorAutoContinue as any).mockResolvedValue({
      inputs: { 'node-1': {} },
      outputs: { 'node-1': { value: 'test' } },
      hashes: { 'node-1': 'hash' }
    });

    const run = await repo.createRun({
      pathId: 'test',
      graph: { nodes: mockNodes, edges: mockEdges },
      meta: { aiPathsValidation: { enabled: false } },
    });
    await repo.createRunNodes(run.id, mockNodes);

    await executePathRun(run);

    const updatedRun = await repo.findRunById(run.id);
    expect(updatedRun.status).toBe('completed');
    expect(updatedRun.finishedAt).toBeDefined();

    const events = await repo.listRunEvents(run.id);
    expect(events.some((e: any) => e.message === 'Run completed successfully.')).toBe(true);
  });

  it('should fail the run if graph is invalid', async () => {
    const run = await repo.createRun({
      pathId: 'test',
      graph: null as any // Invalid graph
    });

    await executePathRun(run);

    const updatedRun = await repo.findRunById(run.id);
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
      return { outputs: { 'node-1': { value: 'done' } } };
    });

    const run = await repo.createRun({
      pathId: 'test',
      graph: { nodes: mockNodes, edges: mockEdges },
      meta: { aiPathsValidation: { enabled: false } },
    });
    await repo.createRunNodes(run.id, mockNodes);

    await executePathRun(run);

    const nodes = await repo.listRunNodes(run.id);
    expect(nodes[0].status).toBe('completed');
    expect(nodes[0].outputs).toEqual({ value: 'done' });
    
    const events = await repo.listRunEvents(run.id);
    expect(events.some((e: any) => e.message === 'Node Const completed.')).toBe(true);
  });

  it('should persist cached node finishes as cached status', async () => {
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
        nextOutputs: { value: 'cached' },
        cached: true,
        iteration: 0,
        runStartedAt,
        runId,
      });
      return { outputs: { 'node-1': { value: 'cached' } } };
    });

    const run = await repo.createRun({
      pathId: 'test-cached-status',
      graph: { nodes: mockNodes, edges: mockEdges },
      meta: { aiPathsValidation: { enabled: false } },
    });
    await repo.createRunNodes(run.id, mockNodes);

    await executePathRun(run);

    const nodes = await repo.listRunNodes(run.id);
    expect(nodes[0].status).toBe('cached');
    expect(nodes[0].outputs).toEqual({ value: 'cached' });

    const events = await repo.listRunEvents(run.id);
    expect(
      events.some((event: any) => event.message === 'Node Const reused cached outputs.')
    ).toBe(true);
  });

  it('should handle node errors correctly', async () => {
    (evaluateGraphWithIteratorAutoContinue as any).mockImplementation(async (options: any) => {
      await options.onNodeError({ node: mockNodes[0], nodeInputs: {}, prevOutputs: {}, error: new Error('Node failed') });
      throw new Error('Execution failed');
    });

    const run = await repo.createRun({
      pathId: 'test',
      graph: { nodes: mockNodes, edges: mockEdges },
      meta: { aiPathsValidation: { enabled: false } },
    });
    await repo.createRunNodes(run.id, mockNodes);

    await expect(executePathRun(run)).rejects.toThrow('Execution failed');

    const nodes = await repo.listRunNodes(run.id);
    expect(nodes[0].status).toBe('failed');
    expect(nodes[0].errorMessage).toBe('Node failed');

    const updatedRun = await repo.findRunById(run.id);
    expect(updatedRun.status).toBe('failed');
  });

  it('should propagate cancellation to runtime evaluation via abort signal', async () => {
    const previousInterval = process.env['AI_PATHS_CANCEL_POLL_INTERVAL_MS'];
    process.env['AI_PATHS_CANCEL_POLL_INTERVAL_MS'] = '25';
    try {
      (evaluateGraphWithIteratorAutoContinue as any).mockImplementation((options: any) => {
        return new Promise((_resolve, reject) => {
          const signal = options?.control?.signal as AbortSignal | undefined;
          const cancelError = new GraphExecutionCancelled(
            'Run cancelled.',
            {
              status: 'running',
              nodeStatuses: {},
              nodeOutputs: {},
              variables: {},
              events: [],
              inputs: {},
              outputs: {},
            },
            'node-1'
          );
          if (!signal) {
            reject(new Error('Missing abort signal'));
            return;
          }
          if (signal.aborted) {
            reject(cancelError);
            return;
          }
          signal.addEventListener('abort', () => reject(cancelError), { once: true });
        });
      });

      const run = await repo.createRun({
        pathId: 'test-cancel',
        status: 'running',
        graph: { nodes: mockNodes, edges: mockEdges },
        meta: { aiPathsValidation: { enabled: false } },
      });
      await repo.createRunNodes(run.id, mockNodes);

      const executionPromise = executePathRun(run);
      await new Promise((resolve) => setTimeout(resolve, 60));
      await repo.updateRun(run.id, { status: 'canceled', finishedAt: new Date().toISOString() });

      await expect(executionPromise).resolves.toBeUndefined();

      const updatedRun = await repo.findRunById(run.id);
      expect(updatedRun.status).toBe('canceled');
      expect(updatedRun.runtimeState).toBeDefined();

      const callArgs = (evaluateGraphWithIteratorAutoContinue as any).mock.calls[0]?.[0];
      expect(callArgs?.control?.signal).toBeDefined();
      expect(callArgs?.control?.signal).toBeInstanceOf(AbortSignal);
    } finally {
      if (previousInterval === undefined) {
        delete process.env['AI_PATHS_CANCEL_POLL_INTERVAL_MS'];
      } else {
        process.env['AI_PATHS_CANCEL_POLL_INTERVAL_MS'] = previousInterval;
      }
    }
  });

  it('should persist runtime trace profile summary for completed runs', async () => {
    (evaluateGraphWithIteratorAutoContinue as any).mockImplementation(async (options: any) => {
      options.profile?.onEvent?.({
        type: 'node',
        runId: options.runId,
        runStartedAt: options.runStartedAt,
        nodeId: 'node-1',
        nodeType: 'constant',
        iteration: 0,
        status: 'executed',
        durationMs: 980,
      });
      options.profile?.onSummary?.({
        runId: options.runId,
        durationMs: 1200,
        iterationCount: 1,
        nodeCount: 1,
        edgeCount: 0,
        nodes: [],
        hottestNodes: [
          {
            nodeId: 'node-1',
            nodeType: 'constant',
            count: 1,
            totalMs: 980,
            maxMs: 980,
            cachedCount: 0,
            skippedCount: 0,
            errorCount: 0,
            hashCount: 1,
            hashTotalMs: 0,
            hashMaxMs: 0,
            avgMs: 980,
            hashAvgMs: 0,
          },
        ],
      });
      return { outputs: { 'node-1': { value: 'trace-ok' } } };
    });

    const run = await repo.createRun({
      pathId: 'test-trace-profile',
      graph: { nodes: mockNodes, edges: mockEdges },
      meta: { aiPathsValidation: { enabled: false } },
    });
    await repo.createRunNodes(run.id, mockNodes);

    await executePathRun(run);

    const updatedRun = await repo.findRunById(run.id);
    const runtimeTrace = (updatedRun.meta as Record<string, unknown>)?.['runtimeTrace'] as
      | { traceId?: string; profile?: { summary?: { durationMs?: number } | null } | null }
      | undefined;
    expect(runtimeTrace?.traceId).toBe(run.id);
    expect(runtimeTrace?.profile?.summary?.durationMs).toBe(1200);

    const events = await repo.listRunEvents(run.id);
    expect(
      events.some((event: any) => event.message === 'Runtime profile summary recorded.'),
    ).toBe(true);
  });

  it('should persist structured node spans in runtime trace metadata', async () => {
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
        nextOutputs: { value: 'span-ok' },
        iteration: 0,
        runStartedAt,
        runId,
      });
      return { outputs: { 'node-1': { value: 'span-ok' } } };
    });

    const run = await repo.createRun({
      pathId: 'test-span-trace',
      graph: { nodes: mockNodes, edges: mockEdges },
      meta: { aiPathsValidation: { enabled: false } },
    });
    await repo.createRunNodes(run.id, mockNodes);

    await executePathRun(run);

    const updatedRun = await repo.findRunById(run.id);
    const runtimeTrace = (updatedRun.meta as Record<string, unknown>)?.['runtimeTrace'] as
      | {
        profile?:
          | {
            nodeSpans?: Array<Record<string, unknown>>;
          }
          | null;
      }
      | undefined;
    const nodeSpans = runtimeTrace?.profile?.nodeSpans ?? [];
    expect(nodeSpans.length).toBe(1);
    expect(nodeSpans[0]).toMatchObject({
      spanId: 'node-1:1:0',
      nodeId: 'node-1',
      nodeType: 'constant',
      status: 'completed',
      attempt: 1,
      iteration: 0,
      cached: false,
      error: null,
    });
    expect(typeof nodeSpans[0]?.['startedAt']).toBe('string');
    expect(typeof nodeSpans[0]?.['finishedAt']).toBe('string');
    expect(typeof nodeSpans[0]?.['durationMs'] === 'number' || nodeSpans[0]?.['durationMs'] === null).toBe(true);
  });

  it('should block execution when disabled node policy is violated', async () => {
    const previous = process.env['AI_PATHS_DISABLED_NODE_TYPES'];
    process.env['AI_PATHS_DISABLED_NODE_TYPES'] = 'constant';
    try {
      const run = await repo.createRun({
        pathId: 'test-policy-executor',
        graph: { nodes: mockNodes, edges: mockEdges },
        meta: { aiPathsValidation: { enabled: false } },
      });
      await repo.createRunNodes(run.id, mockNodes);

      await expect(executePathRun(run)).rejects.toThrow('Path blocked by node policy');
      expect(evaluateGraphWithIteratorAutoContinue).not.toHaveBeenCalled();

      const updatedRun = await repo.findRunById(run.id);
      expect(updatedRun.status).toBe('failed');

      const events = await repo.listRunEvents(run.id);
      expect(events.some((event: any) => event.message === 'Run blocked by node policy.')).toBe(
        true
      );
    } finally {
      if (previous === undefined) {
        delete process.env['AI_PATHS_DISABLED_NODE_TYPES'];
      } else {
        process.env['AI_PATHS_DISABLED_NODE_TYPES'] = previous;
      }
    }
  });

  it('should block strict runs when dependency inspector reports errors', async () => {
    const riskyNodes: AiNode[] = [
      {
        id: 'db-1',
        type: 'database',
        title: 'Database',
        description: '',
        position: { x: 0, y: 0 },
        inputs: ['entityId', 'productId', 'value'],
        outputs: ['result'],
        config: {
          runtime: { waitForInputs: true },
          database: {
            operation: 'update',
            entityType: 'product',
            idField: 'entityId',
            mode: 'replace',
            mappings: [],
            query: {
              provider: 'auto',
              collection: 'products',
              mode: 'preset',
              preset: 'by_id',
              field: 'id',
              idType: 'string',
              queryTemplate: '{"id":"{{entityId}}"}',
              limit: 1,
              sort: '',
              projection: '',
              single: true,
            },
          },
        },
      },
    ];

    const run = await repo.createRun({
      pathId: 'test',
      graph: { nodes: riskyNodes, edges: [] },
      meta: {
        strictFlowMode: true,
        aiPathsValidation: { enabled: false },
      },
    } as any);
    await repo.createRunNodes(run.id, riskyNodes);

    await expect(executePathRun(run)).rejects.toThrow('Strict flow blocked run');
    expect(evaluateGraphWithIteratorAutoContinue).not.toHaveBeenCalled();

    const updatedRun = await repo.findRunById(run.id);
    expect(updatedRun.status).toBe('failed');
    expect(updatedRun.errorMessage).toContain('Strict flow blocked run');

    const events = await repo.listRunEvents(run.id);
    expect(
      events.some((event: any) =>
        event.message === 'Run blocked by strict flow dependency validation.',
      ),
    ).toBe(true);
  });

  it('should block run when AI Paths validation preflight policy fails', async () => {
    const run = await repo.createRun({
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
    await repo.createRunNodes(run.id, mockNodes);

    await expect(executePathRun(run)).rejects.toThrow('Validation blocked run');
    expect(evaluateGraphWithIteratorAutoContinue).not.toHaveBeenCalled();

    const updatedRun = await repo.findRunById(run.id);
    expect(updatedRun.status).toBe('failed');
    expect(updatedRun.errorMessage).toContain('Validation blocked run');

    const events = await repo.listRunEvents(run.id);
    expect(
      events.some(
        (event: any) =>
          event.message === 'Run blocked by AI Paths validation preflight.',
      ),
    ).toBe(true);
  });
});
