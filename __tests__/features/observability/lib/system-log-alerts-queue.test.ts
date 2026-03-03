import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const managedQueue = {
    enqueue: vi.fn().mockResolvedValue('job-1'),
    startWorker: vi.fn(),
    stopWorker: vi.fn(),
    getHealthStatus: vi.fn().mockResolvedValue({}),
    processInline: vi.fn(),
    getQueue: vi.fn(),
  };

  return {
    managedQueue,
    queueConfig: null as {
      name: string;
      concurrency: number;
      processor: (data: { type: 'alert-tick' }, jobId: string) => Promise<void>;
    } | null,
  };
});

vi.mock('@/shared/lib/queue', () => ({
  createManagedQueue: vi.fn((config) => {
    mocks.queueConfig = config as {
      name: string;
      concurrency: number;
      processor: (data: { type: 'alert-tick' }, jobId: string) => Promise<void>;
    };
    return mocks.managedQueue;
  }),
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/shared/lib/observability/workers/system-log-alerts/alert-evaluators', () => ({
  evaluateErrorSpike: vi.fn().mockResolvedValue(undefined),
  evaluatePerSourceErrorSpikes: vi.fn().mockResolvedValue(undefined),
  evaluatePerServiceErrorSpikes: vi.fn().mockResolvedValue(undefined),
  evaluateSlowRequestSpikes: vi.fn().mockResolvedValue(undefined),
  evaluateTelemetrySilenceForCriticalServices: vi.fn().mockResolvedValue(undefined),
  evaluateUserDefinedAlerts: vi.fn().mockResolvedValue(undefined),
  evaluateLogSilence: vi.fn().mockResolvedValue(undefined),
}));

import {
  startSystemLogAlertsQueue,
  getSystemLogAlertsQueueStatus,
} from '@/shared/lib/observability/workers/systemLogAlertsQueue';
import { queueState } from '@/shared/lib/observability/workers/system-log-alerts/state';
import {
  ALERT_QUEUE_NAME,
  ALERT_REPEAT_JOB_ID,
  ALERT_STARTUP_JOB_ID,
  SYSTEM_LOG_ALERT_REPEAT_EVERY_MS,
} from '@/shared/lib/observability/workers/system-log-alerts/config';
import {
  evaluateErrorSpike,
  evaluatePerSourceErrorSpikes,
  evaluatePerServiceErrorSpikes,
  evaluateSlowRequestSpikes,
  evaluateTelemetrySilenceForCriticalServices,
  evaluateUserDefinedAlerts,
  evaluateLogSilence,
} from '@/shared/lib/observability/workers/system-log-alerts/alert-evaluators';

describe('systemLogAlertsQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queueState.workerStarted = false;
    queueState.schedulerRegistered = false;
    queueState.startupTickQueued = false;
    delete process.env['SYSTEM_LOG_ALERTS_ENABLED'];
  });

  it('registers managed queue with explicit queue name', () => {
    expect(mocks.queueConfig).toBeTruthy();
    expect(mocks.queueConfig?.name).toBe(ALERT_QUEUE_NAME);
    expect(mocks.queueConfig?.concurrency).toBe(1);
    expect(typeof mocks.queueConfig?.processor).toBe('function');
  });

  it('starts worker and enqueues startup + repeat jobs once', () => {
    startSystemLogAlertsQueue();

    expect(mocks.managedQueue.startWorker).toHaveBeenCalledTimes(1);
    expect(mocks.managedQueue.enqueue).toHaveBeenCalledTimes(2);
    expect(mocks.managedQueue.enqueue).toHaveBeenNthCalledWith(
      1,
      { type: 'alert-tick' },
      expect.objectContaining({
        jobId: ALERT_STARTUP_JOB_ID,
      })
    );
    expect(mocks.managedQueue.enqueue).toHaveBeenNthCalledWith(
      2,
      { type: 'alert-tick' },
      expect.objectContaining({
        jobId: ALERT_REPEAT_JOB_ID,
        repeat: { every: SYSTEM_LOG_ALERT_REPEAT_EVERY_MS },
      })
    );

    startSystemLogAlertsQueue();

    expect(mocks.managedQueue.startWorker).toHaveBeenCalledTimes(1);
    expect(mocks.managedQueue.enqueue).toHaveBeenCalledTimes(2);

    expect(getSystemLogAlertsQueueStatus()).toEqual({
      enabled: true,
      workerStarted: true,
      schedulerRegistered: true,
      startupTickQueued: true,
    });
  });

  it('runs alert evaluators only when alerts are enabled', async () => {
    process.env['SYSTEM_LOG_ALERTS_ENABLED'] = 'true';
    await mocks.queueConfig?.processor({ type: 'alert-tick' }, 'job-1');

    expect(evaluateErrorSpike).toHaveBeenCalledTimes(1);
    expect(evaluatePerSourceErrorSpikes).toHaveBeenCalledTimes(1);
    expect(evaluatePerServiceErrorSpikes).toHaveBeenCalledTimes(1);
    expect(evaluateSlowRequestSpikes).toHaveBeenCalledTimes(1);
    expect(evaluateTelemetrySilenceForCriticalServices).toHaveBeenCalledTimes(1);
    expect(evaluateUserDefinedAlerts).toHaveBeenCalledTimes(1);
    expect(evaluateLogSilence).toHaveBeenCalledTimes(1);

    vi.mocked(evaluateErrorSpike).mockClear();
    vi.mocked(evaluatePerSourceErrorSpikes).mockClear();
    vi.mocked(evaluatePerServiceErrorSpikes).mockClear();
    vi.mocked(evaluateSlowRequestSpikes).mockClear();
    vi.mocked(evaluateTelemetrySilenceForCriticalServices).mockClear();
    vi.mocked(evaluateUserDefinedAlerts).mockClear();
    vi.mocked(evaluateLogSilence).mockClear();

    process.env['SYSTEM_LOG_ALERTS_ENABLED'] = 'false';
    await mocks.queueConfig?.processor({ type: 'alert-tick' }, 'job-2');

    expect(evaluateErrorSpike).not.toHaveBeenCalled();
    expect(evaluatePerSourceErrorSpikes).not.toHaveBeenCalled();
    expect(evaluatePerServiceErrorSpikes).not.toHaveBeenCalled();
    expect(evaluateSlowRequestSpikes).not.toHaveBeenCalled();
    expect(evaluateTelemetrySilenceForCriticalServices).not.toHaveBeenCalled();
    expect(evaluateUserDefinedAlerts).not.toHaveBeenCalled();
    expect(evaluateLogSilence).not.toHaveBeenCalled();
  });
});
