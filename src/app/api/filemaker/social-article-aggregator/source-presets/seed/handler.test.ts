import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  resolveSocialPublishingActorMock,
  seedSocialArticleSourcePresetsMock,
} = vi.hoisted(() => ({
  resolveSocialPublishingActorMock: vi.fn(),
  seedSocialArticleSourcePresetsMock: vi.fn(),
}));

vi.mock('@/features/filemaker/social/server/social-publishing-actor', () => ({
  resolveSocialPublishingActor: (...args: unknown[]) => resolveSocialPublishingActorMock(...args),
}));

vi.mock('@/features/filemaker/social/server/social-article-source-preset-seeds', () => ({
  SOCIAL_ARTICLE_SOURCE_PRESET_SEEDS: [
    {
      id: 'ai-news-artificialintelligence-news-com',
      name: 'AI News (artificialintelligence-news.com)',
      urls: ['https://www.artificialintelligence-news.com/'],
      playwrightScripterId: 'artificialintelligence-news',
      playwrightScripterMode: 'replace',
    },
  ],
  seedSocialArticleSourcePresets: (...args: unknown[]) =>
    seedSocialArticleSourcePresetsMock(...args),
}));

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler } from './handler';

const wrappedGetHandler = apiHandler(getHandler, {
  source: 'social-article-aggregator.source-presets.seed.GET',
  service: 'filemaker.social-publishing.api',
});

const wrappedPostHandler = apiHandler(postHandler, {
  source: 'social-article-aggregator.source-presets.seed.POST',
  service: 'filemaker.social-publishing.api',
  parseJsonBody: true,
});

const buildRequest = (url: string, init?: RequestInit): Parameters<typeof wrappedGetHandler>[0] =>
  Object.assign(new Request(url, init), { nextUrl: new URL(url) }) as Parameters<
    typeof wrappedGetHandler
  >[0];

const adminActor = { actorId: 'admin-1', role: 'admin' as const };
const userActor = { actorId: 'user-1', role: 'user' as const };

describe('seed source presets GET handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveSocialPublishingActorMock.mockResolvedValue(adminActor);
  });

  it('returns available seeds for admins', async () => {
    const response = await wrappedGetHandler(
      buildRequest('http://localhost/api/filemaker/social-article-aggregator/source-presets/seed')
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.available).toEqual([
      expect.objectContaining({
        id: 'ai-news-artificialintelligence-news-com',
        name: 'AI News (artificialintelligence-news.com)',
        playwrightScripterId: 'artificialintelligence-news',
      }),
    ]);
  });

  it('rejects non-admin users with 403', async () => {
    resolveSocialPublishingActorMock.mockResolvedValue(userActor);

    const response = await wrappedGetHandler(
      buildRequest('http://localhost/api/filemaker/social-article-aggregator/source-presets/seed')
    );

    expect(response.status).toBe(403);
  });
});

describe('seed source presets POST handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveSocialPublishingActorMock.mockResolvedValue(adminActor);
    seedSocialArticleSourcePresetsMock.mockResolvedValue({
      seeded: ['ai-news-artificialintelligence-news-com'],
      skipped: [],
    });
  });

  it('seeds all presets and returns seeded/skipped lists', async () => {
    const response = await wrappedPostHandler(
      buildRequest(
        'http://localhost/api/filemaker/social-article-aggregator/source-presets/seed',
        { method: 'POST', body: JSON.stringify({}), headers: { 'Content-Type': 'application/json' } }
      )
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.seeded).toEqual(['ai-news-artificialintelligence-news-com']);
    expect(payload.skipped).toEqual([]);
    expect(payload.available).toHaveLength(1);
    expect(seedSocialArticleSourcePresetsMock).toHaveBeenCalledWith({
      ids: undefined,
      force: false,
    });
  });

  it('passes force flag through to the seed function', async () => {
    seedSocialArticleSourcePresetsMock.mockResolvedValue({
      seeded: ['ai-news-artificialintelligence-news-com'],
      skipped: [],
    });

    await wrappedPostHandler(
      buildRequest(
        'http://localhost/api/filemaker/social-article-aggregator/source-presets/seed',
        {
          method: 'POST',
          body: JSON.stringify({ force: true }),
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    expect(seedSocialArticleSourcePresetsMock).toHaveBeenCalledWith({
      ids: undefined,
      force: true,
    });
  });

  it('passes ids filter through to the seed function', async () => {
    seedSocialArticleSourcePresetsMock.mockResolvedValue({ seeded: [], skipped: [] });

    await wrappedPostHandler(
      buildRequest(
        'http://localhost/api/filemaker/social-article-aggregator/source-presets/seed',
        {
          method: 'POST',
          body: JSON.stringify({ ids: ['ai-news-artificialintelligence-news-com'] }),
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    expect(seedSocialArticleSourcePresetsMock).toHaveBeenCalledWith({
      ids: ['ai-news-artificialintelligence-news-com'],
      force: false,
    });
  });

  it('rejects non-admin users with 403', async () => {
    resolveSocialPublishingActorMock.mockResolvedValue(userActor);

    const response = await wrappedPostHandler(
      buildRequest(
        'http://localhost/api/filemaker/social-article-aggregator/source-presets/seed',
        { method: 'POST', body: JSON.stringify({}), headers: { 'Content-Type': 'application/json' } }
      )
    );

    expect(response.status).toBe(403);
    expect(seedSocialArticleSourcePresetsMock).not.toHaveBeenCalled();
  });
});
