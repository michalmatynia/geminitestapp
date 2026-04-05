import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductShippingGroup } from '@/shared/contracts/products/shipping-groups';

const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const normalizeCurrencyCode = (value: unknown): string =>
  toTrimmedString(value).toUpperCase();

type EffectiveRuleScope<TValue extends string> =
  | { kind: 'none'; values: [] }
  | { kind: 'all'; values: [] }
  | { kind: 'some'; values: TValue[] };

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

export const normalizeShippingGroupRuleCurrencyCodes = ({
  currencyCodes,
  availableCurrencyCodes = [],
}: {
  currencyCodes: readonly string[];
  availableCurrencyCodes?: readonly string[];
}): string[] => {
  const knownCurrencyCodes =
    availableCurrencyCodes.length > 0
      ? new Set(availableCurrencyCodes.map((currencyCode) => normalizeCurrencyCode(currencyCode)).filter(Boolean))
      : null;

  const normalizedCodes: string[] = [];
  const seenCodes = new Set<string>();

  for (const currencyCode of currencyCodes) {
    const normalizedCode = normalizeCurrencyCode(currencyCode);
    if (!normalizedCode) continue;
    if (knownCurrencyCodes && !knownCurrencyCodes.has(normalizedCode)) continue;
    if (seenCodes.has(normalizedCode)) continue;
    seenCodes.add(normalizedCode);
    normalizedCodes.push(normalizedCode);
  }

  return normalizedCodes;
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

const resolveCategoryScope = ({
  categoryIds,
  categories,
}: {
  categoryIds: readonly string[] | undefined;
  categories: readonly ProductCategory[];
}): EffectiveRuleScope<string> => {
  const rawCategoryIds = (Array.isArray(categoryIds) ? categoryIds : [])
    .map((categoryId) => toTrimmedString(categoryId))
    .filter(Boolean);

  if (rawCategoryIds.length === 0) {
    return { kind: 'all', values: [] };
  }

  const normalizedCategoryIds = normalizeShippingGroupRuleCategoryIds({
    categoryIds: rawCategoryIds,
    categories,
  });

  if (normalizedCategoryIds.length === 0) {
    return { kind: 'none', values: [] };
  }

  return { kind: 'some', values: normalizedCategoryIds };
};

const resolveCurrencyScope = ({
  currencyCodes,
  availableCurrencyCodes,
}: {
  currencyCodes: readonly string[] | undefined;
  availableCurrencyCodes: readonly string[];
}): EffectiveRuleScope<string> => {
  const rawCurrencyCodes = (Array.isArray(currencyCodes) ? currencyCodes : [])
    .map((currencyCode) => normalizeCurrencyCode(currencyCode))
    .filter(Boolean);

  if (rawCurrencyCodes.length === 0) {
    return { kind: 'all', values: [] };
  }

  const normalizedCurrencyCodes = normalizeShippingGroupRuleCurrencyCodes({
    currencyCodes: rawCurrencyCodes,
    availableCurrencyCodes,
  });

  if (normalizedCurrencyCodes.length === 0) {
    return { kind: 'none', values: [] };
  }

  return { kind: 'some', values: normalizedCurrencyCodes };
};

const resolveCategoryOverlap = ({
  leftScope,
  rightScope,
  categoryParentMap,
}: {
  leftScope: EffectiveRuleScope<string>;
  rightScope: EffectiveRuleScope<string>;
  categoryParentMap: Map<string, string | null>;
}): { appliesToAllCategories: boolean; overlapCategoryIds: string[] } | null => {
  if (leftScope.kind === 'none' || rightScope.kind === 'none') {
    return null;
  }

  if (leftScope.kind === 'all' && rightScope.kind === 'all') {
    return {
      appliesToAllCategories: true,
      overlapCategoryIds: [],
    };
  }

  if (leftScope.kind === 'all') {
    return {
      appliesToAllCategories: false,
      overlapCategoryIds: [...rightScope.values],
    };
  }

  if (rightScope.kind === 'all') {
    return {
      appliesToAllCategories: false,
      overlapCategoryIds: [...leftScope.values],
    };
  }

  const overlapCategoryIds = new Set<string>();
  for (const leftRuleId of leftScope.values) {
    for (const rightRuleId of rightScope.values) {
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

  if (overlapCategoryIds.size === 0) {
    return null;
  }

  return {
    appliesToAllCategories: false,
    overlapCategoryIds: Array.from(overlapCategoryIds),
  };
};

const resolveCurrencyOverlap = ({
  leftScope,
  rightScope,
}: {
  leftScope: EffectiveRuleScope<string>;
  rightScope: EffectiveRuleScope<string>;
}): { appliesToAllCurrencies: boolean; overlapCurrencyCodes: string[] } | null => {
  if (leftScope.kind === 'none' || rightScope.kind === 'none') {
    return null;
  }

  if (leftScope.kind === 'all' && rightScope.kind === 'all') {
    return {
      appliesToAllCurrencies: true,
      overlapCurrencyCodes: [],
    };
  }

  if (leftScope.kind === 'all') {
    return {
      appliesToAllCurrencies: false,
      overlapCurrencyCodes: [...rightScope.values],
    };
  }

  if (rightScope.kind === 'all') {
    return {
      appliesToAllCurrencies: false,
      overlapCurrencyCodes: [...leftScope.values],
    };
  }

  const overlapCurrencyCodes = leftScope.values.filter((currencyCode) =>
    rightScope.values.includes(currencyCode)
  );

  if (overlapCurrencyCodes.length === 0) {
    return null;
  }

  return {
    appliesToAllCurrencies: false,
    overlapCurrencyCodes,
  };
};

export type ShippingGroupRuleConflict = {
  groupIds: [string, string];
  groupNames: [string, string];
  overlapCategoryIds: string[];
  overlapCurrencyCodes: string[];
  appliesToAllCategories: boolean;
  appliesToAllCurrencies: boolean;
};

export const buildShippingGroupRuleConflicts = ({
  shippingGroups,
  categories,
  availableCurrencyCodes = [],
}: {
  shippingGroups: readonly ProductShippingGroup[];
  categories: readonly ProductCategory[];
  availableCurrencyCodes?: readonly string[];
}): ShippingGroupRuleConflict[] => {
  const categoryParentMap = buildCategoryParentMap(categories);
  const conflicts: ShippingGroupRuleConflict[] = [];

  for (let leftIndex = 0; leftIndex < shippingGroups.length; leftIndex += 1) {
    const leftGroup = shippingGroups[leftIndex];
    if (!leftGroup) continue;

    const leftCategoryScope = resolveCategoryScope({
      categoryIds: leftGroup.autoAssignCategoryIds,
      categories,
    });
    const leftCurrencyScope = resolveCurrencyScope({
      currencyCodes: leftGroup.autoAssignCurrencyCodes,
      availableCurrencyCodes,
    });

    for (let rightIndex = leftIndex + 1; rightIndex < shippingGroups.length; rightIndex += 1) {
      const rightGroup = shippingGroups[rightIndex];
      if (!rightGroup) continue;

      const rightCategoryScope = resolveCategoryScope({
        categoryIds: rightGroup.autoAssignCategoryIds,
        categories,
      });
      const rightCurrencyScope = resolveCurrencyScope({
        currencyCodes: rightGroup.autoAssignCurrencyCodes,
        availableCurrencyCodes,
      });

      const categoryOverlap = resolveCategoryOverlap({
        leftScope: leftCategoryScope,
        rightScope: rightCategoryScope,
        categoryParentMap,
      });
      const currencyOverlap = resolveCurrencyOverlap({
        leftScope: leftCurrencyScope,
        rightScope: rightCurrencyScope,
      });

      if (!categoryOverlap || !currencyOverlap) {
        continue;
      }

      conflicts.push({
        groupIds: [leftGroup.id, rightGroup.id],
        groupNames: [leftGroup.name, rightGroup.name],
        overlapCategoryIds: categoryOverlap.overlapCategoryIds,
        overlapCurrencyCodes: currencyOverlap.overlapCurrencyCodes,
        appliesToAllCategories: categoryOverlap.appliesToAllCategories,
        appliesToAllCurrencies: currencyOverlap.appliesToAllCurrencies,
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

export const formatCurrencyRuleSummary = ({
  currencyCodes,
}: {
  currencyCodes: readonly string[];
}): string | null => {
  const labels = currencyCodes
    .map((currencyCode) => normalizeCurrencyCode(currencyCode))
    .filter(Boolean);

  if (labels.length === 0) return null;
  if (labels.length <= 3) return labels.join(', ');
  return `${labels.slice(0, 3).join(', ')} +${labels.length - 3}`;
};
