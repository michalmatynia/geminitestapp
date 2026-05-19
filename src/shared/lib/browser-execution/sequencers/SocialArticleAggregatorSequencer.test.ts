import type { Locator, Page } from 'playwright';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  ScrapedSocialArticle,
  SocialArticleScripterDiagnostic,
} from '@/shared/contracts/social-article-aggregator';

import {
  SocialArticleAggregatorSequencer,
  type SocialArticleAggregatorScripterRunOutput,
} from './SocialArticleAggregatorSequencer';

type LocatorMock = Locator & {
  first: ReturnType<typeof vi.fn>;
  isVisible: ReturnType<typeof vi.fn>;
};

const createHiddenLocator = (): LocatorMock => {
  const locator = {
    first: vi.fn(() => locator),
    isVisible: vi.fn(() => Promise.resolve(false)),
  } as unknown as LocatorMock;
  return locator;
};

const createPage = (): Page & {
  goto: ReturnType<typeof vi.fn>;
  waitForLoadState: ReturnType<typeof vi.fn>;
  evaluate: ReturnType<typeof vi.fn>;
  locator: ReturnType<typeof vi.fn>;
  url: ReturnType<typeof vi.fn>;
} => ({
  evaluate: vi.fn(),
  goto: vi.fn(() => Promise.resolve(null)),
  locator: vi.fn(() => createHiddenLocator()),
  url: vi.fn(() => 'https://example.com/current'),
  waitForLoadState: vi.fn(() => Promise.resolve(undefined)),
} as unknown as Page & {
  goto: ReturnType<typeof vi.fn>;
  waitForLoadState: ReturnType<typeof vi.fn>;
  evaluate: ReturnType<typeof vi.fn>;
  locator: ReturnType<typeof vi.fn>;
  url: ReturnType<typeof vi.fn>;
});

const directArticle = (): ScrapedSocialArticle => ({
  author: 'Reporter',
  bodyText: 'Direct article body from scripted extraction.',
  canonicalUrl: 'https://example.com/news/direct',
  description: 'Direct article description.',
  excerpt: 'Direct article body from scripted extraction.',
  imageUrl: null,
  publishedAt: '2026-05-19',
  rawMetadata: { source: 'scripter' },
  resolvedUrl: 'https://example.com/news/direct',
  sourcePresetId: 'preset-1',
  sourceUrl: 'https://example.com/news',
  title: 'Direct scripted article',
  wordCount: 6,
});

const diagnostic = (): SocialArticleScripterDiagnostic => ({
  articleCount: 1,
  candidateCount: 0,
  errors: [],
  mode: 'replace',
  rawRecordCount: 1,
  scripterId: 'news-scripter',
  sourcePresetId: 'preset-1',
  sourceUrl: 'https://example.com/news',
  telemetry: [],
  visitedUrls: ['https://example.com/news'],
  warnings: [],
});

const scriptedOutput = (): SocialArticleAggregatorScripterRunOutput => ({
  articles: [directArticle()],
  candidates: [],
  diagnostic: diagnostic(),
  visitedUrls: ['https://example.com/news'],
  warnings: [],
});

describe('SocialArticleAggregatorSequencer scripter integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lets replace-mode scripters own discovery without opening the generic source page', async () => {
    const page = createPage();
    const emit = vi.fn();
    const runScripter = vi.fn(() => Promise.resolve(scriptedOutput()));
    const sequencer = new SocialArticleAggregatorSequencer(
      { emit, page, runScripter },
      {
        maxArticlesPerSource: 5,
        obeyRobotsTxt: false,
        sources: [
          {
            maxArticles: 5,
            presetId: 'preset-1',
            presetName: 'News',
            playwrightScripterId: 'news-scripter',
            playwrightScripterMode: 'replace',
            url: 'https://example.com/news',
          },
        ],
      }
    );

    await sequencer.scan();

    const resultPayload = emit.mock.calls.find((call) => call[0] === 'result')?.[1];
    expect(runScripter).toHaveBeenCalledWith(
      expect.objectContaining({
        playwrightScripterId: 'news-scripter',
        playwrightScripterMode: 'replace',
        url: 'https://example.com/news',
      }),
      { limit: 15, maxArticleChars: 45000 }
    );
    expect(page.goto).not.toHaveBeenCalled();
    expect(resultPayload).toMatchObject({
      articles: [expect.objectContaining({ title: 'Direct scripted article' })],
      scripterDiagnostics: [expect.objectContaining({ scripterId: 'news-scripter' })],
      status: 'completed',
    });
  });

  it('keeps generic discovery active when the scripter mode is assist', async () => {
    const page = createPage();
    page.evaluate
      .mockResolvedValueOnce({
        author: null,
        bodyText: '',
        canonicalUrl: 'https://example.com/news',
        description: null,
        hasArticleMetadata: false,
        imageUrl: null,
        publishedAt: null,
        title: null,
      })
      .mockResolvedValueOnce([]);
    const runScripter = vi.fn(() => Promise.resolve({
      ...scriptedOutput(),
      articles: [],
      diagnostic: { ...diagnostic(), articleCount: 0, mode: 'assist' },
    }));
    const sequencer = new SocialArticleAggregatorSequencer(
      { emit: vi.fn(), page, runScripter },
      {
        maxArticlesPerSource: 3,
        obeyRobotsTxt: false,
        sources: [
          {
            maxArticles: 3,
            presetId: 'preset-1',
            presetName: 'News',
            playwrightScripterId: 'news-scripter',
            playwrightScripterMode: 'assist',
            url: 'https://example.com/news',
          },
        ],
      }
    );

    await sequencer.scan();

    expect(runScripter).toHaveBeenCalledTimes(1);
    expect(page.goto).toHaveBeenCalledWith('https://example.com/news', {
      timeout: 30000,
      waitUntil: 'domcontentloaded',
    });
    expect(page.evaluate).toHaveBeenCalledTimes(2);
  });

  it('applies source filters to direct articles returned by a scripter', async () => {
    const page = createPage();
    const emit = vi.fn();
    const runScripter = vi.fn(() => Promise.resolve({
      ...scriptedOutput(),
      articles: [
        {
          ...directArticle(),
          canonicalUrl: 'https://example.com/news/allowed-story',
          resolvedUrl: 'https://example.com/news/allowed-story',
          title: 'Allowed scripted article',
        },
        {
          ...directArticle(),
          canonicalUrl: 'https://outside.example/news/offsite-story',
          resolvedUrl: 'https://outside.example/news/offsite-story',
          title: 'Offsite scripted article',
        },
        {
          ...directArticle(),
          canonicalUrl: 'https://example.com/news/private-story',
          resolvedUrl: 'https://example.com/news/private-story',
          title: 'Excluded scripted article',
        },
      ],
      diagnostic: { ...diagnostic(), articleCount: 3 },
    }));
    const sequencer = new SocialArticleAggregatorSequencer(
      { emit, page, runScripter },
      {
        maxArticlesPerSource: 5,
        obeyRobotsTxt: false,
        sources: [
          {
            excludePatterns: ['private'],
            includePatterns: ['/news/'],
            maxArticles: 5,
            presetId: 'preset-1',
            presetName: 'News',
            playwrightScripterId: 'news-scripter',
            playwrightScripterMode: 'replace',
            url: 'https://example.com/news',
          },
        ],
      }
    );

    await sequencer.scan();

    const resultPayload = emit.mock.calls.find((call) => call[0] === 'result')?.[1] as {
      articles: ScrapedSocialArticle[];
      warnings: string[];
    };
    expect(resultPayload.articles.map((article) => article.title)).toEqual([
      'Allowed scripted article',
    ]);
    expect(resultPayload.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('outside source filters'),
      ])
    );
    expect(page.goto).not.toHaveBeenCalled();
  });

  it('falls back to generic discovery when a replace-mode scripter runner is unavailable', async () => {
    const page = createPage();
    page.evaluate
      .mockResolvedValueOnce({
        author: null,
        bodyText: '',
        canonicalUrl: 'https://example.com/news',
        description: null,
        hasArticleMetadata: false,
        imageUrl: null,
        publishedAt: null,
        title: null,
      })
      .mockResolvedValueOnce([]);
    const sequencer = new SocialArticleAggregatorSequencer(
      { emit: vi.fn(), page },
      {
        maxArticlesPerSource: 3,
        obeyRobotsTxt: false,
        sources: [
          {
            maxArticles: 3,
            presetId: 'preset-1',
            presetName: 'News',
            playwrightScripterId: 'news-scripter',
            playwrightScripterMode: 'replace',
            url: 'https://example.com/news',
          },
        ],
      }
    );

    await sequencer.scan();

    expect(page.goto).toHaveBeenCalledWith('https://example.com/news', {
      timeout: 30000,
      waitUntil: 'domcontentloaded',
    });
  });

  it('falls back to generic discovery when a replace-mode scripter reports errors', async () => {
    const page = createPage();
    page.evaluate
      .mockResolvedValueOnce({
        author: null,
        bodyText: '',
        canonicalUrl: 'https://example.com/news',
        description: null,
        hasArticleMetadata: false,
        imageUrl: null,
        publishedAt: null,
        title: null,
      })
      .mockResolvedValueOnce([]);
    const runScripter = vi.fn(() => Promise.resolve({
      ...scriptedOutput(),
      articles: [],
      candidates: [],
      diagnostic: {
        ...diagnostic(),
        articleCount: 0,
        candidateCount: 0,
        errors: ['extract: selector failed'],
        rawRecordCount: 0,
      },
    }));
    const sequencer = new SocialArticleAggregatorSequencer(
      { emit: vi.fn(), page, runScripter },
      {
        maxArticlesPerSource: 3,
        obeyRobotsTxt: false,
        sources: [
          {
            maxArticles: 3,
            presetId: 'preset-1',
            presetName: 'News',
            playwrightScripterId: 'news-scripter',
            playwrightScripterMode: 'replace',
            url: 'https://example.com/news',
          },
        ],
      }
    );

    await sequencer.scan();

    expect(runScripter).toHaveBeenCalledTimes(1);
    expect(page.goto).toHaveBeenCalledWith('https://example.com/news', {
      timeout: 30000,
      waitUntil: 'domcontentloaded',
    });
  });

  it('falls back to generic discovery when a replace-mode scripter returns no usable output', async () => {
    const page = createPage();
    page.evaluate
      .mockResolvedValueOnce({
        author: null,
        bodyText: '',
        canonicalUrl: 'https://example.com/news',
        description: null,
        hasArticleMetadata: false,
        imageUrl: null,
        publishedAt: null,
        title: null,
      })
      .mockResolvedValueOnce([]);
    const runScripter = vi.fn(() => Promise.resolve({
      ...scriptedOutput(),
      articles: [],
      candidates: [],
      diagnostic: {
        ...diagnostic(),
        articleCount: 0,
        candidateCount: 0,
        rawRecordCount: 0,
      },
    }));
    const sequencer = new SocialArticleAggregatorSequencer(
      { emit: vi.fn(), page, runScripter },
      {
        maxArticlesPerSource: 3,
        obeyRobotsTxt: false,
        sources: [
          {
            maxArticles: 3,
            presetId: 'preset-1',
            presetName: 'News',
            playwrightScripterId: 'news-scripter',
            playwrightScripterMode: 'replace',
            url: 'https://example.com/news',
          },
        ],
      }
    );

    await sequencer.scan();

    expect(runScripter).toHaveBeenCalledTimes(1);
    expect(page.goto).toHaveBeenCalledWith('https://example.com/news', {
      timeout: 30000,
      waitUntil: 'domcontentloaded',
    });
  });

  it('honors a source preset robots override when the scrape run globally obeys robots', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response('User-agent: *\nDisallow: /news'))
    );
    vi.stubGlobal('fetch', fetchMock);

    const page = createPage();
    page.evaluate
      .mockResolvedValueOnce({
        author: null,
        bodyText: '',
        canonicalUrl: 'https://example.com/news',
        description: null,
        hasArticleMetadata: false,
        imageUrl: null,
        publishedAt: null,
        title: null,
      })
      .mockResolvedValueOnce([]);

    const sequencer = new SocialArticleAggregatorSequencer(
      { emit: vi.fn(), page },
      {
        maxArticlesPerSource: 3,
        obeyRobotsTxt: true,
        sources: [
          {
            maxArticles: 3,
            obeyRobotsTxt: false,
            presetId: 'preset-1',
            presetName: 'News',
            url: 'https://example.com/news',
          },
        ],
      }
    );

    await sequencer.scan();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(page.goto).toHaveBeenCalledWith('https://example.com/news', {
      timeout: 30000,
      waitUntil: 'domcontentloaded',
    });
  });

  it('uses crawl depth two to discover article links from nested listing pages', async () => {
    const page = createPage();
    let currentUrl = 'https://example.com/news';
    page.url.mockImplementation(() => currentUrl);
    page.goto.mockImplementation((url: string) => {
      currentUrl = url;
      return null;
    });
    page.evaluate
      .mockResolvedValueOnce({
        author: null,
        bodyText: '',
        canonicalUrl: 'https://example.com/news',
        description: null,
        hasArticleMetadata: false,
        imageUrl: null,
        publishedAt: null,
        title: null,
      })
      .mockResolvedValueOnce([
        {
          title: 'AI news listing page',
          url: 'https://example.com/news/ai',
        },
      ])
      .mockResolvedValueOnce([
        {
          title: 'Major AI story headline',
          url: 'https://example.com/news/2026/05/major-ai-story',
        },
      ])
      .mockResolvedValueOnce({
        author: null,
        bodyText: '',
        canonicalUrl: 'https://example.com/news/ai',
        description: null,
        hasArticleMetadata: false,
        imageUrl: null,
        publishedAt: null,
        title: 'AI listing',
      })
      .mockResolvedValueOnce({
        author: 'Reporter',
        bodyText: 'article '.repeat(120),
        canonicalUrl: 'https://example.com/news/2026/05/major-ai-story',
        description: 'Nested story description.',
        hasArticleMetadata: true,
        imageUrl: null,
        publishedAt: '2026-05-19',
        title: 'Major AI story headline',
      });
    const emit = vi.fn();
    const sequencer = new SocialArticleAggregatorSequencer(
      { emit, page },
      {
        maxArticlesPerSource: 3,
        obeyRobotsTxt: false,
        sources: [
          {
            crawlDepth: 2,
            maxArticles: 3,
            presetId: 'preset-1',
            presetName: 'News',
            url: 'https://example.com/news',
          },
        ],
      }
    );

    await sequencer.scan();

    const resultPayload = emit.mock.calls.find((call) => call[0] === 'result')?.[1];
    expect(page.goto).toHaveBeenCalledWith('https://example.com/news/ai', {
      timeout: 30000,
      waitUntil: 'domcontentloaded',
    });
    expect(resultPayload).toMatchObject({
      articles: [
        expect.objectContaining({
          resolvedUrl: 'https://example.com/news/2026/05/major-ai-story',
          title: 'Major AI story headline',
        }),
      ],
      status: 'completed',
    });
  });
});
