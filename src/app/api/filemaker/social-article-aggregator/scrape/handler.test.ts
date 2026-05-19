import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  resolveSocialPublishingActorMock,
  runSocialArticleAggregatorScrapeMock,
} = vi.hoisted(() => ({
  resolveSocialPublishingActorMock: vi.fn(),
  runSocialArticleAggregatorScrapeMock: vi.fn(),
}));

vi.mock('@/features/filemaker/social/server/social-publishing-actor', () => ({
  resolveSocialPublishingActor: (...args: unknown[]) => resolveSocialPublishingActorMock(...args),
}));

vi.mock('@/features/filemaker/social/server/social-article-aggregator-scrape', () => ({
  runSocialArticleAggregatorScrape: (...args: unknown[]) =>
    runSocialArticleAggregatorScrapeMock(...args),
}));

import { apiHandler } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

const wrappedPostHandler = apiHandler(postHandler, {
  source: 'social-article-aggregator.scrape.POST',
  service: 'filemaker.social-publishing.api',
  parseJsonBody: true,
});

const buildRequest = (body: unknown): Parameters<typeof wrappedPostHandler>[0] => {
  const url = 'http://localhost/api/filemaker/social-article-aggregator/scrape';
  return Object.assign(
    new Request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { nextUrl: new URL(url) }
  ) as Parameters<typeof wrappedPostHandler>[0];
};

describe('social article scrape handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveSocialPublishingActorMock.mockResolvedValue({
      actorId: 'admin-1',
      role: 'admin',
    });
  });

  it('runs the article scraper with the request payload', async () => {
    runSocialArticleAggregatorScrapeMock.mockResolvedValue({
      articles: [],
      run: {
        id: 'run-1',
        articleIds: [],
        customUrls: ['https://example.com/news'],
        error: null,
        finishedAt: '2026-05-19T00:00:00.000Z',
        maxArticlesPerSource: 5,
        message: 'Scraped 0 article(s).',
        obeyRobotsTxt: false,
        playwrightRunId: 'pw-1',
        sourcePresetIds: [],
        startedAt: '2026-05-19T00:00:00.000Z',
        status: 'completed',
        totalArticleCount: 0,
        visitedUrls: [],
        warnings: [],
      },
    });

    const response = await wrappedPostHandler(
      buildRequest({
        customUrls: ['https://example.com/news'],
        maxArticlesPerSource: 5,
        obeyRobotsTxt: false,
        sourcePresetIds: [],
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.run.id).toBe('run-1');
    expect(runSocialArticleAggregatorScrapeMock).toHaveBeenCalledWith({
      customUrls: ['https://example.com/news'],
      maxArticlesPerSource: 5,
      obeyRobotsTxt: false,
      sourcePresetIds: [],
    });
  });
});
