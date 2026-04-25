import 'server-only';

import { createManagedQueue, isRedisAvailable } from '@/shared/lib/queue';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  processFilemakerEmailCampaignRun,
} from '../server/campaign-runtime';
import type { FilemakerCampaignRunProcessProgress } from '../server/campaign-runtime.helpers';

import type { FilemakerEmailCampaignRunDispatchMode } from '../types';

type FilemakerEmailCampaignQueueJobData = {
  campaignId: string;
  runId: string;
  reason: 'launch' | 'manual' | 'retry';
};

type FilemakerEmailCampaignQueueJobResult = {
  ok: true;
  campaignId: string;
  runId: string;
  reason: FilemakerEmailCampaignQueueJobData['reason'];
  jobId: string;
  progress: FilemakerCampaignRunProcessProgress;
  status: string;
  retryableDeliveryCount: number;
  retryExhaustedCount: number;
  suggestedRetryDelayMs: number | null;
};

const LOG_SOURCE = 'filemaker-email-campaign-queue';

const scheduleAutomaticRetry = async (
  data: FilemakerEmailCampaignQueueJobData,
  result: FilemakerEmailCampaignQueueJobResult
): Promise<void> => {
  if (!isRedisAvailable()) return;
  if (result.retryableDeliveryCount <= 0) return;
  if (result.suggestedRetryDelayMs === null || result.suggestedRetryDelayMs <= 0) return;

  await queue.enqueue(
    {
      campaignId: data.campaignId,
      runId: data.runId,
      reason: 'retry',
    },
    {
      delay: result.suggestedRetryDelayMs,
      jobId: `retry__${data.runId}__${Date.now()}`,
    }
  );
};

const queue = createManagedQueue<FilemakerEmailCampaignQueueJobData>({
  name: 'filemaker-email-campaign',
  concurrency: 1,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
  processor: async (data, jobId, _signal, context) => {
    const result = await processFilemakerEmailCampaignRun({
      runId: data.runId,
      reason: data.reason === 'launch' ? 'manual' : data.reason,
    });

    if (context !== undefined && typeof context.updateProgress === 'function') {
      await context.updateProgress({
        totalCount: result.progress.totalCount,
        processedCount: result.progress.processedCount,
        queuedCount: result.progress.queuedCount,
        sentCount: result.progress.sentCount,
        failedCount: result.progress.failedCount,
        skippedCount: result.progress.skippedCount,
        bouncedCount: result.progress.bouncedCount,
      });
    }

    return {
      ok: true,
      campaignId: data.campaignId,
      runId: data.runId,
      reason: data.reason,
      jobId,
      progress: result.progress,
      status: result.run.status,
      retryableDeliveryCount: result.retryableDeliveryCount,
      retryExhaustedCount: result.retryExhaustedCount,
      suggestedRetryDelayMs: result.suggestedRetryDelayMs,
    };
  },
  onCompleted: async (jobId, result, data) => {
    const typedResult =
      (result !== null &&
      typeof result === 'object' &&
      'ok' in result &&
      'retryableDeliveryCount' in result &&
      'suggestedRetryDelayMs' in result)
        ? (result as FilemakerEmailCampaignQueueJobResult)
        : null;
    if (typedResult !== null) {
      try {
        await scheduleAutomaticRetry(data, typedResult);
      } catch (error) {
        await ErrorSystem.captureException(error, {
          service: LOG_SOURCE,
          campaignId: data.campaignId,
          runId: data.runId,
          reason: data.reason,
          jobId,
          action: 'schedule-automatic-retry',
        });
      }
    }
    await ErrorSystem.logInfo('Filemaker campaign job completed', {
      service: LOG_SOURCE,
      campaignId: data.campaignId,
      runId: data.runId,
      reason: data.reason,
      jobId,
      result,
    });
  },
  onFailed: async (jobId, error, data) => {
    await ErrorSystem.captureException(error, {
      service: LOG_SOURCE,
      campaignId: data.campaignId,
      runId: data.runId,
      reason: data.reason,
      jobId,
    });
  },
});

const processInlineRunInBackground = (data: FilemakerEmailCampaignQueueJobData): void => {
  queue.processInline(data).catch((error: unknown) => {
    ErrorSystem.captureException(error, {
      service: LOG_SOURCE,
      campaignId: data.campaignId,
      runId: data.runId,
      reason: data.reason,
      action: 'inline-background-failed',
    }).catch(() => {});
  });
};

export const startFilemakerEmailCampaignQueue = (): void => {
  queue.startWorker();
};

export const stopFilemakerEmailCampaignQueue = async (): Promise<void> => {
  await queue.stopWorker();
};

export const enqueueFilemakerEmailCampaignRunJob = async (
  data: FilemakerEmailCampaignQueueJobData
): Promise<{ dispatchMode: Exclude<FilemakerEmailCampaignRunDispatchMode, 'dry_run'>; jobId: string | null }> => {
  if (isRedisAvailable() === false) {
    processInlineRunInBackground(data);
    return {
      dispatchMode: 'inline',
      jobId: null,
    };
  }

  try {
    const jobId = await queue.enqueue(data, {
      jobId: `${data.reason}__${data.runId}`,
    });
    return {
      dispatchMode: 'queued',
      jobId,
    };
  } catch (error) {
    ErrorSystem.captureException(error, {
      service: LOG_SOURCE,
      campaignId: data.campaignId,
      runId: data.runId,
      reason: data.reason,
      action: 'enqueue-failed',
    }).catch(() => {});
    processInlineRunInBackground(data);
    return {
      dispatchMode: 'inline',
      jobId: null,
    };
  }
};
