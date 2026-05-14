import type { HomeCategoryCardContent } from '@/data/homeContent';
import {
  HOME_UNIVERSE_CATEGORY_FILTERS,
  type HomeUniverseCategoryPrefix,
} from '@/data/homeCategoryFilters';

export type HomeProductTypeFilterKey = 'Bracelets' | 'Dice' | 'Keychains' | 'Pins' | 'Rings';

export type CatalogCategoryOption = {
  name: string;
  parentName?: string | null;
};

export const FALLBACK_MOVIE_CATEGORY_FILTERS = HOME_UNIVERSE_CATEGORY_FILTERS.Movie;

export const HOME_PRODUCT_TYPE_CATEGORY_FILTERS: Record<HomeProductTypeFilterKey, string[]> = {
  Bracelets: [
    'Gaming Bracelets',
  ],
  Dice: [
    'Keychain Mini Dice',
    'Set Of 7 Dice',
  ],
  Keychains: [
    'Anime Keychain',
    'Gaming Keychain',
    'Movie Keychain',
  ],
  Pins: [
    'Anime Pin',
    'Gaming Pin',
    'Movie Pin',
  ],
  Rings: [
    'Anime Ring',
    'Gaming Ring',
    'Movie Ring',
  ],
};

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

function hasLiveUniverseCategoryWord(value: string, prefix: HomeUniverseCategoryPrefix): boolean {
  if (prefix !== 'Movie') return hasPrefixWord(value, prefix);
  return /\b(movie|film|tv|cinema)\b/i.test(value);
}

function getProductTypePattern(key: HomeProductTypeFilterKey): RegExp {
  if (key === 'Bracelets') return /\bbracelets?\b/i;
  if (key === 'Dice') return /\bdice\b/i;
  if (key === 'Keychains') return /\bkeychains?\b/i;
  if (key === 'Pins') return /\bpins?\b/i;
  return /\brings?\b/i;
}

function hasLiveProductTypeWord(category: CatalogCategoryOption, key: HomeProductTypeFilterKey): boolean {
  const pattern = getProductTypePattern(key);
  return pattern.test(category.name) || pattern.test(category.parentName ?? '');
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

export function resolveHomeProductTypeFilterKey(label: string): HomeProductTypeFilterKey | null {
  if (/\bbracelets?\b|\bbransolet/i.test(label)) return 'Bracelets';
  if (/\bdice\b|\bko[sś]ci\b/i.test(label)) return 'Dice';
  if (/\bkeychains?\b|\bbreloki?\b/i.test(label)) return 'Keychains';
  if (/\bpins?\b|\bpiny?\b/i.test(label)) return 'Pins';
  if (/\brings?\b|\bpier[sś]cion/i.test(label)) return 'Rings';
  return null;
}

export function getHomeUniverseCategoryValues(
  prefix: HomeUniverseCategoryPrefix,
  catalogCategories: CatalogCategoryOption[] = [],
  configuredValues: string[] = [],
): string[] {
  const liveCategories = uniqueTrimmed(
    catalogCategories
      .map((category) => category.name)
      .filter((name) => hasLiveUniverseCategoryWord(name, prefix)),
  );
  if (liveCategories.length > 0) return liveCategories;

  const configuredCategories = configuredValues.filter((value) => hasPrefixWord(value, prefix));
  return configuredCategories.length > 0
    ? configuredCategories
    : HOME_UNIVERSE_CATEGORY_FILTERS[prefix];
}

export function getHomeProductTypeCategoryValues(
  key: HomeProductTypeFilterKey,
  catalogCategories: CatalogCategoryOption[] = [],
  configuredValues: string[] = [],
): string[] {
  const liveCategories = uniqueTrimmed(
    catalogCategories
      .filter((category) => hasLiveProductTypeWord(category, key))
      .map((category) => category.name),
  );
  if (liveCategories.length > 0) return liveCategories;

  const pattern = getProductTypePattern(key);
  const configuredCategories = configuredValues.filter((value) => pattern.test(value));
  return configuredCategories.length > 0
    ? configuredCategories
    : HOME_PRODUCT_TYPE_CATEGORY_FILTERS[key];
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

export function buildHomeProductTypeCategoryHref(
  key: HomeProductTypeFilterKey,
  catalogCategories: CatalogCategoryOption[] = [],
  configuredValues: string[] = [],
): string {
  return buildCategoryHref(getHomeProductTypeCategoryValues(key, catalogCategories, configuredValues));
}

export function getHomeCategoryCardHref(
  card: HomeCategoryCardContent,
  catalogCategories: CatalogCategoryOption[] = [],
): string {
  if (card.selectorType === 'all') return '/products';
  const values = uniqueTrimmed(card.selectorValues);
  const universePrefix = resolveUniversePrefix(card);
  if (universePrefix !== null) {
    return buildCategoryHref(getHomeUniverseCategoryValues(universePrefix, catalogCategories, values));
  }
  const selectorHref = selectorValuesHref(card.selectorType, values);
  if (selectorHref !== null) {
    return selectorHref;
  }
  return card.href.length === 0 ? '/products' : card.href;
}
