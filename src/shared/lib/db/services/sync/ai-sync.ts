import type { DatabaseSyncHandler } from './types';
import type {
  MongoProductAiJobDoc,
  MongoAiPathRunDoc,
  MongoAiPathRunNodeDoc,
  MongoAiPathRunEventDoc,
} from '../database-sync-types';
import type {
  Prisma,
  ProductAiJobStatus,
  AiPathRunStatus,
  AiPathNodeStatus,
  AiPathRunEventLevel,
} from '@prisma/client';

type BatchResult = { count: number };

type MongoRecordWithStringId<TDoc> = Omit<TDoc, '_id'> & { _id: string };

type ProductAiJobSeed = {
  id: string;
  productId: string;
  status: ProductAiJobStatus;
  type: string;
  payload: unknown;
  result: unknown;
  errorMessage: string | null;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
};

type AiPathRunSeed = {
  id: string;
  userId: string | null;
  pathId: string;
  pathName: string | null;
  status: AiPathRunStatus;
  triggerEvent: string | null;
  triggerNodeId: string | null;
  triggerContext: unknown;
  graph: unknown;
  runtimeState: unknown;
  meta: unknown;
  entityId: string | null;
  entityType: string | null;
  errorMessage: string | null;
  retryCount: number;
  maxAttempts: number;
  nextRetryAt: Date | null;
  deadLetteredAt: Date | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type AiPathRunNodeSeed = {
  id: string;
  runId: string;
  nodeId: string;
  nodeType: string;
  nodeTitle: string | null;
  status: AiPathNodeStatus;
  attempt: number;
  inputs: unknown;
  outputs: unknown;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
};

type AiPathRunEventSeed = {
  id: string;
  runId: string;
  level: AiPathRunEventLevel;
  message: string;
  metadata: unknown;
  createdAt: Date;
};

type ProductAiJobRow = ProductAiJobSeed;
type AiPathRunRow = AiPathRunSeed;
type AiPathRunNodeRow = AiPathRunNodeSeed;
type AiPathRunEventRow = AiPathRunEventSeed;

export const syncProductAiJobs: DatabaseSyncHandler = async ({ mongo, prisma, normalizeId, toDate }) => {
  const docs = await mongo.collection<MongoProductAiJobDoc>('product_ai_jobs').find({}).toArray();
  const data = docs
    .map((doc): ProductAiJobSeed | null => {
      const id = normalizeId(doc as Record<string, unknown>);
      const productId = doc.productId;
      if (!id || !productId) return null;
      const rawType = doc.type;
      return {
        id,
        productId,
        status: (doc.status as ProductAiJobStatus) ?? 'pending',
        type: typeof rawType === 'string' && rawType.trim().length > 0 ? rawType : 'unknown',
        payload: (doc.payload ?? {}) as Prisma.InputJsonValue,
        result: (doc.result ?? null) as Prisma.InputJsonValue,
        errorMessage: doc.errorMessage ?? null,
        createdAt: (doc.createdAt as Date) ?? new Date(),
        startedAt: toDate(doc.startedAt),
        finishedAt: toDate(doc.finishedAt),
      };
    })
    .filter((item): item is ProductAiJobSeed => item !== null);
  const deleted = (await prisma.productAiJob.deleteMany()) as BatchResult;
  const created: BatchResult = data.length
    ? ((await prisma.productAiJob.createMany({
      data: data as Prisma.ProductAiJobCreateManyInput[],
    })) as BatchResult)
    : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

export const syncAiPathRuns: DatabaseSyncHandler = async ({
  mongo,
  prisma,
  normalizeId,
  toDate,
  toJsonValue,
}) => {
  const docs = await mongo.collection<MongoAiPathRunDoc>('ai_path_runs').find({}).toArray();
  const data = docs
    .map((doc): AiPathRunSeed | null => {
      const id = normalizeId(doc as Record<string, unknown>);
      if (!id) return null;
      return {
        id,
        userId: doc.userId ?? null,
        pathId: doc.pathId ?? '',
        pathName: doc.pathName ?? null,
        status: (doc.status as AiPathRunStatus) ?? 'queued',
        triggerEvent: doc.triggerEvent ?? null,
        triggerNodeId: doc.triggerNodeId ?? null,
        triggerContext: toJsonValue(doc.triggerContext ?? null) as Prisma.InputJsonValue,
        graph: toJsonValue(doc.graph ?? null) as Prisma.InputJsonValue,
        runtimeState: toJsonValue(doc.runtimeState ?? null) as Prisma.InputJsonValue,
        meta: toJsonValue(doc.meta ?? null) as Prisma.InputJsonValue,
        entityId: doc.entityId ?? null,
        entityType: doc.entityType ?? null,
        errorMessage: doc.errorMessage ?? null,
        retryCount: doc.retryCount ?? 0,
        maxAttempts: doc.maxAttempts ?? 3,
        nextRetryAt: toDate(doc.nextRetryAt),
        deadLetteredAt: toDate(doc.deadLetteredAt),
        startedAt: toDate(doc.startedAt),
        finishedAt: toDate(doc.finishedAt),
        createdAt: (doc.createdAt as Date) ?? new Date(),
        updatedAt: (doc.updatedAt as Date) ?? new Date(),
      };
    })
    .filter((item): item is AiPathRunSeed => item !== null);
  await prisma.aiPathRunNode.deleteMany();
  await prisma.aiPathRunEvent.deleteMany();
  const deleted = (await prisma.aiPathRun.deleteMany()) as BatchResult;
  const created: BatchResult = data.length
    ? ((await prisma.aiPathRun.createMany({
      data: data as Prisma.AiPathRunCreateManyInput[],
    })) as BatchResult)
    : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

export const syncAiPathRunNodes: DatabaseSyncHandler = async ({
  mongo,
  prisma,
  normalizeId,
  toDate,
  toJsonValue,
}) => {
  const docs = await mongo.collection<MongoAiPathRunNodeDoc>('ai_path_run_nodes').find({}).toArray();
  const data = docs
    .map((doc): AiPathRunNodeSeed | null => {
      const id = normalizeId(doc as Record<string, unknown>);
      const runId = doc.runId;
      if (!id || !runId) return null;
      return {
        id,
        runId,
        nodeId: doc.nodeId ?? '',
        nodeType: doc.nodeType ?? '',
        nodeTitle: doc.nodeTitle ?? null,
        status: (doc.status as AiPathNodeStatus) ?? 'pending',
        attempt: doc.attempt ?? 0,
        inputs: toJsonValue(doc.inputs ?? null) as Prisma.InputJsonValue,
        outputs: toJsonValue(doc.outputs ?? null) as Prisma.InputJsonValue,
        errorMessage: doc.errorMessage ?? null,
        createdAt: (doc.createdAt as Date) ?? new Date(),
        updatedAt: (doc.updatedAt as Date) ?? new Date(),
        startedAt: toDate(doc.startedAt),
        finishedAt: toDate(doc.finishedAt),
      };
    })
    .filter((item): item is AiPathRunNodeSeed => item !== null);
  const deleted = (await prisma.aiPathRunNode.deleteMany()) as BatchResult;
  const created: BatchResult = data.length
    ? ((await prisma.aiPathRunNode.createMany({
      data: data as Prisma.AiPathRunNodeCreateManyInput[],
    })) as BatchResult)
    : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

export const syncAiPathRunEvents: DatabaseSyncHandler = async ({
  mongo,
  prisma,
  normalizeId,
  toJsonValue,
}) => {
  const docs = await mongo
    .collection<MongoAiPathRunEventDoc>('ai_path_run_events')
    .find({})
    .toArray();
  const data = docs
    .map((doc): AiPathRunEventSeed | null => {
      const id = normalizeId(doc as Record<string, unknown>);
      const runId = doc.runId;
      if (!id || !runId) return null;
      return {
        id,
        runId,
        level: (doc.level as AiPathRunEventLevel) ?? 'info',
        message: doc.message ?? '',
        metadata: toJsonValue(doc.metadata ?? null) as Prisma.InputJsonValue,
        createdAt: (doc.createdAt as Date) ?? new Date(),
      };
    })
    .filter((item): item is AiPathRunEventSeed => item !== null);
  const deleted = (await prisma.aiPathRunEvent.deleteMany()) as BatchResult;
  const created: BatchResult = data.length
    ? ((await prisma.aiPathRunEvent.createMany({
      data: data as Prisma.AiPathRunEventCreateManyInput[],
    })) as BatchResult)
    : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

// --- Prisma to Mongo handlers ---

export const syncProductAiJobsPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = (await prisma.productAiJob.findMany()) as ProductAiJobRow[];
  const docs: MongoRecordWithStringId<MongoProductAiJobDoc>[] = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    productId: row.productId,
    status: row.status,
    type: row.type,
    payload: row.payload,
    result: row.result ?? null,
    errorMessage: row.errorMessage ?? null,
    createdAt: row.createdAt,
    startedAt: row.startedAt ?? null,
    finishedAt: row.finishedAt ?? null,
  }));
  const collection = mongo.collection<MongoRecordWithStringId<MongoProductAiJobDoc>>(
    'product_ai_jobs'
  );
  const deleted = await collection.deleteMany({});
  if (docs.length) {
    await collection.insertMany(docs);
  }
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncAiPathRunsPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = (await prisma.aiPathRun.findMany()) as AiPathRunRow[];
  const docs: MongoRecordWithStringId<MongoAiPathRunDoc>[] = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    userId: row.userId ?? null,
    pathId: row.pathId,
    pathName: row.pathName ?? null,
    status: row.status,
    triggerEvent: row.triggerEvent ?? null,
    triggerNodeId: row.triggerNodeId ?? null,
    triggerContext: row.triggerContext ?? null,
    graph: row.graph ?? null,
    runtimeState: row.runtimeState ?? null,
    meta: row.meta ?? null,
    entityId: row.entityId ?? null,
    entityType: row.entityType ?? null,
    errorMessage: row.errorMessage ?? null,
    retryCount: row.retryCount ?? 0,
    maxAttempts: row.maxAttempts ?? 3,
    nextRetryAt: row.nextRetryAt ?? null,
    deadLetteredAt: row.deadLetteredAt ?? null,
    startedAt: row.startedAt ?? null,
    finishedAt: row.finishedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection<MongoRecordWithStringId<MongoAiPathRunDoc>>('ai_path_runs');
  const deleted = await collection.deleteMany({});
  if (docs.length) {
    await collection.insertMany(docs);
  }
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncAiPathRunNodesPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = (await prisma.aiPathRunNode.findMany()) as AiPathRunNodeRow[];
  const docs: MongoRecordWithStringId<MongoAiPathRunNodeDoc>[] = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    runId: row.runId,
    nodeId: row.nodeId,
    nodeType: row.nodeType,
    nodeTitle: row.nodeTitle ?? null,
    status: row.status,
    attempt: row.attempt ?? 0,
    inputs: row.inputs ?? null,
    outputs: row.outputs ?? null,
    errorMessage: row.errorMessage ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    startedAt: row.startedAt ?? null,
    finishedAt: row.finishedAt ?? null,
  }));
  const collection = mongo.collection<MongoRecordWithStringId<MongoAiPathRunNodeDoc>>(
    'ai_path_run_nodes'
  );
  const deleted = await collection.deleteMany({});
  if (docs.length) {
    await collection.insertMany(docs);
  }
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncAiPathRunEventsPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = (await prisma.aiPathRunEvent.findMany()) as AiPathRunEventRow[];
  const docs: MongoRecordWithStringId<MongoAiPathRunEventDoc>[] = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    runId: row.runId,
    level: row.level,
    message: row.message,
    metadata: row.metadata ?? null,
    createdAt: row.createdAt,
  }));
  const collection = mongo.collection<MongoRecordWithStringId<MongoAiPathRunEventDoc>>(
    'ai_path_run_events'
  );
  const deleted = await collection.deleteMany({});
  if (docs.length) {
    await collection.insertMany(docs);
  }
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};
