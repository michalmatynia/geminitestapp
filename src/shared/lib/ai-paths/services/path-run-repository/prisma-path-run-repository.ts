import 'server-only';

import { Prisma, AiPathRunEventLevel } from '@/shared/lib/db/prisma-client';

import { AI_PATHS_RUN_SOURCE_VALUES } from '@/shared/lib/ai-paths/run-sources';
import type {
  AiNode,
  AiPathRunCreateInput,
  AiPathRunEventCreateInput,
  AiPathRunEventRecord,
  AiPathRunEventListOptions,
  AiPathRunListOptions,
  AiPathRunQueueStatsOptions,
  AiPathRunNodeRecord,
  AiPathRunRepository,
  AiPathRunRecord,
  AiPathRunStatus,
  AiPathRunUpdate,
  AiPathRunNodeUpdate,
} from '@/shared/contracts/ai-paths';
import prisma from '@/shared/lib/db/prisma';

const toIsoString = (date: Date | null | undefined): string | null => {
  if (date instanceof Date) return date.toISOString();
  if (typeof date === 'string') return date;
  return null;
};

const toNullableJsonInput = (
  value: unknown
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined => {
  if (value === null || value === undefined) return undefined;
  return value as Prisma.InputJsonValue;
};

type PrismaRunNodeStatus = Prisma.AiPathRunNodeCreateInput['status'];

const toPrismaRunNodeStatus = (value: unknown): PrismaRunNodeStatus => {
  if (value === 'completed' || value === 'cached' || value === 'failed' || value === 'skipped') {
    return value;
  }
  if (value === 'blocked') return 'blocked';
  if (value === 'running' || value === 'processing' || value === 'polling') {
    return 'running';
  }
  if (value === 'waiting_callback' || value === 'advance_pending') {
    return 'running';
  }
  if (value === 'canceled' || value === 'timeout') {
    return 'failed';
  }
  return 'pending';
};

interface MapRunInput {
  id: string | number;
  userId?: string | null;
  pathId?: string | null;
  pathName?: string | null;
  status?: string | null;
  triggerEvent?: string | null;
  triggerNodeId?: string | null;
  triggerContext?: unknown;
  graph?: unknown;
  runtimeState?: unknown;
  meta?: unknown;
  entityId?: string | null;
  entityType?: string | null;
  errorMessage?: string | null;
  retryCount?: number;
  maxAttempts?: number;
  nextRetryAt?: Date | string | null;
  deadLetteredAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt?: Date | string | null;
  startedAt?: Date | string | null;
  finishedAt?: Date | string | null;
}

const mapRun = (run: MapRunInput): AiPathRunRecord => {
  return {
    id: String(run.id),
    userId: run.userId ?? null,
    pathId: run.pathId ?? null,
    pathName: run.pathName ?? null,
    prompt: null,
    status: (run.status as AiPathRunRecord['status']) || 'queued',
    triggerEvent: run.triggerEvent ?? null,
    triggerNodeId: run.triggerNodeId ?? null,
    triggerContext: (run.triggerContext as AiPathRunRecord['triggerContext']) ?? undefined,
    graph: (run.graph as AiPathRunRecord['graph']) ?? undefined,
    runtimeState: run.runtimeState,
    meta: (run.meta as AiPathRunRecord['meta']) ?? undefined,
    context: undefined,
    result: undefined,
    entityId: run.entityId ?? null,
    entityType: run.entityType ?? null,
    errorMessage: run.errorMessage ?? null,
    retryCount: run.retryCount ?? 0,
    maxAttempts: run.maxAttempts ?? 3,
    nextRetryAt: toIsoString(run.nextRetryAt as Date),
    deadLetteredAt: toIsoString(run.deadLetteredAt as Date),
    createdAt: run.createdAt instanceof Date ? run.createdAt.toISOString() : String(run.createdAt),
    updatedAt: toIsoString(run.updatedAt as Date),
    startedAt: toIsoString(run.startedAt as Date),
    finishedAt: toIsoString(run.finishedAt as Date),
  };
};

interface MapNodeInput {
  id: string | number;
  runId: string | number;
  nodeId: string;
  nodeType: string;
  nodeTitle?: string | null;
  status?: string | null;
  attempt?: number;
  inputs?: unknown;
  outputs?: unknown;
  errorMessage?: string | null;
  createdAt: Date | string;
  updatedAt?: Date | string | null;
  startedAt?: Date | string | null;
  finishedAt?: Date | string | null;
}

const mapNode = (node: MapNodeInput): AiPathRunNodeRecord => {
  return {
    id: String(node.id),
    runId: String(node.runId),
    nodeId: String(node.nodeId),
    nodeType: String(node.nodeType),
    nodeTitle: node.nodeTitle ?? null,
    status: (node.status as AiPathRunNodeRecord['status']) || 'pending',
    attempt: node.attempt ?? 0,
    inputs: (node.inputs as Record<string, unknown> | null | undefined) ?? undefined,
    outputs: (node.outputs as Record<string, unknown> | null | undefined) ?? undefined,
    errorMessage: node.errorMessage ?? null,
    createdAt:
      node.createdAt instanceof Date ? node.createdAt.toISOString() : String(node.createdAt),
    updatedAt: toIsoString(node.updatedAt as Date),
    startedAt: toIsoString(node.startedAt as Date),
    finishedAt: toIsoString(node.finishedAt as Date),
  };
};

interface MapEventInput {
  id: string | number;
  runId: string | number;
  level: string;
  message: string;
  metadata?: unknown;
  createdAt: Date | string;
}

const mapEvent = (event: MapEventInput): AiPathRunEventRecord => {
  const metadata = (event.metadata as Record<string, unknown>) ?? null;
  return {
    id: String(event.id),
    runId: String(event.runId),
    nodeId: (metadata?.['nodeId'] as string) ?? null,
    nodeType: (metadata?.['nodeType'] as string) ?? null,
    nodeTitle: (metadata?.['nodeTitle'] as string) ?? null,
    status: (metadata?.['status'] as string) ?? null,
    iteration: (metadata?.['iteration'] as number) ?? null,
    level: event.level as AiPathRunEventRecord['level'],
    message: String(event.message),
    metadata: metadata as AiPathRunEventRecord['metadata'],
    createdAt:
      event.createdAt instanceof Date ? event.createdAt.toISOString() : String(event.createdAt),
    updatedAt:
      event.createdAt instanceof Date ? event.createdAt.toISOString() : String(event.createdAt),
  };
};

const parseFilterDate = (value: Date | string | null | undefined): Date | null => {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date;
};

const RUN_LIST_SELECT = {
  id: true,
  userId: true,
  pathId: true,
  pathName: true,
  status: true,
  triggerEvent: true,
  triggerNodeId: true,
  meta: true,
  entityId: true,
  entityType: true,
  errorMessage: true,
  retryCount: true,
  maxAttempts: true,
  nextRetryAt: true,
  deadLetteredAt: true,
  createdAt: true,
  updatedAt: true,
  startedAt: true,
  finishedAt: true,
} as const;

const buildRunWhere = (options: AiPathRunListOptions = {}): Prisma.AiPathRunWhereInput => {
  const query = options.query?.trim();
  const statuses = Array.isArray(options.statuses) ? options.statuses.filter(Boolean) : [];
  const source = options.source?.trim();
  const sourceMode = options.sourceMode ?? 'include';
  const createdAfter = parseFilterDate(options.createdAfter);
  const createdBefore = parseFilterDate(options.createdBefore);
  const andFilters: Prisma.AiPathRunWhereInput[] = [];

  if (options.userId) {
    andFilters.push({ userId: options.userId });
  }
  if (options.pathId) {
    andFilters.push({ pathId: options.pathId });
  }
  if (options.nodeId?.trim()) {
    andFilters.push({
      nodes: {
        some: {
          nodeId: options.nodeId.trim(),
        },
      },
    });
  }
  if (options.requestId?.trim()) {
    andFilters.push({ meta: { path: ['requestId'], equals: options.requestId.trim() } });
  }
  if (statuses.length > 0) {
    andFilters.push({ status: { in: statuses } });
  } else if (options.status) {
    andFilters.push({ status: options.status });
  }
  if (source) {
    if (sourceMode === 'exclude') {
      if (source === 'ai_paths_ui') {
        andFilters.push({
          AND: [
            ...AI_PATHS_RUN_SOURCE_VALUES.map((value) => ({
              NOT: { meta: { path: ['source'], equals: value } },
            })),
          ],
        });
      } else {
        andFilters.push({
          AND: [{ NOT: { meta: { path: ['source'], equals: source } } }],
        });
      }
    } else if (source === 'ai_paths_ui') {
      andFilters.push({
        OR: AI_PATHS_RUN_SOURCE_VALUES.map((value) => ({
          meta: { path: ['source'], equals: value },
        })),
      });
    } else {
      andFilters.push({ meta: { path: ['source'], equals: source } });
    }
  }
  if (createdAfter || createdBefore) {
    andFilters.push({
      createdAt: {
        ...(createdAfter ? { gte: createdAfter } : {}),
        ...(createdBefore ? { lte: createdBefore } : {}),
      },
    });
  }
  if (query) {
    andFilters.push({
      OR: [
        { id: { contains: query, mode: 'insensitive' } },
        { pathId: { contains: query, mode: 'insensitive' } },
        { pathName: { contains: query, mode: 'insensitive' } },
        { entityId: { contains: query, mode: 'insensitive' } },
        { errorMessage: { contains: query, mode: 'insensitive' } },
      ],
    });
  }

  return andFilters.length > 0 ? { AND: andFilters } : {};
};

export const __testOnly = {
  buildRunWhere,
};

export const prismaPathRunRepository: AiPathRunRepository = {
  async createRun(input: AiPathRunCreateInput): Promise<AiPathRunRecord> {
    const run = await prisma.aiPathRun.create({
      data: {
        userId: input.userId ?? null,
        pathId: input.pathId ?? '',
        pathName: input.pathName ?? null,
        status: input.status ?? 'queued',
        triggerEvent: input.triggerEvent ?? null,
        triggerNodeId: input.triggerNodeId ?? null,
        triggerContext: toNullableJsonInput(input.triggerContext),
        graph: toNullableJsonInput(input.graph),
        runtimeState: toNullableJsonInput(input.runtimeState),
        meta: toNullableJsonInput(input.meta),
        entityId: input.entityId ?? null,
        entityType: input.entityType ?? null,
        retryCount: input.retryCount ?? 0,
        maxAttempts: input.maxAttempts ?? 3,
        nextRetryAt: input.nextRetryAt ?? null,
      },
    });
    return mapRun(run);
  },

  async getRunByRequestId(pathId: string, requestId: string): Promise<AiPathRunRecord | null> {
    const run = await prisma.aiPathRun.findFirst({
      where: {
        pathId,
        meta: {
          path: ['requestId'],
          equals: requestId,
        },
      },
    });
    return run ? mapRun(run) : null;
  },

  async updateRun(runId: string, data: AiPathRunUpdate): Promise<AiPathRunRecord> {
    const updated = await prisma.aiPathRun.updateMany({
      where: { id: runId },
      data: data as Prisma.AiPathRunUpdateInput,
    });
    if (!updated.count) {
      throw new Error(`Run not found: ${runId}`);
    }
    const run = await prisma.aiPathRun.findUnique({
      where: { id: runId },
    });
    if (!run) {
      throw new Error(`Run not found after update: ${runId}`);
    }
    return mapRun(run);
  },

  async updateRunIfStatus(
    runId: string,
    expectedStatuses,
    data: AiPathRunUpdate
  ): Promise<AiPathRunRecord | null> {
    const statuses = expectedStatuses.filter(Boolean);
    if (statuses.length === 0) return null;
    const updated = await prisma.aiPathRun.updateMany({
      where: {
        id: runId,
        status: { in: statuses },
      },
      data: { ...(data as Prisma.AiPathRunUpdateInput), updatedAt: new Date() },
    });
    if (!updated.count) {
      return null;
    }
    const fresh = await prisma.aiPathRun.findUnique({ where: { id: runId } });
    return fresh ? mapRun(fresh) : null;
  },

  async claimRunForProcessing(runId: string): Promise<AiPathRunRecord | null> {
    const now = new Date();
    const startedAt = new Date();
    const updated = await prisma.aiPathRun.updateMany({
      where: {
        id: runId,
        status: 'queued',
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
      },
      data: {
        status: 'running',
        startedAt,
        updatedAt: now,
      },
    });
    if (!updated.count) return null;
    const fresh = await prisma.aiPathRun.findUnique({ where: { id: runId } });
    return fresh ? mapRun(fresh) : null;
  },

  async findRunById(runId: string): Promise<AiPathRunRecord | null> {
    const run = await prisma.aiPathRun.findUnique({
      where: { id: runId },
    });
    return run ? mapRun(run) : null;
  },

  async deleteRun(runId: string): Promise<boolean> {
    try {
      await prisma.aiPathRun.delete({ where: { id: runId } });
      return true;
    } catch {
      return false;
    }
  },

  async listRuns(
    options: AiPathRunListOptions = {}
  ): Promise<{ runs: AiPathRunRecord[]; total: number }> {
    const where = buildRunWhere(options);
    const includeTotal = options.includeTotal !== false;
    const runs = await prisma.aiPathRun.findMany({
      select: RUN_LIST_SELECT,
      where,
      orderBy: { createdAt: 'desc' },
      ...(typeof options.offset === 'number' ? { skip: options.offset } : {}),
      ...(typeof options.limit === 'number' ? { take: options.limit } : {}),
    });
    if (!includeTotal) {
      return { runs: runs.map(mapRun), total: runs.length };
    }
    const total = await prisma.aiPathRun.count({ where });
    return { runs: runs.map(mapRun), total };
  },

  async deleteRuns(options: AiPathRunListOptions = {}): Promise<{ count: number }> {
    const where = buildRunWhere(options);
    const result = await prisma.aiPathRun.deleteMany({ where });
    return { count: result.count ?? 0 };
  },

  async claimNextQueuedRun(): Promise<AiPathRunRecord | null> {
    const now = new Date();
    const run = await prisma.aiPathRun.findFirst({
      where: {
        status: 'queued',
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
      },
      orderBy: { createdAt: 'asc' },
    });
    if (!run) return null;
    return prismaPathRunRepository.claimRunForProcessing(run.id);
  },

  async getQueueStats(
    options: AiPathRunQueueStatsOptions = {}
  ): Promise<{ queuedCount: number; oldestQueuedAt: Date | null }> {
    const now = new Date();
    const baseWhere = buildRunWhere({
      ...(options.userId ? { userId: options.userId } : {}),
      ...(options.pathId ? { pathId: options.pathId } : {}),
      ...(options.source ? { source: options.source, sourceMode: options.sourceMode } : {}),
      status: 'queued',
    });
    const where: Prisma.AiPathRunWhereInput =
      Object.keys(baseWhere).length > 0
        ? {
          AND: [baseWhere, { OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }] }],
        }
        : {
          status: 'queued',
          OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
        };
    const [queuedCount, oldest] = await Promise.all([
      prisma.aiPathRun.count({ where }),
      prisma.aiPathRun.findFirst({
        where,
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
    ]);
    return { queuedCount, oldestQueuedAt: oldest?.createdAt ?? null };
  },

  async createRunNodes(runId: string, nodes: AiNode[]): Promise<void> {
    if (!nodes || nodes.length === 0) return;
    const data = nodes.map((node: AiNode) => ({
      runId,
      nodeId: node.id,
      nodeType: node.type,
      nodeTitle: node.title ?? null,
      status: 'pending' as const,
      attempt: 0,
    }));
    await prisma.aiPathRunNode.createMany({ data });
  },

  async upsertRunNode(
    runId: string,
    nodeId: string,
    nodeData: AiPathRunNodeUpdate & { nodeType: string; nodeTitle?: string | null }
  ): Promise<AiPathRunNodeRecord> {
    const status = toPrismaRunNodeStatus(nodeData.status);
    const node = await prisma.aiPathRunNode.upsert({
      where: { runId_nodeId: { runId, nodeId } },
      update: nodeData as Prisma.AiPathRunNodeUpdateInput,
      create: {
        runId,
        nodeId,
        nodeType: nodeData.nodeType,
        nodeTitle: nodeData.nodeTitle ?? null,

        status,
        attempt: nodeData.attempt ?? 0,
        inputs: toNullableJsonInput(nodeData.inputs),
        outputs: toNullableJsonInput(nodeData.outputs),
        errorMessage: nodeData.errorMessage ?? null,
        startedAt: nodeData.startedAt ?? null,
        finishedAt: nodeData.finishedAt ?? null,
      },
    });
    return mapNode(node);
  },

  async listRunNodes(runId: string): Promise<AiPathRunNodeRecord[]> {
    const nodes = await prisma.aiPathRunNode.findMany({
      where: { runId },
      orderBy: { createdAt: 'asc' },
    });
    return nodes.map(mapNode);
  },

  async listRunNodesSince(
    runId: string,
    cursor: { updatedAt: Date | string; nodeId: string },
    options: { limit?: number } = {}
  ): Promise<AiPathRunNodeRecord[]> {
    const updatedAt =
      cursor.updatedAt instanceof Date ? cursor.updatedAt : new Date(cursor.updatedAt);
    if (Number.isNaN(updatedAt.getTime())) {
      return [];
    }
    const nodeId = cursor.nodeId.trim();
    const limit =
      typeof options.limit === 'number' && options.limit > 0
        ? Math.min(Math.floor(options.limit), 500)
        : 200;
    const nodes = await prisma.aiPathRunNode.findMany({
      where: {
        runId,
        OR: [{ updatedAt: { gt: updatedAt } }, { updatedAt, nodeId: { gt: nodeId } }],
      },
      orderBy: [{ updatedAt: 'asc' }, { nodeId: 'asc' }],
      take: limit,
    });
    return nodes.map(mapNode);
  },

  async createRunEvent(input: AiPathRunEventCreateInput): Promise<AiPathRunEventRecord> {
    const prismaLevel = input.level === 'warn' ? 'warning' : input.level;
    const event = await prisma.aiPathRunEvent.create({
      data: {
        runId: input.runId,
        level: prismaLevel as AiPathRunEventLevel,
        message: input.message,
        metadata:
          input.metadata ||
          input.nodeId ||
          input.nodeType ||
          input.nodeTitle ||
          input.status ||
          input.iteration
            ? toNullableJsonInput({
              ...((input.metadata as Record<string, unknown>) || {}),
              ...(input.nodeId ? { nodeId: input.nodeId } : {}),
              ...(input.nodeType ? { nodeType: input.nodeType } : {}),
              ...(input.nodeTitle ? { nodeTitle: input.nodeTitle } : {}),
              ...(input.status ? { status: input.status } : {}),
              ...(input.iteration !== undefined && input.iteration !== null
                ? { iteration: input.iteration }
                : {}),
            })
            : undefined,
      },
    });
    return mapEvent(event);
  },

  async listRunEvents(
    runId: string,
    options: AiPathRunEventListOptions = {}
  ): Promise<AiPathRunEventRecord[]> {
    const sinceValue = options.since ? new Date(options.since) : null;
    const since = sinceValue && !Number.isNaN(sinceValue.getTime()) ? sinceValue : null;
    const afterDateValue = options.after?.createdAt ? new Date(options.after.createdAt) : null;
    const afterDate =
      afterDateValue && !Number.isNaN(afterDateValue.getTime()) ? afterDateValue : null;
    const afterId =
      typeof options.after?.id === 'string' && options.after.id.trim().length > 0
        ? options.after.id.trim()
        : null;
    const where =
      afterDate && afterId
        ? {
          runId,
          OR: [{ createdAt: { gt: afterDate } }, { createdAt: afterDate, id: { gt: afterId } }],
        }
        : {
          runId,
          ...(since ? { createdAt: { gt: since } } : {}),
        };
    const events = await prisma.aiPathRunEvent.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      ...(typeof options.limit === 'number' ? { take: options.limit } : {}),
    });
    return events.map(mapEvent);
  },

  async markStaleRunningRuns(maxAgeMs: number): Promise<{ count: number }> {
    const cutoff = new Date(Date.now() - maxAgeMs);
    const result = await prisma.aiPathRun.updateMany({
      where: {
        status: 'running',
        OR: [
          { startedAt: { lt: cutoff } },
          {
            AND: [{ startedAt: null }, { updatedAt: { lt: cutoff } }],
          },
        ],
      },
      data: {
        status: 'failed',
        finishedAt: new Date(),
        errorMessage: 'Run marked failed due to stale running state.',
      },
    });
    return { count: result.count ?? 0 };
  },

  async finalizeRun(
    runId: string,
    status: AiPathRunStatus,
    options?: {
      errorMessage?: string | null;
      event?: Omit<AiPathRunEventCreateInput, 'runId'>;
      finishedAt?: string | null;
    }
  ): Promise<void> {
    const finishedAtDate = options?.finishedAt ? new Date(options.finishedAt) : new Date();

    await prisma.$transaction(async (tx) => {
      await tx.aiPathRun.update({
        where: { id: runId },
        data: {
          status,
          errorMessage: options?.errorMessage ?? null,
          finishedAt: finishedAtDate,
        },
      });

      if (options?.event) {
        await tx.aiPathRunEvent.create({
          data: {
            runId,
            level: options.event.level as AiPathRunEventLevel,
            message: options.event.message,
            metadata: toNullableJsonInput(options.event.metadata),
          },
        });
      }
    });
  },
};
