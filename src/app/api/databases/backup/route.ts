import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { enqueueProductAiJob, processSingleJob, startProductAiJobQueue } from '@/features/jobs/server';
import { logSystemError } from '@/features/observability/server';
import { badRequestError, forbiddenError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

export const runtime = 'nodejs';

const backupTypeSchema = z.enum(['mongodb', 'postgresql']);
const isProductionRuntime = (): boolean => process.env['NODE_ENV'] === 'production';

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  if (isProductionRuntime()) {
    throw forbiddenError('Database backups are disabled in production.');
  }

  const { searchParams } = new URL(req.url);
  const parsedType = backupTypeSchema.safeParse(searchParams.get('type') ?? 'postgresql');
  if (!parsedType.success) {
    throw badRequestError('Invalid database backup type.', {
      type: searchParams.get('type'),
    });
  }

  const dbType = parsedType.data;
  const job = await enqueueProductAiJob('system', 'db_backup', {
    dbType,
    entityType: 'system',
    source: 'db_backup',
  });

  const inlineJobs =
    process.env['AI_JOBS_INLINE'] === 'true' ||
    !isProductionRuntime();
  if (inlineJobs) {
    processSingleJob(job.id).catch(async (error: unknown) => {
      await logSystemError({
        message: '[databases.backup] Failed to run db backup job',
        error,
        source: 'api/databases/backup',
        context: { jobId: job.id, dbType },
      });
    });
  } else {
    startProductAiJobQueue();
  }

  return NextResponse.json({
    success: true,
    jobId: job.id,
    message: `Database backup job queued for ${dbType}.`,
  });
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'databases.backup.POST' });
