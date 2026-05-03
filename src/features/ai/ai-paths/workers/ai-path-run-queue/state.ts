import { type AiPathRunQueueState } from './types';

const globalWithAiPathRunQueueState = globalThis as typeof globalThis & {
  __aiPathRunQueueState__?: AiPathRunQueueState;
};

export const aiPathRunQueueState =
  globalWithAiPathRunQueueState.__aiPathRunQueueState__ ??
  (globalWithAiPathRunQueueState.__aiPathRunQueueState__ = {
    workerStarted: false,
  });

const MAX_LOCAL_FALLBACK_TIMERS = 1_000;
export const localFallbackTimers = new Map<string, NodeJS.Timeout>();

export const setLocalFallbackTimer = (runId: string, timer: NodeJS.Timeout): void => {
  const existing = localFallbackTimers.get(runId);
  if (existing) {
    clearTimeout(existing);
    localFallbackTimers.delete(runId);
  }

  localFallbackTimers.set(runId, timer);
  while (localFallbackTimers.size > MAX_LOCAL_FALLBACK_TIMERS) {
    const oldestEntry = localFallbackTimers.entries().next().value;
    if (!oldestEntry) break;
    const [oldestRunId, oldestTimer] = oldestEntry;
    clearTimeout(oldestTimer);
    localFallbackTimers.delete(oldestRunId);
  }
};
