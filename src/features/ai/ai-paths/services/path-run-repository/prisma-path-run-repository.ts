import 'server-only';

import { Prisma } from '@prisma/client';

import {
  AI_PATHS_RUN_SOURCE_TABS,
  AI_PATHS_RUN_SOURCE_VALUES,
} from '@/features/ai/ai-paths/lib/run-sources';
import type {
  AiPathRunCreateInput,
  AiPathRunEventCreateInput,
  AiPathRunListOptions,
  AiPathRunRepository,
  AiPathRunUpdate,
  AiPathRunNodeUpdate,
} from '@/features/ai/ai-paths/types/path-run-repository';
import prisma from '@/shared/lib/db/prisma';
import type {
  AiPathRunEventRecord,
  AiPathRunNodeRecord,
  AiPathRunRecord,
} from '@/shared/types/ai-paths';
import type { AiNode } from '@/shared/types/ai-paths';

const prismaAny = prisma as unknown as {
  aiPathRun?: {
    create: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
    delete: (args: unknown) => Promise<unknown>;
    findUnique: (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<unknown[]>;
    findFirst: (args: unknown) => Promise<unknown>;
    count: (args: unknown) => Promise<number>;
    deleteMany: (args: unknown) => Promise<{ count: number }>;
    updateMany: (args: unknown) => Promise<{ count: number }>;
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

const mapRun = (run: unknown): AiPathRunRecord => {
  const r = run as Record<string, unknown>;
  return {
    id: String(r.id),
    userId: (r.userId as string) ?? null,
    pathId: (r.pathId as string) ?? null,
    pathName: (r.pathName as string) ?? null,
    prompt: (r.prompt as string) ?? null,
    status: r.status as AiPathRunRecord['status'],
    triggerEvent: (r.triggerEvent as string) ?? null,
    triggerNodeId: (r.triggerNodeId as string) ?? null,
    triggerContext: (r.triggerContext as AiPathRunRecord['triggerContext']) ?? null,
    graph: (r.graph as AiPathRunRecord['graph']) ?? null,
    runtimeState: (r.runtimeState as AiPathRunRecord['runtimeState']) ?? null,
    meta: (r.meta as AiPathRunRecord['meta']) ?? null,
    entityId: (r.entityId as string) ?? null,
    entityType: (r.entityType as string) ?? null,
    errorMessage: (r.errorMessage as string) ?? null,
    retryCount: (r.retryCount as number) ?? 0,
    maxAttempts: (r.maxAttempts as number) ?? 3,
    nextRetryAt: (r.nextRetryAt as Date) ?? null,
    deadLetteredAt: (r.deadLetteredAt as Date) ?? null,
    createdAt: r.createdAt as Date,
    updatedAt: (r.updatedAt as Date) ?? null,
    startedAt: (r.startedAt as Date) ?? null,
    finishedAt: (r.finishedAt as Date) ?? null,
  };
};

const mapNode = (node: unknown): AiPathRunNodeRecord => {
  const n = node as Record<string, unknown>;
  return {
    id: String(n.id),
    runId: String(n.runId),
    nodeId: String(n.nodeId),
    nodeType: String(n.nodeType),
    nodeTitle: (n.nodeTitle as string) ?? null,
    status: n.status as AiPathRunNodeRecord['status'],
    attempt: (n.attempt as number) ?? 0,
    inputs: (n.inputs as AiPathRunNodeRecord['inputs']) ?? null,
    outputs: (n.outputs as AiPathRunNodeRecord['outputs']) ?? null,
    errorMessage: (n.errorMessage as string) ?? null,
    createdAt: n.createdAt as Date,
    updatedAt: (n.updatedAt as Date) ?? null,
    startedAt: (n.startedAt as Date) ?? null,
    finishedAt: (n.finishedAt as Date) ?? null,
  };
};

const mapEvent = (event: unknown): AiPathRunEventRecord => {
  const e = event as Record<string, unknown>;
  return {
    id: String(e.id),
    runId: String(e.runId),
    level: e.level as AiPathRunEventRecord['level'],
    message: String(e.message),
    metadata: (e.metadata as AiPathRunEventRecord['metadata']) ?? null,
    createdAt: e.createdAt as Date,
  };
};

const ensureModels = (): void => {
  if (!prismaAny.aiPathRun || !prismaAny.aiPathRunNode || !prismaAny.aiPathRunEvent) {
    throw new Error('AiPath run models not initialized in Prisma.');
  }
};

const parseFilterDate = (value: Date | string | null | undefined): Date | null => {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date;
};

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
  if (statuses.length > 0) {
    andFilters.push({ status: { in: statuses } });
  } else if (options.status) {
    andFilters.push({ status: options.status });
  }
  if (source) {
    const sourceTabPaths: Array<['source', 'tab'] | ['sourceInfo', 'tab']> = [
      ['source', 'tab'],
      ['sourceInfo', 'tab'],
    ];
    if (sourceMode === 'exclude') {
      if (source === 'ai_paths_ui') {
        andFilters.push({
          AND: [
            ...AI_PATHS_RUN_SOURCE_VALUES.map((value) => ({
              NOT: { meta: { path: ['source'], equals: value } },
            })),
            ...sourceTabPaths.flatMap((path) =>
              AI_PATHS_RUN_SOURCE_TABS.map((tab) => ({
                NOT: { meta: { path, equals: tab } },
              }))
            ),
          ],
        });
      } else {
        andFilters.push({
          AND: [
            { NOT: { meta: { path: ['source'], equals: source } } },
          ],
        });
      }
    } else if (source === 'ai_paths_ui') {
      andFilters.push({
        OR: [
          ...AI_PATHS_RUN_SOURCE_VALUES.map((value) => ({
            meta: { path: ['source'], equals: value },
          })),
          ...sourceTabPaths.flatMap((path) =>
            AI_PATHS_RUN_SOURCE_TABS.map((tab) => ({
              meta: { path, equals: tab },
            }))
          ),
        ],
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

export const prismaPathRunRepository: AiPathRunRepository = {
  async createRun(input: AiPathRunCreateInput): Promise<AiPathRunRecord> {
    ensureModels();
    const run = await prismaAny.aiPathRun!.create({
      data: {
        userId: input.userId ?? null,
        pathId: input.pathId,
        pathName: input.pathName ?? null,
        status: 'queued',
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

  async updateRun(runId: string, data: AiPathRunUpdate): Promise<AiPathRunRecord> {
    ensureModels();
    const run = await prismaAny.aiPathRun!.update({
      where: { id: runId },
      data: data as Record<string, unknown>,
    });
    return mapRun(run);
  },

  async findRunById(runId: string): Promise<AiPathRunRecord | null> {
    ensureModels();
    const run = await prismaAny.aiPathRun!.findUnique({
      where: { id: runId },
    });
    return run ? mapRun(run) : null;
  },

  async deleteRun(runId: string): Promise<boolean> {
    ensureModels();
    try {
      await prismaAny.aiPathRun!.delete({ where: { id: runId } });
      return true;
    } catch {
      return false;
    }
  },

  async listRuns(options: AiPathRunListOptions = {}): Promise<{ runs: AiPathRunRecord[]; total: number }> {
    ensureModels();
    const where = buildRunWhere(options);
    const [runs, total] = await Promise.all([
      prismaAny.aiPathRun!.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...(typeof options.offset === 'number' ? { skip: options.offset } : {}),
        ...(typeof options.limit === 'number' ? { take: options.limit } : {}),
      }),
      prismaAny.aiPathRun!.count({ where }),
    ]);
    return { runs: (runs).map(mapRun), total };
  },

  async deleteRuns(options: AiPathRunListOptions = {}): Promise<{ count: number }> {
    ensureModels();
    const where = buildRunWhere(options);
    const result = await prismaAny.aiPathRun!.deleteMany({ where });
    return { count: result.count ?? 0 };
  },

  async claimNextQueuedRun(): Promise<AiPathRunRecord | null> {
    ensureModels();
    const now = new Date();
    const run = (await prismaAny.aiPathRun!.findFirst({
      where: {
        status: 'queued',
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
      },
      orderBy: { createdAt: 'asc' },
    })) as Record<string, unknown> | null;
    if (!run) return null;
    const updated = await prismaAny.aiPathRun!.updateMany({
      where: { id: run.id as string, status: 'queued' },
      data: { status: 'running', startedAt: new Date() },
    });
    if (!updated.count) return null;
    const fresh = await prismaAny.aiPathRun!.findUnique({ where: { id: run.id as string } });
    return fresh ? mapRun(fresh) : null;
  },

  async getQueueStats(): Promise<{ queuedCount: number; oldestQueuedAt: Date | null }> {
    ensureModels();
    const now = new Date();
    const where = {
      status: 'queued',
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
    };
    const [queuedCount, oldest] = await Promise.all([
      prismaAny.aiPathRun!.count({ where }),
      prismaAny.aiPathRun!.findFirst({
        where,
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }) as Promise<{ createdAt: Date } | null>,
    ]);
    return { queuedCount, oldestQueuedAt: oldest?.createdAt ?? null };
  },

  async createRunNodes(runId: string, nodes: AiNode[]): Promise<void> {
    ensureModels();
    if (!nodes || nodes.length === 0) return;
    const data = nodes.map((node: AiNode) => ({
      runId,
      nodeId: node.id,
      nodeType: node.type,
      nodeTitle: node.title ?? null,
      status: 'pending',
      attempt: 0,
    }));
    await prismaAny.aiPathRunNode!.createMany({ data });
  },

  async upsertRunNode(
    runId: string,
    nodeId: string,
    data: AiPathRunNodeUpdate & { nodeType: string; nodeTitle?: string | null }
  ): Promise<AiPathRunNodeRecord> {
    ensureModels();
    const node = await prismaAny.aiPathRunNode!.upsert({
      where: { runId_nodeId: { runId, nodeId } },
      update: data as Record<string, unknown>,
      create: {
        runId,
        nodeId,
        nodeType: data.nodeType,
        nodeTitle: data.nodeTitle ?? null,
        status: data.status ?? 'pending',
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

  async listRunNodes(runId: string): Promise<AiPathRunNodeRecord[]> {
    ensureModels();
    const nodes = await prismaAny.aiPathRunNode!.findMany({
      where: { runId },
      orderBy: { createdAt: 'asc' },
    });
    return (nodes).map(mapNode);
  },

  async createRunEvent(input: AiPathRunEventCreateInput): Promise<AiPathRunEventRecord> {
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

  async listRunEvents(
    runId: string,
    options: { since?: Date | string | null; limit?: number } = {}
  ): Promise<AiPathRunEventRecord[]> {
    ensureModels();
    const sinceValue = options.since
      ? options.since instanceof Date
        ? options.since
        : new Date(options.since)
      : null;
    const since =
      sinceValue && !Number.isNaN(sinceValue.getTime()) ? sinceValue : null;
    const events = await prismaAny.aiPathRunEvent!.findMany({
      where: {
        runId,
        ...(since ? { createdAt: { gt: since } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      ...(typeof options.limit === 'number' ? { take: options.limit } : {}),
    });
    return (events).map(mapEvent);
  },

  async markStaleRunningRuns(maxAgeMs: number): Promise<{ count: number }> {
    ensureModels();
    const cutoff = new Date(Date.now() - maxAgeMs);
    const result = await prismaAny.aiPathRun!.updateMany({
      where: { status: 'running', startedAt: { lt: cutoff } },
      data: {
        status: 'failed',
        finishedAt: new Date(),
        errorMessage: 'Run marked failed due to stale running state.',
      },
    });
    return { count: (result as { count?: number }).count ?? 0 };
  },
};
