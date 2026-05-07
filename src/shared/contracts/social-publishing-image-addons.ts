import { z } from 'zod';

import { imageFileSelectionSchema } from './files';

const trimmedString = z.string().trim();
const optionalText = (max: number): z.ZodDefault<typeof trimmedString> =>
  trimmedString.max(max).default('');
export const socialPublishingCaptureAppearanceModeSchema = z.enum([
  'default',
  'dawn',
  'sunset',
  'dark',
]);
export type SocialPublishingCaptureAppearanceMode = z.infer<
  typeof socialPublishingCaptureAppearanceModeSchema
>;

export const SOCIAL_PUBLISHING_IMAGE_ADDONS_COLLECTION = 'social_publishing_image_addons';

export const socialPublishingImageAddonSchema = z.object({
  id: trimmedString.min(1).max(160),
  title: trimmedString.max(200).default(''),
  description: optionalText(2000),
  sourceUrl: trimmedString.max(1000).nullable().default(null),
  sourceLabel: trimmedString.max(200).nullable().default(null),
  imageAsset: imageFileSelectionSchema,
  presetId: trimmedString.max(100).nullable().default(null),
  previousAddonId: trimmedString.max(160).nullable().default(null),
  playwrightRunId: trimmedString.max(160).nullable().default(null),
  playwrightArtifact: trimmedString.max(240).nullable().default(null),
  playwrightPersonaId: trimmedString.max(160).nullable().default(null),
  playwrightCaptureRouteId: trimmedString.max(160).nullable().default(null),
  playwrightCaptureRouteTitle: trimmedString.max(200).nullable().default(null),
  captureAppearanceMode: socialPublishingCaptureAppearanceModeSchema.nullable().default(null),
  createdBy: trimmedString.max(120).nullable().default(null),
  updatedBy: trimmedString.max(120).nullable().default(null),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type SocialPublishingImageAddon = z.infer<typeof socialPublishingImageAddonSchema>;

export const socialPublishingImageAddonsSchema = z.array(socialPublishingImageAddonSchema);
export type SocialPublishingImageAddons = z.infer<typeof socialPublishingImageAddonsSchema>;

export const socialPublishingProgrammableCaptureRouteSchema = z.object({
  id: trimmedString.min(1).max(160),
  title: trimmedString.max(200).default(''),
  path: trimmedString.min(1).max(2000),
  description: optionalText(1000),
  selector: trimmedString.max(500).nullable().default(null),
  waitForMs: z.number().int().nonnegative().nullable().default(null),
  waitForSelectorMs: z.number().int().positive().nullable().default(null),
});
export type SocialPublishingProgrammableCaptureRoute = z.infer<
  typeof socialPublishingProgrammableCaptureRouteSchema
>;

export const socialPublishingImageAddonsBatchPayloadSchema = z.object({
  baseUrl: z.string().trim().url().optional(),
  presetIds: z.array(trimmedString.min(1).max(160)).optional(),
  presetLimit: z.number().int().positive().nullable().optional(),
  appearanceMode: socialPublishingCaptureAppearanceModeSchema.optional(),
  playwrightPersonaId: trimmedString.max(160).nullable().optional(),
  playwrightScript: trimmedString.max(120_000).optional(),
  playwrightRoutes: z.array(socialPublishingProgrammableCaptureRouteSchema).max(50).optional(),
});
export type SocialPublishingImageAddonsBatchPayload = z.infer<
  typeof socialPublishingImageAddonsBatchPayloadSchema
>;

export const socialPublishingImageAddonsBatchRequestSchema = z.object({
  baseUrl: z.string().trim().url().max(2000),
  presetIds: z.array(trimmedString.min(1).max(160)).default([]),
  presetLimit: z.number().int().positive().nullable().default(null),
  appearanceMode: socialPublishingCaptureAppearanceModeSchema.nullable().default(null),
  playwrightPersonaId: trimmedString.max(160).nullable().default(null),
  playwrightScript: trimmedString.max(120_000).nullable().default(null),
  playwrightRoutes: z.array(socialPublishingProgrammableCaptureRouteSchema).max(50).default([]),
});
export type SocialPublishingImageAddonsBatchRequest = z.infer<
  typeof socialPublishingImageAddonsBatchRequestSchema
>;

export const socialPublishingImageAddonBatchFailureSchema = z.object({
  id: trimmedString.max(160),
  reason: optionalText(1000),
});
export type SocialPublishingImageAddonBatchFailure = z.infer<
  typeof socialPublishingImageAddonBatchFailureSchema
>;

export const socialPublishingImageAddonBatchCaptureResultSchema = z.object({
  id: trimmedString.max(160),
  title: trimmedString.max(200).nullable().default(null),
  status: z.enum(['ok', 'failed', 'skipped']),
  reason: trimmedString.max(1000).nullable().default(null),
  resolvedUrl: trimmedString.max(4000).nullable().default(null),
  artifactName: trimmedString.max(240).nullable().default(null),
  attemptCount: z.number().int().positive().nullable().default(null),
  durationMs: z.number().int().nonnegative().nullable().default(null),
  stage: trimmedString.max(80).nullable().default(null),
});
export type SocialPublishingImageAddonBatchCaptureResult = z.infer<
  typeof socialPublishingImageAddonBatchCaptureResultSchema
>;

export const socialPublishingImageAddonsBatchResultSchema = z.object({
  addons: socialPublishingImageAddonsSchema,
  failures: z.array(socialPublishingImageAddonBatchFailureSchema).default([]),
  captureResults: z.array(socialPublishingImageAddonBatchCaptureResultSchema).default([]),
  runId: trimmedString.max(160),
  requestedPresetCount: z.number().int().nonnegative().optional(),
  usedPresetCount: z.number().int().nonnegative().optional(),
  usedPresetIds: z.array(trimmedString.max(160)).optional(),
});
export type SocialPublishingImageAddonsBatchResult = z.infer<
  typeof socialPublishingImageAddonsBatchResultSchema
>;

export const socialPublishingImageAddonsBatchProgressSchema = z.object({
  processedCount: z.number().int().nonnegative(),
  completedCount: z.number().int().nonnegative(),
  failureCount: z.number().int().nonnegative(),
  remainingCount: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
  currentCaptureId: trimmedString.max(160).nullable().optional(),
  currentCaptureTitle: trimmedString.max(200).nullable().optional(),
  currentCaptureStatus: trimmedString.max(80).nullable().optional(),
  lastCaptureId: trimmedString.max(160).nullable().optional(),
  lastCaptureStatus: trimmedString.max(80).nullable().optional(),
  message: trimmedString.max(1000).nullable().optional(),
});
export type SocialPublishingImageAddonsBatchProgress = z.infer<
  typeof socialPublishingImageAddonsBatchProgressSchema
>;

export const socialPublishingImageAddonsBatchJobStatusSchema = z.enum([
  'queued',
  'running',
  'completed',
  'failed',
]);
export type SocialPublishingImageAddonsBatchJobStatus = z.infer<
  typeof socialPublishingImageAddonsBatchJobStatusSchema
>;

export const socialPublishingImageAddonsBatchJobSchema = z.object({
  id: trimmedString.min(1).max(160),
  runId: trimmedString.min(1).max(160),
  status: socialPublishingImageAddonsBatchJobStatusSchema,
  request: socialPublishingImageAddonsBatchRequestSchema.nullable().default(null),
  progress: socialPublishingImageAddonsBatchProgressSchema.nullable().default(null),
  result: socialPublishingImageAddonsBatchResultSchema.nullable().default(null),
  error: trimmedString.max(1000).nullable().default(null),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type SocialPublishingImageAddonsBatchJob = z.infer<
  typeof socialPublishingImageAddonsBatchJobSchema
>;

export const socialPublishingImageAddonsBatchJobsSchema = z.array(
  socialPublishingImageAddonsBatchJobSchema
);
export type SocialPublishingImageAddonsBatchJobs = z.infer<
  typeof socialPublishingImageAddonsBatchJobsSchema
>;

export type CreateSocialPublishingImageAddonInput = Omit<
  SocialPublishingImageAddon,
  'createdAt' | 'updatedAt'
> & {
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateSocialPublishingImageAddonInput = Partial<CreateSocialPublishingImageAddonInput>;

export const normalizeSocialPublishingImageAddon = (
  value: SocialPublishingImageAddon
): SocialPublishingImageAddon => socialPublishingImageAddonSchema.parse(value);
