import { type NextRequest, NextResponse } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import {
  liveScripterDisposeRequestSchema,
  type LiveScripterDisposeRequest,
} from '@/shared/contracts/playwright-live-scripter';
import { forbiddenError } from '@/shared/errors/app-error';
import { readOptionalServerAuthSession } from '@/features/auth/server';
import {
  disposeLiveScripterSession,
  getLiveScripterSession,
} from '@/features/playwright/server/live-session';

export { liveScripterDisposeRequestSchema };

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
