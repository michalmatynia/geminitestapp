import { BatchCountResult } from '@/shared/contracts/base';
import type {
  MongoSettingDoc,
  MongoUserPreferencesDoc,
  MongoSystemLogDoc,
  MongoFileUploadEventDoc,
  MongoAiConfigurationDoc,
} from '../database-sync-types';
import type { DatabaseSyncHandler } from './types';
import type { Prisma } from '@prisma/client';

type MongoRecordWithStringId<TDoc> = Omit<TDoc, '_id'> & { _id: string };

type SettingSeed = {
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
};

type UserPreferencesSeed = {
  id: string;
  userId: string;
  productListNameLocale: string | null;
  productListCatalogFilter: string | null;
  productListCurrencyCode: string | null;
  productListPageSize: number | null;
  productListThumbnailSource: string | null;
  aiPathsActivePathId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type SystemLogSeed = {
  id?: string;
  level: string;
  message: string;
  source: string | null;
  context: unknown;
  stack: string | null;
  path: string | null;
  method: string | null;
  statusCode: number | null;
  requestId: string | null;
  userId: string | null;
  createdAt: Date;
};

type FileUploadEventSeed = {
  id: string;
  status: 'error' | 'success';
  category: string | null;
  projectId: string | null;
  folder: string | null;
  filename: string | null;
  filepath: string | null;
  mimetype: string | null;
  size: number | null;
  source: string | null;
  errorMessage: string | null;
  requestId: string | null;
  userId: string | null;
  meta: unknown;
  createdAt: Date;
};

type AiConfigurationSeed = {
  id: string;
  type: string | null;
  descriptionGenerationModel: string | null;
  generationInputPrompt: string | null;
  generationOutputEnabled: boolean;
  generationOutputPrompt: string | null;
  imageAnalysisModel: string | null;
  visionInputPrompt: string | null;
  visionOutputEnabled: boolean;
  visionOutputPrompt: string | null;
  testProductId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type SettingRow = SettingSeed;
type UserPreferencesRow = UserPreferencesSeed;
type SystemLogRow = {
  id: string;
  level: string;
  message: string;
  source: string | null;
  context: unknown;
  stack: string | null;
  path: string | null;
  method: string | null;
  statusCode: number | null;
  requestId: string | null;
  userId: string | null;
  createdAt: Date;
};
type FileUploadEventRow = {
  id: string;
  status: string;
  category: string | null;
  projectId: string | null;
  folder: string | null;
  filename: string | null;
  filepath: string | null;
  mimetype: string | null;
  size: number | null;
  source: string | null;
  errorMessage: string | null;
  requestId: string | null;
  userId: string | null;
  meta: unknown;
  createdAt: Date;
};
type AiConfigurationRow = AiConfigurationSeed;

export const syncSettings: DatabaseSyncHandler = async ({ mongo, prisma, toDate }) => {
  const docs = (await mongo.collection('settings').find({}).toArray()) as MongoSettingDoc[];
  const byKey = new Map<string, SettingSeed>();
  docs.forEach((doc: MongoSettingDoc) => {
    const key = doc.key ?? doc._id?.toString() ?? '';
    if (!key) return;
    const value = doc.value;
    const entry = {
      key,
      value: typeof value === 'string' ? value : JSON.stringify(value ?? ''),
      createdAt: toDate(doc.createdAt) ?? new Date(),
      updatedAt: toDate(doc.updatedAt) ?? new Date(),
    };
    const existing = byKey.get(key);
    if (!existing || entry.updatedAt > existing.updatedAt) {
      byKey.set(key, entry);
    }
  });
  const data = Array.from(byKey.values());
  const deleted = (await prisma.setting.deleteMany()) as BatchCountResult;
  const created: BatchCountResult = data.length
    ? ((await prisma.setting.createMany({
      data: data as Prisma.SettingCreateManyInput[],
      skipDuplicates: true,
    })) as BatchCountResult)
    : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

export const syncUserPreferences: DatabaseSyncHandler = async ({ mongo, prisma, normalizeId, toDate }) => {
  const existingUsers = (await prisma.user.findMany({
    select: { id: true },
  })) as Array<{ id: string }>;
  const existingUserIds = new Set<string>(
    existingUsers.map((entry) => entry.id)
  );
  const docs: MongoUserPreferencesDoc[] = (await mongo
    .collection('user_preferences')
    .find({})
    .toArray()) as MongoUserPreferencesDoc[];
  const data = docs
    .map((doc): UserPreferencesSeed | null => {
      const id = normalizeId(doc as Record<string, unknown>);
      const userId = doc.userId;
      if (!userId || !existingUserIds.has(userId)) return null;
      return {
        id: id || userId,
        userId,
        productListNameLocale: doc.productListNameLocale ?? null,
        productListCatalogFilter: doc.productListCatalogFilter ?? null,
        productListCurrencyCode: doc.productListCurrencyCode ?? null,
        productListPageSize: doc.productListPageSize ?? null,
        productListThumbnailSource: doc.productListThumbnailSource ?? null,
        aiPathsActivePathId: doc.aiPathsActivePathId ?? null,
        createdAt: toDate(doc.createdAt) ?? new Date(),
        updatedAt: toDate(doc.updatedAt) ?? new Date(),
      };
    })
    .filter((item): item is UserPreferencesSeed => item !== null);
  const deleted = (await prisma.userPreferences.deleteMany()) as BatchCountResult;
  const created: BatchCountResult = data.length
    ? ((await prisma.userPreferences.createMany({
      data: data as Prisma.UserPreferencesCreateManyInput[],
    })) as BatchCountResult)
    : { count: 0 };
  return {
    sourceCount: data.length,
    targetDeleted: deleted.count,
    targetInserted: created.count,
    warnings: [
      'Mongo-only user preference fields (adminMenuCollapsed, adminMenuFavorites, adminMenuSectionColors, adminMenuCustomEnabled, adminMenuCustomNav, cms*) are not stored in Prisma.',
    ],
  };
};

export const syncSystemLogs: DatabaseSyncHandler = async ({
  mongo,
  prisma,
  normalizeId,
  toDate,
  toJsonValue,
}) => {
  const docs: MongoSystemLogDoc[] = (await mongo
    .collection('system_logs')
    .find({})
    .toArray()) as MongoSystemLogDoc[];
  const data = docs
    .map((doc): SystemLogSeed => {
      const id = normalizeId(doc as Record<string, unknown>);
      return {
        ...(id ? { id } : null),
        level: doc.level ?? 'error',
        message: doc.message ?? '',
        source: doc.source ?? null,
        context: toJsonValue(doc.context ?? null) as Prisma.InputJsonValue,
        stack: doc.stack ?? null,
        path: doc.path ?? null,
        method: doc.method ?? null,
        statusCode: doc.statusCode ?? null,
        requestId: doc.requestId ?? null,
        userId: doc.userId ?? null,
        createdAt: toDate(doc.createdAt) ?? new Date(),
      };
    })
    .filter((item): item is SystemLogSeed => item !== null);
  const deleted = (await prisma.systemLog.deleteMany()) as BatchCountResult;
  const created: BatchCountResult = data.length
    ? ((await prisma.systemLog.createMany({
      data: data as Prisma.SystemLogCreateManyInput[],
    })) as BatchCountResult)
    : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

export const syncFileUploadEvents: DatabaseSyncHandler = async ({
  mongo,
  prisma,
  normalizeId,
  toDate,
  toJsonValue,
}) => {
  const docs: MongoFileUploadEventDoc[] = (await mongo
    .collection('file_upload_events')
    .find({})
    .toArray()) as MongoFileUploadEventDoc[];
  const warnings: string[] = [];
  const data = docs
    .map((doc): FileUploadEventSeed | null => {
      const id = normalizeId(doc as Record<string, unknown>);
      if (!id) return null;
      const status = doc.status;
      const resolvedStatus = status === 'error' || status === 'success' ? status : 'success';
      if (status && resolvedStatus !== status) {
        warnings.push(`File upload event ${id}: invalid status ${status}`);
      }
      return {
        id,
        status: resolvedStatus,
        category: doc.category ?? null,
        projectId: doc.projectId ?? null,
        folder: doc.folder ?? null,
        filename: doc.filename ?? null,
        filepath: doc.filepath ?? null,
        mimetype: doc.mimetype ?? null,
        size: typeof doc.size === 'number' ? doc.size : null,
        source: doc.source ?? null,
        errorMessage: doc.errorMessage ?? null,
        requestId: doc.requestId ?? null,
        userId: doc.userId ?? null,
        meta: toJsonValue(doc.meta ?? null) as Prisma.InputJsonValue,
        createdAt: toDate(doc.createdAt) ?? new Date(),
      };
    })
    .filter((item): item is FileUploadEventSeed => item !== null);
  const deleted = (await prisma.fileUploadEvent.deleteMany()) as BatchCountResult;
  const created: BatchCountResult = data.length
    ? ((await prisma.fileUploadEvent.createMany({
      data: data as Prisma.FileUploadEventCreateManyInput[],
    })) as BatchCountResult)
    : { count: 0 };
  return {
    sourceCount: data.length,
    targetDeleted: deleted.count,
    targetInserted: created.count,
    ...(warnings.length ? { warnings } : null),
  };
};

export const syncAiConfigurations: DatabaseSyncHandler = async ({ mongo, prisma, normalizeId, toDate }) => {
  const docs: MongoAiConfigurationDoc[] = (await mongo
    .collection('ai_configurations')
    .find({})
    .toArray()) as MongoAiConfigurationDoc[];
  const data = docs
    .map((doc): AiConfigurationSeed | null => {
      const id = normalizeId(doc as Record<string, unknown>);
      if (!id) return null;
      return {
        id,
        type: doc.type ?? null,
        descriptionGenerationModel: doc.descriptionGenerationModel ?? null,
        generationInputPrompt: doc.generationInputPrompt ?? null,
        generationOutputEnabled: Boolean(doc.generationOutputEnabled),
        generationOutputPrompt: doc.generationOutputPrompt ?? null,
        imageAnalysisModel: doc.imageAnalysisModel ?? null,
        visionInputPrompt: doc.visionInputPrompt ?? null,
        visionOutputEnabled: Boolean(doc.visionOutputEnabled),
        visionOutputPrompt: doc.visionOutputPrompt ?? null,
        testProductId: doc.testProductId ?? null,
        createdAt: toDate(doc.createdAt) ?? new Date(),
        updatedAt: toDate(doc.updatedAt) ?? new Date(),
      };
    })
    .filter((item): item is AiConfigurationSeed => item !== null);
  const deleted = (await prisma.aiConfiguration.deleteMany()) as BatchCountResult;
  const created: BatchCountResult = data.length
    ? ((await prisma.aiConfiguration.createMany({
      data: data as Prisma.AiConfigurationCreateManyInput[],
    })) as BatchCountResult)
    : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

// --- Prisma to Mongo handlers ---

export const syncSettingsPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = (await prisma.setting.findMany()) as SettingRow[];
  const docs: MongoRecordWithStringId<MongoSettingDoc>[] = rows.map((row) => ({
    _id: row.key,
    key: row.key,
    value: row.value,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection<MongoRecordWithStringId<MongoSettingDoc>>('settings');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncUserPreferencesPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = (await prisma.userPreferences.findMany()) as UserPreferencesRow[];
  const docs: MongoRecordWithStringId<MongoUserPreferencesDoc>[] = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    userId: row.userId,
    productListNameLocale: row.productListNameLocale ?? null,
    productListCatalogFilter: row.productListCatalogFilter ?? null,
    productListCurrencyCode: row.productListCurrencyCode ?? null,
    productListPageSize: row.productListPageSize ?? null,
    productListThumbnailSource: row.productListThumbnailSource ?? null,
    aiPathsActivePathId: row.aiPathsActivePathId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection<MongoRecordWithStringId<MongoUserPreferencesDoc>>(
    'user_preferences'
  );
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncSystemLogsPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = (await prisma.systemLog.findMany()) as SystemLogRow[];
  const docs: MongoRecordWithStringId<MongoSystemLogDoc>[] = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    level: row.level,
    message: row.message,
    source: row.source ?? null,
    context: (row.context as Record<string, unknown> | null | undefined) ?? null,
    stack: row.stack ?? null,
    path: row.path ?? null,
    method: row.method ?? null,
    statusCode: row.statusCode ?? null,
    requestId: row.requestId ?? null,
    userId: row.userId ?? null,
    createdAt: row.createdAt,
  }));
  const collection = mongo.collection<MongoRecordWithStringId<MongoSystemLogDoc>>('system_logs');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncFileUploadEventsPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = (await prisma.fileUploadEvent.findMany()) as FileUploadEventRow[];
  const docs: MongoRecordWithStringId<MongoFileUploadEventDoc>[] = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    status: row.status,
    category: row.category ?? null,
    projectId: row.projectId ?? null,
    folder: row.folder ?? null,
    filename: row.filename ?? null,
    filepath: row.filepath ?? null,
    mimetype: row.mimetype ?? null,
    size: row.size ?? 0,
    source: row.source ?? null,
    errorMessage: row.errorMessage ?? null,
    requestId: row.requestId ?? null,
    userId: row.userId ?? null,
    meta: row.meta ?? null,
    createdAt: row.createdAt,
  }));
  const collection = mongo.collection<MongoRecordWithStringId<MongoFileUploadEventDoc>>(
    'file_upload_events'
  );
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncAiConfigurationsPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = (await prisma.aiConfiguration.findMany()) as AiConfigurationRow[];
  const docs: MongoRecordWithStringId<MongoAiConfigurationDoc>[] = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    type: row.type ?? null,
    descriptionGenerationModel: row.descriptionGenerationModel ?? null,
    generationInputPrompt: row.generationInputPrompt ?? null,
    generationOutputEnabled: row.generationOutputEnabled,
    generationOutputPrompt: row.generationOutputPrompt ?? null,
    imageAnalysisModel: row.imageAnalysisModel ?? null,
    visionInputPrompt: row.visionInputPrompt ?? null,
    visionOutputEnabled: row.visionOutputEnabled,
    visionOutputPrompt: row.visionOutputPrompt ?? null,
    testProductId: row.testProductId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection<MongoRecordWithStringId<MongoAiConfigurationDoc>>(
    'ai_configurations'
  );
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};
