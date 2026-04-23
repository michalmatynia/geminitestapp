import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retryPathRunNode } from '../retry';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/services/path-run-executor', () => ({
  dispatchRun: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/lib/path-run-status', () => ({
  ACTIVE_RUN_STATUSES: { has: vi.fn((status) => ['queued', 'running'].includes(status)) },
}));

describe('retryPathRunNode', () => {
  const mockRepo = {
    findRunById: vi.fn(),
    updateRunIfStatus: vi.fn(),
    upsertRunNode: vi.fn(),
    createRunEvent: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPathRunRepository).mockResolvedValue(mockRepo as any);
  });

  it('should throw error if run not found', async () => {
    mockRepo.findRunById.mockResolvedValue(null);
    await expect(retryPathRunNode('run-1', 'node-1')).rejects.toThrow('Run run-1 not found');
  });

  it('should return the run if it is already queued', async () => {
    const mockRun = { id: 'run-1', status: 'queued' };
    mockRepo.findRunById.mockResolvedValue(mockRun);
    
    const result = await retryPathRunNode('run-1', 'node-1');
    expect(result).toEqual(mockRun);
  });
});
