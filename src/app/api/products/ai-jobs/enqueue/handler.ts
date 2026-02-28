import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { enqueueProductAiJob } from '@/features/jobs/server';
import { startProductAiJobQueue, processProductAiJob } from '@/features/jobs/server';
import { parseJsonBody } from '@/features/products/server';
import type { ProductAiJobTypeDto as ProductAiJobType } from '@/shared/contracts/jobs';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const enqueueSchema = z.object({
  productId: z.string().trim().min(1),
  type: z.string().trim().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, enqueueSchema, {
    logPrefix: 'products.ai-jobs.enqueue.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const { productId, type, payload } = parsed.data;

  await (logSystemEvent as any)({
    level: 'info',
    message: '[api/products/ai-jobs/enqueue] Received request',
    context: { productId, type },
  });

  const job = await enqueueProductAiJob(productId, type as ProductAiJobType, payload);
  await (logSystemEvent as any)({
    level: 'info',
    message: `[api/products/ai-jobs/enqueue] Job ${job.id} created`,
    context: { jobId: job.id },
  });

  const inlineJobs =
    process.env['AI_JOBS_INLINE'] === 'true' || process.env['NODE_ENV'] !== 'production';

  if (inlineJobs) {
    // WORKAROUND: In serverless/development, immediately process this job
    // since setInterval doesn't persist across function invocations
    await (logSystemEvent as any)({
      level: 'info',
      message: `[api/products/ai-jobs/enqueue] About to call processProductAiJob for job ${job.id}`,
      context: { jobId: job.id },
    });

    // Process the job asynchronously but log any errors
    processProductAiJob(job.id)
      .then(async (): Promise<void> => {
        await (logSystemEvent as any)({
          level: 'info',
          message: `[api/products/ai-jobs/enqueue] Job ${job.id} processing initiated successfully`,
          context: { jobId: job.id },
        });
      })
      .catch((err: unknown) => {
        void (ErrorSystem as any).captureException(err, {
          service: 'api/products/ai-jobs/enqueue',
          jobId: job.id,
          productId: productId,
        });
      });
  } else {
    // Start the queue worker (for persistent servers)
    startProductAiJobQueue();
  }

  await (logSystemEvent as any)({
    level: 'info',
    message: '[api/products/ai-jobs/enqueue] Returning response to client',
  });
  return NextResponse.json({ success: true, jobId: job.id });
}
