/**
 * System Log Repository
 * 
 * Server-side repository for system log storage and retrieval.
 * Provides:
 * - System log record persistence
 * - MongoDB-based log storage
 * - Log level filtering
 * - Log metrics aggregation
 * - Query and retrieval operations
 */

'use server';

import { randomUUID } from 'crypto';

import { ObjectId, type Db, type Filter, type OptionalId } from 'mongodb';

import type { ObservabilityApplicationId } from '@/shared/contracts/system';
import type {
  SystemLogLevelDto as SystemLogLevel,
  SystemLogMetricsDto as SystemLogMetrics,
  SystemLogRecordDto as SystemLogRecord,
  CreateSystemLogInputDto,
  ListSystemLogsInputDto,
  ListSystemLogsResultDto as ListSystemLogsResult,
} from '@/shared/contracts/observability';
import { getMongoDb as getRootMongoDb } from '@/shared/lib/db/mongo-client';
import { readMongoSyncLock } from '@/shared/lib/db/mongo-sync-lock';
import { executeMongoWriteWithRetry } from '@/shared/lib/db/mongo-write-retry';
import {
  getMongoDatabaseName,
  getObservabilityApplicationMongoDb,
} from '@/shared/lib/observability/application-log-databases';
import {
  buildObservabilityLogOrigin,
  getObservabilityApplicationName,
  normalizeObservabilityApplicationId,
  resolveObservabilityApplicationIdFromValues,
} from '@/shared/lib/observability/application-log-origin';
import { getObservabilityIndexManifestEntries } from '@/shared/lib/observability/observability-index-manifest';
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
const ERROR_LOGS_COLLECTION = 'error_logs';
const OBSERVABILITY_APPLICATION_IDS: ObservabilityApplicationId[] = [
  'geminitestapp',
  'studiq',
  'cms-builder',
  'stargater',
  'arch',
];

type ObservabilityLogSource = {
  applicationId: ObservabilityApplicationId;
  db: Db;
};

const toSystemLogOriginValues = (record: SystemLogRecord): unknown[] => {
  const context = record.context ?? {};
  return [
    record.applicationId,
    record.applicationName,
    record.message,
    record.source,
    record.service,
    record.sourceService,
    record.path,
    context,
    context['source'],
    context['service'],
    context['applicationId'],
    context['sourceApplicationId'],
    context['sourceApplication'],
    context['surface'],
    context['route'],
    context['path'],
    context['endpoint'],
    context['key'],
  ];
};

const resolveSystemLogApplicationId = (record: SystemLogRecord): ObservabilityApplicationId =>
  normalizeObservabilityApplicationId(record.applicationId) ??
  resolveObservabilityApplicationIdFromValues(toSystemLogOriginValues(record));

const buildMongoSystemLogDoc = (
  payload: SystemLogRecord,
  id: ObjectId | string = toMongoId(payload.id)
): OptionalId<MongoSystemLogDoc> =>
  ({
    _id: id,
    ...payload,
    createdAt: new Date(payload.createdAt || Date.now()),
    updatedAt: payload.updatedAt ? new Date(payload.updatedAt) : null,
  }) as OptionalId<MongoSystemLogDoc>;

const buildSystemLogUpsertFilter = (payload: SystemLogRecord): Filter<MongoSystemLogDoc> => ({
  applicationId: payload.applicationId,
  originLogId: payload.originLogId ?? payload.id,
});

const indexReadyByDb = new WeakMap<Db, Set<string>>();
const indexPromiseByDb = new WeakMap<Db, Map<string, Promise<void>>>();

const ensureLogCollectionIndexes = async (db: Db, collectionName: string): Promise<void> => {
  let readyCollections = indexReadyByDb.get(db);
  if (!readyCollections) {
    readyCollections = new Set<string>();
    indexReadyByDb.set(db, readyCollections);
  }
  if (readyCollections.has(collectionName)) return;

  let pendingCollections = indexPromiseByDb.get(db);
  if (!pendingCollections) {
    pendingCollections = new Map<string, Promise<void>>();
    indexPromiseByDb.set(db, pendingCollections);
  }

  let pending = pendingCollections.get(collectionName);
  if (!pending) {
    pending = (async (): Promise<void> => {
      const col = db.collection(collectionName);
      const indexes = getObservabilityIndexManifestEntries(collectionName);
      await Promise.all(indexes.map((index) => col.createIndex(index.key, index.options)));
      readyCollections.add(collectionName);
    })().catch((error: unknown) => {
      pendingCollections.delete(collectionName);
      throw error;
    });
    pendingCollections.set(collectionName, pending);
  }

  await pending;
};

const writeMongoSystemLog = async (
  db: Db,
  collectionName: typeof SYSTEM_LOGS_COLLECTION | typeof ERROR_LOGS_COLLECTION,
  payload: SystemLogRecord,
  mode: 'insert' | 'upsert'
): Promise<void> => {
  await ensureLogCollectionIndexes(db, collectionName);
  const collection = db.collection<MongoSystemLogDoc>(collectionName);
  const doc = buildMongoSystemLogDoc(payload);
  if (mode === 'insert') {
    await collection.insertOne(doc);
    return;
  }
  await collection.updateOne(buildSystemLogUpsertFilter(payload), { $setOnInsert: doc }, { upsert: true });
};

const insertMongoSystemLog = async (payload: SystemLogRecord): Promise<SystemLogRecord> => {
  const applicationId = resolveSystemLogApplicationId(payload);
  const localDb = await getObservabilityApplicationMongoDb(applicationId);
  const originDatabase = getMongoDatabaseName(localDb) ?? payload.originDatabase ?? null;
  const localPayload: SystemLogRecord = {
    ...payload,
    applicationId,
    applicationName: payload.applicationName ?? getObservabilityApplicationName(applicationId),
    sourceService: payload.sourceService ?? payload.service ?? payload.source ?? null,
    originDatabase,
    originCollection: payload.originCollection ?? SYSTEM_LOGS_COLLECTION,
    originLogId: payload.originLogId ?? payload.id,
  };

  await executeMongoWriteWithRetry(async () => {
    await writeMongoSystemLog(localDb, SYSTEM_LOGS_COLLECTION, localPayload, 'insert');
    if (localPayload.level === 'error') {
      await writeMongoSystemLog(localDb, ERROR_LOGS_COLLECTION, localPayload, 'upsert');
    }
  });

  return localPayload;
};

const normalizeLogRecord = (record: SystemLogRecord): SystemLogRecord => ({
  ...record,
  createdAt: record.createdAt ?? new Date().toISOString(),
});

const toSystemLogRecord = (
  doc: MongoSystemLogDoc,
  fallbackApplicationId: ObservabilityApplicationId = 'geminitestapp'
): SystemLogRecord => {
  const baseRecord: SystemLogRecord = {
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
  };
  const applicationId =
    normalizeObservabilityApplicationId(doc.applicationId) ??
    resolveObservabilityApplicationIdFromValues(
      [...toSystemLogOriginValues(baseRecord), doc.originDatabase, doc.originCollection],
      fallbackApplicationId
    );

  return {
    ...baseRecord,
    applicationId,
    applicationName: doc.applicationName ?? getObservabilityApplicationName(applicationId),
    environment: doc.environment ?? null,
    sourceService: doc.sourceService ?? baseRecord.service ?? baseRecord.source ?? null,
    originDatabase: doc.originDatabase ?? null,
    originCollection: doc.originCollection ?? SYSTEM_LOGS_COLLECTION,
    originLogId: doc.originLogId ?? String(doc.id ?? doc._id ?? ''),
  };
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildMongoFilter = (
  input: ListSystemLogsInput,
  options: { includeApplicationIdFilter?: boolean } = {}
): Filter<MongoSystemLogDoc> => {
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
  if (options.includeApplicationIdFilter === true && input.applicationId) {
    filter.applicationId = input.applicationId;
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
        { applicationId: { $regex: escapeRegex(input.query), $options: 'i' } },
        { applicationName: { $regex: escapeRegex(input.query), $options: 'i' } },
        { sourceService: { $regex: escapeRegex(input.query), $options: 'i' } },
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

const resolveLogSourceApplicationIds = (
  input?: Pick<ListSystemLogsInput, 'applicationId'>
): ObservabilityApplicationId[] => {
  const applicationId = normalizeObservabilityApplicationId(input?.applicationId);
  return applicationId ? [applicationId] : OBSERVABILITY_APPLICATION_IDS;
};

const getObservabilityLogSources = async (
  input?: Pick<ListSystemLogsInput, 'applicationId'>
): Promise<ObservabilityLogSource[]> => {
  const sourceResults = await Promise.allSettled(
    resolveLogSourceApplicationIds(input).map(async (applicationId) => ({
      applicationId,
      db: await getObservabilityApplicationMongoDb(applicationId),
    }))
  );

  return sourceResults.flatMap((result) =>
    result.status === 'fulfilled' ? [result.value] : []
  );
};

const getSystemLogRowsForSource = async (
  source: ObservabilityLogSource,
  filter: Filter<MongoSystemLogDoc>,
  limit: number
): Promise<SystemLogRecord[]> => {
  await ensureLogCollectionIndexes(source.db, SYSTEM_LOGS_COLLECTION);
  const docs = await source.db
    .collection<MongoSystemLogDoc>(SYSTEM_LOGS_COLLECTION)
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  const sourceDatabaseName = getMongoDatabaseName(source.db);
  return docs.map((doc) =>
    normalizeLogRecord({
      ...toSystemLogRecord(doc, source.applicationId),
      originDatabase: doc.originDatabase ?? sourceDatabaseName,
    })
  );
};

const compareSystemLogsNewestFirst = (
  left: SystemLogRecord,
  right: SystemLogRecord
): number => {
  const rightTime = Date.parse(right.createdAt ?? '');
  const leftTime = Date.parse(left.createdAt ?? '');
  return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
};

const mergeTopCounts = (
  rows: Array<{ key: string; count: number }>,
  limit = 5
): Array<{ key: string; count: number }> => {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    if (row.key.length === 0) return;
    counts.set(row.key, (counts.get(row.key) ?? 0) + row.count);
  });
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key))
    .slice(0, limit);
};

const getMongoSystemLogMetrics = async (
  source: ObservabilityLogSource,
  filter: Filter<MongoSystemLogDoc>
): Promise<SystemLogMetrics> => {
  await ensureLogCollectionIndexes(source.db, SYSTEM_LOGS_COLLECTION);
  const col = source.db.collection<MongoSystemLogDoc>(SYSTEM_LOGS_COLLECTION);

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

const getFederatedSystemLogMetrics = async (
  input: ListSystemLogsInput
): Promise<SystemLogMetrics> => {
  const filter = buildMongoFilter(input, { includeApplicationIdFilter: false });
  const sources = await getObservabilityLogSources(input);
  const metricsResults = await Promise.all(
    sources.map((source) => getMongoSystemLogMetrics(source, filter))
  );
  const nowIso = new Date().toISOString();
  const levels = { info: 0, warn: 0, error: 0 } as Record<SystemLogLevel, number>;

  metricsResults.forEach((metrics) => {
    levels.info += metrics.levels.info;
    levels.warn += metrics.levels.warn;
    levels.error += metrics.levels.error;
  });

  const topSources = mergeTopCounts(
    metricsResults.flatMap((metrics) =>
      metrics.topSources.map((row) => ({ key: row.source, count: row.count }))
    )
  ).map((row) => ({ source: row.key, count: row.count }));
  const topServices = mergeTopCounts(
    metricsResults.flatMap((metrics) =>
      metrics.topServices.map((row) => ({ key: row.service, count: row.count }))
    )
  ).map((row) => ({ service: row.key, count: row.count }));
  const topPaths = mergeTopCounts(
    metricsResults.flatMap((metrics) =>
      metrics.topPaths.map((row) => ({ key: row.path, count: row.count }))
    )
  ).map((row) => ({ path: row.key, count: row.count }));

  return {
    total: metricsResults.reduce((sum, metrics) => sum + metrics.total, 0),
    levels,
    last24Hours: metricsResults.reduce((sum, metrics) => sum + metrics.last24Hours, 0),
    last7Days: metricsResults.reduce((sum, metrics) => sum + metrics.last7Days, 0),
    topSources,
    topServices,
    topPaths,
    generatedAt: nowIso,
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
  const id = randomUUID();
  const origin = buildObservabilityLogOrigin({
    applicationId: input.applicationId,
    applicationName: input.applicationName,
    environment: input.environment,
    sourceService: input.sourceService ?? service ?? input.source,
    originDatabase: input.originDatabase,
    originCollection: input.originCollection ?? SYSTEM_LOGS_COLLECTION,
    originLogId: input.originLogId ?? id,
    values: [
      input.applicationId,
      input.applicationName,
      input.message,
      input.source,
      service,
      input.sourceService,
      input.path,
      input.context,
    ],
  });
  const payload: SystemLogRecord = {
    id,
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
    ...origin,
    createdAt: (input.createdAt ?? new Date()).toISOString(),
    updatedAt: null,
  };

  const syncLock = await readMongoSyncLock({ pruneStale: true });
  if (syncLock) {
    return normalizeLogRecord(payload);
  }

  const persisted = await insertMongoSystemLog(payload);
  return normalizeLogRecord(persisted);
}

export async function listSystemLogs(input: ListSystemLogsInput): Promise<ListSystemLogsResult> {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, input.pageSize ?? 50));
  const skip = (page - 1) * pageSize;
  const filter = buildMongoFilter(input, { includeApplicationIdFilter: false });
  const sources = await getObservabilityLogSources(input);
  const perSourceLimit = skip + pageSize;

  const [counts, rows] = await Promise.all([
    Promise.all(
      sources.map(async (source) => {
        await ensureLogCollectionIndexes(source.db, SYSTEM_LOGS_COLLECTION);
        return source.db.collection<MongoSystemLogDoc>(SYSTEM_LOGS_COLLECTION).countDocuments(filter);
      })
    ),
    Promise.all(
      sources.map((source) => getSystemLogRowsForSource(source, filter, perSourceLimit))
    ),
  ]);
  const total = counts.reduce((sum, count) => sum + count, 0);
  const logs = rows
    .flat()
    .sort(compareSystemLogsNewestFirst)
    .slice(skip, skip + pageSize);
  return { logs, total, page, pageSize };
}

export async function getSystemLogById(id: string): Promise<SystemLogRecord | null> {
  const sources = await getObservabilityLogSources();
  for (const source of sources) {
    await ensureLogCollectionIndexes(source.db, SYSTEM_LOGS_COLLECTION);
    const doc = await source.db
      .collection<MongoSystemLogDoc>(SYSTEM_LOGS_COLLECTION)
      .findOne({ $or: [{ _id: toMongoId(id) }, { id }, { originLogId: id }] });
    if (doc) {
      return normalizeLogRecord({
        ...toSystemLogRecord(doc, source.applicationId),
        originDatabase: doc.originDatabase ?? getMongoDatabaseName(source.db),
      });
    }
  }
  return null;
}

export async function getSystemLogMetrics(input: ListSystemLogsInput): Promise<SystemLogMetrics> {
  return getFederatedSystemLogMetrics(input);
}

export async function clearSystemLogs(input?: {
  before?: Date | null;
  level?: SystemLogLevel | null;
}): Promise<{ deleted: number }> {
  const mongo = await getRootMongoDb();
  const filter: Filter<MongoSystemLogDoc> = {};

  if (input?.before) {
    filter.createdAt = { $lte: input.before };
  }
  if (input?.level) {
    filter.level = input.level;
  }

  const result = await mongo.collection<MongoSystemLogDoc>(SYSTEM_LOGS_COLLECTION).deleteMany(filter);
  return { deleted: result.deletedCount ?? 0 };
}
