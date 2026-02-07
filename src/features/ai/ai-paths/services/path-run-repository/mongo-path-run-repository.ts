import 'server-only';

import { randomUUID } from 'crypto';

import { getMongoDb } from '@/shared/lib/db/mongo-client';
import type {
  AiPathRunEventRecord,
  AiPathRunNodeRecord,
  AiPathRunRecord,
} from '@/shared/types/ai-paths';
import type { AiNode } from '@/shared/types/ai-paths';
import {
  AI_PATHS_RUN_SOURCE_TABS,
  AI_PATHS_RUN_SOURCE_VALUES,
} from '@/features/ai/ai-paths/lib/run-sources';

import {
  AiPathRunEventCreateInput,
  AiPathRunListOptions,
  AiPathRunCreateInput,
  AiPathRunRepository,
  AiPathRunUpdate,
  AiPathRunNodeUpdate,
} from '../../types/path-run-repository';

const RUNS_COLLECTION = 'ai_path_runs';
const NODES_COLLECTION = 'ai_path_run_nodes';
const EVENTS_COLLECTION = 'ai_path_run_events';

type MongoIndexSpec = {
  collection: string;
  key: Record<string, 1 | -1>;
};

export const AI_PATHS_MONGO_INDEXES: MongoIndexSpec[] = [
  { collection: RUNS_COLLECTION, key: { id: 1 } },
  { collection: RUNS_COLLECTION, key: { userId: 1 } },
  { collection: RUNS_COLLECTION, key: { pathId: 1 } },
  { collection: RUNS_COLLECTION, key: { status: 1, createdAt: -1 } },
  { collection: RUNS_COLLECTION, key: { userId: 1, createdAt: -1 } },
  { collection: RUNS_COLLECTION, key: { status: 1, nextRetryAt: 1, createdAt: 1 } },
  { collection: NODES_COLLECTION, key: { runId: 1 } },
  { collection: NODES_COLLECTION, key: { runId: 1, nodeId: 1 } },
  { collection: NODES_COLLECTION, key: { runId: 1, createdAt: 1 } },
  { collection: EVENTS_COLLECTION, key: { runId: 1, createdAt: 1 } },
];

let indexesReady = false;
let indexesPromise: Promise<void> | null = null;

const ensureIndexes = async (): Promise<void> => {
  if (indexesReady) return;
  if (!indexesPromise) {
    indexesPromise = (async (): Promise<void> => {
      const db = await getMongoDb();
      await Promise.all(
        AI_PATHS_MONGO_INDEXES.map((index: MongoIndexSpec) =>
          db.collection(index.collection).createIndex(index.key)
        )
      );
      indexesReady = true;
    })().catch((error: unknown) => {
      indexesPromise = null;
      throw error;
    });
  }
  await indexesPromise;
};

type RunDocument = {
  _id: string;
  id?: string;
  userId?: string | null;
  pathId: string;
  pathName?: string | null;
  status: string;
  triggerEvent?: string | null;
  triggerNodeId?: string | null;
  triggerContext?: Record<string, unknown> | null;
  graph?: Record<string, unknown> | null;
  runtimeState?: Record<string, unknown> | null;
  meta?: Record<string, unknown> | null;
  entityId?: string | null;
  entityType?: string | null;
  errorMessage?: string | null;
  retryCount?: number;
  maxAttempts?: number;
  nextRetryAt?: Date | null;
  deadLetteredAt?: Date | null;
  createdAt: Date;
  updatedAt?: Date;
  startedAt?: Date | null;
  finishedAt?: Date | null;
};

type NodeDocument = {
  _id: string;
  runId: string;
  nodeId: string;
  nodeType: string;
  nodeTitle?: string | null;
  status: string;
  attempt: number;
  inputs?: Record<string, unknown> | null;
  outputs?: Record<string, unknown> | null;
  errorMessage?: string | null;
  createdAt: Date;
  updatedAt?: Date;
  startedAt?: Date | null;
  finishedAt?: Date | null;
};

type EventDocument = {
  _id: string;
  runId: string;
  level: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
};

const toRunRecord = (doc: RunDocument): AiPathRunRecord => ({
  id: doc.id || doc._id,
  userId: doc.userId ?? null,
  pathId: doc.pathId ?? null,
  pathName: doc.pathName ?? null,
  prompt: null,
  status: doc.status as AiPathRunRecord['status'],
  triggerEvent: doc.triggerEvent ?? null,
  triggerNodeId: doc.triggerNodeId ?? null,
  triggerContext: doc.triggerContext ?? null,
  graph: (doc.graph as AiPathRunRecord['graph']) ?? null,
  runtimeState: (doc.runtimeState as AiPathRunRecord['runtimeState']) ?? null,
  meta: doc.meta ?? null,
  entityId: doc.entityId ?? null,
  entityType: doc.entityType ?? null,
  errorMessage: doc.errorMessage ?? null,
  retryCount: doc.retryCount ?? 0,
  maxAttempts: doc.maxAttempts ?? 3,
  nextRetryAt: doc.nextRetryAt ?? null,
  deadLetteredAt: doc.deadLetteredAt ?? null,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt ?? null,
  startedAt: doc.startedAt ?? null,
  finishedAt: doc.finishedAt ?? null,
});

const toNodeRecord = (doc: NodeDocument): AiPathRunNodeRecord => ({
  id: doc._id,
  runId: doc.runId,
  nodeId: doc.nodeId,
  nodeType: doc.nodeType,
  nodeTitle: doc.nodeTitle ?? null,
  status: doc.status as AiPathRunNodeRecord['status'],
  attempt: doc.attempt ?? 0,
  inputs: (doc.inputs as AiPathRunNodeRecord['inputs']) ?? null,
  outputs: (doc.outputs as AiPathRunNodeRecord['outputs']) ?? null,
  errorMessage: doc.errorMessage ?? null,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt ?? null,
  startedAt: doc.startedAt ?? null,
  finishedAt: doc.finishedAt ?? null,
});

const toEventRecord = (doc: EventDocument): AiPathRunEventRecord => ({
  id: doc._id,
  runId: doc.runId,
  level: doc.level as AiPathRunEventRecord['level'],
  message: doc.message,
  metadata: doc.metadata ?? null,
  createdAt: doc.createdAt,
});

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseFilterDate = (value: Date | string | null | undefined): Date | null => {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date;
};

const buildRunFilter = (options: AiPathRunListOptions = {}): Record<string, unknown> => {
  const andFilters: Record<string, unknown>[] = [];
  if (options.userId) {
    andFilters.push({ userId: options.userId });
  }
  if (options.pathId) {
    andFilters.push({ pathId: options.pathId });
  }
  const statuses = Array.isArray(options.statuses) ? options.statuses.filter(Boolean) : [];
  if (statuses.length > 0) {
    andFilters.push({ status: { $in: statuses } });
  } else if (options.status) {
    andFilters.push({ status: options.status });
  }
  const source = options.source?.trim();
  const sourceMode = options.sourceMode ?? 'include';
  if (source) {
    if (sourceMode === 'exclude') {
      if (source === 'ai_paths_ui') {
        andFilters.push({ 'meta.source': { $nin: [...AI_PATHS_RUN_SOURCE_VALUES] } });
        andFilters.push({ 'meta.source.tab': { $nin: [...AI_PATHS_RUN_SOURCE_TABS] } });
        andFilters.push({ 'meta.sourceInfo.tab': { $nin: [...AI_PATHS_RUN_SOURCE_TABS] } });
      } else {
        andFilters.push({ 'meta.source': { $ne: source } });
      }
    } else if (source === 'ai_paths_ui') {
      andFilters.push({
        $or: [
          { 'meta.source': { $in: [...AI_PATHS_RUN_SOURCE_VALUES] } },
          { 'meta.source.tab': { $in: [...AI_PATHS_RUN_SOURCE_TABS] } },
          { 'meta.sourceInfo.tab': { $in: [...AI_PATHS_RUN_SOURCE_TABS] } },
        ],
      });
    } else {
      andFilters.push({ 'meta.source': source });
    }
  }
  const query = options.query?.trim();
  if (query) {
    const regex = new RegExp(escapeRegex(query), 'i');
    andFilters.push({
      $or: [
        { id: { $regex: regex } },
        { _id: { $regex: regex } },
        { pathId: { $regex: regex } },
        { pathName: { $regex: regex } },
        { entityId: { $regex: regex } },
        { errorMessage: { $regex: regex } },
      ],
    });
  }
  const createdAfter = parseFilterDate(options.createdAfter);
  const createdBefore = parseFilterDate(options.createdBefore);
  if (createdAfter || createdBefore) {
    andFilters.push({
      createdAt: {
        ...(createdAfter ? { $gte: createdAfter } : {}),
        ...(createdBefore ? { $lte: createdBefore } : {}),
      },
    });
  }
  return andFilters.length > 0 ? { $and: andFilters } : {};
};

export const mongoPathRunRepository: AiPathRunRepository = {
  async createRun(input: AiPathRunCreateInput) {
    await ensureIndexes();
    const db = await getMongoDb();
    const now = new Date();
    const id = randomUUID();
    const document: RunDocument = {
      _id: id,
      id,
      userId: input.userId ?? null,
      pathId: input.pathId,
      pathName: input.pathName ?? null,
      status: 'queued',
      triggerEvent: input.triggerEvent ?? null,
      triggerNodeId: input.triggerNodeId ?? null,
      triggerContext: input.triggerContext ?? null,
      graph: (input.graph as Record<string, unknown>) ?? null,
      runtimeState: (input.runtimeState as Record<string, unknown>) ?? null,
      meta: input.meta ?? null,
      entityId: input.entityId ?? null,
      entityType: input.entityType ?? null,
      errorMessage: null,
      retryCount: input.retryCount ?? 0,
      maxAttempts: input.maxAttempts ?? 3,
      nextRetryAt: input.nextRetryAt ? new Date(input.nextRetryAt) : null,
      deadLetteredAt: null,
      createdAt: now,
      updatedAt: now,
      startedAt: null,
      finishedAt: null,
    };
    await db.collection<RunDocument>(RUNS_COLLECTION).insertOne(document);
    return toRunRecord(document);
  },

  async updateRun(runId: string, data: AiPathRunUpdate) {
    await ensureIndexes();
    const db = await getMongoDb();
    const now = new Date();
    const updateData = { ...data, updatedAt: now } as Record<string, unknown>;
    if (updateData.nextRetryAt && typeof updateData.nextRetryAt === 'string') {
      updateData.nextRetryAt = new Date(updateData.nextRetryAt);
    }
    if (updateData.deadLetteredAt && typeof updateData.deadLetteredAt === 'string') {
      updateData.deadLetteredAt = new Date(updateData.deadLetteredAt);
    }
    if (updateData.startedAt && typeof updateData.startedAt === 'string') {
      updateData.startedAt = new Date(updateData.startedAt);
    }
    if (updateData.finishedAt && typeof updateData.finishedAt === 'string') {
      updateData.finishedAt = new Date(updateData.finishedAt);
    }
    const result = await db
      .collection<RunDocument>(RUNS_COLLECTION)
      .findOneAndUpdate(
        { $or: [{ _id: runId }, { id: runId }] },
        { $set: updateData },
        { returnDocument: 'after' }
      );
    if (!result) {
      throw new Error('Run not found');
    }
    return toRunRecord(result);
  },

  async findRunById(runId: string) {
    await ensureIndexes();
    const db = await getMongoDb();
    const doc = await db
      .collection<RunDocument>(RUNS_COLLECTION)
      .findOne({ $or: [{ _id: runId }, { id: runId }] });
    return doc ? toRunRecord(doc) : null;
  },

  async deleteRun(runId: string): Promise<boolean> {
    await ensureIndexes();
    const db = await getMongoDb();
    const existing = await db
      .collection<RunDocument>(RUNS_COLLECTION)
      .findOneAndDelete({ $or: [{ _id: runId }, { id: runId }] });
    if (!existing) return false;
    const effectiveRunId = existing.id || existing._id;
    await Promise.all([
      db.collection<NodeDocument>(NODES_COLLECTION).deleteMany({ runId: effectiveRunId }),
      db.collection<EventDocument>(EVENTS_COLLECTION).deleteMany({ runId: effectiveRunId }),
    ]);
    return true;
  },

  async listRuns(options: AiPathRunListOptions = {}) {
    await ensureIndexes();
    const db = await getMongoDb();
    const filter = buildRunFilter(options);
    const cursor = db
      .collection<RunDocument>(RUNS_COLLECTION)
      .find(filter)
      .sort({ createdAt: -1 });
    if (typeof options.offset === 'number') {
      cursor.skip(options.offset);
    }
    if (typeof options.limit === 'number') {
      cursor.limit(options.limit);
    }
    const [docs, total] = await Promise.all([
      cursor.toArray(),
      db.collection<RunDocument>(RUNS_COLLECTION).countDocuments(filter),
    ]);
    return { runs: docs.map(toRunRecord), total };
  },

  async deleteRuns(options: AiPathRunListOptions = {}): Promise<{ count: number }> {
    await ensureIndexes();
    const db = await getMongoDb();
    const filter = buildRunFilter(options);
    const runDocs = await db
      .collection<RunDocument>(RUNS_COLLECTION)
      .find(filter, { projection: { _id: 1, id: 1 } })
      .toArray();
    if (runDocs.length === 0) {
      return { count: 0 };
    }
    const runIds = runDocs
      .map((doc: RunDocument) => doc.id || doc._id)
      .filter((value: string | undefined | null): value is string => Boolean(value));
    if (runIds.length === 0) {
      return { count: 0 };
    }

    const [runDelete] = await Promise.all([
      db.collection<RunDocument>(RUNS_COLLECTION).deleteMany({
        $or: [{ _id: { $in: runIds } }, { id: { $in: runIds } }],
      }),
      db.collection<NodeDocument>(NODES_COLLECTION).deleteMany({ runId: { $in: runIds } }),
      db.collection<EventDocument>(EVENTS_COLLECTION).deleteMany({ runId: { $in: runIds } }),
    ]);

    return { count: runDelete.deletedCount ?? 0 };
  },

  async claimNextQueuedRun() {
    await ensureIndexes();
    const db = await getMongoDb();
    const now = new Date();
    const result = await db
      .collection<RunDocument>(RUNS_COLLECTION)
      .findOneAndUpdate(
        { status: 'queued', $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: now } }] },
        { $set: { status: 'running', startedAt: now, updatedAt: now } },
        { sort: { createdAt: 1 }, returnDocument: 'after' }
      );
    if (!result) return null;
    return toRunRecord(result);
  },

  async getQueueStats(): Promise<{ queuedCount: number; oldestQueuedAt: Date | null }> {
    await ensureIndexes();
    const db = await getMongoDb();
    const now = new Date();
    const filter = {
      status: 'queued',
      $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: now } }],
    };
    const [queuedCount, oldest] = await Promise.all([
      db.collection<RunDocument>(RUNS_COLLECTION).countDocuments(filter),
      db
        .collection<RunDocument>(RUNS_COLLECTION)
        .find(filter, { projection: { createdAt: 1 } })
        .sort({ createdAt: 1 })
        .limit(1)
        .next(),
    ]);
    return { queuedCount, oldestQueuedAt: oldest?.createdAt ?? null };
  },

  async createRunNodes(runId: string, nodes: AiNode[]) {
    await ensureIndexes();
    if (!nodes || nodes.length === 0) return;
    const db = await getMongoDb();
    const now = new Date();
    const docs: NodeDocument[] = nodes.map((node: AiNode) => ({
      _id: randomUUID(),
      runId,
      nodeId: node.id,
      nodeType: node.type,
      nodeTitle: node.title ?? null,
      status: 'pending',
      attempt: 0,
      createdAt: now,
      updatedAt: now,
      startedAt: null,
      finishedAt: null,
    }));
    await db.collection<NodeDocument>(NODES_COLLECTION).insertMany(docs);
  },

  async upsertRunNode(
    runId: string,
    nodeId: string,
    data: AiPathRunNodeUpdate & { nodeType: string; nodeTitle?: string | null }
  ) {
    await ensureIndexes();
    const db = await getMongoDb();
    const now = new Date();
    const updateData = {
      ...data,
      updatedAt: now,
    } as Record<string, unknown>;
    const result = await db
      .collection<NodeDocument>(NODES_COLLECTION)
      .findOneAndUpdate(
        { runId, nodeId },
        { $set: updateData, $setOnInsert: { _id: randomUUID(), runId, nodeId, createdAt: now } },
        { returnDocument: 'after', upsert: true }
      );
    if (!result) {
      throw new Error('Run node not found');
    }
    return toNodeRecord(result);
  },

  async listRunNodes(runId: string) {
    await ensureIndexes();
    const db = await getMongoDb();
    const docs = await db
      .collection<NodeDocument>(NODES_COLLECTION)
      .find({ runId })
      .sort({ createdAt: 1 })
      .toArray();
    return docs.map(toNodeRecord);
  },

  async createRunEvent(input: AiPathRunEventCreateInput) {
    await ensureIndexes();
    const db = await getMongoDb();
    const document: EventDocument = {
      _id: randomUUID(),
      runId: input.runId,
      level: input.level,
      message: input.message,
      metadata: input.metadata ?? null,
      createdAt: new Date(),
    };
    await db.collection<EventDocument>(EVENTS_COLLECTION).insertOne(document);
    return toEventRecord(document);
  },

  async listRunEvents(
    runId: string,
    options: { since?: Date | string | null; limit?: number } = {}
  ) {
    await ensureIndexes();
    const db = await getMongoDb();
    const filter: Record<string, unknown> = { runId };
    const sinceValue = options.since
      ? options.since instanceof Date
        ? options.since
        : new Date(options.since)
      : null;
    const since =
      sinceValue && !Number.isNaN(sinceValue.getTime()) ? sinceValue : null;
    if (since) {
      filter.createdAt = { $gt: since };
    }
    const cursor = db
      .collection<EventDocument>(EVENTS_COLLECTION)
      .find(filter)
      .sort({ createdAt: 1 });
    if (typeof options.limit === 'number') {
      cursor.limit(options.limit);
    }
    const docs = await cursor.toArray();
    return docs.map(toEventRecord);
  },

  async markStaleRunningRuns(maxAgeMs: number) {
    await ensureIndexes();
    const db = await getMongoDb();
    const cutoff = new Date(Date.now() - maxAgeMs);
    const result = await db
      .collection<RunDocument>(RUNS_COLLECTION)
      .updateMany(
        { status: 'running', startedAt: { $lt: cutoff } },
        {
          $set: {
            status: 'failed',
            finishedAt: new Date(),
            errorMessage: 'Run marked failed due to stale running state.',
          },
        }
      );
    return { count: result.modifiedCount ?? 0 };
  },
};
