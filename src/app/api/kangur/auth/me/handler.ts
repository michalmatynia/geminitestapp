import { NextRequest, NextResponse } from 'next/server';

import { resolveKangurActor, toKangurAuthUser } from '@/features/kangur/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

export async function getKangurAuthMeHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  return NextResponse.json(toKangurAuthUser(actor));
}
