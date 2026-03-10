import { chatbotJobRepository } from '@/features/ai/chatbot/services/chatbot-job-repository';
import { processJob } from '@/features/ai/chatbot/workers/chatbot-job-processor';
import { getBrainAssignmentForFeature } from '@/shared/lib/ai-brain/server';
import { createManagedQueue } from '@/shared/lib/queue';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

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

let workerStarted = false;
let reconcileInFlight: Promise<void> | null = null;

const isChatbotEnabled = async (): Promise<boolean> => {
  const brain = await getBrainAssignmentForFeature('chatbot');
  return brain.enabled;
};

export const startChatbotJobQueue = (): void => {
  if (reconcileInFlight) return;
  reconcileInFlight = (async (): Promise<void> => {
    let enabled: boolean;
    try {
      enabled = await isChatbotEnabled();
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: 'chatbot-job-queue',
        action: 'validateBrainGate',
      });
      return;
    }
    if (!enabled) {
      if (workerStarted) {
        await queue.stopWorker().catch(async (error) => {
          void ErrorSystem.captureException(error, {
            service: 'chatbot-job-queue',
            action: 'stopWorker',
          });
        });
        workerStarted = false;
      }
      return;
    }
    if (workerStarted) return;
    queue.startWorker();
    workerStarted = true;
  })().finally(() => {
    reconcileInFlight = null;
  });
};

export const stopChatbotJobQueue = (): void => {
  void queue.stopWorker();
  workerStarted = false;
};

export const enqueueChatbotJob = async (jobId: string): Promise<void> => {
  await queue.enqueue({ jobId });
};
