'use client';

import { useMemo } from 'react';

import type { ProductCategory } from '@/shared/contracts/products/categories';
import type {
  ProductShippingGroup,
  ProductShippingGroupUpdateInput,
} from '@/shared/contracts/products/shipping-groups';
import {
  normalizeShippingGroupRuleCategoryIds,
  normalizeShippingGroupRuleCurrencyCodes,
} from '@/shared/lib/products/utils/shipping-group-rule-conflicts';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import type { ShippingGroupSaveMutation, ShippingGroupToast } from './ShippingGroupsContext.types';

type ShippingGroupsRepairArgs = {
  onRefresh: () => void;
  saveShippingGroupMutation: ShippingGroupSaveMutation;
  selectedCatalogCategories: ProductCategory[];
  selectedCatalogCurrencyCodes: string[];
  shippingGroupConflictSummaryById: Map<string, string | null>;
  shippingGroupMissingRuleSummaryById: Map<string, string | null>;
  shippingGroupRedundantRuleSummaryById: Map<string, string | null>;
  shippingGroups: ProductShippingGroup[];
  toast: ShippingGroupToast;
};

type ShippingGroupsRepairState = {
  shippingGroupsWithRepairAvailable: ProductShippingGroup[];
  handleRepairAllSafeRules: () => Promise<void>;
};

const hasSummary = (summaryById: Map<string, string | null>, groupId: string): boolean => {
  const summary = summaryById.get(groupId);
  return summary !== null && summary !== undefined;
};

const hasRepairAvailable = (
  shippingGroup: ProductShippingGroup,
  args: Pick<
    ShippingGroupsRepairArgs,
    | 'shippingGroupConflictSummaryById'
    | 'shippingGroupMissingRuleSummaryById'
    | 'shippingGroupRedundantRuleSummaryById'
  >
): boolean => {
  const groupId = shippingGroup.id;
  const hasRedundantRule = hasSummary(args.shippingGroupRedundantRuleSummaryById, groupId);
  const hasMissingRule = hasSummary(args.shippingGroupMissingRuleSummaryById, groupId);
  const hasConflict = hasSummary(args.shippingGroupConflictSummaryById, groupId);
  return (hasRedundantRule || hasMissingRule) && hasConflict === false;
};

const resolvePersistedShippingPrice = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const buildRepairPayload = (
  shippingGroup: ProductShippingGroup,
  args: Pick<
    ShippingGroupsRepairArgs,
    'selectedCatalogCategories' | 'selectedCatalogCurrencyCodes'
  >
): ProductShippingGroupUpdateInput => ({
  name: shippingGroup.name,
  description: shippingGroup.description ?? null,
  catalogId: shippingGroup.catalogId,
  traderaShippingCondition: shippingGroup.traderaShippingCondition ?? null,
  traderaShippingPriceEur: resolvePersistedShippingPrice(shippingGroup.traderaShippingPriceEur),
  autoAssignCategoryIds: normalizeShippingGroupRuleCategoryIds({
    categoryIds: shippingGroup.autoAssignCategoryIds,
    categories: args.selectedCatalogCategories,
  }),
  autoAssignCurrencyCodes: normalizeShippingGroupRuleCurrencyCodes({
    currencyCodes: shippingGroup.autoAssignCurrencyCodes,
    availableCurrencyCodes: args.selectedCatalogCurrencyCodes,
  }),
});

const repairShippingGroup = (
  shippingGroup: ProductShippingGroup,
  args: Pick<
    ShippingGroupsRepairArgs,
    'saveShippingGroupMutation' | 'selectedCatalogCategories' | 'selectedCatalogCurrencyCodes'
  >
): Promise<ProductShippingGroup> =>
  args.saveShippingGroupMutation.mutateAsync({
    id: shippingGroup.id,
    data: buildRepairPayload(shippingGroup, args),
  });

const repairShippingGroupsSequentially = (
  shippingGroups: ProductShippingGroup[],
  args: Pick<
    ShippingGroupsRepairArgs,
    'saveShippingGroupMutation' | 'selectedCatalogCategories' | 'selectedCatalogCurrencyCodes'
  >
): Promise<void> =>
  shippingGroups.reduce<Promise<void>>(
    async (previousRepair, shippingGroup) => {
      await previousRepair;
      await repairShippingGroup(shippingGroup, args);
    },
    Promise.resolve()
  );

const repairAllSafeRules = async (
  shippingGroupsWithRepairAvailable: ProductShippingGroup[],
  args: ShippingGroupsRepairArgs
): Promise<void> => {
  if (shippingGroupsWithRepairAvailable.length === 0) return;

  try {
    await repairShippingGroupsSequentially(shippingGroupsWithRepairAvailable, args);
    args.toast(`Repaired ${shippingGroupsWithRepairAvailable.length} shipping group rules.`, {
      variant: 'success',
    });
    args.onRefresh();
  } catch (error) {
    logClientCatch(error, {
      source: 'ShippingGroupsSettings',
      action: 'repairAllSafeRules',
    });
    args.toast('Failed to repair one or more rules.', { variant: 'error' });
  }
};

export const useShippingGroupsRepair = (
  args: ShippingGroupsRepairArgs
): ShippingGroupsRepairState => {
  const shippingGroupsWithRepairAvailable = useMemo(
    (): ProductShippingGroup[] =>
      args.shippingGroups.filter((shippingGroup) => hasRepairAvailable(shippingGroup, args)),
    [
      args,
      args.shippingGroupConflictSummaryById,
      args.shippingGroupMissingRuleSummaryById,
      args.shippingGroupRedundantRuleSummaryById,
      args.shippingGroups,
    ]
  );

  return {
    shippingGroupsWithRepairAvailable,
    handleRepairAllSafeRules: () => repairAllSafeRules(shippingGroupsWithRepairAvailable, args),
  };
};
