import 'server-only';

import type { Queue } from 'bullmq';

import {
  createManagedQueue,
  isRedisAvailable,
  isRedisReachable,
  type ManagedQueue,
} from '@/shared/lib/queue';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';

import {
  pushMilkbarRuntimeToCloud,
  type MilkbarPushProgress,
  type MilkbarPushToCloudResult,
} from './milkbar-cms.server';

export type MilkbarPushJobData = {
  triggeredAt: string;
};

export type MilkbarPushJobProgress = MilkbarPushProgress;

type PushJobHealthSnapshot = {
  mode: 'queue' | 'inline' | 'no-redis';
  redisAvailable: boolean;
  workerState: string;
  activeCount: number;
  waitingCount: number;
  failedCount: number;
};

export type MilkbarPushJobStatus = {
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'unknown';
  progress: MilkbarPushJobProgress | null;
  failedReason?: string;
  result?: MilkbarPushToCloudResult;
};

let _queue: ManagedQueue<MilkbarPushJobData> | null = null;

export function getMilkbarPushToCloudQueue(): ManagedQueue<MilkbarPushJobData> {
  if (!_queue) {
    _queue = createManagedQueue<MilkbarPushJobData>({
      name: 'milkbar-push-to-cloud',
      concurrency: 1,
      jobTimeoutMs: 90_000,
      processor: async (
        data: MilkbarPushJobData,
        jobId: string,
        _signal?: AbortSignal,
        helpers?: { updateProgress: (p: unknown) => Promise<void> }
      ): Promise<MilkbarPushToCloudResult> => {
        void logSystemEvent({
          level: 'info',
          source: 'milkbar-push-to-cloud',
          message: `[milkbar-push-to-cloud] job ${jobId} starting`,
          context: { jobId, triggeredAt: data.triggeredAt },
        });

        const result = await pushMilkbarRuntimeToCloud(async (p: MilkbarPushProgress) => {
          if (helpers) {
            await helpers.updateProgress(p);
          }
        });

        void logSystemEvent({
          level: 'info',
          source: 'milkbar-push-to-cloud',
          message: `[milkbar-push-to-cloud] job ${jobId} complete — ${result.projectCount} projects, ${result.serviceCount} services pushed`,
          context: { jobId, updatedAt: result.updatedAt },
        });

        return result;
      },
    });
    _queue.startWorker();
  }
  return _queue;
}

export async function getJobProgress(jobId: string): Promise<MilkbarPushJobStatus | null> {
  if (!isRedisAvailable()) return null;

  const queue = getMilkbarPushToCloudQueue();
  const q = queue.getQueue() as Queue | null;
  if (!q) return null;

  const job = await q.getJob(jobId);
  if (!job) return null;

  const state = await job.getState();
  const validStates = ['waiting', 'active', 'completed', 'failed', 'delayed'] as const;
  const safeState = validStates.includes(state as typeof validStates[number])
    ? (state as MilkbarPushJobStatus['state'])
    : 'unknown';

  return {
    state: safeState,
    progress: isProgressShape(job.progress) ? job.progress : null,
    ...(safeState === 'failed' ? { failedReason: job.failedReason } : {}),
    ...(safeState === 'completed' && isResult(job.returnvalue)
      ? { result: job.returnvalue as MilkbarPushToCloudResult }
      : {}),
  };
}

const isProgressShape = (v: unknown): v is MilkbarPushJobProgress =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as Record<string, unknown>)['step'] === 'number' &&
  typeof (v as Record<string, unknown>)['message'] === 'string';

const isResult = (v: unknown): v is MilkbarPushToCloudResult =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as Record<string, unknown>)['projectCount'] === 'number';

export async function triggerMilkbarPushToCloud(): Promise<{
  ok: boolean;
  jobId: string | null;
  mode: 'queue' | 'inline' | 'no-redis';
  triggeredAt: string;
  result?: MilkbarPushToCloudResult;
  error?: string;
}> {
  const triggeredAt = new Date().toISOString();

  if (!isRedisAvailable()) {
    try {
      const result = await pushMilkbarRuntimeToCloud();
      return { ok: true, jobId: null, mode: 'inline', triggeredAt, result };
    } catch (err) {
      return {
        ok: false,
        jobId: null,
        mode: 'no-redis',
        triggeredAt,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  const redisOk = await isRedisReachable();
  if (!redisOk) {
    return {
      ok: false,
      jobId: null,
      mode: 'no-redis',
      triggeredAt,
      error: 'Redis is configured but unreachable.',
    };
  }

  const queue = getMilkbarPushToCloudQueue();
  const jobId = await queue.enqueue({ triggeredAt });
  return { ok: true, jobId, mode: 'queue', triggeredAt };
}

export async function getMilkbarPushQueueHealth(): Promise<PushJobHealthSnapshot> {
  if (!isRedisAvailable()) {
    return {
      mode: 'no-redis',
      redisAvailable: false,
      workerState: 'inline',
      activeCount: 0,
      waitingCount: 0,
      failedCount: 0,
    };
  }

  const queue = getMilkbarPushToCloudQueue();
  const health = await queue.getHealthStatus();
  return {
    mode: 'queue',
    redisAvailable: health.redisAvailable,
    workerState: health.workerState,
    activeCount: health.activeCount,
    waitingCount: health.waitingCount,
    failedCount: health.failedCount,
  };
}
