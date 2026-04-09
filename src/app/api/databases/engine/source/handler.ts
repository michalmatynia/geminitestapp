import { NextRequest, NextResponse } from 'next/server';

import type {
  DatabaseEngineSetMongoSourceRequest,
  DatabaseEngineSetMongoSourceResponse,
} from '@/shared/contracts/database';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { parseObjectJsonBody } from '@/shared/lib/api/parse-json';
import { assertDatabaseEngineManageAccess } from '@/features/database/server';
import {
  databaseEngineSetMongoSourceRequestSchema,
  type DatabaseEngineMongoSourceState,
} from '@/shared/contracts/database';
import {
  applyActiveMongoSourceEnv,
  getMongoSourceState,
  setActiveMongoSource,
} from '@/shared/lib/db/mongo-source';
import { invalidateAppDbProviderCache } from '@/shared/lib/db/app-db-provider';
import { invalidateCollectionProviderMapCache } from '@/shared/lib/db/collection-provider-map';
import { invalidateDatabaseEnginePolicyCache } from '@/shared/lib/db/database-engine-policy';
import { clearSettingsCache } from '@/shared/lib/settings-cache';
import { clearLiteSettingsServerCache } from '@/shared/lib/settings-lite-server-cache';

const clearMongoSourceDependentCaches = (): void => {
  invalidateAppDbProviderCache();
  invalidateCollectionProviderMapCache();
  invalidateDatabaseEnginePolicyCache();
  clearSettingsCache();
  clearLiteSettingsServerCache();
};

const buildSwitchMessage = (state: DatabaseEngineMongoSourceState): string => {
  if (!state.activeSource) {
    return 'No MongoDB source is active.';
  }
  return `MongoDB source switched to ${state.activeSource}.`;
};

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertDatabaseEngineManageAccess();
  await applyActiveMongoSourceEnv();
  const payload = await getMongoSourceState();
  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertDatabaseEngineManageAccess();

  const parsed = await parseObjectJsonBody(req, {
    logPrefix: 'databases.engine.source.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const body = databaseEngineSetMongoSourceRequestSchema.parse(
    parsed.data
  ) as DatabaseEngineSetMongoSourceRequest;

  await setActiveMongoSource(body.source);
  clearMongoSourceDependentCaches();

  const state = await getMongoSourceState();
  const payload: DatabaseEngineSetMongoSourceResponse = {
    success: true,
    message: buildSwitchMessage(state),
    state,
  };

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
