import { z } from 'zod';

import type {
  SocialPublishingGeneratedDraft,
  SocialPublishingPost,
  SocialPublishingVisualAnalysis,
} from './social-publishing-posts';

export const socialPublishingPipelineJobTypeSchema = z.enum([
  'pipeline-tick',
  'manual-post-pipeline',
  'manual-post-visual-analysis',
  'manual-post-generation',
]);

export type SocialPublishingPipelineJobType = z.infer<
  typeof socialPublishingPipelineJobTypeSchema
>;

export const socialPublishingPipelineCaptureFailureSchema = z.object({
  id: z.string().trim().min(1),
  reason: z.string().trim().min(1),
});

export type SocialPublishingPipelineCaptureFailure = z.infer<
  typeof socialPublishingPipelineCaptureFailureSchema
>;

export const socialPublishingPipelineCaptureModeSchema = z.enum([
  'existing_assets',
  'fresh_capture',
  'capture_only',
]);

export type SocialPublishingPipelineCaptureMode = z.infer<
  typeof socialPublishingPipelineCaptureModeSchema
>;

export const socialPublishingManualPipelineProgressStepSchema = z.enum([
  'loading_context',
  'capturing',
  'saving',
  'generating',
  'previewing',
]);

export type SocialPublishingManualPipelineProgressStep = z.infer<
  typeof socialPublishingManualPipelineProgressStepSchema
>;

export const socialPublishingManualPipelineProgressSchema = z.object({
  type: z.literal('manual-post-pipeline'),
  step: socialPublishingManualPipelineProgressStepSchema,
  captureMode: socialPublishingPipelineCaptureModeSchema.default('fresh_capture'),
  message: z.string().nullable().default(null),
  updatedAt: z.number().int().nonnegative(),
  contextDocCount: z.number().int().nonnegative().nullable().default(null),
  contextSummary: z.string().nullable().default(null),
  addonsCreated: z.number().int().nonnegative().nullable().default(null),
  captureFailureCount: z.number().int().nonnegative().nullable().default(null),
  captureFailures: z.array(socialPublishingPipelineCaptureFailureSchema).default([]),
  requestedPresetCount: z.number().int().nonnegative().nullable().default(null),
  usedPresetCount: z.number().int().nonnegative().nullable().default(null),
  usedPresetIds: z.array(z.string().trim().min(1)).default([]),
  captureCompletedCount: z.number().int().nonnegative().nullable().default(null),
  captureRemainingCount: z.number().int().nonnegative().nullable().default(null),
  captureTotalCount: z.number().int().nonnegative().nullable().default(null),
  runId: z.string().nullable().default(null),
});

export type SocialPublishingManualPipelineProgress = z.infer<
  typeof socialPublishingManualPipelineProgressSchema
>;

export type SocialPublishingManualPipelineProgressBase = Omit<
  SocialPublishingManualPipelineProgress,
  'updatedAt'
>;

type SocialPublishingManualPipelineProgressBaseInput = Pick<
  SocialPublishingManualPipelineProgressBase,
  'step' | 'captureMode'
> &
  Partial<
    Omit<SocialPublishingManualPipelineProgressBase, 'type' | 'step' | 'captureMode'>
  >;

export const createSocialPublishingManualPipelineProgressBase = (
  input: SocialPublishingManualPipelineProgressBaseInput
): SocialPublishingManualPipelineProgressBase => ({
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

export const createSocialPublishingManualPipelineProgress = (
  input: SocialPublishingManualPipelineProgressBaseInput & {
    updatedAt: SocialPublishingManualPipelineProgress['updatedAt'];
  }
): SocialPublishingManualPipelineProgress => ({
  ...createSocialPublishingManualPipelineProgressBase(input),
  updatedAt: input.updatedAt,
});

export const socialPublishingManualVisualAnalysisProgressStepSchema = z.enum([
  'loading_assets',
  'analyzing',
  'saving',
]);

export type SocialPublishingManualVisualAnalysisProgressStep = z.infer<
  typeof socialPublishingManualVisualAnalysisProgressStepSchema
>;

export const socialPublishingManualVisualAnalysisProgressSchema = z.object({
  type: z.literal('manual-post-visual-analysis'),
  step: socialPublishingManualVisualAnalysisProgressStepSchema,
  message: z.string().nullable().default(null),
  updatedAt: z.number().int().nonnegative(),
  postId: z.string().nullable().default(null),
  imageAddonCount: z.number().int().nonnegative().default(0),
  highlightCount: z.number().int().nonnegative().nullable().default(null),
});

export type SocialPublishingManualVisualAnalysisProgress = z.infer<
  typeof socialPublishingManualVisualAnalysisProgressSchema
>;

export const socialPublishingManualGenerationProgressStepSchema = z.enum([
  'loading_assets',
  'generating',
  'saving',
  'previewing',
]);

export type SocialPublishingManualGenerationProgressStep = z.infer<
  typeof socialPublishingManualGenerationProgressStepSchema
>;

export const socialPublishingManualGenerationProgressSchema = z.object({
  type: z.literal('manual-post-generation'),
  step: socialPublishingManualGenerationProgressStepSchema,
  message: z.string().nullable().default(null),
  updatedAt: z.number().int().nonnegative(),
  postId: z.string().nullable().default(null),
  imageAddonCount: z.number().int().nonnegative().default(0),
  docReferenceCount: z.number().int().nonnegative().default(0),
  visualSummaryPresent: z.boolean().default(false),
  highlightCount: z.number().int().nonnegative().nullable().default(null),
});

export type SocialPublishingManualGenerationProgress = z.infer<
  typeof socialPublishingManualGenerationProgressSchema
>;

export type SocialPublishingManualVisualAnalysisJobResult = {
  type: 'manual-post-visual-analysis';
  postId: string | null;
  imageAddonIds: string[];
  visionModelId: string | null;
  analysis: SocialPublishingVisualAnalysis;
  savedPost: SocialPublishingPost | null;
};

export type SocialPublishingManualGenerationJobResult = {
  type: 'manual-post-generation';
  postId: string | null;
  imageAddonIds: string[];
  docReferences: string[];
  brainModelId: string | null;
  visionModelId: string | null;
  generatedPost: SocialPublishingPost | null;
  draft: SocialPublishingGeneratedDraft | null;
};

export type SocialPublishingPipelineJobProgress =
  | SocialPublishingManualPipelineProgress
  | SocialPublishingManualVisualAnalysisProgress
  | SocialPublishingManualGenerationProgress;
