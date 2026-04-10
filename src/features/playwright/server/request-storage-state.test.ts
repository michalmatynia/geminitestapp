import { describe, expect, it } from 'vitest';

import { resolvePlaywrightRequestStorageState } from './request-storage-state';

describe('resolvePlaywrightRequestStorageState', () => {
  it('builds cookies and local storage entries into a sanitized storage state', () => {
    const resolved = resolvePlaywrightRequestStorageState({
      cookieHeader:
        'session=abc123; __Host-next-auth.csrf-token=csrf123; __Secure-next-auth.session-token=session456',
      sourceUrl: 'https://kangur.app/landing',
      localStorageEntries: [
        {
          name: 'kangur-storefront-appearance-mode',
          value: 'dark',
        },
      ],
    });

    expect(resolved).toEqual({
      droppedCookieNames: [],
      storageState: {
        cookies: [
          {
            name: 'session',
            value: 'abc123',
            url: 'https://kangur.app',
          },
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
        ],
        origins: [
          {
            origin: 'https://kangur.app',
            localStorage: [
              {
                name: 'kangur-storefront-appearance-mode',
                value: 'dark',
              },
            ],
          },
        ],
      },
    });
  });

  it('drops secure-prefixed cookies on insecure origins while keeping valid plain cookies', () => {
    const resolved = resolvePlaywrightRequestStorageState({
      cookieHeader:
        '__Host-next-auth.csrf-token=csrf123; __Secure-next-auth.session-token=session456; session=abc123',
      sourceUrl: 'http://localhost:3000/landing',
    });

    expect(resolved).toEqual({
      droppedCookieNames: [],
      storageState: {
        cookies: [
          {
            name: 'session',
            value: 'abc123',
            url: 'http://localhost:3000',
          },
        ],
        origins: [],
      },
    });
  });

  it('returns null when no cookies or local storage entries can be built', () => {
    const resolved = resolvePlaywrightRequestStorageState({
      cookieHeader: null,
      sourceUrl: 'not-a-url',
      localStorageEntries: null,
    });

    expect(resolved).toEqual({
      droppedCookieNames: [],
      storageState: null,
    });
  });
});
