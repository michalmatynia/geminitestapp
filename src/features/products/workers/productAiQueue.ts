import 'server-only';

import { dispatchProductAiJob } from '@/features/products/workers/product-ai-processors';
import type { Job } from '@/features/products/workers/product-ai-processors';
import type { ProductAiJobRecord, ProductAiJobUpdate } from '@/shared/contracts/jobs';
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveBasePayload(source: Record<string, unknown>): Job['payload'] {
  const payload: Job['payload'] = { ...source };
  if (typeof source['prompt'] === 'string') payload.prompt = source['prompt'];
  if (typeof source['modelId'] === 'string') payload.modelId = source['modelId'];
  const src = source['source'];
  if (typeof src === 'string') payload.source = src;
  if (typeof source['temperature'] === 'number') payload.temperature = source['temperature'];
  if (typeof source['maxTokens'] === 'number') payload.maxTokens = source['maxTokens'];
  return payload;
}

function resolveExtendedPayload(source: Record<string, unknown>, base: Job['payload']): Job['payload'] {
  const payload = { ...base };
  if (typeof source['isTest'] === 'boolean') payload.isTest = source['isTest'];
  if (typeof source['vision'] === 'boolean') payload.vision = source['vision'];
  if (typeof source['skipAuthCollections'] === 'boolean') payload.skipAuthCollections = source['skipAuthCollections'];
  if (Array.isArray(source['imageUrls'])) {
    payload.imageUrls = source['imageUrls'].filter((v): v is string => typeof v === 'string');
  }
  const g = source['graph'];
  if (isRecord(g)) payload.graph = g;
  return payload;
}

function toDispatchJob(job: ProductAiJobRecord): Job {
  if (job.type === 'graph_model') return prepareGraphModelDispatchJob(job);
  
  const source = isRecord(job.payload) ? job.payload : {};
  const base = resolveBasePayload(source);
  const payload = resolveExtendedPayload(source, base);

  return { ...job, payload };
}

type JobRepo = Awaited<ReturnType<typeof getProductAiJobRepository>>;

async function updateJobStatus(repo: JobRepo, job: ProductAiJobRecord, status: ProductAiJobRecord['status'], extra: ProductAiJobUpdate = {}): Promise<void> {
  const update: ProductAiJobUpdate = {
    status,
    productId: job.productId,
    type: job.type,
    payload: job.payload,
    createdAt: job.createdAt,
    ...extra
  };
  await repo.updateJob(job.id, update);
}

async function runStoredProductAiJob(args: {
  job: ProductAiJobRecord;
  jobRepository: JobRepo;
  logSource: string;
}): Promise<unknown> {
  const { job, jobRepository, logSource } = args;

  if (job.status === 'pending') {
    await updateJobStatus(jobRepository, job, 'running', { startedAt: new Date() });
  }

  await logSystemEvent({
    level: 'info', source: logSource,
    message: `Processing job ${job.id} of type "${job.type}"`,
    context: { jobId: job.id, type: job.type },
  });

  try {
    const result = await dispatchProductAiJob(toDispatchJob(job));
    await updateJobStatus(jobRepository, job, 'completed', { finishedAt: new Date(), result });
    await logSystemEvent({ level: 'info', source: logSource, message: `Job ${job.id} completed`, context: { jobId: job.id } });
    return result;
  } catch (error: unknown) {
    ErrorSystem.captureException(error).catch(() => { /* silent */ });
    const msg = error instanceof Error ? error.message : 'Job failed.';
    await ErrorSystem.captureException(error, { service: logSource, jobId: job.id, productId: job.productId, jobType: job.type });
    await updateJobStatus(jobRepository, job, 'failed', { finishedAt: new Date(), errorMessage: msg });
    throw error;
  }
}

const queue = createManagedQueue<ProductAiJobData>({
  name: 'product-ai',
  concurrency: 1,
  defaultJobOptions: { attempts: 1, removeOnComplete: true, removeOnFail: false },
  processor: async (data) => {
    const jobRepository = await getProductAiJobRepository();
    const staleResult = await jobRepository.markStaleRunningJobs(STALE_RUNNING_TTL_MS);
    if (staleResult.count > 0) {
      await logSystemEvent({ level: 'info', source: LOG_SOURCE, message: `Marked ${staleResult.count} stale running jobs as failed`, context: { staleCount: staleResult.count } });
    }

    const job = await jobRepository.findJobById(data.jobId);
    if (job === null) {
      await logSystemEvent({ level: 'warn', source: LOG_SOURCE, message: `Job ${data.jobId} not found, skipping`, context: { jobId: data.jobId } });
      return null;
    }
    if (job.status !== 'running' && job.status !== 'pending') {
      await logSystemEvent({ level: 'info', source: LOG_SOURCE, message: `Job ${data.jobId} has status "${job.status}", skipping`, context: { jobId: data.jobId, status: job.status } });
      return null;
    }

    return runStoredProductAiJob({ job, jobRepository, logSource: LOG_SOURCE });
  },
});

export const startProductAiJobQueue = (): void => {
  queue.startWorker();
};

export const stopProductAiJobQueue = async (reason?: string): Promise<void> => {
  const suffix = (typeof reason === 'string' && reason !== '') ? `: ${reason}` : '';
  await logSystemEvent({ level: 'info', source: LOG_SOURCE, message: `Queue worker stopped${suffix}`, context: { reason } });
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
  const { running = false, healthy = false, processing = false, lastPollTime = 0, timeSinceLastPoll = 0 } = await queue.getHealthStatus();
  return { running, healthy, processing, lastPollTime, timeSinceLastPoll };
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
  await logSystemEvent({ level: 'info', source: SINGLE_LOG_SOURCE, message: `Processing job ${jobId}`, context: { jobId } });

  const jobRepository = await getProductAiJobRepository();
  const job = await jobRepository.findJobById(jobId);

  if (job === null) {
    await ErrorSystem.logWarning(`Job ${jobId} not found`, { service: SINGLE_LOG_SOURCE, jobId });
    throw notFoundError('Job not found', { jobId });
  }

  if (job.status !== 'pending') {
    await logSystemEvent({ level: 'info', source: SINGLE_LOG_SOURCE, message: `Job ${jobId} is not pending (status: ${job.status}), skipping`, context: { jobId, status: job.status } });
    return;
  }

  await runStoredProductAiJob({ job, jobRepository, logSource: SINGLE_LOG_SOURCE });
};
