import path from 'path';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  mongoBackupsDir,
  ensureMongoBackupsDir,
  assertValidMongoBackupName,
  getMongoConnectionUrl,
  getMongoDatabaseName,
  getMongoRestoreCommand,
  mongoExecFileAsync,
} from '@/features/database/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, internalError } from '@/shared/errors/app-error';
import { parseObjectJsonBody } from '@/shared/lib/api/parse-json';
import { getMongoClient } from '@/shared/lib/db/mongo-client';
import { assertDatabaseEngineManageAccess } from '@/shared/lib/db/services/database-engine-access';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export async function postDatabasesPreviewHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  await assertDatabaseEngineManageAccess();

  const parsed = await parseObjectJsonBody(req, {
    logPrefix: 'databases.preview',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const body = z
    .object({
      backupName: z.string().optional(),
      mode: z.enum(['backup', 'current']).optional(),
      type: z.enum(['mongodb']).optional(),
      page: z.number().optional(),
      pageSize: z.number().optional(),
    })
    .parse(parsed.data);

  const previewMode = body.mode === 'current' ? 'current' : 'backup';
  const previewType = body.type ?? 'mongodb';
  const backupName = body.backupName;

  if (previewType !== 'mongodb') {
    throw badRequestError('Only MongoDB previews are supported.');
  }
  if (previewMode === 'backup' && !backupName) {
    throw badRequestError('Backup name is required');
  }
  if (previewMode === 'backup') {
    assertValidMongoBackupName(backupName ?? '');
    await ensureMongoBackupsDir();
  }

  const mongoUri = getMongoConnectionUrl();
  const sourceDbName = getMongoDatabaseName();
  const previewDb = previewMode === 'backup' ? `stardb_preview_${Date.now()}` : sourceDbName;
  const page = Math.max(1, Number.isFinite(body.page) ? Number(body.page) : 1);
  const pageSize = Math.min(
    200,
    Math.max(1, Number.isFinite(body.pageSize) ? Number(body.pageSize) : 20)
  );
  const offset = (page - 1) * pageSize;

  if (previewMode === 'backup') {
    const backupPath = path.join(mongoBackupsDir, backupName ?? '');
    try {
      await mongoExecFileAsync(getMongoRestoreCommand(), [
        '--uri',
        mongoUri,
        '--archive=' + backupPath,
        '--gzip',
        '--nsFrom',
        `${sourceDbName}.*`,
        '--nsTo',
        `${previewDb}.*`,
        '--drop',
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw internalError(`Failed to inspect backup: ${message}`);
    }
  }

  const mongoClient = await getMongoClient();
  const db = mongoClient.db(previewDb);
  let collections: string[] = [];
  let tableRows: { name: string; rows: Record<string, unknown>[]; totalRows: number }[] = [];
  let tableStats: { name: string; rowEstimate: number }[] = [];

  try {
    const collectionInfos = await db.listCollections().toArray();
    collections = collectionInfos.map((info: { name: string }) => info.name);

    tableRows = await Promise.all(
      collections.map(async (collectionName: string) => {
        const collection = db.collection(collectionName);
        const totalRows = await collection.countDocuments();
        const rows = await collection.find({}).skip(offset).limit(pageSize).toArray();
        return { name: collectionName, rows: rows as Record<string, unknown>[], totalRows };
      })
    );

    tableStats = await Promise.all(
      collections.map(async (collectionName: string) => {
        const collection = db.collection(collectionName);
        const estimate = await collection.estimatedDocumentCount();
        return { name: collectionName, rowEstimate: estimate };
      })
    );
  } finally {
    if (previewMode === 'backup') {
      try {
        await db.dropDatabase();
      } catch (error) {
        void ErrorSystem.captureException(error, {
          service: 'api/databases/preview',
          stage: 'cleanup-preview-db',
          previewDb,
        });
      }
    }
  }

  return NextResponse.json({
    stats: {
      tables: tableStats,
      groups: collections.length > 0 ? { COLLECTION: collections } : {},
    },
    data: tableRows,
    page,
    pageSize,
  });
}
