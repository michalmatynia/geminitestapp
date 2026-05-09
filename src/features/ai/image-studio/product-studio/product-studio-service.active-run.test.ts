import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getRunById: vi.fn(),
  getSequenceRunById: vi.fn(),
  redis: {
    del: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('@/features/ai/image-studio/server/run-repository', () => ({
  getImageStudioRunById: (...args: unknown[]) => mocks.getRunById(...args),
}));

vi.mock('@/features/ai/image-studio/server/sequence-run-repository', () => ({
  getImageStudioSequenceRunById: (...args: unknown[]) => mocks.getSequenceRunById(...args),
}));

vi.mock('@/shared/lib/redis', () => ({
  getRedisClient: () => mocks.redis,
}));

import { resolveProductStudioActiveRunInfo } from './product-studio-service.active-run';

const buildStoredRun = (overrides: Record<string, unknown> = {}) => ({
  runId: 'run-1',
  runKind: 'generation',
  sequenceRunId: null,
  pendingExpectedOutputs: 1,
  baselineVariantIds: ['baseline-1'],
  projectId: 'project-1',
  dispatchedAt: new Date().toISOString(),
  ...overrides,
});

describe('resolveProductStudioActiveRunInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redis.del.mockResolvedValue(1);
  });

  it('returns terminal failed run info once before clearing the active-run key', async () => {
    const stored = buildStoredRun();
    mocks.redis.get.mockResolvedValue(JSON.stringify(stored));
    mocks.getRunById.mockResolvedValue({
      status: 'failed',
      errorMessage: 'Invalid payload',
    });

    const result = await resolveProductStudioActiveRunInfo({
      productId: 'product-1',
      imageSlotIndex: 0,
    });

    expect(result).toMatchObject({
      runId: 'run-1',
      runStatus: 'failed',
      errorMessage: 'Invalid payload',
      dispatchedAt: stored.dispatchedAt,
    });
    expect(mocks.redis.del).toHaveBeenCalledWith('product-studio:active-run:product-1:0');
  });

  it('converts stale in-flight runs to a terminal timeout signal', async () => {
    const stored = buildStoredRun({
      dispatchedAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    });
    mocks.redis.get.mockResolvedValue(JSON.stringify(stored));
    mocks.getRunById.mockResolvedValue({
      status: 'running',
      errorMessage: null,
    });

    const result = await resolveProductStudioActiveRunInfo({
      productId: 'product-1',
      imageSlotIndex: 0,
    });

    expect(result).toMatchObject({
      runId: 'run-1',
      runStatus: 'failed',
      errorMessage: 'Studio generation timed out while waiting for generated variants.',
    });
    expect(mocks.redis.del).toHaveBeenCalledWith('product-studio:active-run:product-1:0');
  });

  it('keeps fresh in-flight run info active', async () => {
    const stored = buildStoredRun();
    mocks.redis.get.mockResolvedValue(JSON.stringify(stored));
    mocks.getRunById.mockResolvedValue({
      status: 'queued',
      errorMessage: null,
    });

    const result = await resolveProductStudioActiveRunInfo({
      productId: 'product-1',
      imageSlotIndex: 0,
    });

    expect(result).toMatchObject({
      runId: 'run-1',
      runStatus: 'queued',
      errorMessage: null,
    });
    expect(mocks.redis.del).not.toHaveBeenCalled();
  });
});
