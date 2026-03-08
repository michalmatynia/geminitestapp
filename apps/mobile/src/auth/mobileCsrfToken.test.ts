import { describe, expect, it } from 'vitest';

import { createMobileDevelopmentKangurStorage } from '../storage/createMobileDevelopmentKangurStorage';
import { KANGUR_MOBILE_CSRF_TOKEN_STORAGE_KEY } from './mobileAuthStorageKeys';
import {
  persistKangurMobileCsrfTokenFromHeaders,
  resolveKangurMobileCsrfRequestToken,
} from './mobileCsrfToken';

describe('mobileCsrfToken', () => {
  it('persists mirrored csrf headers for later native requests', () => {
    const storage = createMobileDevelopmentKangurStorage();

    persistKangurMobileCsrfTokenFromHeaders(
      storage,
      new Headers({
        'x-csrf-token': 'csrf-token-1',
      }),
    );

    expect(storage.getItem(KANGUR_MOBILE_CSRF_TOKEN_STORAGE_KEY)).toBe(
      'csrf-token-1',
    );
  });

  it('prefers the browser cookie token when available and falls back to stored native csrf', () => {
    const storage = createMobileDevelopmentKangurStorage();
    storage.setItem(KANGUR_MOBILE_CSRF_TOKEN_STORAGE_KEY, 'native-csrf-token');

    expect(
      resolveKangurMobileCsrfRequestToken({
        storage,
        webCookieToken: 'web-cookie-token',
      }),
    ).toBe('web-cookie-token');

    expect(
      resolveKangurMobileCsrfRequestToken({
        storage,
        webCookieToken: null,
      }),
    ).toBe('native-csrf-token');
  });
});
