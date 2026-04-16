import 'server-only';

import { dispatchProductAiJob } from '@/features/products/workers/product-ai-processors';
import type { Job } from '@/features/products/workers/product-ai-processors';
import type { ProductAiJobRecord } from '@/shared/contracts/jobs';
import { notFoundError } from '@/shared/errors/app-error';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { prepareGraphModelDispatchJob } from '@/shared/lib/products/services/product-ai-graph-model-payload';
import { getProductAiJobRepository } from '@/shared/lib/products/services/product-ai-job-repository';
import { createManagedQueue } from '@/shared/lib/queue';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const STALE_RUNNING_TTL_MS = 1000 * 60 * 10;
const LOG_SOURCE = 'product-ai-queue';

type ProductAiJobData = {
  jobId: string;
  productId: string;
  type: string;
  payload: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toDispatchJob = (job: ProductAiJobRecord): Job => {
  if (job.type === 'graph_model') {
    return prepareGraphModelDispatchJob(job);
  }

  const source = isRecord(job.payload) ? job.payload : {};

  const payload: Job['payload'] = {};

  Object.entries(source).forEach(([key, value]) => {
    payload[key] = value;
  });

  if (typeof source['isTest'] === 'boolean') {
    payload.isTest = source['isTest'];
  }
  if (Array.isArray(source['imageUrls'])) {
    payload.imageUrls = source['imageUrls'].filter(
      (value: unknown): value is string => typeof value === 'string'
    );
  }
  if (typeof source['prompt'] === 'string') {
    payload.prompt = source['prompt'];
  }
  if (typeof source['modelId'] === 'string') {
    payload.modelId = source['modelId'];
  }
  if (typeof source['temperature'] === 'number') {
    payload.temperature = source['temperature'];
  }
  if (typeof source['maxTokens'] === 'number') {
    payload.maxTokens = source['maxTokens'];
  }
  if (typeof source['vision'] === 'boolean') {
    payload.vision = source['vision'];
  }
  const resolvedSource = typeof source['source'] === 'string' ? source['source'] : null;
  if (typeof resolvedSource === 'string') {
    payload.source = resolvedSource;
  }
  if (isRecord(source['graph'])) {
    payload.graph = source['graph'];
  }
  if (typeof source['skipAuthCollections'] === 'boolean') {
    payload.skipAuthCollections = source['skipAuthCollections'];
  }

  return {
    ...job,
    payload,
  };
};

const runStoredProductAiJob = async (args: {
  job: ProductAiJobRecord;
  jobRepository: Awaited<ReturnType<typeof getProductAiJobRepository>>;
  logSource: string;
}): Promise<unknown> => {
  const { job, jobRepository, logSource } = args;

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

  await logSystemEvent({
    level: 'info',
    source: logSource,
    message: `Processing job ${job.id} of type "${job.type}"`,
    context: { jobId: job.id, type: job.type },
  });

  try {
    const typedJob = toDispatchJob(job);
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
      source: logSource,
      message: `Job ${job.id} completed`,
      context: { jobId: job.id },
    });
    return result;
  } catch (error) {
    void ErrorSystem.captureException(error);
    const message = error instanceof Error ? error.message : 'Job failed.';
    await ErrorSystem.captureException(error, {
      service: logSource,
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
      return null;
    }
    if (job.status !== 'running' && job.status !== 'pending') {
      await logSystemEvent({
        level: 'info',
        source: LOG_SOURCE,
        message: `Job ${data.jobId} has status "${job.status}", skipping`,
        context: { jobId: data.jobId, status: job.status },
      });
      return null;
    }

    return runStoredProductAiJob({
      job,
      jobRepository,
      logSource: LOG_SOURCE,
    });
  },
});

export const startProductAiJobQueue = (): void => {
  queue.startWorker();
};

export const stopProductAiJobQueue = async (reason?: string): Promise<void> => {
  const suffix = typeof reason === 'string' && reason !== '' ? `: ${reason}` : '';
  await logSystemEvent({
    level: 'info',
    source: LOG_SOURCE,
    message: `Queue worker stopped${suffix}`,
    context: { reason },
  });
  await queue.stopWorker();
};

export const resetProductAiJobQueue = async (): Promise<void> => {
  await queue.stopWorker();
};

export const getQueueStatus = async (): Promise<{
  running: boolean;
  healthy: boolean;
  processing: boolean;
  lastPollTime: number;
  timeSinceLastPoll: number;
}> => {
  const {
    running = false,
    healthy = false,
    processing = false,
    lastPollTime = 0,
    timeSinceLastPoll = 0,
  } = await queue.getHealthStatus();

  return {
    running,
    healthy,
    processing,
    lastPollTime,
    timeSinceLastPoll,
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
    await ErrorSystem.logWarning(`Job ${jobId} not found`, {
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

  await runStoredProductAiJob({
    job,
    jobRepository,
    logSource: SINGLE_LOG_SOURCE,
  });
};
