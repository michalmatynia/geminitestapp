import type { KangurClientStorageAdapter } from '@kangur/platform';

import { KANGUR_MOBILE_CSRF_TOKEN_STORAGE_KEY } from './mobileAuthStorageKeys';

const KANGUR_CSRF_HEADER_NAME = 'x-csrf-token';

export const persistKangurMobileCsrfTokenFromHeaders = (
  storage: KangurClientStorageAdapter,
  headers: Pick<Headers, 'get'>,
): void => {
  const token = headers.get(KANGUR_CSRF_HEADER_NAME)?.trim();
  if (token === undefined || token === '') {
    return;
  }

  storage.setItem(KANGUR_MOBILE_CSRF_TOKEN_STORAGE_KEY, token);
};

export const resolveKangurMobileCsrfRequestToken = ({
  storage,
  webCookieToken,
}: {
  storage: KangurClientStorageAdapter;
  webCookieToken: string | null;
}): string | null => webCookieToken ?? storage.getItem(KANGUR_MOBILE_CSRF_TOKEN_STORAGE_KEY);
