import { describe, it, expect, beforeEach, vi } from 'vitest';

import { 
  evaluateGraphWithIteratorAutoContinue 
} from '@/features/ai/ai-paths/lib';
import { executePathRun } from '@/features/ai/ai-paths/services/path-run-executor';
import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import prisma from '@/shared/lib/db/prisma';
import type { AiNode, Edge } from '@/shared/types/domain/ai-paths';

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
    repo = getPathRunRepository();
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
      graph: { nodes: mockNodes, edges: mockEdges }
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
      graph: { nodes: mockNodes, edges: mockEdges }
    });
    await repo.createRunNodes(run.id, mockNodes);

    await executePathRun(run);

    const nodes = await repo.listRunNodes(run.id);
    expect(nodes[0].status).toBe('completed');
    expect(nodes[0].outputs).toEqual({ value: 'done' });
    
    const events = await repo.listRunEvents(run.id);
    expect(events.some((e: any) => e.message === 'Node Const completed.')).toBe(true);
  });

  it('should handle node errors correctly', async () => {
    (evaluateGraphWithIteratorAutoContinue as any).mockImplementation(async (options: any) => {
      await options.onNodeError({ node: mockNodes[0], nodeInputs: {}, prevOutputs: {}, error: new Error('Node failed') });
      throw new Error('Execution failed');
    });

    const run = await repo.createRun({
      pathId: 'test',
      graph: { nodes: mockNodes, edges: mockEdges }
    });
    await repo.createRunNodes(run.id, mockNodes);

    await expect(executePathRun(run)).rejects.toThrow('Execution failed');

    const nodes = await repo.listRunNodes(run.id);
    expect(nodes[0].status).toBe('failed');
    expect(nodes[0].errorMessage).toBe('Node failed');

    const updatedRun = await repo.findRunById(run.id);
    expect(updatedRun.status).toBe('failed');
  });
});
