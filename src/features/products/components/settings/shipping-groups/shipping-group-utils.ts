import { ApiError } from '@/shared/lib/api-client';
import type { ProductCategory } from '@/shared/contracts/products';
import {
  formatCategoryRuleSummary,
  formatCurrencyRuleSummary,
} from '@/shared/lib/products/utils/shipping-group-rule-conflicts';
import type { ShippingGroupRuleConflict } from '@/shared/lib/products/utils/shipping-group-rule-conflicts';

export const DRAFT_SHIPPING_GROUP_ID = '__draft-shipping-group__';

export const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';

export const readConflictMetaFromApiError = (error: unknown): ShippingGroupRuleConflict[] => {
  if (!(error instanceof ApiError) || !isRecord(error.payload)) {
    return [];
  }

  const meta = isRecord(error.payload['meta']) ? error.payload['meta'] : null;
  const conflicts = meta && Array.isArray(meta['conflicts']) ? meta['conflicts'] : null;
  if (!conflicts) {
    return [];
  }

  return conflicts.flatMap((conflict): ShippingGroupRuleConflict[] => {
    if (!isRecord(conflict)) {
      return [];
    }
    const groupIds = Array.isArray(conflict['groupIds'])
      ? conflict['groupIds'].map((value) => toTrimmedString(value)).filter(Boolean)
      : [];
    const groupNames = Array.isArray(conflict['groupNames'])
      ? conflict['groupNames'].map((value) => toTrimmedString(value)).filter(Boolean)
      : [];
    const overlapCategoryIds = Array.isArray(conflict['overlapCategoryIds'])
      ? conflict['overlapCategoryIds'].map((value) => toTrimmedString(value)).filter(Boolean)
      : [];
    const overlapCurrencyCodes = Array.isArray(conflict['overlapCurrencyCodes'])
      ? conflict['overlapCurrencyCodes'].map((value) => toTrimmedString(value).toUpperCase()).filter(Boolean)
      : [];
    const appliesToAllCategories = Boolean(conflict['appliesToAllCategories']);
    const appliesToAllCurrencies = Boolean(conflict['appliesToAllCurrencies']);

    if (
      groupIds.length < 2 ||
      groupNames.length < 2 ||
      (!appliesToAllCategories && overlapCategoryIds.length === 0) ||
      (!appliesToAllCurrencies && overlapCurrencyCodes.length === 0)
    ) {
      return [];
    }

    return [
      {
        groupIds: [groupIds[0]!, groupIds[1]!],
        groupNames: [groupNames[0]!, groupNames[1]!],
        overlapCategoryIds,
        overlapCurrencyCodes,
        appliesToAllCategories,
        appliesToAllCurrencies,
      },
    ];
  });
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
    if (!categoryId) continue;
    parentMap.set(categoryId, toTrimmedString(category.parentId) || null);
  }
  return parentMap;
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
    categoryIds.map((categoryId) => toTrimmedString(categoryId)).filter(Boolean)
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
    if (!categoryId || selectedCategoryIds.has(categoryId)) {
      continue;
    }

    const visited = new Set<string>();
    let currentCategoryId = categoryParentMap.get(categoryId) ?? null;
    while (currentCategoryId && !visited.has(currentCategoryId)) {
      if (selectedCategoryIds.has(currentCategoryId)) {
        descendantIds.push(categoryId);
        break;
      }
      visited.add(currentCategoryId);
      currentCategoryId = categoryParentMap.get(currentCategoryId) ?? null;
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
