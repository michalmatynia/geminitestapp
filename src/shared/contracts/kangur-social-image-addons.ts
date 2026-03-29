import { z } from 'zod';

import { imageFileSelectionSchema } from './files';

const trimmedString = z.string().trim();
const optionalText = (max: number) => trimmedString.max(max).default('');

export const KANGUR_SOCIAL_IMAGE_ADDONS_COLLECTION = 'kangur_social_image_addons';

export const kangurSocialImageAddonSchema = z.object({
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
  createdBy: trimmedString.max(120).nullable().default(null),
  updatedBy: trimmedString.max(120).nullable().default(null),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type KangurSocialImageAddon = z.infer<typeof kangurSocialImageAddonSchema>;

export const kangurSocialImageAddonsSchema = z.array(kangurSocialImageAddonSchema);
export type KangurSocialImageAddons = z.infer<typeof kangurSocialImageAddonsSchema>;

export const kangurSocialProgrammableCaptureRouteSchema = z.object({
  id: trimmedString.min(1).max(160),
  title: trimmedString.max(200).default(''),
  path: trimmedString.min(1).max(2000),
  description: optionalText(1000),
  selector: trimmedString.max(500).nullable().default(null),
  waitForMs: z.number().int().nonnegative().nullable().default(null),
  waitForSelectorMs: z.number().int().positive().nullable().default(null),
});
export type KangurSocialProgrammableCaptureRoute = z.infer<
  typeof kangurSocialProgrammableCaptureRouteSchema
>;

export const kangurSocialImageAddonsBatchPayloadSchema = z.object({
  baseUrl: z.string().trim().url().optional(),
  presetIds: z.array(trimmedString.min(1).max(160)).optional(),
  presetLimit: z.number().int().positive().nullable().optional(),
  playwrightPersonaId: trimmedString.max(160).nullable().optional(),
  playwrightScript: trimmedString.max(120_000).optional(),
  playwrightRoutes: z.array(kangurSocialProgrammableCaptureRouteSchema).max(50).optional(),
});
export type KangurSocialImageAddonsBatchPayload = z.infer<
  typeof kangurSocialImageAddonsBatchPayloadSchema
>;

export const kangurSocialImageAddonBatchFailureSchema = z.object({
  id: trimmedString.max(160),
  reason: optionalText(1000),
});
export type KangurSocialImageAddonBatchFailure = z.infer<
  typeof kangurSocialImageAddonBatchFailureSchema
>;

export const kangurSocialImageAddonsBatchResultSchema = z.object({
  addons: kangurSocialImageAddonsSchema,
  failures: z.array(kangurSocialImageAddonBatchFailureSchema).default([]),
  runId: trimmedString.max(160),
  requestedPresetCount: z.number().int().nonnegative().optional(),
  usedPresetCount: z.number().int().nonnegative().optional(),
  usedPresetIds: z.array(trimmedString.max(160)).optional(),
});
export type KangurSocialImageAddonsBatchResult = z.infer<
  typeof kangurSocialImageAddonsBatchResultSchema
>;

export const kangurSocialImageAddonsBatchProgressSchema = z.object({
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
export type KangurSocialImageAddonsBatchProgress = z.infer<
  typeof kangurSocialImageAddonsBatchProgressSchema
>;

export const kangurSocialImageAddonsBatchJobStatusSchema = z.enum([
  'queued',
  'running',
  'completed',
  'failed',
]);
export type KangurSocialImageAddonsBatchJobStatus = z.infer<
  typeof kangurSocialImageAddonsBatchJobStatusSchema
>;

export const kangurSocialImageAddonsBatchJobSchema = z.object({
  id: trimmedString.min(1).max(160),
  runId: trimmedString.min(1).max(160),
  status: kangurSocialImageAddonsBatchJobStatusSchema,
  progress: kangurSocialImageAddonsBatchProgressSchema.nullable().default(null),
  result: kangurSocialImageAddonsBatchResultSchema.nullable().default(null),
  error: trimmedString.max(1000).nullable().default(null),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type KangurSocialImageAddonsBatchJob = z.infer<
  typeof kangurSocialImageAddonsBatchJobSchema
>;

export type CreateKangurSocialImageAddonInput = Omit<
  KangurSocialImageAddon,
  'createdAt' | 'updatedAt'
> & {
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateKangurSocialImageAddonInput = Partial<CreateKangurSocialImageAddonInput>;

export const normalizeKangurSocialImageAddon = (
  value: KangurSocialImageAddon
): KangurSocialImageAddon => kangurSocialImageAddonSchema.parse(value);
