import type { Prisma } from '@prisma/client';
import type { 
  MongoSettingDoc, 
  MongoUserPreferencesDoc, 
  MongoSystemLogDoc, 
  MongoFileUploadEventDoc, 
  MongoAiConfigurationDoc 
} from '../database-sync-types';
import type { SyncHandler } from './types';

export const syncSettings: SyncHandler = async ({ mongo, prisma, toDate }) => {
  const docs = await mongo.collection('settings').find({}).toArray();
  const byKey = new Map<string, { key: string; value: string; createdAt: Date; updatedAt: Date }>();
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
  const deleted = await prisma.setting.deleteMany();
  const created = data.length ? await prisma.setting.createMany({ data, skipDuplicates: true }) : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

export const syncUserPreferences: SyncHandler = async ({ mongo, prisma, normalizeId, toDate }) => {
  const existingUserIds = new Set<string>(
    (await prisma.user.findMany({ select: { id: true } }))
      .map((entry: { id: string }) => entry.id)
  );
  const docs: MongoUserPreferencesDoc[] = (await mongo.collection('user_preferences').find({}).toArray()) as unknown as MongoUserPreferencesDoc[];
  const data = docs
    .map((doc): Prisma.UserPreferencesCreateManyInput | null => {
      const id = normalizeId(doc as unknown as Record<string, unknown>);
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
    .filter((item): item is Prisma.UserPreferencesCreateManyInput => item !== null);
  const deleted = await prisma.userPreferences.deleteMany();
  const created = data.length ? await prisma.userPreferences.createMany({ data }) : { count: 0 };
  return {
    sourceCount: data.length,
    targetDeleted: deleted.count,
    targetInserted: created.count,
    warnings: [
      'Mongo-only user preference fields (adminMenuCollapsed, adminMenuFavorites, adminMenuSectionColors, adminMenuCustomEnabled, adminMenuCustomNav, cms*) are not stored in Prisma.',
    ],
  };
};

export const syncSystemLogs: SyncHandler = async ({ mongo, prisma, normalizeId, toDate, toJsonValue }) => {
  const docs: MongoSystemLogDoc[] = (await mongo.collection('system_logs').find({}).toArray()) as unknown as MongoSystemLogDoc[];
  const data = docs
    .map((doc): Prisma.SystemLogCreateManyInput | null => {
      const id = normalizeId(doc as unknown as Record<string, unknown>);
      return {
        ...(id ? { id } : null),
        level: doc.level ?? 'error',
        message: doc.message ?? '',
        source: doc.source ?? null,
        context: toJsonValue(doc.context ?? null) as Prisma.InputJsonValue,
        stack: doc.stack ?? null,        path: doc.path ?? null,
        method: doc.method ?? null,
        statusCode: doc.statusCode ?? null,
        requestId: doc.requestId ?? null,
        userId: doc.userId ?? null,
        createdAt: toDate(doc.createdAt) ?? new Date(),
      };
    })
    .filter((item): item is Prisma.SystemLogCreateManyInput => item !== null);
  const deleted = await prisma.systemLog.deleteMany();
  const created = data.length ? await prisma.systemLog.createMany({ data }) : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

export const syncFileUploadEvents: SyncHandler = async ({ mongo, prisma, normalizeId, toDate, toJsonValue }) => {
  const docs: MongoFileUploadEventDoc[] = (await mongo.collection('file_upload_events').find({}).toArray()) as unknown as MongoFileUploadEventDoc[];
  const warnings: string[] = [];
  const data = docs
    .map((doc): Prisma.FileUploadEventCreateManyInput | null => {
      const id = normalizeId(doc as unknown as Record<string, unknown>);
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
        createdAt: toDate(doc.createdAt) ?? new Date(),      };
    })
    .filter((item): item is Prisma.FileUploadEventCreateManyInput => item !== null);
  const deleted = await prisma.fileUploadEvent.deleteMany();
  const created = data.length ? await prisma.fileUploadEvent.createMany({ data }) : { count: 0 };
  return {
    sourceCount: data.length,
    targetDeleted: deleted.count,
    targetInserted: created.count,
    ...(warnings.length ? { warnings } : null),
  };
};

export const syncAiConfigurations: SyncHandler = async ({ mongo, prisma, normalizeId, toDate }) => {
  const docs: MongoAiConfigurationDoc[] = (await mongo.collection('ai_configurations').find({}).toArray()) as unknown as MongoAiConfigurationDoc[];
  const data = docs
    .map((doc): Prisma.AiConfigurationCreateManyInput | null => {
      const id = normalizeId(doc as unknown as Record<string, unknown>);
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
    .filter((item): item is Prisma.AiConfigurationCreateManyInput => item !== null);
  const deleted = await prisma.aiConfiguration.deleteMany();
  const created = data.length ? await prisma.aiConfiguration.createMany({ data }) : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

// --- Prisma to Mongo handlers ---

export const syncSettingsPrismaToMongo: SyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.setting.findMany();
  const docs = rows.map((row) => ({
    _id: row.key,
    key: row.key,
    value: row.value,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection('settings');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
};

export const syncUserPreferencesPrismaToMongo: SyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.userPreferences.findMany();
  const docs = rows.map((row) => ({
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
  const collection = mongo.collection('user_preferences');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
};

export const syncSystemLogsPrismaToMongo: SyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.systemLog.findMany();
  const docs = rows.map((row) => ({
    _id: row.id,
    level: row.level,
    message: row.message,
    source: row.source ?? null,
    context: row.context ?? null,
    stack: row.stack ?? null,
    path: row.path ?? null,
    method: row.method ?? null,
    statusCode: row.statusCode ?? null,
    requestId: row.requestId ?? null,
    userId: row.userId ?? null,
    createdAt: row.createdAt,
  }));
  const collection = mongo.collection('system_logs');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
};

export const syncFileUploadEventsPrismaToMongo: SyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.fileUploadEvent.findMany();
  const docs = rows.map((row) => ({
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
  const collection = mongo.collection('file_upload_events');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
};

export const syncAiConfigurationsPrismaToMongo: SyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.aiConfiguration.findMany();
  const docs = rows.map((row) => ({
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
  const collection = mongo.collection('ai_configurations');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
};
