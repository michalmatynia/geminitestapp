'use client';

import { useMemo } from 'react';
import type { Catalog, PriceGroup } from '@/shared/contracts/products/catalogs';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductShippingGroup } from '@/shared/contracts/products/shipping-groups';
import {
  buildShippingGroupRuleConflicts,
  formatCategoryRuleSummary,
  formatCurrencyRuleSummary,
  findRedundantShippingGroupRuleCategoryIds,
  normalizeShippingGroupRuleCategoryIds,
  normalizeShippingGroupRuleCurrencyCodes,
} from '@/shared/lib/products/utils/shipping-group-rule-conflicts';
import { matchesPriceGroupIdentifier } from '@/shared/lib/products/utils/price-group-identifiers';
import { normalizeCurrencyCode } from '@/shared/lib/products/utils/priceCalculation';
import {
  summarizeRuleDescendantCoverage,
  toTrimmedString,
} from './shipping-group-utils';

export const useCatalogCurrencyCodes = (
  catalogs: Catalog[],
  priceGroups: PriceGroup[]
): Map<string, string[]> => {
  return useMemo(() => {
    const entries = new Map<string, string[]>();

    for (const catalog of catalogs) {
      const catalogPriceGroupIds = Array.isArray(catalog.priceGroupIds) ? catalog.priceGroupIds : [];
      const candidatePriceGroups =
        catalogPriceGroupIds.length > 0
          ? priceGroups.filter((priceGroup) =>
              catalogPriceGroupIds.some((identifier) => matchesPriceGroupIdentifier(priceGroup, identifier))
            )
          : priceGroups;

      entries.set(
        catalog.id,
        Array.from(
          new Set(
            candidatePriceGroups
              .map((priceGroup) =>
                normalizeCurrencyCode(priceGroup.currencyCode ?? priceGroup.currencyId ?? '')
              )
              .filter(Boolean)
          )
        )
      );
    }

    return entries;
  }, [catalogs, priceGroups]);
};

export const useShippingGroupSummaries = ({
  shippingGroups,
  selectedCatalogCategories,
  selectedCatalogCurrencyCodes,
  selectedCategoryLabelById,
  catalogCurrencyCodesByCatalogId,
}: {
  shippingGroups: ProductShippingGroup[];
  selectedCatalogCategories: ProductCategory[];
  selectedCatalogCurrencyCodes: string[];
  selectedCategoryLabelById: Map<string, string>;
  catalogCurrencyCodesByCatalogId: Map<string, string[]>;
}) => {
  const shippingGroupRuleConflicts = useMemo(
    () =>
      buildShippingGroupRuleConflicts({
        shippingGroups,
        categories: selectedCatalogCategories,
        availableCurrencyCodes: selectedCatalogCurrencyCodes,
      }),
    [selectedCatalogCategories, selectedCatalogCurrencyCodes, shippingGroups]
  );

  const conflictSummaryById = useMemo(() => {
    const entriesById = new Map<string, string[]>();

    for (const conflict of shippingGroupRuleConflicts) {
      const overlapLabel =
        conflict.appliesToAllCategories
          ? 'all categories'
          : (formatCategoryRuleSummary({
              categoryIds: conflict.overlapCategoryIds,
              categoryLabelById: selectedCategoryLabelById,
            }) ?? `${conflict.overlapCategoryIds.length} categories`);
      const overlapCurrencyLabel =
        conflict.appliesToAllCurrencies
          ? 'all currencies'
          : (formatCurrencyRuleSummary({
              currencyCodes: conflict.overlapCurrencyCodes,
            }) ?? `${conflict.overlapCurrencyCodes.length} currencies`);

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

    const summaryById = new Map<string, string | null>();
    for (const shippingGroup of shippingGroups) {
      const entries = entriesById.get(shippingGroup.id) ?? [];
      summaryById.set(
        shippingGroup.id,
        entries.length === 0
          ? null
          : entries.length === 1
            ? entries[0]!
            : `${entries[0]} +${entries.length - 1} more`
      );
    }

    return summaryById;
  }, [selectedCategoryLabelById, shippingGroupRuleConflicts, shippingGroups]);

  const redundantRuleSummaryById = useMemo(() => {
    const summaryById = new Map<string, string | null>();

    for (const shippingGroup of shippingGroups) {
      const redundantRuleIds = findRedundantShippingGroupRuleCategoryIds({
        categoryIds: Array.isArray(shippingGroup.autoAssignCategoryIds)
          ? shippingGroup.autoAssignCategoryIds
          : [],
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
  }, [selectedCatalogCategories, selectedCategoryLabelById, shippingGroups]);

  const ruleCoverageById = useMemo(() => {
    const coverageById = new Map<
      string,
      {
        descendantIds: string[];
        descendantSummary: string | null;
      }
    >();

    for (const shippingGroup of shippingGroups) {
      const normalizedRuleIds = normalizeShippingGroupRuleCategoryIds({
        categoryIds: Array.isArray(shippingGroup.autoAssignCategoryIds)
          ? shippingGroup.autoAssignCategoryIds
          : [],
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
  }, [selectedCatalogCategories, selectedCategoryLabelById, shippingGroups]);

  const effectiveRuleDisplayById = useMemo(() => {
    const displayById = new Map<string, string>();

    for (const shippingGroup of shippingGroups) {
      const normalizedSummary = formatCategoryRuleSummary({
        categoryIds: normalizeShippingGroupRuleCategoryIds({
          categoryIds: Array.isArray(shippingGroup.autoAssignCategoryIds)
            ? shippingGroup.autoAssignCategoryIds
            : [],
          categories: selectedCatalogCategories,
        }),
        categoryLabelById: selectedCategoryLabelById,
      });
      const currencySummary = formatCurrencyRuleSummary({
        currencyCodes: normalizeShippingGroupRuleCurrencyCodes({
          currencyCodes: shippingGroup.autoAssignCurrencyCodes ?? [],
          availableCurrencyCodes:
            catalogCurrencyCodesByCatalogId.get(shippingGroup.catalogId) ?? [],
        }),
      });
      const hasDescendants =
        (ruleCoverageById.get(shippingGroup.id)?.descendantIds.length ?? 0) > 0;
      const categoryDisplay = normalizedSummary
        ? `${normalizedSummary}${hasDescendants ? ' (+ descendants)' : ''}`
        : '';
      const currencyDisplay = currencySummary ? `currencies: ${currencySummary}` : '';
      const display = [categoryDisplay, currencyDisplay].filter(Boolean).join(' · ');

      displayById.set(
        shippingGroup.id,
        display || 'None'
      );
    }

    return displayById;
  }, [
    catalogCurrencyCodesByCatalogId,
    ruleCoverageById,
    selectedCatalogCategories,
    selectedCategoryLabelById,
    shippingGroups,
  ]);

  const missingRuleSummaryById = useMemo(() => {
    const summaryById = new Map<string, string | null>();

    for (const shippingGroup of shippingGroups) {
      const missingRuleIds = (Array.isArray(shippingGroup.autoAssignCategoryIds)
        ? shippingGroup.autoAssignCategoryIds
        : []
      )
        .map((categoryId) => toTrimmedString(categoryId))
        .filter((categoryId) => categoryId.length > 0 && !selectedCategoryLabelById.has(categoryId));

      summaryById.set(
        shippingGroup.id,
        missingRuleIds.length > 0 ? missingRuleIds.join(', ') : null
      );
    }

    return summaryById;
  }, [selectedCategoryLabelById, shippingGroups]);

  return {
    conflictSummaryById,
    redundantRuleSummaryById,
    ruleCoverageById,
    effectiveRuleDisplayById,
    missingRuleSummaryById,
  };
};
