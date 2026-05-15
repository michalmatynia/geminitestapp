import 'server-only';

import {
  createManagedQueue,
  isRedisAvailable,
  isRedisReachable,
  type ManagedQueue,
} from '@/shared/lib/queue';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';

import {
  pushMilkbarRuntimeToCloud,
  type MilkbarPushToCloudResult,
} from './milkbar-cms.server';

export type MilkbarPushJobData = {
  triggeredAt: string;
};

type PushJobHealthSnapshot = {
  mode: 'queue' | 'inline' | 'no-redis';
  redisAvailable: boolean;
  workerState: string;
  activeCount: number;
  waitingCount: number;
  failedCount: number;
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
        jobId: string
      ): Promise<MilkbarPushToCloudResult> => {
        void logSystemEvent({
          level: 'info',
          source: 'milkbar-push-to-cloud',
          message: `[milkbar-push-to-cloud] job ${jobId} starting, triggered at ${data.triggeredAt}`,
          context: { jobId, triggeredAt: data.triggeredAt },
        });
        const result = await pushMilkbarRuntimeToCloud();
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
