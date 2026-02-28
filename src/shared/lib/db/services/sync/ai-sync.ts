import type {
  Prisma,
  ProductAiJobStatus,
  AiPathRunStatus,
  AiPathNodeStatus,
  AiPathRunEventLevel,
} from '@prisma/client';
import type { SyncHandler } from './types';

export const syncProductAiJobs: SyncHandler = async ({ mongo, prisma, normalizeId, toDate }) => {
  const docs = await mongo.collection('product_ai_jobs').find({}).toArray();
  const data = docs
    .map((doc: Record<string, unknown>): Prisma.ProductAiJobCreateManyInput | null => {
      const id = normalizeId(doc as unknown as Record<string, unknown>);
      const productId = (doc as { productId?: string }).productId;
      if (!id || !productId) return null;
      return {
        id,
        productId,
        status: ((doc as { status?: string }).status as ProductAiJobStatus) ?? 'pending',
        type: (doc as { type?: string }).type ?? 'description_generation',
        payload: ((doc as { payload?: unknown }).payload ?? {}) as Prisma.InputJsonValue,
        result: ((doc as { result?: unknown }).result ?? null) as Prisma.InputJsonValue,
        errorMessage: (doc as { errorMessage?: string | null }).errorMessage ?? null,
        createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
        startedAt: toDate((doc as { startedAt?: Date | string | null }).startedAt),
        finishedAt: toDate((doc as { finishedAt?: Date | string | null }).finishedAt),
      };
    })
    .filter((item): item is Prisma.ProductAiJobCreateManyInput => item !== null);
  const deleted = await prisma.productAiJob.deleteMany();
  const created = data.length ? await prisma.productAiJob.createMany({ data }) : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

export const syncAiPathRuns: SyncHandler = async ({
  mongo,
  prisma,
  normalizeId,
  toDate,
  toJsonValue,
}) => {
  const docs = await mongo.collection('ai_path_runs').find({}).toArray();
  const data = docs
    .map((doc: Record<string, unknown>): Prisma.AiPathRunCreateManyInput | null => {
      const id = normalizeId(doc as unknown as Record<string, unknown>);
      if (!id) return null;
      return {
        id,
        userId: (doc as { userId?: string | null }).userId ?? null,
        pathId: (doc as { pathId?: string }).pathId ?? '',
        pathName: (doc as { pathName?: string | null }).pathName ?? null,
        status: ((doc as { status?: string }).status as AiPathRunStatus) ?? 'queued',
        triggerEvent: (doc as { triggerEvent?: string | null }).triggerEvent ?? null,
        triggerNodeId: (doc as { triggerNodeId?: string | null }).triggerNodeId ?? null,
        triggerContext: toJsonValue(
          (doc as { triggerContext?: unknown }).triggerContext ?? null
        ) as Prisma.InputJsonValue,
        graph: toJsonValue((doc as { graph?: unknown }).graph ?? null) as Prisma.InputJsonValue,
        runtimeState: toJsonValue(
          (doc as { runtimeState?: unknown }).runtimeState ?? null
        ) as Prisma.InputJsonValue,
        meta: toJsonValue((doc as { meta?: unknown }).meta ?? null) as Prisma.InputJsonValue,
        entityId: (doc as { entityId?: string | null }).entityId ?? null,
        entityType: (doc as { entityType?: string | null }).entityType ?? null,
        errorMessage: (doc as { errorMessage?: string | null }).errorMessage ?? null,
        retryCount: (doc as { retryCount?: number | null }).retryCount ?? 0,
        maxAttempts: (doc as { maxAttempts?: number | null }).maxAttempts ?? 3,
        nextRetryAt: toDate((doc as { nextRetryAt?: Date | string | null }).nextRetryAt),
        deadLetteredAt: toDate((doc as { deadLetteredAt?: Date | string | null }).deadLetteredAt),
        startedAt: toDate((doc as { startedAt?: Date | string | null }).startedAt),
        finishedAt: toDate((doc as { finishedAt?: Date | string | null }).finishedAt),
        createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
        updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
      };
    })
    .filter((item): item is Prisma.AiPathRunCreateManyInput => item !== null);
  await prisma.aiPathRunNode.deleteMany();
  await prisma.aiPathRunEvent.deleteMany();
  const deleted = await prisma.aiPathRun.deleteMany();
  const created = data.length ? await prisma.aiPathRun.createMany({ data }) : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

export const syncAiPathRunNodes: SyncHandler = async ({
  mongo,
  prisma,
  normalizeId,
  toDate,
  toJsonValue,
}) => {
  const docs = await mongo.collection('ai_path_run_nodes').find({}).toArray();
  const data = docs
    .map((doc: Record<string, unknown>): Prisma.AiPathRunNodeCreateManyInput | null => {
      const id = normalizeId(doc as unknown as Record<string, unknown>);
      const runId = (doc as { runId?: string }).runId;
      if (!id || !runId) return null;
      return {
        id,
        runId,
        nodeId: (doc as { nodeId?: string }).nodeId ?? '',
        nodeType: (doc as { nodeType?: string }).nodeType ?? '',
        nodeTitle: (doc as { nodeTitle?: string | null }).nodeTitle ?? null,
        status: ((doc as { status?: string }).status as AiPathNodeStatus) ?? 'pending',
        attempt: (doc as { attempt?: number }).attempt ?? 0,
        inputs: toJsonValue((doc as { inputs?: unknown }).inputs ?? null) as Prisma.InputJsonValue,
        outputs: toJsonValue(
          (doc as { outputs?: unknown }).outputs ?? null
        ) as Prisma.InputJsonValue,
        errorMessage: (doc as { errorMessage?: string | null }).errorMessage ?? null,
        createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
        updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
        startedAt: toDate((doc as { startedAt?: Date | string | null }).startedAt),
        finishedAt: toDate((doc as { finishedAt?: Date | string | null }).finishedAt),
      };
    })
    .filter((item): item is Prisma.AiPathRunNodeCreateManyInput => item !== null);
  const deleted = await prisma.aiPathRunNode.deleteMany();
  const created = data.length ? await prisma.aiPathRunNode.createMany({ data }) : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

export const syncAiPathRunEvents: SyncHandler = async ({
  mongo,
  prisma,
  normalizeId,
  toJsonValue,
}) => {
  const docs = await mongo.collection('ai_path_run_events').find({}).toArray();
  const data = docs
    .map((doc: Record<string, unknown>): Prisma.AiPathRunEventCreateManyInput | null => {
      const id = normalizeId(doc as unknown as Record<string, unknown>);
      const runId = (doc as { runId?: string }).runId;
      if (!id || !runId) return null;
      return {
        id,
        runId,
        level: ((doc as { level?: string }).level as AiPathRunEventLevel) ?? 'info',
        message: (doc as { message?: string }).message ?? '',
        metadata: toJsonValue(
          (doc as { metadata?: unknown }).metadata ?? null
        ) as Prisma.InputJsonValue,
        createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
      };
    })
    .filter((item): item is Prisma.AiPathRunEventCreateManyInput => item !== null);
  const deleted = await prisma.aiPathRunEvent.deleteMany();
  const created = data.length ? await prisma.aiPathRunEvent.createMany({ data }) : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

// --- Prisma to Mongo handlers ---

export const syncProductAiJobsPrismaToMongo: SyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.productAiJob.findMany();
  const docs = rows.map((row) => ({
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
  const collection = mongo.collection('product_ai_jobs');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncAiPathRunsPrismaToMongo: SyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.aiPathRun.findMany();
  const docs = rows.map((row) => ({
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
  const collection = mongo.collection('ai_path_runs');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncAiPathRunNodesPrismaToMongo: SyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.aiPathRunNode.findMany();
  const docs = rows.map((row) => ({
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
  const collection = mongo.collection('ai_path_run_nodes');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncAiPathRunEventsPrismaToMongo: SyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.aiPathRunEvent.findMany();
  const docs = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    runId: row.runId,
    level: row.level,
    message: row.message,
    metadata: row.metadata ?? null,
    createdAt: row.createdAt,
  }));
  const collection = mongo.collection('ai_path_run_events');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};
