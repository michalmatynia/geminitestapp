import { describe, expect, it, vi } from 'vitest';

const { getKangurAuthMeHandlerMock } = vi.hoisted(() => ({
  getKangurAuthMeHandlerMock: vi.fn(),
}));

vi.mock('@/features/auth/auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock('./auth/me/handler', () => ({
  getKangurAuthMeHandler: getKangurAuthMeHandlerMock,
}));

import { GET } from './[[...path]]/route';

describe('kangur route routing', () => {
  it('routes using the request URL when params.path is missing', async () => {
    getKangurAuthMeHandlerMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const request = {
      url: 'http://localhost/api/kangur/auth/me',
      nextUrl: new URL('http://localhost/api/kangur/auth/me'),
    } as Request;

    const response = await GET(request as unknown as Parameters<typeof GET>[0], {
      params: {},
    });

    expect(getKangurAuthMeHandlerMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
  });
});
