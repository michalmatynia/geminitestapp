export type ScheduledTickJobData = {
  type: 'scheduled-tick';
};

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
