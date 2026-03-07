import {
  KANGUR_BASE_PATH,
  KANGUR_MAIN_PAGE_KEY,
  KANGUR_EMBED_BASE_PATH_PREFIX,
  KANGUR_EMBED_QUERY_PARAM,
  KANGUR_SLUG_TO_PAGE,
  buildKangurEmbeddedBasePath,
  getKangurEmbeddedHostPath,
  normalizeKangurHostPathname,
  getKangurPageSlug,
  appendKangurUrlParams,
} from '@/shared/contracts/kangur';

export * from '@/shared/contracts/kangur';

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
