import { validationError } from '@/shared/errors/app-error';

export type NormalizedPageSlugLink = { id: string; slug: string };

export const normalizePageSlugLinks = (rawSlugs: unknown): NormalizedPageSlugLink[] => {
  if (rawSlugs == null) return [];
  if (!Array.isArray(rawSlugs)) {
    throw validationError('Invalid page slug links payload.', {
      source: 'cms.slug_links',
      reason: 'payload_not_array',
    });
  }

  return rawSlugs.map((entry: unknown, index: number): NormalizedPageSlugLink => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw validationError('Invalid page slug link payload.', {
        source: 'cms.slug_links',
        reason: 'entry_not_object',
        index,
      });
    }
    const record = entry as Record<string, unknown>;
    const id = typeof record['id'] === 'string' ? record['id'].trim() : '';
    const slug = typeof record['slug'] === 'string' ? record['slug'].trim() : '';
    if (!id || !slug) {
      throw validationError('Invalid page slug link payload.', {
        source: 'cms.slug_links',
        reason: 'missing_id_or_slug',
        index,
      });
    }
    return { id, slug };
  });
};

export const normalizePageSlugValues = (slugs: unknown): string[] =>
  normalizePageSlugLinks(slugs).map((slug: NormalizedPageSlugLink): string => slug.slug);
