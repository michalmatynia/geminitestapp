import 'server-only';

import {
  sanitizePlaywrightCookiesFromHeader,
  sanitizePlaywrightStorageState,
  type PlaywrightStorageState,
} from '@/shared/lib/playwright/storage-state';

export type ResolvedPlaywrightRequestStorageState = {
  storageState: PlaywrightStorageState | null;
  droppedCookieNames: string[];
};

const resolveOrigin = (value: string | null | undefined): string | null => {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

export const resolvePlaywrightRequestStorageState = (input: {
  cookieHeader?: string | null;
  sourceUrl: string;
  localStorageEntries?: Array<{ name: string; value: string }> | null;
  localStorageOrigin?: string | null;
}): ResolvedPlaywrightRequestStorageState => {
  const cookies = input.cookieHeader
    ? sanitizePlaywrightCookiesFromHeader(input.cookieHeader, input.sourceUrl)
    : [];
  const localStorageEntries =
    input.localStorageEntries?.filter(
      (entry): entry is { name: string; value: string } =>
        typeof entry?.name === 'string' &&
        entry.name.trim().length > 0 &&
        typeof entry.value === 'string'
    ) ?? [];
  const origin = resolveOrigin(input.localStorageOrigin ?? input.sourceUrl);
  const origins =
    localStorageEntries.length > 0 && origin
      ? [{ origin, localStorage: localStorageEntries }]
      : [];

  const storageState = sanitizePlaywrightStorageState(
    { cookies, origins },
    { fallbackOrigin: input.sourceUrl }
  );
  const sanitizedCookieNames = new Set((storageState?.cookies ?? []).map((cookie) => cookie.name));
  const droppedCookieNames = cookies
    .map((cookie) => (!sanitizedCookieNames.has(cookie.name) ? cookie.name : null))
    .filter((name): name is string => name !== null);

  return {
    storageState,
    droppedCookieNames,
  };
};
