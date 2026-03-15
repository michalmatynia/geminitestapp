import { randomUUID } from 'crypto';

import { ObjectId, type Filter, type OptionalId } from 'mongodb';

import type {
  SystemLogLevelDto as SystemLogLevel,
  SystemLogMetricsDto as SystemLogMetrics,
  SystemLogRecordDto as SystemLogRecord,
  CreateSystemLogInputDto,
  ListSystemLogsInputDto,
  ListSystemLogsResultDto as ListSystemLogsResult,
} from '@/shared/contracts/observability';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { executeMongoWriteWithRetry } from '@/shared/lib/db/mongo-write-retry';
import type { MongoSystemLogDoc } from '@/shared/lib/observability/system-log-types';

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

const toIsoString = (value?: string | Date | null): string => {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

const SYSTEM_LOGS_COLLECTION = 'system_logs';

const insertMongoSystemLog = async (payload: SystemLogRecord): Promise<void> => {
  const mongo = await getMongoDb();

  await executeMongoWriteWithRetry(async () => {
    await mongo.collection<MongoSystemLogDoc>(SYSTEM_LOGS_COLLECTION).insertOne({
      _id: toMongoId(payload.id),
      ...payload,
      createdAt: new Date(payload.createdAt || Date.now()),
      updatedAt: payload.updatedAt ? new Date(payload.updatedAt) : null,
    } as OptionalId<MongoSystemLogDoc>);
  });
};

const normalizeLogRecord = (record: SystemLogRecord): SystemLogRecord => ({
  ...record,
  createdAt: record.createdAt ?? new Date().toISOString(),
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
  createdAt: toIsoString(doc.createdAt),
  updatedAt: null,
});

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
  if (input.minDurationMs !== undefined && input.minDurationMs !== null) {
    andFilters.push({
      $expr: {
        $gte: [
          {
            $convert: {
              input: '$context.durationMs',
              to: 'double',
              onError: -1,
              onNull: -1,
            },
          },
          input.minDurationMs,
        ],
      },
    });
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

  await insertMongoSystemLog(payload);
  return normalizeLogRecord(payload);
}

export async function listSystemLogs(input: ListSystemLogsInput): Promise<ListSystemLogsResult> {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, input.pageSize ?? 50));

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

export async function getSystemLogById(id: string): Promise<SystemLogRecord | null> {
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<MongoSystemLogDoc>(SYSTEM_LOGS_COLLECTION)
    .findOne({ $or: [{ _id: toMongoId(id) }, { id }] });
  if (!doc) return null;
  return normalizeLogRecord(toSystemLogRecord(doc));
}

export async function getSystemLogMetrics(input: ListSystemLogsInput): Promise<SystemLogMetrics> {
  const filter = buildMongoFilter(input);
  return getMongoSystemLogMetrics(filter);
}

export async function clearSystemLogs(before?: Date | null): Promise<{ deleted: number }> {
  const mongo = await getMongoDb();
  const filter = before ? { createdAt: { $lte: before } } : {};
  const result = await mongo.collection<MongoSystemLogDoc>(SYSTEM_LOGS_COLLECTION).deleteMany(filter);
  return { deleted: result.deletedCount ?? 0 };
}
