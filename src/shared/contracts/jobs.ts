import { z } from 'zod';

import { dtoBaseSchema } from './base';

/**
 * Core Job DTOs
 */

export const jobStatusSchema = z.enum([
  'pending',
  'queued',
  'queued_relist',
  'running',
  'completed',
  'failed',
  'canceled',
  'cancelled',
]);

export type JobStatusDto = z.infer<typeof jobStatusSchema>;
export type JobStatus = JobStatusDto;

export const jobSchema = dtoBaseSchema.extend({
  status: jobStatusSchema,
  type: z.string().optional(),
  progress: z.number().min(0).max(100).optional(),
  payload: z.unknown().optional(),
  error: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  startedAt: z.string().nullable().optional(),
  finishedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
});

export type JobDto = z.infer<typeof jobSchema>;

export interface JobRowDataDto {
  id: string;
  status: JobStatus;
  progress: number;
  error: string | null;
  errorMessage?: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  metadata?: Record<string, unknown> | null;
  entityName?: string | null;
  entitySubText?: string | null;
  productId?: string | null;
  type?: string | null;
}

export type JobRowData = JobRowDataDto;

/**
 * Queue DTOs
 */

export const queueNameSchema = z.string();

export type QueueNameDto = z.infer<typeof queueNameSchema>;
export type QueueName = QueueNameDto;

export const queueHealthStatusSchema = z.object({
  name: queueNameSchema.optional(),
  isPaused: z.boolean().optional(),
  running: z.boolean().optional(),
  healthy: z.boolean().optional(),
  processing: z.boolean().optional(),
  waitingCount: z.number(),
  activeCount: z.number(),
  completedCount: z.number(),
  failedCount: z.number(),
  delayedCount: z.number().optional(),
  lastPollTime: z.number().optional(),
  timeSinceLastPoll: z.number().optional(),
});

export type QueueHealthStatusDto = z.infer<typeof queueHealthStatusSchema>;
export type QueueHealthStatus = QueueHealthStatusDto;

/**
 * Product AI Job DTOs
 */

export const productAiJobTypeSchema = z.enum([
  'attribute_extraction',
  'image_analysis',
  'db_backup',
  'db_sync',
  'graph_model',
  'ai_path',
]);

export type ProductAiJobTypeDto = z.infer<typeof productAiJobTypeSchema>;
export type ProductAiJobType = ProductAiJobTypeDto;

export const productAiJobResultSchema = z.record(z.string(), z.unknown());

export type ProductAiJobResultDto = z.infer<typeof productAiJobResultSchema>;
export type ProductAiJobResult = ProductAiJobResultDto;

export const bulkAiJobRequestSchema = z.object({
  type: productAiJobTypeSchema,
  config: z.record(z.string(), z.unknown()).optional(),
});

export type BulkAiJobRequestDto = z.infer<typeof bulkAiJobRequestSchema>;

export const productAiJobSchema = jobSchema.extend({
  productId: z.string(),
  jobType: productAiJobTypeSchema.optional(),
  payload: z.unknown().optional(),
  errorMessage: z.string().nullable().optional(),
  result: productAiJobResultSchema.nullable().optional(),
});

export type ProductAiJobDto = z.infer<typeof productAiJobSchema>;
export type ProductAiJob = ProductAiJobDto;

export const createProductAiJobSchema = productAiJobSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateProductAiJobDto = z.infer<typeof createProductAiJobSchema>;

export const updateProductAiJobSchema = createProductAiJobSchema.partial();

export type UpdateProductAiJobDto = z.infer<typeof updateProductAiJobSchema>;

/**
 * Product AI Job Repository Types
 */

export type ProductAiJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'canceled';

export type ProductAiJobRecord = {
  id: string;
  productId: string;
  status: ProductAiJobStatus;
  type: string;
  payload: unknown;
  result?: unknown;
  errorMessage?: string | null;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date | null;
  finishedAt?: Date | null;
};

export type ProductAiJobUpdate = Partial<
  Pick<
    ProductAiJobRecord,
    'status' | 'type' | 'payload' | 'result' | 'errorMessage' | 'startedAt' | 'finishedAt'
  >
> & {
  productId?: string;
  createdAt?: Date;
};

export type FindProductAiJobsOptions = {
  type?: string;
  statuses?: ProductAiJobStatus[];
  limit?: number;
};

export type ProductAiJobRepository = {
  createJob(productId: string, type: string, payload: unknown): Promise<ProductAiJobRecord>;
  findJobs(productId?: string, options?: FindProductAiJobsOptions): Promise<ProductAiJobRecord[]>;
  findJobById(jobId: string): Promise<ProductAiJobRecord | null>;
  findNextPendingJob(): Promise<ProductAiJobRecord | null>;
  findAnyPendingJob(): Promise<ProductAiJobRecord | null>;
  claimNextPendingJob(): Promise<ProductAiJobRecord | null>;
  updateJob(jobId: string, data: ProductAiJobUpdate): Promise<ProductAiJobRecord>;
  deleteJob(jobId: string): Promise<void>;
  deleteTerminalJobs(): Promise<{ count: number }>;
  deleteAllJobs(): Promise<{ count: number }>;
  markStaleRunningJobs(maxAgeMs: number): Promise<{ count: number }>;
};

/**
 * Queue Configuration Types
 */

export type QueueConfig<TJobData = unknown> = {
  name: string; // QueueName
  concurrency: number;
  defaultJobOptions?: Record<string, unknown>; // Omit<JobsOptions, 'connection'>
  workerOptions?: Record<string, unknown>; // Omit<WorkerOptions, 'connection' | 'concurrency'>
  processor: (data: TJobData, jobId: string) => Promise<unknown>;
  onCompleted?: (jobId: string, result: unknown, data: TJobData) => Promise<void>;
  onFailed?: (
    jobId: string,
    error: Error,
    data: TJobData,
    context?: Record<string, unknown>
  ) => Promise<void>;
};

export type ManagedQueue<TJobData = unknown> = {
  enqueue: (data: TJobData, opts?: Record<string, unknown>) => Promise<string>;
  startWorker: () => void;
  stopWorker: () => Promise<void>;
  getHealthStatus: () => Promise<QueueHealthStatus>;
  processInline: (data: TJobData) => Promise<unknown>;
  getQueue: () => unknown; // import('bullmq').Queue | null
};
