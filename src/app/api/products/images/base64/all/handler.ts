import { NextRequest, NextResponse } from 'next/server';

import { enqueueProductAiJob, processSingleJob, startProductAiJobQueue } from '@/features/jobs/server';
import { logSystemError } from '@/features/observability/server';
import type { ProductAiJobTypeDto as ProductAiJobType } from '@/shared/contracts/jobs';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export async function POST_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const job = await enqueueProductAiJob(
    'system',
    'base64_all' as ProductAiJobType,
    { source: 'base64_all' }
  );

  const inlineJobs =
    process.env['AI_JOBS_INLINE'] === 'true' ||
    process.env['NODE_ENV'] !== 'production';

  if (inlineJobs) {
    processSingleJob(job.id).catch(async (error: unknown) => {
      await logSystemError({
        message: '[products.images.base64.all] Failed to run base64 job',
        error,
        source: 'api/products/images/base64/all',
        context: { jobId: job.id },
      });
    });
  } else {
    startProductAiJobQueue();
  }

  return NextResponse.json({
    status: 'ok',
    jobId: job.id,
  });
}
