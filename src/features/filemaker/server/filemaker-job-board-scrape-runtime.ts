/* eslint-disable max-lines */
/**
 * Filemaker job-board scrape runtime: queue + run-state store + live-event pubsub.
 *
 * Storage backends:
 *   - Production: Redis (via `getRedisClient()` and `publishRunEvent()`).
 *     Run snapshots live under `filemaker:job-board-scrape:run:<runId>`,
 *     event logs under `…:run:<runId>:events`, fingerprint→runId index under
 *     `filemaker:job-board-scrape:active:<fingerprint>`. TTL: 7 days.
 *   - Local/dev: in-memory `Map`s (`memoryRuns`, `memoryActiveRunIdsByFingerprint`,
 *     `memoryRunFingerprintsByRunId`, `memoryLatestRunId`). The runtime falls
 *     back automatically when `getRedisClient()` returns null. State is lost
 *     on process restart.
 *
 * Queue: `createManagedQueue('filemaker-job-board-scrape')` — single-consumer.
 * Each enqueue claims an active-run slot keyed by fingerprint
 * (`createHash('sha256')` of normalized request) to prevent duplicate runs.
 *
 * Live events:
 *   - Producer: `runFilemakerJobBoardScrape` calls back through
 *     `FilemakerJobBoardScrapeLiveEventEmitter` → events appended to Redis
 *     list (capped at EVENT_LIMIT=500) and published to `…:run:<runId>:stream`.
 *   - Consumer: HTTP handler subscribes via `subscribeToRunEvents` and streams
 *     NDJSON to the client.
 *
 * Lifecycle: enqueue → 'queued' → 'running' → terminal ('completed'|'failed'|'canceled').
 * Cancellation is signaled by setting status='canceled'; the in-process
 * `activeRunControllers` AbortController fires; the worker polls every
 * CANCEL_POLL_INTERVAL_MS=1s for cross-process cancellation requests.
 *
 * Required env (production): REDIS_URL (or whatever `getRedisClient()` reads).
 * Without Redis the runtime works but is single-process only.
 */
import 'server-only';

import { createHash, randomUUID } from 'crypto';

import {
  FILEMAKER_JOB_BOARD_SCRAPE_ENDPOINT,
  filemakerJobBoardScrapeDraftSaveRequestSchema,
  filemakerJobBoardScrapeRequestSchema,
  type FilemakerJobBoardScrapeDraftSaveRequest,
  type FilemakerJobBoardScrapeLiveEvent,
  type FilemakerJobBoardScrapeRequest,
  type FilemakerJobBoardScrapeResponse,
  type FilemakerJobBoardScrapeRuntimeRun,
  type FilemakerJobBoardScrapeRuntimeSnapshot,
  type FilemakerJobBoardScrapeRuntimeStartResponse,
  type FilemakerJobBoardScrapeRuntimeStatus,
} from '@/features/filemaker/filemaker-job-board-scrape-contracts';
import { createManagedQueue } from '@/shared/lib/queue';
import { getRedisClient } from '@/shared/lib/redis';
import { publishRunEvent } from '@/shared/lib/redis-pubsub';
import { badRequestError, conflictError, notFoundError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  runFilemakerJobBoardScrape,
  saveFilemakerJobBoardScrapeDrafts,
} from './filemaker-job-board-scrape';

type JobBoardScrapeRuntimeRequest =
  | FilemakerJobBoardScrapeDraftSaveRequest
  | FilemakerJobBoardScrapeRequest;

type JobBoardScrapeRuntimeJob = {
  fingerprint: string;
  request: JobBoardScrapeRuntimeRequest;
  runId: string;
};
type RedisClient = NonNullable<ReturnType<typeof getRedisClient>>;

const QUEUE_NAME = 'filemaker-job-board-scrape';
const RUN_KEY_PREFIX = 'filemaker:job-board-scrape:run';
const ACTIVE_RUN_KEY_PREFIX = 'filemaker:job-board-scrape:active';
const RUN_FINGERPRINT_KEY_PREFIX = 'filemaker:job-board-scrape:run-fingerprint';
const LATEST_RUN_KEY = 'filemaker:job-board-scrape:latest-run';
const RUN_TTL_SECONDS = 60 * 60 * 24 * 7;
const EVENT_LIMIT = 500;
const CANCEL_POLL_INTERVAL_MS = 1_000;
const ACTIVE_RUN_CLAIM_WAIT_MS = 50;
const ACTIVE_RUN_CLAIM_WAIT_ATTEMPTS = 10;
const TERMINAL_STATUSES = new Set<FilemakerJobBoardScrapeRuntimeStatus>([
  'canceled',
  'completed',
  'failed',
]);

const memoryRuns = new Map<string, FilemakerJobBoardScrapeRuntimeSnapshot>();
const memoryActiveRunIdsByFingerprint = new Map<string, string>();
const memoryRunFingerprintsByRunId = new Map<string, string>();
let memoryLatestRunId: string | null = null;
const activeRunControllers = new Map<string, AbortController>();

const runKey = (runId: string): string => `${RUN_KEY_PREFIX}:${runId}`;
const activeRunKey = (fingerprint: string): string => `${ACTIVE_RUN_KEY_PREFIX}:${fingerprint}`;
const eventsKey = (runId: string): string => `${runKey(runId)}:events`;
const runFingerprintKey = (runId: string): string => `${RUN_FINGERPRINT_KEY_PREFIX}:${runId}`;
const channelKey = (runId: string): string => `${runKey(runId)}:stream`;

const nowIso = (): string => new Date().toISOString();

const isTerminalStatus = (status: FilemakerJobBoardScrapeRuntimeStatus): boolean =>
  TERMINAL_STATUSES.has(status);

const createAbortError = (): Error => {
  const error = new Error('Job-board scrape stopped.');
  error.name = 'AbortError';
  return error;
};

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && (error.name === 'AbortError' || error.message.includes('stopped'));

const isDraftSaveRequest = (
  request: JobBoardScrapeRuntimeRequest
): request is FilemakerJobBoardScrapeDraftSaveRequest => 'action' in request;

const requestMode = (
  request: JobBoardScrapeRuntimeRequest
): FilemakerJobBoardScrapeRequest['mode'] => (isDraftSaveRequest(request) ? 'import' : request.mode);

const buildRequestFingerprint = (request: JobBoardScrapeRuntimeRequest): string => {
  const payload = {
    ...request,
    selectedOrganizationIds: [...request.selectedOrganizationIds].sort(),
    sourceUrl: request.sourceUrl.trim().toLowerCase(),
  };
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
};

const cloneSnapshot = (
  snapshot: FilemakerJobBoardScrapeRuntimeSnapshot
): FilemakerJobBoardScrapeRuntimeSnapshot => ({
  events: [...snapshot.events],
  run: snapshot.run === null ? null : { ...snapshot.run },
});

const parseRun = (value: string | null): FilemakerJobBoardScrapeRuntimeRun | null => {
  if (value === null) return null;
  try {
    return JSON.parse(value) as FilemakerJobBoardScrapeRuntimeRun;
  } catch {
    return null;
  }
};

const parseEvents = (values: string[]): FilemakerJobBoardScrapeLiveEvent[] =>
  values.flatMap((value): FilemakerJobBoardScrapeLiveEvent[] => {
    try {
      return [JSON.parse(value) as FilemakerJobBoardScrapeLiveEvent];
    } catch {
      return [];
    }
  });

const storeRun = async (run: FilemakerJobBoardScrapeRuntimeRun): Promise<void> => {
  const redis = getRedisClient();
  if (redis === null) {
    const current = memoryRuns.get(run.id) ?? { events: [], run: null };
    memoryRuns.set(run.id, { ...current, run: { ...run } });
    memoryLatestRunId = run.id;
    return;
  }
  await redis.set(runKey(run.id), JSON.stringify(run), 'EX', RUN_TTL_SECONDS);
  await redis.set(LATEST_RUN_KEY, run.id, 'EX', RUN_TTL_SECONDS);
};

const appendRunEvent = async (
  runId: string,
  event: FilemakerJobBoardScrapeLiveEvent
): Promise<void> => {
  const redis = getRedisClient();
  if (redis === null) {
    const current = memoryRuns.get(runId) ?? { events: [], run: null };
    memoryRuns.set(runId, {
      ...current,
      events: [...current.events, event].slice(-EVENT_LIMIT),
    });
    return;
  }
  const key = eventsKey(runId);
  await redis.rpush(key, JSON.stringify(event));
  await redis.ltrim(key, -EVENT_LIMIT, -1);
  await redis.expire(key, RUN_TTL_SECONDS);
  publishRunEvent(channelKey(runId), { data: event, type: 'event' });
};

const recordRun = async (
  run: FilemakerJobBoardScrapeRuntimeRun
): Promise<FilemakerJobBoardScrapeRuntimeRun> => {
  await storeRun(run);
  await appendRunEvent(run.id, {
    at: nowIso(),
    run,
    type: 'run',
  });
  return run;
};

const updateRun = async (
  run: FilemakerJobBoardScrapeRuntimeRun,
  patch: Partial<FilemakerJobBoardScrapeRuntimeRun>
): Promise<FilemakerJobBoardScrapeRuntimeRun> =>
  recordRun({
    ...run,
    ...patch,
    updatedAt: nowIso(),
  });

const sleep = async (delayMs: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
};

const rememberMemoryActiveRunFingerprint = (fingerprint: string, runId: string): void => {
  memoryActiveRunIdsByFingerprint.set(fingerprint, runId);
  memoryRunFingerprintsByRunId.set(runId, fingerprint);
};

const readRunFingerprint = async (runId: string): Promise<string | null> => {
  const memoryFingerprint = memoryRunFingerprintsByRunId.get(runId) ?? null;
  if (memoryFingerprint !== null) return memoryFingerprint;
  const redis = getRedisClient();
  return redis === null ? null : redis.get(runFingerprintKey(runId));
};

const readActiveRunById = async (
  fingerprint: string,
  runId: string
): Promise<FilemakerJobBoardScrapeRuntimeRun | null> => {
  const snapshot = await readFilemakerJobBoardScrapeRun(runId);
  if (snapshot.run !== null && !isTerminalStatus(snapshot.run.status)) {
    return snapshot.run;
  }
  if (snapshot.run !== null) {
    await clearActiveRunFingerprint(fingerprint, runId);
  }
  return null;
};

const clearActiveRunFingerprint = async (
  fingerprint: string | null,
  runId: string
): Promise<void> => {
  if (fingerprint === null) return;
  if (memoryActiveRunIdsByFingerprint.get(fingerprint) === runId) {
    memoryActiveRunIdsByFingerprint.delete(fingerprint);
  }
  memoryRunFingerprintsByRunId.delete(runId);
  const redis = getRedisClient();
  if (redis === null) return;
  const activeRunId = await redis.get(activeRunKey(fingerprint));
  if (activeRunId === runId) {
    await redis.del(activeRunKey(fingerprint));
  }
  await redis.del(runFingerprintKey(runId));
};

const readActiveRunByFingerprint = async (
  fingerprint: string
): Promise<FilemakerJobBoardScrapeRuntimeRun | null> => {
  const redis = getRedisClient();
  const runId =
    redis === null
      ? (memoryActiveRunIdsByFingerprint.get(fingerprint) ?? null)
      : await redis.get(activeRunKey(fingerprint));
  if (runId === null) return null;
  return readActiveRunById(fingerprint, runId);
};

const waitForClaimedActiveRun = async (
  fingerprint: string,
  remainingAttempts = ACTIVE_RUN_CLAIM_WAIT_ATTEMPTS
): Promise<FilemakerJobBoardScrapeRuntimeRun | null> => {
  if (remainingAttempts <= 0) return null;
  const activeRun = await readActiveRunByFingerprint(fingerprint);
  if (activeRun !== null) return activeRun;
  await sleep(ACTIVE_RUN_CLAIM_WAIT_MS);
  return waitForClaimedActiveRun(fingerprint, remainingAttempts - 1);
};

const claimMemoryActiveRunFingerprint = async (
  fingerprint: string,
  runId: string
): Promise<FilemakerJobBoardScrapeRuntimeRun | null> => {
  const activeRunId = memoryActiveRunIdsByFingerprint.get(fingerprint) ?? null;
  if (activeRunId !== null) {
    return waitForClaimedActiveRun(fingerprint);
  }
  rememberMemoryActiveRunFingerprint(fingerprint, runId);
  return null;
};

const rememberRedisRunFingerprint = async (
  redis: RedisClient,
  fingerprint: string,
  runId: string
): Promise<void> => {
  await redis.set(runFingerprintKey(runId), fingerprint, 'EX', RUN_TTL_SECONDS);
};

const tryClaimRedisActiveRunFingerprint = async (
  redis: RedisClient,
  fingerprint: string,
  runId: string
): Promise<boolean> => {
  const claimed = await redis.set(activeRunKey(fingerprint), runId, 'EX', RUN_TTL_SECONDS, 'NX');
  if (claimed !== 'OK') return false;
  await rememberRedisRunFingerprint(redis, fingerprint, runId);
  return true;
};

const retryClaimRedisActiveRunFingerprint = async (
  redis: RedisClient,
  fingerprint: string,
  runId: string
): Promise<boolean> => {
  const staleRunId = await redis.get(activeRunKey(fingerprint));
  if (staleRunId !== null) {
    await clearActiveRunFingerprint(fingerprint, staleRunId);
  }
  return tryClaimRedisActiveRunFingerprint(redis, fingerprint, runId);
};

const claimRedisActiveRunFingerprint = async (
  redis: RedisClient,
  fingerprint: string,
  runId: string
): Promise<FilemakerJobBoardScrapeRuntimeRun | null> => {
  if (await tryClaimRedisActiveRunFingerprint(redis, fingerprint, runId)) return null;
  const activeRun = await waitForClaimedActiveRun(fingerprint);
  if (activeRun !== null) return activeRun;
  if (await retryClaimRedisActiveRunFingerprint(redis, fingerprint, runId)) return null;
  const finalActiveRun = await waitForClaimedActiveRun(fingerprint);
  if (finalActiveRun !== null) return finalActiveRun;
  throw conflictError('A matching job-board scrape is already being prepared.', {
    fingerprint,
  });
};

const claimActiveRunFingerprint = async (
  fingerprint: string,
  runId: string
): Promise<FilemakerJobBoardScrapeRuntimeRun | null> => {
  const redis = getRedisClient();
  return redis === null
    ? claimMemoryActiveRunFingerprint(fingerprint, runId)
    : claimRedisActiveRunFingerprint(redis, fingerprint, runId);
};

export const readFilemakerJobBoardScrapeRun = async (
  runId: string
): Promise<FilemakerJobBoardScrapeRuntimeSnapshot> => {
  const normalizedRunId = runId.trim();
  if (normalizedRunId.length === 0) return { events: [], run: null };
  const redis = getRedisClient();
  if (redis === null) {
    return cloneSnapshot(memoryRuns.get(normalizedRunId) ?? { events: [], run: null });
  }
  const [rawRun, rawEvents] = await Promise.all([
    redis.get(runKey(normalizedRunId)),
    redis.lrange(eventsKey(normalizedRunId), 0, -1),
  ]);
  return {
    events: parseEvents(rawEvents),
    run: parseRun(rawRun),
  };
};

export const readLatestFilemakerJobBoardScrapeRun =
  async (): Promise<FilemakerJobBoardScrapeRuntimeSnapshot> => {
    const redis = getRedisClient();
    const latestRunId =
      redis === null ? memoryLatestRunId : await redis.get(LATEST_RUN_KEY);
    if (latestRunId === null || latestRunId.trim().length === 0) {
      return { events: [], run: null };
    }
    return readFilemakerJobBoardScrapeRun(latestRunId);
  };

const buildQueuedRun = (
  runId: string,
  request: JobBoardScrapeRuntimeRequest
): FilemakerJobBoardScrapeRuntimeRun => {
  const timestamp = nowIso();
  return {
    completedAt: null,
    createdAt: timestamp,
    error: null,
    id: runId,
    mode: requestMode(request),
    result: null,
    sourceUrl: request.sourceUrl,
    startedAt: null,
    status: 'queued',
    updatedAt: timestamp,
  };
};

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
  const interval = setInterval(() => {
    void checkCancellation();
  }, CANCEL_POLL_INTERVAL_MS);
  void checkCancellation();
  return () => {
    stopped = true;
    clearInterval(interval);
  };
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
  await appendRunEvent(runId, {
    at: nowIso(),
    message,
    type: 'error',
  });
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

export const enqueueFilemakerJobBoardScrapeRun = async (
  rawInput: unknown
): Promise<FilemakerJobBoardScrapeRuntimeStartResponse> => {
  const request = parseRuntimeRequest(rawInput);
  if (request.organizationScope === 'selected' && request.selectedOrganizationIds.length === 0) {
    throw badRequestError('Select at least one organisation or use all organisations.');
  }
  const fingerprint = buildRequestFingerprint(request);
  const activeRun = await readActiveRunByFingerprint(fingerprint);
  if (activeRun !== null) {
    return { run: activeRun };
  }
  const runId = `${FILEMAKER_JOB_BOARD_SCRAPE_ENDPOINT.replace(/[^a-z0-9]+/gi, '-')}-${randomUUID()}`;
  const claimedActiveRun = await claimActiveRunFingerprint(fingerprint, runId);
  if (claimedActiveRun !== null) {
    return { run: claimedActiveRun };
  }
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

export const cancelFilemakerJobBoardScrapeRun = async (
  runId: string
): Promise<FilemakerJobBoardScrapeRuntimeSnapshot> => {
  const snapshot = await readFilemakerJobBoardScrapeRun(runId);
  const run = snapshot.run;
  if (run === null) {
    throw notFoundError('Job-board scrape run not found.', { runId });
  }
  if (isTerminalStatus(run.status)) {
    return snapshot;
  }
  activeRunControllers.get(run.id)?.abort(createAbortError());
  const fingerprint = await readRunFingerprint(run.id);
  const canceledRun = await updateRun(run, {
    completedAt: nowIso(),
    error: 'Job-board scrape stopped.',
    status: 'canceled',
  });
  await clearActiveRunFingerprint(fingerprint, run.id);
  const stoppedEvent: FilemakerJobBoardScrapeLiveEvent = {
    at: nowIso(),
    message: 'Job-board scrape stopped.',
    type: 'error',
  };
  await appendRunEvent(run.id, stoppedEvent);
  return {
    events: [...snapshot.events, stoppedEvent],
    run: canceledRun,
  };
};
