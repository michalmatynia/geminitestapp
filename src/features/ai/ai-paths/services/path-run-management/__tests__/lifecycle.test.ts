import { describe, it, expect, vi } from 'vitest';
import { resumePathRun } from '../resume';
import { retryPathRunNode } from '../retry';
import { cancelPathRunWithRepository } from '../cancel';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/services/path-run-executor', () => ({
  dispatchRun: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/services/run-stream-publisher', () => ({
  publishRunUpdate: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/lib/path-run-status', () => ({
  ACTIVE_RUN_STATUSES: { has: vi.fn((status) => ['queued', 'running'].includes(status)) },
}));

vi.mock('@/features/ai/ai-paths/services/runtime-state-port-repair', () => ({
  withRuntimeFingerprintMeta: vi.fn((meta) => meta),
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  removePathRunQueueEntries: vi.fn().mockResolvedValue(undefined),
}));

describe('AI Path Management Integration', () => {
  const mockRepo = {
    findRunById: vi.fn(),
    updateRunIfStatus: vi.fn(),
    createRunEvent: vi.fn(),
    upsertRunNode: vi.fn(),
  };

  it('verifies a full lifecycle: resume -> retry -> cancel', async () => {
    vi.mocked(getPathRunRepository).mockResolvedValue(mockRepo as any);
    
    // 1. Setup mock data
    const mockRun = { id: 'run-lifecycle', status: 'running', meta: {} };
    mockRepo.findRunById.mockResolvedValue({ ...mockRun, status: 'queued' });
    
    // Mock the update to queued
    mockRepo.updateRunIfStatus.mockResolvedValue({ ...mockRun, status: 'queued' });

    // 2. Resume
    mockRepo.updateRunIfStatus.mockResolvedValue({ ...mockRun, status: 'queued' });
    const resumed = await resumePathRun('run-lifecycle');
    expect(resumed.status).toBe('queued');

    // 3. Retry
    // Simulate current status is queued
    mockRepo.findRunById.mockResolvedValue({ ...mockRun, status: 'queued' });
    const retried = await retryPathRunNode('run-lifecycle', 'node-1');
    expect(retried.status).toBe('queued');

    // 4. Cancel
    // Simulate current status is queued (cancellable)
    mockRepo.findRunById.mockResolvedValue({ ...mockRun, status: 'queued' });
    mockRepo.updateRunIfStatus.mockResolvedValue({ ...mockRun, status: 'canceled' });
    const canceled = await cancelPathRunWithRepository(mockRepo as any, 'run-lifecycle');
    expect(canceled.status).toBe('canceled');
  });
});
