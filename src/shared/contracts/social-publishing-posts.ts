import { z } from 'zod';

import { imageFileSelectionSchema } from './files';
import { normalizeSocialPublishingVisualAnalysis } from '@/shared/lib/social-publishing-visual-analysis';

const trimmedString = z.string().trim();
const optionalText = (max: number) => trimmedString.max(max).default('');

export const socialPublishingVisualAnalysisSchema = z.object({
  summary: optionalText(8000),
  highlights: z.array(trimmedString.max(400)).max(24).default([]),
});
export type SocialPublishingVisualAnalysis = z.infer<
  typeof socialPublishingVisualAnalysisSchema
>;

export const socialPublishingVisualAnalysisStatusSchema = z.enum([
  'queued',
  'running',
  'completed',
  'failed',
]);
export type SocialPublishingVisualAnalysisStatus = z.infer<
  typeof socialPublishingVisualAnalysisStatusSchema
>;

export const socialPublishingPublishModeSchema = z.enum(['published', 'draft']);
export type SocialPublishingPublishMode = z.infer<typeof socialPublishingPublishModeSchema>;

export const SOCIAL_PUBLISHING_POSTS_COLLECTION = 'social_publishing_posts';
export const SOCIAL_PUBLISHING_BILINGUAL_SEPARATOR = '\n---\n';

export const socialPublishingPostStatusSchema = z.enum([
  'draft',
  'scheduled',
  'published',
  'failed',
]);
export type SocialPublishingPostStatus = z.infer<typeof socialPublishingPostStatusSchema>;

export const socialPublishingProviderSchema = z.enum(['linkedin']);
export type SocialPublishingProvider = z.infer<typeof socialPublishingProviderSchema>;

export const socialPublishingPostContentTypeSchema = z.enum([
  'social-pipeline',
  'article-aggregator',
]);
export type SocialPublishingPostContentType = z.infer<
  typeof socialPublishingPostContentTypeSchema
>;

export const socialPublishingPostSchema = z.object({
  id: trimmedString.min(1).max(160),
  contentType: socialPublishingPostContentTypeSchema.default('social-pipeline'),
  titlePl: optionalText(200),
  titleEn: optionalText(200),
  bodyPl: optionalText(8000),
  bodyEn: optionalText(8000),
  combinedBody: optionalText(20000),
  status: socialPublishingPostStatusSchema.default('draft'),
  scheduledAt: z.string().datetime().nullable().default(null),
  publishedAt: z.string().datetime().nullable().default(null),
  publishingProvider: socialPublishingProviderSchema.nullable().default(null),
  publishedPostId: trimmedString.max(200).nullable().default(null),
  publishedUrl: trimmedString.max(500).nullable().default(null),
  publishingConnectionId: trimmedString.max(160).nullable().default(null),
  brainModelId: trimmedString.max(160).nullable().default(null),
  visionModelId: trimmedString.max(160).nullable().default(null),
  publishError: trimmedString.max(1000).nullable().default(null),
  imageAssets: z.array(imageFileSelectionSchema).max(30).default([]),
  imageAddonIds: z.array(trimmedString.max(160)).max(30).default([]),
  docReferences: z.array(trimmedString.max(240)).max(80).default([]),
  contextSummary: trimmedString.max(8000).nullable().default(null),
  generatedSummary: trimmedString.max(8000).nullable().default(null),
  articleSourcePresetIds: z.array(trimmedString.max(160)).max(80).default([]),
  articleSourceUrls: z.array(trimmedString.max(1000)).max(80).default([]),
  articleScrapeRunId: trimmedString.max(160).nullable().default(null),
  articleIds: z.array(trimmedString.max(160)).max(1000).default([]),
  articleAggregationPrompt: trimmedString.max(12000).nullable().default(null),
  articlePromptPresetId: trimmedString.max(160).nullable().default(null),
  articleAggregationPathId: trimmedString.max(160).nullable().default(null),
  articleAggregationRunId: trimmedString.max(160).nullable().default(null),
  articleAggregationSummary: trimmedString.max(8000).nullable().default(null),
  visualSummary: trimmedString.max(8000).nullable().default(null),
  visualHighlights: z.array(trimmedString.max(400)).max(24).default([]),
  visualAnalysisSourceImageAddonIds: z.array(trimmedString.max(160)).max(30).default([]),
  visualAnalysisSourceVisionModelId: trimmedString.max(160).nullable().default(null),
  visualAnalysisStatus: socialPublishingVisualAnalysisStatusSchema.nullable().default(null),
  visualAnalysisUpdatedAt: z.string().datetime().nullable().default(null),
  visualAnalysisJobId: trimmedString.max(160).nullable().default(null),
  visualAnalysisModelId: trimmedString.max(160).nullable().default(null),
  visualAnalysisError: trimmedString.max(2000).nullable().default(null),
  createdBy: trimmedString.max(120).nullable().default(null),
  updatedBy: trimmedString.max(120).nullable().default(null),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type SocialPublishingPost = z.infer<typeof socialPublishingPostSchema>;

type SocialPublishingPublicationRecord = Pick<
  SocialPublishingPost,
  'status' | 'publishedAt' | 'publishedPostId' | 'publishedUrl'
>;

const hasTrimmedValue = (value?: string | null): boolean =>
  typeof value === 'string' && value.trim().length > 0;

export const hasSocialPublishingPublication = (
  value: SocialPublishingPublicationRecord | null | undefined
): boolean => {
  if (!value) return false;

  return (
    value.status === 'published' ||
    hasTrimmedValue(value.publishedAt) ||
    hasTrimmedValue(value.publishedPostId) ||
    hasTrimmedValue(value.publishedUrl)
  );
};

export const hasSocialPublishingPublicationTarget = (
  value: Pick<SocialPublishingPost, 'publishedPostId' | 'publishedUrl'> | null | undefined
): boolean =>
  Boolean(
    value &&
      (hasTrimmedValue(value.publishedPostId) || hasTrimmedValue(value.publishedUrl))
  );

export type SocialPublishingGeneratedDraft = {
  titlePl: string;
  titleEn: string;
  bodyPl: string;
  bodyEn: string;
  combinedBody: string;
  summary?: string;
  docReferences?: string[];
  visualSummary?: string | null;
  visualHighlights?: SocialPublishingVisualAnalysis['highlights'];
};

export const socialPublishingPostEditorStateSchema = socialPublishingPostSchema.pick({
  titlePl: true,
  titleEn: true,
  bodyPl: true,
  bodyEn: true,
});
export type SocialPublishingPostEditorStateDto = z.infer<
  typeof socialPublishingPostEditorStateSchema
>;

export const socialPublishingPostsSchema = z.array(socialPublishingPostSchema);
export type SocialPublishingPosts = z.infer<typeof socialPublishingPostsSchema>;

export const socialPublishingPostStoreSchema = z.object({
  version: z.number().int().positive().default(1),
  posts: z.array(socialPublishingPostSchema).max(1000).default([]),
});
export type SocialPublishingPostStore = z.infer<typeof socialPublishingPostStoreSchema>;

export type CreateSocialPublishingPostInput = Omit<
  SocialPublishingPost,
  | 'createdAt'
  | 'updatedAt'
  | 'publishingProvider'
  | 'publishedPostId'
  | 'publishedUrl'
  | 'publishedAt'
> & {
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateSocialPublishingPostInput = Partial<CreateSocialPublishingPostInput> & {
  publishedAt?: string | null;
  publishingProvider?: SocialPublishingProvider | null;
  publishedPostId?: string | null;
  publishedUrl?: string | null;
};

export const buildSocialPublishingPostCombinedBody = (
  bodyPl: string,
  bodyEn: string
): string => {
  const pl = bodyPl.trim();
  const en = bodyEn.trim();
  if (!pl && !en) return '';
  if (!pl) return en;
  if (!en) return pl;
  return `${pl}${SOCIAL_PUBLISHING_BILINGUAL_SEPARATOR}${en}`;
};

export const normalizeSocialPublishingPost = (value: SocialPublishingPost): SocialPublishingPost => {
  const parsed = socialPublishingPostSchema.parse(value);
  const visualAnalysis = normalizeSocialPublishingVisualAnalysis({
    summary: parsed.visualSummary,
    highlights: parsed.visualHighlights,
  });
  const combinedBody =
    parsed.combinedBody.trim().length > 0
      ? parsed.combinedBody
      : buildSocialPublishingPostCombinedBody(parsed.bodyPl, parsed.bodyEn);
  return {
    ...parsed,
    combinedBody,
    visualSummary: visualAnalysis.summary || null,
    visualHighlights: visualAnalysis.highlights,
  };
};

export const parseSocialPublishingPostStore = (value: unknown): SocialPublishingPostStore => {
  const parsed = socialPublishingPostStoreSchema.parse(value);
  return {
    ...parsed,
    posts: parsed.posts.map((post) => normalizeSocialPublishingPost(post)),
  };
};

export type SocialPublishingPostListStatus = 'all' | 'draft' | 'scheduled' | 'published' | 'failed';

export type SocialPublishingPostsPageResult = {
  posts: SocialPublishingPost[];
  total: number;
  page: number;
  pageSize: number;
  statusCounts: Record<Exclude<SocialPublishingPostListStatus, 'all'>, number>;
};
