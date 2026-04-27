import { type NextRequest, NextResponse } from 'next/server';
import type { Job, Queue } from 'bullmq';

import {
  getKangurSocialPipelineQueue,
  getKangurSocialPipelineWorkerHeartbeat,
  KANGUR_SOCIAL_PIPELINE_REPEAT_EVERY_MS,
  KANGUR_SOCIAL_PIPELINE_WORKER_HEARTBEAT_TTL_MS,
} from '@/features/kangur/social/workers/kangurSocialPipelineQueue';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { isRedisAvailable, isRedisReachable } from '@/shared/lib/queue';

interface PipelineStatus {
  deliveryMode: 'queue' | 'inline';
  workerState: string;
  statusReason?: string;
  redisAvailable: boolean;
  workerLocal: boolean;
  running: boolean;
  healthy: boolean;
  processing: boolean;
  waitingCount: number;
  activeCount: number;
  completedCount: number;
  failedCount: number;
  lastPollTime: number;
  timeSinceLastPoll: number;
}

const getFallbackStatus = async (): Promise<PipelineStatus> => {
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
};

const resolveProcessLabel = (jobType: unknown): string | null => {
  if (jobType === 'manual-post-pipeline') return 'Full pipeline';
  if (jobType === 'manual-post-visual-analysis') return 'Image analysis';
  if (jobType === 'manual-post-generation') return 'Generate post';
  return null;
};

const resolveActiveProcessSummary = async (
  rawQueue: Queue | null,
  activeCount: number
): Promise<{ label: string; additionalRunningCount: number } | undefined> => {
  if (rawQueue === null || activeCount <= 0) return undefined;

  try {
    const activeJobs: Job[] = await rawQueue.getJobs(['active'], 0, 4);
    const firstActiveJob = activeJobs[0];
    const jobData = firstActiveJob?.data as { type?: unknown } | null;
    const label = jobData ? resolveProcessLabel(jobData.type) : null;
    return label ? { label, additionalRunningCount: Math.max(0, activeCount - 1) } : undefined;
  } catch {
    return undefined;
  }
};

const getEffectiveWorkerState = (
  isPaused: boolean,
  hasFreshWorkerHeartbeat: boolean,
  status: PipelineStatus
): string => {
  if (isPaused) return 'paused';
  if (hasFreshWorkerHeartbeat && status.workerState === 'offline') return 'idle';
  if (status.workerState !== '') return status.workerState;
  if (status.processing) return 'running';
  if (status.running) return 'idle';
  return status.deliveryMode === 'inline' ? 'inline' : 'offline';
};

export async function getHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const managed = getKangurSocialPipelineQueue();
  const now = Date.now();
  const status = await managed.getHealthStatus().catch(getFallbackStatus);

  const workerHeartbeatTime = await getKangurSocialPipelineWorkerHeartbeat();
  const timeSinceWorkerHeartbeat = workerHeartbeatTime !== null ? Math.max(0, now - workerHeartbeatTime) : undefined;
  const hasFreshWorkerHeartbeat =
    typeof timeSinceWorkerHeartbeat === 'number' &&
    timeSinceWorkerHeartbeat <= KANGUR_SOCIAL_PIPELINE_WORKER_HEARTBEAT_TTL_MS;

  const rawQueue = managed.getQueue() as Queue | null;
  const isPaused = rawQueue !== null ? await rawQueue.isPaused() : false;

  const effectiveWorkerState = getEffectiveWorkerState(isPaused, hasFreshWorkerHeartbeat, status as PipelineStatus);
  const effectiveRunning = effectiveWorkerState === 'running';
  const effectiveHealthy =
    (status.healthy === true) ||
    ['running', 'idle', 'paused'].includes(effectiveWorkerState);

  const activeProcessSummary = await resolveActiveProcessSummary(rawQueue, status.activeCount);

  return NextResponse.json(
    {
      ...status,
      statusReason: (hasFreshWorkerHeartbeat && status.statusReason !== undefined && status.statusReason !== '' && status.statusReason === 'worker_inactive') ? undefined : status.statusReason,
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


