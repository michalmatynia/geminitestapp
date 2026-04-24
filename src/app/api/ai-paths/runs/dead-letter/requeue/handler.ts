import { type NextRequest, NextResponse } from 'next/server';

import {
  enforceAiPathsActionRateLimit,
  requireAiPathsAccess,
} from '@/features/ai/ai-paths/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const FORWARD_ONLY_ERROR =
  'AI Paths is forward-only. Dead-letter requeue operations have been removed.';

export async function postHandler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const access = await requireAiPathsAccess();
  await enforceAiPathsActionRateLimit(access, 'run-requeue');
  return NextResponse.json({ error: FORWARD_ONLY_ERROR }, { status: 410 });
}
