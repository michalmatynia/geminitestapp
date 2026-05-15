import { type NextRequest, NextResponse } from 'next/server';

import {
  enqueueProductAiJob,
  enqueueProductAiJobToQueue,
  processProductAiJob,
  startProductAiJobQueue,
} from '@/features/database/server/jobs';
import {
  databaseEngineBackupRunNowRequestSchema as runNowSchema,
  type DatabaseEngineBackupRunNowRequest,
} from '@/shared/contracts/database';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, forbiddenError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { assertDatabaseEngineManageAccess } from '@/features/database/server';
import { markDatabaseBackupJobQueued } from '@/shared/lib/db/services/database-backup-scheduler';
import { assertDatabaseEngineOperationEnabled } from '@/shared/lib/db/services/database-engine-operation-guards';
import { logSystemError } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const resolveTargets = (_dbType: DatabaseEngineBackupRunNowRequest['dbType']): Array<'mongodb'> => ['mongodb'];

const isProductionRuntime = (): boolean => process.env['NODE_ENV'] === 'production';

interface JobResult {
  dbType: 'mongodb';
  jobId: string;
  processedInline: boolean;
}

/**
 * Handles the enqueuing and processing of a single backup job.
 * Extracted to allow concurrent execution and cleaner error handling.
 */
async function runBackupTask(dbType: 'mongodb'): Promise<JobResult> {
  const job = await enqueueProductAiJob('system', 'db_backup', {
    dbType,
    entityType: 'system',
    source: 'database_engine_manual_backup',
  });

  try {
    await markDatabaseBackupJobQueued(dbType, job.id);
  } catch (error) {
    void ErrorSystem.captureException(error);
  }

  try {
    const runtimeType = job.jobType ?? job.type ?? 'db_backup';
    await enqueueProductAiJobToQueue(job.id, job.productId, runtimeType, job.payload);
    return { dbType, jobId: job.id, processedInline: false };
  } catch (enqueueError: unknown) {
    void ErrorSystem.captureException(enqueueError);
    await logSystemError({
      message: '[databases.engine.backup-scheduler.run-now] Failed to enqueue backup job, falling back to inline',
      error: enqueueError,
      source: 'api/databases/engine/backup-scheduler/run-now',
      context: { jobId: job.id, dbType },
    });

    await processProductAiJob(job.id);
    return { dbType, jobId: job.id, processedInline: true };
  }
}

export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertDatabaseEngineManageAccess();

  if (isProductionRuntime()) {
    throw forbiddenError('Database backups are disabled in production.');
  }

  await assertDatabaseEngineOperationEnabled('allowManualBackupRunNow');

  const parsed = await parseJsonBody(req, runNowSchema, {
    logPrefix: 'database-engine-web.databases.engine.backup-scheduler.run-now.POST',
  });
  if (!parsed.ok) return parsed.response;

  const targets = resolveTargets(parsed.data.dbType);
  if (targets.length === 0) {
    throw badRequestError('No database targets selected for backup.');
  }

  startProductAiJobQueue();

  const results = await Promise.all(targets.map(runBackupTask));

  return NextResponse.json(
    {
      success: true,
      queued: results.filter((r) => !r.processedInline).map(({ dbType, jobId }) => ({ dbType, jobId })),
      inlineProcessed: results.filter((r) => r.processedInline).map(({ dbType, jobId }) => ({ dbType, jobId })),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
