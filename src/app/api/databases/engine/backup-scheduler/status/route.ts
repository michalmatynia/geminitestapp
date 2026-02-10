export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { getDatabaseBackupSchedulerStatus } from '@/features/database/services/database-backup-scheduler';
import {
  DATABASE_BACKUP_SCHEDULER_REPEAT_EVERY_MS,
  getDatabaseBackupSchedulerQueueStatus,
  startDatabaseBackupSchedulerQueue,
} from '@/features/jobs/workers/databaseBackupSchedulerQueue';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  startDatabaseBackupSchedulerQueue();

  const [status, queue] = await Promise.all([
    getDatabaseBackupSchedulerStatus(),
    getDatabaseBackupSchedulerQueueStatus(),
  ]);

  return NextResponse.json(
    {
      ...status,
      repeatEveryMs: DATABASE_BACKUP_SCHEDULER_REPEAT_EVERY_MS,
      queue,
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}

export const GET = apiHandler(GET_handler, {
  source: 'databases.engine.backup-scheduler.status.GET',
});
