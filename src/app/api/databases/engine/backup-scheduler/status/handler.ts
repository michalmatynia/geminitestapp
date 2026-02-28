import { NextRequest, NextResponse } from 'next/server';

import { getDatabaseBackupSchedulerStatus } from '@/shared/lib/db/services/database-backup-scheduler';
import {
  DATABASE_BACKUP_SCHEDULER_REPEAT_EVERY_MS,
  getDatabaseBackupSchedulerQueueStatus,
  startDatabaseBackupSchedulerQueue,
} from '@/features/jobs/workers/databaseBackupSchedulerQueue';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
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
