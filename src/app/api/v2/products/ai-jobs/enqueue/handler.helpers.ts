import type { ProductAiJobType } from '@/shared/contracts/jobs';

export type ProductAiJobEnqueueLogEvent = {
  level: 'info';
  message: string;
  context?: Record<string, string>;
};

export const resolveProductAiJobEnqueueMode = (
  env: NodeJS.ProcessEnv
): 'inline' | 'queued' => {
  return env['AI_JOBS_INLINE'] === 'true' || env['NODE_ENV'] !== 'production'
    ? 'inline'
    : 'queued';
};

export const buildProductAiJobEnqueueReceivedEvent = (
  productId: string,
  type: ProductAiJobType
): ProductAiJobEnqueueLogEvent => ({
  level: 'info',
  message: '[api/products/ai-jobs/enqueue] Received request',
  context: { productId, type },
});

export const buildProductAiJobEnqueueCreatedEvent = (
  jobId: string
): ProductAiJobEnqueueLogEvent => ({
  level: 'info',
  message: `[api/products/ai-jobs/enqueue] Job ${jobId} created`,
  context: { jobId },
});

export const buildProductAiJobEnqueueInlineStartEvent = (
  jobId: string
): ProductAiJobEnqueueLogEvent => ({
  level: 'info',
  message: `[api/products/ai-jobs/enqueue] About to call processProductAiJob for job ${jobId}`,
  context: { jobId },
});

export const buildProductAiJobEnqueueInlineSuccessEvent = (
  jobId: string
): ProductAiJobEnqueueLogEvent => ({
  level: 'info',
  message: `[api/products/ai-jobs/enqueue] Job ${jobId} processing initiated successfully`,
  context: { jobId },
});

export const buildProductAiJobEnqueueReturnEvent = (): ProductAiJobEnqueueLogEvent => ({
  level: 'info',
  message: '[api/products/ai-jobs/enqueue] Returning response to client',
});

export const buildProductAiJobEnqueueErrorContext = (
  jobId: string,
  productId: string
): {
  service: string;
  jobId: string;
  productId: string;
} => ({
  service: 'api/products/ai-jobs/enqueue',
  jobId,
  productId,
});

export const buildProductAiJobEnqueueResponse = (
  jobId: string
): {
  success: true;
  jobId: string;
} => ({
  success: true,
  jobId,
});

export const startInlineProductAiJobProcessing = async ({
  jobId,
  productId,
  logSystemEvent,
  processProductAiJob,
  captureException,
}: {
  jobId: string;
  productId: string;
  logSystemEvent: (event: ProductAiJobEnqueueLogEvent) => Promise<unknown>;
  processProductAiJob: (jobId: string) => Promise<unknown>;
  captureException: (error: unknown, context: { service: string; jobId: string; productId: string }) => unknown;
}): Promise<void> => {
  await logSystemEvent(buildProductAiJobEnqueueInlineStartEvent(jobId));

  processProductAiJob(jobId)
    .then(async (): Promise<void> => {
      await logSystemEvent(buildProductAiJobEnqueueInlineSuccessEvent(jobId));
    })
    .catch((error: unknown) => {
      void captureException(error, buildProductAiJobEnqueueErrorContext(jobId, productId));
    });
};
