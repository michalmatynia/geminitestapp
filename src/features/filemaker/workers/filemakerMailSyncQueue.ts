import 'server-only';

import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { createManagedQueue, isRedisAvailable } from '@/shared/lib/queue';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { syncFilemakerMailAccount } from '../server/filemaker-mail-service';
import type {
  FilemakerMailSyncDispatchReason,
  FilemakerMailSyncDispatchResponse,
  FilemakerMailSyncResult,
} from '../types';

type FilemakerMailSyncQueueJobData = {
  accountId: string;
  reason: FilemakerMailSyncDispatchReason;
  requestedAt: string;
};

type FilemakerMailSyncQueueJobResult = {
  ok: true;
  accountId: string;
  reason: FilemakerMailSyncDispatchReason;
  requestedAt: string;
  jobId: string;
  result: FilemakerMailSyncResult & { lastSyncError: string | null };
};

const LOG_SOURCE = 'filemaker-mail-sync-queue';

const parseMsFromEnv = (raw: string | undefined, fallback: number, min: number): number => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.floor(parsed));
};

const FILEMAKER_MAIL_SYNC_JOB_TIMEOUT_MS = parseMsFromEnv(
  process.env['FILEMAKER_MAIL_SYNC_JOB_TIMEOUT_MS'],
  20 * 60_000,
  60_000
);

const encodeJobIdPart = (value: string, fallback: string): string => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? encodeURIComponent(trimmed) : fallback;
};

export const buildFilemakerMailSyncQueueJobId = (
  data: FilemakerMailSyncQueueJobData
): string => {
  const requestedAtMs = Date.parse(data.requestedAt);
  const requestBucket =
    Number.isFinite(requestedAtMs) && requestedAtMs > 0
      ? Math.floor(requestedAtMs / 15_000)
      : Math.floor(Date.now() / 15_000);
  return [
    'filemaker-mail-sync',
    encodeJobIdPart(data.accountId, 'account'),
    encodeJobIdPart(data.reason, 'manual'),
    String(requestBucket),
  ].join('__');
};

const queue = createManagedQueue<FilemakerMailSyncQueueJobData>({
  name: 'filemaker-mail-sync',
  concurrency: 1,
  jobTimeoutMs: FILEMAKER_MAIL_SYNC_JOB_TIMEOUT_MS,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: false,
  },
  processor: async (data, jobId, _signal, context) => {
    const result = await syncFilemakerMailAccount(data.accountId);

    if (
      context !== null &&
      context !== undefined &&
      typeof context.updateProgress === 'function'
    ) {
      await context.updateProgress({
        accountId: data.accountId,
        reason: data.reason,
        fetchedMessageCount: result.fetchedMessageCount,
        insertedMessageCount: result.insertedMessageCount,
        updatedMessageCount: result.updatedMessageCount,
        touchedThreadCount: result.touchedThreadCount,
      });
    }

    if (typeof result.lastSyncError === 'string' && result.lastSyncError.trim().length > 0) {
      await logSystemEvent({
        level: 'warn',
        source: LOG_SOURCE,
        message: `Filemaker mail sync finished with an account error for ${data.accountId}`,
        context: {
          accountId: data.accountId,
          reason: data.reason,
          jobId,
          lastSyncError: result.lastSyncError,
        },
      }).catch(() => {});
    }

    return {
      ok: true,
      accountId: data.accountId,
      reason: data.reason,
      requestedAt: data.requestedAt,
      jobId,
      result,
    } satisfies FilemakerMailSyncQueueJobResult;
  },
  onCompleted: async (jobId, result, data) => {
    await logSystemEvent({
      level: 'info',
      source: LOG_SOURCE,
      message: `Filemaker mail sync job completed for ${data.accountId}`,
      context: {
        accountId: data.accountId,
        reason: data.reason,
        jobId,
        result,
      },
    }).catch(() => {});
  },
  onFailed: async (jobId, error, data) => {
    await ErrorSystem.captureException(error, {
      service: LOG_SOURCE,
      accountId: data.accountId,
      reason: data.reason,
      jobId,
    });
  },
});

const processInlineSyncInBackground = (data: FilemakerMailSyncQueueJobData): void => {
  queue.processInline(data).catch((error: unknown) => {
    ErrorSystem.captureException(error, {
      service: LOG_SOURCE,
      accountId: data.accountId,
      reason: data.reason,
      action: 'inline-background-failed',
    }).catch(() => {});
  });
};

export const startFilemakerMailSyncQueue = (): void => {
  queue.startWorker();
};

export const stopFilemakerMailSyncQueue = async (): Promise<void> => {
  await queue.stopWorker();
};

export const enqueueFilemakerMailSyncJob = async (
  input: {
    accountId: string;
    reason: FilemakerMailSyncDispatchReason;
    requestedAt?: string;
  }
): Promise<FilemakerMailSyncDispatchResponse> => {
  const data: FilemakerMailSyncQueueJobData = {
    accountId: input.accountId,
    reason: input.reason,
    requestedAt: input.requestedAt ?? new Date().toISOString(),
  };

  if (isRedisAvailable() === false) {
    processInlineSyncInBackground(data);
    return {
      accountId: data.accountId,
      dispatchMode: 'inline',
      jobId: null,
      reason: data.reason,
      requestedAt: data.requestedAt,
    };
  }

  try {
    const jobId = await queue.enqueue(data, {
      jobId: buildFilemakerMailSyncQueueJobId(data),
    });
    return {
      accountId: data.accountId,
      dispatchMode: 'queued',
      jobId,
      reason: data.reason,
      requestedAt: data.requestedAt,
    };
  } catch (error) {
    ErrorSystem.captureException(error, {
      service: LOG_SOURCE,
      accountId: data.accountId,
      reason: data.reason,
      action: 'enqueue-failed',
    }).catch(() => {});
    processInlineSyncInBackground(data);
    return {
      accountId: data.accountId,
      dispatchMode: 'inline',
      jobId: null,
      reason: data.reason,
      requestedAt: data.requestedAt,
    };
  }
};
