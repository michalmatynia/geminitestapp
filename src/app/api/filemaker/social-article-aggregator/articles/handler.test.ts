import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  listSocialArticlesByIdsMock,
  listSocialArticlesMock,
  resolveSocialPublishingActorMock,
} = vi.hoisted(() => ({
  listSocialArticlesByIdsMock: vi.fn(),
  listSocialArticlesMock: vi.fn(),
  resolveSocialPublishingActorMock: vi.fn(),
}));

vi.mock('@/features/filemaker/social/server/social-publishing-actor', () => ({
  resolveSocialPublishingActor: (...args: unknown[]) => resolveSocialPublishingActorMock(...args),
}));

vi.mock('@/features/filemaker/social/server/social-article-aggregator-repository', () => ({
  listSocialArticles: (...args: unknown[]) => listSocialArticlesMock(...args),
  listSocialArticlesByIds: (...args: unknown[]) => listSocialArticlesByIdsMock(...args),
}));

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler } from './handler';

const wrappedGetHandler = apiHandler(getHandler, {
  source: 'social-article-aggregator.articles.GET',
  service: 'filemaker.social-publishing.api',
});

const buildRequest = (url: string): Parameters<typeof wrappedGetHandler>[0] =>
  Object.assign(new Request(url), { nextUrl: new URL(url) }) as Parameters<
    typeof wrappedGetHandler
  >[0];

describe('social article record handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveSocialPublishingActorMock.mockResolvedValue({
      actorId: 'admin-1',
      role: 'admin',
    });
  });

  it('fetches retained articles by ids', async () => {
    listSocialArticlesByIdsMock.mockResolvedValue([
      { id: 'article-1', title: 'First article' },
      { id: 'article-2', title: 'Second article' },
    ]);

    const response = await wrappedGetHandler(
      buildRequest(
        'http://localhost/api/filemaker/social-article-aggregator/articles?ids=article-1,%20article-2'
      )
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual([
      { id: 'article-1', title: 'First article' },
      { id: 'article-2', title: 'Second article' },
    ]);
    expect(listSocialArticlesByIdsMock).toHaveBeenCalledWith(['article-1', 'article-2']);
    expect(listSocialArticlesMock).not.toHaveBeenCalled();
  });

  it('lists retained articles with paging and search', async () => {
    listSocialArticlesMock.mockResolvedValue({
      articles: [{ id: 'article-1', title: 'AI article' }],
      total: 1,
    });

    const response = await wrappedGetHandler(
      buildRequest(
        'http://localhost/api/filemaker/social-article-aggregator/articles?limit=25&offset=5&search=ai'
      )
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      articles: [{ id: 'article-1', title: 'AI article' }],
      total: 1,
    });
    expect(listSocialArticlesMock).toHaveBeenCalledWith({
      limit: 25,
      offset: 5,
      search: 'ai',
    });
  });
});
