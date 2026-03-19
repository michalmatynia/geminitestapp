import { NextRequest, NextResponse } from 'next/server';
import type { Queue } from 'bullmq';

import {
  getKangurSocialPipelineQueue,
  KANGUR_SOCIAL_PIPELINE_REPEAT_EVERY_MS,
} from '@/features/kangur/workers/kangurSocialPipelineQueue';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const managed = getKangurSocialPipelineQueue();
  const status = await managed.getHealthStatus();

  let isPaused = false;
  const rawQueue = managed.getQueue() as Queue | null;
  if (rawQueue) {
    isPaused = await rawQueue.isPaused();
  }

  return NextResponse.json(
    { ...status, isPaused, repeatEveryMs: KANGUR_SOCIAL_PIPELINE_REPEAT_EVERY_MS },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
