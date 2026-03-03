export type AiPathRunJobData = {
  runId: string;
  type?: 'run' | 'recovery';
};

export type AiInsightsQueueStatus = {
  running: boolean;
  healthy: boolean;
  processing: boolean;
  activeJobs: number;
  waitingJobs: number;
  failedJobs: number;
  completedJobs: number;
  lastPollTime: number;
  timeSinceLastPoll: number;
};

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
