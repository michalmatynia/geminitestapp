import 'server-only';

import { createManagedQueue } from '@/shared/lib/queue';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';

import {
  ALERT_QUEUE_NAME,
  ALERT_REPEAT_JOB_ID,
  ALERT_STARTUP_JOB_ID,
  SYSTEM_LOG_ALERT_REPEAT_EVERY_MS,
} from './system-log-alerts/config';
import { type SystemLogAlertsJobData } from './system-log-alerts/types';
import { queueState, shouldCheckAlerts } from './system-log-alerts/state';
import {
  evaluateErrorSpike,
  evaluatePerSourceErrorSpikes,
  evaluatePerServiceErrorSpikes,
  evaluateSlowRequestSpikes,
  evaluateTelemetrySilenceForCriticalServices,
  evaluateUserDefinedAlerts,
  evaluateLogSilence,
} from './system-log-alerts/alert-evaluators';

export { SYSTEM_LOG_ALERT_REPEAT_EVERY_MS };

const checkSystemLogAlerts = async (): Promise<void> => {
  if (!shouldCheckAlerts()) return;

  try {
    await evaluateErrorSpike();
    await evaluatePerSourceErrorSpikes();
    await evaluatePerServiceErrorSpikes();
    await evaluateSlowRequestSpikes();
    await evaluateTelemetrySilenceForCriticalServices();
    await evaluateUserDefinedAlerts();
    await evaluateLogSilence();
  } catch (error: unknown) {
    void logSystemEvent({
      level: 'error',
      source: 'system-log-alerts',
      message: `Failed to evaluate system log alerts: ${error instanceof Error ? error.message : 'unknown_error'}`,
      context: {
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      },
    });
  }
};

const queue = createManagedQueue<SystemLogAlertsJobData>({
  name: ALERT_QUEUE_NAME,
  concurrency: 1,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
  },
  processor: async (data) => {
    if (data.type !== 'alert-tick') return;
    await checkSystemLogAlerts();
  },
  onFailed: async (_jobId, error) => {
    void logSystemEvent({
      level: 'error',
      source: 'system-log-alerts',
      message: `System log alerts worker failed: ${error.message}`,
      context: {
        error: { message: error.message, stack: error.stack },
      },
    });
  },
});

const enqueueStartupTick = (): void => {
  if (queueState.startupTickQueued) return;
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
    .catch((error) => {
      queueState.startupTickQueued = false;
      void logSystemEvent({
        level: 'warn',
        source: 'system-log-alerts',
        message: `Failed to enqueue startup system-log alert tick: ${error instanceof Error ? error.message : 'unknown_error'}`,
      });
    });
};

const ensureRepeatScheduler = (): void => {
  if (queueState.schedulerRegistered) return;
  queueState.schedulerRegistered = true;

  void queue
    .enqueue(
      { type: 'alert-tick' },
      {
        repeat: { every: SYSTEM_LOG_ALERT_REPEAT_EVERY_MS },
        jobId: ALERT_REPEAT_JOB_ID,
      }
    )
    .catch((error) => {
      queueState.schedulerRegistered = false;
      void logSystemEvent({
        level: 'warn',
        source: 'system-log-alerts',
        message: `Failed to register system-log alerts scheduler: ${error instanceof Error ? error.message : 'unknown_error'}`,
      });
    });
};

export const startSystemLogAlertsQueue = (): void => {
  if (!queueState.workerStarted) {
    queueState.workerStarted = true;
    queue.startWorker();
  }

  enqueueStartupTick();
  ensureRepeatScheduler();
};

export const registerSystemLogAlertsScheduler = async (): Promise<void> => {
  ensureRepeatScheduler();
};

export const startSystemLogAlertsWorker = async (): Promise<void> => {
  startSystemLogAlertsQueue();
};

export const getSystemLogAlertsQueueStatus = (): {
  enabled: boolean;
  workerStarted: boolean;
  schedulerRegistered: boolean;
  startupTickQueued: boolean;
} => ({
  enabled: shouldCheckAlerts(),
  workerStarted: queueState.workerStarted,
  schedulerRegistered: queueState.schedulerRegistered,
  startupTickQueued: queueState.startupTickQueued,
});
