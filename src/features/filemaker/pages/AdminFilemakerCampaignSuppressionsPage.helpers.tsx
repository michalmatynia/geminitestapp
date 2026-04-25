'use client';

import { Trash2 } from 'lucide-react';
import React from 'react';

import { SearchInput } from '@/shared/ui/forms-and-actions.public';
import { Badge, Button } from '@/shared/ui/primitives.public';
import type { BadgeProps } from '@/shared/ui/primitives.public';
import { StandardDataTablePanel } from '@/shared/ui/templates.public';

import type { FilemakerEmailCampaignSuppressionEntry } from '../types';
import { formatTimestamp, includeQuery } from './filemaker-page-utils';
import type { ColumnDef } from '@tanstack/react-table';

export type SuppressionEntry = FilemakerEmailCampaignSuppressionEntry;
type SuppressionReason = SuppressionEntry['reason'];
type BadgeVariant = Exclude<BadgeProps['variant'], null | undefined>;

const SUPPRESSION_REASONS: SuppressionReason[] = [
  'manual_block',
  'unsubscribed',
  'bounced',
  'complaint',
  'cold',
];

const REASON_BADGE_VARIANT: Record<SuppressionReason, BadgeVariant> = {
  manual_block: 'secondary',
  unsubscribed: 'outline',
  bounced: 'destructive',
  complaint: 'destructive',
  cold: 'secondary',
};

const createEmptyReasonCounts = (): Record<SuppressionReason, number> => ({
  manual_block: 0,
  unsubscribed: 0,
  bounced: 0,
  complaint: 0,
  cold: 0,
});

export const countSuppressionReasons = (
  entries: readonly SuppressionEntry[]
): Record<SuppressionReason, number> => {
  const counts = createEmptyReasonCounts();
  for (const entry of entries) counts[entry.reason] += 1;
  return counts;
};

const sortSuppressionsNewestFirst = (
  entries: readonly SuppressionEntry[]
): SuppressionEntry[] =>
  [...entries].sort(
    (left, right) =>
      Date.parse(right.updatedAt ?? right.createdAt ?? '') -
      Date.parse(left.updatedAt ?? left.createdAt ?? '')
  );

export const filterSuppressions = (
  entries: readonly SuppressionEntry[],
  query: string
): SuppressionEntry[] =>
  sortSuppressionsNewestFirst(entries).filter((entry) =>
    includeQuery(
      [
        entry.emailAddress,
        entry.reason,
        entry.actor ?? '',
        entry.notes ?? '',
        entry.campaignId ?? '',
      ],
      query
    )
  );

export const removeSuppressionEntry = async (emailAddress: string): Promise<void> => {
  const response = await fetch('/api/filemaker/campaigns/suppressions', {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ emailAddress }),
  });
  if (response.ok) return;
  const payload = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
  };
  throw new Error(payload.error?.message ?? `Failed to remove suppression (HTTP ${response.status}).`);
};

export type ColdPruneResponse = {
  candidates: Array<{ emailAddress: string; sentCount: number; lastSentAt: string | null }>;
  addedCount: number;
  skippedCount: number;
};

export const pruneColdSuppressionEntries = async (): Promise<ColdPruneResponse> => {
  const response = await fetch('/api/filemaker/campaigns/suppressions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  const payload = (await response.json().catch(() => ({}))) as
    | ColdPruneResponse
    | { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(
      'error' in payload
        ? payload.error?.message ?? `Failed to run cold prune (HTTP ${response.status}).`
        : `Failed to run cold prune (HTTP ${response.status}).`
    );
  }
  return payload as ColdPruneResponse;
};

const SuppressionReasonBadge = ({ reason }: { reason: SuppressionReason }): React.JSX.Element => (
  <Badge variant={REASON_BADGE_VARIANT[reason]} className='text-[10px] uppercase'>
    {reason}
  </Badge>
);

const BASE_SUPPRESSION_COLUMNS: ColumnDef<SuppressionEntry>[] = [
  {
    accessorKey: 'emailAddress',
    header: 'Email Address',
    cell: ({ row }) => <span className='font-medium text-white'>{row.original.emailAddress}</span>,
  },
  {
    accessorKey: 'reason',
    header: 'Reason',
    cell: ({ row }) => <SuppressionReasonBadge reason={row.original.reason} />,
  },
  {
    accessorKey: 'actor',
    header: 'Actor',
    cell: ({ row }) => <span className='text-gray-400'>{row.original.actor ?? '-'}</span>,
  },
  {
    accessorKey: 'notes',
    header: 'Notes',
    cell: ({ row }) => (
      <span className='block max-w-md truncate text-xs text-gray-400'>
        {row.original.notes ?? '-'}
      </span>
    ),
  },
  {
    accessorKey: 'updatedAt',
    header: 'Updated',
    cell: ({ row }) => (
      <span className='text-gray-500'>
        {formatTimestamp(row.original.updatedAt ?? row.original.createdAt ?? null)}
      </span>
    ),
  },
];

const buildActionColumn = ({
  onUnsuppress,
  pendingAddress,
}: {
  onUnsuppress: (entry: SuppressionEntry) => void;
  pendingAddress: string | null;
}): ColumnDef<SuppressionEntry> => ({
  id: 'actions',
  header: '',
  cell: ({ row }) => {
    const isPending = pendingAddress === row.original.emailAddress;
    return (
      <Button
        type='button'
        size='sm'
        variant='outline'
        disabled={isPending}
        onClick={() => onUnsuppress(row.original)}
      >
        <Trash2 className='mr-2 size-3.5' />
        {isPending ? 'Removing...' : 'Unsuppress'}
      </Button>
    );
  },
});

export const createSuppressionColumns = (
  onUnsuppress: (entry: SuppressionEntry) => void,
  pendingAddress: string | null
): ColumnDef<SuppressionEntry>[] => [
  ...BASE_SUPPRESSION_COLUMNS,
  buildActionColumn({ onUnsuppress, pendingAddress }),
];

export function SuppressionSummaryBar({
  entriesCount,
  onQueryChange,
  query,
  reasonCounts,
}: {
  entriesCount: number;
  onQueryChange: (value: string) => void;
  query: string;
  reasonCounts: Record<SuppressionReason, number>;
}): React.JSX.Element {
  return (
    <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
      <div className='flex flex-wrap items-center gap-2'>
        <Badge variant='outline' className='text-[10px]'>
          Total: {entriesCount}
        </Badge>
        {SUPPRESSION_REASONS.filter((reason) => reasonCounts[reason] > 0).map((reason) => (
          <Badge key={reason} variant={REASON_BADGE_VARIANT[reason]} className='text-[10px] uppercase'>
            {reason}: {reasonCounts[reason]}
          </Badge>
        ))}
      </div>
      <div className='w-full max-w-sm'>
        <SearchInput
          value={query}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => onQueryChange(event.target.value)}
          onClear={() => onQueryChange('')}
          placeholder='Search address, reason, actor, notes...'
          aria-label='Search suppression entries'
          size='sm'
        />
      </div>
    </div>
  );
}

export function SuppressionRegistryTable({
  columns,
  entries,
  isLoading,
  totalEntries,
}: {
  columns: ColumnDef<SuppressionEntry>[];
  entries: SuppressionEntry[];
  isLoading: boolean;
  totalEntries: number;
}): React.JSX.Element {
  return (
    <StandardDataTablePanel
      title='Suppressed addresses'
      description='Sorted newest first. Hard-bounce, complaint, and cold entries are added by automated workers; manual_block and unsubscribed come from admin actions and recipient unsubscribe links.'
      columns={columns}
      data={entries}
      isLoading={isLoading}
      variant='flat'
      emptyState={
        <div className='p-8 text-center text-sm text-gray-500'>
          {totalEntries === 0
            ? 'No addresses are currently suppressed.'
            : 'No entries match the current filter.'}
        </div>
      }
    />
  );
}
