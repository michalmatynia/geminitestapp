type PlaywrightCookieSameSite = 'Strict' | 'Lax' | 'None';

export type PlaywrightStorageStateCookie = {
  name: string;
  value: string;
  url?: string;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  expires?: number;
  sameSite?: PlaywrightCookieSameSite;
};

export type PlaywrightStorageStateOrigin = {
  origin: string;
  localStorage: Array<{ name: string; value: string }>;
};

export type PlaywrightStorageState = {
  cookies: PlaywrightStorageStateCookie[];
  origins: PlaywrightStorageStateOrigin[];
};

const COOKIE_NAME_PATTERN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const readOptionalString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const readCookieValue = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

const sanitizeCookieName = (value: unknown): string | null => {
  const name = readOptionalString(value);
  if (!name || !COOKIE_NAME_PATTERN.test(name)) {
    return null;
  }
  return name;
};

const sanitizeCookieDomain = (value: unknown): string | null => {
  const domain = readOptionalString(value) ?? null;
  if (!domain || domain.includes(':') || domain.includes('/') || domain.includes(' ')) {
    return null;
  }
  return domain;
};

const sanitizeCookiePath = (value: unknown): string =>
  typeof value === 'string' && value.startsWith('/') ? value : '/';

const sanitizeSameSite = (value: unknown): PlaywrightCookieSameSite | undefined =>
  value === 'Strict' || value === 'Lax' || value === 'None' ? value : undefined;

const sanitizeCookieExpires = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const sanitizeCookieFlags = (params: {
  secure: unknown;
  httpOnly: unknown;
  sameSite: unknown;
  expires: unknown;
  forceSecure?: boolean;
}): Omit<PlaywrightStorageStateCookie, 'name' | 'value' | 'url' | 'domain' | 'path'> => {
  const secure = params.forceSecure || params.secure === true ? true : undefined;
  const httpOnly = params.httpOnly === true ? true : undefined;
  const sameSite = sanitizeSameSite(params.sameSite);
  const expires = sanitizeCookieExpires(params.expires);

  return {
    ...(secure ? { secure: true } : {}),
    ...(httpOnly ? { httpOnly: true } : {}),
    ...(typeof expires === 'number' ? { expires } : {}),
    ...(sameSite && (sameSite !== 'None' || secure) ? { sameSite } : {}),
  };
};

const resolveOriginInfo = (
  value: string | null | undefined
): { origin: string; securePrefixAllowed: boolean } | null => {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return {
      origin: url.origin,
      securePrefixAllowed: url.protocol === 'https:',
    };
  } catch {
    return null;
  }
};

const sanitizeOriginEntry = (value: unknown): PlaywrightStorageStateOrigin | null => {
  if (!isObjectRecord(value)) {
    return null;
  }

  const origin = readOptionalString(value['origin']);
  const originInfo = resolveOriginInfo(origin);
  if (!originInfo) {
    return null;
  }

  const localStorage = Array.isArray(value['localStorage'])
    ? value['localStorage']
        .map((entry) => {
          if (!isObjectRecord(entry)) {
            return null;
          }
          const name = readOptionalString(entry['name']);
          const storageValue = readCookieValue(entry['value']);
          if (!name || storageValue == null) {
            return null;
          }
          return { name, value: storageValue };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    : [];

  return {
    origin: originInfo.origin,
    localStorage,
  };
};

const sanitizeStorageStateCookie = (
  value: unknown,
  fallbackOrigin: string | null
): PlaywrightStorageStateCookie | null => {
  if (!isObjectRecord(value)) {
    return null;
  }

  const name = sanitizeCookieName(value['name']);
  const cookieValue = readCookieValue(value['value']);
  if (!name || cookieValue == null) {
    return null;
  }

  const isHostPrefixed = name.startsWith('__Host-');
  const isSecurePrefixed = isHostPrefixed || name.startsWith('__Secure-');
  const explicitUrl = readOptionalString(value['url']);
  const explicitOriginInfo = resolveOriginInfo(explicitUrl);
  const fallbackOriginInfo = resolveOriginInfo(fallbackOrigin);
  const usableOriginInfo = explicitOriginInfo ?? fallbackOriginInfo;
  const flags = sanitizeCookieFlags({
    secure: value['secure'],
    httpOnly: value['httpOnly'],
    sameSite: value['sameSite'],
    expires: value['expires'],
    forceSecure: isSecurePrefixed,
  });

  if (isSecurePrefixed) {
    if (!usableOriginInfo?.securePrefixAllowed) {
      return null;
    }
    return {
      name,
      value: cookieValue,
      url: usableOriginInfo.origin,
      ...flags,
    };
  }

  if (explicitOriginInfo) {
    return {
      name,
      value: cookieValue,
      url: explicitOriginInfo.origin,
      ...flags,
    };
  }

  const domain = sanitizeCookieDomain(value['domain']);
  const path = sanitizeCookiePath(value['path']);
  if (domain) {
    return {
      name,
      value: cookieValue,
      domain,
      path,
      ...flags,
    };
  }

  if (fallbackOriginInfo) {
    return {
      name,
      value: cookieValue,
      url: fallbackOriginInfo.origin,
      ...flags,
    };
  }

  return null;
};

export const sanitizePlaywrightCookiesFromHeader = (
  cookieHeader: string,
  sourceUrl: string
): PlaywrightStorageStateCookie[] => {
  const originInfo = resolveOriginInfo(sourceUrl);
  if (!originInfo) {
    return [];
  }

  const seenNames = new Set<string>();
  return cookieHeader
    .split(';')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .reduce<PlaywrightStorageStateCookie[]>((cookies, pair) => {
      const eqIdx = pair.indexOf('=');
      if (eqIdx <= 0) {
        return cookies;
      }

      const name = sanitizeCookieName(pair.slice(0, eqIdx));
      const value = pair.slice(eqIdx + 1).trim();
      if (!name || seenNames.has(name)) {
        return cookies;
      }

      seenNames.add(name);
      const secure = name.startsWith('__Host-') || name.startsWith('__Secure-');
      if (secure && !originInfo.securePrefixAllowed) {
        return cookies;
      }

      cookies.push({
        name,
        value,
        url: originInfo.origin,
        ...(secure ? { secure: true } : {}),
      });
      return cookies;
    }, []);
};

export const sanitizePlaywrightStorageState = (
  value: unknown,
  options?: { fallbackOrigin?: string | null }
): PlaywrightStorageState | null => {
  if (!isObjectRecord(value)) {
    return null;
  }

  const fallbackOrigin = options?.fallbackOrigin ?? null;
  const cookies = Array.isArray(value['cookies'])
    ? value['cookies'].reduce<PlaywrightStorageStateCookie[]>((acc, cookie) => {
        const sanitizedCookie = sanitizeStorageStateCookie(cookie, fallbackOrigin);
        if (sanitizedCookie) {
          acc.push(sanitizedCookie);
        }
        return acc;
      }, [])
    : [];
  const origins = Array.isArray(value['origins'])
    ? value['origins']
        .map((origin) => sanitizeOriginEntry(origin))
        .filter((origin): origin is PlaywrightStorageStateOrigin => origin !== null)
    : [];

  if (cookies.length === 0 && origins.length === 0) {
    return null;
  }

  return { cookies, origins };
};
