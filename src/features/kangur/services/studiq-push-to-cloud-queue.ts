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
  pushStudiqLocalToCloud,
  type StudiqPushProgress,
  type StudiqPushToCloudResult,
} from './studiq-push-to-cloud.server';

export type StudiqPushJobData = {
  triggeredAt: string;
};

export type StudiqPushJobProgress = StudiqPushProgress;

type PushJobHealthSnapshot = {
  mode: 'queue' | 'inline' | 'no-redis';
  redisAvailable: boolean;
  workerState: string;
  activeCount: number;
  waitingCount: number;
  failedCount: number;
};

type StudiqBullQueue = Queue<StudiqPushJobData, StudiqPushToCloudResult>;
type StudiqBullJob = Job<StudiqPushJobData, StudiqPushToCloudResult, string>;

export type StudiqPushJobStatus = {
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'unknown';
  progress: StudiqPushJobProgress | null;
  failedReason?: string;
  result?: StudiqPushToCloudResult;
};

let studiqPushQueue: ManagedQueue<StudiqPushJobData> | null = null;

export function getStudiqPushToCloudQueue(): ManagedQueue<StudiqPushJobData> {
  if (studiqPushQueue === null) {
    studiqPushQueue = createManagedQueue<StudiqPushJobData>({
      name: 'studiq-push-to-cloud',
      concurrency: 1,
      jobTimeoutMs: 120_000,
      processor: async (
        data: StudiqPushJobData,
        jobId: string,
        _signal?: AbortSignal,
        helpers?: { updateProgress: (p: unknown) => Promise<void> }
      ): Promise<StudiqPushToCloudResult> => {
        void logSystemEvent({
          level: 'info',
          source: 'studiq-push-to-cloud',
          message: `[studiq-push-to-cloud] job ${jobId} starting`,
          context: { jobId, triggeredAt: data.triggeredAt },
        });

        const result = await pushStudiqLocalToCloud(async (p: StudiqPushProgress) => {
          if (helpers) {
            await helpers.updateProgress(p);
          }
        });

        void logSystemEvent({
          level: 'info',
          source: 'studiq-push-to-cloud',
          message: `[studiq-push-to-cloud] job ${jobId} complete — ${result.collectionCount} collections, ${result.documentCount} documents`,
          context: { jobId, updatedAt: result.updatedAt },
        });

        return result;
      },
    });
    studiqPushQueue.startWorker();
  }
  return studiqPushQueue;
}

const toPushJobState = (state: string): StudiqPushJobStatus['state'] => {
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

const isStudiqBullQueue = (value: unknown): value is StudiqBullQueue =>
  typeof value === 'object' && value !== null && 'getJob' in value;

const isProgressShape = (v: unknown): v is StudiqPushJobProgress =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as Record<string, unknown>)['step'] === 'number' &&
  typeof (v as Record<string, unknown>)['message'] === 'string';

const isResult = (v: unknown): v is StudiqPushToCloudResult =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as Record<string, unknown>)['collectionCount'] === 'number';

const buildPushJobStatus = async (job: StudiqBullJob): Promise<StudiqPushJobStatus> => {
  const safeState = toPushJobState(await job.getState());
  const status: StudiqPushJobStatus = {
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

export async function getStudiqJobProgress(jobId: string): Promise<StudiqPushJobStatus | null> {
  if (!isRedisAvailable()) return null;

  const queue = getStudiqPushToCloudQueue();
  const q = queue.getQueue();
  if (!isStudiqBullQueue(q)) return null;

  const job = await q.getJob(jobId);
  if (job === undefined) return null;

  return buildPushJobStatus(job);
}

export async function triggerStudiqPushToCloud(): Promise<{
  ok: boolean;
  jobId: string | null;
  mode: 'queue' | 'inline' | 'no-redis';
  triggeredAt: string;
  result?: StudiqPushToCloudResult;
  error?: string;
}> {
  const triggeredAt = new Date().toISOString();

  if (!isRedisAvailable()) {
    try {
      const result = await pushStudiqLocalToCloud();
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

  const queue = getStudiqPushToCloudQueue();
  const jobId = await queue.enqueue({ triggeredAt });
  return { ok: true, jobId, mode: 'queue', triggeredAt };
}

export async function getStudiqPushQueueHealth(): Promise<PushJobHealthSnapshot> {
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

  const queue = getStudiqPushToCloudQueue();
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
