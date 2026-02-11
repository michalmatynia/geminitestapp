export const runtime = 'nodejs';

import { promises as fs } from 'fs';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

import {
  pgBackupsDir,
  ensurePgBackupsDir,
  mongoBackupsDir,
  ensureMongoBackupsDir,
} from '@/features/database/server';
import { assertDatabaseEngineManageAccess } from '@/features/database/services/database-engine-access';
import type { DatabaseBackupFileDto as DatabaseInfo } from '@/shared/dtos/database';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

async function getBackups(type: 'postgresql' | 'mongodb'): Promise<DatabaseInfo[]> {
  const backupsDir = type === 'mongodb' ? mongoBackupsDir : pgBackupsDir;
  const ensureDir =
    type === 'mongodb' ? ensureMongoBackupsDir : ensurePgBackupsDir;
  const extension = type === 'mongodb' ? '.archive' : '.dump';

  await ensureDir();
  const logPath = path.join(backupsDir, 'restore-log.json');

  let logData: Record<string, string> = {};
  try {
    const logFile = await fs.readFile(logPath, 'utf-8');
    logData = JSON.parse(logFile) as Record<string, string>;
  } catch (_error) {
    // No log yet.
  }

  const files = await fs.readdir(backupsDir);
  const backupFiles = files.filter((file: string) => file.endsWith(extension));

  const backups = await Promise.all(
    backupFiles.map(async (file: string) => {
      const filePath = path.join(backupsDir, file);
      const stats = await fs.stat(filePath);
      return {
        name: file,
        size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
        created: stats.birthtime.toLocaleString(),
        createdAt: stats.birthtime.toISOString(),
        lastModified: stats.mtime.toLocaleString(),
        lastModifiedAt: stats.mtime.toISOString(),
        lastRestored: logData[file]
          ? new Date(logData[file]).toLocaleString()
          : undefined,
      };
    })
  );

  return backups;
}

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertDatabaseEngineManageAccess();

  const { searchParams } = new URL(req.url);
  const type = (searchParams.get('type') as 'postgresql' | 'mongodb') || 'postgresql';

  const backups = await getBackups(type);
  return NextResponse.json(backups);
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: 'databases.backups.GET' });
