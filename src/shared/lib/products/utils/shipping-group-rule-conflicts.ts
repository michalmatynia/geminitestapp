import type { ProductCategory, ProductShippingGroup } from '@/shared/contracts/products';

const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const buildCategoryPathLabelMap = (
  categories: readonly ProductCategory[]
): Map<string, string> => {
  const categoryById = new Map<string, ProductCategory>();
  for (const category of categories) {
    const categoryId = toTrimmedString(category.id);
    if (!categoryId) continue;
    categoryById.set(categoryId, category);
  }

  const labelById = new Map<string, string>();
  const resolvePathLabel = (categoryId: string): string => {
    const existing = labelById.get(categoryId);
    if (existing) return existing;

    const visited = new Set<string>();
    const segments: string[] = [];
    let currentCategoryId: string | null = categoryId;
    while (currentCategoryId && !visited.has(currentCategoryId)) {
      visited.add(currentCategoryId);
      const category = categoryById.get(currentCategoryId);
      if (!category) {
        segments.unshift(currentCategoryId);
        break;
      }
      segments.unshift(toTrimmedString(category.name) || currentCategoryId);
      currentCategoryId = toTrimmedString(category.parentId) || null;
    }

    const label = segments.join(' / ');
    labelById.set(categoryId, label);
    return label;
  };

  for (const categoryId of categoryById.keys()) {
    resolvePathLabel(categoryId);
  }

  return labelById;
};

const buildCategoryParentMap = (
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

const isCategoryAncestorOrSelf = ({
  ancestorCategoryId,
  categoryId,
  categoryParentMap,
}: {
  ancestorCategoryId: string;
  categoryId: string;
  categoryParentMap: Map<string, string | null>;
}): boolean => {
  let currentCategoryId: string | null = categoryId;
  const visited = new Set<string>();

  while (currentCategoryId) {
    if (currentCategoryId === ancestorCategoryId) {
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

export const normalizeShippingGroupRuleCategoryIds = ({
  categoryIds,
  categories,
}: {
  categoryIds: readonly string[];
  categories: readonly ProductCategory[];
}): string[] => {
  const knownCategoryIds = new Set(
    categories.map((category) => toTrimmedString(category.id)).filter(Boolean)
  );
  const normalizedIds = categoryIds
    .map((categoryId) => toTrimmedString(categoryId))
    .filter((categoryId) => categoryId.length > 0 && knownCategoryIds.has(categoryId));
  if (normalizedIds.length <= 1) {
    return normalizedIds;
  }

  const categoryParentMap = buildCategoryParentMap(categories);

  return normalizedIds.filter((categoryId) => {
    for (const otherCategoryId of normalizedIds) {
      if (otherCategoryId === categoryId) {
        continue;
      }
      if (
        isCategoryAncestorOrSelf({
          ancestorCategoryId: otherCategoryId,
          categoryId,
          categoryParentMap,
        })
      ) {
        return false;
      }
    }

    return true;
  });
};

export const findRedundantShippingGroupRuleCategoryIds = ({
  categoryIds,
  categories,
}: {
  categoryIds: readonly string[];
  categories: readonly ProductCategory[];
}): string[] => {
  const knownCategoryIds = new Set(
    categories.map((category) => toTrimmedString(category.id)).filter(Boolean)
  );
  const normalizedSet = new Set(
    normalizeShippingGroupRuleCategoryIds({
      categoryIds,
      categories,
    })
  );

  return categoryIds
    .map((categoryId) => toTrimmedString(categoryId))
    .filter(
      (categoryId) =>
        categoryId.length > 0 && knownCategoryIds.has(categoryId) && !normalizedSet.has(categoryId)
    );
};

export type ShippingGroupRuleConflict = {
  groupIds: [string, string];
  groupNames: [string, string];
  overlapCategoryIds: string[];
};

export const buildShippingGroupRuleConflicts = ({
  shippingGroups,
  categories,
}: {
  shippingGroups: readonly ProductShippingGroup[];
  categories: readonly ProductCategory[];
}): ShippingGroupRuleConflict[] => {
  const categoryParentMap = buildCategoryParentMap(categories);
  const conflicts: ShippingGroupRuleConflict[] = [];

  for (let leftIndex = 0; leftIndex < shippingGroups.length; leftIndex += 1) {
    const leftGroup = shippingGroups[leftIndex];
    const leftRuleIds = Array.isArray(leftGroup.autoAssignCategoryIds)
      ? leftGroup.autoAssignCategoryIds
          .map((categoryId) => toTrimmedString(categoryId))
          .filter(Boolean)
      : [];
    if (leftRuleIds.length === 0) continue;

    for (let rightIndex = leftIndex + 1; rightIndex < shippingGroups.length; rightIndex += 1) {
      const rightGroup = shippingGroups[rightIndex];
      const rightRuleIds = Array.isArray(rightGroup.autoAssignCategoryIds)
        ? rightGroup.autoAssignCategoryIds
            .map((categoryId) => toTrimmedString(categoryId))
            .filter(Boolean)
        : [];
      if (rightRuleIds.length === 0) continue;

      const overlapCategoryIds = new Set<string>();
      for (const leftRuleId of leftRuleIds) {
        for (const rightRuleId of rightRuleIds) {
          if (leftRuleId === rightRuleId) {
            overlapCategoryIds.add(leftRuleId);
            continue;
          }
          if (
            isCategoryAncestorOrSelf({
              ancestorCategoryId: leftRuleId,
              categoryId: rightRuleId,
              categoryParentMap,
            })
          ) {
            overlapCategoryIds.add(rightRuleId);
            continue;
          }
          if (
            isCategoryAncestorOrSelf({
              ancestorCategoryId: rightRuleId,
              categoryId: leftRuleId,
              categoryParentMap,
            })
          ) {
            overlapCategoryIds.add(leftRuleId);
          }
        }
      }

      if (overlapCategoryIds.size === 0) continue;

      conflicts.push({
        groupIds: [leftGroup.id, rightGroup.id],
        groupNames: [leftGroup.name, rightGroup.name],
        overlapCategoryIds: Array.from(overlapCategoryIds),
      });
    }
  }

  return conflicts;
};

export const formatCategoryRuleSummary = ({
  categoryIds,
  categoryLabelById,
}: {
  categoryIds: readonly string[];
  categoryLabelById: Map<string, string>;
}): string | null => {
  const labels = categoryIds
    .map(
      (categoryId) =>
        categoryLabelById.get(toTrimmedString(categoryId)) ?? toTrimmedString(categoryId)
    )
    .filter((label) => label.length > 0);

  if (labels.length === 0) return null;
  if (labels.length <= 2) return labels.join(', ');
  return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`;
};
