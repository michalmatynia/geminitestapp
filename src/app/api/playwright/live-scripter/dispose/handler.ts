import { type NextRequest, NextResponse } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import {
  liveScripterDisposeRequestSchema,
  type LiveScripterDisposeRequest,
} from '@/shared/contracts/playwright-live-scripter';
import { forbiddenError } from '@/shared/errors/app-error';
import { getSessionUser } from '@/shared/lib/api/session-registry';
import {
  disposeLiveScripterSession,
  getLiveScripterSession,
} from '@/features/playwright/server/live-session';

export { liveScripterDisposeRequestSchema };

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
  const body = ctx.body as LiveScripterDisposeRequest;
  const ownerUserId = await assertAdminAccess();
  const session = getLiveScripterSession(body.sessionId);
  if (session !== null && session.ownerUserId !== ownerUserId) {
    throw forbiddenError('Live scripter session access denied.');
  }

  await disposeLiveScripterSession(body.sessionId);
  return NextResponse.json({ ok: true });
};

export { postHandler as POST_handler };
