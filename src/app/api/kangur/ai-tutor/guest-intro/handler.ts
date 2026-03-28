import { NextRequest, NextResponse } from 'next/server';

import { extractClientIp } from '@/features/auth/server';
import { registerKangurGuestAiTutorIntroAppearance } from '@/features/kangur/server/guest-ai-tutor-intro';
import { readKangurLearnerSession } from '@/features/kangur/services/kangur-learner-session';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import { readTolerantServerAuthSession } from '@/features/auth/server';

export async function getKangurAiTutorGuestIntroHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const [parentSession, learnerSession] = await Promise.all([
    readTolerantServerAuthSession({
      onError: (error) => ErrorSystem.captureException(error),
    }),
    Promise.resolve(readKangurLearnerSession(req)),
  ]);

  if (parentSession?.user?.id || learnerSession) {
    return NextResponse.json({
      ok: true,
      shouldShow: false,
      reason: 'authenticated',
    });
  }

  const result = await registerKangurGuestAiTutorIntroAppearance({
    ip: extractClientIp(req),
    userAgent: req.headers.get('user-agent'),
  });

  return NextResponse.json({
    ok: true,
    shouldShow: result.shouldShow,
    reason: result.reason,
  });
}
