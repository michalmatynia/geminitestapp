export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import {
  createPrismaJsonBackup,
  listJsonBackups,
} from '@/features/database/services/database-json-backup';
import { assertDatabaseEngineManageAccess } from '@/features/database/services/database-engine-access';
import { assertDatabaseEngineOperationEnabled } from '@/features/database/services/database-engine-operation-guards';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

async function POST_handler(): Promise<Response> {
  await assertDatabaseEngineManageAccess();
  await assertDatabaseEngineOperationEnabled('allowManualBackupRunNow');

  const result = await createPrismaJsonBackup();
  return NextResponse.json(result);
}

async function GET_handler(): Promise<Response> {
  await assertDatabaseEngineManageAccess();

  const backups = await listJsonBackups();
  return NextResponse.json({ backups });
}

export const POST = apiHandler(
  async (_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> => POST_handler(),
  { source: 'databases.json-backup.POST' }
);

export const GET = apiHandler(
  async (_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> => GET_handler(),
  { source: 'databases.json-backup.GET' }
);
