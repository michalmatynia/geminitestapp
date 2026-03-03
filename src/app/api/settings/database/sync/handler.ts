import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/features/auth/server';
import { assertDatabaseEngineOperationEnabled } from '@/shared/lib/db/services/database-engine-operation-guards';
import {
  enqueueProductAiJob,
  processProductAiJob,
  startProductAiJobQueue,
} from '@/features/jobs/server';
import { ActivityTypes } from '@/shared/constants/observability';
import {
  databaseSyncRequestSchema as syncSchema,
} from '@/shared/contracts/database';
import type { ProductAiJobTypeDto as ProductAiJobType } from '@/shared/contracts/jobs';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { authError, forbiddenError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { getDatabaseEnginePolicy } from '@/shared/lib/db/database-engine-policy';
import { logActivity } from '@/shared/utils/observability/activity-service';
import { logger } from '@/shared/utils/logger';
import { logSystemError } from '@/shared/lib/observability/system-logger';

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const session = await auth();
  const hasAccess =
    session?.user?.isElevated || session?.user?.permissions?.includes('settings.manage');
  if (!hasAccess) {
    throw authError('Unauthorized.');
  }

  const parsed = await parseJsonBody(req, syncSchema, {
    logPrefix: 'settings.database.sync.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const { direction, skipAuthCollections, manual } = parsed.data;
  await assertDatabaseEngineOperationEnabled('allowManualFullSync');

  const enginePolicy = await getDatabaseEnginePolicy();
  if (!enginePolicy.allowAutomaticMigrations && manual !== true) {
    throw forbiddenError(
      'Automatic migrations are disabled by Database Engine policy. Execute migrations manually from Workflow Database -> Database Engine.'
    );
  }

  const job = await enqueueProductAiJob('system', 'db_sync' as ProductAiJobType, {
    direction,
    skipAuthCollections: Boolean(skipAuthCollections),
    entityType: 'system',
    source: 'db_sync',
  });

  void logActivity({
    type: ActivityTypes.SYSTEM.DATABASE_SYNC,
    description: `Database sync started: ${direction}`,
    userId: session?.user?.id ?? null,
    entityId: job.id,
    entityType: 'job',
    metadata: { direction, jobId: job.id },
  }).catch((error: Error) => {
    logger.warn('Failed to log database sync activity', {
      service: 'settings.database-sync',
      error,
    });
  });

  const { env } = await import('@/shared/lib/env');
  const inlineJobs = env.AI_JOBS_INLINE || env.NODE_ENV !== 'production';

  if (inlineJobs) {
    processProductAiJob(job.id).catch(async (error: unknown) => {
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
