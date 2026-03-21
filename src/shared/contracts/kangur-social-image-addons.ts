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
  createdBy: trimmedString.max(120).nullable().default(null),
  updatedBy: trimmedString.max(120).nullable().default(null),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type KangurSocialImageAddon = z.infer<typeof kangurSocialImageAddonSchema>;

export const kangurSocialImageAddonsSchema = z.array(kangurSocialImageAddonSchema);
export type KangurSocialImageAddons = z.infer<typeof kangurSocialImageAddonsSchema>;

export const kangurSocialImageAddonsBatchPayloadSchema = z.object({
  baseUrl: z.string().trim().url().optional(),
  presetIds: z.array(trimmedString.min(1).max(160)).optional(),
  presetLimit: z.number().int().positive().nullable().optional(),
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
