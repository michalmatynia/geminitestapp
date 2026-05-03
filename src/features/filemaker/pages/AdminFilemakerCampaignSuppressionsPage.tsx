'use client';

import { ShieldOff, UserX } from 'lucide-react';
import { useRouter } from 'nextjs-toploader/app';
import React, { useCallback, useDeferredValue, useMemo, useState } from 'react';

import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { PanelHeader } from '@/shared/ui/templates.public';
import { Button, useToast } from '@/shared/ui/primitives.public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { buildFilemakerNavActions } from '../components/shared/filemaker-nav-actions';
import {
  FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
  parseFilemakerEmailCampaignSuppressionRegistry,
} from '../settings';
import {
  countSuppressionReasons,
  createSuppressionColumns,
  filterSuppressions,
  pruneColdSuppressionEntries,
  removeSuppressionEntry,
  SuppressionRegistryTable,
  SuppressionSummaryBar,
  type SuppressionEntry,
} from './AdminFilemakerCampaignSuppressionsPage.helpers';

type SettingsStore = ReturnType<typeof useSettingsStore>;

function useSuppressionRegistryData(query: string): {
  filteredEntries: SuppressionEntry[];
  reasonCounts: ReturnType<typeof countSuppressionReasons>;
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
  return { filteredEntries, reasonCounts, settingsStore, suppressionEntries: suppressionRegistry.entries };
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

function useColdPruneHandler(settingsStore: SettingsStore): {
  handlePruneColdRecipients: () => Promise<void>;
  isPruningCold: boolean;
} {
  const { toast } = useToast();
  const [isPruningCold, setIsPruningCold] = useState(false);
  const handlePruneColdRecipients = useCallback(async (): Promise<void> => {
    setIsPruningCold(true);
    try {
      const result = await pruneColdSuppressionEntries();
      toast(`Cold prune added ${result.addedCount} suppressions.`, { variant: 'success' });
      settingsStore.refetch();
    } catch (error: unknown) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to run cold-recipient prune.', {
        variant: 'error',
      });
    } finally {
      setIsPruningCold(false);
    }
  }, [settingsStore, toast]);
  return { handlePruneColdRecipients, isPruningCold };
}

export function AdminFilemakerCampaignSuppressionsPage(): React.JSX.Element {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [pendingAddress, setPendingAddress] = useState<string | null>(null);
  const { filteredEntries, reasonCounts, settingsStore, suppressionEntries } =
    useSuppressionRegistryData(query);
  const { ConfirmationModal, handleUnsuppress } = useUnsuppressHandler(settingsStore, setPendingAddress);
  const { handlePruneColdRecipients, isPruningCold } = useColdPruneHandler(settingsStore);
  const columns = useMemo(
    () => createSuppressionColumns(handleUnsuppress, pendingAddress),
    [handleUnsuppress, pendingAddress]
  );

  return (
    <div className='page-section-compact space-y-6'>
      <PanelHeader
        title='Suppression Registry'
        description='Auto-suppressed addresses from bounces, complaints, unsubscribes, and cold-recipient pruning. Remove entries to re-allow future sends.'
        icon={<ShieldOff className='size-4' />}
        actions={buildFilemakerNavActions(router, 'suppressions')}
        customActions={
          <Button
            type='button'
            size='sm'
            variant='outline'
            disabled={isPruningCold}
            onClick={() => { void handlePruneColdRecipients(); }}
          >
            <UserX className='mr-2 size-3.5' />
            {isPruningCold ? 'Pruning...' : 'Run Cold Prune'}
          </Button>
        }
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
