import { DEFAULT_KANGUR_APP_EMBED_ENTRY_PAGE } from '@/shared/contracts/app-embeds';

export const KANGUR_BASE_PATH = '/kangur';
export const KANGUR_MAIN_PAGE_KEY = DEFAULT_KANGUR_APP_EMBED_ENTRY_PAGE;
export const KANGUR_EMBED_QUERY_PARAM = 'kangur';
export const KANGUR_EMBED_BASE_PATH_PREFIX = '__kangur_embed__:';
const KANGUR_EMBED_SCOPE_DELIMITER = '::';
const KANGUR_EMBED_SCOPED_QUERY_PARAM_SEPARATOR = '-';
const KANGUR_EMBED_STATE_QUERY_PARAM_KEYS = [
  KANGUR_EMBED_QUERY_PARAM,
  'focus',
  'quickStart',
  'operation',
  'difficulty',
  'categories',
  'count',
] as const;
export const KANGUR_INTERNAL_QUERY_PARAM_KEYS = KANGUR_EMBED_STATE_QUERY_PARAM_KEYS;
export type KangurInternalQueryParamKey = (typeof KANGUR_INTERNAL_QUERY_PARAM_KEYS)[number];

export const KANGUR_PAGE_TO_SLUG: Record<string, string> = Object.freeze({
  Game: 'game',
  LearnerProfile: 'profile',
  Lessons: 'lessons',
  ParentDashboard: 'parent-dashboard',
});

export const KANGUR_SLUG_TO_PAGE: Record<string, string> = Object.freeze(
  Object.entries(KANGUR_PAGE_TO_SLUG).reduce<Record<string, string>>((acc, [pageKey, slug]) => {
    acc[slug.toLowerCase()] = pageKey;
    return acc;
  }, {})
);

const toKebabCase = (value: string): string =>
  value
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();

const isKangurInternalQueryParamKey = (value: string): value is KangurInternalQueryParamKey =>
  KANGUR_INTERNAL_QUERY_PARAM_KEYS.includes(value as KangurInternalQueryParamKey);

const normalizeKangurEmbedScopeKey = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return normalized.length > 0 ? normalized : null;
};

const parseKangurEmbeddedBasePath = (
  basePath: string | null | undefined
): { hostPath: string; scopeKey: string | null } | null => {
  if (!isKangurEmbeddedBasePath(basePath)) {
    return null;
  }

  const rawEmbeddedValue = basePath.trim().slice(KANGUR_EMBED_BASE_PATH_PREFIX.length);
  const scopeDelimiterIndex = rawEmbeddedValue.indexOf(KANGUR_EMBED_SCOPE_DELIMITER);

  if (scopeDelimiterIndex === -1) {
    return {
      hostPath: normalizeKangurHostPath(rawEmbeddedValue),
      scopeKey: null,
    };
  }

  const scopeKey = normalizeKangurEmbedScopeKey(rawEmbeddedValue.slice(0, scopeDelimiterIndex));
  const hostPath = rawEmbeddedValue.slice(
    scopeDelimiterIndex + KANGUR_EMBED_SCOPE_DELIMITER.length
  );

  if (!scopeKey) {
    return {
      hostPath: normalizeKangurHostPath(rawEmbeddedValue),
      scopeKey: null,
    };
  }

  return {
    hostPath: normalizeKangurHostPath(hostPath),
    scopeKey,
  };
};

export const normalizeKangurHostPathname = (value: string): string => {
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  const withoutTrailingSlashes = withLeadingSlash.replace(/\/+$/, '');
  return withoutTrailingSlashes.length > 0 ? withoutTrailingSlashes : '/';
};

export const normalizeKangurHostPath = (value: string | null | undefined): string => {
  if (typeof value !== 'string') {
    return '/';
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return '/';
  }

  try {
    const parsed = new URL(
      trimmed.startsWith('/') ? trimmed : `/${trimmed}`,
      'https://kangur.local'
    );
    const normalizedPathname = normalizeKangurHostPathname(parsed.pathname);
    return `${normalizedPathname}${parsed.search}${parsed.hash}`;
  } catch {
    return normalizeKangurHostPathname(trimmed);
  }
};

export const buildKangurEmbeddedBasePath = (hostPath: string, scopeKey?: string | null): string => {
  const normalizedHostPath = normalizeKangurHostPath(hostPath);
  const normalizedScopeKey = normalizeKangurEmbedScopeKey(scopeKey);

  if (!normalizedScopeKey) {
    return `${KANGUR_EMBED_BASE_PATH_PREFIX}${normalizedHostPath}`;
  }

  return `${KANGUR_EMBED_BASE_PATH_PREFIX}${normalizedScopeKey}${KANGUR_EMBED_SCOPE_DELIMITER}${normalizedHostPath}`;
};

export const isKangurEmbeddedBasePath = (
  basePath: string | null | undefined
): basePath is string =>
  typeof basePath === 'string' && basePath.trim().startsWith(KANGUR_EMBED_BASE_PATH_PREFIX);

export const getKangurEmbeddedScopeKey = (basePath: string | null | undefined): string | null =>
  parseKangurEmbeddedBasePath(basePath)?.scopeKey ?? null;

export const getKangurEmbeddedHostPath = (basePath: string | null | undefined): string | null => {
  return parseKangurEmbeddedBasePath(basePath)?.hostPath ?? null;
};

export const getKangurInternalQueryParamName = (
  key: KangurInternalQueryParamKey,
  basePath?: string | null
): string => {
  const scopeKey = getKangurEmbeddedScopeKey(basePath);
  if (!scopeKey) {
    return key;
  }

  const scopedBaseKey = `${KANGUR_EMBED_QUERY_PARAM}${KANGUR_EMBED_SCOPED_QUERY_PARAM_SEPARATOR}${scopeKey}`;
  if (key === KANGUR_EMBED_QUERY_PARAM) {
    return scopedBaseKey;
  }

  return `${scopedBaseKey}${KANGUR_EMBED_SCOPED_QUERY_PARAM_SEPARATOR}${key}`;
};

export const getKangurInternalQueryParamKeys = (basePath?: string | null): string[] =>
  KANGUR_INTERNAL_QUERY_PARAM_KEYS.map((key) => getKangurInternalQueryParamName(key, basePath));

export const readKangurUrlParam = (
  searchParams: URLSearchParams,
  key: KangurInternalQueryParamKey,
  basePath?: string | null
): string | null => {
  const scopedValue = searchParams.get(getKangurInternalQueryParamName(key, basePath));
  if (scopedValue !== null) {
    return scopedValue;
  }

  if (!getKangurEmbeddedScopeKey(basePath)) {
    return null;
  }

  return searchParams.get(key);
};

export const getKangurPageSlug = (pageName: string): string => {
  const mappedSlug = KANGUR_PAGE_TO_SLUG[pageName];
  return mappedSlug ?? toKebabCase(pageName);
};

export const appendKangurUrlParams = (
  href: string,
  params: Record<string, string | number | boolean | null | undefined>,
  basePath?: string | null
): string => {
  try {
    const parsed = new URL(href, 'https://kangur.local');

    Object.entries(params).forEach(([key, value]) => {
      const resolvedKey = isKangurInternalQueryParamKey(key)
        ? getKangurInternalQueryParamName(key, basePath)
        : key;

      if (value === null || value === undefined || value === '') {
        parsed.searchParams.delete(resolvedKey);
        return;
      }
      parsed.searchParams.set(resolvedKey, String(value));
    });

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return href;
  }
};

export const normalizeKangurBasePath = (basePath: string | null | undefined): string => {
  const embeddedBasePath = parseKangurEmbeddedBasePath(basePath);
  if (embeddedBasePath) {
    return buildKangurEmbeddedBasePath(embeddedBasePath.hostPath, embeddedBasePath.scopeKey);
  }

  if (typeof basePath !== 'string') {
    return KANGUR_BASE_PATH;
  }

  const trimmed = basePath.trim();
  if (trimmed.length === 0) {
    return KANGUR_BASE_PATH;
  }

  try {
    const parsed = new URL(
      trimmed.startsWith('/') ? trimmed : `/${trimmed}`,
      'https://kangur.local'
    );
    return normalizeKangurHostPathname(parsed.pathname);
  } catch {
    return normalizeKangurHostPathname(trimmed);
  }
};

const joinKangurPath = (basePath: string, suffix: string): string => {
  const normalizedBasePath = normalizeKangurBasePath(basePath);
  const normalizedSuffix = suffix.replace(/^\/+/, '');
  if (normalizedBasePath === '/') {
    return `/${normalizedSuffix}`;
  }
  return `${normalizedBasePath}/${normalizedSuffix}`;
};

export const normalizeKangurRequestedPath = (
  slugSegments: readonly string[] = [],
  basePath: string = KANGUR_BASE_PATH
): string => {
  const normalizedBasePath = normalizeKangurBasePath(basePath);
  const embeddedHostPath = getKangurEmbeddedHostPath(normalizedBasePath);
  if (embeddedHostPath) {
    const requestedSlug = slugSegments.join('/');
    return appendKangurUrlParams(
      embeddedHostPath,
      {
        [KANGUR_EMBED_QUERY_PARAM]: requestedSlug || null,
      },
      normalizedBasePath
    );
  }
  if (slugSegments.length === 0) {
    return normalizedBasePath;
  }
  return joinKangurPath(normalizedBasePath, slugSegments.join('/'));
};

export const resolveKangurPublicBasePathFromHref = (
  href: string,
  currentOrigin: string
): string => {
  try {
    const parsed = new URL(href, currentOrigin);
    if (parsed.origin !== currentOrigin) {
      return KANGUR_BASE_PATH;
    }
    const normalizedPathname = normalizeKangurHostPathname(parsed.pathname);
    return normalizedPathname === KANGUR_BASE_PATH ||
      normalizedPathname.startsWith(`${KANGUR_BASE_PATH}/`)
      ? KANGUR_BASE_PATH
      : '/';
  } catch {
    if (href.startsWith(`${KANGUR_BASE_PATH}/`) || href === KANGUR_BASE_PATH) {
      return KANGUR_BASE_PATH;
    }
    return href.startsWith('/') ? '/' : KANGUR_BASE_PATH;
  }
};

export const getKangurPageHref = (
  pageName: string,
  basePath: string = KANGUR_BASE_PATH
): string => {
  const normalizedBasePath = normalizeKangurBasePath(basePath);
  const slug = getKangurPageSlug(pageName);
  const embeddedHostPath = getKangurEmbeddedHostPath(normalizedBasePath);

  if (embeddedHostPath) {
    return appendKangurUrlParams(
      embeddedHostPath,
      {
        [KANGUR_EMBED_QUERY_PARAM]: slug,
      },
      normalizedBasePath
    );
  }

  return joinKangurPath(normalizedBasePath, slug);
};

export const getKangurHomeHref = (basePath: string = KANGUR_BASE_PATH): string =>
  normalizeKangurRequestedPath([], basePath);

export type ResolvedKangurFeaturePageRoute = {
  normalizedBasePath: string;
  pageKey: string | null;
  requestedPath: string;
};

export const resolveKangurFeaturePageRoute = (
  slug: string[] = [],
  basePath: string = KANGUR_BASE_PATH
): ResolvedKangurFeaturePageRoute => {
  const normalizedBasePath = normalizeKangurBasePath(basePath);
  const activeSlug = slug[0] ?? null;
  const effectiveSlug = activeSlug?.trim().toLowerCase() === 'login' ? [] : slug;
  const pageKey = resolveKangurPageKeyFromSlug(activeSlug);
  const requestedPath = normalizeKangurRequestedPath(effectiveSlug, normalizedBasePath);

  return {
    normalizedBasePath,
    pageKey,
    requestedPath,
  };
};

type KangurPublicSearchParams =
  | URLSearchParams
  | string
  | Record<string, string | string[] | undefined>
  | null
  | undefined;

const toKangurSearchParams = (searchParams: KangurPublicSearchParams): URLSearchParams => {
  if (!searchParams) {
    return new URLSearchParams();
  }

  if (searchParams instanceof URLSearchParams) {
    return new URLSearchParams(searchParams.toString());
  }

  if (typeof searchParams === 'string') {
    const normalizedSearch = searchParams.startsWith('?') ? searchParams.slice(1) : searchParams;
    return new URLSearchParams(normalizedSearch);
  }

  const nextSearchParams = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => nextSearchParams.append(key, entry));
      return;
    }

    if (typeof value === 'string') {
      nextSearchParams.set(key, value);
    }
  });

  return nextSearchParams;
};

export const getKangurCanonicalPublicHref = (
  slugSegments: readonly string[] = [],
  searchParams?: KangurPublicSearchParams
): string => {
  const pathname = normalizeKangurRequestedPath(slugSegments, '/');
  const query = toKangurSearchParams(searchParams).toString();

  return query ? `${pathname}?${query}` : pathname;
};

export const getKangurLoginHref = (
  basePath: string = KANGUR_BASE_PATH,
  callbackUrl?: string | null
): string => {
  const loginPath = joinKangurPath(basePath, 'login');
  if (!callbackUrl) {
    return loginPath;
  }
  try {
    const parsed = new URL(loginPath, 'https://kangur.local');
    parsed.searchParams.set('callbackUrl', callbackUrl);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return loginPath;
  }
};

export const resolveKangurPageKeyFromSlug = (slug: string | null | undefined): string | null => {
  if (!slug) {
    return KANGUR_MAIN_PAGE_KEY;
  }
  if (slug.trim().toLowerCase() === 'login') {
    return KANGUR_MAIN_PAGE_KEY;
  }
  return KANGUR_SLUG_TO_PAGE[slug.toLowerCase()] ?? null;
};

export const resolveKangurPageKey = (
  pageOrSlug: string | null | undefined,
  availablePages: Record<string, unknown>,
  fallback: string = KANGUR_MAIN_PAGE_KEY
): string | null => {
  if (!pageOrSlug) {
    return availablePages[fallback] ? fallback : null;
  }

  if (availablePages[pageOrSlug]) {
    return pageOrSlug;
  }

  const directMatch = Object.keys(availablePages).find(
    (pageKey) => pageKey.toLowerCase() === pageOrSlug.toLowerCase()
  );
  if (directMatch) {
    return directMatch;
  }

  const fromSlug = resolveKangurPageKeyFromSlug(pageOrSlug);
  if (fromSlug && availablePages[fromSlug]) {
    return fromSlug;
  }

  return null;
};
