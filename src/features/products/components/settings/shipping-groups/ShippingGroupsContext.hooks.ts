'use client';

import { useMemo } from 'react';

import type { Catalog, PriceGroup } from '@/shared/contracts/products/catalogs';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductShippingGroup } from '@/shared/contracts/products/shipping-groups';
import { buildShippingGroupRuleConflicts } from '@/shared/lib/products/utils/shipping-group-rule-conflicts';

import {
  buildCatalogCurrencyCodes,
  buildConflictSummaryById,
  buildEffectiveRuleDisplayById,
  buildMissingRuleSummaryById,
  buildRedundantRuleSummaryById,
  buildRuleCoverageById,
  type ShippingGroupRuleConflict,
  type ShippingGroupSummaries,
} from './ShippingGroupsContext.summary-builders';

export const useCatalogCurrencyCodes = (
  catalogs: Catalog[],
  priceGroups: PriceGroup[]
): Map<string, string[]> => {
  return useMemo(
    () => buildCatalogCurrencyCodes(catalogs, priceGroups),
    [catalogs, priceGroups]
  );
};

const useShippingGroupRuleConflicts = ({
  selectedCatalogCategories,
  selectedCatalogCurrencyCodes,
  shippingGroups,
}: {
  selectedCatalogCategories: ProductCategory[];
  selectedCatalogCurrencyCodes: string[];
  shippingGroups: ProductShippingGroup[];
}): ShippingGroupRuleConflict[] =>
  useMemo(
    () =>
      buildShippingGroupRuleConflicts({
        shippingGroups,
        categories: selectedCatalogCategories,
        availableCurrencyCodes: selectedCatalogCurrencyCodes,
      }),
    [selectedCatalogCategories, selectedCatalogCurrencyCodes, shippingGroups]
  );

const useConflictSummaryById = ({
  selectedCategoryLabelById,
  shippingGroupRuleConflicts,
  shippingGroups,
}: {
  selectedCategoryLabelById: Map<string, string>;
  shippingGroupRuleConflicts: ShippingGroupRuleConflict[];
  shippingGroups: ProductShippingGroup[];
}): Map<string, string | null> =>
  useMemo(
    () =>
      buildConflictSummaryById({
        conflicts: shippingGroupRuleConflicts,
        selectedCategoryLabelById,
        shippingGroups,
      }),
    [selectedCategoryLabelById, shippingGroupRuleConflicts, shippingGroups]
  );

const useRedundantRuleSummaryById = (input: {
  selectedCatalogCategories: ProductCategory[];
  selectedCategoryLabelById: Map<string, string>;
  shippingGroups: ProductShippingGroup[];
}): Map<string, string | null> =>
  useMemo(() => buildRedundantRuleSummaryById(input), [
    input.selectedCatalogCategories,
    input.selectedCategoryLabelById,
    input.shippingGroups,
  ]);

const useRuleCoverageById = (input: {
  selectedCatalogCategories: ProductCategory[];
  selectedCategoryLabelById: Map<string, string>;
  shippingGroups: ProductShippingGroup[];
}): ShippingGroupSummaries['ruleCoverageById'] =>
  useMemo(() => buildRuleCoverageById(input), [
    input.selectedCatalogCategories,
    input.selectedCategoryLabelById,
    input.shippingGroups,
  ]);

const useEffectiveRuleDisplayById = (input: {
  catalogCurrencyCodesByCatalogId: Map<string, string[]>;
  ruleCoverageById: ShippingGroupSummaries['ruleCoverageById'];
  selectedCatalogCategories: ProductCategory[];
  selectedCategoryLabelById: Map<string, string>;
  shippingGroups: ProductShippingGroup[];
}): Map<string, string> =>
  useMemo(() => buildEffectiveRuleDisplayById(input), [
    input.catalogCurrencyCodesByCatalogId,
    input.ruleCoverageById,
    input.selectedCatalogCategories,
    input.selectedCategoryLabelById,
    input.shippingGroups,
  ]);

const useMissingRuleSummaryById = (input: {
  selectedCategoryLabelById: Map<string, string>;
  shippingGroups: ProductShippingGroup[];
}): Map<string, string | null> =>
  useMemo(() => buildMissingRuleSummaryById(input), [
    input.selectedCategoryLabelById,
    input.shippingGroups,
  ]);

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
}): ShippingGroupSummaries => {
  const sharedSummaryInput = {
    selectedCatalogCategories,
    selectedCategoryLabelById,
    shippingGroups,
  };
  const shippingGroupRuleConflicts = useShippingGroupRuleConflicts({
    selectedCatalogCategories,
    selectedCatalogCurrencyCodes,
    shippingGroups,
  });
  const conflictSummaryById = useConflictSummaryById({
    selectedCategoryLabelById,
    shippingGroupRuleConflicts,
    shippingGroups,
  });
  const redundantRuleSummaryById = useRedundantRuleSummaryById(sharedSummaryInput);
  const ruleCoverageById = useRuleCoverageById(sharedSummaryInput);
  const effectiveRuleDisplayById = useEffectiveRuleDisplayById({
    ...sharedSummaryInput,
    catalogCurrencyCodesByCatalogId,
    ruleCoverageById,
  });
  const missingRuleSummaryById = useMissingRuleSummaryById({
    selectedCategoryLabelById,
    shippingGroups,
  });

  return {
    conflictSummaryById,
    redundantRuleSummaryById,
    ruleCoverageById,
    effectiveRuleDisplayById,
    missingRuleSummaryById,
  };
};
