import { type NextRequest, NextResponse } from 'next/server';

import { badRequestError } from '@/shared/errors/app-error';
import { assertDatabaseEngineManageAccess } from '@/features/database/server';

export async function postHandler(req: NextRequest): Promise<Response> {
  await assertDatabaseEngineManageAccess();
  void req;
  throw badRequestError(
    'Collection copy is no longer supported. MongoDB is the only active database provider.'
  );
}

export async function getHandler(): Promise<Response> {
  await assertDatabaseEngineManageAccess();
  return NextResponse.json({
    collections: [],
    deprecated: true,
    message: 'Collection copy is no longer supported. MongoDB is the only active database provider.',
  });
}
