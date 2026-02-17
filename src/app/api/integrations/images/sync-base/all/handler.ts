import { NextRequest, NextResponse } from 'next/server';

import { enqueueProductAiJob, processSingleJob, startProductAiJobQueue } from '@/features/jobs/server';
import { logSystemError } from '@/features/observability/server';
import type { ApiHandlerContext } from '@/shared/types/api/api';
import type { ProductAiJobType } from '@/shared/types/domain/jobs';

export async function POST_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const job = await enqueueProductAiJob(
    'system',
    'base_images_sync_all' as ProductAiJobType,
    { source: 'base_images_sync_all' }
  );

  const inlineJobs =
    process.env['AI_JOBS_INLINE'] === 'true' ||
    process.env['NODE_ENV'] !== 'production';

  if (inlineJobs) {
    processSingleJob(job.id).catch(async (error: unknown) => {
      await logSystemError({
        message: '[integrations.images.sync-base.all] Failed to run base image sync job',
        error,
        source: 'api/integrations/images/sync-base/all',
        context: { jobId: job.id },
      });
    });
  } else {
    startProductAiJobQueue();
  }

  return NextResponse.json({ status: 'ok', jobId: job.id });
}
