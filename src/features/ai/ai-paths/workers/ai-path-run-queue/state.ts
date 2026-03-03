import { type AiPathRunQueueState } from './types';

const globalWithAiPathRunQueueState = globalThis as typeof globalThis & {
  __aiPathRunQueueState__?: AiPathRunQueueState;
};

export const aiPathRunQueueState =
  globalWithAiPathRunQueueState.__aiPathRunQueueState__ ??
  (globalWithAiPathRunQueueState.__aiPathRunQueueState__ = {
    workerStarted: false,
    recoveryScheduled: false,
  });

export const localFallbackTimers = new Map<string, NodeJS.Timeout>();
