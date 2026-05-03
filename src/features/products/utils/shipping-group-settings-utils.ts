import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ShippingGroupRuleConflict } from '@/shared/lib/products/utils/shipping-group-rule-conflicts';
import {
  formatCategoryRuleSummary,
} from '@/shared/lib/products/utils/shipping-group-rule-conflicts';
import { ApiError } from '@/shared/lib/api-client';

export const DRAFT_SHIPPING_GROUP_ID = '__draft-shipping-group__';

const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';

const toNonEmptyTrimmedStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .map((entry) => toTrimmedString(entry))
        .filter((entry): entry is string => entry.length > 0)
    : [];

const hasMinimumConflictArrayLengths = ({
  groupIds,
  groupNames,
  overlapCategoryIds,
}: {
  groupIds: readonly string[];
  groupNames: readonly string[];
  overlapCategoryIds: readonly string[];
}): boolean =>
  groupIds.length >= 2 && groupNames.length >= 2 && overlapCategoryIds.length > 0;

const hasDefinedConflictGroupPairs = ({
  firstGroupId,
  secondGroupId,
  firstGroupName,
  secondGroupName,
}: {
  firstGroupId: string | undefined;
  secondGroupId: string | undefined;
  firstGroupName: string | undefined;
  secondGroupName: string | undefined;
}): boolean =>
  firstGroupId !== undefined &&
  secondGroupId !== undefined &&
  firstGroupName !== undefined &&
  secondGroupName !== undefined;

const toShippingGroupRuleConflict = (
  conflict: unknown
): ShippingGroupRuleConflict | null => {
  if (!isRecord(conflict)) {
    return null;
  }

  const groupIds = toNonEmptyTrimmedStringArray(conflict['groupIds']);
  const groupNames = toNonEmptyTrimmedStringArray(conflict['groupNames']);
  const overlapCategoryIds = toNonEmptyTrimmedStringArray(conflict['overlapCategoryIds']);

  if (
    !hasMinimumConflictArrayLengths({
      groupIds,
      groupNames,
      overlapCategoryIds,
    })
  ) {
    return null;
  }

  const [firstGroupId, secondGroupId] = groupIds;
  const [firstGroupName, secondGroupName] = groupNames;
  if (
    !hasDefinedConflictGroupPairs({
      firstGroupId,
      secondGroupId,
      firstGroupName,
      secondGroupName,
    })
  ) {
    return null;
  }

  return {
    groupIds: [firstGroupId, secondGroupId],
    groupNames: [firstGroupName, secondGroupName],
    overlapCategoryIds,
    overlapCurrencyCodes: [],
    appliesToAllCategories: false,
    appliesToAllCurrencies: true,
  };
};

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
    const parsedConflict = toShippingGroupRuleConflict(conflict);
    return parsedConflict ? [parsedConflict] : [];
  });
};

export const isShippingGroupNotFoundError = (error: unknown): boolean => {
  if (error instanceof ApiError) {
    return error.status === 404;
  }

  return error instanceof Error && /shipping group not found/i.test(error.message);
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

  const overlapLabel =
    formatCategoryRuleSummary({
      categoryIds: firstConflict.overlapCategoryIds,
      categoryLabelById,
    }) ?? `${firstConflict.overlapCategoryIds.length} categories`;
  const otherGroupName =
    firstConflict.groupIds[0] === draftShippingGroupId
      ? firstConflict.groupNames[1]
      : firstConflict.groupNames[0];

  return `This auto-assign rule overlaps with ${otherGroupName} on ${overlapLabel}.`;
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
  selectedCategoryIds,
  categoryParentMap,
}: {
  categoryId: string;
  selectedCategoryIds: Set<string>;
  categoryParentMap: Map<string, string | null>;
}): boolean => {
  const visited = new Set<string>();
  let currentCategoryId = categoryParentMap.get(categoryId) ?? null;

  while (typeof currentCategoryId === 'string' && currentCategoryId.length > 0) {
    if (selectedCategoryIds.has(currentCategoryId)) {
      return true;
    }
    if (visited.has(currentCategoryId)) {
      return false;
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
  const selectedCategoryIds = new Set(toNonEmptyTrimmedStringArray(categoryIds));
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
        selectedCategoryIds,
        categoryParentMap,
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
