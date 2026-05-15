/**
 * Database Preview Handler
 * 
 * Provides an API endpoint to preview the contents, structure, and statistics
 * of MongoDB databases and their collections.
 * 
 * Features:
 * - Backup Preview: Restores a MongoDB backup to a temporary preview database for inspection.
 * - Current Database Preview: Connects to the current live database for real-time inspection.
 * - Table Metadata: Calculates row estimates, collection sizes, and schema details.
 * - Paged Data Access: Provides paged access to collection documents for efficient previewing.
 * 
 * NOTE: This module interacts extensively with the dynamic MongoDB driver. 
 * Many linting violations (no-unsafe-member-access, no-unsafe-call) are due to 
 * the dynamic nature of BSON documents and driver responses, and are 
 * treated as accepted technical debt.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { MongoClient, type Db } from 'mongodb';

import {
  databaseEngineManagedMongoApplicationSchema,
  mongoSourceSchema,
} from '@/shared/contracts/database';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, internalError } from '@/shared/errors/app-error';
import { parseObjectJsonBody } from '@/shared/lib/api/parse-json';
import { assertDatabaseEngineManageAccess } from '@/features/database/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import {
  mongoExecFileAsync,
  getMongoRestoreCommand,
  resolveMongoBackupPath,
  assertValidMongoBackupName,
  ensureMongoBackupsDir,
} from '@/shared/lib/db/services/database-backup-scheduler';
import {
  getDatabaseSizeFormatted,
  getCollectionSizeFormatted,
  getCollectionIndexes,
  createManagedMongoClient,
  resolvePreviewTarget,
} from '@/features/database/server/utils';

// ... (existing helper functions getFieldType and buildTableDetail remain)

/**
 * Executes a Mongo restore command for backup preview.
 */
async function restoreBackupToPreview(
  backupName: string,
  mongoUri: string,
  sourceDbName: string,
  previewDb: string
): Promise<void> {
  const backupPath = await resolveMongoBackupPath(backupName);
  try {
    await mongoExecFileAsync(getMongoRestoreCommand(), [
      '--uri',
      mongoUri,
      `--archive=${backupPath}`,
      '--gzip',
      '--nsFrom',
      `${sourceDbName}.*`,
      '--nsTo',
      `${previewDb}.*`,
      '--drop',
    ]);
  } catch (error) {
    void ErrorSystem.captureException(error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw internalError(`Failed to inspect backup: ${message}`);
  }
}

export async function postDatabasesPreviewHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  await assertDatabaseEngineManageAccess();

  const parsed = await parseObjectJsonBody(req, {
    logPrefix: 'database-engine-web.databases.preview',
  });
  if (!parsed.ok) return parsed.response;

   
  const body = z
    .object({
      backupName: z.string().optional(),
      mode: z.enum(['backup', 'current']).optional(),
      type: z.enum(['mongodb']).optional(),
      page: z.number().optional(),
      pageSize: z.number().optional(),
      application: databaseEngineManagedMongoApplicationSchema.optional(),
      source: mongoSourceSchema.optional(),
    })
    .parse(parsed.data);

  const previewMode = body.mode === 'current' ? 'current' : 'backup';
  if (body.type !== 'mongodb') throw badRequestError('Only MongoDB previews are supported.');

  if (previewMode === 'backup') {
    if (!body.backupName) throw badRequestError('Backup name is required');
    assertValidMongoBackupName(body.backupName);
    await ensureMongoBackupsDir();
  }

  const requestedApplication = body.application;
  const requestedSource = body.source ?? 'local';
  const usesManagedCurrent = previewMode === 'current' && requestedApplication !== undefined;
  
   
  const target = usesManagedCurrent ? null : resolvePreviewTarget(previewMode, body.backupName ?? '');
  const mongoUri = (target as any)?.mongoUri ?? '';
  const sourceDbName = (target as any)?.sourceDbName ?? '';
  const previewDb = previewMode === 'backup' ? `stardb_preview_${Date.now()}` : sourceDbName;

  if (previewMode === 'backup') {
    await restoreBackupToPreview(body.backupName ?? '', mongoUri, sourceDbName, previewDb);
  }

  const managedMongo = usesManagedCurrent && requestedApplication
      ? await createManagedMongoClient(requestedApplication, requestedSource)
      : null;
  const mongoClient = managedMongo?.client ?? new MongoClient(mongoUri);
  
  if (managedMongo === null) await mongoClient.connect();
  const db: Db = managedMongo?.db ?? mongoClient.db(previewDb);
  
  try {
    const collectionInfos = await db.listCollections().toArray();
    const collections = collectionInfos.map((i) => i.name).sort();

    const [databaseSize, tableRows, tableStats] = await Promise.all([
      getDatabaseSizeFormatted(db),
      Promise.all(collections.map(async (name) => {
        const coll = db.collection(name);
        const [totalRows, rows] = await Promise.all([
            coll.countDocuments(),
            coll.find({}).skip((Math.max(1, body.page ?? 1) - 1) * (body.pageSize ?? 20)).limit(body.pageSize ?? 20).toArray()
        ]);
        return { name, rows: rows as Record<string, unknown>[], totalRows };
      })),
      Promise.all(collections.map(async (name) => {
        const coll = db.collection(name);
        const [estimate, size] = await Promise.all([
          coll.estimatedDocumentCount(),
          getCollectionSizeFormatted(db, name),
        ]);
        return { name, rowEstimate: estimate, sizeFormatted: size };
      })),
    ]);

    const tableDetails = await Promise.all(collections.map(async (name) => {
        const coll = db.collection(name);
        const [sample, indexes] = await Promise.all([
            coll.find({}).limit(10).toArray() as Promise<Record<string, unknown>[]>,
            getCollectionIndexes(coll),
        ]);
        const stats = tableStats.find((t) => t.name === name);
        return buildTableDetail(name, sample, indexes, stats?.rowEstimate ?? 0, stats?.sizeFormatted ?? 'n/a');
    }));

    return NextResponse.json({
        stats: { tables: tableStats, groups: collections.length > 0 ? { COLLECTION: collections } : {} },
        data: tableRows,
        tableDetails,
        databaseSize,
        page: Math.max(1, body.page ?? 1),
    });
  } finally {
    if (previewMode === 'backup') {
      try {
        await db.dropDatabase();
      } catch (error) {
        void ErrorSystem.captureException(error);
      }
    }
    await mongoClient.close();
  }
}
