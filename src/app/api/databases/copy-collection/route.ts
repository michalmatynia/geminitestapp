export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/features/auth/server';
import {
  copyCollection,
  getSupportedCollections,
} from '@/features/database/services/database-collection-copy';
import { assertDatabaseEngineOperationEnabled } from '@/features/database/services/database-engine-operation-guards';
import type { DatabaseSyncDirection } from '@/features/database/services/database-sync';
import { authError, badRequestError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const SAFE_NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

async function POST_handler(req: NextRequest): Promise<Response> {
  const session = await auth();
  const hasAccess =
    session?.user?.isElevated ||
    session?.user?.permissions?.includes('settings.manage');
  if (!hasAccess) {
    throw authError('Unauthorized.');
  }

  const body = await req.json() as {
    collection?: string;
    direction?: DatabaseSyncDirection;
  };

  const { collection, direction } = body;

  if (!collection || !SAFE_NAME_RE.test(collection)) {
    throw badRequestError('A valid collection name is required.');
  }

  if (direction !== 'mongo_to_prisma' && direction !== 'prisma_to_mongo') {
    throw badRequestError('Direction must be "mongo_to_prisma" or "prisma_to_mongo".');
  }

  await assertDatabaseEngineOperationEnabled('allowManualCollectionSync');

  const result = await copyCollection(collection, direction);
  return NextResponse.json(result);
}

async function GET_handler(): Promise<Response> {
  const collections = getSupportedCollections();
  return NextResponse.json({ collections });
}

export const POST = apiHandler(
  async (req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> => POST_handler(req),
  { source: 'databases.copy-collection.POST' }
);

export const GET = apiHandler(
  async (_req: Request, _ctx: ApiHandlerContext): Promise<Response> => GET_handler(),
  { source: 'databases.copy-collection.GET' }
);
