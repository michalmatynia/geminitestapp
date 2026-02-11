import { chatbotJobRepository } from '@/features/ai/chatbot/services/chatbot-job-repository';
import { processJob } from '@/features/jobs/processors/chatbot-job-processor';
import { ErrorSystem } from '@/features/observability/server';
import { createManagedQueue } from '@/shared/lib/queue';

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

    void ErrorSystem.logInfo('Processing job', { service: 'chatbot-job-queue', jobId: data.jobId });
    await processJob(data.jobId);
    void ErrorSystem.logInfo('Job completed', { service: 'chatbot-job-queue', jobId: data.jobId });
  },
  onFailed: async (_jobId, error, data) => {
    const message = error instanceof Error ? error.message : 'Job failed.';
    
    void ErrorSystem.captureException(error, {
      service: 'chatbot-job-queue',
      jobId: data.jobId,
    });

    await chatbotJobRepository.update(data.jobId, {
      status: 'failed',
      finishedAt: new Date(),
      errorMessage: message,
    });
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
