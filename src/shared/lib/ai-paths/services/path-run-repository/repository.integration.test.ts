import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { AiNode, AiPathRunNodeRecord } from '@/shared/contracts/ai-paths';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';

import { installInMemoryMongoPathRunDb } from './test-utils/in-memory-mongo';

describe('AiPathRunRepository integration', () => {
  let repo: Awaited<ReturnType<typeof getPathRunRepository>>;

  beforeAll(async () => {
    repo = await getPathRunRepository();
  });

  beforeEach(() => {
    installInMemoryMongoPathRunDb();
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
      config: { constant: { value: 'test1', valueType: 'string' } },
    },
    {
      id: 'node-2',
      type: 'constant',
      title: 'Const 2',
      description: 'Constant node 2',
      position: { x: 100, y: 100 },
      inputs: [],
      outputs: ['value'],
      config: { constant: { value: 'test2', valueType: 'string' } },
    },
  ];

  it('creates and finds a run', async () => {
    const run = await repo.createRun({
      status: 'queued',
      pathId: 'test-path',
      pathName: 'Test Path',
      userId: 'user-1',
      triggerEvent: 'manual',
      graph: { nodes: mockNodes, edges: [] },
    });

    expect(run.id).toBeDefined();
    expect(run.pathId).toBe('test-path');
    expect(run.status).toBe('queued');

    const found = await repo.findRunById(run.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(run.id);
    expect(found!.pathName).toBe('Test Path');
  });

  it('updates a run', async () => {
    const run = await repo.createRun({ status: 'queued', pathId: 'test' });
    const updated = await repo.updateRun(run.id, {
      status: 'running',
      errorMessage: 'Some error',
      startedAt: new Date().toISOString(),
    });

    expect(updated.status).toBe('running');
    expect(updated.errorMessage).toBe('Some error');
    expect(updated.startedAt).toBeDefined();
  });

  it('conditionally updates run status', async () => {
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

  it('lists runs with filters', async () => {
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

  it('filters runs by requestId stored in meta', async () => {
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

  it('claims the next queued run', async () => {
    await repo.createRun({ status: 'queued', pathId: 'p1' });

    const claimed = await repo.claimNextQueuedRun();
    expect(claimed).not.toBeNull();
    expect(claimed!.status).toBe('running');
    expect(claimed!.startedAt).toBeDefined();

    const noneLeft = await repo.claimNextQueuedRun();
    expect(noneLeft).toBeNull();
  });

  it('claims a run only if nextRetryAt is in the past or null', async () => {
    const future = new Date(Date.now() + 10_000);
    await repo.createRun({ status: 'queued', pathId: 'future', nextRetryAt: future.toISOString() });

    const claimed1 = await repo.claimNextQueuedRun();
    expect(claimed1).toBeNull();

    const past = new Date(Date.now() - 10_000);
    await repo.createRun({ status: 'queued', pathId: 'past', nextRetryAt: past.toISOString() });

    const claimed2 = await repo.claimNextQueuedRun();
    expect(claimed2).not.toBeNull();
    expect(claimed2!.pathId).toBe('past');
  });

  it('claims a specific queued run for processing', async () => {
    const run = await repo.createRun({ status: 'queued', pathId: 'claim-specific' });
    const claimed = await repo.claimRunForProcessing(run.id);
    expect(claimed).not.toBeNull();
    expect(claimed?.status).toBe('running');

    const claimedAgain = await repo.claimRunForProcessing(run.id);
    expect(claimedAgain).toBeNull();
  });

  it('creates and lists run nodes', async () => {
    const run = await repo.createRun({ status: 'queued', pathId: 'test' });
    await repo.createRunNodes(run.id, mockNodes);

    const nodes = await repo.listRunNodes(run.id);
    expect(nodes.length).toBe(2);
    expect(nodes.map((node: AiPathRunNodeRecord) => node.nodeId)).toContain('node-1');
    expect(nodes.map((node: AiPathRunNodeRecord) => node.nodeId)).toContain('node-2');
    expect(nodes[0]!.status).toBe('pending');
  });

  it('lists run nodes changed after a cursor', async () => {
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
    expect(changed.some((node: AiPathRunNodeRecord) => node.nodeId === 'node-1')).toBe(true);
  });

  it('upserts a run node', async () => {
    const run = await repo.createRun({ status: 'queued', pathId: 'test' });

    const node = await repo.upsertRunNode(run.id, 'node-x', {
      nodeType: 'custom',
      status: 'running',
      attempt: 1,
    });
    expect(node.nodeId).toBe('node-x');
    expect(node.status).toBe('running');

    const updated = await repo.upsertRunNode(run.id, 'node-x', {
      nodeType: 'custom',
      status: 'completed',
      outputs: { foo: 'bar' },
    });
    expect(updated.status).toBe('completed');
    expect(updated.outputs).toEqual({ foo: 'bar' });
    expect(updated.attempt).toBe(1);
  });

  it('creates and lists run events', async () => {
    const run = await repo.createRun({ status: 'queued', pathId: 'test' });
    await repo.createRunEvent({
      runId: run.id,
      level: 'info',
      message: 'Started',
      metadata: { foo: 'bar' },
    });

    const events = await repo.listRunEvents(run.id);
    expect(events.length).toBe(1);
    expect(events[0]!.message).toBe('Started');
    expect(events[0]!.level).toBe('info');
    expect(events[0]!.metadata).toEqual({ foo: 'bar' });
  });

  it('marks stale running runs as failed', async () => {
    const run = await repo.createRun({ status: 'queued', pathId: 'stale' });
    await repo.updateRun(run.id, {
      status: 'running',
      startedAt: new Date(Date.now() - 100_000).toISOString(),
    });

    const result = await repo.markStaleRunningRuns(50_000);
    expect(result.count).toBe(1);

    const updated = await repo.findRunById(run.id);
    expect(updated?.status).toBe('failed');
    expect(updated?.errorMessage).toContain('stale');
  });
});
