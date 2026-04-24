import type { ManagedQueueStatus } from '@/shared/lib/queue/scheduler-queue-types';

export type AiPathRunJobData = {
  runId: string;
};

export type AiInsightsQueueStatus = ManagedQueueStatus;

export type AiPathRunQueueHotStatus = {
  running: boolean;
  healthy: boolean;
  processing: boolean;
  activeRuns: number;
  waitingRuns: number;
  failedRuns: number;
  completedRuns: number;
  lastPollTime: number;
  timeSinceLastPoll: number;
};

export type AiPathRunQueueState = {
  workerStarted: boolean;
  recoveryScheduled: boolean;
};
