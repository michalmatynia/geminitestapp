'use client';

import { useMemo, useState, useCallback } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY } from '@/shared/lib/db/database-engine-constants';
import {
  AdminDatabasePageLayout,
  Button,
  StandardDataTablePanel,
  useToast,
  RefreshButton,
  SelectSimple,
  FormField,
  LoadingState,
  CollapsibleSection,
} from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  getControlPanelColumns,
  type UnifiedCollectionRow,
} from '../components/ControlPanelColumns';
import { LogModal } from '../components/LogModal';
import {
  useAllCollectionsSchema,
  useCreateJsonBackupMutation,
  useRestoreJsonBackupMutation,
  useJsonBackups,
} from '../hooks/useDatabaseQueries';

const JSON_BACKUP_PLACEHOLDER_OPTION: LabeledOptionDto<string> = {
  value: '',
  label: '-- Select --',
};

export default function DatabaseControlPanelPage(): React.JSX.Element {
  const { toast } = useToast();
  const schemaQuery = useAllCollectionsSchema();
  const settingsQuery = useSettingsMap();
  const updateSetting = useUpdateSetting();
  const createJsonBackup = useCreateJsonBackupMutation();
  const restoreJsonBackup = useRestoreJsonBackupMutation();
  const jsonBackupsQuery = useJsonBackups();

  const [logModalContent, setLogModalContent] = useState<string | null>(null);
  const [selectedJsonBackup, setSelectedJsonBackup] = useState<string>('');

  // Parse per-collection provider map from settings
  const providerMap = useMemo<Record<string, 'mongodb' | 'redis'>>(() => {
    const raw = settingsQuery.data?.get(DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY);
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, 'mongodb' | 'redis'>;
    } catch (error) {
      logClientError(error);
      return {};
    }
  }, [settingsQuery.data]);

  // Build unified collection rows from the active Mongo-backed schema
  const rows = useMemo<UnifiedCollectionRow[]>(() => {
    const data = schemaQuery.data;
    if (!data) return [];

    return [...data.collections]
      .map((coll): UnifiedCollectionRow => ({
        name: coll.name,
        existsInMongo: true,
        mongoFieldCount: coll.fields.length,
        mongoDocumentCount: coll.documentCount ?? null,
        assignedProvider: providerMap[coll.name] ?? 'auto',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [schemaQuery.data, providerMap]);

  // Handle provider assignment change
  const handleProviderChange = useCallback(
    (collectionName: string, provider: 'mongodb' | 'redis' | 'auto') => {
      const newMap = { ...providerMap };
      if (provider === 'auto') {
        delete newMap[collectionName];
      } else {
        newMap[collectionName] = provider;
      }

      updateSetting.mutate(
        { key: DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY, value: JSON.stringify(newMap) },
        {
          onSuccess: () => toast('Provider assignment saved.', { variant: 'success' }),
          onError: (error: Error) => {
            logClientError(error, {
              context: { source: 'ControlPanel', action: 'updateProviderMap' },
            });
            toast('Failed to save provider assignment.', { variant: 'error' });
          },
        }
      );
    },
    [providerMap, updateSetting, toast]
  );

  // JSON backup handlers
  const handleCreateJsonBackup = useCallback(async () => {
    try {
      const result = await createJsonBackup.mutateAsync();
      setLogModalContent(result.log ?? result.message ?? 'Backup created');
    } catch (error: unknown) {
      logClientError(error);
      logClientError(error, { context: { source: 'ControlPanel', action: 'createJsonBackup' } });
      toast('Failed to create JSON backup.', { variant: 'error' });
    }
  }, [createJsonBackup, toast]);

  const handleRestoreJsonBackup = useCallback(async () => {
    if (!selectedJsonBackup) return;

    try {
      const result = await restoreJsonBackup.mutateAsync(selectedJsonBackup);
      setLogModalContent(result.log ?? result.message ?? 'Backup restored');
    } catch (error: unknown) {
      logClientError(error);
      logClientError(error, {
        context: {
          source: 'ControlPanel',
          action: 'restoreJsonBackup',
          backupName: selectedJsonBackup,
        },
      });
      toast('Failed to restore JSON backup.', { variant: 'error' });
    }
  }, [selectedJsonBackup, restoreJsonBackup, toast]);

  const columns = useMemo(
    () =>
      getControlPanelColumns({
        onProviderChange: handleProviderChange,
      }),
    [handleProviderChange]
  );

  const jsonBackups = jsonBackupsQuery.data?.backups ?? [];
  const jsonBackupOptions = useMemo(
    (): Array<LabeledOptionDto<string>> => [
      JSON_BACKUP_PLACEHOLDER_OPTION,
      ...jsonBackups.map((name: string) => ({ value: name, label: name })),
    ],
    [jsonBackups]
  );

  return (
    <AdminDatabasePageLayout
      title='Database Control Panel'
      current='Control Panel'
      description='Review MongoDB collection metadata, assign per-collection routing, and manage JSON backups for the active document store.'
    >
      {logModalContent !== null && (
        <LogModal
          isOpen={true}
          item={logModalContent}
          onClose={(): void => setLogModalContent(null)}
        />
      )}

      {/* Collections Table */}
      <StandardDataTablePanel
        title='Collections'
        headerActions={
          <RefreshButton
            onRefresh={(): void => {
              void schemaQuery.refetch();
            }}
            isRefreshing={schemaQuery.isFetching}
          />
        }
        columns={columns}
        data={rows}
        isLoading={schemaQuery.isLoading}
        initialSorting={[{ id: 'name', desc: false }]}
        sortingStorageKey='stardb:control-panel:sorting'
        variant='flat'
        emptyState={
          schemaQuery.isError ? (
            <p className='py-4 text-center text-red-300 text-sm'>
              {schemaQuery.error?.message ?? 'Failed to load collections.'}
            </p>
          ) : undefined
        }
      />

      {/* JSON Backup & Restore */}
      <CollapsibleSection
        title='JSON Backup & Restore'
        description='Export and restore MongoDB-backed collections as JSON without external database tools.'
        variant='default'
        className='mt-6'
      >
        <div className='mt-4 flex flex-wrap items-end gap-4'>
          <Button
            onClick={(): void => {
              void handleCreateJsonBackup();
            }}
            disabled={createJsonBackup.isPending}
          >
            {createJsonBackup.isPending ? 'Creating...' : 'Create JSON Backup'}
          </Button>

          <div className='flex items-end gap-2'>
            <FormField label='Select backup to restore'>
              <SelectSimple
                size='sm'
                value={selectedJsonBackup}
                onValueChange={setSelectedJsonBackup}
                options={jsonBackupOptions}
                triggerClassName='w-[200px]'
               ariaLabel='Select backup to restore' title='Select backup to restore'/>
            </FormField>
            <Button
              variant='outline'
              onClick={(): void => {
                void handleRestoreJsonBackup();
              }}
              disabled={!selectedJsonBackup || restoreJsonBackup.isPending}
              className='h-9'
            >
              {restoreJsonBackup.isPending ? 'Restoring...' : 'Restore'}
            </Button>
          </div>
        </div>

        {jsonBackupsQuery.isLoading && (
          <LoadingState message='Loading backups...' className='mt-3' size='sm' />
        )}
      </CollapsibleSection>
    </AdminDatabasePageLayout>
  );
}
