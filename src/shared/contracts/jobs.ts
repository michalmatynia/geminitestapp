import { z } from 'zod';

import { dtoBaseSchema } from './base';

/**
 * Core Job DTOs
 */

export const jobStatusSchema = z.enum([
  'queued',
  'running',
  'completed',
  'failed',
  'canceled',
]);

export type JobStatusDto = z.infer<typeof jobStatusSchema>;
export type JobStatus = JobStatusDto;

export const jobSchema = dtoBaseSchema.extend({
  status: jobStatusSchema,
  progress: z.number().min(0).max(100),
  error: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  startedAt: z.string().nullable().optional(),
  finishedAt: z.string().nullable().optional(),
});

export type JobDto = z.infer<typeof jobSchema>;

export const jobRowDataSchema = z.object({
  id: z.string(),
  status: jobStatusSchema,
  progress: z.number(),
  error: z.string().nullable(),
  createdAt: z.string(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type JobRowDataDto = z.infer<typeof jobRowDataSchema>;
export type JobRowData = JobRowDataDto;

/**
 * Product AI Job DTOs
 */

export const productAiJobTypeSchema = z.enum([
  'description_generation',
  'translation',
  'attribute_extraction',
  'image_analysis',
]);

export type ProductAiJobTypeDto = z.infer<typeof productAiJobTypeSchema>;
export type ProductAiJobType = ProductAiJobTypeDto;

export const productAiJobResultSchema = z.record(z.string(), z.unknown());

export type ProductAiJobResultDto = z.infer<typeof productAiJobResultSchema>;
export type ProductAiJobResult = ProductAiJobResultDto;

export const productAiJobSchema = jobSchema.extend({
  productId: z.string(),
  jobType: productAiJobTypeSchema,
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

export type ProductAiJobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'canceled';

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
    | 'status'
    | 'type'
    | 'payload'
    | 'result'
    | 'errorMessage'
    | 'startedAt'
    | 'finishedAt'
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
  createJob(
    productId: string,
    type: string,
    payload: unknown
  ): Promise<ProductAiJobRecord>;
  findJobs(
    productId?: string,
    options?: FindProductAiJobsOptions
  ): Promise<ProductAiJobRecord[]>;
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
