import { NextRequest, NextResponse } from 'next/server';

import { requireAiPathsAccess } from '@/features/ai/ai-paths/server';
import { getAiPathRunQueueStatus, startAiInsightsQueue, startAiPathRunQueue } from '@/features/jobs/server';
import type { ApiHandlerContext } from '@/shared/types/api/api';

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireAiPathsAccess();
  startAiPathRunQueue();
  startAiInsightsQueue();
  const status = await getAiPathRunQueueStatus();
  return NextResponse.json({ status });
}
