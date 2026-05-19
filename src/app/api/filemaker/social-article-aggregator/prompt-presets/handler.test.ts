import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  deleteSocialArticlePromptPresetMock,
  listSocialArticlePromptPresetsMock,
  resolveSocialPublishingActorMock,
  upsertSocialArticlePromptPresetMock,
} = vi.hoisted(() => ({
  deleteSocialArticlePromptPresetMock: vi.fn(),
  listSocialArticlePromptPresetsMock: vi.fn(),
  resolveSocialPublishingActorMock: vi.fn(),
  upsertSocialArticlePromptPresetMock: vi.fn(),
}));

vi.mock('@/features/filemaker/social/server/social-publishing-actor', () => ({
  resolveSocialPublishingActor: (...args: unknown[]) => resolveSocialPublishingActorMock(...args),
}));

vi.mock('@/features/filemaker/social/server/social-article-aggregator-repository', () => ({
  deleteSocialArticlePromptPreset: (...args: unknown[]) =>
    deleteSocialArticlePromptPresetMock(...args),
  listSocialArticlePromptPresets: (...args: unknown[]) =>
    listSocialArticlePromptPresetsMock(...args),
  upsertSocialArticlePromptPreset: (...args: unknown[]) =>
    upsertSocialArticlePromptPresetMock(...args),
}));

import { apiHandler } from '@/shared/lib/api/api-handler';

import { deleteHandler, getHandler, postHandler } from './handler';

const wrappedGetHandler = apiHandler(getHandler, {
  source: 'social-article-aggregator.prompt-presets.GET',
  service: 'filemaker.social-publishing.api',
});
const wrappedPostHandler = apiHandler(postHandler, {
  source: 'social-article-aggregator.prompt-presets.POST',
  service: 'filemaker.social-publishing.api',
  parseJsonBody: true,
});
const wrappedDeleteHandler = apiHandler(deleteHandler, {
  source: 'social-article-aggregator.prompt-presets.DELETE',
  service: 'filemaker.social-publishing.api',
});

const buildRequest = (url: string, init?: RequestInit): Parameters<typeof wrappedGetHandler>[0] =>
  Object.assign(new Request(url, init), { nextUrl: new URL(url) }) as Parameters<
    typeof wrappedGetHandler
  >[0];

describe('social article prompt preset handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveSocialPublishingActorMock.mockResolvedValue({
      actorId: 'admin-1',
      role: 'admin',
    });
  });

  it('lists global prompt presets for admins', async () => {
    listSocialArticlePromptPresetsMock.mockResolvedValue([
      { id: 'prompt-1', isDefault: true, name: 'Summary', prompt: 'Summarize articles.' },
    ]);

    const response = await wrappedGetHandler(
      buildRequest('http://localhost/api/filemaker/social-article-aggregator/prompt-presets')
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual([
      { id: 'prompt-1', isDefault: true, name: 'Summary', prompt: 'Summarize articles.' },
    ]);
    expect(listSocialArticlePromptPresetsMock).toHaveBeenCalledTimes(1);
  });

  it('creates a prompt preset with default false when omitted', async () => {
    upsertSocialArticlePromptPresetMock.mockImplementation((preset) => Promise.resolve(preset));

    const response = await wrappedPostHandler(
      buildRequest('http://localhost/api/filemaker/social-article-aggregator/prompt-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preset: {
            id: 'prompt-1',
            name: 'Summary',
            prompt: 'Summarize articles.',
          },
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.isDefault).toBe(false);
    expect(upsertSocialArticlePromptPresetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'prompt-1',
        isDefault: false,
        name: 'Summary',
        prompt: 'Summarize articles.',
      })
    );
  });

  it('deletes a prompt preset by query id', async () => {
    deleteSocialArticlePromptPresetMock.mockResolvedValue({
      id: 'prompt-1',
      isDefault: false,
      name: 'Summary',
      prompt: 'Summarize articles.',
    });

    const response = await wrappedDeleteHandler(
      buildRequest(
        'http://localhost/api/filemaker/social-article-aggregator/prompt-presets?id=prompt-1',
        { method: 'DELETE' }
      )
    );

    expect(response.status).toBe(200);
    expect(deleteSocialArticlePromptPresetMock).toHaveBeenCalledWith('prompt-1');
  });
});
