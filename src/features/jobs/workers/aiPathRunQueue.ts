import "server-only";

import type { AiPathRunRecord } from "@/shared/types/ai-paths";
import { executePathRun } from "@/features/ai/ai-paths/services/path-run-executor";
import { getPathRunRepository } from "@/features/ai/ai-paths/services/path-run-repository";
import { ErrorSystem } from "@/features/observability/services/error-system";

let intervalId: NodeJS.Timeout | null = null;
let pollTimerId: NodeJS.Timeout | null = null;
let activeRuns = 0;
let lastPollTime = 0;
let pollInFlight = false;
let idleStreak = 0;
let completedRuns: number[] = [];
let runtimeSamples: Array<{ ts: number; ms: number }> = [];
let lastMetricsLogAt = 0;

const MAX_IDLE_MS = 120_000;
const THROUGHPUT_WINDOW_MS = 60_000;
const MAX_SAMPLE_SIZE = 200;
const METRICS_LOG_INTERVAL_MS = 60_000;
const POLL_INTERVAL_MS = 1000;
const IDLE_INTERVAL_MS = 5000;
const DEFAULT_CONCURRENCY = Number(process.env.AI_PATHS_RUN_CONCURRENCY ?? "1");
const DEFAULT_MAX_ATTEMPTS = Number(process.env.AI_PATHS_RUN_MAX_ATTEMPTS ?? "3");
const DEFAULT_BACKOFF_MS = Number(process.env.AI_PATHS_RUN_BACKOFF_MS ?? "5000");
const DEFAULT_BACKOFF_MAX_MS = Number(process.env.AI_PATHS_RUN_BACKOFF_MAX_MS ?? "60000");

const isQueueHealthy = (): boolean => {
  if (!intervalId) return false;
  return Date.now() - lastPollTime < MAX_IDLE_MS;
};

const normalizeNumber = (value: number, fallback: number, min: number = 0): number => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, value);
};

export const computeBackoffMs = (retryCount: number, meta?: Record<string, unknown>): number => {
  const base =
    typeof meta?.backoffMs === "number" ? meta.backoffMs : DEFAULT_BACKOFF_MS;
  const max =
    typeof meta?.backoffMaxMs === "number"
      ? meta.backoffMaxMs
      : DEFAULT_BACKOFF_MAX_MS;
  const exponent = Math.max(0, retryCount);
  const raw = normalizeNumber(base * Math.pow(2, exponent), DEFAULT_BACKOFF_MS, 0);
  const capped = Math.min(raw, normalizeNumber(max, DEFAULT_BACKOFF_MAX_MS, 0));
  const jitter = Math.min(1000, Math.round(capped * 0.1));
  const withJitter = capped + (jitter > 0 ? Math.floor(Math.random() * jitter) : 0);
  return Math.max(0, withJitter);
};

export const processRun = async (run: AiPathRunRecord): Promise<void> => {
  console.log(`[aiPathRunQueue] Processing run ${run.id}`);
  const startedAt = Date.now();
  try {
    await executePathRun(run);
    console.log(`[aiPathRunQueue] Run ${run.id} completed`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Run failed.";
    await ErrorSystem.captureException(error, {
      service: "ai-paths-queue",
      pathRunId: run.id,
      pathId: run.pathId,
    });
    const maxAttempts =
      typeof run.maxAttempts === "number" && run.maxAttempts > 0
        ? run.maxAttempts
        : DEFAULT_MAX_ATTEMPTS;
    const retryCount = (run.retryCount ?? 0) + 1;
    if (retryCount < maxAttempts) {
      const delayMs = computeBackoffMs(retryCount - 1, run.meta ?? undefined);
      const nextRetryAt = new Date(Date.now() + delayMs);
      await (getPathRunRepository()).updateRun(run.id, {
        status: "queued",
        retryCount,
        nextRetryAt,
        errorMessage: message,
        startedAt: null,
        finishedAt: null,
      });
      await (getPathRunRepository()).createRunEvent({
        runId: run.id,
        level: "warning",
        message: `Run failed. Retrying in ${Math.round(delayMs / 1000)}s.`,
        metadata: { retryCount, nextRetryAt },
      });
    } else {
      await (getPathRunRepository()).updateRun(run.id, {
        status: "dead_lettered",
        retryCount,
        finishedAt: new Date(),
        deadLetteredAt: new Date(),
        errorMessage: message,
      });
      await (getPathRunRepository()).createRunEvent({
        runId: run.id,
        level: "error",
        message: "Run moved to dead-letter after max retries.",
        metadata: { retryCount, maxAttempts },
      });
    }
  } finally {
    const finishedAt = Date.now();
    completedRuns.push(finishedAt);
    if (completedRuns.length > MAX_SAMPLE_SIZE) {
      completedRuns = completedRuns.slice(-MAX_SAMPLE_SIZE);
    }
    const runtimeMs = Math.max(0, finishedAt - startedAt);
    runtimeSamples.push({ ts: finishedAt, ms: runtimeMs });
    if (runtimeSamples.length > MAX_SAMPLE_SIZE) {
      runtimeSamples = runtimeSamples.slice(-MAX_SAMPLE_SIZE);
    }
  }
};

const scheduleNextPoll = (delayMs: number): void => {
  if (pollTimerId) {
    clearTimeout(pollTimerId);
  }
  pollTimerId = setTimeout((): void => {
    void pollQueue();
  }, Math.max(0, delayMs));
};

const pollQueue = async (): Promise<void> => {
  if (pollInFlight) return;
  pollInFlight = true;
  lastPollTime = Date.now();
  const concurrency = normalizeNumber(DEFAULT_CONCURRENCY, 1, 1);
  let claimed = 0;
  try {
    if (activeRuns < concurrency) {
      const repo = getPathRunRepository();
      while (activeRuns < concurrency) {
        const run = await repo.claimNextQueuedRun();
        if (!run) break;
        claimed += 1;
        activeRuns += 1;
        void processRun(run).finally((): void => {
          activeRuns = Math.max(0, activeRuns - 1);
          scheduleNextPoll(0);
        });
      }
    }
  } finally {
    pollInFlight = false;
    if (Date.now() - lastMetricsLogAt >= METRICS_LOG_INTERVAL_MS) {
      lastMetricsLogAt = Date.now();
      void getAiPathRunQueueStatus()
        .then((status) =>
          ErrorSystem.logInfo("Queue metrics snapshot", {
            service: "ai-paths-queue",
            ...status,
          })
        )
        .catch((error) => {
          void ErrorSystem.logWarning("Failed to log queue metrics", {
            service: "ai-paths-queue",
            error,
          });
        });
    }
    if (claimed > 0 || activeRuns > 0) {
      idleStreak = 0;
      scheduleNextPoll(POLL_INTERVAL_MS);
    } else {
      idleStreak = Math.min(idleStreak + 1, 5);
      const delay = Math.min(IDLE_INTERVAL_MS * idleStreak, 10_000);
      scheduleNextPoll(delay || POLL_INTERVAL_MS);
    }
  }
};

export const startAiPathRunQueue = (): void => {
  if (intervalId && isQueueHealthy()) {
    console.log("[aiPathRunQueue] Queue worker already running");
    return;
  }
  if (intervalId) clearInterval(intervalId);
  if (pollTimerId) clearTimeout(pollTimerId);
  intervalId = setInterval((): void => {
    // lightweight health heartbeat
    lastPollTime = Date.now();
  }, 30_000);
  lastPollTime = Date.now();
  idleStreak = 0;
  pollInFlight = false;
  console.log("[aiPathRunQueue] Queue worker started");
  scheduleNextPoll(0);
};

export const getAiPathRunQueueStatus = async (): Promise<{
  running: boolean;
  healthy: boolean;
  processing: boolean;
  activeRuns: number;
  concurrency: number;
  lastPollTime: number;
  timeSinceLastPoll: number;
  queuedCount: number;
  oldestQueuedAt: number | null;
  queueLagMs: number | null;
  completedLastMinute: number;
  throughputPerMinute: number;
  avgRuntimeMs: number | null;
  p50RuntimeMs: number | null;
  p95RuntimeMs: number | null;
}> => {
  const now = Date.now();
  const windowStart = now - THROUGHPUT_WINDOW_MS;
  const recentCompletions = completedRuns.filter((ts: number) => ts >= windowStart);
  const runtimeWindow = runtimeSamples.filter((sample) => sample.ts >= windowStart);
  const runtimeValues = runtimeWindow.map((sample) => sample.ms);
  const averageRuntime =
    runtimeValues.length > 0
      ? Math.round(runtimeValues.reduce((sum, value) => sum + value, 0) / runtimeValues.length)
      : null;
  const sortedRuntimes = runtimeValues.length > 0 ? [...runtimeValues].sort((a, b) => a - b) : [];
  const pickPercentile = (values: number[], percentile: number): number | null => {
    if (!values.length) return null;
    const rank = Math.ceil((percentile / 100) * values.length) - 1;
    const idx = Math.min(values.length - 1, Math.max(0, rank));
    return values[idx] ?? null;
  };
  const repo = getPathRunRepository();
  const stats = await repo.getQueueStats();
  const oldestQueuedAt = stats.oldestQueuedAt ? stats.oldestQueuedAt.getTime() : null;
  const queueLagMs =
    oldestQueuedAt !== null ? Math.max(0, now - oldestQueuedAt) : null;
  return {
    running: !!intervalId,
    healthy: isQueueHealthy(),
    processing: activeRuns > 0,
    activeRuns,
    concurrency: normalizeNumber(DEFAULT_CONCURRENCY, 1, 1),
    lastPollTime,
    timeSinceLastPoll: now - lastPollTime,
    queuedCount: stats.queuedCount,
    oldestQueuedAt,
    queueLagMs,
    completedLastMinute: recentCompletions.length,
    throughputPerMinute: recentCompletions.length,
    avgRuntimeMs: averageRuntime,
    p50RuntimeMs: pickPercentile(sortedRuntimes, 50),
    p95RuntimeMs: pickPercentile(sortedRuntimes, 95),
  };
};

export const processSingleRun = async (runId: string): Promise<void> => {
  const repo = getPathRunRepository();
  const run = await repo.findRunById(runId);
  if (!run) {
    throw new Error("Run not found");
  }
  if (run.status !== "queued") {
    return;
  }
  await repo.updateRun(run.id, {
    status: "running",
    startedAt: new Date(),
  });
  await executePathRun({ ...run, status: "running" });
};
