import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as repoModule from '@/shared/lib/ai-paths/services/path-run-repository';
import { resumePathRun } from '../resume';
import { ACTIVE_RUN_STATUSES } from '@/features/ai/ai-paths/lib/path-run-status';

vi.mock('@/features/ai/ai-paths/lib/path-run-status', () => ({
  ACTIVE_RUN_STATUSES: { has: vi.fn((status) => ["queued", "running"].includes(status)) },
}));

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/services/path-run-executor', () => ({
  dispatchRun: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/services/run-stream-publisher', () => ({
  publishRunUpdate: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/services/runtime-state-port-repair', () => ({
  withRuntimeFingerprintMeta: vi.fn((meta) => meta),
}));

describe('resumePathRun', () => {
  const mockRepo = {
    findRunById: vi.fn(),
    updateRunIfStatus: vi.fn(),
    createRunEvent: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(repoModule.getPathRunRepository).mockResolvedValue(mockRepo as any);
  });

  it('should throw an error if the run is not found', async () => {
    mockRepo.findRunById.mockResolvedValue(null);
    await expect(resumePathRun('invalid-id')).rejects.toThrow('Run invalid-id not found');
  });

  it('should return existing run if it is already queued', async () => {
    const mockRun = { id: 'run-1', status: 'queued' };
    mockRepo.findRunById.mockResolvedValue(mockRun);
    
    const result = await resumePathRun('run-1');
    expect(result).toEqual(mockRun);
  });

  it('should update run status to queued and dispatch it', async () => {
    const mockRun = { id: 'run-1', status: 'failed', meta: {} };
    const updatedMockRun = { ...mockRun, status: 'queued' };
    mockRepo.findRunById.mockResolvedValue(mockRun);
    mockRepo.updateRunIfStatus.mockResolvedValue(updatedMockRun);
    
    const result = await resumePathRun('run-1');
    expect(result.status).toBe('queued');
    expect(mockRepo.updateRunIfStatus).toHaveBeenCalled();
  });
});
