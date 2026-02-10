'use client';

import { AlertTriangleIcon, DatabaseIcon, HardDriveIcon, RefreshCcwIcon, SaveIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';


import { logClientError } from '@/features/observability';
import { useSettingsMap, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import {
  DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY,
  DATABASE_ENGINE_POLICY_KEY,
  DATABASE_ENGINE_SERVICE_ROUTE_MAP_KEY,
  DEFAULT_DATABASE_ENGINE_POLICY,
  type DatabaseEnginePolicy,
  type DatabaseEngineProvider,
  type DatabaseEngineServiceRoute,
} from '@/shared/lib/db/database-engine-constants';
import { AdminPageLayout, Button, ConfirmDialog, SectionPanel, useToast } from '@/shared/ui';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import { useCopyCollectionMutation, useAllCollectionsSchema, useRedisOverview } from '../hooks/useDatabaseQueries';
import { useSettingsBackfillMutation, useSyncDatabaseMutation } from '../hooks/useDatabaseSettings';

type SyncDirection = 'mongo_to_prisma' | 'prisma_to_mongo';

type PendingCollectionSync = {
  collection: string;
  direction: SyncDirection;
  label: string;
};

type CollectionRow = {
  name: string;
  mongoDocumentCount: number | null;
  prismaRowCount: number | null;
  existsInMongo: boolean;
  existsInPrisma: boolean;
};

const services: DatabaseEngineServiceRoute[] = [
  'app',
  'auth',
  'product',
  'integrations',
  'cms',
];

const serviceLabels: Record<DatabaseEngineServiceRoute, string> = {
  app: 'App',
  auth: 'Auth',
  product: 'Product',
  integrations: 'Integrations',
  cms: 'CMS',
};

const parseServiceRouteMap = (
  raw: string | undefined
): Partial<Record<DatabaseEngineServiceRoute, DatabaseEngineProvider>> => {
  const parsed = parseJsonSetting<Record<string, unknown>>(raw, {});
  const result: Partial<Record<DatabaseEngineServiceRoute, DatabaseEngineProvider>> = {};
  for (const service of services) {
    const value = parsed[service];
    if (value === 'mongodb' || value === 'prisma' || value === 'redis') {
      result[service] = value;
    }
  }
  return result;
};

const parseCollectionRouteMap = (raw: string | undefined): Record<string, DatabaseEngineProvider> => {
  const parsed = parseJsonSetting<Record<string, unknown>>(raw, {});
  const result: Record<string, DatabaseEngineProvider> = {};
  for (const [collection, provider] of Object.entries(parsed)) {
    if (provider === 'mongodb' || provider === 'prisma' || provider === 'redis') {
      result[collection] = provider;
    }
  }
  return result;
};

const parseEnginePolicy = (raw: string | undefined): DatabaseEnginePolicy =>
  parseJsonSetting<DatabaseEnginePolicy>(raw, DEFAULT_DATABASE_ENGINE_POLICY);

export default function DatabaseEnginePage(): React.JSX.Element {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap({ scope: 'all' });
  const updateSettingsBulk = useUpdateSettingsBulk();

  const schemaQuery = useAllCollectionsSchema();
  const redisQuery = useRedisOverview(400);
  const syncDatabaseMutation = useSyncDatabaseMutation();
  const backfillMutation = useSettingsBackfillMutation();
  const copyCollectionMutation = useCopyCollectionMutation();

  const [backfillLimit, setBackfillLimit] = useState(500);
  const [pendingSyncDirection, setPendingSyncDirection] = useState<SyncDirection | null>(null);
  const [pendingCollectionSync, setPendingCollectionSync] = useState<PendingCollectionSync | null>(null);

  const policyFromSettings = useMemo<DatabaseEnginePolicy>(() => {
    const raw = settingsQuery.data?.get(DATABASE_ENGINE_POLICY_KEY);
    return parseEnginePolicy(raw);
  }, [settingsQuery.data]);

  const serviceRouteMapFromSettings = useMemo<
    Partial<Record<DatabaseEngineServiceRoute, DatabaseEngineProvider>>
  >(() => {
    const raw = settingsQuery.data?.get(DATABASE_ENGINE_SERVICE_ROUTE_MAP_KEY);
    return parseServiceRouteMap(raw);
  }, [settingsQuery.data]);

  const collectionRouteMapFromSettings = useMemo<Record<string, DatabaseEngineProvider>>(() => {
    const raw = settingsQuery.data?.get(DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY);
    return parseCollectionRouteMap(raw);
  }, [settingsQuery.data]);

  const [policyDraft, setPolicyDraft] = useState<DatabaseEnginePolicy>(policyFromSettings);
  const [serviceRouteMapDraft, setServiceRouteMapDraft] = useState<
    Partial<Record<DatabaseEngineServiceRoute, DatabaseEngineProvider>>
  >(serviceRouteMapFromSettings);
  const [collectionRouteMapDraft, setCollectionRouteMapDraft] = useState<
    Record<string, DatabaseEngineProvider>
  >(collectionRouteMapFromSettings);

  useEffect(() => {
    setPolicyDraft(policyFromSettings);
  }, [policyFromSettings]);

  useEffect(() => {
    setServiceRouteMapDraft(serviceRouteMapFromSettings);
  }, [serviceRouteMapFromSettings]);

  useEffect(() => {
    setCollectionRouteMapDraft(collectionRouteMapFromSettings);
  }, [collectionRouteMapFromSettings]);

  const rows = useMemo<CollectionRow[]>(() => {
    const data = schemaQuery.data;
    if (!data) return [];

    const byName = new Map<string, CollectionRow>();
    data.collections.forEach((collection) => {
      const existing = byName.get(collection.name);
      if (collection.provider === 'mongodb') {
        if (existing) {
          existing.existsInMongo = true;
          existing.mongoDocumentCount = collection.documentCount ?? null;
          return;
        }
        byName.set(collection.name, {
          name: collection.name,
          existsInMongo: true,
          existsInPrisma: false,
          mongoDocumentCount: collection.documentCount ?? null,
          prismaRowCount: null,
        });
        return;
      }

      if (existing) {
        existing.existsInPrisma = true;
        existing.prismaRowCount = collection.documentCount ?? null;
        return;
      }
      byName.set(collection.name, {
        name: collection.name,
        existsInMongo: false,
        existsInPrisma: true,
        mongoDocumentCount: null,
        prismaRowCount: collection.documentCount ?? null,
      });
    });

    return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [schemaQuery.data]);

  const mongoCollections = useMemo(() => rows.filter((row) => row.existsInMongo), [rows]);
  const prismaCollections = useMemo(() => rows.filter((row) => row.existsInPrisma), [rows]);

  const applyManualOnlyTemplate = (): void => {
    setPolicyDraft({
      requireExplicitServiceRouting: true,
      requireExplicitCollectionRouting: true,
      allowAutomaticFallback: false,
      allowAutomaticBackfill: false,
      allowAutomaticMigrations: false,
      strictProviderAvailability: true,
    });
  };

  const saveEngineConfiguration = useCallback(async (): Promise<void> => {
    const normalizedServiceMap: Partial<Record<DatabaseEngineServiceRoute, DatabaseEngineProvider>> = {};
    services.forEach((service) => {
      const value = serviceRouteMapDraft[service];
      if (value === 'mongodb' || value === 'prisma') {
        normalizedServiceMap[service] = value;
      }
    });

    try {
      await updateSettingsBulk.mutateAsync([
        {
          key: DATABASE_ENGINE_POLICY_KEY,
          value: JSON.stringify(policyDraft),
        },
        {
          key: DATABASE_ENGINE_SERVICE_ROUTE_MAP_KEY,
          value: JSON.stringify(normalizedServiceMap),
        },
        {
          key: DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY,
          value: JSON.stringify(collectionRouteMapDraft),
        },
      ]);
      toast('Database Engine configuration saved.', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'DatabaseEnginePage', action: 'saveEngineConfiguration' } });
      toast('Failed to save Database Engine configuration.', { variant: 'error' });
    }
  }, [collectionRouteMapDraft, policyDraft, serviceRouteMapDraft, toast, updateSettingsBulk]);

  const runDatabaseSync = useCallback(
    async (direction: SyncDirection): Promise<void> => {
      setPendingSyncDirection(null);
      try {
        await syncDatabaseMutation.mutateAsync(direction);
        toast(`Database sync queued (${direction}).`, { variant: 'success' });
      } catch (error: unknown) {
        logClientError(error, { context: { source: 'DatabaseEnginePage', action: 'runDatabaseSync', direction } });
        toast('Failed to enqueue database sync.', { variant: 'error' });
      }
    },
    [syncDatabaseMutation, toast]
  );

  const runBackfill = useCallback(
    async (dryRun: boolean): Promise<void> => {
      try {
        const result = await backfillMutation.mutateAsync({
          dryRun,
          limit: backfillLimit,
        });
        toast(
          dryRun
            ? `Backfill dry run complete. Matched: ${result.matched}, Remaining: ${result.remaining}`
            : `Backfill complete. Modified: ${result.modified}, Remaining: ${result.remaining}`,
          { variant: 'success' }
        );
      } catch (error: unknown) {
        logClientError(error, { context: { source: 'DatabaseEnginePage', action: 'runBackfill', dryRun, backfillLimit } });
        toast('Backfill failed.', { variant: 'error' });
      }
    },
    [backfillLimit, backfillMutation, toast]
  );

  const confirmCollectionSync = useCallback(async (): Promise<void> => {
    if (!pendingCollectionSync) return;
    const action = pendingCollectionSync;
    setPendingCollectionSync(null);
    try {
      await copyCollectionMutation.mutateAsync({
        collection: action.collection,
        direction: action.direction,
      });
      toast(`Collection sync complete: ${action.label}`, { variant: 'success' });
      void schemaQuery.refetch();
    } catch (error: unknown) {
      logClientError(error, {
        context: {
          source: 'DatabaseEnginePage',
          action: 'confirmCollectionSync',
          collection: action.collection,
          direction: action.direction,
        },
      });
      toast('Collection sync failed.', { variant: 'error' });
    }
  }, [copyCollectionMutation, pendingCollectionSync, schemaQuery, toast]);

  const refreshAll = (): void => {
    void Promise.all([
      settingsQuery.refetch(),
      schemaQuery.refetch(),
      redisQuery.refetch(),
    ]);
  };

  const strictModeEnabled = useMemo(
    () =>
      policyDraft.requireExplicitServiceRouting &&
      policyDraft.requireExplicitCollectionRouting &&
      !policyDraft.allowAutomaticFallback &&
      !policyDraft.allowAutomaticBackfill &&
      !policyDraft.allowAutomaticMigrations &&
      policyDraft.strictProviderAvailability,
    [policyDraft]
  );

  return (
    <AdminPageLayout
      title='Database Engine'
      description='Manual control center for provider routing, migrations, synchronisation, backfilling, and fallback behavior across MongoDB, Prisma, and Redis.'
      mainActions={
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            onClick={refreshAll}
            disabled={settingsQuery.isFetching || schemaQuery.isFetching || redisQuery.isFetching}
          >
            <RefreshCcwIcon className='mr-2 size-4' />
            Refresh
          </Button>
          <Button
            onClick={(): void => {
              void saveEngineConfiguration();
            }}
            disabled={updateSettingsBulk.isPending}
          >
            <SaveIcon className='mr-2 size-4' />
            {updateSettingsBulk.isPending ? 'Saving...' : 'Save Engine Config'}
          </Button>
        </div>
      }
    >
      <ConfirmDialog
        open={pendingSyncDirection !== null}
        onOpenChange={(open: boolean) => !open && setPendingSyncDirection(null)}
        title='Run Full Database Sync'
        description={
          pendingSyncDirection
            ? `Run full database sync (${pendingSyncDirection})? This can overwrite target data.`
            : ''
        }
        confirmText='Run Sync'
        variant='destructive'
        onConfirm={(): void => {
          if (!pendingSyncDirection) return;
          void runDatabaseSync(pendingSyncDirection);
        }}
      />

      <ConfirmDialog
        open={pendingCollectionSync !== null}
        onOpenChange={(open: boolean) => !open && setPendingCollectionSync(null)}
        title='Sync Collection'
        description={
          pendingCollectionSync
            ? `Sync collection "${pendingCollectionSync.collection}" (${pendingCollectionSync.label})? Target data will be replaced.`
            : ''
        }
        confirmText='Sync'
        variant='destructive'
        onConfirm={(): void => {
          void confirmCollectionSync();
        }}
      />

      <SectionPanel className='p-5'>
        <div className='flex items-start justify-between gap-4'>
          <div>
            <h2 className='text-lg font-semibold text-white'>Policy Mode</h2>
            <p className='mt-1 text-sm text-gray-400'>
              Define whether fallback, backfill, and migrations are automatic or strictly manual.
            </p>
          </div>
          <Button variant='outline' onClick={applyManualOnlyTemplate}>
            Apply Manual-Only Template
          </Button>
        </div>
        <div className='mt-4 grid gap-3 md:grid-cols-2'>
          <label className='flex items-center gap-2 text-sm text-gray-200'>
            <input
              type='checkbox'
              checked={policyDraft.requireExplicitServiceRouting}
              onChange={(event): void =>
                setPolicyDraft((prev) => ({
                  ...prev,
                  requireExplicitServiceRouting: event.target.checked,
                }))
              }
            />
            Require explicit service routing
          </label>
          <label className='flex items-center gap-2 text-sm text-gray-200'>
            <input
              type='checkbox'
              checked={policyDraft.requireExplicitCollectionRouting}
              onChange={(event): void =>
                setPolicyDraft((prev) => ({
                  ...prev,
                  requireExplicitCollectionRouting: event.target.checked,
                }))
              }
            />
            Require explicit collection routing
          </label>
          <label className='flex items-center gap-2 text-sm text-gray-200'>
            <input
              type='checkbox'
              checked={policyDraft.allowAutomaticFallback}
              onChange={(event): void =>
                setPolicyDraft((prev) => ({
                  ...prev,
                  allowAutomaticFallback: event.target.checked,
                }))
              }
            />
            Allow automatic fallback
          </label>
          <label className='flex items-center gap-2 text-sm text-gray-200'>
            <input
              type='checkbox'
              checked={policyDraft.allowAutomaticBackfill}
              onChange={(event): void =>
                setPolicyDraft((prev) => ({
                  ...prev,
                  allowAutomaticBackfill: event.target.checked,
                }))
              }
            />
            Allow automatic backfill
          </label>
          <label className='flex items-center gap-2 text-sm text-gray-200'>
            <input
              type='checkbox'
              checked={policyDraft.allowAutomaticMigrations}
              onChange={(event): void =>
                setPolicyDraft((prev) => ({
                  ...prev,
                  allowAutomaticMigrations: event.target.checked,
                }))
              }
            />
            Allow automatic migrations
          </label>
          <label className='flex items-center gap-2 text-sm text-gray-200'>
            <input
              type='checkbox'
              checked={policyDraft.strictProviderAvailability}
              onChange={(event): void =>
                setPolicyDraft((prev) => ({
                  ...prev,
                  strictProviderAvailability: event.target.checked,
                }))
              }
            />
            Enforce provider availability (throw on missing env)
          </label>
        </div>

        <div
          className={`mt-4 rounded-md border p-3 text-sm ${
            strictModeEnabled
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-100'
          }`}
        >
          {strictModeEnabled
            ? 'Manual-only strict mode is active in the draft.'
            : 'Strict manual-only mode is not fully active. Use "Apply Manual-Only Template" for no automatic fallback/backfill/migration.'}
        </div>
      </SectionPanel>

      <div className='mt-6 grid gap-4 lg:grid-cols-3'>
        <SectionPanel className='p-5'>
          <div className='flex items-center gap-2'>
            <DatabaseIcon className='size-4 text-emerald-300' />
            <h3 className='text-base font-semibold text-white'>
              MongoDB Collections ({mongoCollections.length})
            </h3>
          </div>
          <div className='mt-3 max-h-72 space-y-1 overflow-auto text-xs'>
            {mongoCollections.length === 0 && (
              <p className='text-gray-500'>No MongoDB collections detected.</p>
            )}
            {mongoCollections.map((row) => (
              <div key={row.name} className='flex items-center justify-between rounded border border-gray-800/80 bg-black/20 px-2 py-1'>
                <span className='font-mono text-gray-200'>{row.name}</span>
                <span className='text-gray-400'>
                  {row.mongoDocumentCount === null ? '?' : row.mongoDocumentCount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </SectionPanel>

        <SectionPanel className='p-5'>
          <div className='flex items-center gap-2'>
            <DatabaseIcon className='size-4 text-blue-300' />
            <h3 className='text-base font-semibold text-white'>
              Prisma Collections ({prismaCollections.length})
            </h3>
          </div>
          <div className='mt-3 max-h-72 space-y-1 overflow-auto text-xs'>
            {prismaCollections.length === 0 && (
              <p className='text-gray-500'>No Prisma collections detected.</p>
            )}
            {prismaCollections.map((row) => (
              <div key={row.name} className='flex items-center justify-between rounded border border-gray-800/80 bg-black/20 px-2 py-1'>
                <span className='font-mono text-gray-200'>{row.name}</span>
                <span className='text-gray-400'>
                  {row.prismaRowCount === null ? '?' : row.prismaRowCount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </SectionPanel>

        <SectionPanel className='p-5'>
          <div className='flex items-center gap-2'>
            <HardDriveIcon className='size-4 text-orange-300' />
            <h3 className='text-base font-semibold text-white'>Redis</h3>
          </div>
          <div className='mt-3 text-xs text-gray-300'>
            <div>Status: {redisQuery.data?.enabled ? (redisQuery.data.connected ? 'Connected' : 'Disconnected') : 'Disabled'}</div>
            <div>DB Size: {redisQuery.data?.dbSize ?? 0}</div>
            <div>Used Memory: {redisQuery.data?.usedMemory ?? 'n/a'}</div>
            <div>Max Memory: {redisQuery.data?.maxMemory ?? 'n/a'}</div>
          </div>
          <div className='mt-3 max-h-56 space-y-1 overflow-auto text-xs'>
            {(redisQuery.data?.namespaces ?? []).length === 0 && (
              <p className='text-gray-500'>No Redis namespaces detected.</p>
            )}
            {(redisQuery.data?.namespaces ?? []).map((item) => (
              <div key={item.namespace} className='flex items-center justify-between rounded border border-gray-800/80 bg-black/20 px-2 py-1'>
                <span className='font-mono text-gray-200'>{item.namespace}</span>
                <span className='text-gray-400'>{item.keyCount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </SectionPanel>
      </div>

      <SectionPanel className='mt-6 p-5'>
        <h2 className='text-lg font-semibold text-white'>Service Routing</h2>
        <p className='mt-1 text-sm text-gray-400'>
          Route each application service to a primary data provider.
        </p>
        <div className='mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5'>
          {services.map((service) => (
            <div key={service}>
              <label className='mb-1 block text-xs text-gray-400'>{serviceLabels[service]}</label>
              <select
                value={
                  serviceRouteMapDraft[service] === 'mongodb' ||
                  serviceRouteMapDraft[service] === 'prisma'
                    ? serviceRouteMapDraft[service]
                    : ''
                }
                onChange={(event): void => {
                  const value = event.target.value;
                  setServiceRouteMapDraft((prev) => {
                    const next = { ...prev };
                    if (value === 'mongodb' || value === 'prisma') {
                      next[service] = value;
                    } else {
                      delete next[service];
                    }
                    return next;
                  });
                }}
                className='w-full rounded-md border border-gray-700 bg-gray-900 px-2 py-2 text-xs text-gray-200'
              >
                <option value=''>Inherit/Unset</option>
                <option value='mongodb'>MongoDB</option>
                <option value='prisma'>Prisma</option>
              </select>
            </div>
          ))}
        </div>
      </SectionPanel>

      <SectionPanel className='mt-6 p-5'>
        <h2 className='text-lg font-semibold text-white'>Collection Routing and Sync</h2>
        <p className='mt-1 text-sm text-gray-400'>
          Assign collection-level providers and run manual collection sync operations.
        </p>
        <div className='mt-4 overflow-auto'>
          <table className='min-w-full text-xs'>
            <thead>
              <tr className='border-b border-gray-800 text-left text-gray-400'>
                <th className='px-2 py-2'>Collection</th>
                <th className='px-2 py-2'>MongoDB</th>
                <th className='px-2 py-2'>Prisma</th>
                <th className='px-2 py-2'>Assigned Provider</th>
                <th className='px-2 py-2'>Manual Sync</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name} className='border-b border-gray-900'>
                  <td className='px-2 py-2 font-mono text-gray-100'>{row.name}</td>
                  <td className='px-2 py-2 text-gray-300'>
                    {row.existsInMongo
                      ? (row.mongoDocumentCount ?? 0).toLocaleString()
                      : '--'}
                  </td>
                  <td className='px-2 py-2 text-gray-300'>
                    {row.existsInPrisma
                      ? (row.prismaRowCount ?? 0).toLocaleString()
                      : '--'}
                  </td>
                  <td className='px-2 py-2'>
                    <select
                      value={collectionRouteMapDraft[row.name] ?? 'auto'}
                      onChange={(event): void => {
                        const value = event.target.value;
                        setCollectionRouteMapDraft((prev) => {
                          const next = { ...prev };
                          if (value === 'mongodb' || value === 'prisma' || value === 'redis') {
                            next[row.name] = value;
                          } else {
                            delete next[row.name];
                          }
                          return next;
                        });
                      }}
                      className='rounded-md border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200'
                    >
                      <option value='auto'>Auto</option>
                      <option value='mongodb'>MongoDB</option>
                      <option value='prisma'>Prisma</option>
                      <option value='redis'>Redis</option>
                    </select>
                  </td>
                  <td className='px-2 py-2'>
                    <div className='flex gap-1'>
                      <Button
                        variant='outline'
                        size='sm'
                        disabled={!row.existsInMongo}
                        onClick={(): void => {
                          setPendingCollectionSync({
                            collection: row.name,
                            direction: 'mongo_to_prisma',
                            label: 'MongoDB to Prisma',
                          });
                        }}
                      >
                        M to P
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        disabled={!row.existsInPrisma}
                        onClick={(): void => {
                          setPendingCollectionSync({
                            collection: row.name,
                            direction: 'prisma_to_mongo',
                            label: 'Prisma to MongoDB',
                          });
                        }}
                      >
                        P to M
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>

      <SectionPanel className='mt-6 p-5'>
        <h2 className='text-lg font-semibold text-white'>Migration and Backfill Controls</h2>
        <p className='mt-1 text-sm text-gray-400'>
          Manual-only controls for full database sync and settings backfill.
        </p>
        <div className='mt-4 flex flex-wrap items-center gap-2'>
          <Button
            variant='outline'
            className='border-red-500/40 text-red-100 hover:bg-red-500/20'
            onClick={(): void => setPendingSyncDirection('mongo_to_prisma')}
          >
            Run Full Sync: MongoDB to Prisma
          </Button>
          <Button
            variant='outline'
            className='border-red-500/40 text-red-100 hover:bg-red-500/20'
            onClick={(): void => setPendingSyncDirection('prisma_to_mongo')}
          >
            Run Full Sync: Prisma to MongoDB
          </Button>
        </div>

        <div className='mt-5 flex flex-wrap items-end gap-2'>
          <div>
            <label htmlFor='backfill-limit' className='mb-1 block text-xs text-gray-400'>
              Backfill Batch Size
            </label>
            <input
              id='backfill-limit'
              type='number'
              min={1}
              max={5000}
              value={backfillLimit}
              onChange={(event): void => {
                const parsed = Number.parseInt(event.target.value, 10);
                if (!Number.isFinite(parsed)) return;
                setBackfillLimit(Math.min(Math.max(parsed, 1), 5000));
              }}
              className='w-36 rounded-md border border-gray-700 bg-gray-900 px-2 py-2 text-xs text-gray-200'
            />
          </div>
          <Button
            variant='outline'
            onClick={(): void => {
              void runBackfill(true);
            }}
            disabled={backfillMutation.isPending}
          >
            Dry Run Backfill
          </Button>
          <Button
            variant='outline'
            onClick={(): void => {
              void runBackfill(false);
            }}
            disabled={backfillMutation.isPending}
            className='border-amber-500/40 text-amber-100 hover:bg-amber-500/20'
          >
            Run Backfill
          </Button>
        </div>

        {!policyDraft.allowAutomaticFallback && (
          <div className='mt-4 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100'>
            <AlertTriangleIcon className='mt-0.5 size-4 shrink-0' />
            Automatic fallback is disabled. Unconfigured or unavailable providers should now fail fast.
          </div>
        )}
      </SectionPanel>
    </AdminPageLayout>
  );
}
