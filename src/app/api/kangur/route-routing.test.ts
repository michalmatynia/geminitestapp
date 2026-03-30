import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultKangurGames } from '@/features/kangur/games';
import { createDefaultKangurLessons } from '@/features/kangur/settings';
import { createDefaultKangurSections } from '@/features/kangur/lessons/lesson-section-defaults';

const {
  readOptionalServerAuthSessionMock,
  getKangurAuthMeHandlerMock,
  postKangurSocialPostAnalyzeVisualsHandlerMock,
  getKangurSocialImageAddonsHandlerMock,
  postKangurSocialImageAddonsHandlerMock,
  postKangurSocialImageAddonsBatchHandlerMock,
  listKangurGamesMock,
  getKangurLessonRepositoryMock,
  listLessonsMock,
  getKangurLessonSectionRepositoryMock,
  listSectionsMock,
  getKangurGameInstanceRepositoryMock,
  listInstancesMock,
} = vi.hoisted(() => ({
  readOptionalServerAuthSessionMock: vi.fn(),
  getKangurAuthMeHandlerMock: vi.fn(),
  postKangurSocialPostAnalyzeVisualsHandlerMock: vi.fn(),
  getKangurSocialImageAddonsHandlerMock: vi.fn(),
  postKangurSocialImageAddonsHandlerMock: vi.fn(),
  postKangurSocialImageAddonsBatchHandlerMock: vi.fn(),
  listKangurGamesMock: vi.fn(),
  getKangurLessonRepositoryMock: vi.fn(),
  listLessonsMock: vi.fn(),
  getKangurLessonSectionRepositoryMock: vi.fn(),
  listSectionsMock: vi.fn(),
  getKangurGameInstanceRepositoryMock: vi.fn(),
  listInstancesMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  readOptionalServerAuthSession: readOptionalServerAuthSessionMock,
}));

vi.mock('next/dynamic', () => ({
  default: () => () => null,
}));

vi.mock('./auth/me/handler', () => ({
  getKangurAuthMeHandler: getKangurAuthMeHandlerMock,
}));

vi.mock('./social-posts/analyze-visuals/handler', () => ({
  postKangurSocialPostAnalyzeVisualsHandler: (...args: unknown[]) =>
    postKangurSocialPostAnalyzeVisualsHandlerMock(...args),
}));

vi.mock('./social-image-addons/handler', () => ({
  getKangurSocialImageAddonsHandler: (...args: unknown[]) =>
    getKangurSocialImageAddonsHandlerMock(...args),
  postKangurSocialImageAddonsHandler: (...args: unknown[]) =>
    postKangurSocialImageAddonsHandlerMock(...args),
  querySchema: undefined,
}));

vi.mock('./social-image-addons/batch/handler', () => ({
  getKangurSocialImageAddonsBatchHandler: vi.fn(),
  postKangurSocialImageAddonsBatchHandler: (...args: unknown[]) =>
    postKangurSocialImageAddonsBatchHandlerMock(...args),
  querySchema: undefined,
}));

vi.mock('@/features/kangur/services/kangur-game-repository/mongo-kangur-game-repository', () => ({
  listKangurGames: listKangurGamesMock,
}));

vi.mock('@/features/kangur/services/kangur-lesson-repository', () => ({
  getKangurLessonRepository: getKangurLessonRepositoryMock,
}));

vi.mock('@/features/kangur/services/kangur-lesson-section-repository', () => ({
  getKangurLessonSectionRepository: getKangurLessonSectionRepositoryMock,
}));

vi.mock('@/features/kangur/services/kangur-game-instance-repository', () => ({
  getKangurGameInstanceRepository: getKangurGameInstanceRepositoryMock,
}));

import { GET, POST } from './[[...path]]/route';

describe('kangur route routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readOptionalServerAuthSessionMock.mockResolvedValue({
      expires: '2026-12-31T23:59:59.000Z',
      user: {
        email: 'admin@example.com',
        id: 'admin-1',
        isElevated: true,
        name: 'Super Admin',
        role: 'super_admin',
      },
    });
    listKangurGamesMock.mockResolvedValue(createDefaultKangurGames());
    listLessonsMock.mockResolvedValue(createDefaultKangurLessons());
    listSectionsMock.mockResolvedValue(createDefaultKangurSections());
    getKangurLessonRepositoryMock.mockResolvedValue({
      listLessons: listLessonsMock,
    });
    getKangurLessonSectionRepositoryMock.mockResolvedValue({
      listSections: listSectionsMock,
    });
    listInstancesMock.mockResolvedValue([]);
    getKangurGameInstanceRepositoryMock.mockResolvedValue({
      listInstances: listInstancesMock,
      replaceInstancesForGame: vi.fn(),
    });
    postKangurSocialPostAnalyzeVisualsHandlerMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          summary: 'Visual summary',
          highlights: ['Highlight'],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );
    postKangurSocialImageAddonsBatchHandlerMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'social-batch-job-1',
          status: 'queued',
        }),
        {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );
    postKangurSocialImageAddonsHandlerMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'addon-1',
          title: 'Hero image',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );
    getKangurSocialImageAddonsHandlerMock.mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: 'addon-selected',
            title: 'Selected image',
          },
          {
            id: 'addon-recent',
            title: 'Recent image',
          },
        ]),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );
  });

  it('routes using the request URL when params.path is missing', async () => {
    getKangurAuthMeHandlerMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const url = 'http://localhost/api/kangur/auth/me';
    const request = Object.assign(new Request(url), {
      nextUrl: new URL(url),
    }) as Request;

    const response = await GET(request as unknown as Parameters<typeof GET>[0], {
      params: {},
    });

    expect(getKangurAuthMeHandlerMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
  });

  it('routes game-library-page through misc routing', async () => {
    const url = 'http://localhost/api/kangur/game-library-page?subject=maths';
    const request = Object.assign(new Request(url), {
      nextUrl: new URL(url),
    }) as Request;

    const response = await GET(request as unknown as Parameters<typeof GET>[0], {
      params: { path: ['game-library-page'] },
    });

    const payload = await response.json();

    expect(listKangurGamesMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    expect(payload.overview.subjectGroups.map((group: { subject: { id: string } }) => group.subject.id)).toEqual([
      'maths',
    ]);
  });

  it('routes lessons-catalog through misc routing', async () => {
    const url = 'http://localhost/api/kangur/lessons-catalog?subject=maths&enabledOnly=true';
    const request = Object.assign(new Request(url), {
      nextUrl: new URL(url),
    }) as Request;

    const response = await GET(request as unknown as Parameters<typeof GET>[0], {
      params: { path: ['lessons-catalog'] },
    });

    const payload = await response.json();

    expect(listLessonsMock).toHaveBeenCalledTimes(1);
    expect(listSectionsMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    expect(listLessonsMock).toHaveBeenCalledWith({
      subject: 'maths',
      ageGroup: undefined,
      enabledOnly: true,
    });
    expect(listSectionsMock).toHaveBeenCalledWith({
      subject: 'maths',
      ageGroup: undefined,
      enabledOnly: true,
    });
    expect(Array.isArray(payload.lessons)).toBe(true);
    expect(Array.isArray(payload.sections)).toBe(true);
  });

  it('routes game-instances through misc routing', async () => {
    listInstancesMock.mockResolvedValueOnce([
      {
        id: 'clock_instance_saved',
        gameId: 'clock_training',
        launchableRuntimeId: 'clock_quiz',
        contentSetId: 'clock_training:clock-hours',
        title: 'Hours only clock',
        description: 'Saved clock instance.',
        emoji: '🕐',
        enabled: true,
        sortOrder: 1,
        engineOverrides: {},
      },
    ]);

    const url = 'http://localhost/api/kangur/game-instances?gameId=clock_training';
    const request = Object.assign(new Request(url), {
      nextUrl: new URL(url),
    }) as Request;

    const response = await GET(request as unknown as Parameters<typeof GET>[0], {
      params: { path: ['game-instances'] },
    });

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(listInstancesMock).toHaveBeenCalledWith({
      enabledOnly: undefined,
      gameId: 'clock_training',
      instanceId: undefined,
    });
    expect(payload).toEqual([
      expect.objectContaining({ id: 'clock_instance_saved' }),
    ]);
  });

  it('routes social-posts/analyze-visuals through misc POST routing', async () => {
    const url = 'http://localhost/api/kangur/social-posts/analyze-visuals';
    const request = Object.assign(
      new Request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: 'post-1',
          imageAddonIds: ['addon-1'],
        }),
      }),
      {
        nextUrl: new URL(url),
      }
    ) as Request;

    const response = await POST(request as unknown as Parameters<typeof POST>[0], {
      params: { path: ['social-posts', 'analyze-visuals'] },
    });

    expect(postKangurSocialPostAnalyzeVisualsHandlerMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      summary: 'Visual summary',
      highlights: ['Highlight'],
    });
  });

  it('routes social-image-addons/batch through misc POST routing', async () => {
    const url = 'http://localhost/api/kangur/social-image-addons/batch';
    const request = Object.assign(
      new Request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          async: true,
          baseUrl: 'https://kangur.app',
          presetIds: ['game'],
        }),
      }),
      {
        nextUrl: new URL(url),
      }
    ) as Request;

    const response = await POST(request as unknown as Parameters<typeof POST>[0], {
      params: { path: ['social-image-addons', 'batch'] },
    });

    expect(postKangurSocialImageAddonsBatchHandlerMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      id: 'social-batch-job-1',
      status: 'queued',
    });
  });

  it('routes social-image-addons through misc POST routing', async () => {
    const url = 'http://localhost/api/kangur/social-image-addons';
    const request = Object.assign(
      new Request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Hero image',
          sourceUrl: 'https://kangur.app',
        }),
      }),
      {
        nextUrl: new URL(url),
      }
    ) as Request;

    const response = await POST(request as unknown as Parameters<typeof POST>[0], {
      params: { path: ['social-image-addons'] },
    });

    expect(postKangurSocialImageAddonsHandlerMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: 'addon-1',
      title: 'Hero image',
    });
  });

  it('routes social-image-addons through misc GET routing', async () => {
    const url = 'http://localhost/api/kangur/social-image-addons?ids=addon-selected&limit=12';
    const request = Object.assign(new Request(url), {
      nextUrl: new URL(url),
    }) as Request;

    const response = await GET(request as unknown as Parameters<typeof GET>[0], {
      params: { path: ['social-image-addons'] },
    });

    expect(getKangurSocialImageAddonsHandlerMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      {
        id: 'addon-selected',
        title: 'Selected image',
      },
      {
        id: 'addon-recent',
        title: 'Recent image',
      },
    ]);
  });
});
