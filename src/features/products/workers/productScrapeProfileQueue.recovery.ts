import 'server-only';

import type {
  ProductScrapeProfileRuntimeRun,
  ProductScrapeProfileRunResponse,
} from '@/shared/contracts/products/scrape-profiles';
import type { ManagedQueue } from '@/shared/lib/queue';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  LOG_SERVICE,
  PRODUCT_SCRAPE_PROFILE_QUEUE_NAME,
  STALE_QUEUED_RUN_MS,
  STALE_QUEUE_JOB_STATES,
  STALE_RUNNING_RUN_MS,
  type ProductScrapeProfileQueueJobData,
} from './productScrapeProfileQueue.constants';
import {
  getRunLastActivityMs,
  isTerminalStatus,
  nowIso,
  readRun,
  updateRun,
} from './productScrapeProfileQueue.state';

type QueueJobRuntimeState = {
  failedReason: string | null;
  state: string;
};

type QueueWithJobLookup = {
  getJob: (jobId: string) => Promise<QueueJobLike | null>;
};

type QueueJobLike = {
  failedReason?: unknown;
  getState?: () => Promise<string>;
};

const shouldInspectQueueJob = (run: ProductScrapeProfileRuntimeRun): boolean =>
  run.status === 'queued' || run.status === 'running';

const startRuntimeWorkerForActiveRun = (
  queue: ManagedQueue<ProductScrapeProfileQueueJobData>
): void => {
  try {
    queue.startWorker();
  } catch (error) {
    void ErrorSystem.captureException(error, {
      action: 'start-runtime-worker-for-active-run',
      queue: PRODUCT_SCRAPE_PROFILE_QUEUE_NAME,
      service: LOG_SERVICE,
    });
  }
};

const getQueueWithJobLookup = (
  queue: ManagedQueue<ProductScrapeProfileQueueJobData>
): QueueWithJobLookup | null => {
  const maybeQueue = queue.getQueue();
  if (
    maybeQueue === null ||
    typeof maybeQueue !== 'object' ||
    typeof (maybeQueue as { getJob?: unknown }).getJob !== 'function'
  ) {
    return null;
  }
  return maybeQueue as QueueWithJobLookup;
};

const readQueueJobRuntimeState = async (
  runId: string,
  queue: ManagedQueue<ProductScrapeProfileQueueJobData>
): Promise<QueueJobRuntimeState | null> => {
  try {
    await queue.getHealthStatus();
    const jobQueue = getQueueWithJobLookup(queue);
    if (jobQueue === null) return null;
    const job = await jobQueue.getJob(runId);
    if (job === null) return { failedReason: null, state: 'missing' };
    const state = typeof job.getState === 'function' ? await job.getState() : 'unknown';
    return {
      failedReason: typeof job.failedReason === 'string' ? job.failedReason : null,
      state,
    };
  } catch (error) {
    void ErrorSystem.captureException(error, {
      action: 'read-queue-job-runtime-state',
      jobId: runId,
      queue: PRODUCT_SCRAPE_PROFILE_QUEUE_NAME,
      service: LOG_SERVICE,
    });
    return null;
  }
};

const resolveTerminalQueueJobMessage = (
  queueJobState: QueueJobRuntimeState | null
): string | null => {
  if (queueJobState?.state === 'failed') {
    return queueJobState.failedReason ?? 'Scrape profile Redis job failed before the run state was updated.';
  }
  if (queueJobState?.state === 'completed') {
    return 'Scrape profile Redis job completed before the run state was updated.';
  }
  return null;
};

const resolveImmediateRunRecoveryMessage = (
  run: ProductScrapeProfileRuntimeRun,
  queueJobState: QueueJobRuntimeState | null
): string | null => {
  const terminalMessage = resolveTerminalQueueJobMessage(queueJobState);
  if (terminalMessage !== null) return terminalMessage;
  if (run.status === 'running' && queueJobState?.state === 'missing') {
    return 'Scrape profile Redis job disappeared while the run was marked running.';
  }
  return null;
};

const resolveQueuedStaleRunMessage = (
  queueJobState: QueueJobRuntimeState | null
): string | null => {
  const state = queueJobState?.state ?? 'unknown';
  if (!STALE_QUEUE_JOB_STATES.has(state)) return null;
  return 'Scrape profile run was marked failed after being queued for over 2 minutes without Redis worker pickup.';
};

const resolveRunningStaleRunMessage = (
  queueJobState: QueueJobRuntimeState | null
): string | null =>
  queueJobState?.state === 'active'
    ? 'Scrape profile run was marked failed after exceeding 20 minutes while the Redis job was still active.'
    : 'Scrape profile run was marked failed after exceeding 20 minutes without Redis worker progress.';

const resolveStaleRunMessage = (
  run: ProductScrapeProfileRuntimeRun,
  queueJobState: QueueJobRuntimeState | null
): string | null =>
  resolveTerminalQueueJobMessage(queueJobState) ??
  (run.status === 'queued'
    ? resolveQueuedStaleRunMessage(queueJobState)
    : resolveRunningStaleRunMessage(queueJobState));

const failRecoveredRuntimeRun = async (
  run: ProductScrapeProfileRuntimeRun,
  error: string,
  queueJobState: QueueJobRuntimeState | null
): Promise<ProductScrapeProfileRuntimeRun> => {
  const recovered = await updateRun(run.id, {
    completedAt: nowIso(),
    error,
    status: 'failed',
  });
  await ErrorSystem.logWarning('Recovered stale scrape profile runtime run', {
    error,
    jobId: run.id,
    profileId: run.profileId,
    queue: PRODUCT_SCRAPE_PROFILE_QUEUE_NAME,
    queueJobState: queueJobState?.state ?? null,
    service: LOG_SERVICE,
    status: run.status,
  });
  return recovered;
};

export const reconcileRuntimeRun = async (
  run: ProductScrapeProfileRuntimeRun,
  queue: ManagedQueue<ProductScrapeProfileQueueJobData>
): Promise<ProductScrapeProfileRuntimeRun> => {
  if (!shouldInspectQueueJob(run)) return run;
  startRuntimeWorkerForActiveRun(queue);
  const queueJobState = await readQueueJobRuntimeState(run.id, queue);
  const immediateMessage = resolveImmediateRunRecoveryMessage(run, queueJobState);
  if (immediateMessage !== null) {
    return await failRecoveredRuntimeRun(run, immediateMessage, queueJobState);
  }
  const lastActivityMs = getRunLastActivityMs(run);
  if (lastActivityMs === null) return run;
  const ageMs = Math.max(0, Date.now() - lastActivityMs);
  const staleAfterMs = run.status === 'queued' ? STALE_QUEUED_RUN_MS : STALE_RUNNING_RUN_MS;
  if (ageMs < staleAfterMs) return run;
  const staleMessage = resolveStaleRunMessage(run, queueJobState);
  return staleMessage === null
    ? run
    : await failRecoveredRuntimeRun(run, staleMessage, queueJobState);
};

export const resolveRunResultBeforeProcessing = async (
  runId: string,
  queue: ManagedQueue<ProductScrapeProfileQueueJobData>
): Promise<ProductScrapeProfileRunResponse | null> => {
  const existing = await readRun(runId);
  if (existing === null) return null;
  const reconciled = await reconcileRuntimeRun(existing, queue);
  if (reconciled.status === 'completed' && reconciled.result !== null) {
    return reconciled.result;
  }
  if (isTerminalStatus(reconciled.status)) {
    throw new Error(`Scrape profile run ${runId} is already ${reconciled.status}.`);
  }
  return null;
};
