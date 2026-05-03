import { ApiError } from '@/shared/lib/api-client';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import {
  formatCategoryRuleSummary,
  formatCurrencyRuleSummary,
} from '@/shared/lib/products/utils/shipping-group-rule-conflicts';
import type { ShippingGroupRuleConflict } from '@/shared/lib/products/utils/shipping-group-rule-conflicts';

export const DRAFT_SHIPPING_GROUP_ID = '__draft-shipping-group__';

export const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const readStringArray = (value: unknown, transform: (text: string) => string = (text) => text): string[] =>
  Array.isArray(value)
    ? value
        .map((entry) => transform(toTrimmedString(entry)))
        .filter((entry) => entry.length > 0)
    : [];

const hasConflictScope = ({
  appliesToAllCategories,
  appliesToAllCurrencies,
  overlapCategoryIds,
  overlapCurrencyCodes,
}: {
  appliesToAllCategories: boolean;
  appliesToAllCurrencies: boolean;
  overlapCategoryIds: readonly string[];
  overlapCurrencyCodes: readonly string[];
}): boolean =>
  (appliesToAllCategories || overlapCategoryIds.length > 0) &&
  (appliesToAllCurrencies || overlapCurrencyCodes.length > 0);

const readFirstTwo = (values: readonly string[]): readonly [string, string] | null => {
  const first = values[0];
  const second = values[1];
  if (first === undefined || second === undefined) {
    return null;
  }
  return [first, second];
};

const readShippingGroupConflict = (
  conflict: unknown
): ShippingGroupRuleConflict | null => {
  if (!isRecord(conflict)) {
    return null;
  }

  const groupIds = readStringArray(conflict['groupIds']);
  const groupNames = readStringArray(conflict['groupNames']);
  const overlapCategoryIds = readStringArray(conflict['overlapCategoryIds']);
  const overlapCurrencyCodes = readStringArray(
    conflict['overlapCurrencyCodes'],
    (value) => value.toUpperCase()
  );
  const appliesToAllCategories = conflict['appliesToAllCategories'] === true;
  const appliesToAllCurrencies = conflict['appliesToAllCurrencies'] === true;
  const firstTwoGroupIds = readFirstTwo(groupIds);
  const firstTwoGroupNames = readFirstTwo(groupNames);

  if (
    firstTwoGroupIds === null ||
    firstTwoGroupNames === null ||
    !hasConflictScope({
      appliesToAllCategories,
      appliesToAllCurrencies,
      overlapCategoryIds,
      overlapCurrencyCodes,
    })
  ) {
    return null;
  }

  return {
    groupIds: [...firstTwoGroupIds],
    groupNames: [...firstTwoGroupNames],
    overlapCategoryIds,
    overlapCurrencyCodes,
    appliesToAllCategories,
    appliesToAllCurrencies,
  };
};

export const readConflictMetaFromApiError = (error: unknown): ShippingGroupRuleConflict[] => {
  if (!(error instanceof ApiError) || !isRecord(error.payload)) {
    return [];
  }

  const meta = isRecord(error.payload['meta']) ? error.payload['meta'] : null;
  const conflicts = meta !== null && Array.isArray(meta['conflicts']) ? meta['conflicts'] : null;
  if (conflicts === null) {
    return [];
  }

  return conflicts
    .map((conflict) => readShippingGroupConflict(conflict))
    .filter((conflict): conflict is ShippingGroupRuleConflict => conflict !== null);
};

export const formatShippingGroupConflictMessage = ({
  conflicts,
  categoryLabelById,
  draftShippingGroupId,
}: {
  conflicts: readonly ShippingGroupRuleConflict[];
  categoryLabelById: Map<string, string>;
  draftShippingGroupId: string;
}): string => {
  const firstConflict = conflicts[0];
  if (!firstConflict) {
    return 'This shipping group auto-assign rule overlaps with another shipping group in this catalog.';
  }

  const overlapCategoryLabel = firstConflict.appliesToAllCategories
    ? 'all categories'
    : (formatCategoryRuleSummary({
        categoryIds: firstConflict.overlapCategoryIds,
        categoryLabelById,
      }) ?? `${firstConflict.overlapCategoryIds.length} categories`);
  const overlapCurrencyLabel = firstConflict.appliesToAllCurrencies
    ? 'all currencies'
    : (formatCurrencyRuleSummary({
        currencyCodes: firstConflict.overlapCurrencyCodes,
      }) ?? `${firstConflict.overlapCurrencyCodes.length} currencies`);
  const otherGroupName =
    firstConflict.groupIds[0] === draftShippingGroupId
      ? firstConflict.groupNames[1]
      : firstConflict.groupNames[0];

  return `This auto-assign rule overlaps with ${otherGroupName} on ${overlapCategoryLabel} in ${overlapCurrencyLabel}.`;
};

export const buildCategoryParentMap = (
  categories: readonly ProductCategory[]
): Map<string, string | null> => {
  const parentMap = new Map<string, string | null>();
  for (const category of categories) {
    const categoryId = toTrimmedString(category.id);
    if (categoryId.length === 0) continue;
    const parentId = toTrimmedString(category.parentId);
    parentMap.set(categoryId, parentId.length > 0 ? parentId : null);
  }
  return parentMap;
};

const isDescendantOfSelectedCategory = ({
  categoryId,
  categoryParentMap,
  selectedCategoryIds,
}: {
  categoryId: string;
  categoryParentMap: ReadonlyMap<string, string | null>;
  selectedCategoryIds: ReadonlySet<string>;
}): boolean => {
  const visited = new Set<string>();
  let currentCategoryId = categoryParentMap.get(categoryId) ?? null;
  while (currentCategoryId !== null && !visited.has(currentCategoryId)) {
    if (selectedCategoryIds.has(currentCategoryId)) {
      return true;
    }
    visited.add(currentCategoryId);
    currentCategoryId = categoryParentMap.get(currentCategoryId) ?? null;
  }
  return false;
};

export const summarizeRuleDescendantCoverage = ({
  categoryIds,
  categories,
  categoryLabelById,
}: {
  categoryIds: readonly string[];
  categories: readonly ProductCategory[];
  categoryLabelById: Map<string, string>;
}): {
  descendantIds: string[];
  descendantSummary: string | null;
} => {
  const selectedCategoryIds = new Set(
    categoryIds
      .map((categoryId) => toTrimmedString(categoryId))
      .filter((categoryId) => categoryId.length > 0)
  );
  if (selectedCategoryIds.size === 0 || categories.length === 0) {
    return {
      descendantIds: [],
      descendantSummary: null,
    };
  }

  const categoryParentMap = buildCategoryParentMap(categories);
  const descendantIds: string[] = [];

  for (const category of categories) {
    const categoryId = toTrimmedString(category.id);
    if (categoryId.length === 0 || selectedCategoryIds.has(categoryId)) {
      continue;
    }

    if (
      isDescendantOfSelectedCategory({
        categoryId,
        categoryParentMap,
        selectedCategoryIds,
      })
    ) {
      descendantIds.push(categoryId);
    }
  }

  return {
    descendantIds,
    descendantSummary: formatCategoryRuleSummary({
      categoryIds: descendantIds,
      categoryLabelById,
    }),
  };
};
