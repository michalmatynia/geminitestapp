'use client';

import React from 'react';
import {
  Alert,
  Button,
  SimpleSettingsList,
} from '@/shared/ui';
import { useShippingGroupsState } from './ShippingGroupsContext';
import {
  formatCategoryRuleSummary,
  normalizeShippingGroupRuleCategoryIds,
} from '@/shared/lib/products/utils/shipping-group-rule-conflicts';

export function ShippingGroupList(): React.JSX.Element | null {
  const {
    selectedCatalogId,
    shippingGroups,
    loading,
    loadingSelectedCatalogCategories,
    selectedCatalogCategories,
    selectedCategoryLabelById,
    shippingGroupEffectiveRuleDisplayById,
    shippingGroupRedundantRuleSummaryById,
    shippingGroupMissingRuleSummaryById,
    shippingGroupConflictSummaryById,
    handleRepairRule,
    saveShippingGroupMutation,
    openEditModal,
    handleDelete,
    shippingGroupsWithRepairAvailable,
    handleRepairAllSafeRules,
  } = useShippingGroupsState();

  if (!selectedCatalogId) return null;

  const hasConflicts = Array.from(shippingGroupConflictSummaryById.values()).some(Boolean);
  const conflictSummaries = Array.from(shippingGroupConflictSummaryById.entries())
    .filter(([_, summary]) => Boolean(summary))
    .map(([id, summary]) => {
      const group = shippingGroups.find((g) => g.id === id);
      return `${group?.name ?? 'Unknown'} repair is blocked: ${summary}`;
    });

  const hasRedundant = Array.from(shippingGroupRedundantRuleSummaryById.values()).some(Boolean);
  const hasMissing = Array.from(shippingGroupMissingRuleSummaryById.values()).some(Boolean);
  const hasRepairAvailable = shippingGroupsWithRepairAvailable.length > 0;

  const showGlobalAlert = hasConflicts || hasRedundant || hasMissing || hasRepairAvailable;

  return (
    <div className='space-y-4'>
      {showGlobalAlert && (
        <Alert variant={hasConflicts ? 'warning' : 'info'} className='mb-4'>
          <div className='text-sm space-y-3'>
            {hasConflicts && (
              <div className='space-y-1'>
                <p className='font-semibold'>
                  Conflicting auto-assign rules detected. Some legacy auto-assign rules cannot be
                  repaired automatically.
                </p>
                <ul className='list-disc list-inside'>
                  {conflictSummaries.map((summary, index) => (
                    <li key={index}>{summary}</li>
                  ))}
                </ul>
              </div>
            )}
            {hasRedundant && !hasConflicts && (
              <div className='space-y-1'>
                <p>
                  Some auto-assign rules include descendant categories already covered by parent
                  categories.
                </p>
                <ul className='list-disc list-inside'>
                  {Array.from(shippingGroupRedundantRuleSummaryById.entries())
                    .filter(([_, summary]) => Boolean(summary))
                    .map(([id]) => {
                      const group = shippingGroups.find((g) => g.id === id);
                      const afterSave = shippingGroupEffectiveRuleDisplayById.get(id) || 'None';
                      return (
                        <li key={id}>
                          {group?.name}: Redundant categories detected. After save: {afterSave}
                        </li>
                      );
                    })}
                </ul>
              </div>
            )}
            {hasMissing && !hasConflicts && (
              <div className='space-y-1'>
                <p>
                  Some auto-assign rules reference categories that no longer exist in this catalog.
                </p>
                <ul className='list-disc list-inside'>
                  {Array.from(shippingGroupMissingRuleSummaryById.entries())
                    .filter(([_, summary]) => Boolean(summary))
                    .map(([id]) => {
                      const group = shippingGroups.find((g) => g.id === id);
                      const afterSave = shippingGroupEffectiveRuleDisplayById.get(id) || 'None';
                      return (
                        <li key={id}>
                          {group?.name}: Missing categories detected. After save: {afterSave}
                        </li>
                      );
                    })}
                </ul>
              </div>
            )}
            {hasRepairAvailable && (
              <div className='flex items-center justify-between gap-4 pt-1'>
                <p>
                  Some auto-assign rules have redundant categories or references to missing
                  categories. You can repair them automatically.
                </p>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  className='shrink-0'
                  disabled={saveShippingGroupMutation.isPending}
                  onClick={() => {
                    void handleRepairAllSafeRules();
                  }}
                >
                  Repair all safe rules ({shippingGroupsWithRepairAvailable.length})
                </Button>
              </div>
            )}
          </div>
        </Alert>
      )}

      <SimpleSettingsList
        items={shippingGroups.map((shippingGroup) => {
          const normalizedCategoryRuleIds = normalizeShippingGroupRuleCategoryIds({
            categoryIds: shippingGroup.autoAssignCategoryIds ?? [],
            categories: selectedCatalogCategories,
          });
          const categoryRuleSummary = formatCategoryRuleSummary({
            categoryIds: normalizedCategoryRuleIds,
            categoryLabelById: selectedCategoryLabelById,
          });
          const meta = [
            shippingGroup.traderaShippingCondition
              ? `Tradera: ${shippingGroup.traderaShippingCondition}`
              : null,
            typeof shippingGroup.traderaShippingPriceEur === 'number'
              ? `${shippingGroup.traderaShippingPriceEur.toFixed(2)} EUR`
              : null,
            categoryRuleSummary
              ? `Categories (${normalizedCategoryRuleIds.length}): ${categoryRuleSummary}`
              : null,
            `Auto rule: ${shippingGroupEffectiveRuleDisplayById.get(shippingGroup.id)}`,
            shippingGroupRedundantRuleSummaryById.get(shippingGroup.id)
              ? `Redundant: ${shippingGroupRedundantRuleSummaryById.get(shippingGroup.id)}`
              : null,
            shippingGroupMissingRuleSummaryById.get(shippingGroup.id)
              ? `Missing: ${shippingGroupMissingRuleSummaryById.get(shippingGroup.id)}`
              : null,
            shippingGroupConflictSummaryById.get(shippingGroup.id)
              ? `Conflict: ${shippingGroupConflictSummaryById.get(shippingGroup.id)}`
              : null,
          ]
            .filter((value): value is string => Boolean(value))
            .join(' · ');

          return {
            id: shippingGroup.id,
            title: shippingGroup.name,
            description: [shippingGroup.description, meta]
              .filter(Boolean)
              .join('\n'),
            original: shippingGroup,
          };
        })}
        isLoading={loading || loadingSelectedCatalogCategories}
        renderActions={(item) => {
          const hasRuleRepair =
            Boolean(shippingGroupRedundantRuleSummaryById.get(item.original.id)) ||
            Boolean(shippingGroupMissingRuleSummaryById.get(item.original.id));
          const repairConflictSummary = shippingGroupConflictSummaryById.get(
            item.original.id
          );
          const isRepairBlocked = Boolean(repairConflictSummary);

          if (!hasRuleRepair) {
            return null;
          }

          return (
            <Button
              type='button'
              onClick={() => {
                void handleRepairRule(item.original);
              }}
              disabled={saveShippingGroupMutation.isPending || isRepairBlocked}
              className='h-8 px-3'
              title={
                isRepairBlocked
                  ? `Repair blocked: ${repairConflictSummary}`
                  : `Repair rule for ${item.original.name}`
              }
            >
              {isRepairBlocked ? 'Repair blocked' : 'Repair rule'}
            </Button>
          );
        }}
        onEdit={(item) => openEditModal(item.original)}
        onDelete={(item) => handleDelete(item.original)}
        emptyMessage='No shipping groups yet. Create shipping groups and assign them to products before mapping delivery behavior.'
      />
    </div>
  );
}
