import { describe, it, expect, beforeAll, beforeEach, vi, afterAll } from 'vitest';

vi.unmock('@/shared/lib/db/prisma');

import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import prisma from '@/shared/lib/db/prisma';
import type { AiNode } from '@/shared/contracts/ai-paths';

describe('AiPathRunRepository', () => {
  let repo: Awaited<ReturnType<typeof getPathRunRepository>>;

  beforeAll(async () => {
    repo = await getPathRunRepository();
  });

  beforeEach(async () => {
    // Clear data before each test
    await prisma.aiPathRunEvent.deleteMany();
    await prisma.aiPathRunNode.deleteMany();
    await prisma.aiPathRun.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const mockNodes: AiNode[] = [
    {
      id: 'node-1',
      type: 'constant',
      title: 'Const 1',
      description: 'Constant node 1',
      position: { x: 0, y: 0 },
      inputs: [],
      outputs: ['value'],
      config: { constant: { value: 'test1', valueType: 'string' } }
    },
    {
      id: 'node-2',
      type: 'constant',
      title: 'Const 2',
      description: 'Constant node 2',
      position: { x: 100, y: 100 },
      inputs: [],
      outputs: ['value'],
      config: { constant: { value: 'test2', valueType: 'string' } }
    }
  ];

  it('should create and find a run', async () => {
    const run = await repo.createRun({
      status: 'queued',
      pathId: 'test-path',
      pathName: 'Test Path',
      userId: 'user-1',
      triggerEvent: 'manual',
      graph: { nodes: mockNodes, edges: [] }
    });

    expect(run.id).toBeDefined();
    expect(run.pathId).toBe('test-path');
    expect(run.status).toBe('queued');

    const found = await repo.findRunById(run.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(run.id);
    expect(found!.pathName).toBe('Test Path');
  });

  it('should update a run', async () => {
    const run = await repo.createRun({ status: 'queued', pathId: 'test' });
    const updated = await repo.updateRun(run.id, {
      status: 'running',
      errorMessage: 'Some error',
      startedAt: new Date().toISOString()
    });

    expect(updated.status).toBe('running');
    expect(updated.errorMessage).toBe('Some error');
    expect(updated.startedAt).toBeDefined();
  });

  it('should conditionally update run status', async () => {
    const run = await repo.createRun({ status: 'queued', pathId: 'test-conditional' });
    const miss = await repo.updateRunIfStatus(run.id, ['running'], {
      status: 'completed',
    });
    expect(miss).toBeNull();

    const hit = await repo.updateRunIfStatus(run.id, ['queued'], {
      status: 'running',
    });
    expect(hit?.status).toBe('running');
  });

  it('should list runs with filters', async () => {
    const r1 = await repo.createRun({ status: 'queued', pathId: 'path-1', pathName: 'Alpha' });
    await repo.updateRun(r1.id, { status: 'completed' });

    const r2 = await repo.createRun({ status: 'queued', pathId: 'path-2', pathName: 'Beta' });
    await repo.updateRun(r2.id, { status: 'failed' });

    await repo.createRun({ status: 'queued', pathId: 'path-3', pathName: 'Gamma' });

    const all = await repo.listRuns();
    expect(all.total).toBe(3);

    const completed = await repo.listRuns({ status: 'completed' });
    expect(completed.total).toBe(1);
    expect(completed.runs[0]!.pathId).toBe('path-1');

    const query = await repo.listRuns({ query: 'Beta' });
    expect(query.total).toBe(1);
    expect(query.runs[0]!.pathId).toBe('path-2');

    const multipleStatuses = await repo.listRuns({ statuses: ['failed', 'queued'] });
    expect(multipleStatuses.total).toBe(2);
  });

  it('should filter runs by requestId stored in meta', async () => {
    await repo.createRun({
      status: 'queued',
      pathId: 'path-request-a',
      userId: 'user-1',
      meta: { requestId: 'req-1' },
    });
    await repo.createRun({
      status: 'queued',
      pathId: 'path-request-b',
      userId: 'user-1',
      meta: { requestId: 'req-2' },
    });

    const matched = await repo.listRuns({
      userId: 'user-1',
      requestId: 'req-1',
      statuses: ['queued'],
    });
    expect(matched.total).toBe(1);
    expect(matched.runs[0]?.pathId).toBe('path-request-a');
  });

  it('should claim next queued run', async () => {
    await repo.createRun({ status: 'queued', pathId: 'p1' });
    
    const claimed = await repo.claimNextQueuedRun();
    expect(claimed).not.toBeNull();
    expect(claimed!.status).toBe('running');
    expect(claimed!.startedAt).toBeDefined();

    const noneLeft = await repo.claimNextQueuedRun();
    expect(noneLeft).toBeNull();
  });

  it('should claim run only if nextRetryAt is in the past or null', async () => {
    const future = new Date(Date.now() + 10000);
    await repo.createRun({ status: 'queued', pathId: 'future', nextRetryAt: future.toISOString() });

    const claimed1 = await repo.claimNextQueuedRun();
    expect(claimed1).toBeNull();

    const past = new Date(Date.now() - 10000);
    await repo.createRun({ status: 'queued', pathId: 'past', nextRetryAt: past.toISOString() });
    
    const claimed2 = await repo.claimNextQueuedRun();
    expect(claimed2).not.toBeNull();
    expect(claimed2!.pathId).toBe('past');
  });

  it('should claim a specific queued run for processing', async () => {
    const run = await repo.createRun({ status: 'queued', pathId: 'claim-specific' });
    const claimed = await repo.claimRunForProcessing(run.id);
    expect(claimed).not.toBeNull();
    expect(claimed?.status).toBe('running');

    const claimedAgain = await repo.claimRunForProcessing(run.id);
    expect(claimedAgain).toBeNull();
  });

  it('should create and list run nodes', async () => {
    const run = await repo.createRun({ status: 'queued', pathId: 'test' });
    await repo.createRunNodes(run.id, mockNodes);

    const nodes = await repo.listRunNodes(run.id);
    expect(nodes.length).toBe(2);
    expect(nodes.map((n: any) => n.nodeId)).toContain('node-1');
    expect(nodes.map((n: any) => n.nodeId)).toContain('node-2');
    expect(nodes[0]!.status).toBe('pending');
  });

  it('should list run nodes changed after a cursor', async () => {
    const run = await repo.createRun({ status: 'queued', pathId: 'nodes-since' });
    await repo.createRunNodes(run.id, mockNodes);
    const initialNodes = await repo.listRunNodes(run.id);
    const cursorNode = initialNodes[initialNodes.length - 1]!;
    await new Promise((resolve) => setTimeout(resolve, 5));
    await repo.upsertRunNode(run.id, 'node-1', {
      nodeType: 'constant',
      status: 'running',
      attempt: 1,
    });

    const changed = await repo.listRunNodesSince(
      run.id,
      {
        updatedAt: cursorNode.updatedAt ?? cursorNode.createdAt ?? new Date().toISOString(),
        nodeId: cursorNode.nodeId,
      },
      { limit: 50 }
    );
    expect(changed.some((node: any) => node.nodeId === 'node-1')).toBe(true);
  });

  it('should upsert run node', async () => {
    const run = await repo.createRun({ status: 'queued', pathId: 'test' });
    
    // Create via upsert
    const node = await repo.upsertRunNode(run.id, 'node-x', {
      nodeType: 'custom',
      status: 'running',
      attempt: 1
    });
    expect(node.nodeId).toBe('node-x');
    expect(node.status).toBe('running');

    // Update via upsert
    const updated = await repo.upsertRunNode(run.id, 'node-x', {
      nodeType: 'custom',
      status: 'completed',
      outputs: { foo: 'bar' }
    });
    expect(updated.status).toBe('completed');
    expect(updated.outputs).toEqual({ foo: 'bar' });
    expect(updated.attempt).toBe(1);
  });

  it('should create and list run events', async () => {
    const run = await repo.createRun({ status: 'queued', pathId: 'test' });
    await repo.createRunEvent({
      runId: run.id,
      level: 'info',
      message: 'Started',
      metadata: { foo: 'bar' }
    });

    const events = await repo.listRunEvents(run.id);
    expect(events.length).toBe(1);
    expect(events[0]!.message).toBe('Started');
    expect(events[0]!.level).toBe('info');
    expect(events[0]!.metadata).toEqual({ foo: 'bar' });
  });

  it('should mark stale running runs as failed', async () => {
    const run = await repo.createRun({ status: 'queued', pathId: 'stale' });
    await repo.updateRun(run.id, { 
      status: 'running', 
      startedAt: new Date(Date.now() - 100000).toISOString() 
    });

    const result = await repo.markStaleRunningRuns(50000); // 50s max age
    expect(result.count).toBe(1);

    const updated = await repo.findRunById(run.id);
    expect(updated?.status).toBe('failed');
    expect(updated?.errorMessage).toContain('stale');
  });
});
