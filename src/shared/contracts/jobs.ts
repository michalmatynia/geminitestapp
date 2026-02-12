import { z } from 'zod';

import { dtoBaseSchema } from './base';

/**
 * Job DTOs
 */

export const jobSchema = dtoBaseSchema.extend({
  type: z.string(),
  status: z.string(), // Generic status
  progress: z.number().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  result: z.record(z.string(), z.unknown()).nullable(),
  error: z.string().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  priority: z.number().optional(),
});

export type JobDto = z.infer<typeof jobSchema>;

export const createJobSchema = jobSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateJobDto = z.infer<typeof createJobSchema>;
export type UpdateJobDto = Partial<CreateJobDto>;

/**
 * Product AI Job Contract
 */
export const productAiJobSchema = jobSchema.extend({
  productId: z.string(),
  operation: z.enum(['generate_description', 'optimize_images', 'categorize', 'tag_generation']).optional(),
  aiModel: z.string().optional(),
  parameters: z.record(z.string(), z.unknown()).optional(),
});

export type ProductAiJobDto = z.infer<typeof productAiJobSchema>;

export const createProductAiJobSchema = productAiJobSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateProductAiJobDto = z.infer<typeof createProductAiJobSchema>;
export type UpdateProductAiJobDto = Partial<CreateProductAiJobDto>;

/**
 * Job Queue Stats Contract
 */
export const jobQueueStatsSchema = z.object({
  running: z.boolean(),
  healthy: z.boolean(),
  processing: z.boolean(),
  lastPollTime: z.number(),
  timeSinceLastPoll: z.number(),
});

export type JobQueueStatsDto = z.infer<typeof jobQueueStatsSchema>;
