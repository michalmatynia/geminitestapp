import { randomUUID } from 'crypto';

import { Prisma, type SystemLog } from '@prisma/client';
import { ObjectId, type Filter, type OptionalId } from 'mongodb';

import type {
  SystemLogLevelDto as SystemLogLevel,
  SystemLogMetricsDto as SystemLogMetrics,
  SystemLogRecordDto as SystemLogRecord,
  CreateSystemLogInputDto,
  ListSystemLogsInputDto,
  ListSystemLogsResultDto as ListSystemLogsResult,
} from '@/shared/contracts/observability';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

type CreateSystemLogInput = Omit<CreateSystemLogInputDto, 'createdAt'> & {
  createdAt?: Date;
};

type ListSystemLogsInput = Omit<ListSystemLogsInputDto, 'from' | 'to'> & {
  from?: Date | null;
  to?: Date | null;
};

const toMongoId = (id: string): ObjectId | string => {
  if (ObjectId.isValid(id) && id.length === 24) return new ObjectId(id);
  return id;
};

const SYSTEM_LOGS_COLLECTION = 'system_logs';

type MongoSystemLogDoc = {
  _id?: string | ObjectId | undefined;
  id?: string | undefined;
  level?: string | undefined;
  message?: string | undefined;
  category?: string | null | undefined;
  source?: string | null | undefined;
  service?: string | null | undefined;
  context?: Record<string, unknown> | null | undefined;
  stack?: string | null | undefined;
  path?: string | null | undefined;
  method?: string | null | undefined;
  statusCode?: number | null | undefined;
  requestId?: string | null | undefined;
  traceId?: string | null | undefined;
  correlationId?: string | null | undefined;
  spanId?: string | null | undefined;
  parentSpanId?: string | null | undefined;
  userId?: string | null | undefined;
  createdAt?: Date | undefined;
  updatedAt?: Date | null | undefined;
};

const isMissingPrismaTable = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  (error.code === 'P2021' || error.code === 'P2022');

const normalizeLogRecord = (record: SystemLogRecord): SystemLogRecord => ({
  ...record,
  createdAt:
    (record.createdAt as unknown) instanceof Date
      ? (record.createdAt as unknown as Date).toISOString()
      : typeof record.createdAt === 'string'
        ? record.createdAt
        : new Date(record.createdAt || Date.now()).toISOString(),
});

const toSystemLogRecord = (doc: MongoSystemLogDoc): SystemLogRecord => ({
  id: String(doc.id ?? doc._id ?? ''),
  level: (doc.level as SystemLogLevel) ?? 'error',
  message: doc.message ?? '',
  category:
    typeof doc.category === 'string' && doc.category.trim().length > 0
      ? doc.category
      : ((doc.context?.['category'] as string | undefined) ?? null),
  source: doc.source ?? null,
  service:
    (typeof doc.service === 'string' && doc.service.trim().length > 0
      ? doc.service
      : (doc.context?.['service'] as string | undefined)) ?? null,
  context: doc.context ?? null,
  stack: doc.stack ?? null,
  path: doc.path ?? null,
  method: doc.method ?? null,
  statusCode: doc.statusCode ?? null,
  requestId: doc.requestId ?? null,
  traceId:
    (typeof doc.traceId === 'string' && doc.traceId.trim().length > 0
      ? doc.traceId
      : (doc.context?.['traceId'] as string | undefined)) ?? null,
  correlationId:
    (typeof doc.correlationId === 'string' && doc.correlationId.trim().length > 0
      ? doc.correlationId
      : (doc.context?.['correlationId'] as string | undefined)) ?? null,
  spanId:
    (typeof doc.spanId === 'string' && doc.spanId.trim().length > 0
      ? doc.spanId
      : (doc.context?.['spanId'] as string | undefined)) ?? null,
  parentSpanId:
    (typeof doc.parentSpanId === 'string' && doc.parentSpanId.trim().length > 0
      ? doc.parentSpanId
      : (doc.context?.['parentSpanId'] as string | undefined)) ?? null,
  userId: doc.userId ?? null,
  createdAt: (doc.createdAt ?? new Date()).toISOString(),
  updatedAt: null,
});

const buildPrismaWhere = (input: ListSystemLogsInput): Prisma.SystemLogWhereInput => {
  const filters: Prisma.SystemLogWhereInput[] = [];

  if (input.level) {
    filters.push({ level: input.level });
  }
  if (input.source) {
    filters.push({ source: { contains: input.source, mode: 'insensitive' } });
  }
  if (input.service) {
    filters.push({
      OR: [
        { service: { contains: input.service, mode: 'insensitive' } },
        {
          context: {
            path: ['service'],
            equals: input.service,
          },
        },
      ],
    });
  }
  if (input.method) {
    filters.push({ method: { equals: input.method, mode: 'insensitive' } });
  }
  if (input.statusCode !== undefined && input.statusCode !== null) {
    filters.push({ statusCode: input.statusCode });
  }
  if (input.requestId) {
    filters.push({ requestId: { contains: input.requestId, mode: 'insensitive' } });
  }
  if (input.traceId) {
    filters.push({
      OR: [
        { traceId: { contains: input.traceId, mode: 'insensitive' } },
        {
          context: {
            path: ['traceId'],
            equals: input.traceId,
          },
        },
      ],
    });
  }
  if (input.correlationId) {
    filters.push({
      OR: [
        { correlationId: { contains: input.correlationId, mode: 'insensitive' } },
        {
          context: {
            path: ['correlationId'],
            equals: input.correlationId,
          },
        },
      ],
    });
  }
  if (input.userId) {
    filters.push({ userId: { contains: input.userId, mode: 'insensitive' } });
  }
  if (input.fingerprint) {
    filters.push({
      context: {
        path: ['fingerprint'],
        equals: input.fingerprint,
      },
    });
  }
  if (input.category) {
    filters.push({
      OR: [
        { category: { equals: input.category, mode: 'insensitive' } },
        {
          context: {
            path: ['category'],
            equals: input.category,
          },
        },
      ],
    });
  }
  if (input.query) {
    filters.push({
      OR: [
        { message: { contains: input.query, mode: 'insensitive' } },
        { source: { contains: input.query, mode: 'insensitive' } },
        { service: { contains: input.query, mode: 'insensitive' } },
        { path: { contains: input.query, mode: 'insensitive' } },
        { requestId: { contains: input.query, mode: 'insensitive' } },
        { traceId: { contains: input.query, mode: 'insensitive' } },
        { correlationId: { contains: input.query, mode: 'insensitive' } },
        { userId: { contains: input.query, mode: 'insensitive' } },
      ],
    });
  }
  if (input.from || input.to) {
    filters.push({
      createdAt: {
        ...(input.from ? { gte: input.from } : {}),
        ...(input.to ? { lte: input.to } : {}),
      },
    });
  }

  return filters.length > 0 ? { AND: filters } : {};
};

const mergeWhere = (
  base: Prisma.SystemLogWhereInput,
  extra: Prisma.SystemLogWhereInput
): Prisma.SystemLogWhereInput => {
  if (!base || Object.keys(base).length === 0) {
    return extra;
  }
  return { AND: [base, extra] };
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildMongoFilter = (input: ListSystemLogsInput): Filter<MongoSystemLogDoc> => {
  const filter: Filter<MongoSystemLogDoc> = {};
  const dynamicFilter = filter as Filter<MongoSystemLogDoc> & Record<string, unknown>;
  const andFilters: Array<Record<string, unknown>> = [];
  if (input.level) {
    filter.level = input.level;
  }
  if (input.source) {
    filter.source = { $regex: escapeRegex(input.source), $options: 'i' };
  }
  if (input.service) {
    andFilters.push({
      $or: [
        { service: { $regex: escapeRegex(input.service), $options: 'i' } },
        { 'context.service': { $regex: escapeRegex(input.service), $options: 'i' } },
      ],
    });
  }
  if (input.method) {
    filter.method = { $regex: `^${escapeRegex(input.method)}$`, $options: 'i' };
  }
  if (input.statusCode !== undefined && input.statusCode !== null) {
    filter.statusCode = input.statusCode;
  }
  if (input.requestId) {
    filter.requestId = { $regex: escapeRegex(input.requestId), $options: 'i' };
  }
  if (input.traceId) {
    andFilters.push({
      $or: [
        { traceId: { $regex: escapeRegex(input.traceId), $options: 'i' } },
        { 'context.traceId': { $regex: escapeRegex(input.traceId), $options: 'i' } },
      ],
    });
  }
  if (input.correlationId) {
    andFilters.push({
      $or: [
        { correlationId: { $regex: escapeRegex(input.correlationId), $options: 'i' } },
        { 'context.correlationId': { $regex: escapeRegex(input.correlationId), $options: 'i' } },
      ],
    });
  }
  if (input.userId) {
    filter.userId = { $regex: escapeRegex(input.userId), $options: 'i' };
  }
  if (input.fingerprint) {
    dynamicFilter['context.fingerprint'] = input.fingerprint;
  }
  if (input.category) {
    andFilters.push({
      $or: [
        {
          category: {
            $regex: `^${escapeRegex(input.category)}$`,
            $options: 'i',
          },
        },
        { 'context.category': input.category },
      ],
    });
  }
  if (input.query) {
    andFilters.push({
      $or: [
        { message: { $regex: escapeRegex(input.query), $options: 'i' } },
        { source: { $regex: escapeRegex(input.query), $options: 'i' } },
        { service: { $regex: escapeRegex(input.query), $options: 'i' } },
        { path: { $regex: escapeRegex(input.query), $options: 'i' } },
        { requestId: { $regex: escapeRegex(input.query), $options: 'i' } },
        { traceId: { $regex: escapeRegex(input.query), $options: 'i' } },
        { correlationId: { $regex: escapeRegex(input.query), $options: 'i' } },
        { userId: { $regex: escapeRegex(input.query), $options: 'i' } },
      ],
    });
  }
  if (input.from || input.to) {
    filter.createdAt = {
      ...(input.from ? { $gte: input.from } : {}),
      ...(input.to ? { $lte: input.to } : {}),
    };
  }
  if (andFilters.length > 0) {
    dynamicFilter['$and'] = andFilters;
  }
  return filter;
};

let indexesReady = false;
let indexesPromise: Promise<void> | null = null;

const ensureSystemLogIndexes = async (): Promise<void> => {
  const provider = await getAppDbProvider();
  if (provider !== 'mongodb') return;

  if (indexesReady) return;
  if (!indexesPromise) {
    indexesPromise = (async (): Promise<void> => {
      const db = await getMongoDb();
      const col = db.collection(SYSTEM_LOGS_COLLECTION);
      await Promise.all([
        col.createIndex({ createdAt: -1 }),
        col.createIndex({ level: 1, createdAt: -1 }),
        col.createIndex({ source: 1, createdAt: -1 }),
        col.createIndex({ service: 1, createdAt: -1 }),
        col.createIndex({ path: 1, createdAt: -1 }),
        col.createIndex({ requestId: 1 }),
        col.createIndex({ traceId: 1 }),
        col.createIndex({ traceId: 1, createdAt: -1 }),
        col.createIndex({ correlationId: 1 }),
        col.createIndex({ 'context.fingerprint': 1 }),
        col.createIndex({ userId: 1 }),
      ]);
      indexesReady = true;
    })().catch((error: unknown) => {
      indexesPromise = null;
      throw error;
    });
  }
  await indexesPromise;
};

const getMongoSystemLogMetrics = async (
  filter: Filter<MongoSystemLogDoc>
): Promise<SystemLogMetrics> => {
  await ensureSystemLogIndexes();
  const mongo = await getMongoDb();
  const col = mongo.collection<MongoSystemLogDoc>(SYSTEM_LOGS_COLLECTION);

  const now = new Date();
  const last24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [total, last24Hours, last7Days, levelGroups, sourceGroups, serviceGroups, pathGroups] =
    await Promise.all([
      col.countDocuments(filter),
      col.countDocuments({ ...filter, createdAt: { $gte: last24 } }),
      col.countDocuments({ ...filter, createdAt: { $gte: last7 } }),
      col
        .aggregate([{ $match: filter }, { $group: { _id: '$level', count: { $sum: 1 } } }])
        .toArray(),
      col
        .aggregate([
          { $match: { ...filter, source: { $nin: [null, ''] } } },
          { $group: { _id: '$source', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ])
        .toArray(),
      col
        .aggregate([
          { $match: { ...filter, service: { $nin: [null, ''] } } },
          { $group: { _id: '$service', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ])
        .toArray(),
      col
        .aggregate([
          { $match: { ...filter, path: { $nin: [null, ''] } } },
          { $group: { _id: '$path', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ])
        .toArray(),
    ]);

  const levels = { info: 0, warn: 0, error: 0 } as Record<SystemLogLevel, number>;
  levelGroups.forEach((row: unknown) => {
    const r = row as Record<string, unknown>;
    if (typeof r['_id'] === 'string' && r['_id'] in levels) {
      levels[r['_id'] as SystemLogLevel] = r['count'] as number;
    }
  });

  return {
    total,
    levels,
    last24Hours,
    last7Days,
    topSources: sourceGroups.map((row: unknown) => {
      const r = row as Record<string, unknown>;
      return {
        source: String(r['_id'] ?? ''),
        count: r['count'] as number,
      };
    }),
    topServices: serviceGroups.map((row: unknown) => {
      const r = row as Record<string, unknown>;
      return {
        service: String(r['_id'] ?? ''),
        count: r['count'] as number,
      };
    }),
    topPaths: pathGroups.map((row: unknown) => {
      const r = row as Record<string, unknown>;
      return {
        path: String(r['_id'] ?? ''),
        count: r['count'] as number,
      };
    }),
    generatedAt: now.toISOString(),
  };
};

export async function createSystemLog(input: CreateSystemLogInput): Promise<SystemLogRecord> {
  const provider = await getAppDbProvider();
  const contextService =
    typeof input.context?.['service'] === 'string' ? input.context['service'] : null;
  const contextTraceId =
    typeof input.context?.['traceId'] === 'string' ? input.context['traceId'] : null;
  const contextCorrelationId =
    typeof input.context?.['correlationId'] === 'string' ? input.context['correlationId'] : null;
  const contextSpanId =
    typeof input.context?.['spanId'] === 'string' ? input.context['spanId'] : null;
  const contextParentSpanId =
    typeof input.context?.['parentSpanId'] === 'string' ? input.context['parentSpanId'] : null;
  const contextCategory =
    typeof input.context?.['category'] === 'string' ? input.context['category'] : null;
  const category =
    typeof input.category === 'string' && input.category.trim().length > 0
      ? input.category.trim()
      : contextCategory;
  const service =
    typeof input.service === 'string' && input.service.trim().length > 0
      ? input.service.trim()
      : contextService;
  const traceId =
    typeof input.traceId === 'string' && input.traceId.trim().length > 0
      ? input.traceId.trim()
      : contextTraceId;
  const correlationId =
    typeof input.correlationId === 'string' && input.correlationId.trim().length > 0
      ? input.correlationId.trim()
      : contextCorrelationId;
  const spanId =
    typeof input.spanId === 'string' && input.spanId.trim().length > 0
      ? input.spanId.trim()
      : contextSpanId;
  const parentSpanId =
    typeof input.parentSpanId === 'string' && input.parentSpanId.trim().length > 0
      ? input.parentSpanId.trim()
      : contextParentSpanId;
  const payload: SystemLogRecord = {
    id: randomUUID(),
    level: input.level ?? 'error',
    message: input.message,
    category,
    source: input.source ?? null,
    service: service ?? null,
    context: input.context ?? null,
    stack: input.stack ?? null,
    path: input.path ?? null,
    method: input.method ?? null,
    statusCode: input.statusCode ?? null,
    requestId: input.requestId ?? null,
    traceId: traceId ?? null,
    correlationId: correlationId ?? null,
    spanId: spanId ?? null,
    parentSpanId: parentSpanId ?? null,
    userId: input.userId ?? null,
    createdAt: (input.createdAt ?? new Date()).toISOString(),
    updatedAt: null,
  };

  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    await mongo.collection<MongoSystemLogDoc>(SYSTEM_LOGS_COLLECTION).insertOne({
      _id: toMongoId(payload.id),
      ...payload,
      createdAt: new Date(payload.createdAt || Date.now()),
      updatedAt: payload.updatedAt ? new Date(payload.updatedAt) : null,
    } as OptionalId<MongoSystemLogDoc>);
    return normalizeLogRecord(payload);
  }

  try {
    const created = await prisma.systemLog.create({
      data: {
        level: payload.level,
        message: payload.message,
        ...(payload.category !== null && payload.category !== undefined
          ? { category: payload.category }
          : {}),
        ...(payload.source !== null && payload.source !== undefined
          ? { source: payload.source }
          : {}),
        ...(payload.service !== null && payload.service !== undefined
          ? { service: payload.service }
          : {}),
        ...(payload.context !== null && payload.context !== undefined
          ? { context: payload.context as Prisma.InputJsonValue }
          : {}),
        ...(payload.stack !== null && payload.stack !== undefined ? { stack: payload.stack } : {}),
        ...(payload.path !== null && payload.path !== undefined ? { path: payload.path } : {}),
        ...(payload.method !== null && payload.method !== undefined
          ? { method: payload.method }
          : {}),
        ...(payload.statusCode !== null && payload.statusCode !== undefined
          ? { statusCode: payload.statusCode }
          : {}),
        ...(payload.requestId !== null && payload.requestId !== undefined
          ? { requestId: payload.requestId }
          : {}),
        ...(payload.traceId !== null && payload.traceId !== undefined
          ? { traceId: payload.traceId }
          : {}),
        ...(payload.correlationId !== null && payload.correlationId !== undefined
          ? { correlationId: payload.correlationId }
          : {}),
        ...(payload.spanId !== null && payload.spanId !== undefined ? { spanId: payload.spanId } : {}),
        ...(payload.parentSpanId !== null && payload.parentSpanId !== undefined
          ? { parentSpanId: payload.parentSpanId }
          : {}),
        ...(payload.userId !== null && payload.userId !== undefined
          ? { userId: payload.userId }
          : {}),
        createdAt: payload.createdAt || new Date().toISOString(),
      },
    });

    return normalizeLogRecord({
      ...created,
      level: created.level as SystemLogLevel,
      context: (created.context as Record<string, unknown> | null) ?? null,
      createdAt: created.createdAt.toISOString(),
      updatedAt: null,
    } as SystemLogRecord);
  } catch (error) {
    if (isMissingPrismaTable(error)) {
      if (process.env['MONGODB_URI']) {
        const mongo = await getMongoDb();
        await mongo.collection<MongoSystemLogDoc>(SYSTEM_LOGS_COLLECTION).insertOne({
          _id: toMongoId(payload.id),
          ...payload,
          createdAt: new Date(payload.createdAt || Date.now()),
          updatedAt: payload.updatedAt ? new Date(payload.updatedAt) : null,
        } as OptionalId<MongoSystemLogDoc>);
      }
      return normalizeLogRecord(payload);
    }
    throw error;
  }
}

export async function listSystemLogs(input: ListSystemLogsInput): Promise<ListSystemLogsResult> {
  const provider = await getAppDbProvider();
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, input.pageSize ?? 50));

  if (provider === 'mongodb') {
    await ensureSystemLogIndexes();
    const mongo = await getMongoDb();
    const filter = buildMongoFilter(input);
    const total = await mongo
      .collection<MongoSystemLogDoc>(SYSTEM_LOGS_COLLECTION)
      .countDocuments(filter);
    const docs = await mongo
      .collection<MongoSystemLogDoc>(SYSTEM_LOGS_COLLECTION)
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray();
    const logs = docs.map((doc: MongoSystemLogDoc) => normalizeLogRecord(toSystemLogRecord(doc)));
    return { logs, total, page, pageSize };
  }

  const where = buildPrismaWhere(input);

  try {
    const [total, rows] = await Promise.all([
      prisma.systemLog.count({ where }),
      prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const logs = rows.map((row: SystemLog) =>
      normalizeLogRecord({
        ...row,
        level: row.level as SystemLogLevel,
        category:
          typeof row.category === 'string' && row.category.trim().length > 0
            ? row.category
            : (((row.context as Record<string, unknown> | null)?.['category'] as
                | string
                | undefined) ?? null),
        service:
          typeof row.service === 'string' && row.service.trim().length > 0
            ? row.service
            : (((row.context as Record<string, unknown> | null)?.['service'] as
                | string
                | undefined) ?? null),
        traceId:
          typeof row.traceId === 'string' && row.traceId.trim().length > 0
            ? row.traceId
            : (((row.context as Record<string, unknown> | null)?.['traceId'] as
                | string
                | undefined) ?? null),
        correlationId:
          typeof row.correlationId === 'string' && row.correlationId.trim().length > 0
            ? row.correlationId
            : (((row.context as Record<string, unknown> | null)?.['correlationId'] as
                | string
                | undefined) ?? null),
        spanId:
          typeof row.spanId === 'string' && row.spanId.trim().length > 0
            ? row.spanId
            : (((row.context as Record<string, unknown> | null)?.['spanId'] as
                | string
                | undefined) ?? null),
        parentSpanId:
          typeof row.parentSpanId === 'string' && row.parentSpanId.trim().length > 0
            ? row.parentSpanId
            : (((row.context as Record<string, unknown> | null)?.['parentSpanId'] as
                | string
                | undefined) ?? null),
        context: (row.context as Record<string, unknown> | null) ?? null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: null,
      })
    );
    return { logs, total, page, pageSize };
  } catch (error) {
    if (isMissingPrismaTable(error) && process.env['MONGODB_URI']) {
      const mongo = await getMongoDb();
      const filter = buildMongoFilter(input);
      const total = await mongo
        .collection<MongoSystemLogDoc>(SYSTEM_LOGS_COLLECTION)
        .countDocuments(filter);
      const docs = await mongo
        .collection<MongoSystemLogDoc>(SYSTEM_LOGS_COLLECTION)
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray();
      const logs = docs.map((doc: MongoSystemLogDoc) => normalizeLogRecord(toSystemLogRecord(doc)));
      return { logs, total, page, pageSize };
    }
    throw error;
  }
}

export async function getSystemLogById(id: string): Promise<SystemLogRecord | null> {
  const provider = await getAppDbProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<MongoSystemLogDoc>(SYSTEM_LOGS_COLLECTION)
      .findOne({ $or: [{ _id: toMongoId(id) }, { id }] });
    if (!doc) return null;
    return normalizeLogRecord(toSystemLogRecord(doc));
  }

  try {
    const row = await prisma.systemLog.findUnique({
      where: { id },
    });
    if (!row) return null;
    return normalizeLogRecord({
      ...row,
      level: row.level as SystemLogLevel,
      category:
        typeof row.category === 'string' && row.category.trim().length > 0
          ? row.category
          : (((row.context as Record<string, unknown> | null)?.['category'] as
              | string
              | undefined) ?? null),
      service:
        typeof row.service === 'string' && row.service.trim().length > 0
          ? row.service
          : (((row.context as Record<string, unknown> | null)?.['service'] as
              | string
              | undefined) ?? null),
      traceId:
        typeof row.traceId === 'string' && row.traceId.trim().length > 0
          ? row.traceId
          : (((row.context as Record<string, unknown> | null)?.['traceId'] as
              | string
              | undefined) ?? null),
      correlationId:
        typeof row.correlationId === 'string' && row.correlationId.trim().length > 0
          ? row.correlationId
          : (((row.context as Record<string, unknown> | null)?.['correlationId'] as
              | string
              | undefined) ?? null),
      spanId:
        typeof row.spanId === 'string' && row.spanId.trim().length > 0
          ? row.spanId
          : (((row.context as Record<string, unknown> | null)?.['spanId'] as
              | string
              | undefined) ?? null),
      parentSpanId:
        typeof row.parentSpanId === 'string' && row.parentSpanId.trim().length > 0
          ? row.parentSpanId
          : (((row.context as Record<string, unknown> | null)?.['parentSpanId'] as
              | string
              | undefined) ?? null),
      context: (row.context as Record<string, unknown> | null) ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: null,
    } as SystemLogRecord);
  } catch (error) {
    if (isMissingPrismaTable(error) && process.env['MONGODB_URI']) {
      const mongo = await getMongoDb();
      const doc = await mongo
        .collection<MongoSystemLogDoc>(SYSTEM_LOGS_COLLECTION)
        .findOne({ $or: [{ _id: toMongoId(id) }, { id }] });
      if (!doc) return null;
      return normalizeLogRecord(toSystemLogRecord(doc));
    }
    throw error;
  }
}

export async function getSystemLogMetrics(input: ListSystemLogsInput): Promise<SystemLogMetrics> {
  const provider = await getAppDbProvider();
  const now = new Date();

  if (provider === 'mongodb') {
    const filter = buildMongoFilter(input);
    return getMongoSystemLogMetrics(filter);
  }

  const where = buildPrismaWhere(input);
  const last24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  try {
    const [total, last24Hours, last7Days, levelGroups, sourceGroups, serviceGroups, pathGroups] =
      await Promise.all([
        prisma.systemLog.count({ where }),
        prisma.systemLog.count({
          where: mergeWhere(where, { createdAt: { gte: last24 } }),
        }),
        prisma.systemLog.count({
          where: mergeWhere(where, { createdAt: { gte: last7 } }),
        }),
        prisma.systemLog.groupBy({
          by: ['level'],
          _count: { _all: true },
          where,
        }),
        prisma.systemLog.groupBy({
          by: ['source'],
          _count: { _all: true },
          where: mergeWhere(where, {
            AND: [{ source: { not: null } }, { source: { not: '' } }],
          }),
          orderBy: { _count: { id: 'desc' } },
          take: 5,
        }),
        prisma.systemLog.groupBy({
          by: ['service'],
          _count: { _all: true },
          where: mergeWhere(where, {
            AND: [{ service: { not: null } }, { service: { not: '' } }],
          }),
          orderBy: { _count: { id: 'desc' } },
          take: 5,
        }),
        prisma.systemLog.groupBy({
          by: ['path'],
          _count: { _all: true },
          where: mergeWhere(where, {
            AND: [{ path: { not: null } }, { path: { not: '' } }],
          }),
          orderBy: { _count: { id: 'desc' } },
          take: 5,
        }),
      ]);

    const levels = { info: 0, warn: 0, error: 0 } as Record<SystemLogLevel, number>;
    for (const row of levelGroups as Array<{
      level: SystemLogLevel;
      _count: { _all: number };
    }>) {
      if (row.level in levels) {
        levels[row.level] = row._count._all ?? 0;
      }
    }

    const topSources = (sourceGroups as Array<{ source: string | null; _count: { _all: number } }>)
      .filter((row: { source: string | null; _count: { _all: number } }) => row.source)
      .map((row: { source: string | null; _count: { _all: number } }) => ({
        source: row.source as string,
        count: row._count._all ?? 0,
      }));
    const topServices = (
      serviceGroups as Array<{ service: string | null; _count: { _all: number } }>
    )
      .filter((row: { service: string | null; _count: { _all: number } }) => row.service)
      .map((row: { service: string | null; _count: { _all: number } }) => ({
        service: row.service as string,
        count: row._count._all ?? 0,
      }));
    const topPaths = (pathGroups as Array<{ path: string | null; _count: { _all: number } }>)
      .filter((row: { path: string | null; _count: { _all: number } }) => row.path)
      .map((row: { path: string | null; _count: { _all: number } }) => ({
        path: row.path as string,
        count: row._count._all ?? 0,
      }));

    return {
      total,
      levels,
      last24Hours,
      last7Days,
      topSources,
      topServices,
      topPaths,
      generatedAt: now.toISOString(),
    };
  } catch (error) {
    if (isMissingPrismaTable(error) && process.env['MONGODB_URI']) {
      const filter = buildMongoFilter(input);
      return getMongoSystemLogMetrics(filter);
    }
    throw error;
  }
}

export async function clearSystemLogs(before?: Date | null): Promise<{ deleted: number }> {
  const provider = await getAppDbProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const filter = before ? { createdAt: { $lte: before } } : {};
    const result = await mongo
      .collection<MongoSystemLogDoc>(SYSTEM_LOGS_COLLECTION)
      .deleteMany(filter);
    return { deleted: result.deletedCount ?? 0 };
  }

  const where = before ? { createdAt: { lte: before } } : {};
  try {
    const result = await prisma.systemLog.deleteMany({ where });
    return { deleted: result.count };
  } catch (error) {
    if (isMissingPrismaTable(error) && process.env['MONGODB_URI']) {
      const mongo = await getMongoDb();
      const filter = before ? { createdAt: { $lte: before } } : {};
      const result = await mongo
        .collection<MongoSystemLogDoc>(SYSTEM_LOGS_COLLECTION)
        .deleteMany(filter);
      return { deleted: result.deletedCount ?? 0 };
    }
    throw error;
  }
}
