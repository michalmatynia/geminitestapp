'use client';

import React from 'react';

import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';

import {
  buildConflictSummaries,
  buildRuleIssueItems,
  type ShippingGroupRuleIssueItem,
  type ShippingGroupsListState,
} from './ShippingGroupList.helpers';

function ConflictRuleSection({ summaries }: { summaries: string[] }): React.JSX.Element | null {
  if (summaries.length === 0) return null;

  return (
    <div className='space-y-1'>
      <p className='font-semibold'>
        Conflicting auto-assign rules detected. Some legacy auto-assign rules cannot be repaired
        automatically.
      </p>
      <ul className='list-disc list-inside'>
        {summaries.map((summary, index) => (
          <li key={index}>{summary}</li>
        ))}
      </ul>
    </div>
  );
}

function RuleIssueSection({
  intro,
  issueLabel,
  items,
  show,
}: {
  intro: string;
  issueLabel: string;
  items: ShippingGroupRuleIssueItem[];
  show: boolean;
}): React.JSX.Element | null {
  if (!show) return null;

  return (
    <div className='space-y-1'>
      <p>{intro}</p>
      <ul className='list-disc list-inside'>
        {items.map((item) => (
          <li key={item.id}>
            {item.groupName}: {issueLabel} detected. After save: {item.afterSave}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RepairAllSafeRulesAction({
  state,
}: {
  state: ShippingGroupsListState;
}): React.JSX.Element | null {
  if (state.shippingGroupsWithRepairAvailable.length === 0) return null;

  return (
    <div className='flex items-center justify-between gap-4 pt-1'>
      <p>
        Some auto-assign rules have redundant categories or references to missing categories. You
        can repair them automatically.
      </p>
      <Button
        type='button'
        size='sm'
        variant='outline'
        className='shrink-0'
        disabled={state.saveShippingGroupMutation.isPending}
        onClick={() => {
          void state.handleRepairAllSafeRules();
        }}
      >
        Repair all safe rules ({state.shippingGroupsWithRepairAvailable.length})
      </Button>
    </div>
  );
}

export function ShippingGroupListAlert({
  state,
}: {
  state: ShippingGroupsListState;
}): React.JSX.Element | null {
  const conflictSummaries = buildConflictSummaries(state);
  const redundantItems = buildRuleIssueItems(state, state.shippingGroupRedundantRuleSummaryById);
  const missingItems = buildRuleIssueItems(state, state.shippingGroupMissingRuleSummaryById);
  const hasConflicts = conflictSummaries.length > 0;
  const showGlobalAlert =
    hasConflicts ||
    redundantItems.length > 0 ||
    missingItems.length > 0 ||
    state.shippingGroupsWithRepairAvailable.length > 0;

  if (!showGlobalAlert) return null;

  return (
    <Alert variant={hasConflicts ? 'warning' : 'info'} className='mb-4'>
      <div className='text-sm space-y-3'>
        <ConflictRuleSection summaries={conflictSummaries} />
        <RuleIssueSection
          intro='Some auto-assign rules include descendant categories already covered by parent categories.'
          issueLabel='Redundant categories'
          items={redundantItems}
          show={!hasConflicts && redundantItems.length > 0}
        />
        <RuleIssueSection
          intro='Some auto-assign rules reference categories that no longer exist in this catalog.'
          issueLabel='Missing categories'
          items={missingItems}
          show={!hasConflicts && missingItems.length > 0}
        />
        <RepairAllSafeRulesAction state={state} />
      </div>
    </Alert>
  );
}
