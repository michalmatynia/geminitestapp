import 'server-only';

import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import { createManagedQueue } from '@/shared/lib/queue';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';

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

type SystemLogAlertsQueueState = {
  workerStarted: boolean;
  schedulerRegistered: boolean;
  startupTickQueued: boolean;
  lastAlertAt: number;
  lastSilenceAlertAt: number;
  perSourceLastAlertAt: Record<string, number>;
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
  });

const shouldCheckAlerts = (): boolean => {
  if (process.env['SYSTEM_LOG_ALERTS_ENABLED'] === 'false') return false;
  return true;
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

  void logSystemEvent({
    level: 'error',
    source: 'system-log-alerts',
    message: `No logs observed in the last ${SYSTEM_LOG_SILENCE_WINDOW_SECONDS} seconds`,
    critical: true,
    context: {
      alertType: 'log_silence',
      windowSeconds: SYSTEM_LOG_SILENCE_WINDOW_SECONDS,
      totalCount: recentTotalCount,
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

