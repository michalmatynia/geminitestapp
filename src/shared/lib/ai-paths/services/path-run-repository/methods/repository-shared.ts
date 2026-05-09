/**
 * AI Path Run Repository - Shared Helpers and Type Definitions
 * 
 * This module provides shared infrastructure for the repository, including
 * document type definitions, MongoDB index management, utility functions for 
 * date and record transformation, and database collection constants.
 */

import 'server-only';
import { randomUUID } from 'node:crypto';
import type { Db } from 'mongodb';
import { z } from 'zod';

import type {
  AiNode,
  AiPathRunEventCreateInput,
  AiPathRunEventRecord,
  AiPathRunListOptions,
  AiPathRunNodeRecord,
  AiPathRunNodeUpdate,
  AiPathRunQueueStatsOptions,
  AiPathRunRecord,
  Edge,
} from '@/shared/contracts/ai-paths';
import { aiNodeSchema, edgeSchema } from '@/shared/contracts/ai-paths-core';
import { AI_PATHS_RUN_SOURCE_VALUES } from '@/shared/lib/ai-paths/run-sources';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

/** Collection names for AI Path entities */
export const RUNS_COLLECTION = 'ai_path_runs';
export const NODES_COLLECTION = 'ai_path_run_nodes';
export const EVENTS_COLLECTION = 'ai_path_run_events';

/**
 * MongoDB index specification for the AI Paths repository collections.
 */
type MongoIndexSpec = {
  collection: string;
  key: Record<string, 1 | -1>;
};

/**
 * MongoDB document representation for an AI Path run.
 */
export type RunDocument = {
  _id: string;
  id?: string;
  userId?: string | null;
  pathId: string | null;
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
  nextRetryAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
  startedAt?: Date | string | null;
  finishedAt?: Date | string | null;
};

/**
 * MongoDB document representation for an AI Path run node.
 */
export type NodeDocument = {
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
  createdAt: Date | string;
  updatedAt?: Date | string;
  startedAt?: Date | string | null;
  finishedAt?: Date | string | null;
};

/**
 * MongoDB document representation for an AI Path run event.
 */
export type EventDocument = {
  _id: string;
  runId: string;
  nodeId?: string | null;
  nodeType?: string | null;
  nodeTitle?: string | null;
  status?: string | null;
  iteration?: number | null;
  level: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  createdAt: Date | string;
};

/**
 * List of database indexes for the repository.
 */
export const AI_PATHS_MONGO_INDEXES: MongoIndexSpec[] = [
  { collection: RUNS_COLLECTION, key: { id: 1 } },
  { collection: RUNS_COLLECTION, key: { userId: 1 } },
  { collection: RUNS_COLLECTION, key: { pathId: 1 } },
  { collection: RUNS_COLLECTION, key: { createdAt: -1 } },
  { collection: RUNS_COLLECTION, key: { pathId: 1, status: 1, createdAt: -1 } },
  { collection: RUNS_COLLECTION, key: { status: 1, createdAt: -1 } },
  { collection: RUNS_COLLECTION, key: { status: 1, updatedAt: 1 } },
  { collection: RUNS_COLLECTION, key: { userId: 1, createdAt: -1 } },
  { collection: RUNS_COLLECTION, key: { userId: 1, status: 1, createdAt: -1 } },
  { collection: RUNS_COLLECTION, key: { status: 1, nextRetryAt: 1, createdAt: 1 } },
  { collection: RUNS_COLLECTION, key: { 'meta.requestId': 1, status: 1, createdAt: -1 } },
  { collection: NODES_COLLECTION, key: { runId: 1 } },
  { collection: NODES_COLLECTION, key: { runId: 1, nodeId: 1 } },
  { collection: NODES_COLLECTION, key: { runId: 1, createdAt: 1 } },
  { collection: NODES_COLLECTION, key: { runId: 1, updatedAt: 1, nodeId: 1 } },
  { collection: EVENTS_COLLECTION, key: { runId: 1, createdAt: 1 } },
];

let indexesReady = false;
let indexesPromise: Promise<void> | null = null;
const validDateSchema = z.date().refine((date) => !Number.isNaN(date.getTime()));
const dateInputSchema = z.union([
  z.date(),
  z.string().transform((value) => new Date(value)),
  z.number().transform((value) => new Date(value)),
  z.object({ $date: z.union([z.string(), z.number()]) }).transform(({ $date }) => new Date($date)),
  z
    .object({ $date: z.object({ $numberLong: z.string() }) })
    .transform(({ $date }) => new Date(Number($date.$numberLong))),
  z.object({ toDate: z.function() }).transform((value) => value.toDate() as Date),
]).pipe(validDateSchema);
const runGraphSchema = z
  .object({
    nodes: z.array(z.unknown()).catch([]),
    edges: z.array(z.unknown()).catch([]),
  })
  .passthrough()
  .transform(({ nodes, edges }) => ({
    nodes: nodes.flatMap((entry): AiNode[] => {
      const parsed = aiNodeSchema.safeParse(entry);
      return parsed.success ? [parsed.data] : [];
    }),
    edges: edges.flatMap((entry): Edge[] => {
      const parsed = edgeSchema.safeParse(entry);
      return parsed.success ? [parsed.data] : [];
    }),
  }));
const stringDateSchema = z.string().transform((value) => new Date(value));

/**
 * Ensures that all required database indexes are created.
 */
export const ensureIndexes = async (): Promise<void> => {
  if (indexesReady) return;
  if (!indexesPromise) {
    indexesPromise = (async (): Promise<void> => {
      const db = await getMongoDb();
      await Promise.all(
        AI_PATHS_MONGO_INDEXES.map((index) =>
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

/**
 * Safely converts a value to a Date object, handling strings, numbers, and MongoDB BSON Date objects.
 * 
 * @param {unknown} value - The input value.
 * @returns {Date | null} The parsed Date object or null.
 */
export const toDate = (value: unknown): Date | null => {
  return dateInputSchema.catch(null).parse(value);
};

/**
 * Converts a date input to an ISO string.
 * 
 * @param {unknown} date - Input date value.
 * @returns {string | null} The ISO string or null.
 */
export const toIsoString = (date: unknown): string | null => {
  const parsed = toDate(date);
  return parsed ? parsed.toISOString() : null;
};

/**
 * Converts a date input to an ISO string, defaulting to epoch if invalid.
 * 
 * @param {unknown} date - Input date value.
 * @returns {string} The ISO string.
 */
export const toRequiredIsoString = (date: unknown): string => {
  return toIsoString(date) ?? new Date(0).toISOString();
};

/**
 * Transforms run graph nodes/edges into valid UI records.
 */
const toRunGraph = (value: unknown): AiPathRunRecord['graph'] => {
  return runGraphSchema.catch(null).parse(value);
};

/**
 * Maps a MongoDB RunDocument to the UI-compatible AiPathRunRecord.
 */
export const toRunRecord = (doc: RunDocument): AiPathRunRecord => ({
  id: doc.id || doc._id,
  userId: doc.userId ?? null,
  pathId: doc.pathId ?? null,
  pathName: doc.pathName ?? null,
  prompt: null,
  status: doc.status as AiPathRunRecord['status'],
  triggerEvent: doc.triggerEvent ?? null,
  triggerNodeId: doc.triggerNodeId ?? null,
  triggerContext: doc.triggerContext ?? undefined,
  graph: toRunGraph(doc.graph),
  runtimeState: (doc.runtimeState as unknown) ?? null,
  meta: doc.meta ?? null,
  context: undefined,
  result: undefined,
  entityId: doc.entityId ?? null,
  entityType: doc.entityType ?? null,
  errorMessage: doc.errorMessage ?? null,
  retryCount: doc.retryCount ?? 0,
  maxAttempts: doc.maxAttempts ?? 3,
  nextRetryAt: toIsoString(doc.nextRetryAt),
  createdAt: toRequiredIsoString(doc.createdAt),
  updatedAt: toIsoString(doc.updatedAt),
  startedAt: toIsoString(doc.startedAt),
  finishedAt: toIsoString(doc.finishedAt),
});

/**
 * Maps a MongoDB NodeDocument to the UI-compatible AiPathRunNodeRecord.
 */
export const toNodeRecord = (doc: NodeDocument): AiPathRunNodeRecord => ({
  id: doc._id,
  runId: doc.runId,
  nodeId: doc.nodeId,
  nodeType: doc.nodeType,
  nodeTitle: doc.nodeTitle ?? null,
  status: doc.status as AiPathRunNodeRecord['status'],
  attempt: doc.attempt ?? 0,
  inputs: (doc.inputs as AiPathRunNodeRecord['inputs']) ?? undefined,
  outputs: (doc.outputs as AiPathRunNodeRecord['outputs']) ?? undefined,
  errorMessage: doc.errorMessage ?? null,
  createdAt: toRequiredIsoString(doc.createdAt),
  updatedAt: toIsoString(doc.updatedAt),
  startedAt: toIsoString(doc.startedAt),
  finishedAt: toIsoString(doc.finishedAt),
});

/**
 * Maps a MongoDB EventDocument to the UI-compatible AiPathRunEventRecord.
 */
export const toEventRecord = (doc: EventDocument): AiPathRunEventRecord => ({
  id: doc._id,
  runId: doc.runId,
  nodeId: doc.nodeId ?? null,
  nodeType: doc.nodeType ?? null,
  nodeTitle: doc.nodeTitle ?? null,
  status: doc.status ?? null,
  iteration: doc.iteration ?? null,
  level: doc.level as AiPathRunEventRecord['level'],
  message: doc.message,
  metadata: doc.metadata ?? null,
  createdAt: toRequiredIsoString(doc.createdAt),
  updatedAt: null,
});

export const createRunEvent = async (
  input: AiPathRunEventCreateInput
): Promise<AiPathRunEventRecord> => {
  await ensureIndexes();
  const db = await getMongoDb();
  const now = new Date();
  const document: EventDocument = {
    _id: randomUUID(),
    runId: input.runId,
    nodeId: input.nodeId ?? null,
    nodeType: input.nodeType ?? null,
    nodeTitle: input.nodeTitle ?? null,
    status: input.status ?? null,
    iteration: input.iteration ?? null,
    level: input.level,
    message: input.message,
    metadata: input.metadata ?? null,
    createdAt: now,
  };

  await db.collection<EventDocument>(EVENTS_COLLECTION).insertOne(document);
  return toEventRecord(document);
};

export const createRunNodes = async (runId: string, nodes: AiNode[]): Promise<void> => {
  await ensureIndexes();
  if (nodes.length === 0) return;

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
};

export const upsertRunNode = async (
  runId: string,
  nodeId: string,
  data: AiPathRunNodeUpdate & { nodeType: string; nodeTitle?: string | null }
): Promise<AiPathRunNodeRecord> => {
  await ensureIndexes();
  const db = await getMongoDb();
  const now = new Date();
  const updateData: Record<string, unknown> = {
    ...data,
    updatedAt: now,
  };

  const dateFields: Array<keyof typeof updateData> = ['startedAt', 'finishedAt'];
  for (const field of dateFields) {
    const parsed = stringDateSchema.safeParse(updateData[field]);
    if (parsed.success) {
      updateData[field] = parsed.data;
    }
  }

  const collection = db.collection<NodeDocument>(NODES_COLLECTION);
  const result = (await collection.findOneAndUpdate(
    { runId, nodeId },
    { $set: updateData, $setOnInsert: { runId, nodeId, createdAt: now } },
    { returnDocument: 'after', upsert: true }
  )) as NodeDocument | { value: NodeDocument | null } | null;

  const value =
    result && typeof result === 'object' && 'value' in result ? result.value : result;
  if (value === null) {
    // Node with the specified ID does not exist in the database
    throw new Error('Run node not found');
  }

  return toNodeRecord(value);
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseFilterDate = (value: Date | string | null | undefined): Date | null => {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date;
};

export const RUN_LIST_PROJECTION = {
  _id: 1,
  id: 1,
  userId: 1,
  pathId: 1,
  pathName: 1,
  status: 1,
  triggerEvent: 1,
  triggerNodeId: 1,
  meta: 1,
  entityId: 1,
  entityType: 1,
  errorMessage: 1,
  retryCount: 1,
  maxAttempts: 1,
  nextRetryAt: 1,
  createdAt: 1,
  updatedAt: 1,
  startedAt: 1,
  finishedAt: 1,
} as const;

export const buildRunFilter = (options: AiPathRunListOptions = {}): Record<string, unknown> => {
  const andFilters: Record<string, unknown>[] = [];
  if (options.id) {
    andFilters.push({ $or: [{ id: options.id }, { _id: options.id }] });
  }
  if (options.userId) {
    andFilters.push({ userId: options.userId });
  }
  if (options.pathId) {
    andFilters.push({ pathId: options.pathId });
  }
  if (options.requestId?.trim()) {
    andFilters.push({ 'meta.requestId': options.requestId.trim() });
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
      } else {
        andFilters.push({ 'meta.source': { $ne: source } });
      }
    } else if (source === 'ai_paths_ui') {
      andFilters.push({ 'meta.source': { $in: [...AI_PATHS_RUN_SOURCE_VALUES] } });
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

const buildRunIdConstraint = (runIds: string[]): Record<string, unknown> => ({
  $or: [{ _id: { $in: runIds } }, { id: { $in: runIds } }],
});

export const appendRunIdConstraint = (
  filter: Record<string, unknown>,
  runIds: string[]
): Record<string, unknown> => {
  const runIdConstraint = buildRunIdConstraint(runIds);
  const existingAnd = Array.isArray(filter['$and'])
    ? (filter['$and'] as Record<string, unknown>[])
    : null;
  if (existingAnd) {
    return { $and: [...existingAnd, runIdConstraint] };
  }
  if (Object.keys(filter).length === 0) return runIdConstraint;
  return { $and: [filter, runIdConstraint] };
};

export const resolveRunIdsForNodeFilter = async (db: Db, nodeId: string): Promise<string[]> => {
  const runIds = await db.collection<NodeDocument>(NODES_COLLECTION).distinct('runId', { nodeId });
  return runIds.filter(
    (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
  );
};

export const buildQueueStatsFilter = (
  options: AiPathRunQueueStatsOptions = {}
): Record<string, unknown> => {
  const now = new Date();
  const baseFilter = buildRunFilter({
    ...(options.userId ? { userId: options.userId } : {}),
    ...(options.pathId ? { pathId: options.pathId } : {}),
    ...(options.source ? { source: options.source, sourceMode: options.sourceMode } : {}),
    status: 'queued',
  });
  const retryFilter = {
    $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: now } }],
  };

  return Object.keys(baseFilter).length > 0
    ? { $and: [baseFilter, retryFilter] }
    : { status: 'queued', ...retryFilter };
};
