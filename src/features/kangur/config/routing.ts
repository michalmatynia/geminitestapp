export const KANGUR_BASE_PATH = '/kangur';
export const KANGUR_MAIN_PAGE_KEY = 'Game';

export const KANGUR_PAGE_TO_SLUG: Record<string, string> = Object.freeze({
  Game: 'game',
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

export const normalizeKangurRequestedPath = (slugSegments: readonly string[] = []): string => {
  if (slugSegments.length === 0) {
    return KANGUR_BASE_PATH;
  }
  return `${KANGUR_BASE_PATH}/${slugSegments.join('/')}`;
};

export const getKangurPageHref = (pageName: string): string => {
  const mappedSlug = KANGUR_PAGE_TO_SLUG[pageName];
  const slug = mappedSlug ?? toKebabCase(pageName);
  return `${KANGUR_BASE_PATH}/${slug}`;
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
