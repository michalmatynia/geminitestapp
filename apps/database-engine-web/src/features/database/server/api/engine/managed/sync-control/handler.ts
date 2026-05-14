import { type NextRequest, NextResponse } from 'next/server';

import { assertDatabaseEngineManageAccess } from '@/features/database/server';
import {
  databaseEngineManagedMongoSyncControlRequestSchema,
  type DatabaseEngineManagedMongoSyncControlResponse,
} from '@/shared/contracts/database';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { parseObjectJsonBody } from '@/shared/lib/api/parse-json';
import { setManagedMongoApplicationSyncDisabled } from '@/shared/lib/db/managed-mongo-sync-controls';
import { clearSettingsCache } from '@/shared/lib/settings-cache';
import { clearLiteSettingsServerCache } from '@/shared/lib/settings-lite-server-cache';

export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertDatabaseEngineManageAccess();

  const parsed = await parseObjectJsonBody(req, {
    logPrefix: 'database-engine-web.databases.engine.managed.sync-control.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const body = databaseEngineManagedMongoSyncControlRequestSchema.parse(parsed.data);
  const control = await setManagedMongoApplicationSyncDisabled(
    body.application,
    body.disabled,
    body.reason
  );
  clearSettingsCache();
  clearLiteSettingsServerCache();

  const payload: DatabaseEngineManagedMongoSyncControlResponse = {
    success: true,
    application: body.application,
    disabled: control.disabled,
    reason: control.reason,
    updatedAt: control.updatedAt ?? new Date().toISOString(),
  };

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
