import { chatbotJobRepository } from '@/features/ai/chatbot/services/chatbot-job-repository';
import { processJob } from '@/features/jobs/processors/chatbot-job-processor';
import { createManagedQueue } from '@/shared/lib/queue';

const DEBUG_CHATBOT = process.env["NODE_ENV"] !== 'production';

const logDebug = (message: string, meta?: Record<string, unknown>): void => {
  if (!DEBUG_CHATBOT) return;
  console.info(`[chatbot][jobs] ${message}`, meta || {});
};

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
    if (job?.status !== 'pending') return;

    await chatbotJobRepository.update(job.id, {
      status: 'running',
      startedAt: new Date(),
    });

    logDebug('Processing job', { jobId: data.jobId });
    await processJob(data.jobId);
    logDebug('Job completed', { jobId: data.jobId });
  },
  onFailed: async (_jobId, error, data) => {
    const message = error instanceof Error ? error.message : 'Job failed.';
    
    try {
      const { ErrorSystem } = await import('@/features/observability/services/error-system');
      await ErrorSystem.captureException(error, {
        service: 'chatbot-job-queue',
        jobId: data.jobId,
      });
    } catch (logError) {
      console.error('[chatbot][jobs] Failed to log to ErrorSystem:', logError);
    }

    await chatbotJobRepository.update(data.jobId, {
      status: 'failed',
      finishedAt: new Date(),
      errorMessage: message,
    });
    logDebug('Job failed', { jobId: data.jobId, message });
  },
});

export const startChatbotJobQueue = (): void => {
  queue.startWorker();
};

export const stopChatbotJobQueue = (): void => {
  void queue.stopWorker();
};

export const enqueueChatbotJob = async (jobId: string): Promise<void> => {
  await queue.enqueue({ jobId });
};
