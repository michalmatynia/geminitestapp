import { NextRequest, NextResponse } from 'next/server';

import {
  databaseEngineMongoSyncRequestSchema,
  type DatabaseEngineMongoSyncResponse,
} from '@/shared/contracts/database';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { parseObjectJsonBody } from '@/shared/lib/api/parse-json';
import { assertDatabaseEngineManageAccess } from '@/features/database/server';
import { assertDatabaseEngineOperationEnabled } from '@/shared/lib/db/services/database-engine-operation-guards';
import { syncMongoSources } from '@/shared/lib/db/services/mongo-source-sync';
import { invalidateMongoClientCache } from '@/shared/lib/db/mongo-client';
import { invalidateAppDbProviderCache } from '@/shared/lib/db/app-db-provider';
import { invalidateCollectionProviderMapCache } from '@/shared/lib/db/collection-provider-map';
import { invalidateDatabaseEnginePolicyCache } from '@/shared/lib/db/database-engine-policy';
import { clearSettingsCache } from '@/shared/lib/settings-cache';
import { clearLiteSettingsServerCache } from '@/shared/lib/settings-lite-server-cache';

const clearMongoSyncDependentCaches = async (): Promise<void> => {
  await invalidateMongoClientCache();
  invalidateAppDbProviderCache();
  invalidateCollectionProviderMapCache();
  invalidateDatabaseEnginePolicyCache();
  clearSettingsCache();
  clearLiteSettingsServerCache();
};

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertDatabaseEngineManageAccess();
  await assertDatabaseEngineOperationEnabled('allowManualFullSync');

  const parsed = await parseObjectJsonBody(req, {
    logPrefix: 'databases.engine.source.sync.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const body = databaseEngineMongoSyncRequestSchema.parse(parsed.data);
  const payload: DatabaseEngineMongoSyncResponse = await syncMongoSources(body.direction);
  await clearMongoSyncDependentCaches();

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
