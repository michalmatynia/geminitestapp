import { type NextRequest, NextResponse } from 'next/server';

import { assertDatabaseEngineManageAccess } from '@/features/database/server';
import {
  enqueueProductAiJob,
  enqueueProductAiJobToQueue,
  processProductAiJob,
  startProductAiJobQueue,
} from '@/features/database/server/jobs';
import { databaseEngineManagedMongoBackupRequestSchema } from '@/shared/contracts/database';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { parseObjectJsonBody } from '@/shared/lib/api/parse-json';
import { assertDatabaseEngineOperationEnabled } from '@/shared/lib/db/services/database-engine-operation-guards';
import { markDatabaseBackupJobQueued } from '@/shared/lib/db/services/database-backup-scheduler';
import { logSystemError } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertDatabaseEngineManageAccess();
  await assertDatabaseEngineOperationEnabled('allowManualBackupRunNow');

  const parsed = await parseObjectJsonBody(req, {
    logPrefix: 'database-engine-web.databases.engine.managed.backup.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const body = databaseEngineManagedMongoBackupRequestSchema.parse(parsed.data);
  const job = await enqueueProductAiJob('system', 'db_backup', {
    dbType: 'mongodb',
    entityType: 'system',
    source: 'database_engine_managed_backup',
    application: body.application,
  });

  try {
    await markDatabaseBackupJobQueued('mongodb', job.id);
  } catch (error) {
    void ErrorSystem.captureException(error);
  }

  let processedInline = false;
  startProductAiJobQueue();
  try {
    const runtimeType = job.jobType ?? job.type ?? 'db_backup';
    await enqueueProductAiJobToQueue(job.id, job.productId, runtimeType, job.payload);
  } catch (enqueueError: unknown) {
    void ErrorSystem.captureException(enqueueError);
    await logSystemError({
      message:
        '[databases.engine.managed.backup] Failed to enqueue managed backup job to Redis runtime, falling back to inline processing',
      error: enqueueError,
      source: 'api/databases/engine/managed/backup',
      context: { jobId: job.id, application: body.application },
    });

    await processProductAiJob(job.id);
    processedInline = true;
  }

  return NextResponse.json(
    {
      success: true,
      jobId: job.id,
      message: processedInline
        ? `Managed MongoDB backup executed inline for ${body.application}.`
        : `Managed MongoDB backup job queued for ${body.application}.`,
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}
