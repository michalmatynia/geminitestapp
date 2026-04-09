import type { ProductCategory } from '@/shared/contracts/products/categories';
import {
  composeStructuredProductName,
  normalizeStructuredProductName,
  parseStructuredProductName,
} from '@/shared/lib/products/title-terms';
import { buildLeafCategoryHierarchyEntries } from './leafCategoryHierarchy';

export type ValidateNormalizedProductNameResult =
  | {
      isValid: true;
      normalizedName: string;
    }
  | {
      isValid: false;
      error: string;
    };

const GENERIC_SEGMENT_VALUES = new Set(['unknown', 'n/a', 'na', 'tbd']);
const GENERIC_BASE_NAME_VALUES = new Set(['name', 'product', 'title']);

const normalizeComparable = (value: string): string => value.trim().replace(/\s+/g, ' ').toLowerCase();

const normalizeHierarchyComparable = (value: string): string =>
  value
    .split(/\s*(?:>|\/)\s*/)
    .map((segment) => normalizeComparable(segment))
    .filter((segment) => segment.length > 0)
    .join(' > ');

const isGenericSizeSegment = (value: string): boolean => {
  const normalized = normalizeComparable(value);
  return /^x(?:\s*(?:cm|mm|m|in|inch|inches))?$/.test(normalized);
};

const resolveLeafCategoryMatch = (
  categories: ProductCategory[],
  rawCategoryValue: string
):
  | {
      canonicalCategoryName: string;
    }
  | {
      error: 'missing' | 'ambiguous';
    } => {
  const entries = buildLeafCategoryHierarchyEntries(categories);
  const entriesByHierarchyPath = new Map<string, string>();
  const entriesByLeafName = new Map<string, string[]>();

  entries.forEach((entry) => {
    const normalizedHierarchyPath = normalizeHierarchyComparable(entry.hierarchyPath);
    if (normalizedHierarchyPath && !entriesByHierarchyPath.has(normalizedHierarchyPath)) {
      entriesByHierarchyPath.set(normalizedHierarchyPath, entry.leafName);
    }

    const normalizedLeafName = normalizeComparable(entry.leafName);
    if (!normalizedLeafName) return;
    const matches = entriesByLeafName.get(normalizedLeafName) ?? [];
    matches.push(entry.leafName);
    entriesByLeafName.set(normalizedLeafName, matches);
  });

  const normalizedHierarchyInput = normalizeHierarchyComparable(rawCategoryValue);
  if (normalizedHierarchyInput) {
    const hierarchyMatch = entriesByHierarchyPath.get(normalizedHierarchyInput);
    if (hierarchyMatch) {
      return {
        canonicalCategoryName: hierarchyMatch,
      };
    }
  }

  const normalizedLeafInput =
    normalizedHierarchyInput.split(' > ').filter(Boolean).pop() ?? normalizeComparable(rawCategoryValue);
  const leafMatches = entriesByLeafName.get(normalizedLeafInput) ?? [];
  if (leafMatches.length === 1) {
    return {
      canonicalCategoryName: leafMatches[0]!,
    };
  }
  if (leafMatches.length > 1) {
    return {
      error: 'ambiguous',
    };
  }

  return {
    error: 'missing',
  };
};

export const validateNormalizedProductName = (args: {
  normalizedName: string;
  categories: ProductCategory[];
}): ValidateNormalizedProductNameResult => {
  const structuredValue = normalizeStructuredProductName(args.normalizedName);
  const parsed = parseStructuredProductName(structuredValue);

  if (!parsed) {
    return {
      isValid: false,
      error:
        'Normalize failed: the title must use exactly 5 non-empty segments in the format <title> | <size> | <material> | <category> | <theme>.',
    };
  }

  if (GENERIC_BASE_NAME_VALUES.has(normalizeComparable(parsed.baseName))) {
    return {
      isValid: false,
      error: 'Normalize failed: the title segment is still generic. Provide a specific product title.',
    };
  }

  if (isGenericSizeSegment(parsed.size)) {
    return {
      isValid: false,
      error: 'Normalize failed: the size segment is still a placeholder such as "X cm".',
    };
  }

  const genericMaterial = GENERIC_SEGMENT_VALUES.has(normalizeComparable(parsed.material));
  const genericTheme = GENERIC_SEGMENT_VALUES.has(normalizeComparable(parsed.theme));
  if (genericMaterial || genericTheme) {
    return {
      isValid: false,
      error: 'Normalize failed: material and theme must be inferred instead of using placeholder values.',
    };
  }

  const categoryMatch = resolveLeafCategoryMatch(args.categories, parsed.category);
  if ('error' in categoryMatch) {
    return {
      isValid: false,
      error:
        categoryMatch.error === 'ambiguous'
          ? 'Normalize failed: category leaf is ambiguous. Return the full category hierarchy so the final leaf can be resolved uniquely.'
          : 'Normalize failed: category must match one of the available leaf categories.',
    };
  }

  return {
    isValid: true,
    normalizedName: composeStructuredProductName({
      baseName: parsed.baseName,
      size: parsed.size,
      material: parsed.material,
      category: categoryMatch.canonicalCategoryName,
      theme: parsed.theme,
    }),
  };
};
