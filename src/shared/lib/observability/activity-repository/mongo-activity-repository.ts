import { ObjectId, type Db, type Filter } from 'mongodb';

import {
  observabilityApplicationIdValues,
  type ActivityRepository,
  type ActivityFilters,
  type ObservabilityApplicationId,
} from '@/shared/contracts/system';
import type { ActivityLog, CreateActivityLog } from '@/shared/contracts/system';
import { getMongoDb as getRootMongoDb } from '@/shared/lib/db/mongo-client';
import {
  getFederatedObservabilityApplicationIds,
  getMongoDatabaseName,
  getObservabilityApplicationMongoDb,
} from '@/shared/lib/observability/application-log-databases';
import {
  buildObservabilityLogOrigin,
  getObservabilityApplicationName,
  normalizeObservabilityApplicationId,
  resolveObservabilityApplicationIdFromValues,
} from '@/shared/lib/observability/application-log-origin';
import { getObservabilityIndexManifestEntries } from '@/shared/lib/observability/observability-index-manifest';

const COLLECTION = 'activity_logs';
const OBSERVABILITY_APPLICATION_IDS = observabilityApplicationIdValues;
type ActivityApplicationId = ObservabilityApplicationId;

type ActivityLogSource = {
  applicationId: ActivityApplicationId;
  db: Db;
};

interface ActivityLogDoc {
  _id: ObjectId;
  type: string;
  description: string;
  userId: string | null;
  entityId: string | null;
  entityType: string | null;
  metadata: Record<string, unknown> | null;
  applicationId?: ActivityApplicationId | null;
  applicationName?: string | null;
  environment?: string | null;
  sourceService?: string | null;
  originDatabase?: string | null;
  originCollection?: string | null;
  originLogId?: string | null;
  createdAt: Date;
  updatedAt?: Date | null;
}

const toActivityDto = (
  doc: ActivityLogDoc,
  fallbackApplicationId: ActivityApplicationId = 'geminitestapp',
  fallbackOriginDatabase: string | null = null
): ActivityLog => {
  const applicationId = normalizeObservabilityApplicationId(doc.applicationId) ?? fallbackApplicationId;
  return {
    id: doc._id.toString(),
    type: doc.type,
    description: doc.description,
    userId: doc.userId,
    entityId: doc.entityId,
    entityType: doc.entityType,
    metadata: doc.metadata,
    applicationId,
    applicationName: doc.applicationName ?? getObservabilityApplicationName(applicationId),
    environment: doc.environment ?? null,
    sourceService: doc.sourceService ?? doc.entityType ?? doc.type,
    originDatabase: doc.originDatabase ?? fallbackOriginDatabase,
    originCollection: doc.originCollection ?? COLLECTION,
    originLogId: doc.originLogId ?? doc._id.toString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: (doc.updatedAt ?? doc.createdAt).toISOString(),
  };
};

const applyActivityTypeFilter = (
  query: Filter<ActivityLogDoc>,
  filters: Pick<ActivityFilters, 'type' | 'types'>
): void => {
  const mutableQuery = query as Filter<ActivityLogDoc> & Record<string, unknown>;

  if (Array.isArray(filters.types) && filters.types.length > 0) {
    mutableQuery['type'] = { $in: filters.types };
    return;
  }

  if (typeof filters.type === 'string' && filters.type.length > 0) {
    mutableQuery['type'] = filters.type;
  }
};

const applyExactActivityStringFilter = (
  query: Filter<ActivityLogDoc>,
  key: 'userId' | 'entityId' | 'entityType' | 'applicationId',
  value: string | null | undefined
): void => {
  if (typeof value !== 'string' || value.length === 0) return;
  const mutableQuery = query as Filter<ActivityLogDoc> & Record<string, unknown>;
  (mutableQuery as Record<string, unknown>)[key] = value;
};

const buildActivityQuery = (
  filters: ActivityFilters,
  options: { includeApplicationIdFilter?: boolean } = {}
): Filter<ActivityLogDoc> => {
  const query: Filter<ActivityLogDoc> = {};
  const mutableQuery = query as Filter<ActivityLogDoc> & Record<string, unknown>;

  applyExactActivityStringFilter(query, 'userId', filters.userId);
  applyActivityTypeFilter(query, filters);
  applyExactActivityStringFilter(query, 'entityId', filters.entityId);
  applyExactActivityStringFilter(query, 'entityType', filters.entityType);
  if (options.includeApplicationIdFilter === true) {
    applyExactActivityStringFilter(query, 'applicationId', filters.applicationId);
  }
  if (typeof filters.search === 'string' && filters.search.length > 0) {
    mutableQuery['description'] = { $regex: filters.search, $options: 'i' };
  }

  return query;
};

const getMetadataString = (
  metadata: Record<string, unknown> | null | undefined,
  key: string
): string | null => {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
};

const resolveActivityApplicationId = (
  data: CreateActivityLog
): ActivityApplicationId =>
  normalizeObservabilityApplicationId(data.applicationId) ??
  resolveObservabilityApplicationIdFromValues([
    data.applicationName,
    data.type,
    data.description,
    data.entityType,
    data.metadata,
    getMetadataString(data.metadata, 'surface'),
    getMetadataString(data.metadata, 'source'),
    getMetadataString(data.metadata, 'service'),
  ]);

const buildActivityLogDoc = (
  data: CreateActivityLog,
  now: Date,
  originDatabase: string | null
): ActivityLogDoc => {
  const _id = new ObjectId();
  const applicationId = resolveActivityApplicationId(data);
  const origin = buildObservabilityLogOrigin({
    applicationId,
    applicationName: data.applicationName,
    environment: data.environment,
    sourceService:
      data.sourceService ??
      getMetadataString(data.metadata, 'sourceService') ??
      getMetadataString(data.metadata, 'service') ??
      data.entityType ??
      data.type,
    originDatabase: data.originDatabase ?? originDatabase,
    originCollection: data.originCollection ?? COLLECTION,
    originLogId: data.originLogId ?? _id.toString(),
    values: [data.applicationId, data.applicationName, data.type, data.description, data.metadata],
  });
  const doc: ActivityLogDoc = {
    _id,
    type: data.type,
    description: data.description,
    userId: data.userId ?? null,
    entityId: data.entityId ?? null,
    entityType: data.entityType ?? null,
    metadata: data.metadata ?? null,
    applicationId: origin.applicationId,
    applicationName: origin.applicationName,
    environment: origin.environment,
    sourceService: origin.sourceService,
    originDatabase: origin.originDatabase,
    originCollection: origin.originCollection ?? COLLECTION,
    originLogId: origin.originLogId ?? _id.toString(),
    createdAt: now,
    updatedAt: now,
  };

  return doc;
};

const indexReadyByDb = new WeakMap<object, boolean>();
const indexPromiseByDb = new WeakMap<object, Promise<void>>();

const ensureActivityLogIndexes = async (db?: Db): Promise<void> => {
  const targetDb = db ?? (await getRootMongoDb());
  if (indexReadyByDb.get(targetDb)) return;
  let indexesPromise = indexPromiseByDb.get(targetDb);
  if (!indexesPromise) {
    indexesPromise = (async (): Promise<void> => {
      const collection = targetDb.collection<ActivityLogDoc>(COLLECTION);
      const indexes = getObservabilityIndexManifestEntries(COLLECTION);
      await Promise.all(indexes.map((index) => collection.createIndex(index.key, index.options)));
      indexReadyByDb.set(targetDb, true);
    })().catch((error: unknown) => {
      indexPromiseByDb.delete(targetDb);
      throw error;
    });
    indexPromiseByDb.set(targetDb, indexesPromise);
  }
  await indexesPromise;
};

const resolveActivitySourceApplicationIds = (filters?: ActivityFilters): ActivityApplicationId[] => {
  const applicationId = normalizeObservabilityApplicationId(filters?.applicationId);
  if (applicationId !== null) return [applicationId];
  return getFederatedObservabilityApplicationIds(OBSERVABILITY_APPLICATION_IDS);
};

const getActivityLogSources = async (filters?: ActivityFilters): Promise<ActivityLogSource[]> => {
  const sourceResults = await Promise.allSettled(
    resolveActivitySourceApplicationIds(filters).map(async (applicationId) => ({
      applicationId,
      db: await getObservabilityApplicationMongoDb(applicationId),
    }))
  );

  return sourceResults.flatMap((result) =>
    result.status === 'fulfilled' ? [result.value] : []
  );
};

const compareActivityNewestFirst = (left: ActivityLog, right: ActivityLog): number => {
  const rightTime = Date.parse(right.createdAt ?? '');
  const leftTime = Date.parse(left.createdAt ?? '');
  return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
};

const listActivityForSource = async (
  source: ActivityLogSource,
  query: Filter<ActivityLogDoc>,
  limit: number
): Promise<ActivityLog[]> => {
  await ensureActivityLogIndexes(source.db);
  const logs = await source.db
    .collection<ActivityLogDoc>(COLLECTION)
    .find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  const sourceDatabaseName = getMongoDatabaseName(source.db);
  return logs.map((doc) => toActivityDto(doc, source.applicationId, sourceDatabaseName));
};

export const mongoActivityRepository: ActivityRepository = {
  async listActivity(filters: ActivityFilters): Promise<ActivityLog[]> {
    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;
    const query = buildActivityQuery(filters, { includeApplicationIdFilter: false });
    const sources = await getActivityLogSources(filters);
    const logs = await Promise.all(
      sources.map((source) => listActivityForSource(source, query, offset + limit))
    );

    return logs.flat().sort(compareActivityNewestFirst).slice(offset, offset + limit);
  },

  async countActivity(filters: ActivityFilters): Promise<number> {
    const query = buildActivityQuery(filters, { includeApplicationIdFilter: false });
    const sources = await getActivityLogSources(filters);
    const counts = await Promise.all(
      sources.map(async (source) => {
        await ensureActivityLogIndexes(source.db);
        return source.db.collection<ActivityLogDoc>(COLLECTION).countDocuments(query);
      })
    );
    return counts.reduce((sum, count) => sum + count, 0);
  },

  async createActivity(data: CreateActivityLog): Promise<ActivityLog> {
    const applicationId = resolveActivityApplicationId(data);
    const db = await getObservabilityApplicationMongoDb(applicationId);
    await ensureActivityLogIndexes(db);
    const now = new Date();
    const doc = buildActivityLogDoc(data, now, getMongoDatabaseName(db));

    await db.collection<ActivityLogDoc>(COLLECTION).insertOne(doc);
    return toActivityDto(doc);
  },

  async deleteActivity(id: string): Promise<void> {
    await ensureActivityLogIndexes();
    const db = await getRootMongoDb();
    await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });
  },
};

export async function clearActivityLogs(input?: {
  before?: Date | null;
}): Promise<{ deleted: number }> {
  await ensureActivityLogIndexes();
  const db = await getRootMongoDb();
  const query = input?.before ? { createdAt: { $lte: input.before } } : {};
  const result = await db.collection<ActivityLogDoc>(COLLECTION).deleteMany(query);
  return { deleted: result.deletedCount };
}
