import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  enqueueProductAiJob,
  enqueueProductAiJobToQueue,
  processProductAiJob,
  startProductAiJobQueue,
} from '@/features/jobs/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, forbiddenError } from '@/shared/errors/app-error';
import { assertDatabaseEngineManageAccess } from '@/shared/lib/db/services/database-engine-access';
import { assertDatabaseEngineOperationEnabled } from '@/shared/lib/db/services/database-engine-operation-guards';
import { logSystemError } from '@/shared/lib/observability/system-logger';

const backupTypeSchema = z.enum(['mongodb', 'postgresql']);
const isProductionRuntime = (): boolean => process.env['NODE_ENV'] === 'production';

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertDatabaseEngineManageAccess();

  if (isProductionRuntime()) {
    throw forbiddenError('Database backups are disabled in production.');
  }

  await assertDatabaseEngineOperationEnabled('allowManualBackupRunNow');

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

  let processedInline = false;
  startProductAiJobQueue();
  try {
    const runtimeType = job.jobType ?? job.type ?? 'db_backup';
    await enqueueProductAiJobToQueue(job.id, job.productId, runtimeType, job.payload);
  } catch (enqueueError: unknown) {
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

  return NextResponse.json({
    success: true,
    jobId: job.id,
    message: processedInline
      ? `Database backup executed inline for ${dbType}.`
      : `Database backup job queued for ${dbType}.`,
  });
}
