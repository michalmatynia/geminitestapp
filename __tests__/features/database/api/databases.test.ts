/**
 * @vitest-environment node
 */

import { Stats } from 'fs';
import fs from 'fs/promises';

import { NextRequest } from 'next/server';
import { vi, Mock } from 'vitest';

import { POST as POST_BACKUP } from '@/app/api/databases/backup/route';
import { GET as GET_BACKUPS } from '@/app/api/databases/backups/route';
import { POST as POST_DELETE } from '@/app/api/databases/delete/route';
import { POST as POST_RESTORE } from '@/app/api/databases/restore/route';
import { POST as POST_UPLOAD } from '@/app/api/databases/upload/route';
import { auth } from '@/features/auth/server';
import { execFileAsync } from '@/shared/lib/db/utils/postgres';
import {
  enqueueProductAiJob,
  enqueueProductAiJobToQueue,
  startProductAiJobQueue,
} from '@/features/jobs/server';
import { getDatabaseEngineOperationControls } from '@/shared/lib/db/database-engine-policy';
import prisma from '@/shared/lib/db/prisma';

vi.mock('@/shared/lib/db/utils/postgres', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/db/utils/postgres')>();
  return {
    ...actual,
    execFileAsync: vi.fn().mockResolvedValue({ stdout: 'stdout', stderr: 'stderr' }),
  };
});

vi.mock('@/features/jobs/server', () => ({
  enqueueProductAiJob: vi.fn(),
  enqueueProductAiJobToQueue: vi.fn(),
  startProductAiJobQueue: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/shared/lib/db/database-engine-policy', () => ({
  getDatabaseEngineOperationControls: vi.fn(),
}));

describe('Databases API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: 'user-1',
        isElevated: true,
        permissions: ['settings.manage'],
      },
    } as unknown as Awaited<ReturnType<typeof auth>>);
    vi.mocked(getDatabaseEngineOperationControls).mockResolvedValue({
      allowManualFullSync: true,
      allowManualCollectionSync: true,
      allowManualBackfill: true,
      allowManualBackupRunNow: true,
      allowManualBackupMaintenance: true,
      allowBackupSchedulerTick: true,
      allowOperationJobCancellation: true,
    });
    (execFileAsync as Mock).mockResolvedValue({ stdout: 'stdout', stderr: 'stderr' });
    vi.mocked(enqueueProductAiJob).mockResolvedValue({
      id: 'job-backup-1',
      productId: 'system',
      status: 'pending',
      type: 'db_backup',
      payload: {},
      result: null,
      errorMessage: null,
      error: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      startedAt: null,
      finishedAt: null,
      completedAt: null,
    });
    vi.mocked(enqueueProductAiJobToQueue).mockResolvedValue(undefined);
    vi.mocked(startProductAiJobQueue).mockImplementation(() => {});
    process.env['DATABASE_URL'] = 'postgresql://localhost:5432/test';
    vi.mocked(prisma.$queryRaw).mockResolvedValue([]);
    vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(0);
  });

  afterAll(() => {
    delete process.env['DATABASE_URL'];
  });

  describe('POST /api/databases/backup', () => {
    it('should enqueue a database backup job', async () => {
      const res = await POST_BACKUP(
        new NextRequest('http://localhost/api/databases/backup?type=postgresql', { method: 'POST' })
      );
      const payload = await res.json();

      expect(res.status).toEqual(200);
      expect(payload).toMatchObject({
        success: true,
        jobId: 'job-backup-1',
      });
      expect(enqueueProductAiJob).toHaveBeenCalledWith(
        'system',
        'db_backup',
        expect.objectContaining({
          dbType: 'postgresql',
          entityType: 'system',
          source: 'db_backup',
        })
      );
      expect(startProductAiJobQueue).toHaveBeenCalledTimes(1);
      expect(enqueueProductAiJobToQueue).toHaveBeenCalledWith(
        'job-backup-1',
        'system',
        'db_backup',
        expect.any(Object)
      );
    });
  });

  describe('POST /api/databases/restore', () => {
    it('should restore a database from a backup', async () => {
      vi.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
      vi.spyOn(fs, 'readFile').mockResolvedValueOnce('{}');

      const res = await POST_RESTORE(
        new NextRequest('http://localhost/api/databases/restore', {
          method: 'POST',
          body: JSON.stringify({
            backupName: 'test-backup.dump',
          }),
        })
      );
      expect(res.status).toEqual(200);
      expect(execFileAsync).toHaveBeenCalledTimes(1);
      expect(fs.writeFile).toHaveBeenCalledTimes(2);
    });

    it('should reject restore when backup maintenance is disabled', async () => {
      vi.mocked(getDatabaseEngineOperationControls).mockResolvedValue({
        allowManualFullSync: true,
        allowManualCollectionSync: true,
        allowManualBackfill: true,
        allowManualBackupRunNow: true,
        allowManualBackupMaintenance: false,
        allowBackupSchedulerTick: true,
        allowOperationJobCancellation: true,
      });

      const res = await POST_RESTORE(
        new NextRequest('http://localhost/api/databases/restore', {
          method: 'POST',
          body: JSON.stringify({
            backupName: 'test-backup.dump',
          }),
        })
      );

      expect(res.status).toEqual(403);
      expect(execFileAsync).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/databases/backups', () => {
    it('should return a list of backups', async () => {
      (vi.spyOn(fs, 'readdir') as Mock).mockResolvedValue([
        'stardb-backup-123.dump',
        'restore-log.json',
      ]);
      vi.spyOn(fs, 'readFile').mockResolvedValue('{}');
      vi.spyOn(fs, 'stat').mockResolvedValue({
        size: 1024,
        birthtime: new Date(),
        mtime: new Date(),
      } as unknown as Stats);

      const res = await GET_BACKUPS(
        new NextRequest('http://localhost/api/databases/backups?type=postgresql')
      );
      const backups = (await res.json()) as { name: string }[];
      expect(res.status).toEqual(200);
      expect(backups.length).toEqual(1);
      expect(backups[0]!.name).toEqual('stardb-backup-123.dump');
    });
  });

  describe('POST /api/databases/upload', () => {
    it('should upload a database backup file', async () => {
      vi.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
      const formData = new FormData();
      const blob = new Blob(['test content'], { type: 'application/octet-stream' });
      formData.append('file', blob, 'test.dump');

      const res = await POST_UPLOAD(
        new NextRequest('http://localhost/api/databases/upload', {
          method: 'POST',
          body: formData,
        })
      );
      expect(res.status).toEqual(200);
      expect(fs.writeFile).toHaveBeenCalledTimes(1);
    });

    it('should reject an invalid file type', async () => {
      const formData = new FormData();
      const blob = new Blob(['test content'], { type: 'text/plain' });
      formData.append('file', blob, 'test.txt');

      const res = await POST_UPLOAD(
        new NextRequest('http://localhost/api/databases/upload', {
          method: 'POST',
          body: formData,
        })
      );
      expect(res.status).toEqual(400);
    });
  });

  describe('POST /api/databases/delete', () => {
    it('should delete a database backup file', async () => {
      vi.spyOn(fs, 'unlink').mockResolvedValue(undefined);

      const res = await POST_DELETE(
        new NextRequest('http://localhost/api/databases/delete', {
          method: 'POST',
          body: JSON.stringify({ backupName: 'test.dump' }),
        })
      );
      expect(res.status).toEqual(200);
      expect(fs.unlink).toHaveBeenCalledTimes(1);
    });
  });
});
