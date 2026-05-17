import { NextResponse } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { readLastBackupState } from '@/shared/lib/db/services/last-backup-state';

export async function getLastBackupHandler(
  _req: Request,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const state = await readLastBackupState();
  return NextResponse.json(state ?? { lastBackupAt: null, application: null });
}
