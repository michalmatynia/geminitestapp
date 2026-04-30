// validateNormalizedProductName: utility to validate and normalize structured
// product names. Uses category leaf hierarchy helpers to disambiguate category
// segments and protects against generic or ambiguous category matches.
import type { ProductCategory } from '@/shared/contracts/products/categories';
import {
  composeStructuredProductName,
  normalizeStructuredProductName,
  parseStructuredProductName,
} from '@/shared/lib/products/title-terms';

import {
  formatCategoryError,
  hasUnavailableCategoryContext,
  normalizeComparable,
  resolveCategoryCandidates,
  resolveCategoryError,
  resolveCategoryMatches,
  type NormalizeProductNameCategoryContext,
} from './validateNormalizedProductName.category';

export type {
  NormalizeProductNameCategoryContext,
  NormalizeProductNameCategoryContextLeaf,
} from './validateNormalizedProductName.category';

export type ValidateNormalizedProductNameResult =
  | {
      isValid: true;
      normalizedName: string;
    }
  | {
      isValid: false;
      error: string;
    };

type ParsedStructuredProductName = NonNullable<ReturnType<typeof parseStructuredProductName>>;

type CategoryValidationResult =
  | {
      isValid: true;
      categoryName: string;
    }
  | {
      isValid: false;
      error: string;
    };

const GENERIC_SEGMENT_VALUES = new Set(['unknown', 'n/a', 'na', 'tbd']);
const GENERIC_BASE_NAME_VALUES = new Set(['name', 'product', 'title']);

const isGenericSizeSegment = (value: string): boolean => {
  const normalized = normalizeComparable(value);
  return /^x(?:\s*(?:cm|mm|m|in|inch|inches))?$/.test(normalized);
};

const validateParsedSegments = (
  parsed: ParsedStructuredProductName
): ValidateNormalizedProductNameResult | null => {
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
  return null;
};

const resolveValidatedCategoryName = (args: {
  categories: ProductCategory[];
  categoryContext?: NormalizeProductNameCategoryContext | null;
  categoryHint?: string | null;
  parsedCategory: string;
}): CategoryValidationResult => {
  const categoryCandidates = resolveCategoryCandidates(args.parsedCategory, args.categoryHint);
  const categoryMatches = resolveCategoryMatches({
    categories: args.categories,
    categoryCandidates,
    categoryContext: args.categoryContext,
  });
  const categoryMatch = categoryMatches.find(
    (value): value is { canonicalCategoryName: string } => 'canonicalCategoryName' in value
  );

  return categoryMatch !== undefined
    ? { isValid: true, categoryName: categoryMatch.canonicalCategoryName }
    : { isValid: false, error: formatCategoryError(resolveCategoryError(categoryMatches)) };
};

export const validateNormalizedProductName = (args: {
  normalizedName: string;
  categories: ProductCategory[];
  categoryHint?: string | null;
  categoryContext?: NormalizeProductNameCategoryContext | null;
}): ValidateNormalizedProductNameResult => {
  const structuredValue = normalizeStructuredProductName(args.normalizedName);
  const parsed = parseStructuredProductName(structuredValue);

  if (parsed === null) {
    return {
      isValid: false,
      error:
        'Normalize failed: the title must use exactly 5 non-empty segments in the format <title> | <size> | <material> | <category> | <theme>.',
    };
  }

  const segmentValidation = validateParsedSegments(parsed);
  if (segmentValidation !== null) return segmentValidation;

  if (hasUnavailableCategoryContext(args.categoryContext)) {
    return {
      isValid: false,
      error: 'Normalize failed: category context unavailable.',
    };
  }

  const categoryValidation = resolveValidatedCategoryName({
    categories: args.categories,
    categoryContext: args.categoryContext,
    categoryHint: args.categoryHint,
    parsedCategory: parsed.category,
  });
  if (!categoryValidation.isValid) {
    return {
      isValid: false,
      error: categoryValidation.error,
    };
  }

  return {
    isValid: true,
    normalizedName: composeStructuredProductName({
      baseName: parsed.baseName,
      size: parsed.size,
      material: parsed.material,
      category: categoryValidation.categoryName,
      theme: parsed.theme,
    }),
  };
};
