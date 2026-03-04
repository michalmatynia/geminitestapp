import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.unmock('@/shared/lib/db/prisma');
vi.unmock('@/features/ai/ai-paths/services/path-run-repository');

const { enqueuePathRunJobMock, removePathRunQueueEntriesMock } = vi.hoisted(() => ({
  enqueuePathRunJobMock: vi.fn().mockResolvedValue(undefined),
  removePathRunQueueEntriesMock: vi.fn().mockResolvedValue({ removed: 0, requested: 0 }),
}));

import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import {
  enqueuePathRun,
  resumePathRun,
  cancelPathRun,
  cancelPathRunWithRepository,
  deletePathRunWithRepository,
  deletePathRunsWithRepository,
  retryPathRunNode,
} from '@/features/ai/ai-paths/services/path-run-service';
import type {
  AiNode,
  Edge,
  AiPathRunRepository,
  AiPathRunEventRecord,
} from '@/shared/contracts/ai-paths';
import prisma from '@/shared/lib/db/prisma';

vi.mock('@/features/ai/ai-paths/workers/aiPathRunQueue', () => ({
  enqueuePathRunJob: enqueuePathRunJobMock,
  removePathRunQueueEntries: removePathRunQueueEntriesMock,
}));

let canMutatePathRunTables = true;

describe('PathRunService', () => {
  const shouldSkipPathRunPrismaTests = (): boolean =>
    !process.env['DATABASE_URL'] || !canMutatePathRunTables;

  let repo: AiPathRunRepository;

  beforeEach(async () => {
    if (shouldSkipPathRunPrismaTests()) return;

    enqueuePathRunJobMock.mockClear();
    removePathRunQueueEntriesMock.mockClear();
    repo = await getPathRunRepository();
    // Direct prisma cleanup since repo doesn't have deleteMany
    try {
      await prisma.aiPathRunEvent.deleteMany();
      await prisma.aiPathRunNode.deleteMany();
      await prisma.aiPathRun.deleteMany();
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'EPERM') {
        canMutatePathRunTables = false;
        return;
      }
      throw error;
    }
  });

  const mockNodes: AiNode[] = [
    {
      id: 'node-111111111111111111111111',
      type: 'trigger',
      title: 'Trigger',
      description: '',
      position: { x: 0, y: 0 },
      inputs: [],
      outputs: ['value'],
      config: { trigger: { event: 'manual' } },
    },
  ];
  const disconnectedCompileNodes: AiNode[] = [
    {
      id: 'node-aaaaaaaaaaaaaaaaaaaaaaaa',
      type: 'trigger',
      title: 'Trigger',
      description: '',
      position: { x: 0, y: 0 },
      inputs: ['context'],
      outputs: ['trigger', 'context'],
      config: { trigger: { event: 'manual' } },
    },
    {
      id: 'node-bbbbbbbbbbbbbbbbbbbbbbbb',
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
      id: 'node-cccccccccccccccccccccccc',
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
      from: 'node-bbbbbbbbbbbbbbbbbbbbbbbb',
      to: 'node-cccccccccccccccccccccccc',
      fromPort: 'result',
      toPort: 'result',
    },
  ];

  describe('enqueuePathRun', () => {
    it('should create a new run and its nodes', async () => {
      if (shouldSkipPathRunPrismaTests()) return;
      const run = await enqueuePathRun({
        pathId: 'test-path',
        pathName: 'Test Path',
        nodes: mockNodes,
        edges: [],
        triggerEvent: 'manual_run',
      });

      expect(run.id).toBeDefined();
      expect(run.status).toBe('queued');
      expect(run.pathId).toBe('test-path');

      const nodes = await repo.listRunNodes(run.id);
      expect(nodes.length).toBe(1);
      expect(nodes[0]!.nodeId).toBe('node-111111111111111111111111');
      expect(nodes[0]!.status).toBe('pending');

      const events = await repo.listRunEvents(run.id);
      expect(events.some((e: AiPathRunEventRecord) => e.message === 'Run queued.')).toBe(true);
    });

    it('should pass meta options like backoffMs to the run', async () => {
      if (shouldSkipPathRunPrismaTests()) return;
      const run = await enqueuePathRun({
        pathId: 'test-path-meta',
        nodes: mockNodes,
        edges: [],
        backoffMs: 5000,
        meta: { custom: 'value' },
      });

      expect(run.meta).toEqual(
        expect.objectContaining({
          backoffMs: 5000,
          custom: 'value',
        })
      );
    });

    it('should block enqueue when disabled node policy is violated', async () => {
      if (shouldSkipPathRunPrismaTests()) return;
      const previous = process.env['AI_PATHS_DISABLED_NODE_TYPES'];
      process.env['AI_PATHS_DISABLED_NODE_TYPES'] = 'trigger';
      try {
        await expect(
          enqueuePathRun({
            pathId: 'test-path-policy-block',
            nodes: mockNodes,
            edges: [],
          })
        ).rejects.toThrow('Path blocked by node policy');

        const runs = await repo.listRuns({ pathId: 'test-path-policy-block' });
        expect(runs.total).toBe(0);
      } finally {
        if (previous === undefined) {
          delete process.env['AI_PATHS_DISABLED_NODE_TYPES'];
        } else {
          process.env['AI_PATHS_DISABLED_NODE_TYPES'] = previous;
        }
      }
    });

    it('should allow enqueue when compile checks fail but node validation is disabled', async () => {
      if (shouldSkipPathRunPrismaTests()) return;
      const run = await enqueuePathRun({
        pathId: 'test-path-validation-disabled',
        nodes: disconnectedCompileNodes,
        edges: disconnectedCompileEdges,
        meta: {
          aiPathsValidation: { enabled: false },
        },
      });

      expect(run.id).toBeDefined();
      const compileMeta = (run.meta as Record<string, unknown>)?.['graphCompile'] as
        | { errors?: number }
        | undefined;
      expect(typeof compileMeta?.errors).toBe('number');
      // Even if non-blocking, compile errors are still reported in meta
      expect(compileMeta?.errors).toBe(1);
    });

    it('should block enqueue when compile checks fail and node validation is enabled', async () => {
      if (shouldSkipPathRunPrismaTests()) return;
      await expect(
        enqueuePathRun({
          pathId: 'test-path-validation-enabled',
          nodes: disconnectedCompileNodes,
          edges: disconnectedCompileEdges,
          meta: {
            aiPathsValidation: { enabled: true },
          },
        })
      ).rejects.toThrow('is missing required input wiring for port "prompt"');
    });

    it('should dedupe active runs by requestId', async () => {
      if (shouldSkipPathRunPrismaTests()) return;
      const first = await enqueuePathRun({
        pathId: 'test-path-idempotency',
        userId: 'user-idempotent',
        nodes: mockNodes,
        edges: [],
        requestId: 'request-123',
      });
      const second = await enqueuePathRun({
        pathId: 'test-path-idempotency',
        userId: 'user-idempotent',
        nodes: mockNodes,
        edges: [],
        requestId: 'request-123',
      });

      expect(second.id).toBe(first.id);
      const runs = await repo.listRuns({
        userId: 'user-idempotent',
        pathId: 'test-path-idempotency',
      });
      expect(runs.total).toBe(1);
    });

    it('should fail closed when run bootstrap fails', async () => {
      if (shouldSkipPathRunPrismaTests()) return;
      const createRunNodesSpy = vi
        .spyOn(repo, 'createRunNodes')
        .mockRejectedValueOnce(new Error('bootstrap failed'));

      await expect(
        enqueuePathRun({
          pathId: 'test-path-bootstrap-failure',
          userId: 'user-bootstrap',
          nodes: mockNodes,
          edges: [],
          requestId: 'bootstrap-request',
        })
      ).rejects.toThrow('Run setup failed');

      createRunNodesSpy.mockRestore();

      const failedRuns = await repo.listRuns({
        userId: 'user-bootstrap',
        pathId: 'test-path-bootstrap-failure',
        status: 'failed',
      });
      expect(failedRuns.total).toBe(1);
      expect(String(failedRuns.runs[0]?.errorMessage ?? '')).toContain('Run setup failed');
    });

    it('marks run as failed when queue dispatch fails after enqueue', async () => {
      if (shouldSkipPathRunPrismaTests()) return;
      enqueuePathRunJobMock.mockRejectedValueOnce(new Error('worker unavailable'));

      await expect(
        enqueuePathRun({
          pathId: 'test-path-dispatch-fail',
          userId: 'user-dispatch-fail',
          nodes: mockNodes,
          edges: [],
        })
      ).rejects.toThrow('Run dispatch failed');

      const failedRuns = await repo.listRuns({
        userId: 'user-dispatch-fail',
        pathId: 'test-path-dispatch-fail',
        status: 'failed',
      });
      expect(failedRuns.total).toBe(1);
      expect(String(failedRuns.runs[0]?.errorMessage ?? '')).toContain('Run dispatch failed');

      const failedRunId = String(failedRuns.runs[0]?.id ?? '');
      const events = await repo.listRunEvents(failedRunId);
      expect(events.some((event: AiPathRunEventRecord) => event.message.includes('Run dispatch failed'))).toBe(
        true
      );
    });
  });

  describe('resumePathRun', () => {
    it('should reset run status to queued', async () => {
      if (shouldSkipPathRunPrismaTests()) return;
      const run = await enqueuePathRun({
        pathId: 'test-path',
        nodes: mockNodes,
        edges: [],
      });

      // Manually fail it
      await repo.updateRun(run.id, { status: 'failed', errorMessage: 'Error' });

      const resumed = await resumePathRun(run.id, 'resume');
      expect(resumed.status).toBe('queued');
      expect(resumed.errorMessage).toBeNull();

      const events = await repo.listRunEvents(run.id);
      expect(events.some((e: AiPathRunEventRecord) => e.message === 'Run resumed (resume).')).toBe(true);
    });

    it('reverts run status when dispatch fails during resume', async () => {
      if (shouldSkipPathRunPrismaTests()) return;
      const run = await enqueuePathRun({
        pathId: 'test-path-resume-dispatch-fail',
        nodes: mockNodes,
        edges: [],
      });
      await repo.updateRun(run.id, { status: 'failed', errorMessage: 'original-failure' });
      enqueuePathRunJobMock.mockRejectedValueOnce(new Error('dispatch unavailable'));

      await expect(resumePathRun(run.id, 'resume')).rejects.toThrow('Run dispatch failed');

      const latest = await repo.findRunById(run.id);
      expect(latest?.status).toBe('failed');
      expect(latest?.errorMessage).toBe('original-failure');

      const events = await repo.listRunEvents(run.id);
      expect(
        events.some((event: AiPathRunEventRecord) =>
          event.message.includes('Run dispatch failed during resume')
        )
      ).toBe(true);
    });
  });

  describe('cancelPathRun', () => {
    it('should set status to canceled and mark finishedAt', async () => {
      if (shouldSkipPathRunPrismaTests()) return;
      const run = await enqueuePathRun({
        pathId: 'test-path',
        nodes: mockNodes,
        edges: [],
      });

      const canceled = await cancelPathRun(run.id);
      expect(canceled.status).toBe('canceled');
      expect(canceled.finishedAt).toBeDefined();
      expect(removePathRunQueueEntriesMock).toHaveBeenCalledWith([run.id]);

      const events = await repo.listRunEvents(run.id);
      expect(events.some((e: AiPathRunEventRecord) => e.message === 'Run canceled.')).toBe(true);
    });

    it('should cancel using an explicit repository instance', async () => {
      if (shouldSkipPathRunPrismaTests()) return;
      const run = await enqueuePathRun({
        pathId: 'test-path-explicit-repo',
        nodes: mockNodes,
        edges: [],
      });

      const canceled = await cancelPathRunWithRepository(repo, run.id);
      expect(canceled.status).toBe('canceled');
      expect(canceled.finishedAt).toBeDefined();
      expect(removePathRunQueueEntriesMock).toHaveBeenCalledWith([run.id]);
    });

    it('should mark in-flight cancellation metadata when canceling a running run', async () => {
      if (shouldSkipPathRunPrismaTests()) return;
      const run = await enqueuePathRun({
        pathId: 'test-path-running-cancel',
        nodes: mockNodes,
        edges: [],
      });
      await repo.updateRun(run.id, { status: 'running', startedAt: new Date().toISOString() });

      const canceled = await cancelPathRun(run.id);
      expect(canceled.status).toBe('canceled');
      expect(canceled.meta).toEqual(
        expect.objectContaining({
          cancellation: expect.objectContaining({
            phase: 'requested',
            previousStatus: 'running',
          }),
        })
      );

      const events = await repo.listRunEvents(run.id);
      expect(events.some((e: AiPathRunEventRecord) => String(e.message).includes('Cancellation requested'))).toBe(
        true
      );
      expect(removePathRunQueueEntriesMock).toHaveBeenCalledWith([run.id]);
    });

    it('should still clear queued entries when run is already terminal', async () => {
      if (shouldSkipPathRunPrismaTests()) return;
      const run = await enqueuePathRun({
        pathId: 'test-path-terminal-cancel',
        nodes: mockNodes,
        edges: [],
      });
      await repo.updateRun(run.id, { status: 'completed', finishedAt: new Date().toISOString() });

      const result = await cancelPathRun(run.id);
      expect(result.status).toBe('completed');
      expect(removePathRunQueueEntriesMock).toHaveBeenCalledWith([run.id]);
    });
  });

  describe('retryPathRunNode', () => {
    it('should reset specific node and re-queue the run', async () => {
      if (shouldSkipPathRunPrismaTests()) return;
      const run = await enqueuePathRun({
        pathId: 'test-path',
        nodes: mockNodes,
        edges: [],
      });

      // Mark node as failed
      await repo.upsertRunNode(run.id, 'node-1', {
        nodeType: 'trigger',
        status: 'failed',
        errorMessage: 'Node failed',
      });
      await repo.updateRun(run.id, { status: 'failed', errorMessage: 'Run failed' });

      const updatedRun = await retryPathRunNode(run.id, 'node-1');
      expect(updatedRun.status).toBe('queued');

      const nodes = await repo.listRunNodes(run.id);
      expect(nodes[0]!.status).toBe('pending');
      expect(nodes[0]!.errorMessage).toBeNull();

      const events = await repo.listRunEvents(run.id);
      expect(events.some((e: AiPathRunEventRecord) => e.message === 'Retry node node-1.')).toBe(true);
    });

    it('reverts run status when dispatch fails during node retry', async () => {
      if (shouldSkipPathRunPrismaTests()) return;
      const run = await enqueuePathRun({
        pathId: 'test-path-retry-dispatch-fail',
        nodes: mockNodes,
        edges: [],
      });
      await repo.updateRun(run.id, { status: 'failed', errorMessage: 'original-node-failure' });

      enqueuePathRunJobMock.mockRejectedValueOnce(new Error('dispatch unavailable'));

      await expect(retryPathRunNode(run.id, 'node-1')).rejects.toThrow('Run dispatch failed');

      const latest = await repo.findRunById(run.id);
      expect(latest?.status).toBe('failed');
      expect(latest?.errorMessage).toBe('original-node-failure');

      const events = await repo.listRunEvents(run.id);
      expect(
        events.some((event: AiPathRunEventRecord) =>
          event.message.includes('Run dispatch failed during node retry')
        )
      ).toBe(true);
    });
  });

  describe('delete run helpers', () => {
    it('should delete a single run and clean queue entries', async () => {
      if (shouldSkipPathRunPrismaTests()) return;
      const run = await enqueuePathRun({
        pathId: 'test-path-delete-single',
        nodes: mockNodes,
        edges: [],
      });

      const deleted = await deletePathRunWithRepository(repo, run.id);
      expect(deleted).toBe(true);
      expect(removePathRunQueueEntriesMock).toHaveBeenCalledWith([run.id]);
      await expect(repo.findRunById(run.id)).resolves.toBeNull();
    });

    it('should delete filtered runs in bulk and clean queue entries', async () => {
      if (shouldSkipPathRunPrismaTests()) return;
      const runA = await enqueuePathRun({
        pathId: 'test-path-delete-bulk',
        nodes: mockNodes,
        edges: [],
      });
      const runB = await enqueuePathRun({
        pathId: 'test-path-delete-bulk',
        nodes: mockNodes,
        edges: [],
      });
      const runOther = await enqueuePathRun({
        pathId: 'test-path-delete-other',
        nodes: mockNodes,
        edges: [],
      });

      const result = await deletePathRunsWithRepository(repo, {
        pathId: 'test-path-delete-bulk',
      });

      expect(result.count).toBe(2);
      expect(removePathRunQueueEntriesMock).toHaveBeenCalledTimes(1);
      const queueCleanupArg = removePathRunQueueEntriesMock.mock.calls[0]?.[0];
      expect(queueCleanupArg).toEqual(expect.arrayContaining([runA.id, runB.id]));
      await expect(repo.findRunById(runOther.id)).resolves.toMatchObject({
        id: runOther.id,
      });
    });
  });
});
