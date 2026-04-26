'use client';

import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { Badge, Button } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';

import { useCampaignEditContext } from '../AdminFilemakerCampaignEditPage.context';
import {
  isCampaignListHygieneBlocking,
  runListHygieneCheck,
  type CampaignListHygieneIssue,
  type CampaignListHygieneIssueCode,
  type CampaignListHygieneSeverity,
} from '../../settings/campaign-list-hygiene';
import type { FilemakerEmailCampaignSuppressionRegistry } from '../../types';

type FilterValue = 'all' | CampaignListHygieneIssueCode;

const SEVERITY_BADGE_VARIANT: Record<
  CampaignListHygieneSeverity,
  'destructive' | 'outline' | 'default'
> = {
  error: 'destructive',
  warning: 'outline',
  info: 'default',
};

const ISSUE_LABEL: Record<CampaignListHygieneIssueCode, string> = {
  duplicate_address: 'Duplicate address',
  role_address: 'Role address',
  syntax_invalid: 'Invalid syntax',
  currently_suppressed: 'Currently suppressed',
  recently_bounced: 'Recently bounced',
  recently_failed: 'Recent delivery failure',
};

export function CampaignDeliverabilityCheckSection(): React.JSX.Element {
  const { preview, deliveryRegistry, suppressionEntries } = useCampaignEditContext();
  const [filter, setFilter] = useState<FilterValue>('all');

  const suppressionRegistry: FilemakerEmailCampaignSuppressionRegistry = useMemo(
    () => ({ version: 1, entries: suppressionEntries }),
    [suppressionEntries]
  );

  const summary = useMemo(
    () =>
      runListHygieneCheck({
        recipients: preview.recipients,
        suppressionRegistry,
        deliveryRegistry,
      }),
    [deliveryRegistry, preview.recipients, suppressionRegistry]
  );

  const visibleIssues = useMemo<CampaignListHygieneIssue[]>(
    () => (filter === 'all' ? summary.issues : summary.issues.filter((issue) => issue.code === filter)),
    [filter, summary.issues]
  );

  const blocking = isCampaignListHygieneBlocking(summary);
  const cleanList = summary.issues.length === 0;

  const headerIcon = cleanList ? (
    <ShieldCheck className='h-4 w-4 text-emerald-400' aria-hidden='true' />
  ) : blocking ? (
    <ShieldX className='h-4 w-4 text-red-400' aria-hidden='true' />
  ) : (
    <ShieldAlert className='h-4 w-4 text-amber-400' aria-hidden='true' />
  );

  return (
    <FormSection
      title={
        <span className='flex items-center gap-2'>
          {headerIcon}
          Deliverability check
        </span>
      }
      className='space-y-3 p-4'
    >
      <div className='flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400'>
        <div>
          {summary.totalRecipients === 0
            ? 'No recipients in audience preview yet — adjust the audience rule to see hygiene results.'
            : `${summary.totalRecipients} recipient${summary.totalRecipients === 1 ? '' : 's'} (${summary.uniqueAddresses} unique). ${summary.issues.length} issue${summary.issues.length === 1 ? '' : 's'} found.`}
        </div>
        <div className='flex items-center gap-1 text-[10px]'>
          <Badge variant='destructive'>{summary.bySeverity.error} errors</Badge>
          <Badge variant='outline'>{summary.bySeverity.warning} warnings</Badge>
          <Badge>{summary.bySeverity.info} info</Badge>
        </div>
      </div>

      {blocking ? (
        <div className='rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200'>
          One or more issues will block recipients from receiving this campaign at send time.
          Review and resolve, or accept that affected addresses will be skipped.
        </div>
      ) : null}

      {summary.issues.length > 0 ? (
        <div className='flex flex-wrap items-center gap-1' role='tablist' aria-label='Filter issues by code'>
          <FilterButton current={filter} value='all' label={`All (${summary.issues.length})`} setFilter={setFilter} />
          {(Object.keys(ISSUE_LABEL) as CampaignListHygieneIssueCode[]).map((code) => {
            const count = summary.byCode[code];
            if (count === 0) return null;
            return (
              <FilterButton
                key={code}
                current={filter}
                value={code}
                label={`${ISSUE_LABEL[code]} (${count})`}
                setFilter={setFilter}
              />
            );
          })}
        </div>
      ) : null}

      {cleanList ? (
        <div className='rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-200'>
          Audience is clean — no hygiene issues detected.
        </div>
      ) : (
        <ul className='max-h-72 divide-y divide-border/30 overflow-y-auto rounded-md border border-border/60 bg-card/20 text-xs'>
          {visibleIssues.map((issue, index) => (
            <li
              key={`${issue.code}-${issue.recipientId ?? issue.emailAddress}-${index}`}
              className='flex items-start justify-between gap-3 px-3 py-2'
            >
              <div className='min-w-0'>
                <div className='flex items-center gap-2'>
                  <Badge variant={SEVERITY_BADGE_VARIANT[issue.severity]} className='text-[10px]'>
                    {issue.severity}
                  </Badge>
                  <span className='text-[10px] uppercase tracking-wide text-gray-500'>
                    {ISSUE_LABEL[issue.code]}
                  </span>
                  <span className='truncate text-white'>{issue.emailAddress}</span>
                </div>
                <div className='mt-1 text-[11px] text-gray-400'>{issue.message}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </FormSection>
  );
}

function FilterButton({
  current,
  value,
  label,
  setFilter,
}: {
  current: FilterValue;
  value: FilterValue;
  label: string;
  setFilter: (value: FilterValue) => void;
}): React.JSX.Element {
  return (
    <Button
      type='button'
      variant={current === value ? 'default' : 'outline'}
      size='sm'
      role='tab'
      aria-selected={current === value}
      className='h-6 px-2 text-[10px]'
      onClick={(): void => { setFilter(value); }}
    >
      {label}
    </Button>
  );
}
