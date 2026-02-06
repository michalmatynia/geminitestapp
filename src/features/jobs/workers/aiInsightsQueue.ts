import 'server-only';

import { tick } from '@/features/jobs/processors/ai-insights-processor';
import { createManagedQueue } from '@/shared/lib/queue';

type AiInsightsJobData = {
  type: 'scheduled-tick';
};

const queue = createManagedQueue<AiInsightsJobData>({
  name: 'ai-insights',
  concurrency: 1,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
  },
  processor: async () => {
    await tick();
  },
  onFailed: async (_jobId, error) => {
    try {
      const { ErrorSystem } = await import('@/features/observability/services/error-system');
      void ErrorSystem.captureException(error, {
        service: 'ai-insights-queue',
      });
    } catch {
      console.error('[aiInsightsQueue] Fatal queue error', error);
    }
  },
});

export const startAiInsightsQueue = (): void => {
  queue.startWorker();
  void queue.enqueue(
    { type: 'scheduled-tick' },
    { repeat: { every: 60_000 }, jobId: 'ai-insights-tick' },
  );
};
