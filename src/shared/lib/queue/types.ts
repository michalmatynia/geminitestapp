import type { JobsOptions, WorkerOptions } from 'bullmq';

export type QueueName =
  | 'product-ai'
  | 'ai-path-run'
  | 'chatbot'
  | 'agent'
  | 'ai-insights'
  | 'database-backup-scheduler'
  | 'image-studio-run';

export type QueueHealthStatus = {
  running: boolean;
  healthy: boolean;
  processing: boolean;
  activeCount: number;
  waitingCount: number;
  failedCount: number;
  completedCount: number;
  lastPollTime: number;
  timeSinceLastPoll: number;
};

export type QueueConfig<TJobData = unknown> = {
  name: QueueName;
  concurrency: number;
  defaultJobOptions?: Omit<JobsOptions, 'connection'>;
  workerOptions?: Omit<WorkerOptions, 'connection' | 'concurrency'>;
  processor: (data: TJobData, jobId: string) => Promise<unknown>;
  onCompleted?: (jobId: string, result: unknown, data: TJobData) => Promise<void>;
  onFailed?: (jobId: string, error: Error, data: TJobData) => Promise<void>;
};

export type ManagedQueue<TJobData = unknown> = {
  enqueue: (data: TJobData, opts?: Partial<JobsOptions> & { repeat?: { every: number }; jobId?: string }) => Promise<string>;
  startWorker: () => void;
  stopWorker: () => Promise<void>;
  getHealthStatus: () => Promise<QueueHealthStatus>;
  processInline: (data: TJobData) => Promise<unknown>;
  getQueue: () => import('bullmq').Queue | null;
};
