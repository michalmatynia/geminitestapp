import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultKangurGames } from '@/features/kangur/games';
import { createDefaultKangurLessons } from '@/features/kangur/settings';
import { createDefaultKangurSections } from '@/features/kangur/lessons/lesson-section-defaults';

const {
  getKangurAuthMeHandlerMock,
  listKangurGamesMock,
  getKangurLessonRepositoryMock,
  listLessonsMock,
  getKangurLessonSectionRepositoryMock,
  listSectionsMock,
} = vi.hoisted(() => ({
  getKangurAuthMeHandlerMock: vi.fn(),
  listKangurGamesMock: vi.fn(),
  getKangurLessonRepositoryMock: vi.fn(),
  listLessonsMock: vi.fn(),
  getKangurLessonSectionRepositoryMock: vi.fn(),
  listSectionsMock: vi.fn(),
}));

vi.mock('@/features/auth/auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
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

import { GET } from './[[...path]]/route';

describe('kangur route routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listKangurGamesMock.mockResolvedValue(createDefaultKangurGames());
    listLessonsMock.mockResolvedValue(createDefaultKangurLessons());
    listSectionsMock.mockResolvedValue(createDefaultKangurSections());
    getKangurLessonRepositoryMock.mockResolvedValue({
      listLessons: listLessonsMock,
    });
    getKangurLessonSectionRepositoryMock.mockResolvedValue({
      listSections: listSectionsMock,
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
});
