import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultKangurGames } from '@/features/kangur/games';

const { getKangurAuthMeHandlerMock, listKangurGamesMock } = vi.hoisted(() => ({
  getKangurAuthMeHandlerMock: vi.fn(),
  listKangurGamesMock: vi.fn(),
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

import { GET } from './[[...path]]/route';

describe('kangur route routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listKangurGamesMock.mockResolvedValue(createDefaultKangurGames());
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
});
