import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createManagedQueueMock = vi.hoisted(() => vi.fn());
const runFilemakerEmailCampaignSchedulerTickMock = vi.hoisted(() => vi.fn());
const enqueueFilemakerEmailCampaignRunJobMock = vi.hoisted(() => vi.fn());
const startFilemakerEmailCampaignQueueMock = vi.hoisted(() => vi.fn());
const upsertFilemakerCampaignSettingValueMock = vi.hoisted(() => vi.fn().mockResolvedValue(true));
const captureExceptionMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const logInfoMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

const startWorkerMock = vi.hoisted(() => vi.fn());
const enqueueMock = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));
vi.mock('@/shared/lib/queue', () => ({
  createManagedQueue: createManagedQueueMock,
}));
vi.mock('@/features/filemaker/server/filemakerEmailCampaignScheduler', () => ({
  runFilemakerEmailCampaignSchedulerTick: runFilemakerEmailCampaignSchedulerTickMock,
}));
vi.mock('@/features/filemaker/workers/filemakerEmailCampaignQueue', () => ({
  enqueueFilemakerEmailCampaignRunJob: enqueueFilemakerEmailCampaignRunJobMock,
  startFilemakerEmailCampaignQueue: startFilemakerEmailCampaignQueueMock,
}));
vi.mock('@/features/filemaker/server/campaign-settings-store', () => ({
  upsertFilemakerCampaignSettingValue: upsertFilemakerCampaignSettingValueMock,
}));
vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
    logInfo: logInfoMock,
  },
}));

const loadModule = async () =>
  import('@/features/filemaker/workers/filemakerEmailCampaignSchedulerQueue');

describe('filemakerEmailCampaignSchedulerQueue', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env['FILEMAKER_EMAIL_CAMPAIGN_SCHEDULER_REPEAT_EVERY_MS'];
    delete process.env['FILEMAKER_EMAIL_CAMPAIGN_SCHEDULER_LOCK_DURATION_MS'];
    delete (globalThis as typeof globalThis & {
      __filemakerEmailCampaignSchedulerQueueState__?: unknown;
    }).__filemakerEmailCampaignSchedulerQueueState__;
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-03T09:15:00.000Z'));

    startWorkerMock.mockReset();
    enqueueMock.mockReset().mockResolvedValue(undefined);
    createManagedQueueMock.mockReset().mockReturnValue({
      startWorker: startWorkerMock,
      enqueue: enqueueMock,
    });
    runFilemakerEmailCampaignSchedulerTickMock.mockReset().mockResolvedValue({
      evaluatedCampaignCount: 0,
      dueCampaignCount: 0,
      launchedRuns: [],
      dueRetryRuns: [],
      skippedByReason: [],
      launchFailures: [],
    });
    enqueueFilemakerEmailCampaignRunJobMock.mockReset().mockResolvedValue({
      dispatchMode: 'queued',
      jobId: 'job-1',
    });
    startFilemakerEmailCampaignQueueMock.mockReset();
    upsertFilemakerCampaignSettingValueMock.mockReset().mockResolvedValue(true);
    captureExceptionMock.mockReset().mockResolvedValue(undefined);
    logInfoMock.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts the worker once and registers startup and repeat ticks', async () => {
    const module = await loadModule();

    expect(module.FILEMAKER_EMAIL_CAMPAIGN_SCHEDULER_REPEAT_EVERY_MS).toBe(60_000);

    module.startFilemakerEmailCampaignSchedulerQueue();
    module.startFilemakerEmailCampaignSchedulerQueue();

    await vi.waitFor(() => {
      expect(startWorkerMock).toHaveBeenCalledTimes(1);
      expect(enqueueMock).toHaveBeenCalledTimes(2);
    });

    expect(enqueueMock).toHaveBeenNthCalledWith(
      1,
      { type: 'scheduled-tick' },
      {
        jobId: 'filemaker-email-campaign-scheduler-startup-tick',
        removeOnComplete: true,
        removeOnFail: true,
      }
    );
    expect(enqueueMock).toHaveBeenNthCalledWith(
      2,
      { type: 'scheduled-tick' },
      {
        repeat: { every: 60_000 },
        jobId: 'filemaker-email-campaign-scheduler-tick',
      }
    );
  });

  it('dispatches launched runs from the scheduler tick and logs the summary', async () => {
    const module = await loadModule();
    const queueConfig = createManagedQueueMock.mock.calls[0]?.[0] as {
      processor: () => Promise<unknown>;
    };

    runFilemakerEmailCampaignSchedulerTickMock.mockResolvedValue({
      evaluatedCampaignCount: 3,
      dueCampaignCount: 2,
      launchedRuns: [
        {
          campaignId: 'campaign-1',
          runId: 'run-1',
          queuedDeliveryCount: 2,
          launchMode: 'scheduled',
        },
        {
          campaignId: 'campaign-2',
          runId: 'run-2',
          queuedDeliveryCount: 0,
          launchMode: 'recurring',
        },
      ],
      dueRetryRuns: [
        {
          campaignId: 'campaign-retry',
          runId: 'run-retry',
          retryableDeliveryCount: 3,
          nextRetryAt: '2026-04-03T09:10:00.000Z',
        },
      ],
      skippedByReason: [{ reason: 'scheduled-not-due', count: 1 }],
      launchFailures: [{ campaignId: 'campaign-3', message: 'launch failed' }],
    });

    const result = await queueConfig.processor();

    expect(startFilemakerEmailCampaignQueueMock).toHaveBeenCalledTimes(1);
    expect(enqueueFilemakerEmailCampaignRunJobMock).toHaveBeenCalledWith({
      campaignId: 'campaign-1',
      runId: 'run-1',
      reason: 'launch',
    });
    expect(enqueueFilemakerEmailCampaignRunJobMock).toHaveBeenCalledWith({
      campaignId: 'campaign-retry',
      runId: 'run-retry',
      reason: 'retry',
    });
    expect(upsertFilemakerCampaignSettingValueMock).toHaveBeenCalledTimes(1);
    expect(upsertFilemakerCampaignSettingValueMock).toHaveBeenCalledWith(
      'filemaker_email_campaign_scheduler_status_v1',
      expect.any(String)
    );
    expect(
      JSON.parse(
        upsertFilemakerCampaignSettingValueMock.mock.calls[0]?.[1] as string
      )
    ).toEqual(
      expect.objectContaining({
        lastStartedAt: '2026-04-03T09:15:00.000Z',
        lastCompletedAt: '2026-04-03T09:15:00.000Z',
        lastSuccessfulAt: '2026-04-03T09:15:00.000Z',
        evaluatedCampaignCount: 3,
        dueCampaignCount: 2,
        queuedDispatchCount: 2,
        inlineDispatchCount: 0,
        launchFailures: [{ campaignId: 'campaign-3', message: 'launch failed' }],
      })
    );
    expect(logInfoMock).toHaveBeenCalledWith('Filemaker campaign scheduler tick processed', {
      service: 'filemaker-email-campaign-scheduler-queue',
      evaluatedCampaignCount: 3,
      dueCampaignCount: 2,
      launchedRunCount: 2,
      launchedRunIds: ['run-1', 'run-2'],
      dueRetryRunCount: 1,
      dueRetryRunIds: ['run-retry'],
      launchFailures: [{ campaignId: 'campaign-3', message: 'launch failed' }],
      skippedByReason: [{ reason: 'scheduled-not-due', count: 1 }],
      queuedDispatchCount: 2,
      inlineDispatchCount: 0,
    });
    expect(result).toEqual({
      evaluatedCampaignCount: 3,
      dueCampaignCount: 2,
      launchedRuns: [
        {
          campaignId: 'campaign-1',
          runId: 'run-1',
          queuedDeliveryCount: 2,
          launchMode: 'scheduled',
        },
        {
          campaignId: 'campaign-2',
          runId: 'run-2',
          queuedDeliveryCount: 0,
          launchMode: 'recurring',
        },
      ],
      dueRetryRuns: [
        {
          campaignId: 'campaign-retry',
          runId: 'run-retry',
          retryableDeliveryCount: 3,
          nextRetryAt: '2026-04-03T09:10:00.000Z',
        },
      ],
      skippedByReason: [{ reason: 'scheduled-not-due', count: 1 }],
      launchFailures: [{ campaignId: 'campaign-3', message: 'launch failed' }],
      queuedDispatchCount: 2,
      inlineDispatchCount: 0,
    });
  });
});
