import type { QueueHealthStatusDto, QueueNameDto } from '@/shared/contracts/jobs';

import type { JobsOptions, WorkerOptions } from 'bullmq';


export type QueueName = QueueNameDto;

export type QueueHealthStatus = QueueHealthStatusDto;

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
