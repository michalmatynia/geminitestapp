import 'server-only';

import { Prisma } from '@prisma/client';

import type { SystemLogRecordDto as SystemLogRecord } from '@/shared/contracts/observability';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import { createManagedQueue } from '@/shared/lib/queue';
import { hydrateLogRuntimeContext } from '@/shared/lib/observability/runtime-context/hydrate-system-log-runtime-context';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { getSystemAlerts } from '@/shared/lib/observability/system-alerts-repository';
import { isObjectRecord } from '@/shared/utils/object-utils';

import type { Alert } from '@/shared/contracts/observability';

type SystemLogAlertsJobData = {
  type: 'alert-tick';
};

const parseNumberFromEnv = (raw: string | undefined, fallback: number, min: number): number => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.floor(parsed));
};

export const SYSTEM_LOG_ALERT_REPEAT_EVERY_MS = parseNumberFromEnv(
  process.env['SYSTEM_LOG_ALERT_REPEAT_EVERY_MS'],
  60_000,
  15_000
);

const SYSTEM_LOG_ALERT_WINDOW_SECONDS = parseNumberFromEnv(
  process.env['SYSTEM_LOG_ALERT_WINDOW_SECONDS'],
  300,
  60
);

const SYSTEM_LOG_ALERT_MIN_ERRORS = parseNumberFromEnv(
  process.env['SYSTEM_LOG_ALERT_MIN_ERRORS'],
  20,
  1
);

const SYSTEM_LOG_ALERT_PER_SOURCE_MIN_ERRORS = parseNumberFromEnv(
  process.env['SYSTEM_LOG_ALERT_PER_SOURCE_MIN_ERRORS'],
  10,
  1
);

const SYSTEM_LOG_ALERT_COOLDOWN_SECONDS = parseNumberFromEnv(
  process.env['SYSTEM_LOG_ALERT_COOLDOWN_SECONDS'],
  600,
  60
);

const SYSTEM_LOG_SILENCE_WINDOW_SECONDS = parseNumberFromEnv(
  process.env['SYSTEM_LOG_SILENCE_WINDOW_SECONDS'],
  300,
  60
);

const SYSTEM_LOG_SILENCE_COOLDOWN_SECONDS = parseNumberFromEnv(
  process.env['SYSTEM_LOG_SILENCE_COOLDOWN_SECONDS'],
  900,
  120
);

const ALERT_QUEUE_NAME = 'system-log-alerts';
const ALERT_REPEAT_JOB_ID = 'system-log-alerts-tick';
const ALERT_STARTUP_JOB_ID = 'system-log-alerts-startup-tick';
const ALERT_EVIDENCE_SAMPLE_LIMIT = 5;
type MongoSystemLogDoc = {
  _id?: string;
  id?: string;
  level?: string;
  message?: string;
  category?: string | null;
  source?: string | null;
  context?: Record<string, unknown> | null;
  stack?: string | null;
  path?: string | null;
  method?: string | null;
  statusCode?: number | null;
  requestId?: string | null;
  userId?: string | null;
  createdAt?: Date;
};

type AlertEvidenceContextRegistry = {
  refs: Array<{
    id: string;
    kind: string;
    providerId?: string;
    entityType?: string;
  }>;
  engineVersion: string | null;
};

type AlertEvidenceSample = {
  logId: string;
  createdAt: string;
  level: string;
  source: string | null;
  message: string;
  fingerprint: string | null;
  contextRegistry: AlertEvidenceContextRegistry | null;
};

type AlertEvidenceContext = {
  windowStart: string | null;
  windowEnd: string;
  matchedCount: number;
  sampleSize: number;
  samples: AlertEvidenceSample[];
  lastObservedLog?: AlertEvidenceSample | null;
};

type AlertEvidenceQuery = {
  level?: 'info' | 'warn' | 'error';
  sourceContains?: string;
  pathPrefix?: string;
  statusCodeMin?: number;
  statusCodeMax?: number;
  from?: Date | null;
  to?: Date | null;
  limit?: number;
};

type SystemLogAlertsQueueState = {
  workerStarted: boolean;
  schedulerRegistered: boolean;
  startupTickQueued: boolean;
  lastAlertAt: number;
  lastSilenceAlertAt: number;
  perSourceLastAlertAt: Record<string, number>;
  perAlertLastFiredAt: Record<string, number>;
};

const globalWithState = globalThis as typeof globalThis & {
  __systemLogAlertsQueueState__?: SystemLogAlertsQueueState;
};

const queueState =
  globalWithState.__systemLogAlertsQueueState__ ??
  (globalWithState.__systemLogAlertsQueueState__ = {
    workerStarted: false,
    schedulerRegistered: false,
    startupTickQueued: false,
    lastAlertAt: 0,
    lastSilenceAlertAt: 0,
    perSourceLastAlertAt: {},
    perAlertLastFiredAt: {},
  });

const shouldCheckAlerts = (): boolean => {
  if (process.env['SYSTEM_LOG_ALERTS_ENABLED'] === 'false') return false;
  return true;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  isObjectRecord(value) ? value : null;

const readTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toSystemLogRecord = (doc: MongoSystemLogDoc): SystemLogRecord => ({
  id: String(doc.id ?? doc._id ?? ''),
  level: doc.level === 'warn' || doc.level === 'info' || doc.level === 'error' ? doc.level : 'error',
  message: doc.message ?? '',
  category: doc.category ?? null,
  source: doc.source ?? null,
  context: doc.context ?? null,
  stack: doc.stack ?? null,
  path: doc.path ?? null,
  method: doc.method ?? null,
  statusCode: doc.statusCode ?? null,
  requestId: doc.requestId ?? null,
  userId: doc.userId ?? null,
  createdAt: (doc.createdAt ?? new Date()).toISOString(),
  updatedAt: null,
});

const toPrismaWhere = (query: AlertEvidenceQuery): Prisma.SystemLogWhereInput => {
  const where: Prisma.SystemLogWhereInput = {};

  if (query.level) where.level = query.level;
  if (query.sourceContains) {
    where.source = { contains: query.sourceContains, mode: 'insensitive' };
  }
  if (query.pathPrefix) {
    where.path = { startsWith: query.pathPrefix, mode: 'insensitive' };
  }
  if (query.statusCodeMin !== undefined || query.statusCodeMax !== undefined) {
    where.statusCode = {
      ...(query.statusCodeMin !== undefined ? { gte: query.statusCodeMin } : {}),
      ...(query.statusCodeMax !== undefined ? { lte: query.statusCodeMax } : {}),
    };
  }
  if (query.from || query.to) {
    where.createdAt = {
      ...(query.from ? { gte: query.from } : {}),
      ...(query.to ? { lte: query.to } : {}),
    };
  }

  return where;
};

const toMongoWhere = (query: AlertEvidenceQuery): Record<string, unknown> => {
  const where: Record<string, unknown> = {};

  if (query.level) where['level'] = query.level;
  if (query.sourceContains) {
    where['source'] = { $regex: escapeRegex(query.sourceContains), $options: 'i' };
  }
  if (query.pathPrefix) {
    where['path'] = { $regex: `^${escapeRegex(query.pathPrefix)}`, $options: 'i' };
  }
  if (query.statusCodeMin !== undefined || query.statusCodeMax !== undefined) {
    where['statusCode'] = {
      ...(query.statusCodeMin !== undefined ? { $gte: query.statusCodeMin } : {}),
      ...(query.statusCodeMax !== undefined ? { $lte: query.statusCodeMax } : {}),
    };
  }
  if (query.from || query.to) {
    where['createdAt'] = {
      ...(query.from ? { $gte: query.from } : {}),
      ...(query.to ? { $lte: query.to } : {}),
    };
  }

  return where;
};

const readContextRegistryEvidence = (value: unknown): AlertEvidenceContextRegistry | null => {
  const contextRegistry = asRecord(value);
  if (!contextRegistry) return null;

  const refs = Array.isArray(contextRegistry['refs'])
    ? contextRegistry['refs']
        .map((ref) => {
          const record = asRecord(ref);
          const id = readTrimmedString(record?.['id']);
          const kind = readTrimmedString(record?.['kind']);
          if (!id || !kind) return null;

          return {
            id,
            kind,
            ...(readTrimmedString(record?.['providerId'])
              ? { providerId: readTrimmedString(record?.['providerId'])! }
              : {}),
            ...(readTrimmedString(record?.['entityType'])
              ? { entityType: readTrimmedString(record?.['entityType'])! }
              : {}),
          };
        })
        .filter((ref): ref is AlertEvidenceContextRegistry['refs'][number] => Boolean(ref))
    : [];

  if (refs.length === 0) return null;

  return {
    refs,
    engineVersion: readTrimmedString(contextRegistry['engineVersion']),
  };
};

const summarizeLogForAlertEvidence = async (log: SystemLogRecord): Promise<AlertEvidenceSample> => {
  const context = await hydrateLogRuntimeContext(log.context ?? null);
  const contextRecord = asRecord(context);
  const contextRegistry = readContextRegistryEvidence(contextRecord?.['contextRegistry']);

  return {
    logId: log.id,
    createdAt: log.createdAt || '',
    level: log.level,
    source: log.source ?? null,
    message: log.message,
    fingerprint: readTrimmedString(contextRecord?.['fingerprint']),
    contextRegistry,
  };
};

const listAlertEvidenceLogs = async (
  provider: 'mongodb' | 'prisma',
  query: AlertEvidenceQuery
): Promise<SystemLogRecord[]> => {
  const limit = Math.max(1, query.limit ?? ALERT_EVIDENCE_SAMPLE_LIMIT);

  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const docs = await mongo
      .collection<MongoSystemLogDoc>('system_logs')
      .find(toMongoWhere(query))
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return docs.map(toSystemLogRecord);
  }

  const rows = await prisma.systemLog.findMany({
    where: toPrismaWhere(query),
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return rows.map((row) => ({
    id: row.id,
    level: (row.level === 'warn' || row.level === 'info' || row.level === 'error'
      ? row.level
      : 'error') as 'error' | 'info' | 'warn',
    message: row.message,
    category: row.category ?? null,
    source: row.source ?? null,
    context: (row.context as Record<string, unknown> | null) ?? null,
    stack: row.stack ?? null,
    path: row.path ?? null,
    method: row.method ?? null,
    statusCode: row.statusCode ?? null,
    requestId: row.requestId ?? null,
    userId: row.userId ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: null,
  }));
};

const buildAlertEvidenceContext = async (input: {
  provider: 'mongodb' | 'prisma';
  query: AlertEvidenceQuery;
  matchedCount: number;
  windowStart?: Date | null;
}): Promise<AlertEvidenceContext> => {
  const logs = await listAlertEvidenceLogs(input.provider, {
    ...input.query,
    limit: ALERT_EVIDENCE_SAMPLE_LIMIT,
  });
  const samples = await Promise.all(logs.map((log) => summarizeLogForAlertEvidence(log)));

  return {
    windowStart: input.windowStart ? input.windowStart.toISOString() : null,
    windowEnd: new Date().toISOString(),
    matchedCount: input.matchedCount,
    sampleSize: samples.length,
    samples,
  };
};

const buildLogSilenceEvidenceContext = async (provider: 'mongodb' | 'prisma'): Promise<AlertEvidenceContext> => {
  const latest = await listAlertEvidenceLogs(provider, {
    limit: 1,
  });
  const lastObservedLog = latest[0] ? await summarizeLogForAlertEvidence(latest[0]) : null;

  return {
    windowStart: null,
    windowEnd: new Date().toISOString(),
    matchedCount: 0,
    sampleSize: 0,
    samples: [],
    lastObservedLog,
  };
};

const isInCooldown = (now: number): boolean => {
  if (queueState.lastAlertAt === 0) return false;
  const elapsedSeconds = (now - queueState.lastAlertAt) / 1000;
  return elapsedSeconds < SYSTEM_LOG_ALERT_COOLDOWN_SECONDS;
};

const isInSilenceCooldown = (now: number): boolean => {
  if (queueState.lastSilenceAlertAt === 0) return false;
  const elapsedSeconds = (now - queueState.lastSilenceAlertAt) / 1000;
  return elapsedSeconds < SYSTEM_LOG_SILENCE_COOLDOWN_SECONDS;
};

const isPerSourceInCooldown = (source: string, now: number): boolean => {
  const last = queueState.perSourceLastAlertAt[source] ?? 0;
  if (!last) return false;
  const elapsedSeconds = (now - last) / 1000;
  return elapsedSeconds < SYSTEM_LOG_ALERT_COOLDOWN_SECONDS;
};

const isAlertInCooldown = (alertId: string, now: number, cooldownSeconds: number): boolean => {
  const last = queueState.perAlertLastFiredAt[alertId] ?? 0;
  if (!last) return false;
  const elapsedSeconds = (now - last) / 1000;
  return elapsedSeconds < cooldownSeconds;
};

const evaluateErrorSpike = async (): Promise<void> => {
  if (!shouldCheckAlerts()) return;

  const now = new Date();
  const windowStart = new Date(now.getTime() - SYSTEM_LOG_ALERT_WINDOW_SECONDS * 1000);

  const provider = await getAppDbProvider();
  let recentErrorCount = 0;

  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const col = mongo.collection('system_logs');
    recentErrorCount = await col.countDocuments({
      level: 'error',
      createdAt: { $gte: windowStart },
    });
  } else {
    recentErrorCount = await prisma.systemLog.count({
      where: {
        level: 'error',
        createdAt: {
          gte: windowStart,
        },
      },
    });
  }

  if (recentErrorCount < SYSTEM_LOG_ALERT_MIN_ERRORS) {
    return;
  }

  const nowMs = Date.now();
  if (isInCooldown(nowMs)) {
    return;
  }

  queueState.lastAlertAt = nowMs;
  const alertEvidence = await buildAlertEvidenceContext({
    provider,
    query: {
      level: 'error',
      from: windowStart,
      to: now,
    },
    matchedCount: recentErrorCount,
    windowStart,
  });

  void logSystemEvent({
    level: 'error',
    source: 'system-log-alerts',
    message: `Error volume spike detected: ${recentErrorCount} errors in the last ${SYSTEM_LOG_ALERT_WINDOW_SECONDS} seconds`,
    critical: true,
    context: {
      alertType: 'error_volume_spike',
      windowSeconds: SYSTEM_LOG_ALERT_WINDOW_SECONDS,
      recentErrorCount,
      minErrors: SYSTEM_LOG_ALERT_MIN_ERRORS,
      alertEvidence,
    },
  });
};

const evaluatePerSourceErrorSpikes = async (): Promise<void> => {
  if (!shouldCheckAlerts()) return;
  if (SYSTEM_LOG_ALERT_PER_SOURCE_MIN_ERRORS <= 0) return;

  const now = new Date();
  const windowStart = new Date(now.getTime() - SYSTEM_LOG_ALERT_WINDOW_SECONDS * 1000);

  const provider = await getAppDbProvider();
  const nowMs = Date.now();

  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const col = mongo.collection('system_logs');
    const groups = await col
      .aggregate<{ _id: string; count: number }>([
        {
          $match: {
            level: 'error',
            createdAt: { $gte: windowStart },
            source: { $nin: [null, ''] },
          },
        },
        { $group: { _id: '$source', count: { $sum: 1 } } },
      ])
      .toArray();

    for (const row of groups) {
      const source = row._id;
      const count = row.count;
      if (count < SYSTEM_LOG_ALERT_PER_SOURCE_MIN_ERRORS) continue;
      if (isPerSourceInCooldown(source, nowMs)) continue;
      queueState.perSourceLastAlertAt[source] = nowMs;
      const alertEvidence = await buildAlertEvidenceContext({
        provider,
        query: {
          level: 'error',
          sourceContains: source,
          from: windowStart,
          to: now,
        },
        matchedCount: count,
        windowStart,
      });

      void logSystemEvent({
        level: 'error',
        source: 'system-log-alerts',
        message: `Error spike for source "${source}": ${count} errors in the last ${SYSTEM_LOG_ALERT_WINDOW_SECONDS} seconds`,
        critical: true,
        context: {
          alertType: 'error_volume_spike_per_source',
          windowSeconds: SYSTEM_LOG_ALERT_WINDOW_SECONDS,
          recentErrorCount: count,
          minErrors: SYSTEM_LOG_ALERT_PER_SOURCE_MIN_ERRORS,
          source,
          alertEvidence,
        },
      });
    }
    return;
  }

  const groups = await prisma.systemLog.groupBy({
    by: ['source'],
    _count: { _all: true },
    where: {
      level: 'error',
      source: { not: null },
      createdAt: {
        gte: windowStart,
      },
    },
  });

  for (const row of groups) {
    const source = row.source as string | null;
    if (!source) continue;
    const count = row._count._all ?? 0;
    if (count < SYSTEM_LOG_ALERT_PER_SOURCE_MIN_ERRORS) continue;
    if (isPerSourceInCooldown(source, nowMs)) continue;
    queueState.perSourceLastAlertAt[source] = nowMs;
    const alertEvidence = await buildAlertEvidenceContext({
      provider,
      query: {
        level: 'error',
        sourceContains: source,
        from: windowStart,
        to: now,
      },
      matchedCount: count,
      windowStart,
    });

    void logSystemEvent({
      level: 'error',
      source: 'system-log-alerts',
      message: `Error spike for source "${source}": ${count} errors in the last ${SYSTEM_LOG_ALERT_WINDOW_SECONDS} seconds`,
      critical: true,
      context: {
        alertType: 'error_volume_spike_per_source',
        windowSeconds: SYSTEM_LOG_ALERT_WINDOW_SECONDS,
        recentErrorCount: count,
        minErrors: SYSTEM_LOG_ALERT_PER_SOURCE_MIN_ERRORS,
        source,
        alertEvidence,
      },
    });
  }
};

type SupportedAlertCondition = {
  type?: 'error_count';
  level?: 'info' | 'warn' | 'error';
  source?: string;
  pathPrefix?: string;
  statusCodeMin?: number;
  statusCodeMax?: number;
  windowSeconds?: number;
  threshold?: number;
  cooldownSeconds?: number;
};

const parseAlertCondition = (alert: Alert): SupportedAlertCondition | null => {
  const raw = alert.condition ?? {};
  if (typeof raw !== 'object' || raw === null) return null;
  const c = raw as Record<string, unknown>;
  const toNumber = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const n = Number(value);
      return Number.isFinite(n) ? n : undefined;
    }
    return undefined;
  };
  const level =
    typeof c['level'] === 'string' && ['info', 'warn', 'error'].includes(c['level'])
      ? (c['level'] as 'info' | 'warn' | 'error')
      : undefined;
  const source = typeof c['source'] === 'string' ? c['source'] : undefined;
  const pathPrefix = typeof c['pathPrefix'] === 'string' ? c['pathPrefix'] : undefined;
  const statusCodeMin = toNumber(c['statusCodeMin']);
  const statusCodeMax = toNumber(c['statusCodeMax']);
  const windowSeconds = toNumber(c['windowSeconds']);
  const threshold = toNumber(c['threshold']);
  const cooldownSeconds = toNumber(c['cooldownSeconds']);
  return {
    type: 'error_count',
    level,
    source,
    pathPrefix,
    statusCodeMin,
    statusCodeMax,
    windowSeconds,
    threshold,
    cooldownSeconds,
  };
};

const evaluateUserDefinedAlerts = async (): Promise<void> => {
  if (!shouldCheckAlerts()) return;
  const alerts = await getSystemAlerts();
  if (!alerts.length) return;

  const provider = await getAppDbProvider();
  const nowMs = Date.now();

  for (const alert of alerts) {
    if (!alert.enabled) continue;
    const cond = parseAlertCondition(alert);
    if (!cond) continue;

    const windowSeconds = cond.windowSeconds ?? SYSTEM_LOG_ALERT_WINDOW_SECONDS;
    const threshold = cond.threshold ?? SYSTEM_LOG_ALERT_MIN_ERRORS;
    const cooldownSeconds = cond.cooldownSeconds ?? SYSTEM_LOG_ALERT_COOLDOWN_SECONDS;

    if (isAlertInCooldown(alert.id, nowMs, cooldownSeconds)) {
      continue;
    }

    const windowStart = new Date(nowMs - windowSeconds * 1000);
    let count = 0;

    if (provider === 'mongodb') {
      const mongo = await getMongoDb();
      const filter: Record<string, unknown> = {
        createdAt: { $gte: windowStart },
      };
      if (cond.level) {
        filter['level'] = cond.level;
      }
      if (cond.source) {
        filter['source'] = { $regex: cond.source, $options: 'i' };
      }
      if (cond.pathPrefix) {
        filter['path'] = { $regex: `^${cond.pathPrefix}`, $options: 'i' };
      }
      if (cond.statusCodeMin !== undefined || cond.statusCodeMax !== undefined) {
        const statusFilter: Record<string, unknown> = {};
        if (cond.statusCodeMin !== undefined) statusFilter['$gte'] = cond.statusCodeMin;
        if (cond.statusCodeMax !== undefined) statusFilter['$lte'] = cond.statusCodeMax;
        filter['statusCode'] = statusFilter;
      }
      const col = mongo.collection('system_logs');
      count = await col.countDocuments(filter);
    } else {
      const where: any = {
        createdAt: {
          gte: windowStart,
        },
      };
      if (cond.level) {
        where.level = cond.level;
      }
      if (cond.source) {
        where.source = { contains: cond.source, mode: 'insensitive' };
      }
      if (cond.pathPrefix) {
        where.path = { startsWith: cond.pathPrefix, mode: 'insensitive' };
      }
      if (cond.statusCodeMin !== undefined || cond.statusCodeMax !== undefined) {
        where.statusCode = {};
        if (cond.statusCodeMin !== undefined) {
          where.statusCode.gte = cond.statusCodeMin;
        }
        if (cond.statusCodeMax !== undefined) {
          where.statusCode.lte = cond.statusCodeMax;
        }
      }
      count = await prisma.systemLog.count({ where });
    }

    if (count < threshold) {
      continue;
    }

    queueState.perAlertLastFiredAt[alert.id] = nowMs;
    const alertEvidence = await buildAlertEvidenceContext({
      provider,
      query: {
        level: cond.level,
        sourceContains: cond.source,
        pathPrefix: cond.pathPrefix,
        statusCodeMin: cond.statusCodeMin,
        statusCodeMax: cond.statusCodeMax,
        from: windowStart,
        to: new Date(nowMs),
      },
      matchedCount: count,
      windowStart,
    });

    void logSystemEvent({
      level: 'error',
      source: 'system-log-alerts',
      message: `User-defined alert "${alert.name}" fired (severity: ${alert.severity})`,
      critical: alert.severity === 'critical' || alert.severity === 'high',
      context: {
        alertType: 'user_defined_alert',
        alertId: alert.id,
        alertName: alert.name,
        severity: alert.severity,
        condition: alert.condition,
        windowSeconds,
        threshold,
        matchedCount: count,
        alertEvidence,
      },
    });
  }
};

const evaluateLogSilence = async (): Promise<void> => {
  if (!shouldCheckAlerts()) return;
  if (process.env['SYSTEM_LOG_SILENCE_ALERTS_ENABLED'] === 'false') return;

  const now = new Date();
  const windowStart = new Date(now.getTime() - SYSTEM_LOG_SILENCE_WINDOW_SECONDS * 1000);

  const provider = await getAppDbProvider();
  let recentTotalCount = 0;

  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const col = mongo.collection('system_logs');
    recentTotalCount = await col.countDocuments({
      createdAt: { $gte: windowStart },
    });
  } else {
    recentTotalCount = await prisma.systemLog.count({
      where: {
        createdAt: {
          gte: windowStart,
        },
      },
    });
  }

  if (recentTotalCount > 0) {
    return;
  }

  const nowMs = Date.now();
  if (isInSilenceCooldown(nowMs)) {
    return;
  }

  queueState.lastSilenceAlertAt = nowMs;
  const alertEvidence = await buildLogSilenceEvidenceContext(provider);

  void logSystemEvent({
    level: 'error',
    source: 'system-log-alerts',
    message: `No logs observed in the last ${SYSTEM_LOG_SILENCE_WINDOW_SECONDS} seconds`,
    critical: true,
    context: {
      alertType: 'log_silence',
      windowSeconds: SYSTEM_LOG_SILENCE_WINDOW_SECONDS,
      totalCount: recentTotalCount,
      alertEvidence,
    },
  });
};

const queue = createManagedQueue<SystemLogAlertsJobData>({
  name: ALERT_QUEUE_NAME,
  concurrency: 1,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
  },
  processor: async () => {
    await evaluateErrorSpike();
    await evaluateLogSilence();
    await evaluatePerSourceErrorSpikes();
    await evaluateUserDefinedAlerts();
  },
});

const syncRepeatSchedulerRegistration = (): void => {
  if (queueState.schedulerRegistered) return;

  void (async () => {
    if (!shouldCheckAlerts()) {
      queueState.schedulerRegistered = false;
      return;
    }

    await queue.enqueue(
      { type: 'alert-tick' },
      {
        repeat: { every: SYSTEM_LOG_ALERT_REPEAT_EVERY_MS },
        jobId: ALERT_REPEAT_JOB_ID,
      }
    );
    queueState.schedulerRegistered = true;
  })();
};

export const startSystemLogAlertsQueue = (): void => {
  if (!queueState.workerStarted) {
    queueState.workerStarted = true;
    queue.startWorker();
  }

  if (!queueState.startupTickQueued && shouldCheckAlerts()) {
    queueState.startupTickQueued = true;
    void queue
      .enqueue(
        { type: 'alert-tick' },
        {
          jobId: ALERT_STARTUP_JOB_ID,
          removeOnComplete: true,
          removeOnFail: true,
        }
      )
      .catch(() => {
        queueState.startupTickQueued = false;
      });
  }

  syncRepeatSchedulerRegistration();
};
