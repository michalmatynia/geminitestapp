import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cancelPathRunWithRepository } from '../cancel';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import * as cleanupModule from '../cleanup';

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: vi.fn(),
}));

vi.mock('../cleanup', () => ({
  cleanupRunQueueEntries: vi.fn(),
}));

describe('cancelPathRunWithRepository', () => {
  const mockRepo = {
    findRunById: vi.fn(),
    updateRunIfStatus: vi.fn(),
    createRunEvent: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw error if run not found', async () => {
    mockRepo.findRunById.mockResolvedValue(null);
    await expect(cancelPathRunWithRepository(mockRepo as any, 'run-1')).rejects.toThrow('Run run-1 not found');
  });

  it('should cleanup and return if already canceled', async () => {
    const mockRun = { id: 'run-1', status: 'canceled' };
    mockRepo.findRunById.mockResolvedValue(mockRun);
    
    const result = await cancelPathRunWithRepository(mockRepo as any, 'run-1');
    expect(result).toEqual(mockRun);
    expect(cleanupModule.cleanupRunQueueEntries).toHaveBeenCalledWith('run-1');
  });

  it('should cancel an in-flight run', async () => {
    const mockRun = { id: 'run-1', status: 'running', meta: {} };
    mockRepo.findRunById.mockResolvedValue(mockRun);
    mockRepo.updateRunIfStatus.mockResolvedValue({ ...mockRun, status: 'canceled' });
    
    const result = await cancelPathRunWithRepository(mockRepo as any, 'run-1');
    expect(result.status).toBe('canceled');
    expect(mockRepo.updateRunIfStatus).toHaveBeenCalled();
    expect(cleanupModule.cleanupRunQueueEntries).toHaveBeenCalledWith('run-1');
  });
});
