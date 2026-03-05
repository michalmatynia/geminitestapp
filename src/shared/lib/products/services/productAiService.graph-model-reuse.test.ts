import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductAiJobRecord, ProductAiJobRepository } from '@/shared/contracts/jobs';

const {
  createJobMock,
  findJobsMock,
  findJobByIdMock,
  findNextPendingJobMock,
  findAnyPendingJobMock,
  claimNextPendingJobMock,
  updateJobMock,
  deleteJobMock,
  deleteTerminalJobsMock,
  deleteAllJobsMock,
  markStaleRunningJobsMock,
  getProductAiJobRepositoryMock,
  logSystemEventMock,
  errorSystemLogInfoMock,
} = vi.hoisted(() => ({
  createJobMock: vi.fn(),
  findJobsMock: vi.fn(),
  findJobByIdMock: vi.fn(),
  findNextPendingJobMock: vi.fn(),
  findAnyPendingJobMock: vi.fn(),
  claimNextPendingJobMock: vi.fn(),
  updateJobMock: vi.fn(),
  deleteJobMock: vi.fn(),
  deleteTerminalJobsMock: vi.fn(),
  deleteAllJobsMock: vi.fn(),
  markStaleRunningJobsMock: vi.fn(),
  getProductAiJobRepositoryMock: vi.fn(),
  logSystemEventMock: vi.fn(),
  errorSystemLogInfoMock: vi.fn(),
}));

vi.mock('@/shared/lib/products/services/product-ai-job-repository', () => ({
  getProductAiJobRepository: getProductAiJobRepositoryMock,
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: logSystemEventMock,
  ErrorSystem: {
    logInfo: errorSystemLogInfoMock,
  },
}));

vi.mock('@/shared/lib/products/services/productService', () => ({
  productService: {
    getProductById: vi.fn(),
  },
}));

import { enqueueProductAiJob } from './productAiService';

const createJobRecord = (overrides: Partial<ProductAiJobRecord> = {}): ProductAiJobRecord => {
  const now = new Date('2026-03-05T00:00:00.000Z');
  return {
    id: 'job-1',
    productId: 'product-1',
    status: 'pending',
    type: 'graph_model',
    payload: {},
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
  createJob: createJobMock,
  findJobs: findJobsMock,
  findJobById: findJobByIdMock,
  findNextPendingJob: findNextPendingJobMock,
  findAnyPendingJob: findAnyPendingJobMock,
  claimNextPendingJob: claimNextPendingJobMock,
  updateJob: updateJobMock,
  deleteJob: deleteJobMock,
  deleteTerminalJobs: deleteTerminalJobsMock,
  deleteAllJobs: deleteAllJobsMock,
  markStaleRunningJobs: markStaleRunningJobsMock,
};

describe('enqueueProductAiJob graph_model reuse guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProductAiJobRepositoryMock.mockResolvedValue(repositoryMock);
    findJobsMock.mockResolvedValue([]);
    createJobMock.mockImplementation(
      async (productId: string, type: string, payload: unknown): Promise<ProductAiJobRecord> =>
        createJobRecord({
          id: 'job-created',
          productId,
          type,
          payload,
        })
    );
  });

  it('reuses pending graph_model job only when cacheKey and payloadHash match', async () => {
    findJobsMock.mockResolvedValue([
      createJobRecord({
        id: 'job-existing',
        status: 'pending',
        payload: {
          cacheKey: 'cache-1',
          payloadHash: 'hash-1',
        },
      }),
    ]);

    const result = await enqueueProductAiJob('product-1', 'graph_model', {
      cacheKey: 'cache-1',
      payloadHash: 'hash-1',
      prompt: 'Generate a title',
    });

    expect(result.id).toBe('job-existing');
    expect(createJobMock).not.toHaveBeenCalled();
  });

  it('does not reuse a graph_model job when payloadHash differs', async () => {
    findJobsMock.mockResolvedValue([
      createJobRecord({
        id: 'job-existing',
        status: 'pending',
        payload: {
          cacheKey: 'cache-1',
          payloadHash: 'hash-old',
        },
      }),
    ]);

    const result = await enqueueProductAiJob('product-1', 'graph_model', {
      cacheKey: 'cache-1',
      payloadHash: 'hash-new',
      prompt: 'Generate a title',
    });

    expect(result.id).toBe('job-created');
    expect(createJobMock).toHaveBeenCalledTimes(1);
  });

  it('never reuses completed graph_model jobs even with matching hash', async () => {
    findJobsMock.mockResolvedValue([
      createJobRecord({
        id: 'job-existing',
        status: 'completed',
        payload: {
          cacheKey: 'cache-1',
          payloadHash: 'hash-1',
        },
        result: {
          result: 'stale-output',
        },
      }),
    ]);

    const result = await enqueueProductAiJob('product-1', 'graph_model', {
      cacheKey: 'cache-1',
      payloadHash: 'hash-1',
      prompt: 'Generate a title',
    });

    expect(result.id).toBe('job-created');
    expect(createJobMock).toHaveBeenCalledTimes(1);
  });
});
