import { type NextRequest, NextResponse } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import {
  PLAYWRIGHT_LIVE_SCRIPTER_WS_PATH,
  liveScripterStartRequestSchema,
  liveScripterStartResponseSchema,
  type LiveScripterStartRequest,
} from '@/shared/contracts/playwright-live-scripter';
import { forbiddenError } from '@/shared/errors/app-error';
import { readOptionalServerAuthSession } from '@/features/auth/server';
import { createLiveScripterSession } from '@/features/playwright/server/live-session';

export { liveScripterStartRequestSchema };

const assertAdminAccess = async (): Promise<string> => {
  const session = await readOptionalServerAuthSession();
  const hasElevatedAccess = session?.user?.isElevated === true;
  const userId = typeof session?.user?.id === 'string' ? session.user.id.trim() : '';
  if (!hasElevatedAccess || userId.length === 0) {
    throw forbiddenError('Admin access is required for Playwright live scripter.');
  }
  return userId;
};

const postHandler = async (
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> => {
  const body = ctx.body as LiveScripterStartRequest;
  const ownerUserId = await assertAdminAccess();
  const result = await createLiveScripterSession({
    ownerUserId,
    url: body.url,
    viewport: body.viewport,
    personaId: body.personaId ?? null,
    selectorProfile: body.selectorProfile ?? null,
  });

  return NextResponse.json(
    liveScripterStartResponseSchema.parse({
      sessionId: result.sessionId,
      socketPath: `${PLAYWRIGHT_LIVE_SCRIPTER_WS_PATH}?sessionId=${encodeURIComponent(result.sessionId)}`,
    })
  );
};

export { postHandler as POST_handler };
