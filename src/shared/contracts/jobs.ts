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
export type JobCreateInput = CreateJobDto;
export type UpdateJobDto = Partial<CreateJobDto>;
export type JobUpdateInput = UpdateJobDto;

/**
 * Product AI Job Contract
 */
export const productAiJobTypeSchema = z.enum([
  'description_generation',
  'translation',
  'graph_model',
  'db_sync',
  'db_backup',
  'base64_all',
  'base_images_sync_all',
  'description',
  'tags',
  'categories',
  'parameters',
]);

export type ProductAiJobTypeDto = z.infer<typeof productAiJobTypeSchema>;

export const productAiJobResultSchema = z.object({
  visionModel: z.string().optional(),
  generationModel: z.string().optional(),
  visionOutputEnabled: z.boolean().optional(),
  generationOutputEnabled: z.boolean().optional(),
  analysisInitial: z.string().optional(),
  analysis: z.string().optional(),
  analysisFinal: z.string().optional(),
  descriptionInitial: z.string().optional(),
  description: z.string().optional(),
  descriptionFinal: z.string().optional(),
  translationModel: z.string().optional(),
  sourceLanguage: z.string().optional(),
  targetLanguages: z.array(z.string()).optional(),
  translations: z.record(z.string(), z.object({
    name: z.string().optional(),
    description: z.string().optional(),
  })).optional(),
}).catchall(z.unknown());

export type ProductAiJobResultDto = z.infer<typeof productAiJobResultSchema>;

export const productAiJobSchema = jobSchema.extend({
  productId: z.string().nullable().optional(),
  operation: productAiJobTypeSchema.optional(),
  aiModel: z.string().optional(),
  parameters: z.record(z.string(), z.unknown()).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  result: productAiJobResultSchema.nullable(),
  errorMessage: z.string().nullable().optional(),
  finishedAt: z.string().nullable().optional(),
  product: z.object({
    name_en: z.string().nullable(),
    sku: z.string().nullable(),
  }).optional(),
});

export type ProductAiJobDto = z.infer<typeof productAiJobSchema>;

export const createProductAiJobSchema = productAiJobSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateProductAiJobDto = z.infer<typeof createProductAiJobSchema>;
export type ProductAiJobCreateInput = CreateProductAiJobDto;
export type UpdateProductAiJobDto = Partial<CreateProductAiJobDto>;
export type ProductAiJobUpdateInput = UpdateProductAiJobDto;

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
