export type NormalizedPageSlugLink = { id: string; slug: string };

/**
 * Normalizes page slug links from various formats (legacy string, legacy object, modern DTO).
 */
export const normalizePageSlugLinks = (rawSlugs: unknown): NormalizedPageSlugLink[] => {
  if (!Array.isArray(rawSlugs)) return [];

  const normalized = rawSlugs
    .map((entry: unknown, index: number): NormalizedPageSlugLink | null => {
      if (typeof entry === 'string') {
        const slugValue = entry.trim();
        if (!slugValue) return null;
        return {
          id: `legacy-string-${index}-${slugValue}`,
          slug: slugValue,
        };
      }
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;

      const record = entry as Record<string, unknown>;
      const nestedSlug = record['slug'];
      if (nestedSlug && typeof nestedSlug === 'object' && !Array.isArray(nestedSlug)) {
        const nestedRecord = nestedSlug as Record<string, unknown>;
        const slugValue =
          typeof nestedRecord['slug'] === 'string' ? nestedRecord['slug'].trim() : '';
        if (!slugValue) return null;
        const idValue =
          typeof nestedRecord['id'] === 'string' && nestedRecord['id'].trim()
            ? nestedRecord['id'].trim()
            : `legacy-nested-${index}-${slugValue}`;
        return {
          id: idValue,
          slug: slugValue,
        };
      }

      const slugValue = typeof record['slug'] === 'string' ? record['slug'].trim() : '';
      if (!slugValue) return null;
      const idValue =
        typeof record['id'] === 'string' && record['id'].trim()
          ? record['id'].trim()
          : `legacy-flat-${index}-${slugValue}`;
      return {
        id: idValue,
        slug: slugValue,
      };
    })
    .filter((entry): entry is NormalizedPageSlugLink => Boolean(entry));

  const seen = new Set<string>();
  return normalized.filter((entry) => {
    const key = `${entry.id}:${entry.slug}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Normalizes page slug values to strings.
 */
export const normalizePageSlugValues = (slugs: Array<string | { slug: string }> | null | undefined): string[] =>
  (slugs ?? []).map((slug): string => (typeof slug === 'string' ? slug : slug.slug));
