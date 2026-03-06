export const KANGUR_BASE_PATH = '/kangur';
export const KANGUR_MAIN_PAGE_KEY = 'Game';

export const KANGUR_PAGE_TO_SLUG: Record<string, string> = Object.freeze({
  Game: 'game',
  LearnerProfile: 'profile',
  Lessons: 'lessons',
  ParentDashboard: 'parent-dashboard',
});

const KANGUR_SLUG_TO_PAGE: Record<string, string> = Object.freeze(
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

export const normalizeKangurBasePath = (basePath: string | null | undefined): string => {
  if (typeof basePath !== 'string') {
    return KANGUR_BASE_PATH;
  }

  const trimmed = basePath.trim();
  if (trimmed.length === 0) {
    return KANGUR_BASE_PATH;
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const withoutTrailingSlashes = withLeadingSlash.replace(/\/+$/, '');
  return withoutTrailingSlashes.length > 0 ? withoutTrailingSlashes : '/';
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
  if (slugSegments.length === 0) {
    return normalizedBasePath;
  }
  return joinKangurPath(normalizedBasePath, slugSegments.join('/'));
};

export const getKangurPageHref = (pageName: string, basePath: string = KANGUR_BASE_PATH): string => {
  const mappedSlug = KANGUR_PAGE_TO_SLUG[pageName];
  const slug = mappedSlug ?? toKebabCase(pageName);
  return joinKangurPath(basePath, slug);
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
