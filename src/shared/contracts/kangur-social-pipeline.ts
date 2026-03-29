import { z } from 'zod';

import type {
  KangurSocialGeneratedDraft,
  KangurSocialPost,
  KangurSocialVisualAnalysis,
} from './kangur-social-posts';

export const kangurSocialPipelineJobTypeSchema = z.enum([
  'pipeline-tick',
  'manual-post-pipeline',
  'manual-post-visual-analysis',
  'manual-post-generation',
]);

export type KangurSocialPipelineJobType = z.infer<
  typeof kangurSocialPipelineJobTypeSchema
>;

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
  captureCompletedCount: z.number().int().nonnegative().nullable().default(null),
  captureRemainingCount: z.number().int().nonnegative().nullable().default(null),
  captureTotalCount: z.number().int().nonnegative().nullable().default(null),
  runId: z.string().nullable().default(null),
});

export type KangurSocialManualPipelineProgress = z.infer<
  typeof kangurSocialManualPipelineProgressSchema
>;

export type KangurSocialManualPipelineProgressBase = Omit<
  KangurSocialManualPipelineProgress,
  'updatedAt'
>;

type KangurSocialManualPipelineProgressBaseInput = Pick<
  KangurSocialManualPipelineProgressBase,
  'step' | 'captureMode'
> &
  Partial<
    Omit<KangurSocialManualPipelineProgressBase, 'type' | 'step' | 'captureMode'>
  >;

export const createKangurSocialManualPipelineProgressBase = (
  input: KangurSocialManualPipelineProgressBaseInput
): KangurSocialManualPipelineProgressBase => ({
  type: 'manual-post-pipeline',
  message: null,
  contextDocCount: null,
  contextSummary: null,
  addonsCreated: null,
  captureFailureCount: null,
  captureFailures: [],
  requestedPresetCount: null,
  usedPresetCount: null,
  usedPresetIds: [],
  captureCompletedCount: null,
  captureRemainingCount: null,
  captureTotalCount: null,
  runId: null,
  ...input,
  step: input.step,
  captureMode: input.captureMode,
});

export const createKangurSocialManualPipelineProgress = (
  input: KangurSocialManualPipelineProgressBaseInput & {
    updatedAt: KangurSocialManualPipelineProgress['updatedAt'];
  }
): KangurSocialManualPipelineProgress => ({
  ...createKangurSocialManualPipelineProgressBase(input),
  updatedAt: input.updatedAt,
});

export const kangurSocialManualVisualAnalysisProgressStepSchema = z.enum([
  'loading_assets',
  'analyzing',
  'saving',
]);

export type KangurSocialManualVisualAnalysisProgressStep = z.infer<
  typeof kangurSocialManualVisualAnalysisProgressStepSchema
>;

export const kangurSocialManualVisualAnalysisProgressSchema = z.object({
  type: z.literal('manual-post-visual-analysis'),
  step: kangurSocialManualVisualAnalysisProgressStepSchema,
  message: z.string().nullable().default(null),
  updatedAt: z.number().int().nonnegative(),
  postId: z.string().nullable().default(null),
  imageAddonCount: z.number().int().nonnegative().default(0),
  docReferenceCount: z.number().int().nonnegative().default(0),
  highlightCount: z.number().int().nonnegative().nullable().default(null),
  docUpdateCount: z.number().int().nonnegative().nullable().default(null),
});

export type KangurSocialManualVisualAnalysisProgress = z.infer<
  typeof kangurSocialManualVisualAnalysisProgressSchema
>;

export const kangurSocialManualGenerationProgressStepSchema = z.enum([
  'loading_assets',
  'generating',
  'saving',
  'previewing',
]);

export type KangurSocialManualGenerationProgressStep = z.infer<
  typeof kangurSocialManualGenerationProgressStepSchema
>;

export const kangurSocialManualGenerationProgressSchema = z.object({
  type: z.literal('manual-post-generation'),
  step: kangurSocialManualGenerationProgressStepSchema,
  message: z.string().nullable().default(null),
  updatedAt: z.number().int().nonnegative(),
  postId: z.string().nullable().default(null),
  imageAddonCount: z.number().int().nonnegative().default(0),
  docReferenceCount: z.number().int().nonnegative().default(0),
  visualSummaryPresent: z.boolean().default(false),
  highlightCount: z.number().int().nonnegative().nullable().default(null),
  docUpdateCount: z.number().int().nonnegative().nullable().default(null),
});

export type KangurSocialManualGenerationProgress = z.infer<
  typeof kangurSocialManualGenerationProgressSchema
>;

export type KangurSocialManualVisualAnalysisJobResult = {
  type: 'manual-post-visual-analysis';
  postId: string | null;
  imageAddonIds: string[];
  docReferences: string[];
  visionModelId: string | null;
  analysis: KangurSocialVisualAnalysis;
  savedPost: KangurSocialPost | null;
};

export type KangurSocialManualGenerationJobResult = {
  type: 'manual-post-generation';
  postId: string | null;
  imageAddonIds: string[];
  docReferences: string[];
  brainModelId: string | null;
  visionModelId: string | null;
  generatedPost: KangurSocialPost | null;
  draft: KangurSocialGeneratedDraft | null;
};

export type KangurSocialPipelineJobProgress =
  | KangurSocialManualPipelineProgress
  | KangurSocialManualVisualAnalysisProgress
  | KangurSocialManualGenerationProgress;
