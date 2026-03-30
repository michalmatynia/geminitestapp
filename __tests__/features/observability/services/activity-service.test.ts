/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getActivityRepository } from '@/shared/lib/observability/activity-repository';
import { isServerLoggingEnabled } from '@/shared/lib/observability/logging-controls-server';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { logActivity } from '@/shared/utils/observability/activity-service';

vi.mock('@/shared/lib/observability/activity-repository', () => ({
  getActivityRepository: vi.fn(),
}));

vi.mock('@/shared/lib/observability/logging-controls-server', () => ({
  isServerLoggingEnabled: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: vi.fn().mockResolvedValue(undefined),
}));

describe('activity-service', () => {
  const repository = {
    listActivity: vi.fn(),
    countActivity: vi.fn(),
    createActivity: vi.fn(),
    deleteActivity: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isServerLoggingEnabled).mockResolvedValue(true);
    vi.mocked(getActivityRepository).mockResolvedValue(repository as never);
    repository.createActivity.mockResolvedValue({
      id: 'activity-1',
      type: 'auth.login',
      description: 'User logged in',
      userId: 'user-1',
      entityId: null,
      entityType: 'auth',
      metadata: null,
      createdAt: '2026-03-25T00:00:00.000Z',
      updatedAt: '2026-03-25T00:00:00.000Z',
    });
  });

  it('skips activity persistence when activity logging is disabled', async () => {
    vi.mocked(isServerLoggingEnabled).mockImplementation(async (type) => type !== 'activity');

    const result = await logActivity({
      type: 'auth.login',
      description: 'User logged in',
      userId: 'user-1',
      entityType: 'auth',
    });

    expect(getActivityRepository).not.toHaveBeenCalled();
    expect(repository.createActivity).not.toHaveBeenCalled();
    expect(logSystemEvent).not.toHaveBeenCalled();
    expect(result.id).toMatch(/^activity-disabled-/);
  });

  it('persists activity records and emits a secondary system log when enabled', async () => {
    const result = await logActivity({
      type: 'auth.login',
      description: 'User logged in',
      userId: 'user-1',
      entityType: 'auth',
    });

    expect(getActivityRepository).toHaveBeenCalled();
    expect(repository.createActivity).toHaveBeenCalledWith({
      type: 'auth.login',
      description: 'User logged in',
      userId: 'user-1',
      entityType: 'auth',
    });
    expect(result.id).toBe('activity-1');
    expect(logSystemEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        message: 'Activity: auth.login - User logged in',
      })
    );
  });
});
