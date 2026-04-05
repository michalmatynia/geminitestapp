import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';

import { postKangurLogoutHandler } from './handler';

const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-logout-1',
    traceId: 'trace-kangur-logout-1',
    correlationId: 'corr-kangur-logout-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

describe('kangur logout handler', () => {
  it('clears learner and auth cookies in one response', async () => {
    const response = await postKangurLogoutHandler(
      new NextRequest('http://localhost/api/kangur/auth/logout', {
        method: 'POST',
        headers: {
          cookie: [
            'kangur.learner-session=learner-session-token',
            'authjs.session-token=parent-session-token',
            'authjs.callback-url=http%3A%2F%2Flocalhost%2Fkangur%2Flessons',
          ].join('; '),
        },
      }),
      createRequestContext()
    );

    const setCookie = response.headers.get('set-cookie') ?? '';

    expect(setCookie).toContain('kangur.learner-session=');
    expect(setCookie).toContain('authjs.session-token=');
    expect(setCookie).toContain('authjs.callback-url=');
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it('clears chunked auth session cookies as well', async () => {
    const response = await postKangurLogoutHandler(
      new NextRequest('http://localhost/api/kangur/auth/logout', {
        method: 'POST',
        headers: {
          cookie: [
            'authjs.session-token.0=chunk-0',
            'authjs.session-token.1=chunk-1',
          ].join('; '),
        },
      }),
      createRequestContext()
    );

    const setCookie = response.headers.get('set-cookie') ?? '';

    expect(setCookie).toContain('authjs.session-token.0=');
    expect(setCookie).toContain('authjs.session-token.1=');
  });
});
