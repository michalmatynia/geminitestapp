import { NextRequest, NextResponse } from 'next/server';

import {
  clearKangurLearnerSession,
  readKangurLearnerSession,
} from '@/features/kangur/services/kangur-learner-session';
import { ActivityTypes } from '@/shared/constants/observability';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { logActivity } from '@/shared/utils/observability/activity-service';

export async function postKangurLearnerSignOutHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const learnerSession = readKangurLearnerSession(req);
  const response = NextResponse.json({ ok: true });
  clearKangurLearnerSession(response);
  if (learnerSession) {
    void logActivity({
      type: ActivityTypes.KANGUR.LEARNER_SIGNOUT,
      description: 'Kangur learner signed out.',
      userId: learnerSession.ownerUserId,
      entityId: learnerSession.learnerId,
      entityType: 'kangur_learner',
      metadata: {
        surface: 'kangur',
        actorType: 'learner',
        learnerId: learnerSession.learnerId,
        ownerUserId: learnerSession.ownerUserId,
      },
    }).catch(() => {});
  }
  return response;
}
