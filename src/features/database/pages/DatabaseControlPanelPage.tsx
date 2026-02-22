'use client';

import { useMemo, useState, useCallback } from 'react';

import { logClientError } from '@/features/observability';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY } from '@/shared/lib/db/database-engine-constants';
import {
  PageLayout,
  Button,
  StandardDataTablePanel,
  useToast,
  RefreshButton,
  SelectSimple,
  FormField,
  Alert,
  LoadingState,
  CollapsibleSection,
} from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';

import {
  getControlPanelColumns,
  type UnifiedCollectionRow,
} from '../components/ControlPanelColumns';
import { LogModal } from '../components/LogModal';
import {
  useAllCollectionsSchema,
  useCopyCollectionMutation,
  useCreateJsonBackupMutation,
  useRestoreJsonBackupMutation,
  useJsonBackups,
} from '../hooks/useDatabaseQueries';

type CopyAction = {
  collection: string;
  direction: 'mongo_to_prisma' | 'prisma_to_mongo';
  label: string;
};

export default function DatabaseControlPanelPage(): React.JSX.Element {
  const { toast } = useToast();
  const schemaQuery = useAllCollectionsSchema();
  const settingsQuery = useSettingsMap();
  const updateSetting = useUpdateSetting();
  const copyMutation = useCopyCollectionMutation();
  const createJsonBackup = useCreateJsonBackupMutation();
  const restoreJsonBackup = useRestoreJsonBackupMutation();
  const jsonBackupsQuery = useJsonBackups();

  const [pendingCopy, setPendingCopy] = useState<CopyAction | null>(null);
  const [logModalContent, setLogModalContent] = useState<string | null>(null);
  const [selectedJsonBackup, setSelectedJsonBackup] = useState<string>('');

  // Parse per-collection provider map from settings
  const providerMap = useMemo<Record<string, 'mongodb' | 'prisma'>>(() => {
    const raw = settingsQuery.data?.get(DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY);
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, 'mongodb' | 'prisma'>;
    } catch {
      return {};
    }
  }, [settingsQuery.data]);

  // Build unified collection rows from both providers' schemas
  const rows = useMemo<UnifiedCollectionRow[]>(() => {
    const data = schemaQuery.data;
    if (!data) return [];

    const byName = new Map<string, UnifiedCollectionRow>();

    for (const coll of data.collections) {
      const existing = byName.get(coll.name);
      if (coll.provider === 'mongodb') {
        if (existing) {
          existing.existsInMongo = true;
          existing.mongoFieldCount = coll.fields.length;
          existing.mongoDocumentCount = coll.documentCount ?? null;
        } else {
          byName.set(coll.name, {
            name: coll.name,
            existsInMongo: true,
            existsInPrisma: false,
            mongoFieldCount: coll.fields.length,
            prismaFieldCount: null,
            mongoDocumentCount: coll.documentCount ?? null,
            prismaRowCount: null,
            assignedProvider: providerMap[coll.name] ?? 'auto',
          });
        }
      } else if (coll.provider === 'prisma') {
        if (existing) {
          existing.existsInPrisma = true;
          existing.prismaFieldCount = coll.fields.length;
          existing.prismaRowCount = coll.documentCount ?? null;
        } else {
          byName.set(coll.name, {
            name: coll.name,
            existsInMongo: false,
            existsInPrisma: true,
            mongoFieldCount: null,
            prismaFieldCount: coll.fields.length,
            mongoDocumentCount: null,
            prismaRowCount: coll.documentCount ?? null,
            assignedProvider: providerMap[coll.name] ?? 'auto',
          });
        }
      }
    }

    return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [schemaQuery.data, providerMap]);

  // Handle provider assignment change
  const handleProviderChange = useCallback(
    (collectionName: string, provider: 'mongodb' | 'prisma' | 'auto') => {
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
            logClientError(error, { context: { source: 'ControlPanel', action: 'updateProviderMap' } });
            toast('Failed to save provider assignment.', { variant: 'error' });
          },
        }
      );
    },
    [providerMap, updateSetting, toast]
  );

  // Copy handlers
  const handleCopyToMongo = useCallback((name: string) => {
    setPendingCopy({ collection: name, direction: 'prisma_to_mongo', label: 'Prisma → MongoDB' });
  }, []);

  const handleCopyToPrisma = useCallback((name: string) => {
    setPendingCopy({ collection: name, direction: 'mongo_to_prisma', label: 'MongoDB → Prisma' });
  }, []);

  const handleConfirmCopy = useCallback(async () => {
    if (!pendingCopy) return;
    setPendingCopy(null);

    try {
      const result = await copyMutation.mutateAsync({
        collection: pendingCopy.collection,
        direction: pendingCopy.direction,
      });

      if (result.status === 'completed') {
        const msg = `Copied ${result.sourceCount} items. Inserted: ${result.targetInserted}, Deleted: ${result.targetDeleted}`;
        toast(msg, { variant: 'success' });
      } else if (result.status === 'skipped') {
        toast(`Collection "${pendingCopy.collection}" was skipped: ${result.warnings?.join(', ') ?? 'unknown reason'}`, { variant: 'warning' });
      } else {
        toast(`Copy failed: ${result.error ?? 'Unknown error'}`, { variant: 'error' });
      }
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'ControlPanel', action: 'copyCollection', ...pendingCopy } });
      toast('An error occurred during copy.', { variant: 'error' });
    }
  }, [pendingCopy, copyMutation, toast]);

  // JSON backup handlers
  const handleCreateJsonBackup = useCallback(async () => {
    try {
      const result = await createJsonBackup.mutateAsync();
      setLogModalContent(result.log ?? result.message ?? 'Backup created');
    } catch (error: unknown) {
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
      logClientError(error, { context: { source: 'ControlPanel', action: 'restoreJsonBackup', backupName: selectedJsonBackup } });
      toast('Failed to restore JSON backup.', { variant: 'error' });
    }
  }, [selectedJsonBackup, restoreJsonBackup, toast]);

  const columns = useMemo(
    () =>
      getControlPanelColumns({
        onCopyToMongo: handleCopyToMongo,
        onCopyToPrisma: handleCopyToPrisma,
        onProviderChange: handleProviderChange,
      }),
    [handleCopyToMongo, handleCopyToPrisma, handleProviderChange]
  );

  const jsonBackups = jsonBackupsQuery.data?.backups ?? [];

  return (
    <PageLayout
      title='Database Control Panel'
      description='View and manage collections across MongoDB and PostgreSQL. Copy data between providers and assign per-collection provider routing.'
    >
      {logModalContent !== null && (
        <LogModal
          isOpen={true}
          item={logModalContent}
          onClose={(): void => setLogModalContent(null)}
        />
      )}

      <ConfirmModal
        isOpen={!!pendingCopy}
        onClose={() => setPendingCopy(null)}
        onConfirm={handleConfirmCopy}
        title='Copy Collection'
        message={
          pendingCopy
            ? `Copy "${pendingCopy.collection}" (${pendingCopy.label})? This will overwrite the target collection.`
            : ''
        }
        confirmText='Copy'
        isDangerous={true}
      />

      {/* Collections Table */}
      <StandardDataTablePanel
        title='Collections'
        headerActions={(
          <RefreshButton
            onRefresh={(): void => { void schemaQuery.refetch(); }}
            isRefreshing={schemaQuery.isFetching}
          />
        )}
        columns={columns}
        data={rows}
        isLoading={schemaQuery.isLoading}
        initialSorting={[{ id: 'name', desc: false }]}
        sortingStorageKey='stardb:control-panel:sorting'
        variant='flat'
        alerts={
          copyMutation.isPending && (
            <Alert variant='info' className='mb-3 px-3 py-2 text-xs'>
              Copying collection... This may take a moment.
            </Alert>
          )
        }
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
        title='JSON Backup & Restore (Prisma)'
        description='Export all Prisma tables as JSON. No external tools (pg_dump) required.'
        variant='default'
        className='mt-6'
      >
        <div className='mt-4 flex flex-wrap items-end gap-4'>
          <Button
            onClick={(): void => { void handleCreateJsonBackup(); }}
            disabled={createJsonBackup.isPending}
          >
            {createJsonBackup.isPending ? 'Creating...' : 'Create JSON Backup'}
          </Button>

          <div className='flex items-end gap-2'>
            <FormField label='Select backup to restore'>
              <SelectSimple size='sm'
                value={selectedJsonBackup}
                onValueChange={setSelectedJsonBackup}
                options={[
                  { value: '', label: '-- Select --' },
                  ...jsonBackups.map((name: string) => ({ value: name, label: name }))
                ]}
                triggerClassName='w-[200px]'
              />
            </FormField>
            <Button
              variant='outline'
              onClick={(): void => { void handleRestoreJsonBackup(); }}
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
    </PageLayout>
  );
}
