export const KANGUR_BASE_PATH = '/kangur';
export const KANGUR_MAIN_PAGE_KEY = 'Game';
export const KANGUR_EMBED_QUERY_PARAM = 'kangur';
export const KANGUR_EMBED_BASE_PATH_PREFIX = '__kangur_embed__:';
export const KANGUR_INTERNAL_QUERY_PARAM_KEYS = [
  KANGUR_EMBED_QUERY_PARAM,
  'focus',
  'quickStart',
  'operation',
  'difficulty',
  'categories',
  'count',
] as const;

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
    const parsed = new URL(trimmed.startsWith('/') ? trimmed : `/${trimmed}`, 'https://kangur.local');
    const normalizedPathname = normalizeKangurHostPathname(parsed.pathname);
    return `${normalizedPathname}${parsed.search}${parsed.hash}`;
  } catch {
    return normalizeKangurHostPathname(trimmed);
  }
};

export const buildKangurEmbeddedBasePath = (hostPath: string): string =>
  `${KANGUR_EMBED_BASE_PATH_PREFIX}${normalizeKangurHostPath(hostPath)}`;

export const isKangurEmbeddedBasePath = (basePath: string | null | undefined): boolean =>
  typeof basePath === 'string' && basePath.trim().startsWith(KANGUR_EMBED_BASE_PATH_PREFIX);

export const getKangurEmbeddedHostPath = (basePath: string | null | undefined): string | null => {
  if (!isKangurEmbeddedBasePath(basePath)) {
    return null;
  }

  const rawHostPath = basePath!.trim().slice(KANGUR_EMBED_BASE_PATH_PREFIX.length);
  return normalizeKangurHostPath(rawHostPath);
};

export const getKangurPageSlug = (pageName: string): string => {
  const mappedSlug = KANGUR_PAGE_TO_SLUG[pageName];
  return mappedSlug ?? toKebabCase(pageName);
};

export const appendKangurUrlParams = (
  href: string,
  params: Record<string, string | number | boolean | null | undefined>
): string => {
  try {
    const parsed = new URL(href, 'https://kangur.local');

    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        parsed.searchParams.delete(key);
        return;
      }
      parsed.searchParams.set(key, String(value));
    });

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return href;
  }
};

export const normalizeKangurBasePath = (basePath: string | null | undefined): string => {
  const embeddedHostPath = getKangurEmbeddedHostPath(basePath);
  if (embeddedHostPath) {
    return buildKangurEmbeddedBasePath(embeddedHostPath);
  }

  if (typeof basePath !== 'string') {
    return KANGUR_BASE_PATH;
  }

  const trimmed = basePath.trim();
  if (trimmed.length === 0) {
    return KANGUR_BASE_PATH;
  }

  try {
    const parsed = new URL(trimmed.startsWith('/') ? trimmed : `/${trimmed}`, 'https://kangur.local');
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
    return appendKangurUrlParams(embeddedHostPath, {
      [KANGUR_EMBED_QUERY_PARAM]: requestedSlug || null,
    });
  }
  if (slugSegments.length === 0) {
    return normalizedBasePath;
  }
  return joinKangurPath(normalizedBasePath, slugSegments.join('/'));
};

export const getKangurPageHref = (
  pageName: string,
  basePath: string = KANGUR_BASE_PATH
): string => {
  const normalizedBasePath = normalizeKangurBasePath(basePath);
  const slug = getKangurPageSlug(pageName);
  const embeddedHostPath = getKangurEmbeddedHostPath(normalizedBasePath);

  if (embeddedHostPath) {
    return appendKangurUrlParams(embeddedHostPath, {
      [KANGUR_EMBED_QUERY_PARAM]: slug,
    });
  }

  return joinKangurPath(normalizedBasePath, slug);
};

export const resolveKangurPageKeyFromSlug = (slug: string | null | undefined): string | null => {
  if (!slug) {
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
