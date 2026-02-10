export const runtime = 'nodejs';

import fs from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

import {
  pgBackupsDir,
  ensurePgBackupsDir,
  assertValidPgBackupName,
  mongoBackupsDir,
  ensureMongoBackupsDir,
  assertValidMongoBackupName,
} from '@/features/database/server';
import { badRequestError, forbiddenError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  if (process.env['NODE_ENV'] === 'production') {
    throw forbiddenError('Database backups are disabled in production.');
  }
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const type = formData.get('type') as string | null;

  if (!file) {
    throw badRequestError('No file provided');
  }

  const dbType = type === 'mongodb' ? 'mongodb' : 'postgresql';
  const backupsDir =
    dbType === 'mongodb' ? mongoBackupsDir : pgBackupsDir;
  if (dbType === 'mongodb') {
    assertValidMongoBackupName(file.name);
    await ensureMongoBackupsDir();
  } else {
    assertValidPgBackupName(file.name);
    await ensurePgBackupsDir();
  }

  const backupPath = path.join(backupsDir, file.name);
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  await fs.writeFile(backupPath, fileBuffer);

  return NextResponse.json({ message: 'Backup uploaded' });
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'databases.upload.POST' });
