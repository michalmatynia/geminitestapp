import { type NextRequest, NextResponse } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import {
  PLAYWRIGHT_LIVE_SCRIPTER_WS_PATH,
  liveScripterStartRequestSchema,
  liveScripterStartResponseSchema,
  type LiveScripterStartRequest,
} from '@/shared/contracts/playwright-live-scripter';
import { forbiddenError } from '@/shared/errors/app-error';
import { getSessionUser } from '@/shared/lib/api/session-registry';
import { createLiveScripterSession } from '@/features/playwright/server/live-session';

export { liveScripterStartRequestSchema };

const assertAdminAccess = async (): Promise<string> => {
  const session = await getSessionUser();
  const hasElevatedAccess = session?.isElevated === true;
  const sessionId = typeof session?.id === 'string' ? session.id.trim() : '';
  if (!hasElevatedAccess || sessionId.length === 0) {
    throw forbiddenError('Admin access is required for Playwright live scripter.');
  }
  return sessionId;
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
