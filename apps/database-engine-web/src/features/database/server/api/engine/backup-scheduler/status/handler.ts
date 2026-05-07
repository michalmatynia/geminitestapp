import { type NextRequest, NextResponse } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { getDatabaseBackupSchedulerStatus } from '@/shared/lib/db/services/database-backup-scheduler';
import { assertDatabaseEngineManageAccess } from '@/features/database/server';
import {
  DATABASE_BACKUP_SCHEDULER_REPEAT_EVERY_MS,
  getDatabaseBackupSchedulerQueueStatus,
  startDatabaseBackupSchedulerQueue,
} from '@/shared/lib/db/workers/databaseBackupSchedulerQueue';

export async function getHandler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertDatabaseEngineManageAccess();
  startDatabaseBackupSchedulerQueue();

  const [status, queue] = await Promise.all([
    getDatabaseBackupSchedulerStatus(),
    getDatabaseBackupSchedulerQueueStatus(),
  ]);

  return NextResponse.json(
    {
      ...status,
      repeatEveryMs: status.repeatTickEnabled ? DATABASE_BACKUP_SCHEDULER_REPEAT_EVERY_MS : 0,
      queue,
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}
