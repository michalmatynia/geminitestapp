import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/features/auth/server';
import { enqueueProductAiJob, processSingleJob, startProductAiJobQueue } from '@/features/jobs/server';
import { ActivityTypes, logActivity, logSystemError } from '@/features/observability/server';
import { authError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { ApiHandlerContext } from '@/shared/types/api/api';
import type { ProductAiJobType } from '@/shared/types/domain/jobs';

export const runtime = 'nodejs';

const syncSchema = z.object({
  direction: z.enum(['mongo_to_prisma', 'prisma_to_mongo']),
});

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const session = await auth();
  const hasAccess =
    session?.user?.isElevated ||
    session?.user?.permissions?.includes('settings.manage');
  if (!hasAccess) {
    throw authError('Unauthorized.');
  }

  const parsed = await parseJsonBody(req, syncSchema, {
    logPrefix: 'settings.database.sync.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const { direction } = parsed.data;

  const job = await enqueueProductAiJob(
    'system',
    'db_sync' as ProductAiJobType,
    { direction, entityType: 'system', source: 'db_sync' }
  );

  void logActivity({
    type: ActivityTypes.SYSTEM.DATABASE_SYNC,
    description: `Database sync started: ${direction}`,
    userId: session?.user?.id ?? null,
    entityId: job.id,
    entityType: 'job',
    metadata: { direction, jobId: job.id }
  }).catch(() => {});

  const { env } = await import('@/shared/lib/env');
  const inlineJobs =
    env.AI_JOBS_INLINE ||
    env.NODE_ENV !== 'production';

  if (inlineJobs) {
    processSingleJob(job.id).catch(async (error: unknown) => {
      await logSystemError({
        message: '[settings.database.sync] Failed to run db sync job',
        error,
        source: 'api/settings/database/sync',
        context: { jobId: job.id },
      });
    });
  } else {
    startProductAiJobQueue();
  }

  return NextResponse.json({ success: true, jobId: job.id });
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'settings.database.sync.POST' }
);
