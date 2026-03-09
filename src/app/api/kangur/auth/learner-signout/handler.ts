import { NextRequest, NextResponse } from 'next/server';

import { clearKangurLearnerSession } from '@/features/kangur/services/kangur-learner-session';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export async function postKangurLearnerSignOutHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const response = NextResponse.json({ ok: true });
  clearKangurLearnerSession(response);
  return response;
}
