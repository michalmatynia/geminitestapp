import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  deleteSocialArticleSourcePresetMock,
  listSocialArticleSourcePresetsMock,
  resolveSocialPublishingActorMock,
  upsertSocialArticleSourcePresetMock,
} = vi.hoisted(() => ({
  deleteSocialArticleSourcePresetMock: vi.fn(),
  listSocialArticleSourcePresetsMock: vi.fn(),
  resolveSocialPublishingActorMock: vi.fn(),
  upsertSocialArticleSourcePresetMock: vi.fn(),
}));

vi.mock('@/features/filemaker/social/server/social-publishing-actor', () => ({
  resolveSocialPublishingActor: (...args: unknown[]) => resolveSocialPublishingActorMock(...args),
}));

vi.mock('@/features/filemaker/social/server/social-article-aggregator-repository', () => ({
  deleteSocialArticleSourcePreset: (...args: unknown[]) =>
    deleteSocialArticleSourcePresetMock(...args),
  listSocialArticleSourcePresets: (...args: unknown[]) =>
    listSocialArticleSourcePresetsMock(...args),
  upsertSocialArticleSourcePreset: (...args: unknown[]) =>
    upsertSocialArticleSourcePresetMock(...args),
}));

import { apiHandler } from '@/shared/lib/api/api-handler';

import { deleteHandler, getHandler, postHandler } from './handler';

const wrappedGetHandler = apiHandler(getHandler, {
  source: 'social-article-aggregator.source-presets.GET',
  service: 'filemaker.social-publishing.api',
});
const wrappedPostHandler = apiHandler(postHandler, {
  source: 'social-article-aggregator.source-presets.POST',
  service: 'filemaker.social-publishing.api',
  parseJsonBody: true,
});
const wrappedDeleteHandler = apiHandler(deleteHandler, {
  source: 'social-article-aggregator.source-presets.DELETE',
  service: 'filemaker.social-publishing.api',
});

const buildRequest = (url: string, init?: RequestInit): Parameters<typeof wrappedGetHandler>[0] =>
  Object.assign(new Request(url, init), { nextUrl: new URL(url) }) as Parameters<
    typeof wrappedGetHandler
  >[0];

describe('social article source preset handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveSocialPublishingActorMock.mockResolvedValue({
      actorId: 'admin-1',
      role: 'admin',
    });
  });

  it('lists global source presets for admins', async () => {
    listSocialArticleSourcePresetsMock.mockResolvedValue([
      { id: 'preset-1', name: 'News', urls: ['https://example.com'] },
    ]);

    const response = await wrappedGetHandler(
      buildRequest('http://localhost/api/filemaker/social-article-aggregator/source-presets')
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual([{ id: 'preset-1', name: 'News', urls: ['https://example.com'] }]);
    expect(listSocialArticleSourcePresetsMock).toHaveBeenCalledTimes(1);
  });

  it('creates a source preset with robots enabled by default', async () => {
    upsertSocialArticleSourcePresetMock.mockImplementation((preset) => Promise.resolve(preset));

    const response = await wrappedPostHandler(
      buildRequest('http://localhost/api/filemaker/social-article-aggregator/source-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preset: {
            id: 'preset-1',
            name: 'News',
            playwrightScripterId: 'news-scripter',
            playwrightScripterMode: 'replace',
            urls: ['example.com/news'],
          },
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.obeyRobotsTxt).toBe(true);
    expect(payload.crawlDepth).toBe(1);
    expect(upsertSocialArticleSourcePresetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        crawlDepth: 1,
        id: 'preset-1',
        name: 'News',
        obeyRobotsTxt: true,
        playwrightScripterId: 'news-scripter',
        playwrightScripterMode: 'replace',
        urls: ['example.com/news'],
      })
    );
  });

  it('deletes a source preset by query id', async () => {
    deleteSocialArticleSourcePresetMock.mockResolvedValue({
      id: 'preset-1',
      name: 'News',
      urls: ['https://example.com'],
    });

    const response = await wrappedDeleteHandler(
      buildRequest(
        'http://localhost/api/filemaker/social-article-aggregator/source-presets?id=preset-1',
        { method: 'DELETE' }
      )
    );

    expect(response.status).toBe(200);
    expect(deleteSocialArticleSourcePresetMock).toHaveBeenCalledWith('preset-1');
  });
});
