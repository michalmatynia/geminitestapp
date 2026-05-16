import type { ProductCategory } from '@/shared/contracts/products/categories';

import { buildLeafCategoryHierarchyEntries } from './leafCategoryHierarchy';

export type NormalizeProductNameCategoryContextLeaf = {
  label: string;
  fullPath?: string | null;
};

export type NormalizeProductNameCategoryContext = {
  leafCategories: NormalizeProductNameCategoryContextLeaf[];
  allowedLeafLabels?: string[] | null;
  totalLeafCategories?: number | null;
};

type LeafCategoryMatchResult =
  | {
      canonicalCategoryName: string;
    }
  | {
      error: 'missing' | 'ambiguous' | 'too_generic';
    };

type CategoryLookupMaps = {
  entriesByHierarchyPath: Map<string, string>;
  entriesByLeafName: Map<string, string[]>;
};

type NormalizedContextLeafEntry = {
  label: string;
  normalizedLabel: string;
  normalizedFullPath: string;
};

export const normalizeComparable = (value: string): string =>
  value.trim().replace(/\s+/g, ' ').toLowerCase();

const normalizeHierarchyComparable = (value: string): string =>
  value
    .split(/\s*(?:>|\/)\s*/)
    .map((segment) => normalizeComparable(segment))
    .filter((segment) => segment.length > 0)
    .join(' > ');

const resolveMatchingLeafNamesForNonTerminalSegment = (
  entries: ReturnType<typeof buildLeafCategoryHierarchyEntries>,
  rawCategoryValue: string
): string[] => {
  const normalizedCategoryValue = normalizeComparable(rawCategoryValue);
  if (normalizedCategoryValue.length === 0) return [];

  return Array.from(
    new Set(
      entries
        .filter((entry) =>
          entry.pathSegments
            .slice(0, -1)
            .map((segment) => normalizeComparable(segment))
            .includes(normalizedCategoryValue)
        )
        .map((entry) => entry.leafName)
    )
  );
};

const buildCategoryLookupMaps = (
  entries: ReturnType<typeof buildLeafCategoryHierarchyEntries>
): CategoryLookupMaps => {
  const entriesByHierarchyPath = new Map<string, string>();
  const entriesByLeafName = new Map<string, string[]>();

  entries.forEach((entry) => {
    const normalizedHierarchyPath = normalizeHierarchyComparable(entry.hierarchyPath);
    if (
      normalizedHierarchyPath.length > 0 &&
      !entriesByHierarchyPath.has(normalizedHierarchyPath)
    ) {
      entriesByHierarchyPath.set(normalizedHierarchyPath, entry.leafName);
    }

    const normalizedLeafName = normalizeComparable(entry.leafName);
    if (normalizedLeafName.length === 0) return;
    const matches = entriesByLeafName.get(normalizedLeafName) ?? [];
    matches.push(entry.leafName);
    entriesByLeafName.set(normalizedLeafName, matches);
  });

  return { entriesByHierarchyPath, entriesByLeafName };
};

const resolveHierarchyCategoryMatch = (
  normalizedHierarchyInput: string,
  entriesByHierarchyPath: Map<string, string>
): LeafCategoryMatchResult | null => {
  if (normalizedHierarchyInput.length === 0) return null;
  const hierarchyMatch = entriesByHierarchyPath.get(normalizedHierarchyInput);
  return hierarchyMatch !== undefined ? { canonicalCategoryName: hierarchyMatch } : null;
};

const resolveLeafMatches = (leafMatches: string[]): LeafCategoryMatchResult | null => {
  if (leafMatches.length === 1) {
    const [leafMatch] = leafMatches;
    return leafMatch !== undefined ? { canonicalCategoryName: leafMatch } : null;
  }
  return leafMatches.length > 1 ? { error: 'ambiguous' } : null;
};

const getNormalizedLeafInput = (
  normalizedHierarchyInput: string,
  fallbackValue: string
): string => {
  const hierarchyLeaf = normalizedHierarchyInput
    .split(' > ')
    .filter((value) => value.length > 0)
    .pop();
  return hierarchyLeaf ?? fallbackValue;
};

const resolveLeafCategoryMatch = (
  categories: ProductCategory[],
  rawCategoryValue: string
): LeafCategoryMatchResult => {
  const entries = buildLeafCategoryHierarchyEntries(categories);
  const { entriesByHierarchyPath, entriesByLeafName } = buildCategoryLookupMaps(entries);
  const normalizedHierarchyInput = normalizeHierarchyComparable(rawCategoryValue);
  const hierarchyMatch = resolveHierarchyCategoryMatch(
    normalizedHierarchyInput,
    entriesByHierarchyPath
  );
  if (hierarchyMatch !== null) return hierarchyMatch;

  if (resolveMatchingLeafNamesForNonTerminalSegment(entries, rawCategoryValue).length > 0) {
    return { error: 'too_generic' };
  }

  const normalizedLeafInput = getNormalizedLeafInput(
    normalizedHierarchyInput,
    normalizeComparable(rawCategoryValue)
  );
  const leafMatches = entriesByLeafName.get(normalizedLeafInput) ?? [];
  const leafMatch = resolveLeafMatches(leafMatches);
  return leafMatch ?? { error: 'missing' };
};

const normalizeContextLeafEntry = (
  entry: NormalizeProductNameCategoryContextLeaf
): NormalizedContextLeafEntry | null => {
  const label = normalizeComparable(entry.label);
  if (label.length === 0) return null;
  return {
    label: entry.label.trim(),
    normalizedLabel: label,
    normalizedFullPath: normalizeHierarchyComparable(entry.fullPath ?? entry.label),
  };
};

const isNormalizedContextLeafEntry = (
  entry: NormalizedContextLeafEntry | null
): entry is NormalizedContextLeafEntry => entry !== null;

const buildContextCategoryLookupMaps = (
  normalizedLeafEntries: NormalizedContextLeafEntry[]
): CategoryLookupMaps => {
  const entriesByHierarchyPath = new Map<string, string>();
  const entriesByLeafName = new Map<string, string[]>();

  normalizedLeafEntries.forEach((entry) => {
    if (
      entry.normalizedFullPath.length > 0 &&
      !entriesByHierarchyPath.has(entry.normalizedFullPath)
    ) {
      entriesByHierarchyPath.set(entry.normalizedFullPath, entry.label);
    }

    const matches = entriesByLeafName.get(entry.normalizedLabel) ?? [];
    matches.push(entry.label);
    entriesByLeafName.set(entry.normalizedLabel, matches);
  });

  return { entriesByHierarchyPath, entriesByLeafName };
};

const hasNonTerminalContextMatch = (
  normalizedLeafEntries: NormalizedContextLeafEntry[],
  normalizedCategoryValue: string
): boolean =>
  normalizedLeafEntries.some((entry) =>
    entry.normalizedFullPath
      .split(' > ')
      .slice(0, -1)
      .includes(normalizedCategoryValue)
  );

const resolveLeafCategoryMatchFromContext = (
  categoryContext: NormalizeProductNameCategoryContext,
  rawCategoryValue: string
): LeafCategoryMatchResult => {
  const normalizedLeafEntries = categoryContext.leafCategories
    .map(normalizeContextLeafEntry)
    .filter(isNormalizedContextLeafEntry);

  if (normalizedLeafEntries.length === 0) return { error: 'missing' };

  const { entriesByHierarchyPath, entriesByLeafName } =
    buildContextCategoryLookupMaps(normalizedLeafEntries);
  const normalizedHierarchyInput = normalizeHierarchyComparable(rawCategoryValue);
  const hierarchyMatch = resolveHierarchyCategoryMatch(
    normalizedHierarchyInput,
    entriesByHierarchyPath
  );
  if (hierarchyMatch !== null) return hierarchyMatch;

  const normalizedCategoryValue = normalizeComparable(rawCategoryValue);
  if (hasNonTerminalContextMatch(normalizedLeafEntries, normalizedCategoryValue)) {
    return { error: 'too_generic' };
  }

  const normalizedLeafInput = getNormalizedLeafInput(
    normalizedHierarchyInput,
    normalizedCategoryValue
  );
  const leafMatches = entriesByLeafName.get(normalizedLeafInput) ?? [];
  const leafMatch = resolveLeafMatches(leafMatches);
  return leafMatch ?? { error: 'missing' };
};

export const hasUnavailableCategoryContext = (
  categoryContext: NormalizeProductNameCategoryContext | null | undefined
): boolean =>
  categoryContext !== null &&
  categoryContext !== undefined &&
  typeof categoryContext.totalLeafCategories === 'number' &&
  categoryContext.totalLeafCategories <= 0;

const shouldUseCategoryContext = (
  categoryContext: NormalizeProductNameCategoryContext | null | undefined
): categoryContext is NormalizeProductNameCategoryContext =>
  categoryContext !== null &&
  categoryContext !== undefined &&
  categoryContext.leafCategories.length > 0;

export const resolveCategoryCandidates = (
  parsedCategory: string,
  categoryHint: string | null | undefined
): string[] =>
  [typeof categoryHint === 'string' ? categoryHint.trim() : '', parsedCategory].filter(
    (value, index, values): value is string =>
      value.length > 0 && values.indexOf(value) === index
  );

export const resolveCategoryMatches = (args: {
  categories: ProductCategory[];
  categoryCandidates: string[];
  categoryContext?: NormalizeProductNameCategoryContext | null;
}): LeafCategoryMatchResult[] => {
  const categoryContext = args.categoryContext ?? null;
  if (shouldUseCategoryContext(categoryContext)) {
    return args.categoryCandidates.map((value) =>
      resolveLeafCategoryMatchFromContext(categoryContext, value)
    );
  }
  return args.categoryCandidates.map((value) => resolveLeafCategoryMatch(args.categories, value));
};

export const resolveCategoryError = (
  categoryMatches: LeafCategoryMatchResult[]
): 'missing' | 'ambiguous' | 'too_generic' => {
  if (categoryMatches.some((value) => 'error' in value && value.error === 'ambiguous')) {
    return 'ambiguous';
  }
  if (categoryMatches.some((value) => 'error' in value && value.error === 'too_generic')) {
    return 'too_generic';
  }
  return 'missing';
};

export const formatCategoryError = (
  categoryError: 'missing' | 'ambiguous' | 'too_generic'
): string => {
  if (categoryError === 'ambiguous') {
    return 'Normalize failed: category leaf is ambiguous. Return the full category hierarchy so the final leaf can be resolved uniquely.';
  }
  if (categoryError === 'too_generic') {
    return 'Normalize failed: category is too generic. Return the most specific terminal leaf category or the full hierarchy so the final leaf can be resolved.';
  }
  return 'Normalize failed: category must match one of the available leaf categories.';
};
