import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultKangurGames } from '@/features/kangur/games';
import { createDefaultKangurLessons } from '@/features/kangur/settings';
import { createDefaultKangurSections } from '@/features/kangur/lessons/lesson-section-defaults';

const {
  authMock,
  getKangurAuthMeHandlerMock,
  listKangurGamesMock,
  getKangurLessonRepositoryMock,
  listLessonsMock,
  getKangurLessonSectionRepositoryMock,
  listSectionsMock,
  getKangurGameInstanceRepositoryMock,
  listInstancesMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  getKangurAuthMeHandlerMock: vi.fn(),
  listKangurGamesMock: vi.fn(),
  getKangurLessonRepositoryMock: vi.fn(),
  listLessonsMock: vi.fn(),
  getKangurLessonSectionRepositoryMock: vi.fn(),
  listSectionsMock: vi.fn(),
  getKangurGameInstanceRepositoryMock: vi.fn(),
  listInstancesMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  auth: authMock,
}));

vi.mock('./auth/me/handler', () => ({
  getKangurAuthMeHandler: getKangurAuthMeHandlerMock,
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

import { GET } from './[[...path]]/route';

describe('kangur route routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({
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
});
