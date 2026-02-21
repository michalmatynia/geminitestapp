/**
 * @vitest-environment node
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/databases/engine/backup-scheduler/status/route';
import { getDatabaseBackupSchedulerStatus } from '@/features/database/services/database-backup-scheduler';
import {
  DATABASE_BACKUP_SCHEDULER_REPEAT_EVERY_MS,
  getDatabaseBackupSchedulerQueueStatus,
  startDatabaseBackupSchedulerQueue,
} from '@/features/jobs/workers/databaseBackupSchedulerQueue';

vi.mock('@/shared/lib/api/api-handler', () => ({
  apiHandler:
    (handler: (req: NextRequest, ctx: unknown) => Promise<Response>) =>
      async (req: NextRequest): Promise<Response> =>
        handler(req, {
          requestId: 'test-request-id',
        }),
}));

vi.mock('@/features/database/services/database-backup-scheduler', () => ({
  getDatabaseBackupSchedulerStatus: vi.fn(),
}));

vi.mock('@/features/jobs/workers/databaseBackupSchedulerQueue', () => ({
  DATABASE_BACKUP_SCHEDULER_REPEAT_EVERY_MS: 60_000,
  startDatabaseBackupSchedulerQueue: vi.fn(),
  getDatabaseBackupSchedulerQueueStatus: vi.fn(),
}));

const schedulerStatusPayload = {
  timestamp: '2026-02-10T10:00:00.000Z',
  schedulerEnabled: true,
  repeatTickEnabled: true,
  lastCheckedAt: '2026-02-10T09:59:00.000Z',
  queue: {
    running: true,
    healthy: true,
    processing: false,
  },
  repeatEveryMs: 60000,
  targets: {
    mongodb: {
      enabled: true,
      cadence: 'daily' as const,
      intervalDays: 3,
      weekday: 1,
      timeUtc: '02:00',
      lastQueuedAt: '2026-02-10T09:58:00.000Z',
      lastRunAt: '2026-02-10T09:58:20.000Z',
      lastStatus: 'success' as const,
      lastJobId: 'job-1',
      lastError: null,
      nextDueAt: '2026-02-11T02:00:00.000Z',
      dueNow: false,
    },
    postgresql: {
      enabled: false,
      cadence: 'weekly' as const,
      intervalDays: 7,
      weekday: 0,
      timeUtc: '03:30',
      lastQueuedAt: null,
      lastRunAt: null,
      lastStatus: 'idle' as const,
      lastJobId: null,
      lastError: null,
      nextDueAt: '2026-02-15T03:30:00.000Z',
      dueNow: false,
    },
  },
};

const queueStatusPayload = {
  running: true,
  healthy: true,
  processing: false,
  activeJobs: 0,
  waitingJobs: 1,
  failedJobs: 0,
  completedJobs: 12,
  lastPollTime: 1700000000000,
  timeSinceLastPoll: 1000,
};

describe('GET /api/databases/engine/backup-scheduler/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDatabaseBackupSchedulerStatus).mockResolvedValue(schedulerStatusPayload);
    vi.mocked(getDatabaseBackupSchedulerQueueStatus).mockResolvedValue(queueStatusPayload);
  });

  it('starts scheduler queue and returns no-store payload', async () => {
    const req = new NextRequest('http://localhost/api/databases/engine/backup-scheduler/status');

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(startDatabaseBackupSchedulerQueue).toHaveBeenCalledTimes(1);
    expect(getDatabaseBackupSchedulerStatus).toHaveBeenCalledTimes(1);
    expect(getDatabaseBackupSchedulerQueueStatus).toHaveBeenCalledTimes(1);
    expect(body).toEqual({
      ...schedulerStatusPayload,
      repeatEveryMs: DATABASE_BACKUP_SCHEDULER_REPEAT_EVERY_MS,
      queue: queueStatusPayload,
    });
  });
});
