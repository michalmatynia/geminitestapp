import 'server-only';

import { createManagedQueue } from '@/shared/lib/queue';
import type {
  ScheduledTickJobData,
  SchedulerQueueState,
} from '@/shared/lib/queue/scheduler-queue-types';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  FILEMAKER_EMAIL_CAMPAIGN_SCHEDULER_STATUS_KEY,
  toPersistedFilemakerEmailCampaignSchedulerStatus,
} from '../settings';
import { upsertFilemakerCampaignSettingValue } from '../server/campaign-settings-store';
import { runFilemakerEmailCampaignSchedulerTick, type FilemakerEmailCampaignSchedulerTickResult } from '../server/filemakerEmailCampaignScheduler';
import { enqueueFilemakerEmailCampaignRunJob, startFilemakerEmailCampaignQueue } from './filemakerEmailCampaignQueue';

const parseMsFromEnv = (raw: string | undefined, fallback: number, min: number): number => {
  const parsed = Number(raw);
  if (Number.isFinite(parsed) === false) return fallback;
  return Math.max(min, Math.floor(parsed));
};

export const FILEMAKER_EMAIL_CAMPAIGN_SCHEDULER_REPEAT_EVERY_MS = parseMsFromEnv(
  process.env['FILEMAKER_EMAIL_CAMPAIGN_SCHEDULER_REPEAT_EVERY_MS'],
  60_000,
  30_000
);

const FILEMAKER_EMAIL_CAMPAIGN_SCHEDULER_LOCK_DURATION_MS = parseMsFromEnv(
  process.env['FILEMAKER_EMAIL_CAMPAIGN_SCHEDULER_LOCK_DURATION_MS'],
  60_000,
  30_000
);

type FilemakerEmailCampaignSchedulerQueueState = SchedulerQueueState & {
  startupTickQueued: boolean;
};

const globalWithQueueState = globalThis as typeof globalThis & {
  __filemakerEmailCampaignSchedulerQueueState__?: FilemakerEmailCampaignSchedulerQueueState;
};

const queueState =
  globalWithQueueState.__filemakerEmailCampaignSchedulerQueueState__ ??
  (globalWithQueueState.__filemakerEmailCampaignSchedulerQueueState__ = {
    workerStarted: false,
    schedulerRegistered: false,
    startupTickQueued: false,
  });

type DispatchModes = { queued: number; inline: number };

const persistSchedulerStatus = async (
  startedAt: string,
  completedAt: string,
  result: FilemakerEmailCampaignSchedulerTickResult,
  dispatchModes: DispatchModes
): Promise<void> => {
  await upsertFilemakerCampaignSettingValue(
    FILEMAKER_EMAIL_CAMPAIGN_SCHEDULER_STATUS_KEY,
    JSON.stringify(
      toPersistedFilemakerEmailCampaignSchedulerStatus({
        version: 1,
        lastStartedAt: startedAt,
        lastCompletedAt: completedAt,
        lastSuccessfulAt: completedAt,
        evaluatedCampaignCount: result.evaluatedCampaignCount,
        dueCampaignCount: result.dueCampaignCount,
        launchedRuns: result.launchedRuns,
        queuedDispatchCount: dispatchModes.queued,
        inlineDispatchCount: dispatchModes.inline,
        skippedByReason: result.skippedByReason,
        launchFailures: result.launchFailures,
      })
    )
  );
};

const logSchedulerTick = async (
  result: FilemakerEmailCampaignSchedulerTickResult,
  dispatchModes: DispatchModes
): Promise<void> => {
  if (
    result.launchedRuns.length > 0 ||
    result.dueRetryRuns.length > 0 ||
    result.launchFailures.length > 0 ||
    result.skippedByReason.length > 0
  ) {
    await ErrorSystem.logInfo('Filemaker campaign scheduler tick processed', {
      service: 'filemaker-email-campaign-scheduler-queue',
      evaluatedCampaignCount: result.evaluatedCampaignCount,
      dueCampaignCount: result.dueCampaignCount,
      launchedRunCount: result.launchedRuns.length,
      launchedRunIds: result.launchedRuns.map((run) => run.runId),
      dueRetryRunCount: result.dueRetryRuns.length,
      dueRetryRunIds: result.dueRetryRuns.map((run) => run.runId),
      launchFailures: result.launchFailures,
      skippedByReason: result.skippedByReason,
      queuedDispatchCount: dispatchModes.queued,
      inlineDispatchCount: dispatchModes.inline,
    });
  }
};

const queue = createManagedQueue<ScheduledTickJobData>({
  name: 'filemaker-email-campaign-scheduler',
  concurrency: 1,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
  },
  workerOptions: {
    lockDuration: FILEMAKER_EMAIL_CAMPAIGN_SCHEDULER_LOCK_DURATION_MS,
  },
  processor: async () => {
    const startedAt = new Date().toISOString();
    const result = await runFilemakerEmailCampaignSchedulerTick();

    if (
      result.launchedRuns.some((run) => run.queuedDeliveryCount > 0) ||
      result.dueRetryRuns.length > 0
    ) {
      startFilemakerEmailCampaignQueue();
    }

    const dispatchModes: DispatchModes = { queued: 0, inline: 0 };
    const launchDispatchPromises = result.launchedRuns
      .filter((run) => run.queuedDeliveryCount > 0)
      .map((run) =>
        enqueueFilemakerEmailCampaignRunJob({
          campaignId: run.campaignId,
          runId: run.runId,
          reason: 'launch',
        })
      );
    const retryDispatchPromises = result.dueRetryRuns.map((run) =>
      enqueueFilemakerEmailCampaignRunJob({
        campaignId: run.campaignId,
        runId: run.runId,
        reason: 'retry',
      })
    );

    const dispatches = await Promise.all([
      ...launchDispatchPromises,
      ...retryDispatchPromises,
    ]);
    dispatches.forEach((d) => {
      dispatchModes[d.dispatchMode] += 1;
    });

    const completedAt = new Date().toISOString();
    await persistSchedulerStatus(startedAt, completedAt, result, dispatchModes);
    await logSchedulerTick(result, dispatchModes);

    return {
      ...result,
      queuedDispatchCount: dispatchModes.queued,
      inlineDispatchCount: dispatchModes.inline,
    };
  },
  onFailed: async (_jobId, error) => {
    await ErrorSystem.captureException(error, {
      service: 'filemaker-email-campaign-scheduler-queue',
    });
  },
});

export const startFilemakerEmailCampaignSchedulerQueue = (): void => {
  if (queueState.workerStarted === false) {
    queueState.workerStarted = true;
    queue.startWorker();
  }

  if (queueState.startupTickQueued === false) {
    queueState.startupTickQueued = true;
    queue
      .enqueue(
        { type: 'scheduled-tick' },
        {
          jobId: 'filemaker-email-campaign-scheduler-startup-tick',
          removeOnComplete: true,
          removeOnFail: true,
        }
      )
      .catch((error) => {
        queueState.startupTickQueued = false;
        ErrorSystem.captureException(error, {
          service: 'filemaker-email-campaign-scheduler-queue',
          action: 'enqueueStartupTick',
        }).catch(() => {});
      });
  }

  if (queueState.schedulerRegistered === true) return;
  queueState.schedulerRegistered = true;

  queue
    .enqueue(
      { type: 'scheduled-tick' },
      {
        repeat: { every: FILEMAKER_EMAIL_CAMPAIGN_SCHEDULER_REPEAT_EVERY_MS },
        jobId: 'filemaker-email-campaign-scheduler-tick',
      }
    )
    .catch((error) => {
      queueState.schedulerRegistered = false;
      ErrorSystem.captureException(error, {
        service: 'filemaker-email-campaign-scheduler-queue',
        action: 'registerScheduler',
      }).catch(() => {});
    });
};
