import "server-only";

import type { AiPathRunRecord } from "@/shared/types/ai-paths";
import { executePathRun } from "@/features/ai-paths/services/path-run-executor";
import { getPathRunRepository } from "@/features/ai-paths/services/path-run-repository";
import { ErrorSystem } from "@/features/observability/services/error-system";

let intervalId: NodeJS.Timeout | null = null;
let activeRuns = 0;
let lastPollTime = 0;

const MAX_IDLE_MS = 120_000;
const DEFAULT_CONCURRENCY = Number(process.env.AI_PATHS_RUN_CONCURRENCY ?? "1");
const DEFAULT_MAX_ATTEMPTS = Number(process.env.AI_PATHS_RUN_MAX_ATTEMPTS ?? "3");
const DEFAULT_BACKOFF_MS = Number(process.env.AI_PATHS_RUN_BACKOFF_MS ?? "5000");
const DEFAULT_BACKOFF_MAX_MS = Number(process.env.AI_PATHS_RUN_BACKOFF_MAX_MS ?? "60000");

const isQueueHealthy = () => {
  if (!intervalId) return false;
  return Date.now() - lastPollTime < MAX_IDLE_MS;
};

const normalizeNumber = (value: number, fallback: number, min = 0) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, value);
};

export const computeBackoffMs = (retryCount: number, meta?: Record<string, unknown>) => {
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

export const processRun = async (run: AiPathRunRecord) => {
  console.log(`[aiPathRunQueue] Processing run ${run.id}`);
  try {
    await executePathRun(run);
    console.log(`[aiPathRunQueue] Run ${run.id} completed`);
  } catch (error) {
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
      await (await getPathRunRepository()).updateRun(run.id, {
        status: "queued",
        retryCount,
        nextRetryAt,
        errorMessage: message,
        startedAt: null,
        finishedAt: null,
      });
      await (await getPathRunRepository()).createRunEvent({
        runId: run.id,
        level: "warning",
        message: `Run failed. Retrying in ${Math.round(delayMs / 1000)}s.`,
        metadata: { retryCount, nextRetryAt },
      });
    } else {
      await (await getPathRunRepository()).updateRun(run.id, {
        status: "dead_lettered",
        retryCount,
        finishedAt: new Date(),
        deadLetteredAt: new Date(),
        errorMessage: message,
      });
      await (await getPathRunRepository()).createRunEvent({
        runId: run.id,
        level: "error",
        message: "Run moved to dead-letter after max retries.",
        metadata: { retryCount, maxAttempts },
      });
    }
  }
};

const pollQueue = async () => {
  lastPollTime = Date.now();
  const concurrency = normalizeNumber(DEFAULT_CONCURRENCY, 1, 1);
  if (activeRuns >= concurrency) return;
  const repo = await getPathRunRepository();
  while (activeRuns < concurrency) {
    const run = await repo.claimNextQueuedRun();
    if (!run) break;
    activeRuns += 1;
    void processRun(run).finally(() => {
      activeRuns = Math.max(0, activeRuns - 1);
    });
  }
};

export const startAiPathRunQueue = () => {
  if (intervalId && isQueueHealthy()) {
    console.log("[aiPathRunQueue] Queue worker already running");
    return;
  }
  if (intervalId) {
    clearInterval(intervalId);
  }
  intervalId = setInterval(() => {
    void pollQueue();
  }, 1000);
  lastPollTime = Date.now();
  console.log("[aiPathRunQueue] Queue worker started");
  void pollQueue();
};

export const getAiPathRunQueueStatus = () => ({
  running: !!intervalId,
  healthy: isQueueHealthy(),
  processing: activeRuns > 0,
  activeRuns,
  concurrency: normalizeNumber(DEFAULT_CONCURRENCY, 1, 1),
  lastPollTime,
  timeSinceLastPoll: Date.now() - lastPollTime,
});

export const processSingleRun = async (runId: string) => {
  const repo = await getPathRunRepository();
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
