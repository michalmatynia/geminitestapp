import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createCustomPlaywrightInstanceMock,
  createSocialArticleScrapeRunMock,
  getSocialArticleSourcePresetsByIdsMock,
  runPlaywrightEngineTaskMock,
  upsertScrapedSocialArticlesMock,
  upsertSocialArticleScrapeRunMock,
} = vi.hoisted(() => ({
  createCustomPlaywrightInstanceMock: vi.fn(),
  createSocialArticleScrapeRunMock: vi.fn(),
  getSocialArticleSourcePresetsByIdsMock: vi.fn(),
  runPlaywrightEngineTaskMock: vi.fn(),
  upsertScrapedSocialArticlesMock: vi.fn(),
  upsertSocialArticleScrapeRunMock: vi.fn(),
}));

vi.mock('@/features/playwright/server/instances', () => ({
  createCustomPlaywrightInstance: (...args: unknown[]) =>
    createCustomPlaywrightInstanceMock(...args),
}));

vi.mock('@/features/playwright/server/runtime', () => ({
  runPlaywrightEngineTask: (...args: unknown[]) => runPlaywrightEngineTaskMock(...args),
}));

vi.mock('./social-article-aggregator-repository', () => ({
  createSocialArticleScrapeRun: (...args: unknown[]) =>
    createSocialArticleScrapeRunMock(...args),
  getSocialArticleSourcePresetsByIds: (...args: unknown[]) =>
    getSocialArticleSourcePresetsByIdsMock(...args),
  upsertScrapedSocialArticles: (...args: unknown[]) =>
    upsertScrapedSocialArticlesMock(...args),
  upsertSocialArticleScrapeRun: (...args: unknown[]) =>
    upsertSocialArticleScrapeRunMock(...args),
}));

import { SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_KEY } from '@/shared/lib/browser-execution';

import { runSocialArticleAggregatorScrape } from './social-article-aggregator-scrape';

describe('runSocialArticleAggregatorScrape', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createCustomPlaywrightInstanceMock.mockReturnValue({
      family: 'scrape',
      id: 'instance-1',
    });
    createSocialArticleScrapeRunMock.mockImplementation((run) => Promise.resolve({
      ...run,
      id: 'run-1',
    }));
    upsertSocialArticleScrapeRunMock.mockImplementation((run) => Promise.resolve(run));
  });

  it('forwards normalized preset/custom sources and retains returned articles', async () => {
    getSocialArticleSourcePresetsByIdsMock.mockResolvedValue([
      {
        id: 'preset-1',
        name: 'News',
        urls: ['example.com/news'],
        enabled: true,
        obeyRobotsTxt: true,
        maxArticlesPerSource: 3,
        crawlDepth: 1,
        includePatterns: ['news'],
        excludePatterns: ['privacy'],
      },
    ]);
    runPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'pw-run-1',
      status: 'completed',
      logs: [],
      result: {
        returnValue: {
          articles: [
            {
              author: null,
              bodyText: 'Article body',
              canonicalUrl: 'https://example.com/news/article',
              description: 'Description',
              excerpt: 'Article body',
              imageUrl: null,
              publishedAt: null,
              rawMetadata: {},
              resolvedUrl: 'https://example.com/news/article',
              sourcePresetId: 'preset-1',
              sourceUrl: 'https://example.com/news',
              title: 'Article title',
              wordCount: 2,
            },
          ],
          message: 'Scraped 1 article(s).',
          visitedUrls: ['https://example.com/news'],
          warnings: [],
        },
      },
    });
    upsertScrapedSocialArticlesMock.mockResolvedValue([
      {
        id: 'article-1',
        title: 'Article title',
      },
    ]);

    const result = await runSocialArticleAggregatorScrape({
      customUrls: ['https://custom.example/blog'],
      maxArticlesPerSource: 5,
      obeyRobotsTxt: false,
      sourcePresetIds: ['preset-1'],
    });

    expect(runPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          runtimeKey: SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_KEY,
          input: expect.objectContaining({
            obeyRobotsTxt: false,
            sources: expect.arrayContaining([
              expect.objectContaining({
                excludePatterns: ['privacy'],
                includePatterns: ['news'],
                maxArticles: 3,
                presetId: 'preset-1',
                url: 'https://example.com/news',
              }),
              expect.objectContaining({
                maxArticles: 5,
                presetId: null,
                url: 'https://custom.example/blog',
              }),
            ]),
          }),
        }),
      })
    );
    expect(upsertScrapedSocialArticlesMock).toHaveBeenCalledWith({
      articles: [
        expect.objectContaining({
          resolvedUrl: 'https://example.com/news/article',
          sourcePresetId: 'preset-1',
          title: 'Article title',
        }),
      ],
      runId: 'run-1',
    });
    expect(result.run.status).toBe('completed');
    expect(result.run.articleIds).toEqual(['article-1']);
  });
});
