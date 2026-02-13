'use client';

import { AlertTriangleIcon, DatabaseIcon, HardDriveIcon, SaveIcon } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';


import { logClientError } from '@/features/observability';
import { useSettingsMap, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import {
  DATABASE_ENGINE_BACKUP_WEEKDAYS,
  isValidDatabaseEngineBackupTimeUtc,
  normalizeDatabaseEngineBackupSchedule,
} from '@/shared/lib/db/database-engine-backup-schedule';
import {
  DATABASE_ENGINE_BACKUP_SCHEDULE_KEY,
  DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY,
  DATABASE_ENGINE_OPERATION_CONTROLS_KEY,
  DATABASE_ENGINE_POLICY_KEY,
  DATABASE_ENGINE_SERVICE_ROUTE_MAP_KEY,
  DEFAULT_DATABASE_ENGINE_BACKUP_SCHEDULE,
  DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS,
  DEFAULT_DATABASE_ENGINE_POLICY,
  type DatabaseEngineBackupSchedule,
  type DatabaseEngineBackupType,
  type DatabaseEngineOperationControls,
  type DatabaseEnginePolicy,
  type DatabaseEngineProvider,
  type DatabaseEngineServiceRoute,
} from '@/shared/lib/db/database-engine-constants';
import { normalizeDatabaseEngineOperationControls } from '@/shared/lib/db/database-engine-operation-controls';
import { PageLayout, Button, ConfirmDialog,  RefreshButton, useToast, FormSection, FormField, Input, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Badge, UnifiedSelect, Checkbox, Switch } from '@/shared/ui';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import { DatabaseBackupsPanel } from '../components/DatabaseBackupsPanel';
import { DatabaseOperationsPanel } from '../components/DatabaseOperationsPanel';
import {
  useAllCollectionsSchema,
  useCancelDatabaseEngineOperationJobMutation,
  useDatabaseBackupRunNowMutation,
  useCopyCollectionMutation,
  useDatabaseEngineOperationsJobs,
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

type DatabaseEngineWorkspaceView = 'engine' | 'backups' | 'operations';

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

const parseOperationControls = (raw: string | undefined): DatabaseEngineOperationControls =>
  normalizeDatabaseEngineOperationControls(raw ?? DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS);

const isPrimaryProvider = (value: unknown): value is 'mongodb' | 'prisma' =>
  value === 'mongodb' || value === 'prisma';

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return 'n/a';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const shortenId = (value: string): string =>
  value.length <= 18 ? value : `${value.slice(0, 10)}...${value.slice(-6)}`;

const parseWorkspaceView = (raw: string | null): DatabaseEngineWorkspaceView => {
  if (raw === 'backups' || raw === 'operations') return raw;
  return 'engine';
};

export default function DatabaseEnginePage(): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const settingsQuery = useSettingsMap({ scope: 'all' });
  const updateSettingsBulk = useUpdateSettingsBulk();

  const schemaQuery = useAllCollectionsSchema();
  const redisQuery = useRedisOverview(400);
  const engineStatusQuery = useDatabaseEngineStatus();
  const backupSchedulerStatusQuery = useDatabaseBackupSchedulerStatus();
  const operationsJobsQuery = useDatabaseEngineOperationsJobs(30);
  const backupSchedulerTickMutation = useDatabaseBackupSchedulerTickMutation();
  const backupRunNowMutation = useDatabaseBackupRunNowMutation();
  const cancelOperationJobMutation = useCancelDatabaseEngineOperationJobMutation();
  const syncDatabaseMutation = useSyncDatabaseMutation();
  const backfillMutation = useSettingsBackfillMutation();
  const copyCollectionMutation = useCopyCollectionMutation();

  const [backfillLimit, setBackfillLimit] = useState(500);
  const [pendingSyncDirection, setPendingSyncDirection] = useState<SyncDirection | null>(null);
  const [pendingCollectionSync, setPendingCollectionSync] = useState<PendingCollectionSync | null>(null);
  const [workspaceView, setWorkspaceView] = useState<DatabaseEngineWorkspaceView>(
    parseWorkspaceView(searchParams.get('view'))
  );

  useEffect(() => {
    setWorkspaceView(parseWorkspaceView(searchParams.get('view')));
  }, [searchParams]);

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
  const operationControlsFromSettings = useMemo<DatabaseEngineOperationControls>(() => {
    const raw = settingsQuery.data?.get(DATABASE_ENGINE_OPERATION_CONTROLS_KEY);
    return parseOperationControls(raw);
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
  const [operationControlsDraft, setOperationControlsDraft] =
    useState<DatabaseEngineOperationControls>(operationControlsFromSettings);

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

  useEffect(() => {
    setOperationControlsDraft(operationControlsFromSettings);
  }, [operationControlsFromSettings]);

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
        {
          key: DATABASE_ENGINE_OPERATION_CONTROLS_KEY,
          value: JSON.stringify(operationControlsDraft),
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
    operationControlsDraft,
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

  const cancelOperationJob = useCallback(
    async (jobId: string): Promise<void> => {
      try {
        await cancelOperationJobMutation.mutateAsync({ jobId });
        toast(`Job cancelled: ${jobId}`, { variant: 'success' });
        void operationsJobsQuery.refetch();
      } catch (error: unknown) {
        logClientError(error, {
          context: { source: 'DatabaseEnginePage', action: 'cancelOperationJob', jobId },
        });
        toast('Failed to cancel job.', { variant: 'error' });
      }
    },
    [cancelOperationJobMutation, operationsJobsQuery, toast]
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
      operationsJobsQuery.refetch(),
      providerPreviewQuery.refetch(),
    ]);
  };

  const setWorkspaceViewWithUrl = useCallback(
    (nextView: DatabaseEngineWorkspaceView): void => {
      setWorkspaceView(nextView);
      const params = new URLSearchParams(searchParams.toString());
      if (nextView === 'engine') {
        params.delete('view');
      } else {
        params.set('view', nextView);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

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
  const operationJobs = operationsJobsQuery.data?.jobs ?? [];
  const operationQueueStatus = operationsJobsQuery.data?.queueStatus ?? null;

  return (
    <PageLayout
      title='Database Engine'
      description='Manual control center for provider routing, migrations, synchronisation, backfilling, and fallback behavior across MongoDB, Prisma, and Redis.'
      headerActions={
        workspaceView === 'engine' ? (
          <div className='flex items-center gap-2'>
            <RefreshButton
              onRefresh={refreshAll}
              isRefreshing={
                settingsQuery.isFetching ||
                schemaQuery.isFetching ||
                redisQuery.isFetching ||
                engineStatusQuery.isFetching ||
                backupSchedulerStatusQuery.isFetching ||
                operationsJobsQuery.isFetching ||
                providerPreviewQuery.isFetching
              }
            />
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
        ) : null
      }
    >
      <div className='mb-6 flex flex-wrap gap-2 rounded-lg border border-border/60 bg-card/50 p-3'>
        <Button
          variant={workspaceView === 'engine' ? 'default' : 'outline'}
          size='sm'
          onClick={(): void => setWorkspaceViewWithUrl('engine')}
        >
          Engine
        </Button>
        <Button
          variant={workspaceView === 'backups' ? 'default' : 'outline'}
          size='sm'
          onClick={(): void => setWorkspaceViewWithUrl('backups')}
        >
          Backups
        </Button>
        <Button
          variant={workspaceView === 'operations' ? 'default' : 'outline'}
          size='sm'
          onClick={(): void => setWorkspaceViewWithUrl('operations')}
        >
          Operations
        </Button>
      </div>

      {workspaceView === 'engine' ? (
        <>
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

          <FormSection
            title='Policy Mode'
            description='Define whether fallback, backfill, and migrations are automatic or strictly manual.'
            actions={(
              <Button variant='outline' onClick={applyManualOnlyTemplate}>
                Apply Manual-Only Template
              </Button>
            )}
            className='p-5'
          >
            <div className='mt-4 grid gap-3 md:grid-cols-2'>
              <label className='flex items-center gap-2 text-sm text-gray-200 cursor-pointer'>
                <Checkbox
                  checked={policyDraft.requireExplicitServiceRouting}
                  onCheckedChange={(val: boolean | 'indeterminate'): void =>
                    setPolicyDraft((prev) => ({
                      ...prev,
                      requireExplicitServiceRouting: Boolean(val),
                    }))
                  }
                />
                Require explicit service routing
              </label>
              <label className='flex items-center gap-2 text-sm text-gray-200 cursor-pointer'>
                <Checkbox
                  checked={policyDraft.requireExplicitCollectionRouting}
                  onCheckedChange={(val: boolean | 'indeterminate'): void =>
                    setPolicyDraft((prev) => ({
                      ...prev,
                      requireExplicitCollectionRouting: Boolean(val),
                    }))
                  }
                />
                Require explicit collection routing
              </label>
              <label className='flex items-center gap-2 text-sm text-gray-200 cursor-pointer'>
                <Checkbox
                  checked={policyDraft.allowAutomaticFallback}
                  onCheckedChange={(val: boolean | 'indeterminate'): void =>
                    setPolicyDraft((prev) => ({
                      ...prev,
                      allowAutomaticFallback: Boolean(val),
                    }))
                  }
                />
                Allow automatic fallback
              </label>
              <label className='flex items-center gap-2 text-sm text-gray-200 cursor-pointer'>
                <Checkbox
                  checked={policyDraft.allowAutomaticBackfill}
                  onCheckedChange={(val: boolean | 'indeterminate'): void =>
                    setPolicyDraft((prev) => ({
                      ...prev,
                      allowAutomaticBackfill: Boolean(val),
                    }))
                  }
                />
                Allow automatic backfill
              </label>
              <label className='flex items-center gap-2 text-sm text-gray-200 cursor-pointer'>
                <Checkbox
                  checked={policyDraft.allowAutomaticMigrations}
                  onCheckedChange={(val: boolean | 'indeterminate'): void =>
                    setPolicyDraft((prev) => ({
                      ...prev,
                      allowAutomaticMigrations: Boolean(val),
                    }))
                  }
                />
                Allow automatic migrations
              </label>
              <label className='flex items-center gap-2 text-sm text-gray-200 cursor-pointer'>
                <Checkbox
                  checked={policyDraft.strictProviderAvailability}
                  onCheckedChange={(val: boolean | 'indeterminate'): void =>
                    setPolicyDraft((prev) => ({
                      ...prev,
                      strictProviderAvailability: Boolean(val),
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
          </FormSection>

          <FormSection
            title='Manual Operation Controls'
            description='Server-enforced switches for manual engine actions. Disabled actions return explicit API errors.'
            actions={(
              <div className='flex flex-wrap gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={(): void => {
                    setOperationControlsDraft({
                      allowManualFullSync: true,
                      allowManualCollectionSync: true,
                      allowManualBackfill: true,
                      allowManualBackupRunNow: true,
                      allowManualBackupMaintenance: true,
                      allowBackupSchedulerTick: true,
                      allowOperationJobCancellation: true,
                    });
                  }}
                >
                  Enable All
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={(): void => {
                    setOperationControlsDraft({
                      allowManualFullSync: false,
                      allowManualCollectionSync: false,
                      allowManualBackfill: false,
                      allowManualBackupRunNow: false,
                      allowManualBackupMaintenance: false,
                      allowBackupSchedulerTick: false,
                      allowOperationJobCancellation: false,
                    });
                  }}
                >
                  Disable All
                </Button>
              </div>
            )}
            className='mt-6 p-5'
          >
            <div className='mt-4 grid gap-3 md:grid-cols-2'>
              <div className='flex items-center justify-between gap-3 rounded-md border border-border/40 bg-card/30 p-2'>
                <span className='text-sm text-gray-200'>Allow manual full sync (MongoDB &lt;-&gt; Prisma)</span>
                <Switch
                  checked={operationControlsDraft.allowManualFullSync}
                  onCheckedChange={(val: boolean): void =>
                    setOperationControlsDraft((prev) => ({
                      ...prev,
                      allowManualFullSync: val,
                    }))
                  }
                />
              </div>
              <div className='flex items-center justify-between gap-3 rounded-md border border-border/40 bg-card/30 p-2'>
                <span className='text-sm text-gray-200'>Allow manual collection sync</span>
                <Switch
                  checked={operationControlsDraft.allowManualCollectionSync}
                  onCheckedChange={(val: boolean): void =>
                    setOperationControlsDraft((prev) => ({
                      ...prev,
                      allowManualCollectionSync: val,
                    }))
                  }
                />
              </div>
              <div className='flex items-center justify-between gap-3 rounded-md border border-border/40 bg-card/30 p-2'>
                <span className='text-sm text-gray-200'>Allow manual settings backfill</span>
                <Switch
                  checked={operationControlsDraft.allowManualBackfill}
                  onCheckedChange={(val: boolean): void =>
                    setOperationControlsDraft((prev) => ({
                      ...prev,
                      allowManualBackfill: val,
                    }))
                  }
                />
              </div>
              <div className='flex items-center justify-between gap-3 rounded-md border border-border/40 bg-card/30 p-2'>
                <span className='text-sm text-gray-200'>Allow manual backup run-now</span>
                <Switch
                  checked={operationControlsDraft.allowManualBackupRunNow}
                  onCheckedChange={(val: boolean): void =>
                    setOperationControlsDraft((prev) => ({
                      ...prev,
                      allowManualBackupRunNow: val,
                    }))
                  }
                />
              </div>
              <div className='flex items-center justify-between gap-3 rounded-md border border-border/40 bg-card/30 p-2'>
                <span className='text-sm text-gray-200'>Allow manual backup restore/upload/delete</span>
                <Switch
                  checked={operationControlsDraft.allowManualBackupMaintenance}
                  onCheckedChange={(val: boolean): void =>
                    setOperationControlsDraft((prev) => ({
                      ...prev,
                      allowManualBackupMaintenance: val,
                    }))
                  }
                />
              </div>
              <div className='flex items-center justify-between gap-3 rounded-md border border-border/40 bg-card/30 p-2'>
                <span className='text-sm text-gray-200'>Allow manual backup scheduler tick</span>
                <Switch
                  checked={operationControlsDraft.allowBackupSchedulerTick}
                  onCheckedChange={(val: boolean): void =>
                    setOperationControlsDraft((prev) => ({
                      ...prev,
                      allowBackupSchedulerTick: val,
                    }))
                  }
                />
              </div>
              <div className='flex items-center justify-between gap-3 rounded-md border border-border/40 bg-card/30 p-2'>
                <span className='text-sm text-gray-200'>Allow operation job cancellation</span>
                <Switch
                  checked={operationControlsDraft.allowOperationJobCancellation}
                  onCheckedChange={(val: boolean): void =>
                    setOperationControlsDraft((prev) => ({
                      ...prev,
                      allowOperationJobCancellation: val,
                    }))
                  }
                />
              </div>
            </div>
          </FormSection>

          <FormSection
            title='Engine Validation'
            description='Validate strict policy requirements before saving routing changes.'
            actions={(
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
            )}
            className='mt-6 p-5'
          >
            <div className='mt-4 grid gap-2 text-xs sm:grid-cols-3'>
              <div className='flex items-center justify-between rounded border border-gray-800/80 bg-black/20 px-3 py-2 text-gray-300'>
                <span>Prisma env:</span>
                <Badge variant={providerAvailability.prisma ? 'success' : 'destructive'} className='text-[10px]'>
                  {providerAvailability.prisma === null ? 'Unknown' : providerAvailability.prisma ? 'Configured' : 'Missing'}
                </Badge>
              </div>
              <div className='flex items-center justify-between rounded border border-gray-800/80 bg-black/20 px-3 py-2 text-gray-300'>
                <span>MongoDB env:</span>
                <Badge variant={providerAvailability.mongodb ? 'success' : 'destructive'} className='text-[10px]'>
                  {providerAvailability.mongodb === null ? 'Unknown' : providerAvailability.mongodb ? 'Configured' : 'Missing'}
                </Badge>
              </div>
              <div className='flex items-center justify-between rounded border border-gray-800/80 bg-black/20 px-3 py-2 text-gray-300'>
                <span>Redis env:</span>
                <Badge variant={providerAvailability.redis ? 'success' : 'destructive'} className='text-[10px]'>
                  {providerAvailability.redis === null ? 'Unknown' : providerAvailability.redis ? 'Configured' : 'Missing'}
                </Badge>
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
          </FormSection>

          <div className='mt-6 grid gap-4 lg:grid-cols-3'>
            <FormSection
              title={`MongoDB Collections (${mongoCollections.length})`}
              titleIcon={<DatabaseIcon className='size-4 text-emerald-300' />}
              className='p-5'
            >
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
            </FormSection>

            <FormSection
              title={`Prisma Collections (${prismaCollections.length})`}
              titleIcon={<DatabaseIcon className='size-4 text-blue-300' />}
              className='p-5'
            >
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
            </FormSection>

            <FormSection
              title='Redis'
              titleIcon={<HardDriveIcon className='size-4 text-orange-300' />}
              className='p-5'
            >
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
            </FormSection>
          </div>

          <FormSection
            title='Service Routing'
            description='Route each application service to a primary data provider.'
            actions={(
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
            )}
            className='mt-6 p-5'
          >
            {policyDraft.requireExplicitServiceRouting && missingServiceRoutes.length > 0 && (
              <div className='mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100'>
                Explicit service routing is enabled, but {missingServiceRoutes.length} service route(s) are missing.
              </div>
            )}
            <div className='mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5'>
              {services.map((service) => (
                <FormField key={service} label={serviceLabels[service]}>
                  <UnifiedSelect
                    value={
                      serviceRouteMapDraft[service] === 'mongodb' ||
                      serviceRouteMapDraft[service] === 'prisma'
                        ? serviceRouteMapDraft[service]
                        : ''
                    }
                    onValueChange={(value: string): void => {
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
                    options={[
                      { value: '', label: 'Inherit/Unset' },
                      { value: 'mongodb', label: 'MongoDB' },
                      { value: 'prisma', label: 'Prisma' },
                    ]}
                    triggerClassName='h-9 text-xs'
                  />
                </FormField>
              ))}
            </div>
          </FormSection>

          <FormSection
            title='Collection Routing and Sync'
            description='Assign collection-level providers and run manual collection sync operations.'
            actions={(
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
            )}
            className='mt-6 p-5'
          >
            {policyDraft.requireExplicitCollectionRouting && missingCollectionRoutes.length > 0 && (
              <div className='mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100'>
                Explicit collection routing is enabled, but {missingCollectionRoutes.length} collection(s) are still set to auto.
              </div>
            )}
            <div className='mt-4 overflow-auto rounded-md border border-border/60 bg-card/40'>
              <Table className='text-xs'>
                <TableHeader>
                  <TableRow className='bg-gray-900 text-left text-gray-400 hover:bg-transparent'>
                    <TableHead className='px-2 py-2'>Collection</TableHead>
                    <TableHead className='px-2 py-2'>MongoDB</TableHead>
                    <TableHead className='px-2 py-2'>Prisma</TableHead>
                    <TableHead className='px-2 py-2'>Assigned Provider</TableHead>
                    <TableHead className='px-2 py-2'>Effective (Auto)</TableHead>
                    <TableHead className='px-2 py-2'>Manual Sync</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.name} className='border-b border-gray-900 hover:bg-muted/30'>
                      <TableCell className='px-2 py-2 font-mono text-gray-100'>{row.name}</TableCell>
                      <TableCell className='px-2 py-2 text-gray-300'>
                        {row.existsInMongo
                          ? (row.mongoDocumentCount ?? 0).toLocaleString()
                          : '--'}
                      </TableCell>
                      <TableCell className='px-2 py-2 text-gray-300'>
                        {row.existsInPrisma
                          ? (row.prismaRowCount ?? 0).toLocaleString()
                          : '--'}
                      </TableCell>
                      <TableCell className='px-2 py-2'>
                        <UnifiedSelect
                          value={collectionRouteMapDraft[row.name] ?? 'auto'}
                          onValueChange={(value: string): void => {
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
                          options={[
                            { value: 'auto', label: 'Auto' },
                            { value: 'mongodb', label: 'MongoDB' },
                            { value: 'prisma', label: 'Prisma' },
                            { value: 'redis', label: 'Redis' },
                          ]}
                          triggerClassName='h-7 text-[10px] w-[100px]'
                        />
                      </TableCell>
                      <TableCell className='px-2 py-2'>
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
                      </TableCell>
                      <TableCell className='px-2 py-2'>
                        <div className='flex gap-1'>
                          <Button
                            variant='outline'
                            size='sm'
                            disabled={
                              !row.existsInMongo ||
                              !operationControlsDraft.allowManualCollectionSync
                            }
                            onClick={(): void => {
                              setPendingCollectionSync({
                                collection: row.name,
                                direction: 'mongo_to_prisma',
                                label: 'MongoDB to Prisma',
                              });
                            }}
                            className='h-7 px-2 text-[10px]'
                          >
                            M to P
                          </Button>
                          <Button
                            variant='outline'
                            size='sm'
                            disabled={
                              !row.existsInPrisma ||
                              !operationControlsDraft.allowManualCollectionSync
                            }
                            onClick={(): void => {
                              setPendingCollectionSync({
                                collection: row.name,
                                direction: 'prisma_to_mongo',
                                label: 'Prisma to MongoDB',
                              });
                            }}
                            className='h-7 px-2 text-[10px]'
                          >
                            P to M
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </FormSection>

          <FormSection
            title='Scheduled Backups'
            description='Runtime scheduler for controlled backup execution. Nothing runs until enabled here.'
            actions={(
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
                  disabled={
                    backupSchedulerTickMutation.isPending ||
                    !operationControlsDraft.allowBackupSchedulerTick
                  }
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
                  disabled={
                    backupRunNowMutation.isPending ||
                    !operationControlsDraft.allowManualBackupRunNow
                  }
                >
                  {backupRunNowMutation.isPending ? 'Queueing...' : 'Run All Backups Now'}
                </Button>
              </div>
            )}
            className='mt-6 p-5'
          >
            <div className='flex items-center gap-3 rounded-md border border-border/40 bg-card/30 p-3'>
              <Switch
                checked={backupScheduleDraft.schedulerEnabled}
                onCheckedChange={(val: boolean): void => {
                  setBackupScheduleDraft((prev) => ({
                    ...prev,
                    schedulerEnabled: val,
                  }));
                }}
              />
              <span className='text-sm text-gray-200'>Enable backup scheduler runtime</span>
            </div>

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
                      <label className='flex items-center gap-2 text-xs text-gray-200 cursor-pointer'>
                        <Checkbox
                          checked={draftTarget.enabled}
                          onCheckedChange={(val: boolean | 'indeterminate'): void =>
                            updateBackupTargetDraft(dbType, (target) => ({
                              ...target,
                              enabled: Boolean(val),
                            }))
                          }
                        />
                        Enabled
                      </label>
                    </div>

                    <div className='mt-3 grid gap-3 sm:grid-cols-2'>
                      <FormField label='Cadence'>
                        <UnifiedSelect
                          value={draftTarget.cadence}
                          onValueChange={(value: string): void => {
                            const cadence = value as DatabaseEngineBackupSchedule['mongodb']['cadence'];
                            updateBackupTargetDraft(dbType, (target) => ({ ...target, cadence }));
                          }}
                          options={Object.entries(backupCadenceLabels).map(([value, label]) => ({
                            value,
                            label,
                          }))}
                          triggerClassName='h-9 text-xs'
                        />
                      </FormField>
                      <FormField label='UTC Time'>
                        <Input
                          type='time'
                          step={60}
                          value={draftTarget.timeUtc}
                          onChange={(event): void => {
                            const value = event.target.value;
                            updateBackupTargetDraft(dbType, (target) => ({ ...target, timeUtc: value }));
                          }}
                          className='h-9 text-xs'
                        />
                      </FormField>
                      {draftTarget.cadence === 'every_n_days' && (
                        <FormField label='Interval Days'>
                          <Input
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
                            className='h-9 text-xs'
                          />
                        </FormField>
                      )}
                      {draftTarget.cadence === 'weekly' && (
                        <FormField label='Weekday'>
                          <UnifiedSelect
                            value={String(draftTarget.weekday)}
                            onValueChange={(value: string): void => {
                              const parsed = Number.parseInt(value, 10);
                              if (!Number.isFinite(parsed)) return;
                              updateBackupTargetDraft(dbType, (target) => ({
                                ...target,
                                weekday: Math.min(6, Math.max(0, parsed)),
                              }));
                            }}
                            options={DATABASE_ENGINE_BACKUP_WEEKDAYS.map((option) => ({
                              value: String(option.value),
                              label: option.label,
                            }))}
                            triggerClassName='h-9 text-xs'
                          />
                        </FormField>
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
                        disabled={
                          backupRunNowMutation.isPending ||
                      !operationControlsDraft.allowManualBackupRunNow
                        }
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
          </FormSection>

          <FormSection
            title='Engine Operations Runtime'
            description='Recent db backup/sync jobs queued by Database Engine actions and scheduler.'
            actions={(
              <RefreshButton
                onRefresh={(): void => {
                  void operationsJobsQuery.refetch();
                }}
                isRefreshing={operationsJobsQuery.isFetching}
              />
            )}
            className='mt-6 p-5'
          >
            <div className='mt-4 grid gap-2 text-xs sm:grid-cols-4'>
              <div className='flex items-center justify-between rounded border border-gray-800/80 bg-black/20 px-3 py-2 text-gray-300'>
                <span>Queue:</span>
                <Badge variant={operationQueueStatus?.running ? 'success' : 'secondary'} className='text-[10px]'>
                  {operationQueueStatus ? (operationQueueStatus.running ? 'Running' : 'Stopped') : 'Unknown'}
                </Badge>
              </div>
              <div className='flex items-center justify-between rounded border border-gray-800/80 bg-black/20 px-3 py-2 text-gray-300'>
                <span>Healthy:</span>
                <Badge variant={operationQueueStatus?.healthy ? 'success' : 'destructive'} className='text-[10px]'>
                  {operationQueueStatus ? (operationQueueStatus.healthy ? 'Yes' : 'No') : 'Unknown'}
                </Badge>
              </div>
              <div className='flex items-center justify-between rounded border border-gray-800/80 bg-black/20 px-3 py-2 text-gray-300'>
                <span>Processing:</span>
                <Badge variant={operationQueueStatus?.processing ? 'warning' : 'secondary'} className='text-[10px]'>
                  {operationQueueStatus ? (operationQueueStatus.processing ? 'Yes' : 'No') : 'Unknown'}
                </Badge>
              </div>
              <div className='flex items-center justify-between rounded border border-gray-800/80 bg-black/20 px-3 py-2 text-gray-300'>
                <span>Last poll:</span>
                <span className='font-mono'>{operationQueueStatus ? `${Math.floor(operationQueueStatus.timeSinceLastPoll / 1000)}s ago` : 'n/a'}</span>
              </div>
            </div>

            <div className='mt-4 overflow-auto rounded-md border border-border/60 bg-card/40'>
              <Table className='text-xs'>
                <TableHeader>
                  <TableRow className='bg-gray-900 text-left text-gray-400 hover:bg-transparent'>
                    <TableHead className='px-2 py-2'>Job</TableHead>
                    <TableHead className='px-2 py-2'>Type</TableHead>
                    <TableHead className='px-2 py-2'>Target</TableHead>
                    <TableHead className='px-2 py-2'>Status</TableHead>
                    <TableHead className='px-2 py-2'>Created</TableHead>
                    <TableHead className='px-2 py-2'>Finished</TableHead>
                    <TableHead className='px-2 py-2'>Summary</TableHead>
                    <TableHead className='px-2 py-2'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operationJobs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className='px-2 py-4 text-center text-gray-500'>
                        No Database Engine operation jobs found.
                      </TableCell>
                    </TableRow>
                  )}
                  {operationJobs.map((job) => {
                    const statusVariant =
                      job.status === 'completed'
                        ? 'success'
                        : job.status === 'failed'
                          ? 'destructive'
                          : job.status === 'running'
                            ? 'warning'
                            : 'secondary';
                    const canCancel = job.status === 'pending' || job.status === 'running';
                    return (
                      <TableRow key={job.id} className='border-b border-gray-900 hover:bg-muted/30'>
                        <TableCell className='px-2 py-2 font-mono text-gray-200' title={job.id}>
                          {shortenId(job.id)}
                        </TableCell>
                        <TableCell className='px-2 py-2 text-gray-300'>{job.type}</TableCell>
                        <TableCell className='px-2 py-2 text-gray-300'>
                          {job.type === 'db_backup'
                            ? (job.dbType ?? 'n/a')
                            : (job.direction ?? 'n/a')}
                        </TableCell>
                        <TableCell className='px-2 py-2'>
                          <Badge variant={statusVariant} className='text-[10px]'>
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell className='px-2 py-2 text-gray-400'>{formatDateTime(job.createdAt)}</TableCell>
                        <TableCell className='px-2 py-2 text-gray-400'>{formatDateTime(job.finishedAt)}</TableCell>
                        <TableCell className='px-2 py-2 text-gray-300'>
                          {job.errorMessage ?? job.resultSummary ?? '--'}
                        </TableCell>
                        <TableCell className='px-2 py-2'>
                          <Button
                            variant='outline'
                            size='sm'
                            disabled={
                              !canCancel ||
                              cancelOperationJobMutation.isPending ||
                              !operationControlsDraft.allowOperationJobCancellation
                            }
                            onClick={(): void => {
                              void cancelOperationJob(job.id);
                            }}
                            className='h-7 px-2 text-[10px]'
                          >
                            Cancel
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </FormSection>

          <FormSection
            title='Migration and Backfill Controls'
            description='Manual-only controls for full database sync and settings backfill.'
            className='mt-6 p-5'
          >
            <div className='flex flex-wrap items-center gap-2'>
              <Button
                variant='outline'
                className='border-red-500/40 text-red-100 hover:bg-red-500/20'
                onClick={(): void => setPendingSyncDirection('mongo_to_prisma')}
                disabled={!operationControlsDraft.allowManualFullSync}
              >
                Run Full Sync: MongoDB to Prisma
              </Button>
              <Button
                variant='outline'
                className='border-red-500/40 text-red-100 hover:bg-red-500/20'
                onClick={(): void => setPendingSyncDirection('prisma_to_mongo')}
                disabled={!operationControlsDraft.allowManualFullSync}
              >
                Run Full Sync: Prisma to MongoDB
              </Button>
            </div>

            <div className='mt-5 flex flex-wrap items-end gap-2'>
              <FormField label='Backfill Batch Size'>
                <Input
                  id='backfill-limit'
                  type='number'
                  min={1}
                  max={5000}
                  value={backfillLimit}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                    const parsed = Number.parseInt(event.target.value, 10);
                    if (!Number.isFinite(parsed)) return;
                    setBackfillLimit(Math.min(Math.max(parsed, 1), 5000));
                  }}
                  className='w-36 h-9'
                />
              </FormField>
              <Button
                variant='outline'
                onClick={(): void => {
                  void runBackfill(true);
                }}
                disabled={backfillMutation.isPending || !operationControlsDraft.allowManualBackfill}
                className='h-9'
              >
                Dry Run Backfill
              </Button>
              <Button
                variant='outline'
                onClick={(): void => {
                  void runBackfill(false);
                }}
                disabled={backfillMutation.isPending || !operationControlsDraft.allowManualBackfill}
                className='h-9 border-amber-500/40 text-amber-100 hover:bg-amber-500/20'
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
          </FormSection>
        </>
      ) : null}

      {workspaceView === 'backups' ? <DatabaseBackupsPanel /> : null}
      {workspaceView === 'operations' ? <DatabaseOperationsPanel /> : null}
    </PageLayout>
  );
}
