import { Prisma } from '@/shared/lib/db/prisma-client';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { getSystemAlerts } from '@/shared/lib/observability/system-alerts-repository';
import type {
  SystemLogRecordDto as SystemLogRecord,
  Alert,
} from '@/shared/contracts/observability';

import {
  SYSTEM_LOG_ALERT_WINDOW_SECONDS,
  SYSTEM_LOG_ALERT_MIN_ERRORS,
  SYSTEM_LOG_ALERT_PER_SOURCE_MIN_ERRORS,
  SYSTEM_LOG_ALERT_COOLDOWN_SECONDS,
  SYSTEM_LOG_ALERT_PER_SERVICE_MIN_ERRORS,
  ALERT_GROUP_SCAN_LIMIT,
  SYSTEM_LOG_SLOW_REQUEST_MIN_COUNT,
  SYSTEM_LOG_SLOW_REQUEST_WINDOW_SECONDS,
  SYSTEM_LOG_SLOW_REQUEST_THRESHOLD_MS,
  SYSTEM_LOG_TELEMETRY_CRITICAL_SERVICES,
  SYSTEM_LOG_TELEMETRY_SILENCE_WINDOW_SECONDS,
  SYSTEM_LOG_TELEMETRY_SILENCE_COOLDOWN_SECONDS,
  SYSTEM_LOG_SILENCE_WINDOW_SECONDS,
} from './config';
import { queueState, shouldCheckAlerts } from './state';
import { buildAlertEvidenceContext, readTrimmedString } from './evidence';
import { listAlertEvidenceLogs } from './repository';
import {
  isInCooldown,
  isInSilenceCooldown,
  isPerSourceInCooldown,
  isScopedCooldown,
  readDurationMs,
} from './utils';

export const readService = (log: SystemLogRecord): string | null => {
  const fromTopLevel = readTrimmedString(log.service);
  if (fromTopLevel) return fromTopLevel;
  const context = log.context as Record<string, unknown> | null;
  return readTrimmedString(context?.['service']);
};

export const isAlertInCooldown = (
  alertId: string,
  now: number,
  cooldownSeconds: number
): boolean => {
  const last = queueState.perAlertLastFiredAt[alertId] ?? 0;
  if (!last) return false;
  const elapsedSeconds = (now - last) / 1000;
  return elapsedSeconds < cooldownSeconds;
};

export const evaluateErrorSpike = async (): Promise<void> => {
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

export const evaluatePerSourceErrorSpikes = async (): Promise<void> => {
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
    const source = row.source;
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

export const evaluatePerServiceErrorSpikes = async (): Promise<void> => {
  if (!shouldCheckAlerts()) return;
  if (SYSTEM_LOG_ALERT_PER_SERVICE_MIN_ERRORS <= 0) return;

  const now = new Date();
  const windowStart = new Date(now.getTime() - SYSTEM_LOG_ALERT_WINDOW_SECONDS * 1000);
  const provider = await getAppDbProvider();
  const nowMs = Date.now();
  const logs = await listAlertEvidenceLogs(
    provider,
    {
      level: 'error',
      from: windowStart,
      to: now,
      limit: ALERT_GROUP_SCAN_LIMIT,
    },
    ALERT_GROUP_SCAN_LIMIT
  );

  const groupedCounts = new Map<string, number>();
  for (const log of logs) {
    const service = readService(log);
    if (!service) continue;
    groupedCounts.set(service, (groupedCounts.get(service) ?? 0) + 1);
  }

  for (const [service, count] of groupedCounts.entries()) {
    if (count < SYSTEM_LOG_ALERT_PER_SERVICE_MIN_ERRORS) continue;
    if (
      isScopedCooldown(
        service,
        nowMs,
        queueState.perServiceLastAlertAt,
        SYSTEM_LOG_ALERT_COOLDOWN_SECONDS
      )
    ) {
      continue;
    }
    queueState.perServiceLastAlertAt[service] = nowMs;
    const alertEvidence = await buildAlertEvidenceContext({
      provider,
      query: {
        level: 'error',
        service,
        from: windowStart,
        to: now,
      },
      matchedCount: count,
      windowStart,
    });

    void logSystemEvent({
      level: 'error',
      source: 'system-log-alerts',
      service: 'observability.alerts',
      message: `Error spike for service "${service}": ${count} errors in the last ${SYSTEM_LOG_ALERT_WINDOW_SECONDS} seconds`,
      critical: true,
      context: {
        alertType: 'error_volume_spike_per_service',
        windowSeconds: SYSTEM_LOG_ALERT_WINDOW_SECONDS,
        recentErrorCount: count,
        minErrors: SYSTEM_LOG_ALERT_PER_SERVICE_MIN_ERRORS,
        service,
        alertEvidence,
      },
    });
  }
};

export const evaluateSlowRequestSpikes = async (): Promise<void> => {
  if (!shouldCheckAlerts()) return;
  if (SYSTEM_LOG_SLOW_REQUEST_MIN_COUNT <= 0) return;

  const now = new Date();
  const windowStart = new Date(now.getTime() - SYSTEM_LOG_SLOW_REQUEST_WINDOW_SECONDS * 1000);
  const provider = await getAppDbProvider();
  const nowMs = Date.now();
  const logs = await listAlertEvidenceLogs(
    provider,
    {
      from: windowStart,
      to: now,
      limit: ALERT_GROUP_SCAN_LIMIT,
    },
    ALERT_GROUP_SCAN_LIMIT
  );

  const groupedCounts = new Map<string, { service: string; path: string; count: number }>();

  for (const log of logs) {
    const service = readService(log);
    if (!service) continue;
    const durationMs = readDurationMs(log);
    if (durationMs === null || durationMs < SYSTEM_LOG_SLOW_REQUEST_THRESHOLD_MS) continue;
    if (typeof log.statusCode === 'number' && (log.statusCode < 200 || log.statusCode >= 400)) {
      continue;
    }
    const path = readTrimmedString(log.path) ?? 'unknown-path';
    const key = `${service}|${path}`;
    const existing = groupedCounts.get(key);
    if (!existing) {
      groupedCounts.set(key, { service, path, count: 1 });
      continue;
    }
    existing.count += 1;
    groupedCounts.set(key, existing);
  }

  for (const item of groupedCounts.values()) {
    if (item.count < SYSTEM_LOG_SLOW_REQUEST_MIN_COUNT) continue;
    const cooldownKey = `${item.service}|${item.path}`;
    if (
      isScopedCooldown(
        cooldownKey,
        nowMs,
        queueState.perSlowRouteLastAlertAt,
        SYSTEM_LOG_ALERT_COOLDOWN_SECONDS
      )
    ) {
      continue;
    }

    queueState.perSlowRouteLastAlertAt[cooldownKey] = nowMs;
    const alertEvidence = await buildAlertEvidenceContext({
      provider,
      query: {
        service: item.service,
        pathPrefix: item.path === 'unknown-path' ? undefined : item.path,
        from: windowStart,
        to: now,
      },
      matchedCount: item.count,
      windowStart,
    });

    void logSystemEvent({
      level: 'warn',
      source: 'system-log-alerts',
      service: 'observability.alerts',
      message: `Slow request spike for ${item.service} ${item.path}: ${item.count} slow responses in ${SYSTEM_LOG_SLOW_REQUEST_WINDOW_SECONDS} seconds`,
      critical: false,
      context: {
        alertType: 'slow_request_spike_per_service_endpoint',
        service: item.service,
        path: item.path,
        thresholdMs: SYSTEM_LOG_SLOW_REQUEST_THRESHOLD_MS,
        minCount: SYSTEM_LOG_SLOW_REQUEST_MIN_COUNT,
        windowSeconds: SYSTEM_LOG_SLOW_REQUEST_WINDOW_SECONDS,
        matchedCount: item.count,
        alertEvidence,
      },
    });
  }
};

export const evaluateTelemetrySilenceForCriticalServices = async (): Promise<void> => {
  if (!shouldCheckAlerts()) return;
  if (SYSTEM_LOG_TELEMETRY_CRITICAL_SERVICES.length === 0) return;

  const provider = await getAppDbProvider();
  const now = new Date();
  const windowStart = new Date(now.getTime() - SYSTEM_LOG_TELEMETRY_SILENCE_WINDOW_SECONDS * 1000);
  const nowMs = Date.now();

  for (const service of SYSTEM_LOG_TELEMETRY_CRITICAL_SERVICES) {
    let count = 0;

    if (provider === 'mongodb') {
      const mongo = await getMongoDb();
      count = await mongo.collection('system_logs').countDocuments({
        createdAt: { $gte: windowStart },
        $or: [{ service }, { 'context.service': service }],
      });
    } else {
      count = await prisma.systemLog.count({
        where: {
          createdAt: { gte: windowStart },
          OR: [
            { service },
            {
              context: {
                path: ['service'],
                equals: service,
              },
            },
          ],
        },
      });
    }

    if (count > 0) continue;
    if (
      isScopedCooldown(
        service,
        nowMs,
        queueState.perServiceTelemetrySilenceLastAlertAt,
        SYSTEM_LOG_TELEMETRY_SILENCE_COOLDOWN_SECONDS
      )
    ) {
      continue;
    }

    queueState.perServiceTelemetrySilenceLastAlertAt[service] = nowMs;
    const alertEvidence = await buildAlertEvidenceContext({
      provider,
      query: {
        service,
        from: windowStart,
        to: now,
      },
      matchedCount: 0,
      windowStart,
    });

    void logSystemEvent({
      level: 'error',
      source: 'system-log-alerts',
      service: 'observability.alerts',
      message: `Telemetry silence detected for critical service "${service}" in the last ${SYSTEM_LOG_TELEMETRY_SILENCE_WINDOW_SECONDS} seconds`,
      critical: true,
      context: {
        alertType: 'telemetry_silence_per_service',
        service,
        windowSeconds: SYSTEM_LOG_TELEMETRY_SILENCE_WINDOW_SECONDS,
        alertEvidence,
      },
    });
  }
};

export type SupportedAlertCondition = {
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

export const parseAlertCondition = (alert: Alert): SupportedAlertCondition | null => {
  const raw = alert.condition ?? {};
  if (typeof raw !== 'object' || raw === null) return null;
  const c = raw;
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

export const evaluateUserDefinedAlerts = async (): Promise<void> => {
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
      count = await mongo.collection('system_logs').countDocuments(filter);
    } else {
      const where: Prisma.SystemLogCountArgs['where'] = {
        createdAt: { gte: windowStart },
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
        where.statusCode = {
          ...(cond.statusCodeMin !== undefined ? { gte: cond.statusCodeMin } : {}),
          ...(cond.statusCodeMax !== undefined ? { lte: cond.statusCodeMax } : {}),
        };
      }
      count = await prisma.systemLog.count({ where });
    }

    if (count < threshold) continue;

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
      level: alert.severity === 'critical' ? 'error' : 'warn',
      source: 'system-log-alerts',
      service: 'observability.alerts',
      message: `Custom alert "${alert.name}" fired: ${count} events in ${windowSeconds} seconds`,
      critical: alert.severity === 'critical',
      context: {
        alertId: alert.id,
        alertType: 'user_defined_alert',
        threshold,
        windowSeconds,
        matchedCount: count,
        alertEvidence,
      },
    });
  }
};

export const evaluateLogSilence = async (): Promise<void> => {
  if (!shouldCheckAlerts()) return;

  const now = new Date();
  const windowStart = new Date(now.getTime() - SYSTEM_LOG_SILENCE_WINDOW_SECONDS * 1000);

  const provider = await getAppDbProvider();
  let recentCount = 0;

  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const col = mongo.collection('system_logs');
    recentCount = await col.countDocuments({
      createdAt: { $gte: windowStart },
    });
  } else {
    recentCount = await prisma.systemLog.count({
      where: {
        createdAt: {
          gte: windowStart,
        },
      },
    });
  }

  if (recentCount > 0) {
    return;
  }

  const nowMs = Date.now();
  if (isInSilenceCooldown(nowMs)) {
    return;
  }

  queueState.lastSilenceAlertAt = nowMs;
  const alertEvidence = await buildAlertEvidenceContext({
    provider,
    query: {
      from: windowStart,
      to: now,
    },
    matchedCount: 0,
    windowStart,
  });

  void logSystemEvent({
    level: 'error',
    source: 'system-log-alerts',
    message: `Platform telemetry silence detected: No logs captured in the last ${SYSTEM_LOG_SILENCE_WINDOW_SECONDS} seconds`,
    critical: true,
    context: {
      alertType: 'telemetry_silence',
      windowSeconds: SYSTEM_LOG_SILENCE_WINDOW_SECONDS,
      alertEvidence,
    },
  });
};
