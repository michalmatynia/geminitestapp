import { describe, it, expect, beforeEach } from 'vitest';

import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import prisma from '@/shared/lib/db/prisma';
import type { AiNode } from '@/shared/types/ai-paths';

describe('AiPathRunRepository', () => {
  const repo = getPathRunRepository();

  beforeEach(async () => {
    // Clear data before each test
    await prisma.aiPathRunEvent.deleteMany();
    await prisma.aiPathRunNode.deleteMany();
    await prisma.aiPathRun.deleteMany();
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
    const run = await repo.createRun({ pathId: 'test' });
    const updated = await repo.updateRun(run.id, {
      status: 'running',
      errorMessage: 'Some error',
      startedAt: new Date()
    });

    expect(updated.status).toBe('running');
    expect(updated.errorMessage).toBe('Some error');
    expect(updated.startedAt).toBeDefined();
  });

  it('should list runs with filters', async () => {
    await repo.createRun({ pathId: 'path-1', pathName: 'Alpha' });
    await repo.createRun({ pathId: 'path-2', pathName: 'Beta' });
    await repo.createRun({ pathId: 'path-3', pathName: 'Gamma' });

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

  it('should claim next queued run', async () => {
    await repo.createRun({ pathId: 'p1' });
    
    const claimed = await repo.claimNextQueuedRun();
    expect(claimed).not.toBeNull();
    expect(claimed!.status).toBe('running');
    expect(claimed!.startedAt).toBeDefined();

    const noneLeft = await repo.claimNextQueuedRun();
    expect(noneLeft).toBeNull();
  });

  it('should claim run only if nextRetryAt is in the past or null', async () => {
    const future = new Date(Date.now() + 10000);
    await repo.createRun({ pathId: 'future', nextRetryAt: future });
    
    const claimed1 = await repo.claimNextQueuedRun();
    expect(claimed1).toBeNull();

    const past = new Date(Date.now() - 10000);
    await repo.createRun({ pathId: 'past', nextRetryAt: past });
    
    const claimed2 = await repo.claimNextQueuedRun();
    expect(claimed2).not.toBeNull();
    expect(claimed2!.pathId).toBe('past');
  });

  it('should create and list run nodes', async () => {
    const run = await repo.createRun({ pathId: 'test' });
    await repo.createRunNodes(run.id, mockNodes);

    const nodes = await repo.listRunNodes(run.id);
    expect(nodes.length).toBe(2);
    expect(nodes.map(n => n.nodeId)).toContain('node-1');
    expect(nodes.map(n => n.nodeId)).toContain('node-2');
    expect(nodes[0]!.status).toBe('pending');
  });

  it('should upsert run node', async () => {
    const run = await repo.createRun({ pathId: 'test' });
    
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
    expect(updated.attempt).toBe(1); // should preserve if not provided in update? 
    // Wait, let's check prisma implementation of upsert for attempt.
  });

  it('should create and list run events', async () => {
    const run = await repo.createRun({ pathId: 'test' });
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
    const run = await repo.createRun({ pathId: 'stale' });
    await repo.updateRun(run.id, { 
      status: 'running', 
      startedAt: new Date(Date.now() - 100000) 
    });

    const result = await repo.markStaleRunningRuns(50000); // 50s max age
    expect(result.count).toBe(1);

    const updated = await repo.findRunById(run.id);
    expect(updated?.status).toBe('failed');
    expect(updated?.errorMessage).toContain('stale');
  });
});
