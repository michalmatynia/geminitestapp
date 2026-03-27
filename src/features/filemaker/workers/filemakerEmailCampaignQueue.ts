import 'server-only';

import { createManagedQueue, isRedisAvailable } from '@/shared/lib/queue';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  processFilemakerEmailCampaignRun,
  type FilemakerCampaignRunProcessProgress,
} from '../server/campaign-runtime';

import type { FilemakerEmailCampaignRunDispatchMode } from '../types';

type FilemakerEmailCampaignQueueJobData = {
  campaignId: string;
  runId: string;
  reason: 'launch' | 'manual' | 'retry';
};

const LOG_SOURCE = 'filemaker-email-campaign-queue';

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
      onProgress: async (progress: FilemakerCampaignRunProcessProgress) => {
        await context?.updateProgress?.({
          totalCount: progress.totalCount,
          processedCount: progress.processedCount,
          queuedCount: progress.queuedCount,
          sentCount: progress.sentCount,
          failedCount: progress.failedCount,
          skippedCount: progress.skippedCount,
          bouncedCount: progress.bouncedCount,
        });
      },
    });
    return {
      ok: true,
      campaignId: data.campaignId,
      runId: data.runId,
      reason: data.reason,
      jobId,
      progress: result.progress,
      status: result.run.status,
    };
  },
  onCompleted: async (jobId, result, data) => {
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
  void queue.processInline(data).catch(async (error: unknown) => {
    await ErrorSystem.captureException(error, {
      service: LOG_SOURCE,
      campaignId: data.campaignId,
      runId: data.runId,
      reason: data.reason,
      action: 'inline-background-failed',
    });
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
  if (!isRedisAvailable()) {
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
    void ErrorSystem.captureException(error, {
      service: LOG_SOURCE,
      campaignId: data.campaignId,
      runId: data.runId,
      reason: data.reason,
      action: 'enqueue-failed',
    });
    processInlineRunInBackground(data);
    return {
      dispatchMode: 'inline',
      jobId: null,
    };
  }
};
