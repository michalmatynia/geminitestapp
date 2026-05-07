import { type NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { z } from 'zod';

import {
  databaseEngineManagedMongoApplicationSchema,
  mongoSourceSchema,
  type DatabaseColumnInfo,
  type DatabaseTableDetail,
  type MongoSource,
  type DatabaseEngineManagedMongoApplication,
} from '@/shared/contracts/database';
import {
  ensureMongoBackupsDir,
  assertValidMongoBackupName,
  getMongoBackupApplication,
  getMongoConnectionUrl,
  getMongoDatabaseName,
  getMongoRestoreCommand,
  getCmsBuilderMongoConnectionUrl,
  getCmsBuilderMongoDatabaseName,
  getStudiqMongoConnectionUrl,
  getStudiqMongoDatabaseName,
  mongoExecFileAsync,
  resolveMongoBackupPath,
} from '@/features/database/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, internalError } from '@/shared/errors/app-error';
import { parseObjectJsonBody } from '@/shared/lib/api/parse-json';
import { assertDatabaseEngineManageAccess } from '@/features/database/server';
import { createManagedMongoClient } from '@/shared/lib/db/services/managed-mongo-databases';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const resolvePreviewTarget = (
  previewMode: 'backup' | 'current',
  backupName: string | undefined
): { mongoUri: string; sourceDbName: string } => {
  if (previewMode === 'backup' && backupName) {
    const application = getMongoBackupApplication(backupName);
    if (application === 'studiq') {
      return {
        mongoUri: getStudiqMongoConnectionUrl(),
        sourceDbName: getStudiqMongoDatabaseName(),
      };
    }
    if (application === 'cms-builder') {
      return {
        mongoUri: getCmsBuilderMongoConnectionUrl(),
        sourceDbName: getCmsBuilderMongoDatabaseName(),
      };
    }
  }

  return {
    mongoUri: getMongoConnectionUrl(),
    sourceDbName: getMongoDatabaseName(),
  };
};

const getFieldType = (value: unknown): string => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  if (
    typeof value === 'object' &&
    value !== null &&
    (value as { constructor?: { name?: string } }).constructor?.name === 'ObjectId'
  ) {
    return 'ObjectId';
  }
  return typeof value;
};

const buildTableDetail = (
  collectionName: string,
  sample: Record<string, unknown>[],
  rowEstimate: number
): DatabaseTableDetail => {
  const fieldTypes = new Map<string, Set<string>>();
  for (const doc of sample) {
    for (const [key, value] of Object.entries(doc)) {
      if (!fieldTypes.has(key)) fieldTypes.set(key, new Set<string>());
      fieldTypes.get(key)?.add(getFieldType(value));
    }
  }

  const fields: DatabaseColumnInfo[] = [...fieldTypes.entries()]
    .map(([name, types]) => ({
      name,
      type: [...types].join(' | ') || 'unknown',
      nullable: types.has('null'),
      defaultValue: null,
      isPrimaryKey: name === '_id',
      isForeignKey: false,
    }))
    .sort((a, b) => {
      if (a.name === '_id') return -1;
      if (b.name === '_id') return 1;
      return a.name.localeCompare(b.name);
    });

  return {
    name: collectionName,
    columns: fields,
    indexes: [],
    foreignKeys: [],
    rowEstimate,
    sizeFormatted: '',
  };
};

export async function postDatabasesPreviewHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  await assertDatabaseEngineManageAccess();

  const parsed = await parseObjectJsonBody(req, {
    logPrefix: 'database-engine-web.databases.preview',
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
      application: databaseEngineManagedMongoApplicationSchema.optional(),
      source: mongoSourceSchema.optional(),
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

  const requestedApplication = body.application as DatabaseEngineManagedMongoApplication | undefined;
  const requestedSource = (body.source ?? 'local') as MongoSource;
  const usesManagedCurrent = previewMode === 'current' && requestedApplication !== undefined;
  const target = usesManagedCurrent ? null : resolvePreviewTarget(previewMode, backupName);
  const mongoUri = target?.mongoUri ?? '';
  const sourceDbName = target?.sourceDbName ?? '';
  const previewDb = previewMode === 'backup' ? `stardb_preview_${Date.now()}` : sourceDbName;
  const page = Math.max(1, Number.isFinite(body.page) ? Number(body.page) : 1);
  const pageSize = Math.min(
    200,
    Math.max(1, Number.isFinite(body.pageSize) ? Number(body.pageSize) : 20)
  );
  const offset = (page - 1) * pageSize;

  if (previewMode === 'backup') {
    const backupPath = await resolveMongoBackupPath(backupName ?? '');
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

  const managedMongo =
    usesManagedCurrent && requestedApplication
      ? await createManagedMongoClient(requestedApplication, requestedSource)
      : null;
  const mongoClient = managedMongo?.client ?? new MongoClient(mongoUri);
  if (managedMongo === null) {
    await mongoClient.connect();
  }
  const db = managedMongo?.db ?? mongoClient.db(previewDb);
  let collections: string[] = [];
  let tableRows: { name: string; rows: Record<string, unknown>[]; totalRows: number }[] = [];
  let tableStats: { name: string; rowEstimate: number }[] = [];
  let tableDetails: DatabaseTableDetail[] = [];

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
    tableDetails = await Promise.all(
      collections.map(async (collectionName: string) => {
        const collection = db.collection(collectionName);
        const sample = (await collection.find({}).limit(10).toArray()) as Record<string, unknown>[];
        const rowEstimate =
          tableStats.find((table) => table.name === collectionName)?.rowEstimate ?? 0;
        return buildTableDetail(collectionName, sample, rowEstimate);
      })
    );
  } finally {
    if (previewMode === 'backup') {
      try {
        await db.dropDatabase();
      } catch (error) {
        void ErrorSystem.captureException(error);
        void ErrorSystem.captureException(error, {
          service: 'api/databases/preview',
          stage: 'cleanup-preview-db',
          previewDb,
        });
      }
    }
    await mongoClient.close();
  }

  return NextResponse.json({
    stats: {
      tables: tableStats,
      groups: collections.length > 0 ? { COLLECTION: collections } : {},
    },
    data: tableRows,
    tableDetails,
    page,
    pageSize,
  });
}
