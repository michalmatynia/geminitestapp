import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductTitleTerm, ProductTitleTermType } from '@/shared/contracts/products/title-terms';
import {
  resolveLocalizedCategoryName,
  resolveLocalizedTitleTermName,
  type StructuredProductTitleLocale,
} from '@/shared/lib/products/title-terms';

import {
  CATEGORY_STAGE,
  type SegmentContextUpdate,
  type SuggestionOption,
  type TitleSegmentStage,
} from './StructuredProductNameField.types';

export const normalizeSegmentValue = (value: string): string => value.trim().replace(/\s+/g, ' ');

const normalizeSuggestionKey = (value: string): string => normalizeSegmentValue(value).toLowerCase();

const sortSuggestionOptions = (options: SuggestionOption[]): SuggestionOption[] =>
  [...options].sort((left, right) =>
    left.label.localeCompare(right.label, undefined, {
      sensitivity: 'base',
    })
  );

export const resolveStageType = (stage: TitleSegmentStage): ProductTitleTermType => {
  if (stage === 1) return 'size';
  if (stage === 2) return 'material';
  return 'theme';
};

export const countPipesBeforeCaret = (value: string, caret: number): number =>
  value.slice(0, caret).split('|').length - 1;

export const resolveSegmentContextUpdate = (
  value: string,
  caret: number | null
): SegmentContextUpdate => {
  if (caret === null) return { activeStage: null, bounds: null, query: '' };
  const stage = countPipesBeforeCaret(value, caret);
  if (stage < 1 || stage > 4) return { activeStage: null, bounds: null, query: '' };
  const leftBoundary = value.lastIndexOf('|', Math.max(0, caret - 1));
  const rightBoundary = value.indexOf('|', caret);
  const start = leftBoundary === -1 ? 0 : leftBoundary + 1;
  const end = rightBoundary === -1 ? value.length : rightBoundary;
  return {
    activeStage: stage as TitleSegmentStage,
    bounds: { start, end },
    query: normalizeSegmentValue(value.slice(start, end)),
  };
};

const resolveLastNonEmptySegmentIndex = (segments: string[]): number => {
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index];
    if (typeof segment === 'string' && segment.trim() !== '') return index;
  }
  return 0;
};

export const findEnabledSuggestionIndex = (
  suggestions: SuggestionOption[],
  startIndex: number,
  direction: 1 | -1
): number => {
  if (suggestions.length === 0) return 0;

  let nextIndex = Math.min(Math.max(startIndex, 0), suggestions.length - 1);
  for (let steps = 0; steps < suggestions.length; steps += 1) {
    const candidate = suggestions[nextIndex];
    if (candidate !== undefined && candidate.disabled !== true) return nextIndex;
    const fallbackIndex = nextIndex + direction;
    if (fallbackIndex < 0 || fallbackIndex >= suggestions.length) break;
    nextIndex = fallbackIndex;
  }

  return startIndex;
};

export const replaceStructuredSegment = (
  value: string,
  stage: TitleSegmentStage,
  nextSegmentValue: string
): string => {
  const normalizedSegments = value.split('|').map((segment: string) => normalizeSegmentValue(segment));
  while (normalizedSegments.length <= stage) {
    normalizedSegments.push('');
  }
  normalizedSegments[stage] = normalizeSegmentValue(nextSegmentValue);

  const hasLaterContent = normalizedSegments
    .slice(stage + 1)
    .some((segment: string): boolean => segment.length > 0);
  const lastRelevantIndex = resolveLastNonEmptySegmentIndex(normalizedSegments);
  const nextValue = normalizedSegments
    .slice(0, Math.max(lastRelevantIndex, stage) + 1)
    .join(' | ')
    .trim();

  return hasLaterContent === false && stage < 4 ? `${nextValue} | ` : nextValue;
};

const uniqueSuggestionValues = (values: Array<string | null | undefined>): string[] =>
  Array.from(
    new Set(
      values
        .map((value: string | null | undefined): string => normalizeSegmentValue(value ?? ''))
        .filter((value: string): boolean => value.length > 0)
    )
  );

const resolveTitleTermDescription = (
  term: ProductTitleTerm,
  locale: StructuredProductTitleLocale,
  value: string
): string | undefined => {
  const fallback = locale === 'pl' ? term.name_en : term.name_pl;
  return typeof fallback === 'string' && fallback !== '' && fallback !== value ? fallback : undefined;
};

const buildTitleTermSuggestion = (
  term: ProductTitleTerm,
  locale: StructuredProductTitleLocale
): SuggestionOption => {
  const value = resolveLocalizedTitleTermName(term, locale);
  const aliases = uniqueSuggestionValues([term.name_en, term.name_pl, value]);
  return {
    value,
    label: value,
    aliases,
    searchText: aliases.join(' '),
    description: resolveTitleTermDescription(term, locale, value),
  };
};

const sortCategories = (
  items: ProductCategory[],
  locale: StructuredProductTitleLocale
): ProductCategory[] =>
  [...items].sort((left, right) => {
    const leftSortIndex = left.sortIndex ?? Number.MAX_SAFE_INTEGER;
    const rightSortIndex = right.sortIndex ?? Number.MAX_SAFE_INTEGER;
    if (leftSortIndex !== rightSortIndex) return leftSortIndex - rightSortIndex;
    return resolveLocalizedCategoryName(left, locale).localeCompare(
      resolveLocalizedCategoryName(right, locale)
    );
  });

const toCategorySuggestion = (
  category: ProductCategory,
  path: string[],
  hasChildren: boolean,
  locale: StructuredProductTitleLocale
): SuggestionOption => {
  const value = resolveLocalizedCategoryName(category, locale);
  const label = [...path, value].join(' / ');
  const aliases = uniqueSuggestionValues([
    value,
    category.name,
    category.name_en,
    category.name_pl,
    category.name_de,
  ]);
  return {
    value,
    label,
    aliases,
    searchText: [...aliases, label].join(' '),
    disabled: hasChildren,
    categoryId: category.id,
    description: hasChildren ? 'Parent category' : undefined,
  };
};

const indexCategories = (
  categories: ProductCategory[]
): { byParentId: Map<string | null, ProductCategory[]>; parentIds: Set<string> } => {
  const byParentId = new Map<string | null, ProductCategory[]>();
  const parentIds = new Set<string>();
  for (const category of categories) {
    const parentId = category.parentId ?? null;
    byParentId.set(parentId, [...(byParentId.get(parentId) ?? []), category]);
    if (parentId !== null) parentIds.add(parentId);
  }
  return { byParentId, parentIds };
};

const collectCategorySuggestions = ({
  parentId,
  path,
  byParentId,
  parentIds,
  locale,
  collected,
}: {
  parentId: string | null;
  path: string[];
  byParentId: Map<string | null, ProductCategory[]>;
  parentIds: Set<string>;
  locale: StructuredProductTitleLocale;
  collected: SuggestionOption[];
}): void => {
  const siblings = sortCategories(byParentId.get(parentId) ?? [], locale);
  for (const category of siblings) {
    const hasChildren = parentIds.has(category.id);
    const value = resolveLocalizedCategoryName(category, locale);
    collected.push(toCategorySuggestion(category, path, hasChildren, locale));
    collectCategorySuggestions({
      parentId: category.id,
      path: [...path, value],
      byParentId,
      parentIds,
      locale,
      collected,
    });
  }
};

export const buildCategorySuggestions = (
  categories: ProductCategory[],
  locale: StructuredProductTitleLocale
): SuggestionOption[] => {
  const { byParentId, parentIds } = indexCategories(categories);
  const collected: SuggestionOption[] = [];
  collectCategorySuggestions({
    parentId: null,
    path: [],
    byParentId,
    parentIds,
    locale,
    collected,
  });
  return collected;
};

export const resolveUniqueLeafCategorySuggestion = (
  suggestions: SuggestionOption[],
  value: string
): SuggestionOption | null => {
  const normalizedValue = normalizeSegmentValue(value);
  if (normalizedValue === '') return null;
  const normalizedKey = normalizeSuggestionKey(normalizedValue);
  const matches = suggestions.filter(
    (option) =>
      option.disabled !== true &&
      option.aliases.some((alias: string): boolean => normalizeSuggestionKey(alias) === normalizedKey)
  );
  return matches.length === 1 ? matches[0] ?? null : null;
};

const resolveTitleTermSource = ({
  type,
  sizeTerms,
  materialTerms,
  themeTerms,
}: {
  type: ProductTitleTermType;
  sizeTerms: ProductTitleTerm[];
  materialTerms: ProductTitleTerm[];
  themeTerms: ProductTitleTerm[];
}): ProductTitleTerm[] => {
  if (type === 'size') return sizeTerms;
  if (type === 'material') return materialTerms;
  return themeTerms;
};

export const buildSuggestionsForStage = ({
  activeStage,
  query,
  locale,
  categorySuggestions,
  sizeTerms,
  materialTerms,
  themeTerms,
}: {
  activeStage: TitleSegmentStage | null;
  query: string;
  locale: StructuredProductTitleLocale;
  categorySuggestions: SuggestionOption[];
  sizeTerms: ProductTitleTerm[];
  materialTerms: ProductTitleTerm[];
  themeTerms: ProductTitleTerm[];
}): SuggestionOption[] => {
  const normalizedQuery = normalizeSegmentValue(query);
  if (activeStage === null || normalizedQuery === '') return [];
  const normalizedQueryLower = normalizedQuery.toLowerCase();
  if (activeStage === CATEGORY_STAGE) {
    return categorySuggestions.filter((option) =>
      option.searchText.toLowerCase().includes(normalizedQueryLower)
    );
  }
  const type = resolveStageType(activeStage);
  return sortSuggestionOptions(
    resolveTitleTermSource({ type, sizeTerms, materialTerms, themeTerms })
      .map((term: ProductTitleTerm): SuggestionOption => buildTitleTermSuggestion(term, locale))
      .filter((option) => option.searchText.toLowerCase().includes(normalizedQueryLower))
  );
};
