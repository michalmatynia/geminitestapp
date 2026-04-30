import type { ProductShippingGroup } from '@/shared/contracts/products/shipping-groups';
import {
  formatCategoryRuleSummary,
  normalizeShippingGroupRuleCategoryIds,
} from '@/shared/lib/products/utils/shipping-group-rule-conflicts';

import type { useShippingGroupsState } from './ShippingGroupsContext';

export type ShippingGroupsListState = ReturnType<typeof useShippingGroupsState>;

export type ShippingGroupRuleIssueItem = {
  id: string;
  groupName: string;
  afterSave: string;
};

export type ShippingGroupRepairActionState = {
  hasRuleRepair: boolean;
  isRepairBlocked: boolean;
  buttonTitle: string;
  buttonLabel: string;
};

export const hasSummaryValue = (
  value: string | null | undefined
): value is string => typeof value === 'string' && value.length > 0;

const hasSummaryEntry = (
  entry: [string, string | null]
): entry is [string, string] => hasSummaryValue(entry[1]);

const resolveShippingGroupName = (
  state: ShippingGroupsListState,
  groupId: string
): string => state.shippingGroups.find((group) => group.id === groupId)?.name ?? 'Unknown';

export const buildConflictSummaries = (state: ShippingGroupsListState): string[] =>
  Array.from(state.shippingGroupConflictSummaryById.entries())
    .filter(hasSummaryEntry)
    .map(([id, summary]) => `${resolveShippingGroupName(state, id)} repair is blocked: ${summary}`);

export const buildRuleIssueItems = (
  state: ShippingGroupsListState,
  summaryById: Map<string, string | null>
): ShippingGroupRuleIssueItem[] =>
  Array.from(summaryById.entries())
    .filter(hasSummaryEntry)
    .map(([id]) => ({
      id,
      groupName: resolveShippingGroupName(state, id),
      afterSave: state.shippingGroupEffectiveRuleDisplayById.get(id) ?? 'None',
    }));

const buildShippingGroupMetaParts = (
  shippingGroup: ProductShippingGroup,
  state: ShippingGroupsListState
): string[] => {
  const normalizedCategoryRuleIds = normalizeShippingGroupRuleCategoryIds({
    categoryIds: shippingGroup.autoAssignCategoryIds,
    categories: state.selectedCatalogCategories,
  });
  const categoryRuleSummary = formatCategoryRuleSummary({
    categoryIds: normalizedCategoryRuleIds,
    categoryLabelById: state.selectedCategoryLabelById,
  });
  const categoryMeta = hasSummaryValue(categoryRuleSummary)
    ? `Categories (${normalizedCategoryRuleIds.length}): ${categoryRuleSummary}`
    : null;

  return [
    hasSummaryValue(shippingGroup.traderaShippingCondition)
      ? `Tradera: ${shippingGroup.traderaShippingCondition}`
      : null,
    typeof shippingGroup.traderaShippingPriceEur === 'number'
      ? `${shippingGroup.traderaShippingPriceEur.toFixed(2)} EUR`
      : null,
    categoryMeta,
    `Auto rule: ${state.shippingGroupEffectiveRuleDisplayById.get(shippingGroup.id) ?? 'None'}`,
    hasSummaryValue(state.shippingGroupRedundantRuleSummaryById.get(shippingGroup.id))
      ? `Redundant: ${state.shippingGroupRedundantRuleSummaryById.get(shippingGroup.id)}`
      : null,
    hasSummaryValue(state.shippingGroupMissingRuleSummaryById.get(shippingGroup.id))
      ? `Missing: ${state.shippingGroupMissingRuleSummaryById.get(shippingGroup.id)}`
      : null,
    hasSummaryValue(state.shippingGroupConflictSummaryById.get(shippingGroup.id))
      ? `Conflict: ${state.shippingGroupConflictSummaryById.get(shippingGroup.id)}`
      : null,
  ].filter(hasSummaryValue);
};

export const buildShippingGroupListItem = (
  shippingGroup: ProductShippingGroup,
  state: ShippingGroupsListState
): {
  id: string;
  title: string;
  description: string;
  original: ProductShippingGroup;
} => {
  const meta = buildShippingGroupMetaParts(shippingGroup, state).join(' · ');
  const descriptionParts = [
    hasSummaryValue(shippingGroup.description) ? shippingGroup.description : null,
    hasSummaryValue(meta) ? meta : null,
  ];

  return {
    id: shippingGroup.id,
    title: shippingGroup.name,
    description: descriptionParts.filter(hasSummaryValue).join('\n'),
    original: shippingGroup,
  };
};

export const resolveRepairActionState = (
  shippingGroup: ProductShippingGroup,
  state: ShippingGroupsListState
): ShippingGroupRepairActionState => {
  const redundantSummary = state.shippingGroupRedundantRuleSummaryById.get(shippingGroup.id);
  const missingSummary = state.shippingGroupMissingRuleSummaryById.get(shippingGroup.id);
  const conflictSummary = state.shippingGroupConflictSummaryById.get(shippingGroup.id);
  const hasRuleRepair = hasSummaryValue(redundantSummary) || hasSummaryValue(missingSummary);
  const isRepairBlocked = hasSummaryValue(conflictSummary);

  return {
    hasRuleRepair,
    isRepairBlocked,
    buttonTitle: isRepairBlocked
      ? `Repair blocked: ${conflictSummary}`
      : `Repair rule for ${shippingGroup.name}`,
    buttonLabel: isRepairBlocked ? 'Repair blocked' : 'Repair rule',
  };
};
