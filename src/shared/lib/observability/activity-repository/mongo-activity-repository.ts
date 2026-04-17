import { ObjectId, type Filter } from 'mongodb';

import type { ActivityRepository, ActivityFilters } from '@/shared/contracts/system';
import type { ActivityLog, CreateActivityLog } from '@/shared/contracts/system';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { getObservabilityIndexManifestEntries } from '@/shared/lib/observability/observability-index-manifest';

const COLLECTION = 'activity_logs';

interface ActivityLogDoc {
  _id: ObjectId;
  type: string;
  description: string;
  userId: string | null;
  entityId: string | null;
  entityType: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt?: Date | null;
}

const toActivityDto = (doc: ActivityLogDoc): ActivityLog => ({
  id: doc._id.toString(),
  type: doc.type,
  description: doc.description,
  userId: doc.userId,
  entityId: doc.entityId,
  entityType: doc.entityType,
  metadata: doc.metadata,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: (doc.updatedAt ?? doc.createdAt).toISOString(),
});

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
  key: 'userId' | 'entityId' | 'entityType',
  value: string | null | undefined
): void => {
  if (typeof value !== 'string' || value.length === 0) return;
  const mutableQuery = query as Filter<ActivityLogDoc> & Record<string, unknown>;
  mutableQuery[key] = value;
};

const buildActivityQuery = (filters: ActivityFilters): Filter<ActivityLogDoc> => {
  const query: Filter<ActivityLogDoc> = {};
  const mutableQuery = query as Filter<ActivityLogDoc> & Record<string, unknown>;

  applyExactActivityStringFilter(query, 'userId', filters.userId);
  applyActivityTypeFilter(query, filters);
  applyExactActivityStringFilter(query, 'entityId', filters.entityId);
  applyExactActivityStringFilter(query, 'entityType', filters.entityType);
  if (typeof filters.search === 'string' && filters.search.length > 0) {
    mutableQuery['description'] = { $regex: filters.search, $options: 'i' };
  }

  return query;
};

const buildActivityLogDoc = (data: CreateActivityLog, now: Date): ActivityLogDoc => {
  const doc: ActivityLogDoc = {
    _id: new ObjectId(),
    type: data.type,
    description: data.description,
    userId: data.userId ?? null,
    entityId: data.entityId ?? null,
    entityType: data.entityType ?? null,
    metadata: data.metadata ?? null,
    createdAt: now,
    updatedAt: now,
  };

  return doc;
};

let indexesReady = false;
let indexesPromise: Promise<void> | null = null;

const ensureActivityLogIndexes = async (): Promise<void> => {
  if (indexesReady) return;
  indexesPromise ??= (async (): Promise<void> => {
    const db = await getMongoDb();
    const collection = db.collection<ActivityLogDoc>(COLLECTION);
    const indexes = getObservabilityIndexManifestEntries(COLLECTION);
    await Promise.all(indexes.map((index) => collection.createIndex(index.key, index.options)));
    indexesReady = true;
  })().catch((error: unknown) => {
    indexesPromise = null;
    throw error;
  });
  await indexesPromise;
};

export const mongoActivityRepository: ActivityRepository = {
  async listActivity(filters: ActivityFilters): Promise<ActivityLog[]> {
    await ensureActivityLogIndexes();
    const db = await getMongoDb();
    const query = buildActivityQuery(filters);

    const logs = await db
      .collection<ActivityLogDoc>(COLLECTION)
      .find(query)
      .sort({ createdAt: -1 })
      .limit(filters.limit ?? 50)
      .skip(filters.offset ?? 0)
      .toArray();

    return logs.map(toActivityDto);
  },

  async countActivity(filters: ActivityFilters): Promise<number> {
    await ensureActivityLogIndexes();
    const db = await getMongoDb();
    return db.collection<ActivityLogDoc>(COLLECTION).countDocuments(buildActivityQuery(filters));
  },

  async createActivity(data: CreateActivityLog): Promise<ActivityLog> {
    await ensureActivityLogIndexes();
    const db = await getMongoDb();
    const now = new Date();
    const doc = buildActivityLogDoc(data, now);

    await db.collection<ActivityLogDoc>(COLLECTION).insertOne(doc);
    return toActivityDto(doc);
  },

  async deleteActivity(id: string): Promise<void> {
    await ensureActivityLogIndexes();
    const db = await getMongoDb();
    await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });
  },
};

export async function clearActivityLogs(input?: {
  before?: Date | null;
}): Promise<{ deleted: number }> {
  await ensureActivityLogIndexes();
  const db = await getMongoDb();
  const query = input?.before ? { createdAt: { $lte: input.before } } : {};
  const result = await db.collection<ActivityLogDoc>(COLLECTION).deleteMany(query);
  return { deleted: result.deletedCount };
}
