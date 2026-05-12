import type { HomeCategoryCardContent } from '@/data/homeContent';
import {
  HOME_UNIVERSE_CATEGORY_FILTERS,
  type HomeUniverseCategoryPrefix,
} from '@/data/homeCategoryFilters';

export type CatalogCategoryOption = {
  name: string;
};

export const FALLBACK_MOVIE_CATEGORY_FILTERS = HOME_UNIVERSE_CATEGORY_FILTERS.Movie;

function uniqueTrimmed(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    if (normalized.length === 0 || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function hasPrefixWord(value: string, prefix: HomeUniverseCategoryPrefix): boolean {
  return new RegExp(`\\b${prefix}\\b`, 'i').test(value);
}

function resolveUniversePrefix(card: HomeCategoryCardContent): HomeUniverseCategoryPrefix | null {
  const haystack = [
    card.id,
    card.label,
    card.sublabel,
    card.tag,
    card.href,
    ...card.selectorValues,
  ].join(' ');

  if (/\banime\b/i.test(haystack)) return 'Anime';
  if (/\bgaming\b/i.test(haystack)) return 'Gaming';
  if (/\bfilm\b|\btv\b|\bcinema\b|\bmovie\b/i.test(haystack)) return 'Movie';
  return null;
}

function resolveUniverseCategoryValues(
  prefix: HomeUniverseCategoryPrefix,
  configuredValues: string[],
  catalogCategories: CatalogCategoryOption[] = [],
): string[] {
  const liveCategories = uniqueTrimmed(
    catalogCategories
      .map((category) => category.name)
      .filter((name) => hasPrefixWord(name, prefix)),
  );
  if (liveCategories.length > 0) return liveCategories;

  const configuredCategories = configuredValues.filter((value) => hasPrefixWord(value, prefix));
  return configuredCategories.length > 0
    ? configuredCategories
    : HOME_UNIVERSE_CATEGORY_FILTERS[prefix];
}

function selectorValuesHref(selectorType: HomeCategoryCardContent['selectorType'], values: string[]): string | null {
  if (values.length === 0) return null;

  let selectorParam: string | null = null;
  if (selectorType === 'category') selectorParam = 'categories';
  if (selectorType === 'theme') selectorParam = 'themes';
  if (selectorParam === null) return null;

  const params = new URLSearchParams();
  params.set(selectorParam, values.join(','));
  return `/products?${params.toString()}`;
}

function buildCategoryHref(values: string[]): string {
  const params = new URLSearchParams();
  params.set('categories', values.join(','));
  return `/products?${params.toString()}`;
}

export function getHomeCategoryCardHref(
  card: HomeCategoryCardContent,
  catalogCategories: CatalogCategoryOption[] = [],
): string {
  if (card.selectorType === 'all') return '/products';
  const values = uniqueTrimmed(card.selectorValues);
  const universePrefix = resolveUniversePrefix(card);
  if (universePrefix !== null) {
    return buildCategoryHref(resolveUniverseCategoryValues(universePrefix, values, catalogCategories));
  }
  const selectorHref = selectorValuesHref(card.selectorType, values);
  if (selectorHref !== null) {
    return selectorHref;
  }
  return card.href.length === 0 ? '/products' : card.href;
}
