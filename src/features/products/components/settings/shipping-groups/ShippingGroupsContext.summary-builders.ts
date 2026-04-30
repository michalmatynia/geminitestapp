import type { Catalog, PriceGroup } from '@/shared/contracts/products/catalogs';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductShippingGroup } from '@/shared/contracts/products/shipping-groups';
import { matchesPriceGroupIdentifier } from '@/shared/lib/products/utils/price-group-identifiers';
import { normalizeCurrencyCode } from '@/shared/lib/products/utils/priceCalculation';
import {
  findRedundantShippingGroupRuleCategoryIds,
  formatCategoryRuleSummary,
  formatCurrencyRuleSummary,
  normalizeShippingGroupRuleCategoryIds,
  normalizeShippingGroupRuleCurrencyCodes,
} from '@/shared/lib/products/utils/shipping-group-rule-conflicts';
import type { buildShippingGroupRuleConflicts } from '@/shared/lib/products/utils/shipping-group-rule-conflicts';

import {
  summarizeRuleDescendantCoverage,
  toTrimmedString,
} from './shipping-group-utils';

export type ShippingGroupRuleConflict = ReturnType<
  typeof buildShippingGroupRuleConflicts
>[number];
type ShippingGroupRuleCoverageSummary = ReturnType<typeof summarizeRuleDescendantCoverage>;

export type ShippingGroupSummaries = {
  conflictSummaryById: Map<string, string | null>;
  redundantRuleSummaryById: Map<string, string | null>;
  ruleCoverageById: Map<string, ShippingGroupRuleCoverageSummary>;
  effectiveRuleDisplayById: Map<string, string>;
  missingRuleSummaryById: Map<string, string | null>;
};

const isNonEmptyString = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.length > 0;

const selectCatalogPriceGroups = (
  catalog: Catalog,
  priceGroups: PriceGroup[]
): PriceGroup[] => {
  const catalogPriceGroupIds = Array.isArray(catalog.priceGroupIds)
    ? catalog.priceGroupIds
    : [];

  if (catalogPriceGroupIds.length === 0) return priceGroups;

  return priceGroups.filter((priceGroup) =>
    catalogPriceGroupIds.some((identifier) =>
      matchesPriceGroupIdentifier(priceGroup, identifier)
    )
  );
};

export const buildCatalogCurrencyCodes = (
  catalogs: Catalog[],
  priceGroups: PriceGroup[]
): Map<string, string[]> => {
  const entries = new Map<string, string[]>();

  for (const catalog of catalogs) {
    const candidatePriceGroups = selectCatalogPriceGroups(catalog, priceGroups);
    entries.set(
      catalog.id,
      Array.from(
        new Set(
          candidatePriceGroups
            .map((priceGroup) => normalizeCurrencyCode(priceGroup.currencyCode))
            .filter(isNonEmptyString)
        )
      )
    );
  }

  return entries;
};

const resolveCategoryOverlapLabel = (
  conflict: ShippingGroupRuleConflict,
  selectedCategoryLabelById: Map<string, string>
): string => {
  if (conflict.appliesToAllCategories) return 'all categories';

  return (
    formatCategoryRuleSummary({
      categoryIds: conflict.overlapCategoryIds,
      categoryLabelById: selectedCategoryLabelById,
    }) ?? `${conflict.overlapCategoryIds.length} categories`
  );
};

const resolveCurrencyOverlapLabel = (conflict: ShippingGroupRuleConflict): string => {
  if (conflict.appliesToAllCurrencies) return 'all currencies';

  return (
    formatCurrencyRuleSummary({
      currencyCodes: conflict.overlapCurrencyCodes,
    }) ?? `${conflict.overlapCurrencyCodes.length} currencies`
  );
};

const summarizeConflictEntries = (entries: string[]): string | null => {
  const firstEntry = entries[0] ?? null;
  if (firstEntry === null) return null;
  if (entries.length === 1) return firstEntry;
  return `${firstEntry} +${entries.length - 1} more`;
};

const buildConflictEntriesById = (
  conflicts: ShippingGroupRuleConflict[],
  selectedCategoryLabelById: Map<string, string>
): Map<string, string[]> => {
  const entriesById = new Map<string, string[]>();

  for (const conflict of conflicts) {
    const overlapLabel = resolveCategoryOverlapLabel(conflict, selectedCategoryLabelById);
    const overlapCurrencyLabel = resolveCurrencyOverlapLabel(conflict);
    const [leftGroupId, rightGroupId] = conflict.groupIds;
    const [leftGroupName, rightGroupName] = conflict.groupNames;

    entriesById.set(leftGroupId, [
      ...(entriesById.get(leftGroupId) ?? []),
      `overlaps ${rightGroupName} on ${overlapLabel} in ${overlapCurrencyLabel}`,
    ]);
    entriesById.set(rightGroupId, [
      ...(entriesById.get(rightGroupId) ?? []),
      `overlaps ${leftGroupName} on ${overlapLabel} in ${overlapCurrencyLabel}`,
    ]);
  }

  return entriesById;
};

export const buildConflictSummaryById = ({
  conflicts,
  selectedCategoryLabelById,
  shippingGroups,
}: {
  conflicts: ShippingGroupRuleConflict[];
  selectedCategoryLabelById: Map<string, string>;
  shippingGroups: ProductShippingGroup[];
}): Map<string, string | null> => {
  const entriesById = buildConflictEntriesById(conflicts, selectedCategoryLabelById);
  const summaryById = new Map<string, string | null>();

  for (const shippingGroup of shippingGroups) {
    summaryById.set(
      shippingGroup.id,
      summarizeConflictEntries(entriesById.get(shippingGroup.id) ?? [])
    );
  }

  return summaryById;
};

export const buildRedundantRuleSummaryById = ({
  selectedCatalogCategories,
  selectedCategoryLabelById,
  shippingGroups,
}: {
  selectedCatalogCategories: ProductCategory[];
  selectedCategoryLabelById: Map<string, string>;
  shippingGroups: ProductShippingGroup[];
}): Map<string, string | null> => {
  const summaryById = new Map<string, string | null>();

  for (const shippingGroup of shippingGroups) {
    const redundantRuleIds = findRedundantShippingGroupRuleCategoryIds({
      categoryIds: shippingGroup.autoAssignCategoryIds,
      categories: selectedCatalogCategories,
    });
    summaryById.set(
      shippingGroup.id,
      formatCategoryRuleSummary({
        categoryIds: redundantRuleIds,
        categoryLabelById: selectedCategoryLabelById,
      })
    );
  }

  return summaryById;
};

export const buildRuleCoverageById = ({
  selectedCatalogCategories,
  selectedCategoryLabelById,
  shippingGroups,
}: {
  selectedCatalogCategories: ProductCategory[];
  selectedCategoryLabelById: Map<string, string>;
  shippingGroups: ProductShippingGroup[];
}): Map<string, ShippingGroupRuleCoverageSummary> => {
  const coverageById = new Map<string, ShippingGroupRuleCoverageSummary>();

  for (const shippingGroup of shippingGroups) {
    const normalizedRuleIds = normalizeShippingGroupRuleCategoryIds({
      categoryIds: shippingGroup.autoAssignCategoryIds,
      categories: selectedCatalogCategories,
    });
    coverageById.set(
      shippingGroup.id,
      summarizeRuleDescendantCoverage({
        categoryIds: normalizedRuleIds,
        categories: selectedCatalogCategories,
        categoryLabelById: selectedCategoryLabelById,
      })
    );
  }

  return coverageById;
};

const resolveEffectiveRuleDisplay = ({
  catalogCurrencyCodesByCatalogId,
  ruleCoverageById,
  selectedCatalogCategories,
  selectedCategoryLabelById,
  shippingGroup,
}: {
  catalogCurrencyCodesByCatalogId: Map<string, string[]>;
  ruleCoverageById: Map<string, ShippingGroupRuleCoverageSummary>;
  selectedCatalogCategories: ProductCategory[];
  selectedCategoryLabelById: Map<string, string>;
  shippingGroup: ProductShippingGroup;
}): string => {
  const normalizedSummary = formatCategoryRuleSummary({
    categoryIds: normalizeShippingGroupRuleCategoryIds({
      categoryIds: shippingGroup.autoAssignCategoryIds,
      categories: selectedCatalogCategories,
    }),
    categoryLabelById: selectedCategoryLabelById,
  });
  const currencySummary = formatCurrencyRuleSummary({
    currencyCodes: normalizeShippingGroupRuleCurrencyCodes({
      currencyCodes: shippingGroup.autoAssignCurrencyCodes,
      availableCurrencyCodes: catalogCurrencyCodesByCatalogId.get(shippingGroup.catalogId) ?? [],
    }),
  });
  const hasDescendants =
    (ruleCoverageById.get(shippingGroup.id)?.descendantIds.length ?? 0) > 0;
  const categoryDisplay = isNonEmptyString(normalizedSummary)
    ? `${normalizedSummary}${hasDescendants ? ' (+ descendants)' : ''}`
    : null;
  const currencyDisplay = isNonEmptyString(currencySummary)
    ? `currencies: ${currencySummary}`
    : null;
  const display = [categoryDisplay, currencyDisplay].filter(isNonEmptyString).join(' · ');

  return display.length > 0 ? display : 'None';
};

export const buildEffectiveRuleDisplayById = (input: {
  catalogCurrencyCodesByCatalogId: Map<string, string[]>;
  ruleCoverageById: Map<string, ShippingGroupRuleCoverageSummary>;
  selectedCatalogCategories: ProductCategory[];
  selectedCategoryLabelById: Map<string, string>;
  shippingGroups: ProductShippingGroup[];
}): Map<string, string> => {
  const displayById = new Map<string, string>();

  for (const shippingGroup of input.shippingGroups) {
    displayById.set(
      shippingGroup.id,
      resolveEffectiveRuleDisplay({ ...input, shippingGroup })
    );
  }

  return displayById;
};

export const buildMissingRuleSummaryById = ({
  selectedCategoryLabelById,
  shippingGroups,
}: {
  selectedCategoryLabelById: Map<string, string>;
  shippingGroups: ProductShippingGroup[];
}): Map<string, string | null> => {
  const summaryById = new Map<string, string | null>();

  for (const shippingGroup of shippingGroups) {
    const missingRuleIds = shippingGroup.autoAssignCategoryIds
      .map((categoryId) => toTrimmedString(categoryId))
      .filter(
        (categoryId) => categoryId.length > 0 && !selectedCategoryLabelById.has(categoryId)
      );

    summaryById.set(
      shippingGroup.id,
      missingRuleIds.length > 0 ? missingRuleIds.join(', ') : null
    );
  }

  return summaryById;
};
