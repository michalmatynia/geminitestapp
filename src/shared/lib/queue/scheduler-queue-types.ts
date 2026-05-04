/**
 * Scheduler Queue Types
 * 
 * Type definitions for scheduler queue operations.
 * Provides:
 * - Typed scheduler job data structures
 * - Scheduled tick job definitions
 * - Queue state management types
 * - Worker and scheduler status tracking
 * - Type-safe queue operations
 */

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
