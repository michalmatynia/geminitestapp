/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const managedQueue = {
    enqueue: vi.fn(),
    getHealthStatus: vi.fn(),
    getQueue: vi.fn(),
    processInline: vi.fn(),
    startWorker: vi.fn(),
    stopWorker: vi.fn(),
  };

  return {
    captureException: vi.fn(),
    evaluateErrorSpike: vi.fn(),
    evaluateLogSilence: vi.fn(),
    evaluatePerServiceErrorSpikes: vi.fn(),
    evaluatePerSourceErrorSpikes: vi.fn(),
    evaluateSlowRequestSpikes: vi.fn(),
    evaluateTelemetrySilenceForCriticalServices: vi.fn(),
    evaluateUserDefinedAlerts: vi.fn(),
    logSystemEvent: vi.fn(),
    managedQueue,
    queueConfig: null as null | {
      concurrency: number;
      name: string;
      onFailed: (jobId: string, error: Error) => Promise<void>;
      processor: (data: { type: string }, jobId: string) => Promise<void>;
    },
  };
});

vi.mock('@/shared/lib/queue', () => ({
  createManagedQueue: vi.fn((config) => {
    mocks.queueConfig = config as typeof mocks.queueConfig;
    return mocks.managedQueue;
  }),
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: mocks.logSystemEvent,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: mocks.captureException,
  },
}));

vi.mock('@/shared/lib/observability/workers/system-log-alerts/alert-evaluators', () => ({
  evaluateErrorSpike: mocks.evaluateErrorSpike,
  evaluateLogSilence: mocks.evaluateLogSilence,
  evaluatePerServiceErrorSpikes: mocks.evaluatePerServiceErrorSpikes,
  evaluatePerSourceErrorSpikes: mocks.evaluatePerSourceErrorSpikes,
  evaluateSlowRequestSpikes: mocks.evaluateSlowRequestSpikes,
  evaluateTelemetrySilenceForCriticalServices:
    mocks.evaluateTelemetrySilenceForCriticalServices,
  evaluateUserDefinedAlerts: mocks.evaluateUserDefinedAlerts,
}));

import {
  getSystemLogAlertsQueueStatus,
  registerSystemLogAlertsScheduler,
  startSystemLogAlertsQueue,
  startSystemLogAlertsWorker,
  SYSTEM_LOG_ALERT_REPEAT_EVERY_MS,
} from './systemLogAlertsQueue';
import {
  ALERT_QUEUE_NAME,
  ALERT_REPEAT_JOB_ID,
  ALERT_STARTUP_JOB_ID,
  SYSTEM_LOG_ALERT_REPEAT_EVERY_MS as repeatEveryMsFromConfig,
} from './system-log-alerts/config';
import { queueState } from './system-log-alerts/state';

const flushAsyncWork = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('systemLogAlertsQueue shared-lib', () => {
  beforeEach(() => {
    queueState.lastAlertAt = 0;
    queueState.lastSilenceAlertAt = 0;
    queueState.perAlertLastFiredAt = {};
    queueState.perServiceLastAlertAt = {};
    queueState.perServiceTelemetrySilenceLastAlertAt = {};
    queueState.perSlowRouteLastAlertAt = {};
    queueState.perSourceLastAlertAt = {};
    queueState.schedulerRegistered = false;
    queueState.startupTickQueued = false;
    queueState.workerStarted = false;
    delete process.env['SYSTEM_LOG_ALERTS_ENABLED'];

    mocks.captureException.mockReset();
    mocks.evaluateErrorSpike.mockReset().mockResolvedValue(undefined);
    mocks.evaluateLogSilence.mockReset().mockResolvedValue(undefined);
    mocks.evaluatePerServiceErrorSpikes.mockReset().mockResolvedValue(undefined);
    mocks.evaluatePerSourceErrorSpikes.mockReset().mockResolvedValue(undefined);
    mocks.evaluateSlowRequestSpikes.mockReset().mockResolvedValue(undefined);
    mocks.evaluateTelemetrySilenceForCriticalServices.mockReset().mockResolvedValue(undefined);
    mocks.evaluateUserDefinedAlerts.mockReset().mockResolvedValue(undefined);
    mocks.logSystemEvent.mockReset().mockResolvedValue(undefined);
    mocks.managedQueue.enqueue.mockReset().mockResolvedValue('job-1');
    mocks.managedQueue.getHealthStatus.mockReset().mockResolvedValue({});
    mocks.managedQueue.getQueue.mockReset();
    mocks.managedQueue.processInline.mockReset();
    mocks.managedQueue.startWorker.mockReset();
    mocks.managedQueue.stopWorker.mockReset();
  });

  it('registers the managed queue with the expected scheduler configuration', () => {
    expect(mocks.queueConfig).toBeTruthy();
    expect(mocks.queueConfig?.name).toBe(ALERT_QUEUE_NAME);
    expect(mocks.queueConfig?.concurrency).toBe(1);
    expect(typeof mocks.queueConfig?.processor).toBe('function');
    expect(typeof mocks.queueConfig?.onFailed).toBe('function');
    expect(SYSTEM_LOG_ALERT_REPEAT_EVERY_MS).toBe(repeatEveryMsFromConfig);
  });

  it('starts the worker and schedules startup and repeat jobs only once', () => {
    startSystemLogAlertsQueue();

    expect(mocks.managedQueue.startWorker).toHaveBeenCalledTimes(1);
    expect(mocks.managedQueue.enqueue).toHaveBeenCalledTimes(2);
    expect(mocks.managedQueue.enqueue).toHaveBeenNthCalledWith(
      1,
      { type: 'alert-tick' },
      {
        jobId: ALERT_STARTUP_JOB_ID,
        removeOnComplete: true,
        removeOnFail: true,
      }
    );
    expect(mocks.managedQueue.enqueue).toHaveBeenNthCalledWith(
      2,
      { type: 'alert-tick' },
      {
        jobId: ALERT_REPEAT_JOB_ID,
        repeat: { every: SYSTEM_LOG_ALERT_REPEAT_EVERY_MS },
      }
    );

    startSystemLogAlertsQueue();

    expect(mocks.managedQueue.startWorker).toHaveBeenCalledTimes(1);
    expect(mocks.managedQueue.enqueue).toHaveBeenCalledTimes(2);
    expect(getSystemLogAlertsQueueStatus()).toEqual({
      enabled: true,
      schedulerRegistered: true,
      startupTickQueued: true,
      workerStarted: true,
    });
  });

  it('runs evaluators for alert ticks, ignores non-alert jobs, and honors the disable flag', async () => {
    await mocks.queueConfig?.processor({ type: 'noop' }, 'job-0');

    expect(mocks.evaluateErrorSpike).not.toHaveBeenCalled();

    process.env['SYSTEM_LOG_ALERTS_ENABLED'] = 'true';
    await mocks.queueConfig?.processor({ type: 'alert-tick' }, 'job-1');

    expect(mocks.evaluateErrorSpike).toHaveBeenCalledTimes(1);
    expect(mocks.evaluatePerSourceErrorSpikes).toHaveBeenCalledTimes(1);
    expect(mocks.evaluatePerServiceErrorSpikes).toHaveBeenCalledTimes(1);
    expect(mocks.evaluateSlowRequestSpikes).toHaveBeenCalledTimes(1);
    expect(mocks.evaluateTelemetrySilenceForCriticalServices).toHaveBeenCalledTimes(1);
    expect(mocks.evaluateUserDefinedAlerts).toHaveBeenCalledTimes(1);
    expect(mocks.evaluateLogSilence).toHaveBeenCalledTimes(1);

    mocks.evaluateErrorSpike.mockClear();
    mocks.evaluateLogSilence.mockClear();
    mocks.evaluatePerServiceErrorSpikes.mockClear();
    mocks.evaluatePerSourceErrorSpikes.mockClear();
    mocks.evaluateSlowRequestSpikes.mockClear();
    mocks.evaluateTelemetrySilenceForCriticalServices.mockClear();
    mocks.evaluateUserDefinedAlerts.mockClear();

    process.env['SYSTEM_LOG_ALERTS_ENABLED'] = 'false';
    await mocks.queueConfig?.processor({ type: 'alert-tick' }, 'job-2');

    expect(mocks.evaluateErrorSpike).not.toHaveBeenCalled();
    expect(mocks.evaluatePerSourceErrorSpikes).not.toHaveBeenCalled();
    expect(mocks.evaluatePerServiceErrorSpikes).not.toHaveBeenCalled();
    expect(mocks.evaluateSlowRequestSpikes).not.toHaveBeenCalled();
    expect(mocks.evaluateTelemetrySilenceForCriticalServices).not.toHaveBeenCalled();
    expect(mocks.evaluateUserDefinedAlerts).not.toHaveBeenCalled();
    expect(mocks.evaluateLogSilence).not.toHaveBeenCalled();
    expect(getSystemLogAlertsQueueStatus().enabled).toBe(false);
  });

  it('captures evaluator failures and reports queue worker failures', async () => {
    const evaluatorError = new Error('evaluator failed');
    mocks.evaluateErrorSpike.mockRejectedValueOnce(evaluatorError);

    await mocks.queueConfig?.processor({ type: 'alert-tick' }, 'job-3');

    expect(mocks.captureException).toHaveBeenCalledWith(evaluatorError);
    expect(mocks.logSystemEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'error',
        source: 'system-log-alerts',
        message: 'Failed to evaluate system log alerts: evaluator failed',
      })
    );

    const workerError = new Error('worker failed');
    await mocks.queueConfig?.onFailed('job-4', workerError);

    expect(mocks.logSystemEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'error',
        source: 'system-log-alerts',
        message: 'System log alerts worker failed: worker failed',
      })
    );
  });

  it('resets scheduler flags when startup or repeat enqueueing fails', async () => {
    mocks.managedQueue.enqueue
      .mockRejectedValueOnce(new Error('startup failed'))
      .mockRejectedValueOnce(new Error('repeat failed'));

    startSystemLogAlertsQueue();
    await flushAsyncWork();

    expect(queueState.workerStarted).toBe(true);
    expect(queueState.startupTickQueued).toBe(false);
    expect(queueState.schedulerRegistered).toBe(false);
    expect(mocks.logSystemEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'warn',
        message: 'Failed to enqueue startup system-log alert tick: startup failed',
      })
    );
    expect(mocks.logSystemEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'warn',
        message: 'Failed to register system-log alerts scheduler: repeat failed',
      })
    );
  });

  it('exposes wrapper entry points for scheduler-only and full worker startup', async () => {
    await registerSystemLogAlertsScheduler();

    expect(mocks.managedQueue.startWorker).not.toHaveBeenCalled();
    expect(mocks.managedQueue.enqueue).toHaveBeenCalledTimes(1);
    expect(mocks.managedQueue.enqueue).toHaveBeenCalledWith(
      { type: 'alert-tick' },
      {
        jobId: ALERT_REPEAT_JOB_ID,
        repeat: { every: SYSTEM_LOG_ALERT_REPEAT_EVERY_MS },
      }
    );

    queueState.schedulerRegistered = false;
    queueState.startupTickQueued = false;
    queueState.workerStarted = false;
    mocks.managedQueue.enqueue.mockClear();
    mocks.managedQueue.startWorker.mockClear();

    await startSystemLogAlertsWorker();

    expect(mocks.managedQueue.startWorker).toHaveBeenCalledTimes(1);
    expect(mocks.managedQueue.enqueue).toHaveBeenCalledTimes(2);
  });
});
