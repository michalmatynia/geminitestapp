import 'server-only';

import type { Job, Queue } from 'bullmq';

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
type MilkbarBullQueue = Queue<MilkbarPushJobData, MilkbarPushToCloudResult>;
type MilkbarBullJob = Job<MilkbarPushJobData, MilkbarPushToCloudResult, string>;

export type MilkbarPushJobStatus = {
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'unknown';
  progress: MilkbarPushJobProgress | null;
  failedReason?: string;
  result?: MilkbarPushToCloudResult;
};

let milkbarPushQueue: ManagedQueue<MilkbarPushJobData> | null = null;

export function getMilkbarPushToCloudQueue(): ManagedQueue<MilkbarPushJobData> {
  if (milkbarPushQueue === null) {
    milkbarPushQueue = createManagedQueue<MilkbarPushJobData>({
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
    milkbarPushQueue.startWorker();
  }
  return milkbarPushQueue;
}

const toPushJobState = (state: string): MilkbarPushJobStatus['state'] => {
  switch (state) {
    case 'waiting':
    case 'active':
    case 'completed':
    case 'failed':
    case 'delayed':
      return state;
    default:
      return 'unknown';
  }
};

const isMilkbarBullQueue = (value: unknown): value is MilkbarBullQueue =>
  typeof value === 'object' && value !== null && 'getJob' in value;

const buildPushJobStatus = async (job: MilkbarBullJob): Promise<MilkbarPushJobStatus> => {
  const safeState = toPushJobState(await job.getState());
  const status: MilkbarPushJobStatus = {
    state: safeState,
    progress: isProgressShape(job.progress) ? job.progress : null,
  };

  if (safeState === 'failed') {
    return { ...status, failedReason: job.failedReason };
  }
  if (safeState === 'completed' && isResult(job.returnvalue)) {
    return { ...status, result: job.returnvalue };
  }
  return status;
};

export async function getJobProgress(jobId: string): Promise<MilkbarPushJobStatus | null> {
  if (!isRedisAvailable()) return null;

  const queue = getMilkbarPushToCloudQueue();
  const q = queue.getQueue();
  if (!isMilkbarBullQueue(q)) return null;

  const job = await q.getJob(jobId);
  if (job === undefined) return null;

  return buildPushJobStatus(job);
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
    redisAvailable: health.redisAvailable === true,
    workerState: health.workerState ?? 'unknown',
    activeCount: health.activeCount,
    waitingCount: health.waitingCount,
    failedCount: health.failedCount,
  };
}
