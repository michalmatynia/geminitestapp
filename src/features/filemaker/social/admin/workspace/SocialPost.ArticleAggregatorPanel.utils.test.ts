import { describe, expect, it } from 'vitest';

import type {
  SocialArticleAggregationContextArticle,
  SocialArticleRecord,
} from '@/shared/contracts/social-article-aggregator';
import { SOCIAL_ARTICLE_AGGREGATION_PATH_ID } from '@/shared/lib/ai-paths/social-article-aggregation';

import {
  buildSocialArticleAggregationAiPathPayload,
  resolveSocialArticleAggregationPathId,
  SOCIAL_ARTICLE_AGGREGATION_TRIGGER_EVENT,
} from './SocialPost.ArticleAggregatorPanel.ai-path';
import {
  buildRetainedArticleLoadState,
  deriveArticleSourcePresetIds,
  deriveArticleSourceUrls,
  deriveScrapeResultSourceMetadata,
  mergeArticleRecordsById,
  splitLooseUrls,
  uniqueArticleIds,
} from './SocialPost.ArticleAggregatorPanel.utils';

const buildArticle = (
  id: string,
  overrides: Partial<SocialArticleRecord> = {}
): SocialArticleRecord => ({
  author: null,
  bodyText: '',
  canonicalUrl: null,
  description: null,
  excerpt: null,
  id,
  imageUrl: null,
  lastScrapeRunId: null,
  publishedAt: null,
  rawMetadata: {},
  resolvedUrl: `https://example.com/${id}`,
  scrapeCount: 1,
  scrapedAt: '2026-05-19T12:00:00.000Z',
  sourcePresetId: null,
  sourceUrl: `https://source.example.com/${id}`,
  title: id,
  wordCount: 0,
  ...overrides,
});

const buildContextArticle = (
  id: string,
  overrides: Partial<SocialArticleAggregationContextArticle> = {}
): SocialArticleAggregationContextArticle => ({
  author: null,
  bodyText: `Body for ${id}`,
  canonicalUrl: null,
  description: null,
  excerpt: null,
  id,
  publishedAt: null,
  resolvedUrl: `https://example.com/articles/${id}`,
  sourceUrl: `https://source.example.com/${id}`,
  title: `Title ${id}`,
  ...overrides,
});

const buildPost = () => ({
  articleAggregationPathId: null,
  articleAggregationPrompt: null,
  articleAggregationRunId: null,
  articleIds: [],
  articlePromptPresetId: null,
  articleScrapeRunId: null,
  articleSourcePresetIds: [],
  articleSourceUrls: [],
  bodyEn: '',
  bodyPl: '',
  combinedBody: '',
  contentType: 'social-pipeline' as const,
  contextSummary: null,
  generatedSummary: null,
  id: 'post-1',
  status: 'draft' as const,
  titleEn: '',
  titlePl: '',
});

describe('SocialPost.ArticleAggregatorPanel utils', () => {
  it('splits pasted URL lists and removes duplicates', () => {
    expect(
      splitLooseUrls(' https://one.example.com/news,\nhttps://two.example.com\nhttps://one.example.com/news ')
    ).toEqual(['https://one.example.com/news', 'https://two.example.com']);
  });

  it('derives source presets from article records before using explicit fallback values', () => {
    expect(
      deriveArticleSourcePresetIds(
        [
          buildArticle('one', { sourcePresetId: 'preset-a' }),
          buildArticle('two', { sourcePresetId: 'preset-b' }),
          buildArticle('three', { sourcePresetId: 'preset-a' }),
        ],
        ['fallback-preset']
      )
    ).toEqual(['preset-a', 'preset-b']);

    expect(deriveArticleSourcePresetIds([buildArticle('no-preset')], ['fallback-preset'])).toEqual([
      'fallback-preset',
    ]);
  });

  it('derives source URLs from article records before using explicit fallback URLs', () => {
    expect(
      deriveArticleSourceUrls(
        [
          buildArticle('one', { sourceUrl: 'https://source-a.example.com' }),
          buildArticle('two', { sourceUrl: 'https://source-b.example.com' }),
          buildArticle('three', { sourceUrl: 'https://source-a.example.com' }),
        ],
        ['https://fallback.example.com']
      )
    ).toEqual(['https://source-a.example.com', 'https://source-b.example.com']);
  });

  it('uses scrape run metadata instead of stale selected presets when no articles are returned', () => {
    expect(
      deriveScrapeResultSourceMetadata({
        articles: [],
        fallbackSourcePresetIds: ['disabled-preset'],
        fallbackSourceUrls: ['https://stale.example.com'],
        run: {
          customUrls: ['https://custom.example.com/news'],
          sourcePresetIds: [],
        },
      })
    ).toEqual({
      sourcePresetIds: [],
      sourceUrls: ['https://custom.example.com/news'],
    });
  });

  it('keeps article-derived metadata first and uses scrape run values as fallback', () => {
    expect(
      deriveScrapeResultSourceMetadata({
        articles: [
          buildArticle('one', {
            sourcePresetId: 'preset-a',
            sourceUrl: 'https://source-a.example.com',
          }),
        ],
        fallbackSourcePresetIds: ['stale-preset'],
        fallbackSourceUrls: ['https://stale.example.com'],
        run: {
          customUrls: ['https://run-custom.example.com'],
          sourcePresetIds: ['preset-from-run'],
        },
      })
    ).toEqual({
      sourcePresetIds: ['preset-a'],
      sourceUrls: ['https://source-a.example.com'],
    });
  });

  it('merges appended article pages by id while preserving the working set order', () => {
    const original = buildArticle('article-1', { title: 'Original title' });
    const updated = buildArticle('article-1', { title: 'Updated title' });
    const appended = buildArticle('article-2', { title: 'Second title' });

    expect(mergeArticleRecordsById([original], [updated, appended])).toEqual([
      updated,
      appended,
    ]);
  });

  it('deduplicates article IDs without the source metadata cap', () => {
    const ids = Array.from({ length: 125 }, (_, index) => `article-${index}`);
    expect(uniqueArticleIds([...ids, 'article-12', 'article-124'])).toHaveLength(125);
    expect(uniqueArticleIds([...ids, 'article-12', 'article-124']).at(-1)).toBe('article-124');
  });

  it('resolves the default AI Path when no Article Aggregator path is configured', () => {
    expect(resolveSocialArticleAggregationPathId(null)).toEqual({
      isDefault: true,
      pathId: SOCIAL_ARTICLE_AGGREGATION_PATH_ID,
    });
    expect(resolveSocialArticleAggregationPathId('  ')).toEqual({
      isDefault: true,
      pathId: SOCIAL_ARTICLE_AGGREGATION_PATH_ID,
    });
    expect(resolveSocialArticleAggregationPathId(' custom-path ')).toEqual({
      isDefault: false,
      pathId: 'custom-path',
    });
  });

  it('rejects AI Paths payload creation when no articles are selected', () => {
    expect(() =>
      buildSocialArticleAggregationAiPathPayload({
        articleIds: [],
        articleRunId: 'run-empty',
        articleWordCount: 0,
        articles: [],
        contextCharacterBudget: 60,
        createdAt: '2026-05-19T12:00:00.000Z',
        originalCharacterCount: 0,
        post: buildPost(),
        prompt: 'Write a post.',
        promptPresetId: null,
        sourcePresetIds: [],
        sourceUrls: [],
      })
    ).toThrow(/No articles were found/i);
  });

  it('builds an AI Paths trigger payload and context registry document for selected articles', () => {
    const payload = buildSocialArticleAggregationAiPathPayload({
      articleIds: ['article-1', 'article-2', 'article-1'],
      articleRunId: 'run-1',
      articleWordCount: 42,
      articles: [
        buildContextArticle('article-1', {
          bodyText: 'Article one body',
          sourceUrl: 'https://source-a.example.com',
        }),
        buildContextArticle('article-2', {
          bodyText: 'Article two body',
          sourceUrl: 'https://source-b.example.com',
        }),
      ],
      contextCharacterBudget: 60,
      createdAt: '2026-05-19T12:00:00.000Z',
      originalCharacterCount: 120,
      post: buildPost(),
      prompt: ' Summarize these articles. ',
      promptPresetId: 'prompt-1',
      sourcePresetIds: ['preset-a', 'preset-a'],
      sourceUrls: ['https://source-a.example.com', 'https://source-b.example.com'],
    });

    expect(payload.triggerContext).toMatchObject({
      articleCount: 2,
      articleIds: ['article-1', 'article-2'],
      articleRunId: 'run-1',
      contentType: 'article-aggregator',
      contextCharacterBudget: 60,
      contextTruncated: true,
      entityId: 'post-1',
      entityType: 'social-publishing-post',
      graphWorkflow: SOCIAL_ARTICLE_AGGREGATION_TRIGGER_EVENT,
      mode: SOCIAL_ARTICLE_AGGREGATION_TRIGGER_EVENT,
      prompt: 'Summarize these articles.',
      promptPresetId: 'prompt-1',
      sourcePresetIds: ['preset-a'],
      sourceUrls: ['https://source-a.example.com', 'https://source-b.example.com'],
    });
    expect(payload.triggerContext['entityJson']).toMatchObject({
      id: 'post-1',
      status: 'draft',
    });
    expect(payload.contextRegistry.refs).toEqual([
      {
        entityType: 'social-publishing-post',
        id: 'runtime:social-article-aggregation:post-1:run-1',
        kind: 'runtime_document',
        providerId: 'social-article-aggregator',
      },
    ]);
    expect(payload.contextRegistry.resolved?.documents[0]).toMatchObject({
      facts: {
        articleCount: 2,
        contextTruncated: true,
        sourceUrls: ['https://source-a.example.com', 'https://source-b.example.com'],
      },
      id: 'runtime:social-article-aggregation:post-1:run-1',
      status: 'ready',
    });
    expect(payload.contextRegistry.resolved?.documents[0]?.sections?.[1]?.text).toContain(
      'Article one body'
    );
  });

  it('builds retained replace state from the incoming page only', () => {
    const incoming = [
      buildArticle('incoming-1', {
        sourcePresetId: 'preset-a',
        sourceUrl: 'https://source-a.example.com',
      }),
      buildArticle('incoming-2', {
        sourcePresetId: 'preset-b',
        sourceUrl: 'https://source-b.example.com',
      }),
    ];

    expect(
      buildRetainedArticleLoadState({
        append: false,
        currentArticles: [buildArticle('existing-1')],
        currentSelectedArticleIds: ['existing-1'],
        fallbackSourcePresetIds: ['fallback-preset'],
        incomingArticles: incoming,
        offset: 50,
        total: 75,
      })
    ).toMatchObject({
      articles: incoming,
      selectedArticleIds: ['incoming-1', 'incoming-2'],
      sourcePresetIds: ['preset-a', 'preset-b'],
      sourceUrls: ['https://source-a.example.com', 'https://source-b.example.com'],
      status: 'Loaded retained articles 51-52 of 75.',
    });
  });

  it('builds retained append state with merged articles and selected metadata', () => {
    const existing = buildArticle('existing-1', {
      sourcePresetId: 'preset-existing',
      sourceUrl: 'https://existing.example.com',
    });
    const updatedExisting = buildArticle('existing-1', {
      sourcePresetId: 'preset-updated',
      sourceUrl: 'https://updated.example.com',
      title: 'Updated existing',
    });
    const incoming = buildArticle('incoming-1', {
      sourcePresetId: 'preset-incoming',
      sourceUrl: 'https://incoming.example.com',
    });

    expect(
      buildRetainedArticleLoadState({
        append: true,
        currentArticles: [existing],
        currentSelectedArticleIds: ['existing-1'],
        incomingArticles: [updatedExisting, incoming],
        offset: 50,
        total: 80,
      })
    ).toMatchObject({
      articles: [updatedExisting, incoming],
      selectedArticleIds: ['existing-1', 'incoming-1'],
      sourcePresetIds: ['preset-updated', 'preset-incoming'],
      sourceUrls: ['https://updated.example.com', 'https://incoming.example.com'],
      status: 'Appended retained articles 51-52 of 80; 2 articles in working set.',
    });
  });

  it('keeps the working set unchanged when appending an empty retained page', () => {
    const existing = buildArticle('existing-1', {
      sourcePresetId: 'preset-existing',
      sourceUrl: 'https://existing.example.com',
    });

    expect(
      buildRetainedArticleLoadState({
        append: true,
        currentArticles: [existing],
        currentSelectedArticleIds: ['existing-1'],
        incomingArticles: [],
        offset: 100,
        total: 100,
      })
    ).toMatchObject({
      articles: [existing],
      selectedArticleIds: ['existing-1'],
      sourcePresetIds: ['preset-existing'],
      sourceUrls: ['https://existing.example.com'],
      status: 'No retained articles loaded for this page; working set unchanged.',
    });
  });
});
