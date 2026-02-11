export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/features/auth/server';
import {
  getDatabaseBackupSchedulerStatus,
  tickDatabaseBackupScheduler,
} from '@/features/database/services/database-backup-scheduler';
import { assertDatabaseEngineOperationEnabled } from '@/features/database/services/database-engine-operation-guards';
import {
  DATABASE_BACKUP_SCHEDULER_REPEAT_EVERY_MS,
  getDatabaseBackupSchedulerQueueStatus,
  startDatabaseBackupSchedulerQueue,
} from '@/features/jobs/workers/databaseBackupSchedulerQueue';
import { authError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

async function POST_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const session = await auth();
  const hasAccess =
    session?.user?.isElevated ||
    session?.user?.permissions?.includes('settings.manage');
  if (!hasAccess) {
    throw authError('Unauthorized.');
  }

  await assertDatabaseEngineOperationEnabled('allowBackupSchedulerTick');

  startDatabaseBackupSchedulerQueue();

  const tick = await tickDatabaseBackupScheduler();
  const [status, queue] = await Promise.all([
    getDatabaseBackupSchedulerStatus(),
    getDatabaseBackupSchedulerQueueStatus(),
  ]);

  return NextResponse.json(
    {
      success: true,
      tick,
      status: {
        ...status,
        repeatEveryMs: DATABASE_BACKUP_SCHEDULER_REPEAT_EVERY_MS,
        queue,
      },
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}

export const POST = apiHandler(POST_handler, {
  source: 'databases.engine.backup-scheduler.tick.POST',
});
