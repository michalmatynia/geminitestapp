import { describe, it, expect, beforeEach, vi } from 'vitest';

import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import { 
  enqueuePathRun, 
  resumePathRun, 
  cancelPathRun, 
  cancelPathRunWithRepository,
  retryPathRunNode 
} from '@/features/ai/ai-paths/services/path-run-service';
import prisma from '@/shared/lib/db/prisma';
import type { AiNode } from '@/shared/types/ai-paths';

vi.mock('@/features/jobs/workers/aiPathRunQueue', () => ({
  enqueuePathRunJob: vi.fn().mockResolvedValue(undefined),
}));

describe('PathRunService', () => {
  let repo: any;

  beforeEach(async () => {
    repo = getPathRunRepository();
    // Direct prisma cleanup since repo doesn't have deleteMany
    await prisma.aiPathRunEvent.deleteMany();
    await prisma.aiPathRunNode.deleteMany();
    await prisma.aiPathRun.deleteMany();
  });

  const mockNodes: AiNode[] = [
    {
      id: 'node-1',
      type: 'trigger',
      title: 'Trigger',
      description: '',
      position: { x: 0, y: 0 },
      inputs: [],
      outputs: ['value'],
      config: { trigger: { event: 'manual' } }
    }
  ];

  describe('enqueuePathRun', () => {
    it('should create a new run and its nodes', async () => {
      const run = await enqueuePathRun({
        pathId: 'test-path',
        pathName: 'Test Path',
        nodes: mockNodes,
        edges: [],
        triggerEvent: 'manual_run'
      });

      expect(run.id).toBeDefined();
      expect(run.status).toBe('queued');
      expect(run.pathId).toBe('test-path');

      const nodes = await repo.listRunNodes(run.id);
      expect(nodes.length).toBe(1);
      expect(nodes[0].nodeId).toBe('node-1');
      expect(nodes[0].status).toBe('pending');

      const events = await repo.listRunEvents(run.id);
      expect(events.some((e: any) => e.message === 'Run queued.')).toBe(true);
    });

    it('should pass meta options like backoffMs to the run', async () => {
      const run = await enqueuePathRun({
        pathId: 'test-path-meta',
        nodes: mockNodes,
        edges: [],
        backoffMs: 5000,
        meta: { custom: 'value' }
      });

      expect(run.meta).toEqual(expect.objectContaining({
        backoffMs: 5000,
        custom: 'value'
      }));
    });
  });

  describe('resumePathRun', () => {
    it('should reset run status to queued', async () => {
      const run = await enqueuePathRun({
        pathId: 'test-path',
        nodes: mockNodes,
        edges: []
      });

      // Manually fail it
      await repo.updateRun(run.id, { status: 'failed', errorMessage: 'Error' });

      const resumed = await resumePathRun(run.id, 'resume');
      expect(resumed.status).toBe('queued');
      expect(resumed.errorMessage).toBeNull();
      
      const events = await repo.listRunEvents(run.id);
      expect(events.some((e: any) => e.message === 'Run resumed (resume).')).toBe(true);
    });
  });

  describe('cancelPathRun', () => {
    it('should set status to canceled and mark finishedAt', async () => {
      const run = await enqueuePathRun({
        pathId: 'test-path',
        nodes: mockNodes,
        edges: []
      });

      const canceled = await cancelPathRun(run.id);
      expect(canceled.status).toBe('canceled');
      expect(canceled.finishedAt).toBeDefined();

      const events = await repo.listRunEvents(run.id);
      expect(events.some((e: any) => e.message === 'Run canceled.')).toBe(true);
    });

    it('should cancel using an explicit repository instance', async () => {
      const run = await enqueuePathRun({
        pathId: 'test-path-explicit-repo',
        nodes: mockNodes,
        edges: []
      });

      const canceled = await cancelPathRunWithRepository(repo, run.id);
      expect(canceled.status).toBe('canceled');
      expect(canceled.finishedAt).toBeDefined();
    });
  });

  describe('retryPathRunNode', () => {
    it('should reset specific node and re-queue the run', async () => {
      const run = await enqueuePathRun({
        pathId: 'test-path',
        nodes: mockNodes,
        edges: []
      });

      // Mark node as failed
      await repo.upsertRunNode(run.id, 'node-1', {
        nodeType: 'trigger',
        status: 'failed',
        errorMessage: 'Node failed'
      });

      const updatedRun = await retryPathRunNode(run.id, 'node-1');
      expect(updatedRun.status).toBe('queued');
      
      const nodes = await repo.listRunNodes(run.id);
      expect(nodes[0].status).toBe('pending');
      expect(nodes[0].errorMessage).toBeNull();

      const events = await repo.listRunEvents(run.id);
      expect(events.some((e: any) => e.message === 'Retry node node-1.')).toBe(true);
    });
  });
});
