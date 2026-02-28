import 'server-only';

import { dispatchProductAiJob } from '@/features/products/workers/product-ai-processors';
import type { Job } from '@/features/products/workers/product-ai-processors';
import { getProductAiJobRepository } from '@/shared/lib/products/services/product-ai-job-repository';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { notFoundError } from '@/shared/errors/app-error';
import { createManagedQueue } from '@/shared/lib/queue';

const STALE_RUNNING_TTL_MS = 1000 * 60 * 10;
const LOG_SOURCE = 'product-ai-queue';

type ProductAiJobData = {
  jobId: string;
  productId: string;
  type: string;
  payload: unknown;
};

const queue = createManagedQueue<ProductAiJobData>({
  name: 'product-ai',
  concurrency: 1,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: false,
  },
  processor: async (data) => {
    const jobRepository = await getProductAiJobRepository();

    // Mark stale running jobs as failed
    const staleResult = await jobRepository.markStaleRunningJobs(STALE_RUNNING_TTL_MS);
    if (staleResult.count > 0) {
      await logSystemEvent({
        level: 'info',
        source: LOG_SOURCE,
        message: `Marked ${staleResult.count} stale running jobs as failed`,
        context: { staleCount: staleResult.count },
      });
    }

    const job = await jobRepository.findJobById(data.jobId);
    if (!job) {
      await logSystemEvent({
        level: 'warn',
        source: LOG_SOURCE,
        message: `Job ${data.jobId} not found, skipping`,
        context: { jobId: data.jobId },
      });
      return;
    }
    if (job.status !== 'running' && job.status !== 'pending') {
      await logSystemEvent({
        level: 'info',
        source: LOG_SOURCE,
        message: `Job ${data.jobId} has status "${job.status}", skipping`,
        context: { jobId: data.jobId, status: job.status },
      });
      return;
    }

    if (job.status === 'pending') {
      await jobRepository.updateJob(job.id, {
        status: 'running',
        startedAt: new Date(),
        productId: job.productId,
        type: job.type,
        payload: job.payload,
        createdAt: job.createdAt,
      });
    }

    const typedJob = job as unknown as Job;
    await logSystemEvent({
      level: 'info',
      source: LOG_SOURCE,
      message: `Processing job ${job.id} of type "${job.type}"`,
      context: { jobId: job.id, type: job.type },
    });

    try {
      const result = await dispatchProductAiJob(typedJob);
      await jobRepository.updateJob(job.id, {
        status: 'completed',
        finishedAt: new Date(),
        result,
        productId: job.productId,
        type: job.type,
        payload: job.payload,
        createdAt: job.createdAt,
      });
      await logSystemEvent({
        level: 'info',
        source: LOG_SOURCE,
        message: `Job ${job.id} completed`,
        context: { jobId: job.id },
      });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Job failed.';
      await ErrorSystem.captureException(error, {
        service: LOG_SOURCE,
        jobId: job.id,
        productId: job.productId,
        jobType: job.type,
      });
      await jobRepository.updateJob(job.id, {
        status: 'failed',
        finishedAt: new Date(),
        errorMessage: message,
        productId: job.productId,
        type: job.type,
        payload: job.payload,
        createdAt: job.createdAt,
      });
      throw error;
    }
  },
});

export const startProductAiJobQueue = (): void => {
  queue.startWorker();
};

export const stopProductAiJobQueue = (reason?: string): void => {
  const suffix = reason ? `: ${reason}` : '';
  void logSystemEvent({
    level: 'info',
    source: LOG_SOURCE,
    message: `Queue worker stopped${suffix}`,
    context: { reason },
  });
  void queue.stopWorker();
};

export const resetProductAiJobQueue = (): void => {
  void queue.stopWorker();
};

export const getQueueStatus = async (): Promise<{
  running: boolean;
  healthy: boolean;
  processing: boolean;
  lastPollTime: number;
  timeSinceLastPoll: number;
}> => {
  const health = await queue.getHealthStatus();
  return {
    running: health.running ?? false,
    healthy: health.healthy ?? false,
    processing: health.processing ?? false,
    lastPollTime: health.lastPollTime ?? 0,
    timeSinceLastPoll: health.timeSinceLastPoll ?? 0,
  };
};

export const enqueueProductAiJobToQueue = async (
  jobId: string,
  productId: string,
  type: string,
  payload: unknown
): Promise<void> => {
  await queue.enqueue({ jobId, productId, type, payload });
};

// Inline processing for serverless/development environments
export const processProductAiJob = async (jobId: string): Promise<void> => {
  const SINGLE_LOG_SOURCE = 'product-ai-queue-single';
  await logSystemEvent({
    level: 'info',
    source: SINGLE_LOG_SOURCE,
    message: `Processing job ${jobId}`,
    context: { jobId },
  });

  const jobRepository = await getProductAiJobRepository();
  const job = await jobRepository.findJobById(jobId);

  if (!job) {
    void ErrorSystem.logWarning(`Job ${jobId} not found`, {
      service: SINGLE_LOG_SOURCE,
      jobId,
    });
    throw notFoundError('Job not found', { jobId });
  }

  if (job.status !== 'pending') {
    await logSystemEvent({
      level: 'info',
      source: SINGLE_LOG_SOURCE,
      message: `Job ${jobId} is not pending (status: ${job.status}), skipping`,
      context: { jobId, status: job.status },
    });
    return;
  }

  await jobRepository.updateJob(job.id, {
    status: 'running',
    startedAt: new Date(),
    productId: job.productId,
    type: job.type,
    payload: job.payload,
    createdAt: job.createdAt,
  });

  try {
    const typedJob = job as unknown as Job;
    const result = await dispatchProductAiJob(typedJob);

    await jobRepository.updateJob(job.id, {
      status: 'completed',
      finishedAt: new Date(),
      result,
      productId: job.productId,
      type: job.type,
      payload: job.payload,
      createdAt: job.createdAt,
    });
    await logSystemEvent({
      level: 'info',
      source: SINGLE_LOG_SOURCE,
      message: `Job ${job.id} completed`,
      context: { jobId: job.id },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Job failed.';
    await ErrorSystem.captureException(error, {
      service: SINGLE_LOG_SOURCE,
      jobId: job.id,
      productId: job.productId,
      jobType: job.type,
    });
    await jobRepository.updateJob(job.id, {
      status: 'failed',
      finishedAt: new Date(),
      errorMessage: message,
      productId: job.productId,
      type: job.type,
      payload: job.payload,
      createdAt: job.createdAt,
    });
    throw error;
  }
};
