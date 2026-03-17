import { z } from 'zod';

import { imageFileSelectionSchema } from './files';

const trimmedString = z.string().trim();
const optionalText = (max: number) => trimmedString.max(max).default('');

export const KANGUR_SOCIAL_POSTS_COLLECTION = 'kangur_social_posts';
export const KANGUR_SOCIAL_BILINGUAL_SEPARATOR = '\n---\n';

export const kangurSocialPostStatusSchema = z.enum([
  'draft',
  'scheduled',
  'published',
  'failed',
]);
export type KangurSocialPostStatus = z.infer<typeof kangurSocialPostStatusSchema>;

export const kangurSocialPostSchema = z.object({
  id: trimmedString.min(1).max(160),
  titlePl: optionalText(200),
  titleEn: optionalText(200),
  bodyPl: optionalText(8000),
  bodyEn: optionalText(8000),
  combinedBody: optionalText(20000),
  status: kangurSocialPostStatusSchema.default('draft'),
  scheduledAt: z.string().datetime().nullable().default(null),
  publishedAt: z.string().datetime().nullable().default(null),
  linkedinPostId: trimmedString.max(200).nullable().default(null),
  linkedinUrl: trimmedString.max(500).nullable().default(null),
  imageAssets: z.array(imageFileSelectionSchema).max(12).default([]),
  docReferences: z.array(trimmedString.max(240)).max(80).default([]),
  generatedSummary: trimmedString.max(8000).nullable().default(null),
  createdBy: trimmedString.max(120).nullable().default(null),
  updatedBy: trimmedString.max(120).nullable().default(null),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type KangurSocialPost = z.infer<typeof kangurSocialPostSchema>;

export const kangurSocialPostStoreSchema = z.object({
  version: z.number().int().positive().default(1),
  posts: z.array(kangurSocialPostSchema).max(1000).default([]),
});
export type KangurSocialPostStore = z.infer<typeof kangurSocialPostStoreSchema>;

export type CreateKangurSocialPostInput = Omit<
  KangurSocialPost,
  'createdAt' | 'updatedAt' | 'linkedinPostId' | 'linkedinUrl' | 'publishedAt'
> & {
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateKangurSocialPostInput = Partial<CreateKangurSocialPostInput>;

export const buildKangurSocialPostCombinedBody = (
  bodyPl: string,
  bodyEn: string
): string => {
  const pl = bodyPl.trim();
  const en = bodyEn.trim();
  if (!pl && !en) return '';
  if (!pl) return en;
  if (!en) return pl;
  return `${pl}${KANGUR_SOCIAL_BILINGUAL_SEPARATOR}${en}`;
};

export const normalizeKangurSocialPost = (value: KangurSocialPost): KangurSocialPost => {
  const parsed = kangurSocialPostSchema.parse(value);
  const combinedBody =
    parsed.combinedBody.trim().length > 0
      ? parsed.combinedBody
      : buildKangurSocialPostCombinedBody(parsed.bodyPl, parsed.bodyEn);
  return {
    ...parsed,
    combinedBody,
  };
};

export const parseKangurSocialPostStore = (value: unknown): KangurSocialPostStore =>
  kangurSocialPostStoreSchema.parse(value);
