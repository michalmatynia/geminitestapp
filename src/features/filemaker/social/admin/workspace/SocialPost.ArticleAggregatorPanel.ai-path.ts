import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import type { SocialArticleAggregationContextArticle } from '@/shared/contracts/social-article-aggregator';
import type { SocialPublishingPost } from '@/shared/contracts/social-publishing-posts';
import {
  SOCIAL_ARTICLE_AGGREGATION_PATH_ID,
  SOCIAL_ARTICLE_AGGREGATION_TRIGGER_EVENT,
} from '@/shared/lib/ai-paths/social-article-aggregation';

import { uniqueArticleIds, uniqueTrimmedValues } from './SocialPost.ArticleAggregatorPanel.utils';

export { SOCIAL_ARTICLE_AGGREGATION_TRIGGER_EVENT };

type SocialArticleAggregationAiPathPost = Pick<
  SocialPublishingPost,
  | 'articleAggregationPathId'
  | 'articleAggregationPrompt'
  | 'articleAggregationRunId'
  | 'articleIds'
  | 'articlePromptPresetId'
  | 'articleScrapeRunId'
  | 'articleSourcePresetIds'
  | 'articleSourceUrls'
  | 'bodyEn'
  | 'bodyPl'
  | 'combinedBody'
  | 'contentType'
  | 'contextSummary'
  | 'generatedSummary'
  | 'id'
  | 'status'
  | 'titleEn'
  | 'titlePl'
>;

type BuildSocialArticleAggregationAiPathPayloadInput = {
  articleIds: string[];
  articleRunId: string | null;
  articleWordCount: number;
  articles: SocialArticleAggregationContextArticle[];
  contextCharacterBudget: number;
  createdAt?: string;
  originalCharacterCount: number;
  post: SocialArticleAggregationAiPathPost;
  prompt: string;
  promptPresetId: string | null;
  sourcePresetIds: string[];
  sourceUrls: string[];
};

type SocialArticleAggregationAiPathPayload = {
  contextRegistry: ContextRegistryConsumerEnvelope;
  triggerContext: Record<string, unknown>;
};

type SocialArticleAggregationPathResolution = {
  isDefault: boolean;
  pathId: string;
};

type NormalizedPayloadValues = {
  articleContextText: string;
  articleIds: string[];
  contextCharacterCount: number;
  contextRegistryRefId: string;
  contextTruncated: boolean;
  createdAtIso: string;
  prompt: string;
  sourcePresetIds: string[];
  sourceUrls: string[];
};

const CONTEXT_REGISTRY_ENGINE_VERSION = 'social-article-aggregation:v1';
const EMPTY_ARTICLE_CONTEXT_ERROR =
  'No articles were found. Scrape or select at least one article before generating a post.';

const safeContextRegistryIdSegment = (value: string | null | undefined): string => {
  const normalized = (value ?? '')
    .trim()
    .replace(/[^A-Za-z0-9_.:-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized.length > 0 ? normalized : 'unknown';
};

const line = (label: string, value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? `${label}: ${trimmed}` : null;
};

const formatArticleForContextRegistry = (
  article: SocialArticleAggregationContextArticle,
  index: number
): string => {
  const title = article.title.trim().length > 0 ? article.title.trim() : 'Untitled article';
  const lines = [
    `Article ${index + 1}: ${title}`,
    `ID: ${article.id}`,
    `URL: ${article.resolvedUrl}`,
    `Source: ${article.sourceUrl}`,
    line('Canonical URL', article.canonicalUrl),
    line('Published', article.publishedAt),
    line('Author', article.author),
    line('Description', article.description),
    line('Excerpt', article.excerpt),
    `Body:\n${article.bodyText.trim()}`,
  ];
  return lines.filter((entry): entry is string => entry !== null).join('\n');
};

const buildArticleItems = (
  articles: SocialArticleAggregationContextArticle[]
): Array<Record<string, unknown>> =>
  articles.map((article) => ({
    bodyCharacterCount: article.bodyText.length,
    canonicalUrl: article.canonicalUrl,
    id: article.id,
    publishedAt: article.publishedAt,
    resolvedUrl: article.resolvedUrl,
    sourceUrl: article.sourceUrl,
    title: article.title,
  }));

const buildPostEntitySnapshot = (
  post: SocialArticleAggregationAiPathPost
): Record<string, unknown> => ({
  articleAggregationPathId: post.articleAggregationPathId,
  articleAggregationPrompt: post.articleAggregationPrompt,
  articleAggregationRunId: post.articleAggregationRunId,
  articleIds: post.articleIds,
  articlePromptPresetId: post.articlePromptPresetId,
  articleScrapeRunId: post.articleScrapeRunId,
  articleSourcePresetIds: post.articleSourcePresetIds,
  articleSourceUrls: post.articleSourceUrls,
  bodyEn: post.bodyEn,
  bodyPl: post.bodyPl,
  combinedBody: post.combinedBody,
  contentType: post.contentType,
  contextSummary: post.contextSummary,
  generatedSummary: post.generatedSummary,
  id: post.id,
  status: post.status,
  titleEn: post.titleEn,
  titlePl: post.titlePl,
});

const normalizePayloadValues = (
  input: BuildSocialArticleAggregationAiPathPayloadInput
): NormalizedPayloadValues => {
  const contextCharacterCount = input.articles.reduce(
    (sum, article) => sum + article.bodyText.length,
    0
  );
  return {
    articleContextText: input.articles
      .map((article, index) => formatArticleForContextRegistry(article, index))
      .join('\n\n---\n\n'),
    articleIds: uniqueArticleIds(
      input.articleIds.length > 0
        ? input.articleIds
        : input.articles.map((article) => article.id)
    ),
    contextCharacterCount,
    contextRegistryRefId: [
      'runtime',
      'social-article-aggregation',
      safeContextRegistryIdSegment(input.post.id),
      safeContextRegistryIdSegment(input.articleRunId ?? 'draft'),
    ].join(':'),
    contextTruncated:
      input.originalCharacterCount > input.contextCharacterBudget ||
      contextCharacterCount < input.originalCharacterCount,
    createdAtIso: input.createdAt ?? new Date().toISOString(),
    prompt: input.prompt.trim(),
    sourcePresetIds: uniqueTrimmedValues(input.sourcePresetIds),
    sourceUrls: uniqueTrimmedValues(input.sourceUrls),
  };
};

const buildTriggerContext = (
  input: BuildSocialArticleAggregationAiPathPayloadInput,
  normalized: NormalizedPayloadValues
): Record<string, unknown> => ({
  articleCharacterCount: input.originalCharacterCount,
  articleCount: input.articles.length,
  articleIds: normalized.articleIds,
  articleRunId: input.articleRunId,
  articleWordCount: input.articleWordCount,
  articles: input.articles,
  contentType: 'article-aggregator',
  contextCharacterBudget: input.contextCharacterBudget,
  contextCharacterCount: normalized.contextCharacterCount,
  contextRegistryRefId: normalized.contextRegistryRefId,
  contextTruncated: normalized.contextTruncated,
  entityId: input.post.id,
  entityJson: buildPostEntitySnapshot(input.post),
  entityType: 'social-publishing-post',
  graphWorkflow: SOCIAL_ARTICLE_AGGREGATION_TRIGGER_EVENT,
  language: 'en',
  mode: SOCIAL_ARTICLE_AGGREGATION_TRIGGER_EVENT,
  postId: input.post.id,
  prompt: normalized.prompt,
  promptPresetId: input.promptPresetId,
  sourcePresetIds: normalized.sourcePresetIds,
  sourceUrls: normalized.sourceUrls,
  workflow: SOCIAL_ARTICLE_AGGREGATION_TRIGGER_EVENT,
});

const buildContextRegistry = (
  input: BuildSocialArticleAggregationAiPathPayloadInput,
  normalized: NormalizedPayloadValues
): ContextRegistryConsumerEnvelope => {
  const ref = {
    entityType: 'social-publishing-post',
    id: normalized.contextRegistryRefId,
    kind: 'runtime_document' as const,
    providerId: 'social-article-aggregator',
  };
  return {
    engineVersion: CONTEXT_REGISTRY_ENGINE_VERSION,
    refs: [ref],
    resolved: {
      documents: [
        {
          entityType: 'social-publishing-post',
          facts: buildDocumentFacts(input, normalized),
          id: normalized.contextRegistryRefId,
          kind: 'runtime_document',
          provenance: {
            articleRunId: input.articleRunId,
            source: 'social_article_aggregator_panel',
            workflow: SOCIAL_ARTICLE_AGGREGATION_TRIGGER_EVENT,
          },
          relatedNodeIds: [],
          sections: buildDocumentSections(input, normalized),
          status: 'ready',
          summary: `Article aggregation context for ${input.articles.length} selected article${input.articles.length === 1 ? '' : 's'}.`,
          tags: ['social-publishing', 'article-aggregator', 'ai-paths'],
          timestamps: { createdAt: normalized.createdAtIso },
          title: `Social article aggregation for ${input.post.id}`,
        },
      ],
      engineVersion: CONTEXT_REGISTRY_ENGINE_VERSION,
      nodes: [],
      refs: [ref],
      truncated: normalized.contextTruncated,
    },
  };
};

const buildDocumentFacts = (
  input: BuildSocialArticleAggregationAiPathPayloadInput,
  normalized: NormalizedPayloadValues
): Record<string, unknown> => ({
  articleCharacterCount: input.originalCharacterCount,
  articleCount: input.articles.length,
  articleIds: normalized.articleIds,
  articleRunId: input.articleRunId,
  articleWordCount: input.articleWordCount,
  contextCharacterBudget: input.contextCharacterBudget,
  contextCharacterCount: normalized.contextCharacterCount,
  contextTruncated: normalized.contextTruncated,
  postId: input.post.id,
  promptPresetId: input.promptPresetId,
  sourcePresetIds: normalized.sourcePresetIds,
  sourceUrls: normalized.sourceUrls,
  workflow: SOCIAL_ARTICLE_AGGREGATION_TRIGGER_EVENT,
});

const buildDocumentSections = (
  input: BuildSocialArticleAggregationAiPathPayloadInput,
  normalized: NormalizedPayloadValues
): NonNullable<ContextRegistryConsumerEnvelope['resolved']>['documents'][number]['sections'] => [
  {
    kind: 'text',
    text: normalized.prompt,
    title: 'Aggregation prompt',
  },
  {
    kind: 'text',
    summary: `${input.articles.length} selected article${input.articles.length === 1 ? '' : 's'} for social post generation.`,
    text: normalized.articleContextText,
    title: 'Selected article context',
  },
  {
    items: buildArticleItems(input.articles),
    kind: 'items',
    title: 'Selected article index',
  },
];

export const buildSocialArticleAggregationAiPathPayload = (
  input: BuildSocialArticleAggregationAiPathPayloadInput
): SocialArticleAggregationAiPathPayload => {
  if (input.articles.length === 0) {
    throw new Error(EMPTY_ARTICLE_CONTEXT_ERROR);
  }
  const normalized = normalizePayloadValues(input);
  return {
    contextRegistry: buildContextRegistry(input, normalized),
    triggerContext: buildTriggerContext(input, normalized),
  };
};

export const resolveSocialArticleAggregationPathId = (
  configuredPathId: string | null | undefined
): SocialArticleAggregationPathResolution => {
  const trimmed = configuredPathId?.trim() ?? '';
  if (trimmed.length > 0) {
    return {
      isDefault: false,
      pathId: trimmed,
    };
  }
  return {
    isDefault: true,
    pathId: SOCIAL_ARTICLE_AGGREGATION_PATH_ID,
  };
};
