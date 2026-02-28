/**
 * @vitest-environment node
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST as POST_CANCEL } from '@/app/api/databases/engine/operations/jobs/[jobId]/cancel/route';
import { GET as GET_JOBS } from '@/app/api/databases/engine/operations/jobs/route';
import { auth } from '@/features/auth/server';
import {
  cancelProductAiJob,
  getProductAiJob,
  getProductAiJobs,
  getQueueStatus,
} from '@/features/jobs/server';
import { getDatabaseEngineOperationControls } from '@/shared/lib/db/database-engine-policy';

vi.mock('@/features/auth/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/shared/lib/db/database-engine-policy', () => ({
  getDatabaseEngineOperationControls: vi.fn(),
}));

vi.mock('@/features/jobs/server', () => ({
  getProductAiJobs: vi.fn(),
  getQueueStatus: vi.fn(),
  getProductAiJob: vi.fn(),
  cancelProductAiJob: vi.fn(),
}));

describe('Database Engine operations jobs API', () => {
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
    } as unknown as Awaited<ReturnType<typeof auth>>);
  });

  it('GET /api/databases/engine/operations/jobs returns filtered db operation jobs', async () => {
    vi.mocked(getProductAiJobs).mockResolvedValue([
      {
        id: 'job-db-backup-1',
        productId: 'system',
        status: 'completed',
        type: 'db_backup',
        jobType: 'db_backup',
        payload: { dbType: 'mongodb', source: 'database_backup_scheduler' },
        result: { message: 'Backup created' },
        errorMessage: null,
        createdAt: '2026-02-10T10:00:00.000Z',
        startedAt: '2026-02-10T10:00:01.000Z',
        finishedAt: '2026-02-10T10:00:15.000Z',
      },
      {
        id: 'job-translation-1',
        productId: 'p1',
        status: 'completed',
        type: 'translation',
        jobType: 'translation',
        payload: {},
        result: null,
        errorMessage: null,
        createdAt: '2026-02-10T09:00:00.000Z',
        startedAt: null,
        finishedAt: null,
      },
    ] as Awaited<ReturnType<typeof getProductAiJobs>>);
    vi.mocked(getQueueStatus).mockResolvedValue({
      'product-ai': {
        name: 'product-ai',
        running: true,
        healthy: true,
        processing: false,
        waitingCount: 0,
        activeCount: 0,
        completedCount: 10,
        failedCount: 0,
        lastPollTime: 1700000000000,
        timeSinceLastPoll: 1200,
      }
    } as any);

    const res = await GET_JOBS(
      new NextRequest('http://localhost/api/databases/engine/operations/jobs?limit=10')
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(getProductAiJobs).toHaveBeenCalledWith('system');
    expect(body.jobs).toHaveLength(1);
    expect(body.jobs[0]).toMatchObject({
      id: 'job-db-backup-1',
      type: 'db_backup',
      dbType: 'mongodb',
      resultSummary: 'Backup created',
    });
  });

  it('POST /api/databases/engine/operations/jobs/[jobId]/cancel cancels db operation jobs', async () => {
    vi.mocked(getProductAiJob).mockResolvedValue({
      id: 'job-db-sync-1',
      productId: 'system',
      status: 'running',
      type: 'db_sync',
      jobType: 'db_sync',
      payload: { direction: 'mongo_to_prisma' },
      result: null,
      errorMessage: null,
      error: null,
      createdAt: '2026-02-10T10:00:00.000Z',
      updatedAt: '2026-02-10T10:00:00.000Z',
      startedAt: '2026-02-10T10:00:01.000Z',
      finishedAt: null,
      completedAt: null,
      product: null,
    } as unknown as Awaited<ReturnType<typeof getProductAiJob>>);
    vi.mocked(cancelProductAiJob).mockResolvedValue({
      id: 'job-db-sync-1',
      productId: 'system',
      status: 'cancelled',
      type: 'db_sync',
      jobType: 'db_sync',
      payload: {},
      result: null,
      errorMessage: null,
      createdAt: '2026-02-10T10:00:00.000Z',
      updatedAt: '2026-02-10T10:00:10.000Z',
      startedAt: '2026-02-10T10:00:01.000Z',
      finishedAt: '2026-02-10T10:00:10.000Z',
      completedAt: '2026-02-10T10:00:10.000Z',
    } as unknown as Awaited<ReturnType<typeof cancelProductAiJob>>);

    const req = new NextRequest(
      'http://localhost/api/databases/engine/operations/jobs/job-db-sync-1/cancel',
      {
        method: 'POST',
      }
    );

    const res = await POST_CANCEL(req, {
      params: Promise.resolve({ jobId: 'job-db-sync-1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(cancelProductAiJob).toHaveBeenCalledWith('job-db-sync-1');
    expect(body.success).toBe(true);
    expect(body.job).toMatchObject({ id: 'job-db-sync-1', status: 'cancelled' });
  });

  it('POST /api/databases/engine/operations/jobs/[jobId]/cancel returns forbidden when cancellation is disabled', async () => {
    vi.mocked(getDatabaseEngineOperationControls).mockResolvedValue({
      allowManualFullSync: true,
      allowManualCollectionSync: true,
      allowManualBackfill: true,
      allowManualBackupRunNow: true,
      allowManualBackupMaintenance: true,
      allowBackupSchedulerTick: true,
      allowOperationJobCancellation: false,
    });

    const req = new NextRequest(
      'http://localhost/api/databases/engine/operations/jobs/job-db-sync-1/cancel',
      {
        method: 'POST',
      }
    );
    const res = await POST_CANCEL(req, {
      params: Promise.resolve({ jobId: 'job-db-sync-1' }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('disabled by Database Engine controls');

    expect(getProductAiJob).not.toHaveBeenCalled();
    expect(cancelProductAiJob).not.toHaveBeenCalled();
  });
});
