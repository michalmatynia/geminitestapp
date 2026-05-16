'use client';

import { Download, ShieldOff, Upload, UserX } from 'lucide-react';
import { useRouter } from 'nextjs-toploader/app';
import React, { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';

import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { useMutationV2 } from '@/shared/lib/query-factories-v2';
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
  type ColdPruneResponse,
  SuppressionRegistryTable,
  SuppressionSummaryBar,
  type SuppressionEntry,
} from './AdminFilemakerCampaignSuppressionsPage.helpers';

type BulkImportResponse = { addedCount: number; skippedCount: number };

type SettingsStore = ReturnType<typeof useSettingsStore>;

const escapeCsvCell = (value: string): string => {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
};

const SUPPRESSION_CSV_HEADERS = ['emailAddress', 'reason', 'createdAt', 'updatedAt', 'id'];

const LIKELY_HEADER_PATTERNS = /^(email|emailaddress|address|e-mail)$/i;

const parseEmailAddressesFromCsv = (text: string): string[] => {
  const lines = text.split(/\r?\n/);
  const results: string[] = [];
  for (const line of lines) {
    const firstCell = line.split(',')[0] ?? '';
    const cleaned = firstCell.replace(/^"|"$/g, '').trim().toLowerCase();
    if (cleaned.length === 0 || LIKELY_HEADER_PATTERNS.test(cleaned)) continue;
    results.push(cleaned);
  }
  return results;
};

const downloadSuppressionsCsv = (entries: SuppressionEntry[]): void => {
  const rows = entries.map((e) =>
    [e.emailAddress, e.reason, e.createdAt, e.updatedAt, e.id]
      .map((v) => escapeCsvCell(String(v ?? '')))
      .join(',')
  );
  const csv = [SUPPRESSION_CSV_HEADERS.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'campaign-suppressions.csv';
  a.click();
  URL.revokeObjectURL(url);
};

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
  ConfirmationModal: ReturnType<typeof useConfirm>['ConfirmationModal'];
  handleUnsuppress: (entry: SuppressionEntry) => void;
} {
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const removeSuppressionMutation = useMutationV2<void, string>({
    mutationKey: ['filemaker', 'campaign-suppressions', 'remove'],
    mutationFn: async (emailAddress) => removeSuppressionEntry(emailAddress),
    meta: {
      source: 'features.filemaker.pages.AdminFilemakerCampaignSuppressionsPage.removeSuppression',
      operation: 'delete',
      resource: 'filemaker.campaign-suppression',
      domain: 'files',
      description: 'Remove an email address from Filemaker campaign suppressions.',
      errorPresentation: 'toast',
    },
  });
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
            await removeSuppressionMutation.mutateAsync(entry.emailAddress);
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
    [confirm, removeSuppressionMutation, settingsStore, toast]
  );
  return { ConfirmationModal, handleUnsuppress };
}

function useColdPruneHandler(settingsStore: SettingsStore): {
  handlePruneColdRecipients: () => Promise<void>;
  isPruningCold: boolean;
} {
  const { toast } = useToast();
  const pruneColdMutation = useMutationV2<ColdPruneResponse, void>({
    mutationKey: ['filemaker', 'campaign-suppressions', 'prune-cold'],
    mutationFn: async () => pruneColdSuppressionEntries(),
    meta: {
      source: 'features.filemaker.pages.AdminFilemakerCampaignSuppressionsPage.pruneCold',
      operation: 'action',
      resource: 'filemaker.campaign-suppression-cold-prune',
      domain: 'files',
      description: 'Add cold recipients to Filemaker campaign suppressions.',
      errorPresentation: 'toast',
    },
  });
  const handlePruneColdRecipients = useCallback(async (): Promise<void> => {
    try {
      const result = await pruneColdMutation.mutateAsync(undefined);
      toast(`Cold prune added ${result.addedCount} suppressions.`, { variant: 'success' });
      settingsStore.refetch();
    } catch (error: unknown) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to run cold-recipient prune.', {
        variant: 'error',
      });
    }
  }, [pruneColdMutation, settingsStore, toast]);
  return { handlePruneColdRecipients, isPruningCold: pruneColdMutation.isPending };
}

function useBulkImportHandler(settingsStore: SettingsStore): {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleImportClick: () => void;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isImporting: boolean;
} {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bulkImportMutation = useMutationV2<BulkImportResponse, string[]>({
    mutationKey: ['filemaker', 'campaign-suppressions', 'bulk-import'],
    mutationFn: async (emailAddresses) => {
      const response = await fetch('/api/filemaker/campaigns/suppressions', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ emailAddresses }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(payload.error?.message ?? `Import failed (HTTP ${response.status}).`);
      }
      return response.json() as Promise<BulkImportResponse>;
    },
    meta: {
      source: 'features.filemaker.pages.AdminFilemakerCampaignSuppressionsPage.bulkImport',
      operation: 'create',
      resource: 'filemaker.campaign-suppression',
      domain: 'files',
      description: 'Bulk import email suppressions from CSV.',
      errorPresentation: 'toast',
    },
  });

  const handleImportClick = useCallback((): void => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const file = event.target.files?.[0];
      if (file === undefined) return;
      event.target.value = '';
      const reader = new FileReader();
      reader.onload = (e): void => {
        const text = typeof e.target?.result === 'string' ? e.target.result : '';
        const emailAddresses = parseEmailAddressesFromCsv(text);
        if (emailAddresses.length === 0) {
          toast('No valid email addresses found in the CSV file.', { variant: 'error' });
          return;
        }
        bulkImportMutation.mutate(emailAddresses, {
          onSuccess: (data) => {
            toast(
              `Import complete. Added: ${data.addedCount}, already suppressed: ${data.skippedCount}.`,
              { variant: data.addedCount > 0 ? 'success' : 'warning' }
            );
            if (data.addedCount > 0) settingsStore.refetch();
          },
          onError: (error) => {
            toast(error instanceof Error ? error.message : 'Import failed.', { variant: 'error' });
          },
        });
      };
      reader.readAsText(file);
    },
    [bulkImportMutation, settingsStore, toast]
  );

  return { fileInputRef, handleImportClick, handleFileChange, isImporting: bulkImportMutation.isPending };
}

export function AdminFilemakerCampaignSuppressionsPage(): React.JSX.Element {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [pendingAddress, setPendingAddress] = useState<string | null>(null);
  const { filteredEntries, reasonCounts, settingsStore, suppressionEntries } =
    useSuppressionRegistryData(query);
  const { ConfirmationModal, handleUnsuppress } = useUnsuppressHandler(settingsStore, setPendingAddress);
  const { handlePruneColdRecipients, isPruningCold } = useColdPruneHandler(settingsStore);
  const { fileInputRef, handleImportClick, handleFileChange, isImporting } = useBulkImportHandler(settingsStore);
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
          <div className='flex items-center gap-2'>
            <input
              ref={fileInputRef}
              type='file'
              accept='.csv,.txt'
              className='hidden'
              onChange={handleFileChange}
            />
            <Button
              type='button'
              size='sm'
              variant='outline'
              disabled={isImporting}
              onClick={handleImportClick}
            >
              <Upload className='mr-2 size-3.5' />
              {isImporting ? 'Importing...' : 'Import CSV'}
            </Button>
            {suppressionEntries.length > 0 ? (
              <Button
                type='button'
                size='sm'
                variant='outline'
                onClick={() => { downloadSuppressionsCsv(suppressionEntries); }}
              >
                <Download className='mr-2 size-3.5' />
                Export CSV ({suppressionEntries.length})
              </Button>
            ) : null}
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
          </div>
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
      <ConfirmationModal />
    </div>
  );
}
