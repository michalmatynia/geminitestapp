import type { ProductCategory } from '@/shared/contracts/products/categories';
import {
  composeStructuredProductName,
  normalizeStructuredProductName,
  parseStructuredProductName,
} from '@/shared/lib/products/title-terms';
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

const resolveMatchingLeafNamesForNonTerminalSegment = (
  entries: ReturnType<typeof buildLeafCategoryHierarchyEntries>,
  rawCategoryValue: string
): string[] => {
  const normalizedCategoryValue = normalizeComparable(rawCategoryValue);
  if (!normalizedCategoryValue) return [];

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

const resolveLeafCategoryMatch = (
  categories: ProductCategory[],
  rawCategoryValue: string
):
  | {
      canonicalCategoryName: string;
    }
  | {
      error: 'missing' | 'ambiguous' | 'too_generic';
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

  if (resolveMatchingLeafNamesForNonTerminalSegment(entries, rawCategoryValue).length > 0) {
    return {
      error: 'too_generic',
    };
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

const resolveLeafCategoryMatchFromContext = (
  categoryContext: NormalizeProductNameCategoryContext,
  rawCategoryValue: string
):
  | {
      canonicalCategoryName: string;
    }
  | {
      error: 'missing' | 'ambiguous' | 'too_generic';
    } => {
  const normalizedLeafEntries = categoryContext.leafCategories
    .map((entry) => {
      const label = normalizeComparable(entry.label);
      const fullPath = normalizeHierarchyComparable(entry.fullPath ?? entry.label);
      if (!label) return null;
      return {
        label: entry.label.trim(),
        normalizedLabel: label,
        normalizedFullPath: fullPath,
      };
    })
    .filter(
      (
        entry
      ): entry is {
        label: string;
        normalizedLabel: string;
        normalizedFullPath: string;
      } => entry !== null
    );

  if (normalizedLeafEntries.length === 0) {
    return {
      error: 'missing',
    };
  }

  const entriesByHierarchyPath = new Map<string, string>();
  const entriesByLeafName = new Map<string, string[]>();

  normalizedLeafEntries.forEach((entry) => {
    if (entry.normalizedFullPath && !entriesByHierarchyPath.has(entry.normalizedFullPath)) {
      entriesByHierarchyPath.set(entry.normalizedFullPath, entry.label);
    }

    const matches = entriesByLeafName.get(entry.normalizedLabel) ?? [];
    matches.push(entry.label);
    entriesByLeafName.set(entry.normalizedLabel, matches);
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

  const normalizedCategoryValue = normalizeComparable(rawCategoryValue);
  if (
    normalizedLeafEntries.some((entry) =>
      entry.normalizedFullPath
        .split(' > ')
        .slice(0, -1)
        .includes(normalizedCategoryValue)
    )
  ) {
    return {
      error: 'too_generic',
    };
  }

  const normalizedLeafInput =
    normalizedHierarchyInput.split(' > ').filter(Boolean).pop() ?? normalizedCategoryValue;
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
  categoryHint?: string | null;
  categoryContext?: NormalizeProductNameCategoryContext | null;
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

  if (
    args.categoryContext &&
    typeof args.categoryContext.totalLeafCategories === 'number' &&
    args.categoryContext.totalLeafCategories <= 0
  ) {
    return {
      isValid: false,
      error: 'Normalize failed: category context unavailable.',
    };
  }

  const categoryCandidates = [
    typeof args.categoryHint === 'string' ? args.categoryHint.trim() : '',
    parsed.category,
  ].filter((value, index, values): value is string => value.length > 0 && values.indexOf(value) === index);

  const shouldUseCategoryContext =
    Boolean(args.categoryContext) && (args.categoryContext?.leafCategories.length ?? 0) > 0;
  const categoryMatches = categoryCandidates.map((value) =>
    shouldUseCategoryContext
      ? resolveLeafCategoryMatchFromContext(args.categoryContext!, value)
      : resolveLeafCategoryMatch(args.categories, value)
  );
  const categoryMatch = categoryMatches.find(
    (value): value is { canonicalCategoryName: string } => 'canonicalCategoryName' in value
  );

  if (!categoryMatch) {
    const categoryError = categoryMatches.some(
      (value): value is { error: 'ambiguous' } => 'error' in value && value.error === 'ambiguous'
    )
      ? 'ambiguous'
      : categoryMatches.some(
            (value): value is { error: 'too_generic' } =>
              'error' in value && value.error === 'too_generic'
          )
        ? 'too_generic'
        : 'missing';

    return {
      isValid: false,
      error:
        categoryError === 'ambiguous'
          ? 'Normalize failed: category leaf is ambiguous. Return the full category hierarchy so the final leaf can be resolved uniquely.'
          : categoryError === 'too_generic'
            ? 'Normalize failed: category is too generic. Return the most specific terminal leaf category or the full hierarchy so the final leaf can be resolved.'
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
