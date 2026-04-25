'use client';

import { ShieldOff, Trash2 } from 'lucide-react';
import { useRouter } from 'nextjs-toploader/app';
import React, { useCallback, useDeferredValue, useMemo, useState } from 'react';

import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { SearchInput } from '@/shared/ui/forms-and-actions.public';
import { Badge, Button, useToast } from '@/shared/ui/primitives.public';
import type { BadgeProps } from '@/shared/ui/primitives.public';
import { PanelHeader, StandardDataTablePanel } from '@/shared/ui/templates.public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { buildFilemakerNavActions } from '../components/shared/filemaker-nav-actions';
import {
  FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
  parseFilemakerEmailCampaignSuppressionRegistry,
} from '../settings';
import type { FilemakerEmailCampaignSuppressionEntry } from '../types';
import { formatTimestamp, includeQuery } from './filemaker-page-utils';
import type { ColumnDef } from '@tanstack/react-table';

type SuppressionEntry = FilemakerEmailCampaignSuppressionEntry;
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

const countSuppressionReasons = (
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

const filterSuppressions = (
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

const removeSuppressionEntry = async (emailAddress: string): Promise<void> => {
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

function SuppressionSummaryBar({
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

function SuppressionRegistryTable({
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

type SettingsStore = ReturnType<typeof useSettingsStore>;

function useSuppressionRegistryData(query: string): {
  filteredEntries: SuppressionEntry[];
  reasonCounts: Record<SuppressionReason, number>;
  settingsStore: SettingsStore;
  suppressionEntries: SuppressionEntry[];
} {
  const settingsStore = useSettingsStore();
  const deferredQuery = useDeferredValue(query.trim());
  const rawSuppressions = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY);
  const suppressionRegistry = useMemo(
    () => parseFilemakerEmailCampaignSuppressionRegistry(rawSuppressions),
    [rawSuppressions]
  );
  const filteredEntries = useMemo(
    () => filterSuppressions(suppressionRegistry.entries, deferredQuery),
    [deferredQuery, suppressionRegistry.entries]
  );
  const reasonCounts = useMemo(
    () => countSuppressionReasons(suppressionRegistry.entries),
    [suppressionRegistry.entries]
  );

  return {
    filteredEntries,
    reasonCounts,
    settingsStore,
    suppressionEntries: suppressionRegistry.entries,
  };
}

function useUnsuppressHandler(
  settingsStore: SettingsStore,
  setPendingAddress: React.Dispatch<React.SetStateAction<string | null>>
): {
  ConfirmationModal: React.ReactNode;
  handleUnsuppress: (entry: SuppressionEntry) => void;
} {
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const handleUnsuppress = useCallback(
    (entry: SuppressionEntry): void => {
      confirm({
        title: 'Remove suppression entry?',
        message: `Future campaign sends and compose will be allowed to ${entry.emailAddress} again. This cannot be undone; re-add manually if needed.`,
        confirmText: 'Remove suppression',
        isDangerous: true,
        onConfirm: async (): Promise<void> => {
          setPendingAddress(entry.emailAddress);
          try {
            await removeSuppressionEntry(entry.emailAddress);
            toast(`Removed suppression for ${entry.emailAddress}.`, { variant: 'success' });
            settingsStore.refetch();
          } catch (error: unknown) {
            logClientError(error);
            toast(error instanceof Error ? error.message : 'Failed to remove suppression entry.', {
              variant: 'error',
            });
          } finally {
            setPendingAddress(null);
          }
        },
      });
    },
    [confirm, settingsStore, toast]
  );

  return { ConfirmationModal, handleUnsuppress };
}

export function AdminFilemakerCampaignSuppressionsPage(): React.JSX.Element {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [pendingAddress, setPendingAddress] = useState<string | null>(null);
  const { filteredEntries, reasonCounts, settingsStore, suppressionEntries } =
    useSuppressionRegistryData(query);
  const { ConfirmationModal, handleUnsuppress } = useUnsuppressHandler(
    settingsStore,
    setPendingAddress
  );

  const columns = useMemo<ColumnDef<SuppressionEntry>[]>(
    () => [...BASE_SUPPRESSION_COLUMNS, buildActionColumn({ onUnsuppress: handleUnsuppress, pendingAddress })],
    [handleUnsuppress, pendingAddress]
  );

  return (
    <div className='page-section-compact space-y-6'>
      <PanelHeader
        title='Suppression Registry'
        description='Auto-suppressed addresses from bounces, complaints, unsubscribes, and cold-recipient pruning. Remove entries to re-allow future sends.'
        icon={<ShieldOff className='size-4' />}
        actions={buildFilemakerNavActions(router, 'suppressions')}
      />
      <SuppressionSummaryBar
        entriesCount={suppressionEntries.length}
        onQueryChange={setQuery}
        query={query}
        reasonCounts={reasonCounts}
      />
      <SuppressionRegistryTable
        columns={columns}
        entries={filteredEntries}
        isLoading={settingsStore.isLoading}
        totalEntries={suppressionEntries.length}
      />
      {ConfirmationModal}
    </div>
  );
}
