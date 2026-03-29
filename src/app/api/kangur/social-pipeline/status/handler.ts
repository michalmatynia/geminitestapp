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

  const effectiveWorkerState = isPaused
    ? 'paused'
    : (status.workerState ??
      ((status.processing ?? false)
        ? 'running'
        : (status.running ?? false)
          ? 'idle'
          : status.deliveryMode === 'inline'
            ? 'inline'
            : 'offline'));
  const effectiveRunning = effectiveWorkerState === 'running';
  const effectiveHealthy =
    status.healthy ??
    (effectiveWorkerState === 'running' ||
      effectiveWorkerState === 'idle' ||
      effectiveWorkerState === 'paused');

  return NextResponse.json(
    {
      ...status,
      workerState: effectiveWorkerState,
      running: effectiveRunning,
      healthy: effectiveHealthy,
      isPaused,
      repeatEveryMs: KANGUR_SOCIAL_PIPELINE_REPEAT_EVERY_MS,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
