export type NormalizedPageSlugLink = { id: string; slug: string };

export const normalizePageSlugLinks = (rawSlugs: unknown): NormalizedPageSlugLink[] => {
  if (rawSlugs == null) return [];
  if (!Array.isArray(rawSlugs)) {
    throw new Error('Invalid page slug links payload.');
  }

  return rawSlugs.map((entry: unknown, index: number): NormalizedPageSlugLink => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`Invalid page slug link at index ${index}.`);
    }
    const record = entry as Record<string, unknown>;
    const id = typeof record['id'] === 'string' ? record['id'].trim() : '';
    const slug = typeof record['slug'] === 'string' ? record['slug'].trim() : '';
    if (!id || !slug) {
      throw new Error(`Page slug link at index ${index} must include id and slug.`);
    }
    return { id, slug };
  });
};

export const normalizePageSlugValues = (slugs: unknown): string[] =>
  normalizePageSlugLinks(slugs).map((slug: NormalizedPageSlugLink): string => slug.slug);
