'use client';

import React from 'react';

import {
  formatCategoryRuleSummary,
  formatCurrencyRuleSummary,
} from '@/shared/lib/products/utils/shipping-group-rule-conflicts';
import { Alert } from '@/shared/ui/alert';

import { useShippingGroupsState } from './ShippingGroupsContext';
import { DRAFT_SHIPPING_GROUP_ID } from './shipping-group-utils';

type ShippingGroupsState = ReturnType<typeof useShippingGroupsState>;
type ModalRuleConflict = ShippingGroupsState['modalShippingGroupRuleConflicts'][number];

const hasText = (value: string | null): value is string => value !== null && value.length > 0;

function SimpleRuleAlert({
  children,
  summary,
  variant,
}: {
  children: React.ReactNode;
  summary: string | null;
  variant: 'info' | 'warning';
}): React.JSX.Element | null {
  if (!hasText(summary)) return null;
  return (
    <Alert variant={variant} className='-mt-2'>
      <div className='text-sm'>
        {children} <strong>{summary}</strong>.
      </div>
    </Alert>
  );
}

const buildEffectiveRuleSummary = (
  categorySummary: string | null,
  currencySummary: string | null
): string => {
  const parts: string[] = [];
  if (hasText(categorySummary)) parts.push(categorySummary);
  if (hasText(currencySummary)) parts.push(`currencies: ${currencySummary}`);
  return parts.join(' · ');
};

function NormalizedRuleAlert(): React.JSX.Element | null {
  const {
    shouldShowNormalizedModalRuleSummary,
    normalizedModalRuleSummary,
    normalizedModalCurrencySummary,
  } = useShippingGroupsState();
  if (shouldShowNormalizedModalRuleSummary === false) return null;

  const effectiveRuleSummary = buildEffectiveRuleSummary(
    normalizedModalRuleSummary,
    normalizedModalCurrencySummary
  );
  if (effectiveRuleSummary.length === 0) {
    return (
      <Alert variant='warning' className='-mt-2'>
        <div className='text-sm'>
          This rule will stop auto-assigning products after save because no valid categories remain.
        </div>
      </Alert>
    );
  }

  return (
    <Alert variant='info' className='-mt-2'>
      <div className='text-sm'>
        Effective auto-assign rule after save: <strong>{effectiveRuleSummary}</strong>.
      </div>
    </Alert>
  );
}

const resolveOverlapCategoryLabel = (
  conflict: ModalRuleConflict,
  state: ShippingGroupsState
): string => {
  if (conflict.appliesToAllCategories) return 'all categories';
  return (
    formatCategoryRuleSummary({
      categoryIds: conflict.overlapCategoryIds,
      categoryLabelById: state.modalCategoryLabelById,
    }) ?? `${conflict.overlapCategoryIds.length} categories`
  );
};

const resolveOverlapCurrencyLabel = (conflict: ModalRuleConflict): string => {
  if (conflict.appliesToAllCurrencies) return 'all currencies';
  return (
    formatCurrencyRuleSummary({ currencyCodes: conflict.overlapCurrencyCodes }) ??
    `${conflict.overlapCurrencyCodes.length} currencies`
  );
};

const resolveOtherGroupName = (
  conflict: ModalRuleConflict,
  editingGroupId: string | null
): string => {
  const currentGroupId = editingGroupId ?? DRAFT_SHIPPING_GROUP_ID;
  if (conflict.groupIds[0] === currentGroupId) {
    return conflict.groupNames[1];
  }
  return conflict.groupNames[0];
};

function RuleConflictLine({
  conflict,
  state,
}: {
  conflict: ModalRuleConflict;
  state: ShippingGroupsState;
}): React.JSX.Element {
  const editingGroupId = state.editingShippingGroup?.id ?? null;
  const otherGroupName = resolveOtherGroupName(conflict, editingGroupId);

  return (
    <p>
      Overlaps with <strong>{otherGroupName}</strong> on{' '}
      <strong>{resolveOverlapCategoryLabel(conflict, state)}</strong> in{' '}
      <strong>{resolveOverlapCurrencyLabel(conflict)}</strong>.
    </p>
  );
}

function RuleConflictAlert(): React.JSX.Element | null {
  const state = useShippingGroupsState();
  const hasConflicts = state.modalShippingGroupRuleConflicts.length > 0;
  if (state.loadingModalCatalogShippingGroups || hasConflicts === false) return null;

  return (
    <Alert variant='warning' className='-mt-2'>
      <div className='space-y-1 text-sm'>
        <p>
          This auto-assign rule overlaps with other shipping groups in this catalog. Products in
          the overlapping categories will need a manual shipping-group override unless you adjust
          these rules.
        </p>
        {state.modalShippingGroupRuleConflicts.map((conflict) => (
          <RuleConflictLine key={conflict.groupIds.join(':')} conflict={conflict} state={state} />
        ))}
      </div>
    </Alert>
  );
}

export function ShippingGroupFormModalRuleAlerts(): React.JSX.Element {
  const {
    modalRuleCoverage,
    redundantModalRuleSummary,
    missingModalRuleSummary,
  } = useShippingGroupsState();

  return (
    <>
      <SimpleRuleAlert summary={modalRuleCoverage.descendantSummary} variant='info'>
        This rule also matches descendant categories:
      </SimpleRuleAlert>
      <SimpleRuleAlert summary={redundantModalRuleSummary} variant='info'>
        Redundant descendant categories will be omitted on save:
      </SimpleRuleAlert>
      <SimpleRuleAlert summary={missingModalRuleSummary} variant='warning'>
        Missing categories will be removed on save:
      </SimpleRuleAlert>
      <NormalizedRuleAlert />
      <RuleConflictAlert />
    </>
  );
}
