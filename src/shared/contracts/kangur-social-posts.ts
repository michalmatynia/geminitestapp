import { z } from 'zod';

import { imageFileSelectionSchema } from './files';
import { normalizeKangurSocialVisualAnalysis } from '@/shared/lib/kangur-social-visual-analysis';

const trimmedString = z.string().trim();
const optionalText = (max: number) => trimmedString.max(max).default('');

export const kangurSocialVisualAnalysisSchema = z.object({
  summary: optionalText(8000),
  highlights: z.array(trimmedString.max(400)).max(24).default([]),
});
export type KangurSocialVisualAnalysis = z.infer<
  typeof kangurSocialVisualAnalysisSchema
>;

export const kangurSocialVisualAnalysisStatusSchema = z.enum([
  'queued',
  'running',
  'completed',
  'failed',
]);
export type KangurSocialVisualAnalysisStatus = z.infer<
  typeof kangurSocialVisualAnalysisStatusSchema
>;

export const kangurSocialPublishModeSchema = z.enum(['published', 'draft']);
export type KangurSocialPublishMode = z.infer<typeof kangurSocialPublishModeSchema>;

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
  contextSummary: trimmedString.max(8000).nullable().default(null),
  generatedSummary: trimmedString.max(8000).nullable().default(null),
  visualSummary: trimmedString.max(8000).nullable().default(null),
  visualHighlights: z.array(trimmedString.max(400)).max(24).default([]),
  visualAnalysisSourceImageAddonIds: z.array(trimmedString.max(160)).max(30).default([]),
  visualAnalysisSourceVisionModelId: trimmedString.max(160).nullable().default(null),
  visualAnalysisStatus: kangurSocialVisualAnalysisStatusSchema.nullable().default(null),
  visualAnalysisUpdatedAt: z.string().datetime().nullable().default(null),
  visualAnalysisJobId: trimmedString.max(160).nullable().default(null),
  visualAnalysisModelId: trimmedString.max(160).nullable().default(null),
  createdBy: trimmedString.max(120).nullable().default(null),
  updatedBy: trimmedString.max(120).nullable().default(null),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type KangurSocialPost = z.infer<typeof kangurSocialPostSchema>;

export type KangurSocialGeneratedDraft = {
  titlePl: string;
  titleEn: string;
  bodyPl: string;
  bodyEn: string;
  combinedBody: string;
  summary?: string;
  docReferences?: string[];
  visualSummary?: string | null;
  visualHighlights?: KangurSocialVisualAnalysis['highlights'];
};

export const kangurSocialPostEditorStateSchema = kangurSocialPostSchema.pick({
  titlePl: true,
  titleEn: true,
  bodyPl: true,
  bodyEn: true,
});
export type KangurSocialPostEditorStateDto = z.infer<
  typeof kangurSocialPostEditorStateSchema
>;

export const kangurSocialPostsSchema = z.array(kangurSocialPostSchema);
export type KangurSocialPosts = z.infer<typeof kangurSocialPostsSchema>;

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
  const visualAnalysis = normalizeKangurSocialVisualAnalysis({
    summary: parsed.visualSummary,
    highlights: parsed.visualHighlights,
  });
  const combinedBody =
    parsed.combinedBody.trim().length > 0
      ? parsed.combinedBody
      : buildKangurSocialPostCombinedBody(parsed.bodyPl, parsed.bodyEn);
  return {
    ...parsed,
    combinedBody,
    visualSummary: visualAnalysis.summary || null,
    visualHighlights: visualAnalysis.highlights,
  };
};

export const parseKangurSocialPostStore = (value: unknown): KangurSocialPostStore => {
  const parsed = kangurSocialPostStoreSchema.parse(value);
  return {
    ...parsed,
    posts: parsed.posts.map((post) => normalizeKangurSocialPost(post)),
  };
};
