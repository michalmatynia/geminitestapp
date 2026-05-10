import 'server-only';

import {
  type FilemakerJobBoardScrapeLiveEvent,
  type FilemakerJobBoardScrapeRuntimeRun,
  type FilemakerJobBoardScrapeRuntimeSnapshot,
} from '@/features/filemaker/filemaker-job-board-scrape-contracts';
import { conflictError } from '@/shared/errors/app-error';
import { getRedisClient } from '@/shared/lib/redis';
import { publishRunEvent } from '@/shared/lib/redis-pubsub';

import {
  ACTIVE_RUN_CLAIM_WAIT_ATTEMPTS,
  ACTIVE_RUN_CLAIM_WAIT_MS,
  EVENT_LIMIT,
  LATEST_RUN_KEY,
  MEMORY_RUN_LIMIT,
  RUN_TTL_SECONDS,
  activeRunKey,
  channelKey,
  eventsKey,
  isTerminalStatus,
  nowIso,
  runFingerprintKey,
  runKey,
  sleep,
} from './filemaker-job-board-scrape-runtime.common';

type RedisClient = NonNullable<ReturnType<typeof getRedisClient>>;

const memoryRuns = new Map<string, FilemakerJobBoardScrapeRuntimeSnapshot>();
const memoryActiveRunIdsByFingerprint = new Map<string, string>();
const memoryRunFingerprintsByRunId = new Map<string, string>();
let memoryLatestRunId: string | null = null;

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

const evictTerminalMemoryRuns = (): void => {
  if (memoryRuns.size <= MEMORY_RUN_LIMIT) return;
  for (const [id, snapshot] of memoryRuns) {
    if (memoryRuns.size <= MEMORY_RUN_LIMIT) break;
    if (id === memoryLatestRunId) continue;
    if (snapshot.run !== null && !isTerminalStatus(snapshot.run.status)) continue;
    memoryRuns.delete(id);
    memoryRunFingerprintsByRunId.delete(id);
  }
};

const storeRun = async (run: FilemakerJobBoardScrapeRuntimeRun): Promise<void> => {
  const redis = getRedisClient();
  if (redis === null) {
    const current = memoryRuns.get(run.id) ?? { events: [], run: null };
    memoryRuns.delete(run.id);
    memoryRuns.set(run.id, { ...current, run: { ...run } });
    memoryLatestRunId = run.id;
    evictTerminalMemoryRuns();
    return;
  }
  await redis.set(runKey(run.id), JSON.stringify(run), 'EX', RUN_TTL_SECONDS);
  await redis.set(LATEST_RUN_KEY, run.id, 'EX', RUN_TTL_SECONDS);
};

export const appendRunEvent = async (
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

export const recordRun = async (
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

export const updateRun = async (
  run: FilemakerJobBoardScrapeRuntimeRun,
  patch: Partial<FilemakerJobBoardScrapeRuntimeRun>
): Promise<FilemakerJobBoardScrapeRuntimeRun> =>
  recordRun({
    ...run,
    ...patch,
    updatedAt: nowIso(),
  });

const rememberMemoryActiveRunFingerprint = (fingerprint: string, runId: string): void => {
  memoryActiveRunIdsByFingerprint.set(fingerprint, runId);
  memoryRunFingerprintsByRunId.set(runId, fingerprint);
};

export const readRunFingerprint = async (runId: string): Promise<string | null> => {
  const memoryFingerprint = memoryRunFingerprintsByRunId.get(runId) ?? null;
  if (memoryFingerprint !== null) return memoryFingerprint;
  const redis = getRedisClient();
  return redis === null ? null : redis.get(runFingerprintKey(runId));
};

const clearRedisActiveRunFingerprint = async (
  redis: RedisClient,
  fingerprint: string,
  runId: string
): Promise<void> => {
  const activeRunId = await redis.get(activeRunKey(fingerprint));
  if (activeRunId === runId) {
    await redis.del(activeRunKey(fingerprint));
  }
  await redis.del(runFingerprintKey(runId));
};

export const clearActiveRunFingerprint = async (
  fingerprint: string | null,
  runId: string
): Promise<void> => {
  if (fingerprint === null) return;
  if (memoryActiveRunIdsByFingerprint.get(fingerprint) === runId) {
    memoryActiveRunIdsByFingerprint.delete(fingerprint);
  }
  memoryRunFingerprintsByRunId.delete(runId);
  const redis = getRedisClient();
  if (redis !== null) await clearRedisActiveRunFingerprint(redis, fingerprint, runId);
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

export const readActiveRunByFingerprint = async (
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

export const claimActiveRunFingerprint = async (
  fingerprint: string,
  runId: string
): Promise<FilemakerJobBoardScrapeRuntimeRun | null> => {
  const redis = getRedisClient();
  return redis === null
    ? claimMemoryActiveRunFingerprint(fingerprint, runId)
    : claimRedisActiveRunFingerprint(redis, fingerprint, runId);
};
