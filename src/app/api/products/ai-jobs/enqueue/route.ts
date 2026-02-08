export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { enqueueProductAiJob } from '@/features/jobs/server';
import { startProductAiJobQueue, processSingleJob } from '@/features/jobs/server';
import { parseJsonBody } from '@/features/products/server';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';
import type { ProductAiJobType } from '@/shared/types/jobs';

const enqueueSchema = z.object({
  productId: z.string().trim().min(1),
  type: z.string().trim().min(1),
  payload: z.record(z.string(), z.any()).optional(),
});

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, enqueueSchema, {
    logPrefix: 'products.ai-jobs.enqueue.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const { productId, type, payload } = parsed.data;

  console.log(`[api/products/ai-jobs/enqueue] Received request - productId: ${productId}, type: ${type}`);

  const job = await enqueueProductAiJob(productId, type as ProductAiJobType, payload);
  console.log(`[api/products/ai-jobs/enqueue] Job ${job.id} created`);

  const inlineJobs =
    process.env['AI_JOBS_INLINE'] === 'true' ||
    process.env['NODE_ENV'] !== 'production';

  if (inlineJobs) {
    // WORKAROUND: In serverless/development, immediately process this job
    // since setInterval doesn't persist across function invocations
    console.log(`[api/products/ai-jobs/enqueue] About to call processSingleJob for job ${job.id}`);

    // Process the job asynchronously but log any errors
    processSingleJob(job.id)
      .then((): void => {
        console.log(`[api/products/ai-jobs/enqueue] Job ${job.id} processing initiated successfully`);
      })
      .catch(async (err: unknown) => {
        const { ErrorSystem } = await import('@/features/observability/services/error-system');
        void ErrorSystem.captureException(err, { 
          service: 'api/products/ai-jobs/enqueue',
          jobId: job.id,
          productId: productId
        });
      });
  } else {
    // Start the queue worker (for persistent servers)
    startProductAiJobQueue();
  }

  console.log('[api/products/ai-jobs/enqueue] Returning response to client');
  return NextResponse.json({ success: true, jobId: job.id });
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'products.ai-jobs.enqueue.POST' });
