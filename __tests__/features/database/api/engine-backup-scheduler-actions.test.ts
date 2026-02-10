/**
 * @vitest-environment node
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST as POST_RUN_NOW } from '@/app/api/databases/engine/backup-scheduler/run-now/route';
import { POST as POST_TICK } from '@/app/api/databases/engine/backup-scheduler/tick/route';
import {
  getDatabaseBackupSchedulerStatus,
  markDatabaseBackupJobQueued,
  tickDatabaseBackupScheduler,
} from '@/features/database/services/database-backup-scheduler';
import { auth } from '@/features/auth/server';
import {
  enqueueProductAiJob,
  enqueueProductAiJobToQueue,
  startProductAiJobQueue,
} from '@/features/jobs/server';
import { getDatabaseEngineOperationControls } from '@/shared/lib/db/database-engine-policy';
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

vi.mock('@/features/auth/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/shared/lib/db/database-engine-policy', () => ({
  getDatabaseEngineOperationControls: vi.fn(),
}));

vi.mock('@/features/database/services/database-backup-scheduler', () => ({
  tickDatabaseBackupScheduler: vi.fn(),
  getDatabaseBackupSchedulerStatus: vi.fn(),
  markDatabaseBackupJobQueued: vi.fn(),
}));

vi.mock('@/features/jobs/workers/databaseBackupSchedulerQueue', () => ({
  DATABASE_BACKUP_SCHEDULER_REPEAT_EVERY_MS: 60_000,
  startDatabaseBackupSchedulerQueue: vi.fn(),
  getDatabaseBackupSchedulerQueueStatus: vi.fn(),
}));

vi.mock('@/features/jobs/server', () => ({
  enqueueProductAiJob: vi.fn(),
  enqueueProductAiJobToQueue: vi.fn(),
  startProductAiJobQueue: vi.fn(),
}));

vi.mock('@/features/observability/server', () => ({
  logSystemError: vi.fn().mockResolvedValue(undefined),
}));

describe('Database Engine backup scheduler actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDatabaseEngineOperationControls).mockResolvedValue({
      allowManualFullSync: true,
      allowManualCollectionSync: true,
      allowManualBackfill: true,
      allowManualBackupRunNow: true,
      allowManualBackupMaintenance: true,
      allowBackupSchedulerTick: true,
      allowOperationJobCancellation: true,
    });
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: 'user-1',
        isElevated: true,
        permissions: ['settings.manage'],
      },
    } as Awaited<ReturnType<typeof auth>>);
  });

  it('POST /api/databases/engine/backup-scheduler/tick runs scheduler tick and returns status payload', async () => {
    vi.mocked(tickDatabaseBackupScheduler).mockResolvedValue({
      checkedAt: '2026-02-10T10:00:00.000Z',
      schedulerEnabled: true,
      triggered: [{ dbType: 'mongodb', jobId: 'job-1' }],
      skipped: [{ dbType: 'postgresql', reason: 'not_due' }],
    });
    vi.mocked(getDatabaseBackupSchedulerStatus).mockResolvedValue({
      timestamp: '2026-02-10T10:00:00.000Z',
      schedulerEnabled: true,
      lastCheckedAt: '2026-02-10T10:00:00.000Z',
      targets: {
        mongodb: {
          enabled: true,
          cadence: 'daily',
          intervalDays: 1,
          weekday: 1,
          timeUtc: '02:00',
          lastQueuedAt: '2026-02-10T10:00:00.000Z',
          lastRunAt: null,
          lastStatus: 'queued',
          lastJobId: 'job-1',
          lastError: null,
          nextDueAt: '2026-02-11T02:00:00.000Z',
          dueNow: false,
        },
        postgresql: {
          enabled: true,
          cadence: 'daily',
          intervalDays: 1,
          weekday: 1,
          timeUtc: '02:00',
          lastQueuedAt: null,
          lastRunAt: null,
          lastStatus: 'idle',
          lastJobId: null,
          lastError: null,
          nextDueAt: '2026-02-10T02:00:00.000Z',
          dueNow: false,
        },
      },
    });
    vi.mocked(getDatabaseBackupSchedulerQueueStatus).mockResolvedValue({
      running: true,
      healthy: true,
      processing: false,
      activeJobs: 0,
      waitingJobs: 0,
      failedJobs: 0,
      completedJobs: 2,
      lastPollTime: 1700000000000,
      timeSinceLastPoll: 1000,
    });

    const res = await POST_TICK(
      new NextRequest('http://localhost/api/databases/engine/backup-scheduler/tick', {
        method: 'POST',
      })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(startDatabaseBackupSchedulerQueue).toHaveBeenCalledTimes(1);
    expect(tickDatabaseBackupScheduler).toHaveBeenCalledTimes(1);
    expect(body.success).toBe(true);
    expect(body.status.repeatEveryMs).toBe(DATABASE_BACKUP_SCHEDULER_REPEAT_EVERY_MS);
  });

  it('POST /api/databases/engine/backup-scheduler/run-now queues backup jobs for all providers', async () => {
    vi.mocked(enqueueProductAiJob)
      .mockResolvedValueOnce({
        id: 'job-mongo-1',
        productId: 'system',
        status: 'pending',
      } as Awaited<ReturnType<typeof enqueueProductAiJob>>)
      .mockResolvedValueOnce({
        id: 'job-pg-1',
        productId: 'system',
        status: 'pending',
      } as Awaited<ReturnType<typeof enqueueProductAiJob>>);
    vi.mocked(enqueueProductAiJobToQueue).mockResolvedValue(undefined);

    const res = await POST_RUN_NOW(
      new NextRequest('http://localhost/api/databases/engine/backup-scheduler/run-now', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dbType: 'all' }),
      })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      success: true,
      queued: [
        { dbType: 'mongodb', jobId: 'job-mongo-1' },
        { dbType: 'postgresql', jobId: 'job-pg-1' },
      ],
    });
    expect(enqueueProductAiJob).toHaveBeenCalledTimes(2);
    expect(markDatabaseBackupJobQueued).toHaveBeenCalledTimes(2);
    expect(startProductAiJobQueue).toHaveBeenCalledTimes(1);
    expect(enqueueProductAiJobToQueue).toHaveBeenCalledTimes(2);
  });

  it('POST /api/databases/engine/backup-scheduler/tick returns forbidden when manual tick is disabled', async () => {
    vi.mocked(getDatabaseEngineOperationControls).mockResolvedValue({
      allowManualFullSync: true,
      allowManualCollectionSync: true,
      allowManualBackfill: true,
      allowManualBackupRunNow: true,
      allowManualBackupMaintenance: true,
      allowBackupSchedulerTick: false,
      allowOperationJobCancellation: true,
    });

    await expect(
      POST_TICK(
        new NextRequest('http://localhost/api/databases/engine/backup-scheduler/tick', {
          method: 'POST',
        })
      )
    ).rejects.toThrow('disabled by Database Engine controls');
    expect(startDatabaseBackupSchedulerQueue).not.toHaveBeenCalled();
    expect(tickDatabaseBackupScheduler).not.toHaveBeenCalled();
  });

  it('POST /api/databases/engine/backup-scheduler/run-now returns forbidden when manual backup is disabled', async () => {
    vi.mocked(getDatabaseEngineOperationControls).mockResolvedValue({
      allowManualFullSync: true,
      allowManualCollectionSync: true,
      allowManualBackfill: true,
      allowManualBackupRunNow: false,
      allowManualBackupMaintenance: true,
      allowBackupSchedulerTick: true,
      allowOperationJobCancellation: true,
    });

    await expect(
      POST_RUN_NOW(
        new NextRequest('http://localhost/api/databases/engine/backup-scheduler/run-now', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ dbType: 'all' }),
        })
      )
    ).rejects.toThrow('disabled by Database Engine controls');
    expect(enqueueProductAiJob).not.toHaveBeenCalled();
  });
});
