import "server-only";

import { createManagedQueue } from "@/shared/lib/queue";
import { getProductAiJobRepository } from "@/features/jobs/services/product-ai-job-repository";
import { dispatchProductAiJob } from "@/features/jobs/processors/product-ai-processors";
import type { Job } from "@/features/jobs/processors/product-ai-processors";
import { ErrorSystem } from "@/features/observability/server";
import { notFoundError } from "@/shared/errors/app-error";

const STALE_RUNNING_TTL_MS = 1000 * 60 * 10;

type ProductAiJobData = {
  jobId: string;
  productId: string;
  type: string;
  payload: unknown;
};

const queue = createManagedQueue<ProductAiJobData>({
  name: "product-ai",
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
      console.log(`[productAiQueue] Marked ${staleResult.count} stale running jobs as failed`);
    }

    const job = await jobRepository.findJobById(data.jobId);
    if (!job) {
      console.warn(`[productAiQueue] Job ${data.jobId} not found, skipping`);
      return;
    }
    if (job.status !== "running" && job.status !== "pending") {
      console.log(`[productAiQueue] Job ${data.jobId} has status "${job.status}", skipping`);
      return;
    }

    if (job.status === "pending") {
      await jobRepository.updateJob(job.id, {
        status: "running",
        startedAt: new Date(),
        productId: job.productId,
        type: job.type,
        payload: job.payload,
        createdAt: job.createdAt,
      });
    }

    const typedJob = job as unknown as Job;
    console.log(`[productAiQueue] Processing job ${job.id} of type "${job.type}"`);

    try {
      const result = await dispatchProductAiJob(typedJob);
      await jobRepository.updateJob(job.id, {
        status: "completed",
        finishedAt: new Date(),
        result,
        productId: job.productId,
        type: job.type,
        payload: job.payload,
        createdAt: job.createdAt,
      });
      console.log(`[productAiQueue] Job ${job.id} completed`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Job failed.";
      await ErrorSystem.captureException(error, {
        service: "product-ai-queue",
        jobId: job.id,
        productId: job.productId,
        jobType: job.type,
      });
      await jobRepository.updateJob(job.id, {
        status: "failed",
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
  const suffix = reason ? `: ${reason}` : "";
  console.log(`[productAiQueue] Queue worker stopped${suffix}`);
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
    running: health.running,
    healthy: health.healthy,
    processing: health.processing,
    lastPollTime: health.lastPollTime,
    timeSinceLastPoll: health.timeSinceLastPoll,
  };
};

export const enqueueProductAiJobToQueue = async (
  jobId: string,
  productId: string,
  type: string,
  payload: unknown,
): Promise<void> => {
  await queue.enqueue({ jobId, productId, type, payload });
};

// Inline processing for serverless/development environments
export const processSingleJob = async (jobId: string): Promise<void> => {
  console.log(`[processSingleJob] Processing job ${jobId}`);

  const jobRepository = await getProductAiJobRepository();
  const job = await jobRepository.findJobById(jobId);

  if (!job) {
    void ErrorSystem.logWarning(`Job ${jobId} not found`, {
      service: "product-ai-queue-single",
      jobId
    });
    throw notFoundError("Job not found", { jobId });
  }

  if (job.status !== "pending") {
    console.log(`[processSingleJob] Job ${jobId} is not pending (status: ${job.status}), skipping`);
    return;
  }

  await jobRepository.updateJob(job.id, {
    status: "running",
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
      status: "completed",
      finishedAt: new Date(),
      result,
      productId: job.productId,
      type: job.type,
      payload: job.payload,
      createdAt: job.createdAt,
    });
    console.log(`[processSingleJob] Job ${job.id} completed`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Job failed.";
    await ErrorSystem.captureException(error, {
      service: "product-ai-queue-single",
      jobId: job.id,
      productId: job.productId,
      jobType: job.type,
    });
    await jobRepository.updateJob(job.id, {
      status: "failed",
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

// Re-export processors for backward compatibility
export {
  processGraphModel,
  processDescriptionGeneration,
  processTranslation,
  processDatabaseSync,
  processBase64ConvertAll,
  processBaseImageSyncAll,
} from "@/features/jobs/processors/product-ai-processors";
