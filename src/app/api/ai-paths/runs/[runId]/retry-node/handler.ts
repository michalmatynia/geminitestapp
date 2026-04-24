import { type NextRequest, NextResponse } from 'next/server';

import {
  enforceAiPathsActionRateLimit,
  requireAiPathsAccess,
} from '@/features/ai/ai-paths/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const FORWARD_ONLY_ERROR =
  'AI Paths is forward-only. Node retry operations have been removed.';

export async function postHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  _params: { runId: string }
): Promise<Response> {
  const access = await requireAiPathsAccess();
  await enforceAiPathsActionRateLimit(access, 'run-retry');
  return NextResponse.json({ error: FORWARD_ONLY_ERROR }, { status: 410 });
}
