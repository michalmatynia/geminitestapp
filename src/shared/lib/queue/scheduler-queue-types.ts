export type TypedSchedulerTickJobData<TType extends string> = {
  type: TType;
};

export type ScheduledTickJobData = TypedSchedulerTickJobData<'scheduled-tick'>;

export type SchedulerQueueState = {
  workerStarted: boolean;
  schedulerRegistered: boolean;
};

export type RepeatableJobEntry = {
  id?: string | null;
  name?: string;
  every?: number | null;
  key: string;
};

export type ManagedQueueStatus = {
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
