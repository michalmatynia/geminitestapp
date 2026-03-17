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
