import { z } from 'zod';

export const kangurSocialPipelineCaptureFailureSchema = z.object({
  id: z.string().trim().min(1),
  reason: z.string().trim().min(1),
});

export type KangurSocialPipelineCaptureFailure = z.infer<
  typeof kangurSocialPipelineCaptureFailureSchema
>;

export const kangurSocialPipelineCaptureModeSchema = z.enum([
  'existing_assets',
  'fresh_capture',
  'capture_only',
]);

export type KangurSocialPipelineCaptureMode = z.infer<
  typeof kangurSocialPipelineCaptureModeSchema
>;

export const kangurSocialManualPipelineProgressStepSchema = z.enum([
  'loading_context',
  'capturing',
  'saving',
  'generating',
  'previewing',
]);

export type KangurSocialManualPipelineProgressStep = z.infer<
  typeof kangurSocialManualPipelineProgressStepSchema
>;

export const kangurSocialManualPipelineProgressSchema = z.object({
  type: z.literal('manual-post-pipeline'),
  step: kangurSocialManualPipelineProgressStepSchema,
  captureMode: kangurSocialPipelineCaptureModeSchema.default('fresh_capture'),
  message: z.string().nullable().default(null),
  updatedAt: z.number().int().nonnegative(),
  contextDocCount: z.number().int().nonnegative().nullable().default(null),
  contextSummary: z.string().nullable().default(null),
  addonsCreated: z.number().int().nonnegative().nullable().default(null),
  captureFailureCount: z.number().int().nonnegative().nullable().default(null),
  captureFailures: z.array(kangurSocialPipelineCaptureFailureSchema).default([]),
  requestedPresetCount: z.number().int().nonnegative().nullable().default(null),
  usedPresetCount: z.number().int().nonnegative().nullable().default(null),
  usedPresetIds: z.array(z.string().trim().min(1)).default([]),
  runId: z.string().nullable().default(null),
});

export type KangurSocialManualPipelineProgress = z.infer<
  typeof kangurSocialManualPipelineProgressSchema
>;
