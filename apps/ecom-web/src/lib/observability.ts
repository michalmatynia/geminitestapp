import { ObjectId } from 'mongodb';

import { getDb } from './mongodb';

const APPLICATION_ID = 'stargater';
const APPLICATION_NAME = 'Stargater';
const ACTIVITY_LOGS_COLLECTION = 'activity_logs';
const ERROR_LOGS_COLLECTION = 'error_logs';
const SYSTEM_LOGS_COLLECTION = 'system_logs';

type StargaterLogInput = {
  message?: string;
  description?: string;
  type?: string;
  source?: string | null;
  service?: string | null;
  userId?: string | null;
  entityId?: string | null;
  entityType?: string | null;
  path?: string | null;
  method?: string | null;
  statusCode?: number | null;
  requestId?: string | null;
  traceId?: string | null;
  correlationId?: string | null;
  stack?: string | null;
  metadata?: Record<string, unknown> | null;
  context?: Record<string, unknown> | null;
};

const getRuntimeEnvironment = (): string | null =>
  process.env.VERCEL_ENV?.trim() || process.env.NODE_ENV?.trim() || null;

const ensureStargaterObservabilityIndexes = async (): Promise<void> => {
  const db = await getDb();
  await Promise.all([
    db.collection(ACTIVITY_LOGS_COLLECTION).createIndex({ createdAt: -1 }),
    db.collection(ACTIVITY_LOGS_COLLECTION).createIndex({ applicationId: 1, createdAt: -1 }),
    db.collection(ACTIVITY_LOGS_COLLECTION).createIndex({ applicationId: 1, originLogId: 1 }),
    db.collection(ERROR_LOGS_COLLECTION).createIndex({ createdAt: -1 }),
    db.collection(ERROR_LOGS_COLLECTION).createIndex({ applicationId: 1, createdAt: -1 }),
    db.collection(ERROR_LOGS_COLLECTION).createIndex({ applicationId: 1, originLogId: 1 }),
    db.collection(SYSTEM_LOGS_COLLECTION).createIndex({ createdAt: -1 }),
    db.collection(SYSTEM_LOGS_COLLECTION).createIndex({ applicationId: 1, createdAt: -1 }),
    db.collection(SYSTEM_LOGS_COLLECTION).createIndex({ applicationId: 1, originLogId: 1 }),
  ]);
};

export const logStargaterActivity = async (input: StargaterLogInput): Promise<void> => {
  await ensureStargaterObservabilityIndexes();
  const db = await getDb();
  const now = new Date();
  const _id = new ObjectId();
  await db.collection(ACTIVITY_LOGS_COLLECTION).insertOne({
    _id,
    type: input.type ?? 'stargater.activity',
    description: input.description ?? input.message ?? 'Stargater activity',
    userId: input.userId ?? null,
    entityId: input.entityId ?? null,
    entityType: input.entityType ?? null,
    metadata: input.metadata ?? null,
    applicationId: APPLICATION_ID,
    applicationName: APPLICATION_NAME,
    environment: getRuntimeEnvironment(),
    sourceService: input.service ?? input.source ?? 'stargater',
    originDatabase: db.databaseName,
    originCollection: ACTIVITY_LOGS_COLLECTION,
    originLogId: _id.toString(),
    createdAt: now,
    updatedAt: now,
  });
};

export const logStargaterError = async (input: StargaterLogInput): Promise<void> => {
  await ensureStargaterObservabilityIndexes();
  const db = await getDb();
  const now = new Date();
  const _id = new ObjectId();
  const id = _id.toString();
  const doc = {
    _id,
    id,
    level: 'error',
    message: input.message ?? input.description ?? 'Stargater error',
    category: 'STARGATER',
    source: input.source ?? null,
    service: input.service ?? null,
    context: input.context ?? input.metadata ?? null,
    stack: input.stack ?? null,
    path: input.path ?? null,
    method: input.method ?? null,
    statusCode: input.statusCode ?? null,
    requestId: input.requestId ?? null,
    traceId: input.traceId ?? null,
    correlationId: input.correlationId ?? null,
    spanId: null,
    parentSpanId: null,
    userId: input.userId ?? null,
    applicationId: APPLICATION_ID,
    applicationName: APPLICATION_NAME,
    environment: getRuntimeEnvironment(),
    sourceService: input.service ?? input.source ?? 'stargater',
    originDatabase: db.databaseName,
    originCollection: SYSTEM_LOGS_COLLECTION,
    originLogId: id,
    createdAt: now,
    updatedAt: now,
  };

  await Promise.all([
    db.collection(SYSTEM_LOGS_COLLECTION).insertOne(doc),
    db.collection(ERROR_LOGS_COLLECTION).updateOne(
      { applicationId: APPLICATION_ID, originLogId: id },
      { $setOnInsert: doc },
      { upsert: true }
    ),
  ]);
};
