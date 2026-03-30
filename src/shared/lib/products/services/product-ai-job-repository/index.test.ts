/**
 * @vitest-environment node
 */

import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  repository: {
    claimNextPendingJob: vi.fn(),
    createJob: vi.fn(),
    deleteAllJobs: vi.fn(),
    deleteJob: vi.fn(),
    deleteTerminalJobs: vi.fn(),
    findAnyPendingJob: vi.fn(),
    findJobById: vi.fn(),
    findJobs: vi.fn(),
    findNextPendingJob: vi.fn(),
    markStaleRunningJobs: vi.fn(),
    updateJob: vi.fn(),
  },
}));

vi.mock('@/shared/lib/products/services/product-ai-job-repository/mongo-product-ai-job-repository', () => ({
  mongoProductAiJobRepository: mocks.repository,
}));

const loadModule = async () => {
  vi.resetModules();
  return import('./index');
};

describe('product-ai-job-repository index', () => {
  it('caches the mongo repository and records the selected provider', async () => {
    const module = await loadModule();

    expect(module.getProductAiJobProvider()).toBeNull();

    const first = await module.getProductAiJobRepository();
    const second = await module.getProductAiJobRepository();

    expect(first).toBe(mocks.repository);
    expect(second).toBe(first);
    expect(module.getProductAiJobProvider()).toBe('mongodb');
  });
});
