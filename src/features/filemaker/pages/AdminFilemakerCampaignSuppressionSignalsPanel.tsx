'use client';

import { ShieldOff } from 'lucide-react';
import React from 'react';

import { InsetPanel, SectionHeader } from '@/shared/ui/navigation-and-layout.public';
import { Badge, Button } from '@/shared/ui/primitives.public';

import type {
  FilemakerEmailCampaignDeliverabilityOverview,
  FilemakerEmailCampaignSuppressionReasonSummary,
} from '../settings';
import type { FilemakerEmailCampaignSuppressionReason } from '../types';
import { formatTimestamp } from './filemaker-page-utils';

type SuppressionSignal = {
  reason: FilemakerEmailCampaignSuppressionReason;
  label: string;
  description: string;
};

const PRIORITY_SIGNALS: SuppressionSignal[] = [
  {
    reason: 'complaint',
    label: 'Complaints',
    description: 'Spam complaints hurt sender reputation immediately.',
  },
  {
    reason: 'bounced',
    label: 'Hard bounces',
    description: 'Repeated invalid addresses train providers to distrust future sends.',
  },
  {
    reason: 'cold',
    label: 'Cold recipients',
    description: 'No-engagement recipients drag down inbox placement over time.',
  },
];

const REASON_LABELS: Record<FilemakerEmailCampaignSuppressionReason, string> = {
  manual_block: 'Manual blocks',
  unsubscribed: 'Unsubscribed',
  bounced: 'Hard bounces',
  complaint: 'Complaints',
  cold: 'Cold recipients',
};

const EMPTY_SUMMARY: FilemakerEmailCampaignSuppressionReasonSummary = {
  reason: 'manual_block',
  count: 0,
  ratePercent: 0,
  latestSuppressedAt: null,
};

const findReasonSummary = (
  overview: FilemakerEmailCampaignDeliverabilityOverview,
  reason: FilemakerEmailCampaignSuppressionReason
): FilemakerEmailCampaignSuppressionReasonSummary =>
  overview.suppressionReasonBreakdown.find((entry) => entry.reason === reason) ?? {
    ...EMPTY_SUMMARY,
    reason,
  };

function PrioritySuppressionSignalCard({
  overview,
  signal,
}: {
  overview: FilemakerEmailCampaignDeliverabilityOverview;
  signal: SuppressionSignal;
}): React.JSX.Element {
  const summary = findReasonSummary(overview, signal.reason);
  return (
    <InsetPanel padding='md' className='space-y-2'>
      <div className='flex items-center justify-between gap-2'>
        <div className='text-[11px] uppercase tracking-[0.24em] text-gray-500'>
          {signal.label}
        </div>
        <Badge variant={summary.count > 0 ? 'destructive' : 'outline'} className='text-[10px]'>
          {summary.ratePercent}%
        </Badge>
      </div>
      <div className='text-2xl font-semibold text-white'>{summary.count}</div>
      <div className='text-sm text-gray-400'>{signal.description}</div>
      <div className='text-[11px] text-gray-500'>
        Latest: {formatTimestamp(summary.latestSuppressedAt)}
      </div>
    </InsetPanel>
  );
}

function SuppressionReasonBreakdown({
  overview,
}: {
  overview: FilemakerEmailCampaignDeliverabilityOverview;
}): React.JSX.Element {
  if (overview.suppressionReasonBreakdown.length === 0) {
    return (
      <div className='rounded-xl border border-dashed border-border/40 p-4 text-sm text-gray-500'>
        No suppression reasons have been recorded yet.
      </div>
    );
  }

  return (
    <div className='flex flex-wrap gap-2'>
      {overview.suppressionReasonBreakdown.map((entry) => (
        <Badge key={entry.reason} variant='outline' className='text-[10px] uppercase'>
          {REASON_LABELS[entry.reason]}: {entry.count} ({entry.ratePercent}%)
        </Badge>
      ))}
    </div>
  );
}

export function AdminFilemakerCampaignSuppressionSignalsPanel({
  onOpenSuppressions,
  overview,
}: {
  onOpenSuppressions: () => void;
  overview: FilemakerEmailCampaignDeliverabilityOverview;
}): React.JSX.Element {
  return (
    <InsetPanel padding='md' className='space-y-4'>
      <SectionHeader
        title='Suppression Signals'
        description='Complaint, bounce, and cold-recipient suppressions are the clearest indicators of campaign reputation pressure.'
        size='sm'
        actions={
          <Button type='button' size='sm' variant='outline' onClick={onOpenSuppressions}>
            <ShieldOff className='mr-2 size-3.5' />
            Open Registry
          </Button>
        }
      />
      <div className='grid gap-3 md:grid-cols-3'>
        {PRIORITY_SIGNALS.map((signal) => (
          <PrioritySuppressionSignalCard key={signal.reason} overview={overview} signal={signal} />
        ))}
      </div>
      <SuppressionReasonBreakdown overview={overview} />
    </InsetPanel>
  );
}
