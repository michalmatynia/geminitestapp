export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/features/auth/server';
import { markDatabaseBackupJobQueued } from '@/features/database/services/database-backup-scheduler';
import { assertDatabaseEngineOperationEnabled } from '@/features/database/services/database-engine-operation-guards';
import {
  enqueueProductAiJob,
  enqueueProductAiJobToQueue,
  processSingleJob,
  startProductAiJobQueue,
} from '@/features/jobs/server';
import { logSystemError } from '@/features/observability/server';
import { authError, badRequestError, forbiddenError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const runNowSchema = z.object({
  dbType: z.enum(['mongodb', 'postgresql', 'all']).default('all'),
});

const resolveTargets = (dbType: z.infer<typeof runNowSchema>['dbType']): Array<'mongodb' | 'postgresql'> => {
  if (dbType === 'all') return ['mongodb', 'postgresql'];
  return [dbType];
};

const isProductionRuntime = (): boolean => process.env['NODE_ENV'] === 'production';

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const session = await auth();
  const hasAccess =
    session?.user?.isElevated ||
    session?.user?.permissions?.includes('settings.manage');
  if (!hasAccess) {
    throw authError('Unauthorized.');
  }

  if (isProductionRuntime()) {
    throw forbiddenError('Database backups are disabled in production.');
  }

  await assertDatabaseEngineOperationEnabled('allowManualBackupRunNow');

  const parsed = await parseJsonBody(req, runNowSchema, {
    logPrefix: 'databases.engine.backup-scheduler.run-now.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const targets = resolveTargets(parsed.data.dbType);
  if (targets.length === 0) {
    throw badRequestError('No database targets selected for backup.');
  }

  const queued: Array<{ dbType: 'mongodb' | 'postgresql'; jobId: string }> = [];
  const inlineProcessed: Array<{ dbType: 'mongodb' | 'postgresql'; jobId: string }> = [];
  startProductAiJobQueue();

  for (const dbType of targets) {
    const job = await enqueueProductAiJob('system', 'db_backup', {
      dbType,
      entityType: 'system',
      source: 'database_engine_manual_backup',
    });
    queued.push({ dbType, jobId: job.id });

    try {
      await markDatabaseBackupJobQueued(dbType, job.id);
    } catch {
      // Keep manual queue action resilient even if schedule metadata update fails.
    }

    try {
      await enqueueProductAiJobToQueue(job.id, job.productId as string, job.type, job.payload);
    } catch (enqueueError: unknown) {
      await logSystemError({
        message:
          '[databases.engine.backup-scheduler.run-now] Failed to enqueue db backup job to runtime queue, falling back to inline processing',
        error: enqueueError,
        source: 'api/databases/engine/backup-scheduler/run-now',
        context: { jobId: job.id, dbType },
      });

      await processSingleJob(job.id);
      inlineProcessed.push({ dbType, jobId: job.id });
    }
  }

  return NextResponse.json(
    {
      success: true,
      queued,
      inlineProcessed,
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}

export const POST = apiHandler(POST_handler, {
  source: 'databases.engine.backup-scheduler.run-now.POST',
});
