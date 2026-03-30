import { describe, expect, it } from 'vitest';

import {
  sanitizePlaywrightCookiesFromHeader,
  sanitizePlaywrightStorageState,
} from './storage-state';

describe('playwright storage state sanitization', () => {
  it('normalizes request cookies into url-scoped Playwright cookies', () => {
    expect(
      sanitizePlaywrightCookiesFromHeader(
        'session=abc123; theme=dark',
        'https://kangur.app/admin'
      )
    ).toEqual([
      {
        name: 'session',
        value: 'abc123',
        url: 'https://kangur.app',
      },
      {
        name: 'theme',
        value: 'dark',
        url: 'https://kangur.app',
      },
    ]);
  });

  it('keeps secure auth cookie prefixes only for https origins', () => {
    expect(
      sanitizePlaywrightCookiesFromHeader(
        '__Host-next-auth.csrf-token=csrf123; __Secure-next-auth.session-token=session456',
        'https://kangur.app/login'
      )
    ).toEqual([
      {
        name: '__Host-next-auth.csrf-token',
        value: 'csrf123',
        url: 'https://kangur.app',
        secure: true,
      },
      {
        name: '__Secure-next-auth.session-token',
        value: 'session456',
        url: 'https://kangur.app',
        secure: true,
      },
    ]);
  });

  it('drops secure-prefixed cookies on insecure non-local origins', () => {
    expect(
      sanitizePlaywrightCookiesFromHeader(
        '__Secure-next-auth.session-token=session456; theme=dark',
        'http://example.com/login'
      )
    ).toEqual([
      {
        name: 'theme',
        value: 'dark',
        url: 'http://example.com',
      },
    ]);
  });

  it('drops secure-prefixed cookies on localhost http origins but keeps plain cookies', () => {
    expect(
      sanitizePlaywrightCookiesFromHeader(
        '__Secure-next-auth.session-token=session456; session=abc123',
        'http://localhost:3000/admin/kangur/social'
      )
    ).toEqual([
      {
        name: 'session',
        value: 'abc123',
        url: 'http://localhost:3000',
      },
    ]);
  });

  it('sanitizes invalid storage-state cookies before browser.newContext', () => {
    expect(
      sanitizePlaywrightStorageState(
        {
          cookies: [
            {
              name: '__Host-next-auth.csrf-token',
              value: 'csrf123',
              domain: 'kangur.app',
              path: '/login',
            },
            {
              name: 'theme',
              value: 'dark',
              domain: 'kangur.app',
              path: '/',
            },
            {
              name: '__Secure-next-auth.session-token',
              value: 'session456',
              domain: 'example.com',
            },
          ],
          origins: [
            {
              origin: 'https://kangur.app',
              localStorage: [{ name: 'kangur-storefront-appearance-mode', value: 'dark' }],
            },
          ],
        },
        { fallbackOrigin: 'https://kangur.app/dashboard' }
      )
    ).toEqual({
      cookies: [
        {
          name: '__Host-next-auth.csrf-token',
          value: 'csrf123',
          url: 'https://kangur.app',
          secure: true,
        },
        {
          name: 'theme',
          value: 'dark',
          domain: 'kangur.app',
          path: '/',
        },
        {
          name: '__Secure-next-auth.session-token',
          value: 'session456',
          url: 'https://kangur.app',
          secure: true,
        },
      ],
      origins: [
        {
          origin: 'https://kangur.app',
          localStorage: [{ name: 'kangur-storefront-appearance-mode', value: 'dark' }],
        },
      ],
    });
  });

  it('drops secure-prefixed storage-state cookies when fallback origin is localhost http', () => {
    expect(
      sanitizePlaywrightStorageState(
        {
          cookies: [
            {
              name: '__Secure-next-auth.session-token',
              value: 'session456',
            },
            {
              name: 'session',
              value: 'abc123',
            },
          ],
          origins: [],
        },
        { fallbackOrigin: 'http://localhost:3000/admin/kangur/social' }
      )
    ).toEqual({
      cookies: [
        {
          name: 'session',
          value: 'abc123',
          url: 'http://localhost:3000',
        },
      ],
      origins: [],
    });
  });
});
