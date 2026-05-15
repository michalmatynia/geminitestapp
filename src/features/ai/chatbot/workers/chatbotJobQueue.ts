/**
 * Chatbot Job Queue Worker
 * 
 * Manages the background processing of AI chatbot inference jobs.
 * This module integrates with the platform's queueing infrastructure to 
 * ensure reliable, resilient execution of chat-based tasks.
 * 
 * Features:
 * - Managed Queue: Orchestrates the worker lifecycle for chatbot inference jobs.
 * - Resilience: Implements exponential backoff and retries for transient failures.
 * - Persistence Integration: Updates job status in the repository throughout 
 *   the job lifecycle (pending -> running -> completed/failed).
 * - Observability: Provides detailed logging and error capture for all 
 *   queue operations and processor-level failures.
 * 
 * Usage:
 * Invoked by the global task runner. Use `enqueueChatbotJob` to add jobs
 * to the background processing stream.
 */

import { chatbotJobRepository } from '@/features/ai/chatbot/services/chatbot-job-repository';
import { processJob } from '@/features/ai/chatbot/workers/chatbot-job-processor';
import { getBrainAssignmentForFeature } from '@/shared/lib/ai-brain/server';
import { createManagedQueue } from '@/shared/lib/queue';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { AppError, AppErrorCodes } from '@/shared/errors/app-error';

const LOG_SOURCE = 'chatbot-job-queue';

/**
 * Builds a standardized source string for logging: 'ai.chatbot.job.<action>'
 */
const buildChatbotSource = (action: string): string => `ai.chatbot.job.${action}`;

type ChatbotJobData = {
  jobId: string;
};

const queue = createManagedQueue<ChatbotJobData>({
  name: 'chatbot',
  concurrency: 1,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: true,
  },
  processor: async (data) => {
    const job = await chatbotJobRepository.findById(data.jobId);
    if (!job) {
      throw new AppError(`Chatbot job not found during processing: ${data.jobId}`, {
        code: AppErrorCodes.notFound,
        httpStatus: 404,
        meta: { jobId: data.jobId },
      });
    }
    
    if (job.status !== 'pending') return;

    await chatbotJobRepository.update(job.id, {
      status: 'running',
      startedAt: new Date(),
    });

    void ErrorSystem.logInfo('Processing chatbot job', { service: buildChatbotSource('processing'), jobId: data.jobId });
    await processJob(data.jobId);
    void ErrorSystem.logInfo('Chatbot job completed', { service: buildChatbotSource('completed'), jobId: data.jobId });
  },
  onFailed: async (_jobId, error, data) => {
    const errorMessage = error instanceof Error ? error.message : 'Job failed.';

    void ErrorSystem.captureException(error, {
      service: buildChatbotSource('failed'),
      jobId: data.jobId,
    });

    await chatbotJobRepository.update(data.jobId, {
      status: 'failed',
      finishedAt: new Date(),
      errorMessage,
    });
  },
});

let workerStarted = false;
let reconcileInFlight: Promise<void> | null = null;

const isChatbotEnabled = async (): Promise<boolean> => {
  const brain = await getBrainAssignmentForFeature('chatbot');
  return brain.enabled;
};

/**
 * Initializes or tears down the chatbot worker based on feature configuration.
 */
export const startChatbotJobQueue = (): void => {
  if (reconcileInFlight) return;
  /* eslint-disable require-atomic-updates */
  reconcileInFlight = (async (): Promise<void> => {
    let enabled: boolean;
    try {
      enabled = await isChatbotEnabled();
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: LOG_SOURCE,
        action: 'validateBrainGate',
      });
      return;
    }
    if (!enabled) {
      if (workerStarted) {
        await queue.stopWorker().catch(async (error: unknown) => {
          void ErrorSystem.captureException(error, {
            service: LOG_SOURCE,
            action: 'stopWorker',
          });
        });
        workerStarted = false;
      }
      return;
    }
    if (workerStarted) return;
    workerStarted = true;
    queue.startWorker();
  })().finally(() => {
    reconcileInFlight = null;
  });
};

/**
 * Halts the background worker.
 */
export const stopChatbotJobQueue = (): void => {
  void queue.stopWorker();
  workerStarted = false;
};

/**
 * Queues a job for background processing.
 */
export const enqueueChatbotJob = async (jobId: string): Promise<void> => {
  try {
    await queue.enqueue({ jobId }, { jobId });
  } catch (error) {
    throw new AppError(`Failed to enqueue chatbot job: ${jobId}`, {
        code: AppErrorCodes.internal,
        httpStatus: 500,
        cause: error,
        meta: { jobId }
    });
  }
};
