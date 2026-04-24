import 'server-only';

import type {
  AiNode,
  Edge,
  AiPathRunEventRecord,
  AiPathRunNodeRecord,
  AiPathRunRecord,
} from '@/shared/contracts/ai-paths';
import { aiNodeSchema, edgeSchema } from '@/shared/contracts/ai-paths-core';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

export const RUNS_COLLECTION = 'ai_path_runs';
export const NODES_COLLECTION = 'ai_path_run_nodes';
export const EVENTS_COLLECTION = 'ai_path_run_events';

type MongoIndexSpec = {
  collection: string;
  key: Record<string, 1 | -1>;
};

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

export const ensureIndexes = async (): Promise<void> => {
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

export const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const rawDate = record['$date'];
    if (typeof rawDate === 'string' || typeof rawDate === 'number') {
      const parsed = new Date(rawDate);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (rawDate && typeof rawDate === 'object') {
      const numberLong = (rawDate as Record<string, unknown>)['$numberLong'];
      if (typeof numberLong === 'string') {
        const parsed = new Date(Number(numberLong));
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      }
    }
    const toDateFn = (value as { toDate?: () => unknown }).toDate;
    if (typeof toDateFn === 'function') {
      const maybeDate = toDateFn();
      return toDate(maybeDate);
    }
  }
  return null;
};

export const toIsoString = (date: unknown): string | null => {
  const parsed = toDate(date);
  return parsed ? parsed.toISOString() : null;
};

export const toRequiredIsoString = (date: unknown): string => {
  return toIsoString(date) ?? new Date(0).toISOString();
};

const toRunGraph = (value: unknown): AiPathRunRecord['graph'] => {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const rawNodes = record['nodes'];
  const nodes = Array.isArray(rawNodes)
    ? rawNodes.flatMap((entry: unknown): AiNode[] => {
        const parsed = aiNodeSchema.safeParse(entry);
        return parsed.success ? [parsed.data] : [];
      })
    : [];
  const rawEdges = record['edges'];
  const edges: Edge[] = Array.isArray(rawEdges)
    ? rawEdges.flatMap((entry: unknown): Edge[] => {
        const parsed = edgeSchema.safeParse(entry);
        return parsed.success ? [parsed.data] : [];
      })
    : [];
  return { nodes, edges };
};

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
