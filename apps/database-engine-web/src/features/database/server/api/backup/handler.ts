import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  enqueueProductAiJob,
  enqueueProductAiJobToQueue,
  processProductAiJob,
  startProductAiJobQueue,
} from '@/features/database/server/jobs';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import type { ProductAiJob } from '@/shared/contracts/jobs';
import { badRequestError, forbiddenError } from '@/shared/errors/app-error';
import { assertDatabaseEngineManageAccess } from '@/features/database/server';
import { assertDatabaseEngineOperationEnabled } from '@/shared/lib/db/services/database-engine-operation-guards';
import { logSystemError } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const backupTypeSchema = z.enum(['mongodb']);
const isProductionRuntime = (): boolean => process.env['NODE_ENV'] === 'production';

function parseBackupType(req: NextRequest): 'mongodb' {
  const { searchParams } = new URL(req.url);
  const parsedType = backupTypeSchema.safeParse(searchParams.get('type') ?? 'mongodb');
  if (!parsedType.success) {
    throw badRequestError('Invalid database backup type.', {
      type: searchParams.get('type'),
    });
  }
  return parsedType.data;
}

async function enqueueBackupJob(job: ProductAiJob, dbType: string): Promise<boolean> {
  let processedInline = false;
  startProductAiJobQueue();
  try {
    const runtimeType = job.jobType ?? job.type ?? 'db_backup';
    await enqueueProductAiJobToQueue(job.id, job.productId, runtimeType, job.payload);
  } catch (enqueueError: unknown) {
    void ErrorSystem.captureException(enqueueError);
    await logSystemError({
      message:
        '[databases.backup] Failed to enqueue db backup job to runtime queue, falling back to inline processing',
      error: enqueueError,
      source: 'api/databases/backup',
      context: { jobId: job.id, dbType },
    });

    await processProductAiJob(job.id);
    processedInline = true;
  }
  return processedInline;
}

export async function postHandler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  await assertDatabaseEngineManageAccess();

  if (isProductionRuntime()) {
    throw forbiddenError('Database backups are disabled in production.');
  }

  await assertDatabaseEngineOperationEnabled('allowManualBackupRunNow');
  const body = ctx.body ?? null;
  z.unknown().parse(body);

  const dbType = parseBackupType(req);
  const job = await enqueueProductAiJob('system', 'db_backup', {
    dbType,
    entityType: 'system',
    source: 'db_backup',
  });

  const processedInline = await enqueueBackupJob(job, dbType);

  return NextResponse.json({
    success: true,
    jobId: job.id,
    message: processedInline
      ? `Database backup executed inline for ${dbType}.`
      : `Database backup job queued for ${dbType}.`,
  });
}
