import { NextRequest, NextResponse } from 'next/server';
import type { Job, Queue } from 'bullmq';

import {
  getKangurSocialPipelineQueue,
  getKangurSocialPipelineWorkerHeartbeat,
  KANGUR_SOCIAL_PIPELINE_REPEAT_EVERY_MS,
  KANGUR_SOCIAL_PIPELINE_WORKER_HEARTBEAT_TTL_MS,
} from '@/features/kangur/social/workers/kangurSocialPipelineQueue';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { isRedisAvailable, isRedisReachable } from '@/shared/lib/queue';

export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const managed = getKangurSocialPipelineQueue();
  const now = Date.now();
  let status = await managed.getHealthStatus().catch(async () => {
    const redisConfigured = isRedisAvailable();
    const redisReachable = redisConfigured ? await isRedisReachable() : false;
    return {
      deliveryMode: redisConfigured ? 'queue' : 'inline',
      workerState: redisConfigured ? 'offline' : 'inline',
      statusReason: redisConfigured ? 'redis_unreachable' : 'missing_redis',
      redisAvailable: redisReachable,
      workerLocal: false,
      running: false,
      healthy: false,
      processing: false,
      waitingCount: 0,
      activeCount: 0,
      completedCount: 0,
      failedCount: 0,
      lastPollTime: 0,
      timeSinceLastPoll: 0,
    };
  });
  const workerHeartbeatTime = await getKangurSocialPipelineWorkerHeartbeat();
  const timeSinceWorkerHeartbeat =
    workerHeartbeatTime != null ? Math.max(0, now - workerHeartbeatTime) : undefined;
  const hasFreshWorkerHeartbeat =
    typeof timeSinceWorkerHeartbeat === 'number' &&
    timeSinceWorkerHeartbeat <= KANGUR_SOCIAL_PIPELINE_WORKER_HEARTBEAT_TTL_MS;

  let isPaused = false;
  const rawQueue = managed.getQueue() as Queue | null;
  if (rawQueue) {
    isPaused = await rawQueue.isPaused();
  }

  const resolveProcessLabel = (jobType: unknown): string | null => {
    switch (jobType) {
      case 'manual-post-pipeline':
        return 'Full pipeline';
      case 'manual-post-visual-analysis':
        return 'Image analysis';
      case 'manual-post-generation':
        return 'Generate post';
      default:
        return null;
    }
  };

  const resolveActiveProcessSummary = async (): Promise<
    | {
        label: string;
        additionalRunningCount: number;
      }
    | undefined
  > => {
    if (!rawQueue || (status.activeCount ?? 0) <= 0) {
      return undefined;
    }

    try {
      const activeJobs: Job[] = await rawQueue.getJobs(['active'], 0, 4);
      const firstActiveJob = activeJobs[0];
      const label = resolveProcessLabel(
        firstActiveJob && typeof firstActiveJob.data === 'object' && firstActiveJob.data
          ? (firstActiveJob.data as { type?: unknown }).type
          : null
      );

      if (!label) {
        return undefined;
      }

      return {
        label,
        additionalRunningCount: Math.max(0, (status.activeCount ?? 0) - 1),
      };
    } catch {
      return undefined;
    }
  };

  const effectiveWorkerState = isPaused
    ? 'paused'
    : hasFreshWorkerHeartbeat && status.workerState === 'offline'
      ? 'idle'
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
    (status.healthy ?? false) ||
    effectiveWorkerState === 'running' ||
    effectiveWorkerState === 'idle' ||
    effectiveWorkerState === 'paused';
  const activeProcessSummary = await resolveActiveProcessSummary();

  return NextResponse.json(
    {
      ...status,
      statusReason:
        hasFreshWorkerHeartbeat && status.statusReason === 'worker_inactive'
          ? undefined
          : status.statusReason,
      workerState: effectiveWorkerState,
      workerHeartbeatTime: workerHeartbeatTime ?? undefined,
      timeSinceWorkerHeartbeat,
      running: effectiveRunning,
      healthy: effectiveHealthy,
      isPaused,
      repeatEveryMs: KANGUR_SOCIAL_PIPELINE_REPEAT_EVERY_MS,
      activeProcessSummary,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
