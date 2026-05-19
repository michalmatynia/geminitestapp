import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  listSocialArticleScrapeRunsMock,
  resolveSocialPublishingActorMock,
} = vi.hoisted(() => ({
  listSocialArticleScrapeRunsMock: vi.fn(),
  resolveSocialPublishingActorMock: vi.fn(),
}));

vi.mock('@/features/filemaker/social/server/social-publishing-actor', () => ({
  resolveSocialPublishingActor: (...args: unknown[]) => resolveSocialPublishingActorMock(...args),
}));

vi.mock('@/features/filemaker/social/server/social-article-aggregator-repository', () => ({
  listSocialArticleScrapeRuns: (...args: unknown[]) => listSocialArticleScrapeRunsMock(...args),
}));

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler } from './handler';

const wrappedGetHandler = apiHandler(getHandler, {
  source: 'social-article-aggregator.runs.GET',
  service: 'filemaker.social-publishing.api',
});

const buildRequest = (url: string): Parameters<typeof wrappedGetHandler>[0] =>
  Object.assign(new Request(url), { nextUrl: new URL(url) }) as Parameters<
    typeof wrappedGetHandler
  >[0];

describe('social article scrape runs handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveSocialPublishingActorMock.mockResolvedValue({
      actorId: 'admin-1',
      role: 'admin',
    });
  });

  it('lists recent scrape runs for admins', async () => {
    listSocialArticleScrapeRunsMock.mockResolvedValue([
      { id: 'run-1', status: 'completed', totalArticleCount: 2 },
    ]);

    const response = await wrappedGetHandler(
      buildRequest('http://localhost/api/filemaker/social-article-aggregator/runs?limit=12')
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual([{ id: 'run-1', status: 'completed', totalArticleCount: 2 }]);
    expect(listSocialArticleScrapeRunsMock).toHaveBeenCalledWith({ limit: 12 });
  });
});
