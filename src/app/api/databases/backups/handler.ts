import { promises as fs } from 'fs';
import { join } from 'path';

import { NextRequest, NextResponse } from 'next/server';

import {
  pgBackupsDir,
  ensurePgBackupsDir,
  mongoBackupsDir,
  ensureMongoBackupsDir,
} from '@/features/database/server';
import { assertDatabaseEngineManageAccess } from '@/features/database/services/database-engine-access';
import type { DatabaseBackupFileDto, DatabaseBackupFileDto as DatabaseInfo } from '@/shared/contracts/database';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const isValidDate = (value: unknown): value is Date =>
  value instanceof Date && Number.isFinite(value.getTime());

async function getBackups(type: 'postgresql' | 'mongodb'): Promise<DatabaseInfo[]> {
  const backupsDir = type === 'mongodb' ? mongoBackupsDir : pgBackupsDir;
  const ensureDir =
    type === 'mongodb' ? ensureMongoBackupsDir : ensurePgBackupsDir;
  const extension = type === 'mongodb' ? '.archive' : '.dump';

  await ensureDir();

  const files = await fs.readdir(backupsDir);
  const backupFiles = files.filter((file: string) => file.endsWith(extension));

  const backups: DatabaseBackupFileDto[] = await Promise.all(
    backupFiles.map(async (file) => {
      const filePath = join(backupsDir, file);
      const stats = await fs.stat(filePath);
      const createdAt =
        isValidDate(stats.birthtime) && stats.birthtime.getTime() > 0
          ? stats.birthtime
          : isValidDate(stats.ctime)
            ? stats.ctime
            : isValidDate(stats.mtime)
              ? stats.mtime
              : new Date();
      const lastModifiedAt = isValidDate(stats.mtime) ? stats.mtime : createdAt;
      return {
        name: file,
        size: stats.size,
        createdAt: createdAt.toISOString(),
        lastModifiedAt: lastModifiedAt.toISOString(),
      };
    })
  );

  return backups.sort((a, b) => {
    const aTs = Date.parse(a.lastModifiedAt ?? a.createdAt);
    const bTs = Date.parse(b.lastModifiedAt ?? b.createdAt);
    const safeA = Number.isFinite(aTs) ? aTs : 0;
    const safeB = Number.isFinite(bTs) ? bTs : 0;
    return safeB - safeA;
  });
}


export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertDatabaseEngineManageAccess();

  const { searchParams } = new URL(req.url);
  const type = (searchParams.get('type') as 'postgresql' | 'mongodb') || 'postgresql';

  try {
    const backups = await getBackups(type);
    return NextResponse.json(backups, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const { ErrorSystem } = await import('@/features/observability/server');
    void ErrorSystem.captureException(error, { service: 'api/databases/backups', type });
    throw error;
  }
}
