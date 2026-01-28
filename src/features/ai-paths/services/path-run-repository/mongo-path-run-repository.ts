import "server-only";

import { randomUUID } from "crypto";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import type {
  AiPathRunEventRecord,
  AiPathRunNodeRecord,
  AiPathRunRecord,
} from "@/shared/types/ai-paths";
import type {
  AiPathRunCreateInput,
  AiPathRunEventCreateInput,
  AiPathRunListOptions,
  AiPathRunRepository,
  AiPathRunUpdate,
} from "@/features/ai-paths/types/path-run-repository";

const RUNS_COLLECTION = "ai_path_runs";
const NODES_COLLECTION = "ai_path_run_nodes";
const EVENTS_COLLECTION = "ai_path_run_events";

type RunDocument = {
  _id: string;
  id?: string;
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
  pathId: doc.pathId,
  pathName: doc.pathName ?? null,
  status: doc.status as AiPathRunRecord["status"],
  triggerEvent: doc.triggerEvent ?? null,
  triggerNodeId: doc.triggerNodeId ?? null,
  triggerContext: doc.triggerContext ?? null,
  graph: (doc.graph as AiPathRunRecord["graph"]) ?? null,
  runtimeState: (doc.runtimeState as AiPathRunRecord["runtimeState"]) ?? null,
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
  status: doc.status as AiPathRunNodeRecord["status"],
  attempt: doc.attempt ?? 0,
  inputs: (doc.inputs as AiPathRunNodeRecord["inputs"]) ?? null,
  outputs: (doc.outputs as AiPathRunNodeRecord["outputs"]) ?? null,
  errorMessage: doc.errorMessage ?? null,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt ?? null,
  startedAt: doc.startedAt ?? null,
  finishedAt: doc.finishedAt ?? null,
});

const toEventRecord = (doc: EventDocument): AiPathRunEventRecord => ({
  id: doc._id,
  runId: doc.runId,
  level: doc.level as AiPathRunEventRecord["level"],
  message: doc.message,
  metadata: doc.metadata ?? null,
  createdAt: doc.createdAt,
});

export const mongoPathRunRepository: AiPathRunRepository = {
  async createRun(input: AiPathRunCreateInput) {
    const db = await getMongoDb();
    const now = new Date();
    const id = randomUUID();
    const document: RunDocument = {
      _id: id,
      id,
      pathId: input.pathId,
      pathName: input.pathName ?? null,
      status: "queued",
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
    const db = await getMongoDb();
    const now = new Date();
    const updateData = { ...data, updatedAt: now } as Record<string, unknown>;
    if (updateData.nextRetryAt && typeof updateData.nextRetryAt === "string") {
      updateData.nextRetryAt = new Date(updateData.nextRetryAt);
    }
    if (updateData.deadLetteredAt && typeof updateData.deadLetteredAt === "string") {
      updateData.deadLetteredAt = new Date(updateData.deadLetteredAt);
    }
    if (updateData.startedAt && typeof updateData.startedAt === "string") {
      updateData.startedAt = new Date(updateData.startedAt);
    }
    if (updateData.finishedAt && typeof updateData.finishedAt === "string") {
      updateData.finishedAt = new Date(updateData.finishedAt);
    }
    const result = await db
      .collection<RunDocument>(RUNS_COLLECTION)
      .findOneAndUpdate(
        { $or: [{ _id: runId }, { id: runId }] },
        { $set: updateData },
        { returnDocument: "after" }
      );
    if (!result) {
      throw new Error("Run not found");
    }
    return toRunRecord(result);
  },

  async findRunById(runId: string) {
    const db = await getMongoDb();
    const doc = await db
      .collection<RunDocument>(RUNS_COLLECTION)
      .findOne({ $or: [{ _id: runId }, { id: runId }] });
    return doc ? toRunRecord(doc) : null;
  },

  async listRuns(options: AiPathRunListOptions = {}) {
    const db = await getMongoDb();
    const filter: Record<string, unknown> = {};
    if (options.pathId) {
      filter.pathId = options.pathId;
    }
    if (options.status) {
      filter.status = options.status;
    }
    const cursor = db
      .collection<RunDocument>(RUNS_COLLECTION)
      .find(filter)
      .sort({ createdAt: -1 });
    if (typeof options.offset === "number") {
      cursor.skip(options.offset);
    }
    if (typeof options.limit === "number") {
      cursor.limit(options.limit);
    }
    const [docs, total] = await Promise.all([
      cursor.toArray(),
      db.collection<RunDocument>(RUNS_COLLECTION).countDocuments(filter),
    ]);
    return { runs: docs.map(toRunRecord), total };
  },

  async claimNextQueuedRun() {
    const db = await getMongoDb();
    const now = new Date();
    const result = await db
      .collection<RunDocument>(RUNS_COLLECTION)
      .findOneAndUpdate(
        { status: "queued", $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: now } }] },
        { $set: { status: "running", startedAt: now, updatedAt: now } },
        { sort: { createdAt: 1 }, returnDocument: "after" }
      );
    if (!result) return null;
    return toRunRecord(result);
  },

  async createRunNodes(runId, nodes) {
    if (!nodes || nodes.length === 0) return;
    const db = await getMongoDb();
    const now = new Date();
    const docs: NodeDocument[] = nodes.map((node) => ({
      _id: randomUUID(),
      runId,
      nodeId: node.id,
      nodeType: node.type,
      nodeTitle: node.title ?? null,
      status: "pending",
      attempt: 0,
      createdAt: now,
      updatedAt: now,
      startedAt: null,
      finishedAt: null,
    }));
    await db.collection<NodeDocument>(NODES_COLLECTION).insertMany(docs);
  },

  async upsertRunNode(runId, nodeId, data) {
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
        { returnDocument: "after", upsert: true }
      );
    if (!result) {
      throw new Error("Run node not found");
    }
    return toNodeRecord(result);
  },

  async listRunNodes(runId: string) {
    const db = await getMongoDb();
    const docs = await db
      .collection<NodeDocument>(NODES_COLLECTION)
      .find({ runId })
      .sort({ createdAt: 1 })
      .toArray();
    return docs.map(toNodeRecord);
  },

  async createRunEvent(input: AiPathRunEventCreateInput) {
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

  async listRunEvents(runId: string) {
    const db = await getMongoDb();
    const docs = await db
      .collection<EventDocument>(EVENTS_COLLECTION)
      .find({ runId })
      .sort({ createdAt: 1 })
      .toArray();
    return docs.map(toEventRecord);
  },

  async markStaleRunningRuns(maxAgeMs: number) {
    const db = await getMongoDb();
    const cutoff = new Date(Date.now() - maxAgeMs);
    const result = await db
      .collection<RunDocument>(RUNS_COLLECTION)
      .updateMany(
        { status: "running", startedAt: { $lt: cutoff } },
        {
          $set: {
            status: "failed",
            finishedAt: new Date(),
            errorMessage: "Run marked failed due to stale running state.",
          },
        }
      );
    return { count: result.modifiedCount ?? 0 };
  },
};
