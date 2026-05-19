import { describe, expect, it } from 'vitest';

import {
  buildSocialArticleAggregationContextArticle,
  socialArticleScrapeRequestSchema,
  socialArticleSourcePresetSchema,
  type SocialArticleRecord,
} from '@/shared/contracts/social-article-aggregator';

describe('social article aggregator contract', () => {
  it('keeps source presets global-friendly and defaults robots enforcement on', () => {
    const preset = socialArticleSourcePresetSchema.parse({
      id: 'preset-1',
      name: 'Industry News',
      urls: ['example.com/news', 'https://example.org/articles'],
    });
    const request = socialArticleScrapeRequestSchema.parse({
      sourcePresetIds: [preset.id],
    });

    expect(preset.enabled).toBe(true);
    expect(preset.crawlDepth).toBe(1);
    expect(preset.obeyRobotsTxt).toBe(true);
    expect(preset.playwrightScripterId).toBeNull();
    expect(preset.playwrightScripterMode).toBe('assist');
    expect(request.obeyRobotsTxt).toBe(true);
    expect(request.sourcePresetIds).toEqual(['preset-1']);
  });

  it('accepts source-bound Playwright scripter configuration and run diagnostics', () => {
    const preset = socialArticleSourcePresetSchema.parse({
      id: 'preset-1',
      name: 'Scripted News',
      playwrightScripterId: 'news-scripter',
      playwrightScripterMode: 'replace',
      urls: ['https://example.com/news'],
    });

    expect(preset.playwrightScripterId).toBe('news-scripter');
    expect(preset.playwrightScripterMode).toBe('replace');
  });

  it('builds bounded AI-Path article context from retained articles', () => {
    const article: SocialArticleRecord = {
      id: 'article-1',
      author: 'Author',
      bodyText: 'A'.repeat(21000),
      canonicalUrl: 'https://example.com/article',
      description: 'Description',
      excerpt: 'Excerpt',
      imageUrl: null,
      lastScrapeRunId: 'run-1',
      publishedAt: '2026-05-19',
      rawMetadata: {},
      resolvedUrl: 'https://example.com/article',
      scrapeCount: 1,
      scrapedAt: '2026-05-19T00:00:00.000Z',
      sourcePresetId: 'preset-1',
      sourceUrl: 'https://example.com/news',
      title: 'Article title',
      wordCount: 100,
    };

    const contextArticle = buildSocialArticleAggregationContextArticle(article);

    expect(contextArticle.id).toBe('article-1');
    expect(contextArticle.bodyText).toHaveLength(20000);
    expect(contextArticle.resolvedUrl).toBe('https://example.com/article');
  });
});
