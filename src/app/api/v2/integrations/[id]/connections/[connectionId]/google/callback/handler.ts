import { type NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

import { getHandler as getStableGoogleCallbackHandler } from '../../../../../google/callback/handler';

export async function getHandler(
  req: NextRequest,
  ctx: ApiHandlerContext,
  _params: { id: string; connectionId: string }
): Promise<Response> {
  return getStableGoogleCallbackHandler(req, ctx);
}
