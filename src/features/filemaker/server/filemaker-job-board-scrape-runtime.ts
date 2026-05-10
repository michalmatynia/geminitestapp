/**
 * Filemaker job-board scrape runtime: queue + run-state store + live-event pubsub.
 *
 * Redis is used in production; local/dev falls back to in-memory state.
 */
import 'server-only';

import { randomUUID } from 'crypto';

import { safeSetInterval, safeClearInterval } from '@/shared/lib/timers';

import {
  FILEMAKER_JOB_BOARD_SCRAPE_ENDPOINT,
  filemakerJobBoardScrapeDraftSaveRequestSchema,
  filemakerJobBoardScrapeRequestSchema,
  type FilemakerJobBoardScrapeLiveEvent,
  type FilemakerJobBoardScrapeResponse,
  type FilemakerJobBoardScrapeRuntimeRun,
  type FilemakerJobBoardScrapeRuntimeStartResponse,
} from '@/features/filemaker/filemaker-job-board-scrape-contracts';
import { createManagedQueue } from '@/shared/lib/queue';
import { getRedisClient } from '@/shared/lib/redis';
import { badRequestError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  buildQueuedRun,
  buildRequestFingerprint,
  createAbortError,
  isAbortError,
  isDraftSaveRequest,
  isTerminalStatus,
  nowIso,
  sleep,
  type JobBoardScrapeRuntimeJob,
  type JobBoardScrapeRuntimeRequest,
} from './filemaker-job-board-scrape-runtime.common';
import { activeRunControllers } from './filemaker-job-board-scrape-runtime-controls';
import {
  appendRunEvent,
  claimActiveRunFingerprint,
  clearActiveRunFingerprint,
  readActiveRunByFingerprint,
  readFilemakerJobBoardScrapeRun,
  readLatestFilemakerJobBoardScrapeRun,
  recordRun,
  updateRun,
} from './filemaker-job-board-scrape-runtime.state';
import {
  runFilemakerJobBoardScrape,
  saveFilemakerJobBoardScrapeDrafts,
} from './filemaker-job-board-scrape';

export { readFilemakerJobBoardScrapeRun, readLatestFilemakerJobBoardScrapeRun };
export {
  cancelFilemakerJobBoardScrapeRun,
  pauseFilemakerJobBoardScrapeRun,
  resumeFilemakerJobBoardScrapeRun,
} from './filemaker-job-board-scrape-runtime-controls';

const QUEUE_NAME = 'filemaker-job-board-scrape';
const CANCEL_POLL_INTERVAL_MS = 1_000;
const PAUSE_POLL_INTERVAL_MS = 750;

const assertNotCanceled = async (runId: string): Promise<void> => {
  const snapshot = await readFilemakerJobBoardScrapeRun(runId);
  if (snapshot.run?.status === 'canceled') {
    throw createAbortError();
  }
};

const bindQueueAbortSignal = (
  signal: AbortSignal | undefined,
  runController: AbortController
): (() => void) => {
  const abortFromQueue = (): void => runController.abort(signal?.reason);
  if (signal?.aborted === true) {
    runController.abort(signal.reason);
  }
  signal?.addEventListener('abort', abortFromQueue, { once: true });
  return () => {
    signal?.removeEventListener('abort', abortFromQueue);
  };
};

const startRuntimeCancellationWatcher = (
  runId: string,
  runController: AbortController
): (() => void) => {
  let stopped = false;
  const checkCancellation = async (): Promise<void> => {
    if (stopped || runController.signal.aborted) return;
    try {
      const snapshot = await readFilemakerJobBoardScrapeRun(runId);
      if (snapshot.run?.status === 'canceled') {
        runController.abort(createAbortError());
      }
    } catch (error) {
      void ErrorSystem.captureException(error, {
        action: 'runtime-cancel-watch',
        jobId: runId,
        service: 'filemaker-job-board-scrape-runtime',
      });
    }
  };
  const interval = safeSetInterval(() => {
    void checkCancellation();
  }, CANCEL_POLL_INTERVAL_MS);
  void checkCancellation();
  return () => {
    stopped = true;
    safeClearInterval(interval);
  };
};

const waitWhilePausedFromStore = async (runId: string, signal: AbortSignal): Promise<void> => {
  if (signal.aborted) return;
  const snapshot = await readFilemakerJobBoardScrapeRun(runId);
  if (snapshot.run?.status !== 'paused') return;
  await sleep(PAUSE_POLL_INTERVAL_MS);
  await waitWhilePausedFromStore(runId, signal);
};

const runScraperInRuntime = async (
  data: JobBoardScrapeRuntimeJob,
  signal: AbortSignal
): Promise<FilemakerJobBoardScrapeResponse> => {
  const runOptions = {
    onEvent: async (event: FilemakerJobBoardScrapeLiveEvent) => {
      await assertNotCanceled(data.runId);
      await appendRunEvent(data.runId, event);
    },
    signal,
    waitWhilePaused: () => waitWhilePausedFromStore(data.runId, signal),
  };
  return isDraftSaveRequest(data.request)
    ? saveFilemakerJobBoardScrapeDrafts(data.request, runOptions)
    : runFilemakerJobBoardScrape(data.request, runOptions);
};

const parseRuntimeRequest = (rawInput: unknown): JobBoardScrapeRuntimeRequest => {
  const draftSave = filemakerJobBoardScrapeDraftSaveRequestSchema.safeParse(rawInput);
  if (draftSave.success) return draftSave.data;
  const scrape = filemakerJobBoardScrapeRequestSchema.safeParse(rawInput);
  if (scrape.success) return scrape.data;
  throw badRequestError('Invalid job-board scrape request.', { issues: scrape.error.issues });
};

const completeRuntimeRun = async (
  fingerprint: string,
  runId: string,
  fallbackRun: FilemakerJobBoardScrapeRuntimeRun,
  result: FilemakerJobBoardScrapeResponse
): Promise<void> => {
  const latest = await readFilemakerJobBoardScrapeRun(runId);
  if (latest.run?.status === 'canceled') {
    await clearActiveRunFingerprint(fingerprint, runId);
    return;
  }
  await updateRun(latest.run ?? fallbackRun, {
    completedAt: nowIso(),
    result,
    status: 'completed',
  });
  await clearActiveRunFingerprint(fingerprint, runId);
};

const cancelRuntimeRun = async (
  fingerprint: string | null,
  run: FilemakerJobBoardScrapeRuntimeRun
): Promise<void> => {
  await updateRun(run, {
    completedAt: nowIso(),
    status: 'canceled',
  });
  await clearActiveRunFingerprint(fingerprint, run.id);
};

const failRuntimeRun = async (
  fingerprint: string,
  runId: string,
  run: FilemakerJobBoardScrapeRuntimeRun,
  error: unknown
): Promise<never> => {
  const message = error instanceof Error ? error.message : 'Job-board scrape failed.';
  await appendRunEvent(runId, { at: nowIso(), message, type: 'error' });
  await updateRun(run, {
    completedAt: nowIso(),
    error: message,
    status: 'failed',
  });
  await clearActiveRunFingerprint(fingerprint, runId);
  throw error;
};

const handleRuntimeJobError = async (
  fingerprint: string,
  runId: string,
  fallbackRun: FilemakerJobBoardScrapeRuntimeRun,
  error: unknown
): Promise<void> => {
  const latest = await readFilemakerJobBoardScrapeRun(runId);
  const run = latest.run ?? fallbackRun;
  if (isAbortError(error) || run.status === 'canceled') {
    await cancelRuntimeRun(fingerprint, run);
    return;
  }
  await failRuntimeRun(fingerprint, runId, run, error);
};

const processRuntimeJob = async (
  data: JobBoardScrapeRuntimeJob,
  _jobId: string,
  signal?: AbortSignal
): Promise<void> => {
  const snapshot = await readFilemakerJobBoardScrapeRun(data.runId);
  const initialRun = snapshot.run;
  if (initialRun === null || isTerminalStatus(initialRun.status)) return;
  const runController = new AbortController();
  activeRunControllers.set(data.runId, runController);
  const unbindQueueSignal = bindQueueAbortSignal(signal, runController);
  const stopCancellationWatcher = startRuntimeCancellationWatcher(data.runId, runController);
  const run = await updateRun(initialRun, {
    startedAt: initialRun.startedAt ?? nowIso(),
    status: 'running',
  });
  try {
    const result = await runScraperInRuntime(data, runController.signal);
    await completeRuntimeRun(data.fingerprint, data.runId, run, result);
  } catch (error) {
    await handleRuntimeJobError(data.fingerprint, data.runId, run, error);
  } finally {
    stopCancellationWatcher();
    unbindQueueSignal();
    activeRunControllers.delete(data.runId);
  }
};

export const filemakerJobBoardScrapeQueue = createManagedQueue<JobBoardScrapeRuntimeJob>({
  name: QUEUE_NAME,
  concurrency: 1,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: false,
  },
  jobTimeoutMs: 15 * 60 * 1000,
  processor: processRuntimeJob,
});

export const startFilemakerJobBoardScrapeQueue = (): void => {
  filemakerJobBoardScrapeQueue.startWorker();
};

const startDetachedMemoryRuntimeJob = (data: JobBoardScrapeRuntimeJob): void => {
  setTimeout(() => {
    void filemakerJobBoardScrapeQueue.processInline(data).catch((error: unknown) => {
      void ErrorSystem.captureException(error, {
        action: 'memory-runtime-job',
        jobId: data.runId,
        service: 'filemaker-job-board-scrape-runtime',
      });
    });
  }, 0);
};

const checkExistingRun = async (
  fingerprint: string,
  runId: string
): Promise<FilemakerJobBoardScrapeRuntimeRun | null> => {
  const activeRun = await readActiveRunByFingerprint(fingerprint);
  if (activeRun !== null) return activeRun;
  return await claimActiveRunFingerprint(fingerprint, runId);
};

export const enqueueFilemakerJobBoardScrapeRun = async (
  rawInput: unknown
): Promise<FilemakerJobBoardScrapeRuntimeStartResponse> => {
  const request = parseRuntimeRequest(rawInput);
  const fingerprint = buildRequestFingerprint(request);
  const runId = `${FILEMAKER_JOB_BOARD_SCRAPE_ENDPOINT.replace(/[^a-z0-9]+/gi, '-')}-${randomUUID()}`;
  
  const existingRun = await checkExistingRun(fingerprint, runId);
  if (existingRun !== null) return { run: existingRun };

  const run = await recordRun(buildQueuedRun(runId, request));
  await appendRunEvent(run.id, {
    at: nowIso(),
    message: 'Queued job-board scrape runtime run.',
    type: 'status',
  });
  if (getRedisClient() === null) {
    startDetachedMemoryRuntimeJob({ fingerprint, request, runId: run.id });
    return { run };
  }
  startFilemakerJobBoardScrapeQueue();
  await filemakerJobBoardScrapeQueue.enqueue(
    { fingerprint, request, runId: run.id },
    { jobId: run.id }
  );
  const latest = await readFilemakerJobBoardScrapeRun(run.id);
  return { run: latest.run ?? run };
};
