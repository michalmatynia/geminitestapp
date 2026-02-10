'use client';

import { AlertTriangleIcon, DatabaseIcon, HardDriveIcon, RefreshCcwIcon, SaveIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';


import { logClientError } from '@/features/observability';
import { useSettingsMap, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import {
  DATABASE_ENGINE_BACKUP_SCHEDULE_KEY,
  DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY,
  DATABASE_ENGINE_POLICY_KEY,
  DATABASE_ENGINE_SERVICE_ROUTE_MAP_KEY,
  DEFAULT_DATABASE_ENGINE_BACKUP_SCHEDULE,
  DEFAULT_DATABASE_ENGINE_POLICY,
  type DatabaseEngineBackupSchedule,
  type DatabaseEngineBackupType,
  type DatabaseEnginePolicy,
  type DatabaseEngineProvider,
  type DatabaseEngineServiceRoute,
} from '@/shared/lib/db/database-engine-constants';
import {
  DATABASE_ENGINE_BACKUP_WEEKDAYS,
  isValidDatabaseEngineBackupTimeUtc,
  normalizeDatabaseEngineBackupSchedule,
} from '@/shared/lib/db/database-engine-backup-schedule';
import { PageLayout, Button, ConfirmDialog, SectionPanel, useToast } from '@/shared/ui';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import {
  useAllCollectionsSchema,
  useDatabaseBackupRunNowMutation,
  useCopyCollectionMutation,
  useDatabaseBackupSchedulerStatus,
  useDatabaseBackupSchedulerTickMutation,
  useDatabaseEngineProviderPreview,
  useDatabaseEngineStatus,
  useRedisOverview,
} from '../hooks/useDatabaseQueries';
import {
  useSettingsBackfillMutation,
  useSyncDatabaseMutation,
} from '../hooks/useDatabaseSettings';

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

type ProviderPreviewRow = {
  effectiveProvider: 'mongodb' | 'prisma' | null;
  source: 'collection_route' | 'app_provider' | 'error';
  configuredProvider: 'mongodb' | 'prisma' | 'redis' | null;
  error: string | null;
};

const backupTargetLabels: Record<DatabaseEngineBackupType, string> = {
  mongodb: 'MongoDB',
  postgresql: 'PostgreSQL',
};

const backupCadenceLabels: Record<DatabaseEngineBackupSchedule['mongodb']['cadence'], string> = {
  daily: 'Daily',
  every_n_days: 'Every N days',
  weekly: 'Weekly',
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

const parseBackupSchedule = (raw: string | undefined): DatabaseEngineBackupSchedule =>
  normalizeDatabaseEngineBackupSchedule(raw);

const isPrimaryProvider = (value: unknown): value is 'mongodb' | 'prisma' =>
  value === 'mongodb' || value === 'prisma';

export default function DatabaseEnginePage(): React.JSX.Element {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap({ scope: 'all' });
  const updateSettingsBulk = useUpdateSettingsBulk();

  const schemaQuery = useAllCollectionsSchema();
  const redisQuery = useRedisOverview(400);
  const engineStatusQuery = useDatabaseEngineStatus();
  const backupSchedulerStatusQuery = useDatabaseBackupSchedulerStatus();
  const backupSchedulerTickMutation = useDatabaseBackupSchedulerTickMutation();
  const backupRunNowMutation = useDatabaseBackupRunNowMutation();
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

  const backupScheduleFromSettings = useMemo<DatabaseEngineBackupSchedule>(() => {
    const raw = settingsQuery.data?.get(DATABASE_ENGINE_BACKUP_SCHEDULE_KEY);
    return parseBackupSchedule(raw);
  }, [settingsQuery.data]);

  const [policyDraft, setPolicyDraft] = useState<DatabaseEnginePolicy>(policyFromSettings);
  const [serviceRouteMapDraft, setServiceRouteMapDraft] = useState<
    Partial<Record<DatabaseEngineServiceRoute, DatabaseEngineProvider>>
  >(serviceRouteMapFromSettings);
  const [collectionRouteMapDraft, setCollectionRouteMapDraft] = useState<
    Record<string, DatabaseEngineProvider>
  >(collectionRouteMapFromSettings);
  const [backupScheduleDraft, setBackupScheduleDraft] = useState<DatabaseEngineBackupSchedule>(
    backupScheduleFromSettings
  );

  useEffect(() => {
    setPolicyDraft(policyFromSettings);
  }, [policyFromSettings]);

  useEffect(() => {
    setServiceRouteMapDraft(serviceRouteMapFromSettings);
  }, [serviceRouteMapFromSettings]);

  useEffect(() => {
    setCollectionRouteMapDraft(collectionRouteMapFromSettings);
  }, [collectionRouteMapFromSettings]);

  useEffect(() => {
    setBackupScheduleDraft(backupScheduleFromSettings);
  }, [backupScheduleFromSettings]);

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

  const previewCollections = useMemo(() => rows.map((row) => row.name), [rows]);
  const providerPreviewQuery = useDatabaseEngineProviderPreview(
    previewCollections.length > 0 ? previewCollections : undefined
  );
  const providerPreviewByCollection = useMemo(() => {
    const map = new Map<string, ProviderPreviewRow>();
    providerPreviewQuery.data?.collections.forEach((item) => {
      map.set(item.collection, {
        effectiveProvider: item.effectiveProvider,
        source: item.source,
        configuredProvider: item.configuredProvider,
        error: item.error,
      });
    });
    return map;
  }, [providerPreviewQuery.data]);

  const effectivePreviewByCollection = useMemo(() => {
    const appProvider = providerPreviewQuery.data?.appProvider ?? null;
    const appProviderError = providerPreviewQuery.data?.appProviderError ?? null;
    const map = new Map<string, ProviderPreviewRow>();
    rows.forEach((row) => {
      const draftRoute = collectionRouteMapDraft[row.name] ?? null;
      if (draftRoute === 'mongodb' || draftRoute === 'prisma') {
        map.set(row.name, {
          configuredProvider: draftRoute,
          effectiveProvider: draftRoute,
          source: 'collection_route',
          error: null,
        });
        return;
      }
      if (draftRoute === 'redis') {
        map.set(row.name, {
          configuredProvider: 'redis',
          effectiveProvider: null,
          source: 'error',
          error:
            `Collection "${row.name}" is routed to Redis; ` +
            'this operation path supports only MongoDB/Prisma.',
        });
        return;
      }

      const serverPreview = providerPreviewByCollection.get(row.name);
      if (serverPreview && serverPreview.source !== 'collection_route') {
        map.set(row.name, serverPreview);
        return;
      }

      if (appProvider) {
        map.set(row.name, {
          configuredProvider: null,
          effectiveProvider: appProvider,
          source: 'app_provider',
          error: null,
        });
        return;
      }

      map.set(row.name, {
        configuredProvider: null,
        effectiveProvider: null,
        source: 'error',
        error:
          appProviderError ??
          `Collection "${row.name}" cannot resolve an effective provider while route is auto.`,
      });
    });
    return map;
  }, [
    collectionRouteMapDraft,
    providerPreviewByCollection,
    providerPreviewQuery.data?.appProvider,
    providerPreviewQuery.data?.appProviderError,
    rows,
  ]);

  const providerPreviewErrors = useMemo(
    () => Array.from(effectivePreviewByCollection.values()).filter((item) => item.error !== null),
    [effectivePreviewByCollection]
  );

  const mongoCollections = useMemo(() => rows.filter((row) => row.existsInMongo), [rows]);
  const prismaCollections = useMemo(() => rows.filter((row) => row.existsInPrisma), [rows]);
  const knownCollectionNames = useMemo(() => new Set(rows.map((row) => row.name)), [rows]);

  const missingServiceRoutes = useMemo(
    () => services.filter((service) => !isPrimaryProvider(serviceRouteMapDraft[service])),
    [serviceRouteMapDraft]
  );

  const missingCollectionRoutes = useMemo(
    () =>
      rows
        .filter((row) => collectionRouteMapDraft[row.name] === undefined)
        .map((row) => row.name),
    [collectionRouteMapDraft, rows]
  );

  const orphanedCollectionRoutes = useMemo(
    () =>
      Object.keys(collectionRouteMapDraft)
        .filter((collectionName) => !knownCollectionNames.has(collectionName))
        .sort((a, b) => a.localeCompare(b)),
    [collectionRouteMapDraft, knownCollectionNames]
  );

  const providerAvailability = useMemo(
    () => ({
      prisma: engineStatusQuery.data?.providers.prismaConfigured ?? null,
      mongodb: engineStatusQuery.data?.providers.mongodbConfigured ?? null,
      redis: engineStatusQuery.data?.providers.redisConfigured ?? null,
    }),
    [engineStatusQuery.data]
  );

  const serverBlockingIssues = engineStatusQuery.data?.blockingIssues ?? [];

  const unavailableServiceRoutes = useMemo(
    () =>
      services.filter((service) => {
        const provider = serviceRouteMapDraft[service];
        if (!isPrimaryProvider(provider)) return false;
        return providerAvailability[provider] === false;
      }),
    [providerAvailability, serviceRouteMapDraft]
  );

  const unavailableCollectionRoutes = useMemo(
    () =>
      Object.entries(collectionRouteMapDraft)
        .filter((entry): entry is [string, DatabaseEngineProvider] => {
          const provider = entry[1];
          return providerAvailability[provider] === false;
        })
        .map(([collection, provider]) => ({ collection, provider }))
        .sort((a, b) => a.collection.localeCompare(b.collection)),
    [collectionRouteMapDraft, providerAvailability]
  );

  const backupScheduleValidationErrors = useMemo(() => {
    const issues: string[] = [];
    const validateTarget = (dbType: DatabaseEngineBackupType): void => {
      const target = backupScheduleDraft[dbType];
      if (!backupScheduleDraft.schedulerEnabled || !target.enabled) return;

      if (!isValidDatabaseEngineBackupTimeUtc(target.timeUtc)) {
        issues.push(`${backupTargetLabels[dbType]} schedule time must use HH:MM (UTC).`);
      }
      if (target.cadence === 'every_n_days' && (target.intervalDays < 1 || target.intervalDays > 365)) {
        issues.push(`${backupTargetLabels[dbType]} interval days must be between 1 and 365.`);
      }
      if (target.cadence === 'weekly' && (target.weekday < 0 || target.weekday > 6)) {
        issues.push(`${backupTargetLabels[dbType]} weekly day must be between 0 and 6.`);
      }
    };

    validateTarget('mongodb');
    validateTarget('postgresql');
    return issues;
  }, [backupScheduleDraft]);

  const validationErrors = useMemo(() => {
    const issues: string[] = [];
    if (policyDraft.requireExplicitServiceRouting && missingServiceRoutes.length > 0) {
      issues.push(`Missing service routes: ${missingServiceRoutes.join(', ')}`);
    }
    if (policyDraft.requireExplicitCollectionRouting && missingCollectionRoutes.length > 0) {
      issues.push(`Missing collection routes: ${missingCollectionRoutes.length}`);
    }
    if (policyDraft.strictProviderAvailability && unavailableServiceRoutes.length > 0) {
      issues.push(`Service routes target unavailable providers: ${unavailableServiceRoutes.join(', ')}`);
    }
    if (policyDraft.strictProviderAvailability && unavailableCollectionRoutes.length > 0) {
      issues.push(`Collection routes target unavailable providers: ${unavailableCollectionRoutes.length}`);
    }
    issues.push(...backupScheduleValidationErrors);
    return issues;
  }, [
    backupScheduleValidationErrors,
    missingCollectionRoutes,
    missingServiceRoutes,
    policyDraft.requireExplicitCollectionRouting,
    policyDraft.requireExplicitServiceRouting,
    policyDraft.strictProviderAvailability,
    unavailableCollectionRoutes,
    unavailableServiceRoutes,
  ]);

  const hasBlockingValidationErrors = validationErrors.length > 0;

  const assignUnmappedCollections = useCallback(
    (provider: DatabaseEngineProvider): void => {
      setCollectionRouteMapDraft((prev) => {
        const next = { ...prev };
        rows.forEach((row) => {
          if (!next[row.name]) {
            next[row.name] = provider;
          }
        });
        return next;
      });
    },
    [rows]
  );

  const clearOrphanedCollectionRoutes = useCallback((): void => {
    setCollectionRouteMapDraft((prev) => {
      const next: Record<string, DatabaseEngineProvider> = {};
      Object.entries(prev).forEach(([collectionName, provider]) => {
        if (knownCollectionNames.has(collectionName)) {
          next[collectionName] = provider;
        }
      });
      return next;
    });
  }, [knownCollectionNames]);

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

  const updateBackupTargetDraft = useCallback(
    (
      dbType: DatabaseEngineBackupType,
      updater: (
        target: DatabaseEngineBackupSchedule['mongodb']
      ) => DatabaseEngineBackupSchedule['mongodb'],
    ): void => {
      setBackupScheduleDraft((prev) => ({
        ...prev,
        [dbType]: updater(prev[dbType]),
      }));
    },
    []
  );

  const saveEngineConfiguration = useCallback(async (): Promise<void> => {
    if (hasBlockingValidationErrors) {
      toast(`Cannot save engine config: ${validationErrors[0] ?? 'Validation failed.'}`, {
        variant: 'error',
      });
      return;
    }

    const normalizedServiceMap: Partial<Record<DatabaseEngineServiceRoute, DatabaseEngineProvider>> = {};
    services.forEach((service) => {
      const value = serviceRouteMapDraft[service];
      if (isPrimaryProvider(value)) {
        normalizedServiceMap[service] = value;
      }
    });
    const normalizedBackupSchedule = normalizeDatabaseEngineBackupSchedule(backupScheduleDraft);

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
        {
          key: DATABASE_ENGINE_BACKUP_SCHEDULE_KEY,
          value: JSON.stringify(normalizedBackupSchedule),
        },
      ]);
      toast('Database Engine configuration saved.', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'DatabaseEnginePage', action: 'saveEngineConfiguration' } });
      toast('Failed to save Database Engine configuration.', { variant: 'error' });
    }
  }, [
    backupScheduleDraft,
    collectionRouteMapDraft,
    hasBlockingValidationErrors,
    policyDraft,
    serviceRouteMapDraft,
    toast,
    updateSettingsBulk,
    validationErrors,
  ]);

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

  const runBackupSchedulerTickNow = useCallback(async (): Promise<void> => {
    try {
      const result = await backupSchedulerTickMutation.mutateAsync();
      const queued = result.tick.triggered;
      if (queued.length > 0) {
        const details = queued.map((item) => `${item.dbType}:${item.jobId}`).join(', ');
        toast(`Scheduler tick queued ${queued.length} backup job(s): ${details}`, {
          variant: 'success',
        });
      } else {
        toast('Scheduler tick completed. No backups were due.', { variant: 'success' });
      }
      void backupSchedulerStatusQuery.refetch();
    } catch (error: unknown) {
      logClientError(error, {
        context: { source: 'DatabaseEnginePage', action: 'runBackupSchedulerTickNow' },
      });
      toast('Failed to run backup scheduler check.', { variant: 'error' });
    }
  }, [backupSchedulerStatusQuery, backupSchedulerTickMutation, toast]);

  const runBackupNow = useCallback(
    async (dbType: 'mongodb' | 'postgresql' | 'all'): Promise<void> => {
      try {
        const result = await backupRunNowMutation.mutateAsync({ dbType });
        if (result.queued.length > 0) {
          const details = result.queued.map((item) => `${item.dbType}:${item.jobId}`).join(', ');
          toast(`Backup job queued: ${details}`, { variant: 'success' });
        } else {
          toast('No backup jobs were queued.', { variant: 'error' });
        }
        void backupSchedulerStatusQuery.refetch();
      } catch (error: unknown) {
        logClientError(error, {
          context: { source: 'DatabaseEnginePage', action: 'runBackupNow', dbType },
        });
        toast('Failed to queue backup job.', { variant: 'error' });
      }
    },
    [backupRunNowMutation, backupSchedulerStatusQuery, toast]
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
      engineStatusQuery.refetch(),
      backupSchedulerStatusQuery.refetch(),
      providerPreviewQuery.refetch(),
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
  const backupSchedulerStatus = backupSchedulerStatusQuery.data;

  return (
    <PageLayout
      title='Database Engine'
      description='Manual control center for provider routing, migrations, synchronisation, backfilling, and fallback behavior across MongoDB, Prisma, and Redis.'
      headerActions={
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            onClick={refreshAll}
            disabled={
              settingsQuery.isFetching ||
              schemaQuery.isFetching ||
              redisQuery.isFetching ||
              engineStatusQuery.isFetching ||
              backupSchedulerStatusQuery.isFetching ||
              providerPreviewQuery.isFetching
            }
          >
            <RefreshCcwIcon className='mr-2 size-4' />
            Refresh
          </Button>
          <Button
            onClick={(): void => {
              void saveEngineConfiguration();
            }}
            disabled={updateSettingsBulk.isPending || hasBlockingValidationErrors}
            title={hasBlockingValidationErrors ? validationErrors[0] : undefined}
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

      <SectionPanel className='mt-6 p-5'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div>
            <h2 className='text-lg font-semibold text-white'>Engine Validation</h2>
            <p className='mt-1 text-sm text-gray-400'>
              Validate strict policy requirements before saving routing changes.
            </p>
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={(): void => assignUnmappedCollections('prisma')}
            >
              Assign Unmapped -&gt; Prisma
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={(): void => assignUnmappedCollections('mongodb')}
            >
              Assign Unmapped -&gt; MongoDB
            </Button>
            {orphanedCollectionRoutes.length > 0 && (
              <Button variant='outline' size='sm' onClick={clearOrphanedCollectionRoutes}>
                Clear Orphaned Routes
              </Button>
            )}
          </div>
        </div>

        <div className='mt-4 grid gap-2 text-xs sm:grid-cols-3'>
          <div className='rounded border border-gray-800/80 bg-black/20 px-2 py-2 text-gray-300'>
            Prisma env: {providerAvailability.prisma === null ? 'Unknown' : providerAvailability.prisma ? 'Configured' : 'Missing'}
          </div>
          <div className='rounded border border-gray-800/80 bg-black/20 px-2 py-2 text-gray-300'>
            MongoDB env: {providerAvailability.mongodb === null ? 'Unknown' : providerAvailability.mongodb ? 'Configured' : 'Missing'}
          </div>
          <div className='rounded border border-gray-800/80 bg-black/20 px-2 py-2 text-gray-300'>
            Redis env: {providerAvailability.redis === null ? 'Unknown' : providerAvailability.redis ? 'Configured' : 'Missing'}
          </div>
        </div>

        {validationErrors.length > 0 ? (
          <div className='mt-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-100'>
            <div className='font-semibold'>Blocking issues</div>
            <div className='mt-1 space-y-1'>
              {validationErrors.map((issue) => (
                <div key={issue}>- {issue}</div>
              ))}
            </div>
          </div>
        ) : (
          <div className='mt-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-100'>
            No blocking validation issues detected.
          </div>
        )}

        {serverBlockingIssues.length > 0 && (
          <div className='mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100'>
            <div className='font-semibold'>Saved engine configuration issues (server)</div>
            <div className='mt-1 space-y-1'>
              {serverBlockingIssues.slice(0, 8).map((issue) => (
                <div key={issue}>- {issue}</div>
              ))}
              {serverBlockingIssues.length > 8 && (
                <div>+{serverBlockingIssues.length - 8} more issue(s)</div>
              )}
            </div>
          </div>
        )}

        {orphanedCollectionRoutes.length > 0 && (
          <div className='mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100'>
            Orphaned collection routes detected: {orphanedCollectionRoutes.slice(0, 8).join(', ')}
            {orphanedCollectionRoutes.length > 8
              ? ` (+${orphanedCollectionRoutes.length - 8} more)`
              : ''}
          </div>
        )}

        {providerPreviewErrors.length > 0 && (
          <div className='mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100'>
            Effective provider preview currently reports {providerPreviewErrors.length} error(s).
            Save routing or policy changes and resolve these before running sync/migration operations.
          </div>
        )}
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
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div>
            <h2 className='text-lg font-semibold text-white'>Service Routing</h2>
            <p className='mt-1 text-sm text-gray-400'>
              Route each application service to a primary data provider.
            </p>
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={(): void => {
                setServiceRouteMapDraft({
                  app: 'prisma',
                  auth: 'prisma',
                  product: 'prisma',
                  integrations: 'prisma',
                  cms: 'prisma',
                });
              }}
            >
              Set All -&gt; Prisma
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={(): void => {
                setServiceRouteMapDraft({
                  app: 'mongodb',
                  auth: 'mongodb',
                  product: 'mongodb',
                  integrations: 'mongodb',
                  cms: 'mongodb',
                });
              }}
            >
              Set All -&gt; MongoDB
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={(): void => {
                setServiceRouteMapDraft({});
              }}
            >
              Clear Service Routes
            </Button>
          </div>
        </div>
        {policyDraft.requireExplicitServiceRouting && missingServiceRoutes.length > 0 && (
          <div className='mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100'>
            Explicit service routing is enabled, but {missingServiceRoutes.length} service route(s) are missing.
          </div>
        )}
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
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div>
            <h2 className='text-lg font-semibold text-white'>Collection Routing and Sync</h2>
            <p className='mt-1 text-sm text-gray-400'>
              Assign collection-level providers and run manual collection sync operations.
            </p>
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={(): void => {
                setCollectionRouteMapDraft({});
              }}
            >
              Clear All Collection Routes
            </Button>
          </div>
        </div>
        {policyDraft.requireExplicitCollectionRouting && missingCollectionRoutes.length > 0 && (
          <div className='mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100'>
            Explicit collection routing is enabled, but {missingCollectionRoutes.length} collection(s) are still set to auto.
          </div>
        )}
        <div className='mt-4 overflow-auto'>
          <table className='min-w-full text-xs'>
            <thead>
              <tr className='border-b border-gray-800 text-left text-gray-400'>
                <th className='px-2 py-2'>Collection</th>
                <th className='px-2 py-2'>MongoDB</th>
                <th className='px-2 py-2'>Prisma</th>
                <th className='px-2 py-2'>Assigned Provider</th>
                <th className='px-2 py-2'>Effective (Auto)</th>
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
                    {(() => {
                      const preview = effectivePreviewByCollection.get(row.name);
                      if (!preview) {
                        return <span className='text-gray-500'>--</span>;
                      }
                      if (preview.error) {
                        return (
                          <span className='text-red-300' title={preview.error}>
                            Error
                          </span>
                        );
                      }
                      const sourceLabel =
                        preview.source === 'collection_route' ? 'route' : 'app';
                      return (
                        <span
                          className='text-gray-200'
                          title={
                            preview.configuredProvider
                              ? `Configured: ${preview.configuredProvider}`
                              : 'Configured: auto'
                          }
                        >
                          {preview.effectiveProvider ?? '--'} ({sourceLabel})
                        </span>
                      );
                    })()}
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
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div>
            <h2 className='text-lg font-semibold text-white'>Scheduled Backups</h2>
            <p className='mt-1 text-sm text-gray-400'>
              Runtime scheduler for controlled backup execution. Nothing runs until enabled here.
            </p>
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={(): void => {
                setBackupScheduleDraft((prev) => ({
                  ...prev,
                  schedulerEnabled: true,
                  mongodb: { ...prev.mongodb, enabled: true },
                  postgresql: { ...prev.postgresql, enabled: true },
                }));
              }}
            >
              Enable All
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={(): void => {
                setBackupScheduleDraft((prev) => ({
                  ...prev,
                  schedulerEnabled: false,
                  mongodb: { ...prev.mongodb, enabled: false },
                  postgresql: { ...prev.postgresql, enabled: false },
                }));
              }}
            >
              Disable All
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={(): void => {
                setBackupScheduleDraft(
                  normalizeDatabaseEngineBackupSchedule(DEFAULT_DATABASE_ENGINE_BACKUP_SCHEDULE)
                );
              }}
            >
              Reset Defaults
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={(): void => {
                void runBackupSchedulerTickNow();
              }}
              disabled={backupSchedulerTickMutation.isPending}
            >
              {backupSchedulerTickMutation.isPending
                ? 'Checking...'
                : 'Run Scheduler Check Now'}
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='border-emerald-500/40 text-emerald-100 hover:bg-emerald-500/20'
              onClick={(): void => {
                void runBackupNow('all');
              }}
              disabled={backupRunNowMutation.isPending}
            >
              {backupRunNowMutation.isPending ? 'Queueing...' : 'Run All Backups Now'}
            </Button>
          </div>
        </div>

        <label className='mt-4 flex items-center gap-2 text-sm text-gray-200'>
          <input
            type='checkbox'
            checked={backupScheduleDraft.schedulerEnabled}
            onChange={(event): void => {
              const enabled = event.target.checked;
              setBackupScheduleDraft((prev) => ({
                ...prev,
                schedulerEnabled: enabled,
              }));
            }}
          />
          Enable backup scheduler runtime
        </label>

        <div className='mt-4 rounded-md border border-gray-800/80 bg-black/20 p-3 text-xs text-gray-300'>
          {backupSchedulerStatus ? (
            <div className='space-y-1'>
              <div>
                Runtime queue: {backupSchedulerStatus.queue.running ? 'Running' : 'Stopped'} /{' '}
                {backupSchedulerStatus.queue.healthy ? 'Healthy' : 'Unhealthy'}
              </div>
              <div>
                Tick interval: every {Math.max(1, Math.floor(backupSchedulerStatus.repeatEveryMs / 1000))}s
              </div>
              <div>
                Last scheduler check: {backupSchedulerStatus.lastCheckedAt ?? 'n/a'}
              </div>
            </div>
          ) : (
            <div>
              {backupSchedulerStatusQuery.isFetching
                ? 'Loading scheduler status...'
                : 'Scheduler status unavailable.'}
            </div>
          )}
        </div>

        <div className='mt-4 grid gap-4 lg:grid-cols-2'>
          {(['mongodb', 'postgresql'] as const).map((dbType) => {
            const draftTarget = backupScheduleDraft[dbType];
            const runtimeTarget = backupSchedulerStatus?.targets[dbType];
            return (
              <div key={dbType} className='rounded-md border border-gray-800/80 bg-black/20 p-4'>
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <h3 className='text-sm font-semibold text-white'>
                      {backupTargetLabels[dbType]}
                    </h3>
                    <p className='mt-1 text-xs text-gray-400'>
                      Last run: {runtimeTarget?.lastRunAt ?? draftTarget.lastRunAt ?? 'never'}
                    </p>
                  </div>
                  <label className='flex items-center gap-2 text-xs text-gray-200'>
                    <input
                      type='checkbox'
                      checked={draftTarget.enabled}
                      onChange={(event): void =>
                        updateBackupTargetDraft(dbType, (target) => ({
                          ...target,
                          enabled: event.target.checked,
                        }))
                      }
                    />
                    Enabled
                  </label>
                </div>

                <div className='mt-3 grid gap-3 sm:grid-cols-2'>
                  <div>
                    <label className='mb-1 block text-xs text-gray-400'>Cadence</label>
                    <select
                      value={draftTarget.cadence}
                      onChange={(event): void => {
                        const cadence = event.target.value as DatabaseEngineBackupSchedule['mongodb']['cadence'];
                        updateBackupTargetDraft(dbType, (target) => ({ ...target, cadence }));
                      }}
                      className='w-full rounded-md border border-gray-700 bg-gray-900 px-2 py-2 text-xs text-gray-200'
                    >
                      {Object.entries(backupCadenceLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className='mb-1 block text-xs text-gray-400'>UTC Time</label>
                    <input
                      type='time'
                      step={60}
                      value={draftTarget.timeUtc}
                      onChange={(event): void => {
                        const value = event.target.value;
                        updateBackupTargetDraft(dbType, (target) => ({ ...target, timeUtc: value }));
                      }}
                      className='w-full rounded-md border border-gray-700 bg-gray-900 px-2 py-2 text-xs text-gray-200'
                    />
                  </div>
                  {draftTarget.cadence === 'every_n_days' && (
                    <div>
                      <label className='mb-1 block text-xs text-gray-400'>Interval Days</label>
                      <input
                        type='number'
                        min={1}
                        max={365}
                        value={draftTarget.intervalDays}
                        onChange={(event): void => {
                          const parsed = Number.parseInt(event.target.value, 10);
                          if (!Number.isFinite(parsed)) return;
                          updateBackupTargetDraft(dbType, (target) => ({
                            ...target,
                            intervalDays: Math.min(365, Math.max(1, parsed)),
                          }));
                        }}
                        className='w-full rounded-md border border-gray-700 bg-gray-900 px-2 py-2 text-xs text-gray-200'
                      />
                    </div>
                  )}
                  {draftTarget.cadence === 'weekly' && (
                    <div>
                      <label className='mb-1 block text-xs text-gray-400'>Weekday</label>
                      <select
                        value={draftTarget.weekday}
                        onChange={(event): void => {
                          const parsed = Number.parseInt(event.target.value, 10);
                          if (!Number.isFinite(parsed)) return;
                          updateBackupTargetDraft(dbType, (target) => ({
                            ...target,
                            weekday: Math.min(6, Math.max(0, parsed)),
                          }));
                        }}
                        className='w-full rounded-md border border-gray-700 bg-gray-900 px-2 py-2 text-xs text-gray-200'
                      >
                        {DATABASE_ENGINE_BACKUP_WEEKDAYS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className='mt-3 rounded-md border border-gray-800/70 bg-gray-950/50 p-2 text-xs text-gray-300'>
                  <div>Next due: {runtimeTarget?.nextDueAt ?? draftTarget.nextDueAt ?? 'n/a'}</div>
                  <div>Last status: {runtimeTarget?.lastStatus ?? draftTarget.lastStatus}</div>
                  <div>Last job: {runtimeTarget?.lastJobId ?? draftTarget.lastJobId ?? 'n/a'}</div>
                  <div>Last error: {runtimeTarget?.lastError ?? draftTarget.lastError ?? 'none'}</div>
                  <div>Due now: {runtimeTarget?.dueNow ? 'Yes' : 'No'}</div>
                </div>

                <div className='mt-3 flex flex-wrap gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='border-emerald-500/40 text-emerald-100 hover:bg-emerald-500/20'
                    disabled={backupRunNowMutation.isPending}
                    onClick={(): void => {
                      void runBackupNow(dbType);
                    }}
                  >
                    Run {backupTargetLabels[dbType]} Backup Now
                  </Button>
                </div>
              </div>
            );
          })}
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
    </PageLayout>
  );
}
