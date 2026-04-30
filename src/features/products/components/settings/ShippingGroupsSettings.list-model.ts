import { useMemo } from 'react';

import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductShippingGroup } from '@/shared/contracts/products/shipping-groups';
import {
  buildCategoryPathLabelMap,
  buildShippingGroupRuleConflicts,
  findRedundantShippingGroupRuleCategoryIds,
  formatCategoryRuleSummary,
  normalizeShippingGroupRuleCategoryIds,
} from '@/shared/lib/products/utils/shipping-group-rule-conflicts';

import { summarizeRuleDescendantCoverage } from '../../utils/shipping-group-settings-utils';
import type { ShippingGroupListItem, ShippingGroupRuleCoverage } from './ShippingGroupsSettings.helpers';
import { getMissingRuleSummary, toTrimmedString } from './ShippingGroupsSettings.helpers';

const getShippingGroupCategoryIds = (shippingGroup: ProductShippingGroup): string[] =>
  Array.isArray(shippingGroup.autoAssignCategoryIds) ? shippingGroup.autoAssignCategoryIds : [];

const buildRuleCoverageById = ({
  shippingGroups,
  categories,
  categoryLabelById,
}: {
  shippingGroups: readonly ProductShippingGroup[];
  categories: readonly ProductCategory[];
  categoryLabelById: Map<string, string>;
}): Map<string, ShippingGroupRuleCoverage> => {
  const coverageById = new Map<string, ShippingGroupRuleCoverage>();
  for (const shippingGroup of shippingGroups) {
    const normalizedRuleIds = normalizeShippingGroupRuleCategoryIds({
      categoryIds: getShippingGroupCategoryIds(shippingGroup),
      categories,
    });
    coverageById.set(
      shippingGroup.id,
      summarizeRuleDescendantCoverage({ categoryIds: normalizedRuleIds, categories, categoryLabelById })
    );
  }
  return coverageById;
};

const buildNormalizedRuleSummaryById = ({
  shippingGroups,
  categories,
  categoryLabelById,
}: {
  shippingGroups: readonly ProductShippingGroup[];
  categories: readonly ProductCategory[];
  categoryLabelById: Map<string, string>;
}): Map<string, string | null> => {
  const summaryById = new Map<string, string | null>();
  for (const shippingGroup of shippingGroups) {
    const normalizedRuleIds = normalizeShippingGroupRuleCategoryIds({
      categoryIds: getShippingGroupCategoryIds(shippingGroup),
      categories,
    });
    summaryById.set(
      shippingGroup.id,
      formatCategoryRuleSummary({ categoryIds: normalizedRuleIds, categoryLabelById })
    );
  }
  return summaryById;
};

const buildRedundantRuleSummaryById = ({
  shippingGroups,
  categories,
  categoryLabelById,
}: {
  shippingGroups: readonly ProductShippingGroup[];
  categories: readonly ProductCategory[];
  categoryLabelById: Map<string, string>;
}): Map<string, string | null> => {
  const summaryById = new Map<string, string | null>();
  for (const shippingGroup of shippingGroups) {
    const redundantRuleIds = findRedundantShippingGroupRuleCategoryIds({
      categoryIds: getShippingGroupCategoryIds(shippingGroup),
      categories,
    });
    summaryById.set(
      shippingGroup.id,
      formatCategoryRuleSummary({ categoryIds: redundantRuleIds, categoryLabelById })
    );
  }
  return summaryById;
};

const buildMissingRuleSummaryById = ({
  shippingGroups,
  categoryLabelById,
}: {
  shippingGroups: readonly ProductShippingGroup[];
  categoryLabelById: Map<string, string>;
}): Map<string, string | null> => {
  const summaryById = new Map<string, string | null>();
  for (const shippingGroup of shippingGroups) {
    summaryById.set(
      shippingGroup.id,
      getMissingRuleSummary(getShippingGroupCategoryIds(shippingGroup), categoryLabelById)
    );
  }
  return summaryById;
};

const filterShippingGroupsWithSummary = (
  shippingGroups: readonly ProductShippingGroup[],
  summaryById: Map<string, string | null>
): ProductShippingGroup[] =>
  shippingGroups.filter((shippingGroup) => {
    const summary = summaryById.get(shippingGroup.id) ?? null;
    return summary !== null && summary.length > 0;
  });

const getRuleCountSubtitle = (
  shippingGroup: ProductShippingGroup,
  normalizedSummaryById: Map<string, string | null>
): string | null => {
  const ruleIds = getShippingGroupCategoryIds(shippingGroup);
  if (ruleIds.length === 0) return null;
  const summary = normalizedSummaryById.get(shippingGroup.id) ?? `${ruleIds.length} categories`;
  return `Categories (${ruleIds.length}): ${summary}`;
};

const getAutoRuleSubtitle = ({
  shippingGroup,
  normalizedSummaryById,
  coverageById,
}: {
  shippingGroup: ProductShippingGroup;
  normalizedSummaryById: Map<string, string | null>;
  coverageById: Map<string, ShippingGroupRuleCoverage>;
}): string | null => {
  const ruleIds = getShippingGroupCategoryIds(shippingGroup);
  if (ruleIds.length === 0) return null;
  const summary = normalizedSummaryById.get(shippingGroup.id) ?? `${ruleIds.length} categories`;
  const descendantCount = coverageById.get(shippingGroup.id)?.descendantIds.length ?? 0;
  return `Auto: ${summary}${descendantCount > 0 ? ' (+ descendants)' : ''}`;
};

const getTraderaSubtitle = (shippingGroup: ProductShippingGroup): string | null => {
  const condition = toTrimmedString(shippingGroup.traderaShippingCondition);
  const hasPrice = typeof shippingGroup.traderaShippingPriceEur === 'number';
  if (condition.length === 0 && !hasPrice) return null;
  const conditionLabel = condition.length > 0 ? condition : 'Shipping modal';
  const priceLabel = hasPrice ? ` · EUR ${shippingGroup.traderaShippingPriceEur.toFixed(2)}` : '';
  return `Tradera: ${conditionLabel}${priceLabel}`;
};

const getSummarySubtitle = (
  prefix: string,
  shippingGroupId: string,
  summaryById: Map<string, string | null>
): string | null => {
  const summary = summaryById.get(shippingGroupId) ?? null;
  return summary !== null && summary.length > 0 ? `${prefix}: ${summary}` : null;
};

const buildShippingGroupSubtitle = ({
  shippingGroup,
  normalizedSummaryById,
  redundantSummaryById,
  missingSummaryById,
  coverageById,
}: {
  shippingGroup: ProductShippingGroup;
  normalizedSummaryById: Map<string, string | null>;
  redundantSummaryById: Map<string, string | null>;
  missingSummaryById: Map<string, string | null>;
  coverageById: Map<string, ShippingGroupRuleCoverage>;
}): string | undefined => {
  const entries = [
    getRuleCountSubtitle(shippingGroup, normalizedSummaryById),
    getAutoRuleSubtitle({ shippingGroup, normalizedSummaryById, coverageById }),
    getTraderaSubtitle(shippingGroup),
    getSummarySubtitle('Redundant', shippingGroup.id, redundantSummaryById),
    getSummarySubtitle('Missing', shippingGroup.id, missingSummaryById),
  ].filter((value): value is string => value !== null && value.length > 0);
  return entries.length > 0 ? entries.join(' · ') : undefined;
};

const buildShippingGroupListItems = ({
  shippingGroups,
  normalizedSummaryById,
  redundantSummaryById,
  missingSummaryById,
  coverageById,
}: {
  shippingGroups: readonly ProductShippingGroup[];
  normalizedSummaryById: Map<string, string | null>;
  redundantSummaryById: Map<string, string | null>;
  missingSummaryById: Map<string, string | null>;
  coverageById: Map<string, ShippingGroupRuleCoverage>;
}): ShippingGroupListItem[] =>
  shippingGroups.map((shippingGroup) => ({
    id: shippingGroup.id,
    title: shippingGroup.name,
    description: shippingGroup.description ?? undefined,
    subtitle: buildShippingGroupSubtitle({
      shippingGroup,
      normalizedSummaryById,
      redundantSummaryById,
      missingSummaryById,
      coverageById,
    }),
    original: shippingGroup,
  }));

export const useShippingGroupsListRuleModel = ({
  shippingGroups,
  selectedCatalogCategories,
}: {
  shippingGroups: readonly ProductShippingGroup[];
  selectedCatalogCategories: readonly ProductCategory[];
}) => {
  const categoryLabelById = useMemo(
    () => buildCategoryPathLabelMap(selectedCatalogCategories),
    [selectedCatalogCategories]
  );
  const ruleConflicts = useMemo(
    () => buildShippingGroupRuleConflicts({ shippingGroups, categories: selectedCatalogCategories }),
    [selectedCatalogCategories, shippingGroups]
  );
  const coverageById = useMemo(
    () => buildRuleCoverageById({ shippingGroups, categories: selectedCatalogCategories, categoryLabelById }),
    [categoryLabelById, selectedCatalogCategories, shippingGroups]
  );
  const normalizedSummaryById = useMemo(
    () => buildNormalizedRuleSummaryById({ shippingGroups, categories: selectedCatalogCategories, categoryLabelById }),
    [categoryLabelById, selectedCatalogCategories, shippingGroups]
  );
  const redundantSummaryById = useMemo(
    () => buildRedundantRuleSummaryById({ shippingGroups, categories: selectedCatalogCategories, categoryLabelById }),
    [categoryLabelById, selectedCatalogCategories, shippingGroups]
  );
  const missingSummaryById = useMemo(
    () => buildMissingRuleSummaryById({ shippingGroups, categoryLabelById }),
    [categoryLabelById, shippingGroups]
  );
  const shippingGroupsWithRedundantRules = useMemo(
    () => filterShippingGroupsWithSummary(shippingGroups, redundantSummaryById),
    [redundantSummaryById, shippingGroups]
  );
  const shippingGroupsWithMissingRuleCategories = useMemo(
    () => filterShippingGroupsWithSummary(shippingGroups, missingSummaryById),
    [missingSummaryById, shippingGroups]
  );
  const listItems = useMemo(
    () => buildShippingGroupListItems({ shippingGroups, normalizedSummaryById, redundantSummaryById, missingSummaryById, coverageById }),
    [coverageById, missingSummaryById, normalizedSummaryById, redundantSummaryById, shippingGroups]
  );
  return {
    categoryLabelById,
    ruleConflicts,
    redundantSummaryById,
    missingSummaryById,
    shippingGroupsWithRedundantRules,
    shippingGroupsWithMissingRuleCategories,
    listItems,
  };
};
