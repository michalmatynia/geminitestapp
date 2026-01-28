import "server-only";

import prisma from "@/shared/lib/db/prisma";
import type {
  AiPathRunEventRecord,
  AiPathRunNodeRecord,
  AiPathRunRecord,
} from "@/shared/types/ai-paths";
import type {
  AiPathRunCreateInput,
  AiPathRunEventCreateInput,
  AiPathRunNodeUpdate,
  AiPathRunListOptions,
  AiPathRunRepository,
  AiPathRunUpdate,
} from "@/features/ai-paths/types/path-run-repository";

const prismaAny = prisma as unknown as {
  aiPathRun?: {
    create: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
    findUnique: (args: unknown) => Promise<unknown | null>;
    findMany: (args: unknown) => Promise<unknown[]>;
    findFirst: (args: unknown) => Promise<unknown | null>;
    count: (args: unknown) => Promise<number>;
  };
  aiPathRunNode?: {
    createMany: (args: unknown) => Promise<unknown>;
    upsert: (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<unknown[]>;
  };
  aiPathRunEvent?: {
    create: (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<unknown[]>;
  };
};

const mapRun = (run: any): AiPathRunRecord => ({
  id: run.id,
  pathId: run.pathId,
  pathName: run.pathName ?? null,
  status: run.status,
  triggerEvent: run.triggerEvent ?? null,
  triggerNodeId: run.triggerNodeId ?? null,
  triggerContext: (run.triggerContext as AiPathRunRecord["triggerContext"]) ?? null,
  graph: (run.graph as AiPathRunRecord["graph"]) ?? null,
  runtimeState: (run.runtimeState as AiPathRunRecord["runtimeState"]) ?? null,
  meta: (run.meta as AiPathRunRecord["meta"]) ?? null,
  entityId: run.entityId ?? null,
  entityType: run.entityType ?? null,
  errorMessage: run.errorMessage ?? null,
  retryCount: run.retryCount ?? 0,
  maxAttempts: run.maxAttempts ?? 3,
  nextRetryAt: run.nextRetryAt ?? null,
  deadLetteredAt: run.deadLetteredAt ?? null,
  createdAt: run.createdAt,
  updatedAt: run.updatedAt ?? null,
  startedAt: run.startedAt ?? null,
  finishedAt: run.finishedAt ?? null,
});

const mapNode = (node: any): AiPathRunNodeRecord => ({
  id: node.id,
  runId: node.runId,
  nodeId: node.nodeId,
  nodeType: node.nodeType,
  nodeTitle: node.nodeTitle ?? null,
  status: node.status,
  attempt: node.attempt ?? 0,
  inputs: (node.inputs as AiPathRunNodeRecord["inputs"]) ?? null,
  outputs: (node.outputs as AiPathRunNodeRecord["outputs"]) ?? null,
  errorMessage: node.errorMessage ?? null,
  createdAt: node.createdAt,
  updatedAt: node.updatedAt ?? null,
  startedAt: node.startedAt ?? null,
  finishedAt: node.finishedAt ?? null,
});

const mapEvent = (event: any): AiPathRunEventRecord => ({
  id: event.id,
  runId: event.runId,
  level: event.level,
  message: event.message,
  metadata: (event.metadata as AiPathRunEventRecord["metadata"]) ?? null,
  createdAt: event.createdAt,
});

const ensureModels = () => {
  if (!prismaAny.aiPathRun || !prismaAny.aiPathRunNode || !prismaAny.aiPathRunEvent) {
    throw new Error("AiPath run models not initialized in Prisma.");
  }
};

export const prismaPathRunRepository: AiPathRunRepository = {
  async createRun(input: AiPathRunCreateInput) {
    ensureModels();
    const run = await prismaAny.aiPathRun!.create({
      data: {
        pathId: input.pathId,
        pathName: input.pathName ?? null,
        status: "queued",
        triggerEvent: input.triggerEvent ?? null,
        triggerNodeId: input.triggerNodeId ?? null,
        triggerContext: input.triggerContext ?? null,
        graph: input.graph ?? null,
        runtimeState: input.runtimeState ?? null,
        meta: input.meta ?? null,
        entityId: input.entityId ?? null,
        entityType: input.entityType ?? null,
        retryCount: input.retryCount ?? 0,
        maxAttempts: input.maxAttempts ?? 3,
        nextRetryAt: input.nextRetryAt ?? null,
      },
    });
    return mapRun(run);
  },

  async updateRun(runId: string, data: AiPathRunUpdate) {
    ensureModels();
    const run = await prismaAny.aiPathRun!.update({
      where: { id: runId },
      data: data as Record<string, unknown>,
    });
    return mapRun(run);
  },

  async findRunById(runId: string) {
    ensureModels();
    const run = await prismaAny.aiPathRun!.findUnique({
      where: { id: runId },
    });
    return run ? mapRun(run) : null;
  },

  async listRuns(options: AiPathRunListOptions = {}) {
    ensureModels();
    const where = {
      ...(options.pathId ? { pathId: options.pathId } : {}),
      ...(options.status ? { status: options.status } : {}),
    };
    const [runs, total] = await Promise.all([
      prismaAny.aiPathRun!.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...(typeof options.offset === "number" ? { skip: options.offset } : {}),
        ...(typeof options.limit === "number" ? { take: options.limit } : {}),
      }),
      prismaAny.aiPathRun!.count({ where }),
    ]);
    return { runs: runs.map(mapRun), total };
  },

  async claimNextQueuedRun() {
    ensureModels();
    const now = new Date();
    const run = await prismaAny.aiPathRun!.findFirst({
      where: {
        status: "queued",
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
      },
      orderBy: { createdAt: "asc" },
    });
    if (!run) return null;
    const updated = await prismaAny.aiPathRun!.update({
      where: { id: run.id },
      data: { status: "running", startedAt: new Date() },
    });
    return mapRun(updated);
  },

  async createRunNodes(runId, nodes) {
    ensureModels();
    if (!nodes || nodes.length === 0) return;
    const data = nodes.map((node) => ({
      runId,
      nodeId: node.id,
      nodeType: node.type,
      nodeTitle: node.title ?? null,
      status: "pending",
      attempt: 0,
    }));
    await prismaAny.aiPathRunNode!.createMany({ data });
  },

  async upsertRunNode(runId, nodeId, data) {
    ensureModels();
    const node = await prismaAny.aiPathRunNode!.upsert({
      where: { runId_nodeId: { runId, nodeId } },
      update: data as Record<string, unknown>,
      create: {
        runId,
        nodeId,
        nodeType: data.nodeType,
        nodeTitle: data.nodeTitle ?? null,
        status: data.status ?? "pending",
        attempt: data.attempt ?? 0,
        inputs: data.inputs ?? null,
        outputs: data.outputs ?? null,
        errorMessage: data.errorMessage ?? null,
        startedAt: data.startedAt ?? null,
        finishedAt: data.finishedAt ?? null,
      },
    });
    return mapNode(node);
  },

  async listRunNodes(runId: string) {
    ensureModels();
    const nodes = await prismaAny.aiPathRunNode!.findMany({
      where: { runId },
      orderBy: { createdAt: "asc" },
    });
    return nodes.map(mapNode);
  },

  async createRunEvent(input: AiPathRunEventCreateInput) {
    ensureModels();
    const event = await prismaAny.aiPathRunEvent!.create({
      data: {
        runId: input.runId,
        level: input.level,
        message: input.message,
        metadata: input.metadata ?? null,
      },
    });
    return mapEvent(event);
  },

  async listRunEvents(runId: string) {
    ensureModels();
    const events = await prismaAny.aiPathRunEvent!.findMany({
      where: { runId },
      orderBy: { createdAt: "asc" },
    });
    return events.map(mapEvent);
  },

  async markStaleRunningRuns(maxAgeMs: number) {
    ensureModels();
    const cutoff = new Date(Date.now() - maxAgeMs);
    const result = await prismaAny.aiPathRun!.updateMany({
      where: { status: "running", startedAt: { lt: cutoff } },
      data: {
        status: "failed",
        finishedAt: new Date(),
        errorMessage: "Run marked failed due to stale running state.",
      },
    });
    return { count: (result as { count?: number }).count ?? 0 };
  },
};
