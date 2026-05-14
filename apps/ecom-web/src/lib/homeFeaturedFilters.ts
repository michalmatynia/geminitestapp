import type { HomeUniverseCategoryPrefix } from '@/data/homeCategoryFilters';
import { getHomeUniverseCategoryValues, type CatalogCategoryOption } from './homeCategoryLinks';

export type { CatalogCategoryOption };

export type HomeFeaturedFilterKey = 'all' | HomeUniverseCategoryPrefix;

export type HomeFeaturedFilterConfig = {
  categories: string[];
  href: string;
  key: HomeFeaturedFilterKey | null;
  label: string;
};

export function resolveHomeFeaturedFilterKey(label: string): HomeFeaturedFilterKey | null {
  if (/\ball\b/i.test(label)) return 'all';
  if (/\banime\b/i.test(label)) return 'Anime';
  if (/\bgaming\b/i.test(label)) return 'Gaming';
  if (/\bfilm\b|\btv\b|\bcinema\b|\bmovie\b/i.test(label)) return 'Movie';
  return null;
}

export function buildHomeFeaturedFilterHref(categories: string[]): string {
  if (categories.length === 0) return '/products';
  const params = new URLSearchParams();
  params.set('categories', categories.join(','));
  return `/products?${params.toString()}`;
}

export function getHomeFeaturedFilterConfigs(
  filters: string[],
  catalogCategories: CatalogCategoryOption[] = [],
): HomeFeaturedFilterConfig[] {
  return filters.map((label) => {
    const key = resolveHomeFeaturedFilterKey(label);
    const categories = key !== null && key !== 'all'
      ? getHomeUniverseCategoryValues(key, catalogCategories)
      : [];
    return {
      categories,
      href: buildHomeFeaturedFilterHref(categories),
      key,
      label,
    };
  });
}
