import { NextRequest, NextResponse } from 'next/server';

import { heartbeatKangurDuelSession } from '@/features/kangur/duels/server';
import { requireActiveLearner, resolveKangurActor } from '@/features/kangur/server';
import { kangurDuelHeartbeatInputSchema } from '@/shared/contracts/kangur-duels';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';

export async function postKangurDuelHeartbeatHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  const learner = requireActiveLearner(actor);
  const payload = kangurDuelHeartbeatInputSchema.parse(ctx.body);
  const response = await heartbeatKangurDuelSession(learner, payload);

  return NextResponse.json(response);
}
