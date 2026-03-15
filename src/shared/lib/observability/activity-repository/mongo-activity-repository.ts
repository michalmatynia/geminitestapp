import { ObjectId, Filter } from 'mongodb';

import type { ActivityRepository, ActivityFilters } from '@/shared/contracts/system';
import type { ActivityLog, CreateActivityLog } from '@/shared/contracts/system';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

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

export const mongoActivityRepository: ActivityRepository = {
  async listActivity(filters: ActivityFilters): Promise<ActivityLog[]> {
    const db = await getMongoDb();
    const query: Filter<ActivityLogDoc> = {};

    if (filters.userId) query.userId = filters.userId;
    if (filters.types && filters.types.length > 0) {
      query.type = { $in: filters.types };
    } else if (filters.type) {
      query.type = filters.type;
    }
    if (filters.entityId) query.entityId = filters.entityId;
    if (filters.entityType) query.entityType = filters.entityType;
    if (filters.search) {
      query.description = { $regex: filters.search, $options: 'i' };
    }

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
    const db = await getMongoDb();
    const query: Filter<ActivityLogDoc> = {};

    if (filters.userId) query.userId = filters.userId;
    if (filters.types && filters.types.length > 0) {
      query.type = { $in: filters.types };
    } else if (filters.type) {
      query.type = filters.type;
    }
    if (filters.entityId) query.entityId = filters.entityId;
    if (filters.entityType) query.entityType = filters.entityType;
    if (filters.search) {
      query.description = { $regex: filters.search, $options: 'i' };
    }

    return db.collection<ActivityLogDoc>(COLLECTION).countDocuments(query);
  },

  async createActivity(data: CreateActivityLog): Promise<ActivityLog> {
    const db = await getMongoDb();
    const now = new Date();
    const doc = {
      type: data.type,
      description: data.description,
      userId: data.userId ?? null,
      entityId: data.entityId ?? null,
      entityType: data.entityType ?? null,
      metadata: data.metadata ?? null,
      createdAt: now,
      updatedAt: now,
    } as ActivityLogDoc;

    const result = await db.collection<ActivityLogDoc>(COLLECTION).insertOne(doc);
    return toActivityDto({ ...doc, _id: result.insertedId });
  },

  async deleteActivity(id: string): Promise<void> {
    const db = await getMongoDb();
    await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });
  },
};
