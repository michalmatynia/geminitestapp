import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Queue } from 'bullmq';

import { getKangurSocialPipelineQueue } from '@/features/kangur/social/workers/kangurSocialPipelineQueue';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export async function postHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const managed = getKangurSocialPipelineQueue();
  const rawQueue = managed.getQueue() as Queue | null;

  if (!rawQueue) {
    return NextResponse.json(
      { success: false, error: 'Redis not available' },
      { status: 503 }
    );
  }

  await rawQueue.pause();
  return NextResponse.json({ success: true, isPaused: true });
}
