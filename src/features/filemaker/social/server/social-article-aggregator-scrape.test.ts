import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createCustomPlaywrightInstanceMock,
  createSocialArticleScrapeRunMock,
  getSocialArticleSourcePresetsByIdsMock,
  getDefaultScripterRegistryMock,
  scripterRegistryGetMock,
  runPlaywrightEngineTaskMock,
  upsertScrapedSocialArticlesMock,
  upsertSocialArticleScrapeRunMock,
} = vi.hoisted(() => ({
  createCustomPlaywrightInstanceMock: vi.fn(),
  createSocialArticleScrapeRunMock: vi.fn(),
  getDefaultScripterRegistryMock: vi.fn(),
  getSocialArticleSourcePresetsByIdsMock: vi.fn(),
  runPlaywrightEngineTaskMock: vi.fn(),
  scripterRegistryGetMock: vi.fn(),
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

vi.mock('@/features/playwright/scripters/public', () => ({
  getDefaultScripterRegistry: (...args: unknown[]) =>
    getDefaultScripterRegistryMock(...args),
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
    getDefaultScripterRegistryMock.mockReturnValue({
      get: (...args: unknown[]) => scripterRegistryGetMock(...args),
    });
    scripterRegistryGetMock.mockResolvedValue(null);
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
        playwrightScripterId: 'news-scripter',
        playwrightScripterMode: 'replace',
      },
    ]);
    scripterRegistryGetMock.mockResolvedValue({
      id: 'news-scripter',
      version: 1,
      siteHost: 'example.com',
      entryUrl: 'https://example.com/news',
      steps: [
        { id: 'open', kind: 'goto', url: 'https://example.com/news' },
      ],
      fieldMap: {
        bindings: {
          sourceUrl: { path: 'url' },
          title: { path: 'title' },
        },
      },
    });
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
          scripterDiagnostics: [
            {
              articleCount: 0,
              candidateCount: 1,
              errors: [],
              mode: 'replace',
              rawRecordCount: 1,
              scripterId: 'news-scripter',
              sourcePresetId: 'preset-1',
              sourceUrl: 'https://example.com/news',
              telemetry: [],
              visitedUrls: ['https://example.com/news'],
              warnings: [],
            },
          ],
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
                crawlDepth: 1,
                excludePatterns: ['privacy'],
                includePatterns: ['news'],
                maxArticles: 3,
                obeyRobotsTxt: true,
                presetId: 'preset-1',
                playwrightScripterDefinition: expect.objectContaining({
                  id: 'news-scripter',
                }),
                playwrightScripterId: 'news-scripter',
                playwrightScripterMode: 'replace',
                url: 'https://example.com/news',
              }),
              expect.objectContaining({
                crawlDepth: 1,
                maxArticles: 5,
                obeyRobotsTxt: true,
                presetId: null,
                playwrightScripterDefinition: null,
                playwrightScripterId: null,
                playwrightScripterMode: 'assist',
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
    expect(result.run.customUrls).toEqual(['https://custom.example/blog']);
    expect(result.run.sourcePresetIds).toEqual(['preset-1']);
    expect(result.run.scripterDiagnostics).toHaveLength(1);
  });

  it('skips disabled source presets when building the scrape plan', async () => {
    getSocialArticleSourcePresetsByIdsMock.mockResolvedValue([
      {
        id: 'disabled-preset',
        name: 'Disabled News',
        urls: ['https://disabled.example/news'],
        enabled: false,
        obeyRobotsTxt: true,
        maxArticlesPerSource: 3,
        crawlDepth: 2,
        includePatterns: [],
        excludePatterns: [],
        playwrightScripterId: 'disabled-scripter',
        playwrightScripterMode: 'replace',
      },
    ]);
    runPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'pw-run-2',
      status: 'completed',
      logs: [],
      result: {
        returnValue: {
          articles: [],
          message: 'Scraped 0 article(s).',
          scripterDiagnostics: [],
          visitedUrls: [],
          warnings: [],
        },
      },
    });
    upsertScrapedSocialArticlesMock.mockResolvedValue([]);

    const result = await runSocialArticleAggregatorScrape({
      customUrls: ['https://custom.example/blog'],
      maxArticlesPerSource: 5,
      obeyRobotsTxt: true,
      sourcePresetIds: ['disabled-preset'],
    });

    expect(getDefaultScripterRegistryMock).not.toHaveBeenCalled();
    expect(createSocialArticleScrapeRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sourcePresetIds: [],
      })
    );
    expect(runPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          input: expect.objectContaining({
            sources: [
              expect.objectContaining({
                presetId: null,
                url: 'https://custom.example/blog',
              }),
            ],
          }),
        }),
      })
    );
    expect(result.run.sourcePresetIds).toEqual([]);
  });

  it('records only executable custom URLs after source de-duplication', async () => {
    getSocialArticleSourcePresetsByIdsMock.mockResolvedValue([
      {
        id: 'preset-1',
        name: 'News',
        urls: ['https://example.com/news'],
        enabled: true,
        obeyRobotsTxt: true,
        maxArticlesPerSource: 3,
        crawlDepth: 1,
        includePatterns: [],
        excludePatterns: [],
        playwrightScripterId: null,
        playwrightScripterMode: 'assist',
      },
    ]);
    runPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'pw-run-3',
      status: 'completed',
      logs: [],
      result: {
        returnValue: {
          articles: [],
          message: 'Scraped 0 article(s).',
          scripterDiagnostics: [],
          visitedUrls: [],
          warnings: [],
        },
      },
    });
    upsertScrapedSocialArticlesMock.mockResolvedValue([]);

    const result = await runSocialArticleAggregatorScrape({
      customUrls: ['https://example.com/news'],
      maxArticlesPerSource: 5,
      obeyRobotsTxt: true,
      sourcePresetIds: ['preset-1'],
    });

    expect(createSocialArticleScrapeRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customUrls: [],
        sourcePresetIds: ['preset-1'],
      })
    );
    expect(runPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          input: expect.objectContaining({
            sources: [
              expect.objectContaining({
                presetId: 'preset-1',
                url: 'https://example.com/news',
              }),
            ],
          }),
        }),
      })
    );
    expect(result.run.customUrls).toEqual([]);
    expect(result.run.sourcePresetIds).toEqual(['preset-1']);
    expect(result.run.message).toBe(
      'No articles were found. Post generation requires at least one scraped article.'
    );
    expect(result.run.warnings).toContain(
      'No articles were found. Post generation requires at least one scraped article.'
    );
  });
});
