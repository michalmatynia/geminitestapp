import { type NextRequest, NextResponse } from 'next/server';

import { auth } from '@/features/auth/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { authError } from '@/shared/errors/app-error';
import {
  getDatabaseBackupSchedulerStatus,
  tickDatabaseBackupScheduler,
} from '@/shared/lib/db/services/database-backup-scheduler';
import { assertDatabaseEngineOperationEnabled } from '@/shared/lib/db/services/database-engine-operation-guards';
import {
  DATABASE_BACKUP_SCHEDULER_REPEAT_EVERY_MS,
  getDatabaseBackupSchedulerQueueStatus,
  startDatabaseBackupSchedulerQueue,
} from '@/shared/lib/db/workers/databaseBackupSchedulerQueue';

export async function POST_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const session = await auth();
  const hasAccess =
    session?.user?.isElevated || session?.user?.permissions?.includes('settings.manage');
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
        repeatEveryMs: status.repeatTickEnabled ? DATABASE_BACKUP_SCHEDULER_REPEAT_EVERY_MS : 0,
        queue,
      },
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}
