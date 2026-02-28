import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mocks } = vi.hoisted(() => ({
  mocks: {
    productAiProcessor: null as any,
  },
}));

vi.mock('@/shared/lib/queue', () => ({
  createManagedQueue: vi.fn((config) => {
    if (config.name === 'product-ai') {
      mocks.productAiProcessor = config.processor;
    }
    return {
      startWorker: vi.fn(),
      stopWorker: vi.fn(),
      enqueue: vi.fn(),
      getHealthStatus: vi.fn().mockResolvedValue({}),
    };
  }),
}));

vi.mock('@/features/jobs/processors/product-ai-processors', () => ({
  dispatchProductAiJob: vi.fn(),
}));

vi.mock('@/features/jobs/services/product-ai-job-repository', () => ({
  getProductAiJobRepository: vi.fn(),
}));

vi.mock('@/features/observability/server', () => ({
  logSystemEvent: vi.fn().mockResolvedValue(undefined),
  ErrorSystem: {
    captureException: vi.fn(),
  },
}));

// Import after mocks
import { dispatchProductAiJob } from '@/features/jobs/processors/product-ai-processors';
import { getProductAiJobRepository } from '@/features/jobs/services/product-ai-job-repository';
import { startProductAiJobQueue } from '@/features/jobs/workers/productAiQueue';
import { ErrorSystem } from '@/features/observability/server';

describe('Product AI Job Queue Worker', () => {
  const mockJobRepo = {
    markStaleRunningJobs: vi.fn().mockResolvedValue({ count: 0 }),
    findJobById: vi.fn(),
    updateJob: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getProductAiJobRepository).mockResolvedValue(mockJobRepo as any);
  });

  it('starts the worker', () => {
    startProductAiJobQueue();
    expect(mocks.productAiProcessor).toBeDefined();
  });

  it('processes a job successfully', async () => {
    expect(mocks.productAiProcessor).toBeDefined();

    const mockJob = {
      id: 'job-1',
      productId: 'p1',
      type: 'description_generation',
      status: 'pending',
      payload: {},
      createdAt: new Date(),
    };

    mockJobRepo.findJobById.mockResolvedValue(mockJob);
    vi.mocked(dispatchProductAiJob).mockResolvedValue({ description: 'New AI content' });

    await mocks.productAiProcessor({
      jobId: 'job-1',
      productId: 'p1',
      type: 'description_generation',
      payload: {},
    });

    expect(mockJobRepo.updateJob).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({
        status: 'running',
        startedAt: expect.any(Date),
      })
    );
    expect(dispatchProductAiJob).toHaveBeenCalled();
    expect(mockJobRepo.updateJob).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({
        status: 'completed',
        result: { description: 'New AI content' },
      })
    );
  });

  it('handles errors and captures exception', async () => {
    expect(mocks.productAiProcessor).toBeDefined();

    const mockJob = {
      id: 'job-1',
      productId: 'p1',
      type: 'description_generation',
      status: 'pending',
      payload: {},
      createdAt: new Date(),
    };

    mockJobRepo.findJobById.mockResolvedValue(mockJob);
    vi.mocked(dispatchProductAiJob).mockRejectedValue(new Error('AI Service Down'));

    await expect(
      mocks.productAiProcessor({
        jobId: 'job-1',
        productId: 'p1',
        type: 'description_generation',
        payload: {},
      })
    ).rejects.toThrow('AI Service Down');

    expect(ErrorSystem.captureException).toHaveBeenCalled();
    expect(mockJobRepo.updateJob).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({
        status: 'failed',
        errorMessage: 'AI Service Down',
      })
    );
  });
});
