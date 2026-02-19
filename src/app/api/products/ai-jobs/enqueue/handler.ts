import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { enqueueProductAiJob } from '@/features/jobs/server';
import { startProductAiJobQueue, processSingleJob } from '@/features/jobs/server';
import { logSystemEvent, ErrorSystem } from '@/features/observability/server';
import { parseJsonBody } from '@/features/products/server';
import type { ProductAiJobTypeDto as ProductAiJobType } from '@/shared/contracts/jobs';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const enqueueSchema = z.object({
  productId: z.string().trim().min(1),
  type: z.string().trim().min(1),
  payload: z.record(z.string(), z.any()).optional(),
});

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, enqueueSchema, {
    logPrefix: 'products.ai-jobs.enqueue.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const { productId, type, payload } = parsed.data;

  await logSystemEvent({
    level: 'info',
    message: '[api/products/ai-jobs/enqueue] Received request',
    context: { productId, type },
  });

  const job = await enqueueProductAiJob(productId, type as ProductAiJobType, payload);
  await logSystemEvent({
    level: 'info',
    message: `[api/products/ai-jobs/enqueue] Job ${job.id} created`,
    context: { jobId: job.id },
  });

  const inlineJobs =
    process.env['AI_JOBS_INLINE'] === 'true' ||
    process.env['NODE_ENV'] !== 'production';

  if (inlineJobs) {
    // WORKAROUND: In serverless/development, immediately process this job
    // since setInterval doesn't persist across function invocations
    await logSystemEvent({
      level: 'info',
      message: `[api/products/ai-jobs/enqueue] About to call processSingleJob for job ${job.id}`,
      context: { jobId: job.id },
    });

    // Process the job asynchronously but log any errors
    processSingleJob(job.id)
      .then(async (): Promise<void> => {
        await logSystemEvent({
          level: 'info',
          message: `[api/products/ai-jobs/enqueue] Job ${job.id} processing initiated successfully`,
          context: { jobId: job.id },
        });
      })
      .catch((err: unknown) => {
        void ErrorSystem.captureException(err, {
          service: 'api/products/ai-jobs/enqueue',
          jobId: job.id,
          productId: productId,
        });
      });
  } else {
    // Start the queue worker (for persistent servers)
    startProductAiJobQueue();
  }

  await logSystemEvent({
    level: 'info',
    message: '[api/products/ai-jobs/enqueue] Returning response to client',
  });
  return NextResponse.json({ success: true, jobId: job.id });
}
