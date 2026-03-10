import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductAiJobRecord, ProductAiJobRepository } from '@/shared/contracts/jobs';

const {
  dispatchProductAiJobMock,
  getProductAiJobRepositoryMock,
  logSystemEventMock,
  captureExceptionMock,
  logWarningMock,
  queueProcessorRef,
  createManagedQueueMock,
} = vi.hoisted(() => ({
  dispatchProductAiJobMock: vi.fn(),
  getProductAiJobRepositoryMock: vi.fn(),
  logSystemEventMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  logWarningMock: vi.fn(),
  queueProcessorRef: { current: null as ((data: Record<string, unknown>) => Promise<unknown>) | null },
  createManagedQueueMock: vi.fn((config: { processor: (data: Record<string, unknown>) => Promise<unknown> }) => {
    queueProcessorRef.current = config.processor;
    return {
      enqueue: vi.fn(),
      startWorker: vi.fn(),
      stopWorker: vi.fn(),
      getHealthStatus: vi.fn().mockResolvedValue({}),
    };
  }),
}));

vi.mock('@/features/products/workers/product-ai-processors', () => ({
  dispatchProductAiJob: dispatchProductAiJobMock,
}));

vi.mock('@/shared/lib/products/services/product-ai-job-repository', () => ({
  getProductAiJobRepository: getProductAiJobRepositoryMock,
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: logSystemEventMock,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
    logWarning: logWarningMock,
  },
}));

vi.mock('@/shared/lib/queue', () => ({
  createManagedQueue: createManagedQueueMock,
}));

import { processProductAiJob } from './productAiQueue';

const createJobRecord = (overrides: Partial<ProductAiJobRecord> = {}): ProductAiJobRecord => {
  const now = new Date('2026-03-05T00:00:00.000Z');
  return {
    id: 'job-graph-model-1',
    productId: 'path_local_test',
    status: 'pending',
    type: 'graph_model',
    payload: {
      prompt: 'Generate copy',
    },
    result: null,
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    finishedAt: null,
    ...overrides,
  };
};

const repositoryMock: ProductAiJobRepository = {
  createJob: vi.fn(),
  findJobs: vi.fn(),
  findJobById: vi.fn(),
  findNextPendingJob: vi.fn(),
  findAnyPendingJob: vi.fn(),
  claimNextPendingJob: vi.fn(),
  updateJob: vi.fn(),
  deleteJob: vi.fn(),
  deleteTerminalJobs: vi.fn(),
  deleteAllJobs: vi.fn(),
  markStaleRunningJobs: vi.fn(),
};

describe('processProductAiJob graph_model dispatch normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProductAiJobRepositoryMock.mockResolvedValue(repositoryMock);
    dispatchProductAiJobMock.mockResolvedValue({ result: 'ok' });
    vi.mocked(repositoryMock.markStaleRunningJobs).mockResolvedValue({ count: 0 });
  });

  it('normalizes legacy ai_paths graph_model jobs before dispatch', async () => {
    vi.mocked(repositoryMock.findJobById).mockResolvedValue(
      createJobRecord({
        payload: {
          prompt: 'Generate copy',
          graph: {
            runId: 'run-1',
            nodeId: 'model-node-1',
          },
        },
      })
    );

    await processProductAiJob('job-graph-model-1');

    expect(dispatchProductAiJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          prompt: 'Generate copy',
          source: 'ai_paths',
          cacheKey: expect.any(String),
          payloadHash: expect.any(String),
          graph: {
            runId: 'run-1',
            nodeId: 'model-node-1',
          },
        }),
      })
    );
  });

  it('fails the job before dispatch when queued graph_model payload is malformed', async () => {
    vi.mocked(repositoryMock.findJobById).mockResolvedValue(
      createJobRecord({
        payload: {
          prompt: 'Generate copy',
          graph: 'bad-graph',
        },
      })
    );

    await expect(processProductAiJob('job-graph-model-1')).rejects.toThrow();

    expect(dispatchProductAiJobMock).not.toHaveBeenCalled();
    expect(repositoryMock.updateJob).toHaveBeenCalledWith(
      'job-graph-model-1',
      expect.objectContaining({
        status: 'failed',
      })
    );
  });

  it('fails the job before dispatch when queued graph_model payload is missing prompt', async () => {
    vi.mocked(repositoryMock.findJobById).mockResolvedValue(
      createJobRecord({
        payload: {
          graph: {
            runId: 'run-1',
            nodeId: 'model-node-1',
          },
        },
      })
    );

    await expect(processProductAiJob('job-graph-model-1')).rejects.toThrow();

    expect(dispatchProductAiJobMock).not.toHaveBeenCalled();
    expect(repositoryMock.updateJob).toHaveBeenCalledWith(
      'job-graph-model-1',
      expect.objectContaining({
        status: 'failed',
      })
    );
  });

  it('fails the job before dispatch when queued graph_model payload has a blank prompt', async () => {
    vi.mocked(repositoryMock.findJobById).mockResolvedValue(
      createJobRecord({
        payload: {
          prompt: '   ',
          graph: {
            runId: 'run-1',
            nodeId: 'model-node-1',
          },
        },
      })
    );

    await expect(processProductAiJob('job-graph-model-1')).rejects.toThrow();

    expect(dispatchProductAiJobMock).not.toHaveBeenCalled();
    expect(repositoryMock.updateJob).toHaveBeenCalledWith(
      'job-graph-model-1',
      expect.objectContaining({
        status: 'failed',
      })
    );
  });

  it('normalizes legacy ai_paths graph_model jobs on the background queue processor path too', async () => {
    vi.mocked(repositoryMock.findJobById).mockResolvedValue(
      createJobRecord({
        payload: {
          prompt: 'Generate copy',
          graph: {
            runId: 'run-1',
            nodeId: 'model-node-1',
          },
        },
      })
    );

    await queueProcessorRef.current?.({
      jobId: 'job-graph-model-1',
      productId: 'path_local_test',
      type: 'graph_model',
      payload: {},
    });

    expect(dispatchProductAiJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          prompt: 'Generate copy',
          source: 'ai_paths',
          cacheKey: expect.any(String),
          payloadHash: expect.any(String),
          graph: {
            runId: 'run-1',
            nodeId: 'model-node-1',
          },
        }),
      })
    );
  });
});
