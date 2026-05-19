import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getSocialArticleScrapeRunByIdMock,
  resolveSocialPublishingActorMock,
} = vi.hoisted(() => ({
  getSocialArticleScrapeRunByIdMock: vi.fn(),
  resolveSocialPublishingActorMock: vi.fn(),
}));

vi.mock('@/features/filemaker/social/server/social-publishing-actor', () => ({
  resolveSocialPublishingActor: (...args: unknown[]) => resolveSocialPublishingActorMock(...args),
}));

vi.mock('@/features/filemaker/social/server/social-article-aggregator-repository', () => ({
  getSocialArticleScrapeRunById: (...args: unknown[]) =>
    getSocialArticleScrapeRunByIdMock(...args),
}));

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getHandler } from './handler';

const wrappedGetHandler = apiHandlerWithParams<{ runId: string }>(getHandler, {
  source: 'social-article-aggregator.runs.[runId].GET',
  service: 'filemaker.social-publishing.api',
});

const buildRequest = (url: string): Parameters<typeof wrappedGetHandler>[0] =>
  Object.assign(new Request(url), { nextUrl: new URL(url) }) as Parameters<
    typeof wrappedGetHandler
  >[0];

describe('social article scrape run detail handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveSocialPublishingActorMock.mockResolvedValue({
      actorId: 'admin-1',
      role: 'admin',
    });
  });

  it('fetches one scrape run by route parameter', async () => {
    getSocialArticleScrapeRunByIdMock.mockResolvedValue({
      id: 'run-1',
      status: 'completed',
      totalArticleCount: 2,
    });

    const response = await wrappedGetHandler(
      buildRequest('http://localhost/api/filemaker/social-article-aggregator/runs/run-1'),
      { params: { runId: 'run-1' } }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ id: 'run-1', status: 'completed', totalArticleCount: 2 });
    expect(getSocialArticleScrapeRunByIdMock).toHaveBeenCalledWith('run-1');
  });
});
