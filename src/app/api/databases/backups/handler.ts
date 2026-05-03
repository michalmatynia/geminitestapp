import { promises as fs } from 'fs';
import { join } from 'path';

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  mongoBackupsDir,
  ensureMongoBackupsDir,
} from '@/features/database/server';
import type { DatabaseBackupFile as DatabaseInfo } from '@/shared/contracts/database';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { normalizeOptionalQueryString } from '@/shared/lib/api/query-schema';
import { assertDatabaseEngineManageAccess } from '@/features/database/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const isValidDate = (value: unknown): value is Date =>
  value instanceof Date && Number.isFinite(value.getTime());

export const querySchema = z.object({
  type: z.preprocess(
    (value: unknown) => normalizeOptionalQueryString(value),
    z.enum(['mongodb']).optional()
  ),
});

async function getBackups(): Promise<DatabaseInfo[]> {
  await ensureMongoBackupsDir();

  const files = await fs.readdir(mongoBackupsDir);
  const backupFiles = files.filter((file: string) => file.endsWith('.archive'));

  const backups: DatabaseInfo[] = await Promise.all(
    backupFiles.map(async (file) => {
      const filePath = join(mongoBackupsDir, file);
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

export async function getHandler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertDatabaseEngineManageAccess();

  try {
    const backups = await getBackups();
    return NextResponse.json(backups, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    void ErrorSystem.captureException(error);
    const { ErrorSystem: SystemLogger } = await import('@/shared/lib/observability/system-logger');
    void SystemLogger.captureException(error, {
      service: 'api/databases/backups',
      type: 'mongodb',
    });
    throw error;
  }
}
