import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/features/auth/server';
import {
  copyCollection,
  getSupportedCollections,
} from '@/shared/lib/db/services/database-collection-copy';
import { assertDatabaseEngineOperationEnabled } from '@/shared/lib/db/services/database-engine-operation-guards';
import type { DatabaseSyncDirection } from '@/shared/contracts/database';
import { authError, badRequestError } from '@/shared/errors/app-error';
import { parseObjectJsonBody } from '@/shared/lib/api/parse-json';

const SAFE_NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export async function POST_handler(req: NextRequest): Promise<Response> {
  const session = await auth();
  const hasAccess =
    session?.user?.isElevated || session?.user?.permissions?.includes('settings.manage');
  if (!hasAccess) {
    throw authError('Unauthorized.');
  }

  const parsed = await parseObjectJsonBody(req, {
    logPrefix: 'databases.copy-collection',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const body = parsed.data as {
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

export async function GET_handler(): Promise<Response> {
  const collections = getSupportedCollections();
  return NextResponse.json({ collections });
}
