import { z } from 'zod';

import { imageFileSelectionSchema } from './files';

const trimmedString = z.string().trim();
const optionalText = (max: number) => trimmedString.max(max).default('');

export const kangurSocialDocUpdateSchema = z.object({
  docPath: trimmedString.max(240),
  section: trimmedString.max(200).nullable().default(null),
  proposedText: optionalText(5000),
  reason: optionalText(1000),
});
export type KangurSocialDocUpdate = z.infer<typeof kangurSocialDocUpdateSchema>;

export type KangurSocialDocUpdateItemPlan = {
  docPath: string;
  section: string | null;
  proposedText: string;
  applied: boolean;
  skipReason?: string;
};

export type KangurSocialDocUpdateFilePlan = {
  docPath: string;
  applied: boolean;
  diff: string;
  truncated: boolean;
  before: string;
  after: string;
};

export type KangurSocialDocUpdatePlan = {
  items: KangurSocialDocUpdateItemPlan[];
  files: KangurSocialDocUpdateFilePlan[];
};

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
  linkedinConnectionId: trimmedString.max(160).nullable().default(null),
  brainModelId: trimmedString.max(160).nullable().default(null),
  visionModelId: trimmedString.max(160).nullable().default(null),
  publishError: trimmedString.max(1000).nullable().default(null),
  imageAssets: z.array(imageFileSelectionSchema).max(12).default([]),
  imageAddonIds: z.array(trimmedString.max(160)).max(30).default([]),
  docReferences: z.array(trimmedString.max(240)).max(80).default([]),
  generatedSummary: trimmedString.max(8000).nullable().default(null),
  visualSummary: trimmedString.max(8000).nullable().default(null),
  visualHighlights: z.array(trimmedString.max(400)).max(24).default([]),
  visualDocUpdates: z.array(kangurSocialDocUpdateSchema).max(50).default([]),
  docUpdatesAppliedAt: z.string().datetime().nullable().default(null),
  docUpdatesAppliedBy: trimmedString.max(120).nullable().default(null),
  createdBy: trimmedString.max(120).nullable().default(null),
  updatedBy: trimmedString.max(120).nullable().default(null),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type KangurSocialPost = z.infer<typeof kangurSocialPostSchema>;

export const kangurSocialPostsSchema = z.array(kangurSocialPostSchema);
export type KangurSocialPosts = z.infer<typeof kangurSocialPostsSchema>;

export type KangurSocialDocUpdatesResponse = {
  applied: boolean;
  plan: KangurSocialDocUpdatePlan;
  post: KangurSocialPost | null;
};

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

export type UpdateKangurSocialPostInput = Partial<CreateKangurSocialPostInput> & {
  publishedAt?: string | null;
  linkedinPostId?: string | null;
  linkedinUrl?: string | null;
};

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
