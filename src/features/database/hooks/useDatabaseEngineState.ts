'use client';

import { useRouter } from 'nextjs-toploader/app';
import { usePathname, useSearchParams } from 'next/navigation';
import { startTransition, useState, useMemo, useCallback, useEffect, useRef } from 'react';

import type {
  DatabaseEngineStatus,
  DatabaseEngineOperationsJobs,
  DatabaseEngineBackupSchedulerStatus,
  DatabaseEngineMongoSourceState,
  DatabaseEngineMongoSyncDirection,
  RedisOverview,
  DatabaseEngineProviderPreview,
  DatabaseEngineWorkspaceView,
  UnifiedCollection,
  CollectionSchema,
} from '@/shared/contracts/database';
import { useSettingsMap, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import { ApiError } from '@/shared/lib/api-client';
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
  type DatabaseEngineOperationControls,
  type DatabaseEnginePolicy,
} from '@/shared/lib/db/database-engine-constants';
import { extractMutationErrorMessage } from '@/shared/lib/mutation-error-handler';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  parseDatabaseEngineBackupScheduleSetting,
  parseDatabaseEngineCollectionRouteMapSetting,
  parseDatabaseEngineOperationControlsSetting,
  parseDatabaseEnginePolicySetting,
  parseDatabaseEngineServiceRouteMapSetting,
} from './database-engine-settings-parsing';
import {
  useDatabaseBackupSchedulerStatus,
  useDatabaseEngineOperationsJobs,
  useDatabaseEngineMongoSource,
  useDatabaseEngineProviderPreview,
  useSyncDatabaseEngineMongoSourceMutation,
  useDatabaseEngineStatus,
  useAllCollectionsSchema,
  useRedisOverview,
} from '../hooks/useDatabaseQueries';

export interface DatabaseCollectionRow extends UnifiedCollection {
  assignedProvider: 'mongodb' | 'redis' | 'auto';
}

export interface UseDatabaseEngineStateReturn {
  engineStatus: DatabaseEngineStatus | undefined;
  backupSchedulerStatus: DatabaseEngineBackupSchedulerStatus | undefined;
  operationsJobs: DatabaseEngineOperationsJobs | undefined;
  providerPreview: DatabaseEngineProviderPreview | undefined;
  mongoSourceState: DatabaseEngineMongoSourceState | undefined;
  redisOverview: RedisOverview | undefined;
  activeView: DatabaseEngineWorkspaceView;
  setActiveView: (view: DatabaseEngineWorkspaceView) => void;
  rows: DatabaseCollectionRow[];
  isLoading: boolean;
  isSaving: boolean;
  policy: DatabaseEnginePolicy;
  serviceRouteMap: Record<string, string>;
  collectionRouteMap: Record<string, string>;
  backupSchedule: DatabaseEngineBackupSchedule;
  operationControls: DatabaseEngineOperationControls;
  updatePolicy: (updates: Partial<DatabaseEnginePolicy>) => void;
  updateServiceRoute: (service: string, provider: string) => void;
  updateCollectionRoute: (collection: string, provider: string) => void;
  updateBackupSchedule: (updates: Partial<DatabaseEngineBackupSchedule>) => void;
  updateOperationControls: (updates: Partial<DatabaseEngineOperationControls>) => void;
  syncMongoSources: (direction: 'cloud_to_local' | 'local_to_cloud') => Promise<void>;
  saveSettings: () => Promise<void>;
  isDirty: boolean;
  refetchAll: () => void;
  validationErrors: string[];
  isSyncingMongoSources: boolean;
}

const isMongoSyncTimeoutError = (error: unknown): error is Error =>
  error instanceof Error &&
  (error.message.startsWith('Request timeout after ') ||
    error.message.startsWith('Response body timeout after '));

const didMongoSyncCompleteAfterRequestStarted = (
  state: DatabaseEngineMongoSourceState | undefined,
  direction: DatabaseEngineMongoSyncDirection,
  requestStartedAtMs: number
): boolean => {
  const syncedAt = state?.lastSync?.syncedAt;
  if (syncedAt == null || syncedAt === '' || state?.lastSync?.direction !== direction) {
    return false;
  }

  const syncedAtMs = Date.parse(syncedAt);
  return Number.isFinite(syncedAtMs) && syncedAtMs >= requestStartedAtMs - 1_000;
};

const getMongoSyncInProgressMessage = (
  state: DatabaseEngineMongoSourceState | undefined
): string | null => {
  const syncInProgress = state?.syncInProgress;
  if (!syncInProgress) {
    return null;
  }

  return `MongoDB sync is still running: ${syncInProgress.source} -> ${syncInProgress.target}. Started at ${syncInProgress.acquiredAt}.`;
};

export function useDatabaseEngineState(): UseDatabaseEngineStateReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const engineStatusQuery = useDatabaseEngineStatus();
  const backupSchedulerStatusQuery = useDatabaseBackupSchedulerStatus();
  const operationsJobsQuery = useDatabaseEngineOperationsJobs(30);
  const mongoSourceQuery = useDatabaseEngineMongoSource();
  const providerPreviewQuery = useDatabaseEngineProviderPreview();
  const redisOverviewQuery = useRedisOverview();
  const schemaQuery = useAllCollectionsSchema();

  const requestedView = searchParams.get('view');
  const activeView: DatabaseEngineWorkspaceView =
    requestedView === 'crud' || requestedView === 'engine' ? requestedView : 'engine';

  const setActiveView = useCallback(
    (view: DatabaseEngineWorkspaceView) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('view', view);
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router, searchParams]
  );

  const { data: settingsMap, isPending: settingsLoading } = useSettingsMap({ scope: 'all' });

  const updateSettingsBulk = useUpdateSettingsBulk();
  const syncMongoSourcesMutation = useSyncDatabaseEngineMongoSourceMutation();

  const [policy, setPolicy] = useState<DatabaseEnginePolicy>(DEFAULT_DATABASE_ENGINE_POLICY);
  const [serviceRouteMap, setServiceRouteMap] = useState<Record<string, string>>({});
  const [collectionRouteMap, setCollectionRouteMap] = useState<Record<string, string>>({});
  const [backupSchedule, setBackupSchedule] = useState<DatabaseEngineBackupSchedule>(
    DEFAULT_DATABASE_ENGINE_BACKUP_SCHEDULE
  );
  const [operationControls, setOperationControls] = useState<DatabaseEngineOperationControls>(
    DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS
  );

  const [isDirty, setIsDirty] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const lastValidationErrorSignatureRef = useRef<string | null>(null);

  const resolveMongoSyncToast = useCallback(
    async (
      error: unknown,
      direction: DatabaseEngineMongoSyncDirection,
      requestStartedAtMs: number
    ): Promise<{ message: string; variant: 'success' | 'warning' | 'error' }> => {
      if (isMongoSyncTimeoutError(error)) {
        try {
          const refreshedState = (await mongoSourceQuery.refetch()).data;
          const refreshedLastSync = refreshedState?.lastSync;

          if (didMongoSyncCompleteAfterRequestStarted(refreshedState, direction, requestStartedAtMs)) {
            return {
              message: `MongoDB sync completed: ${refreshedLastSync?.source ?? 'unknown'} -> ${refreshedLastSync?.target ?? 'unknown'}. Synced at ${refreshedLastSync?.syncedAt ?? 'unknown time'}.`,
              variant: 'success',
            };
          }

          const syncInProgressMessage = getMongoSyncInProgressMessage(refreshedState);
          if (syncInProgressMessage !== null) {
            return {
              message: `${syncInProgressMessage} The server has not reported a final result yet.`,
              variant: 'warning',
            };
          }
        } catch (refetchError) {
          logClientError(refetchError, {
            context: {
              source: 'useDatabaseEngineState',
              action: 'resolveMongoSyncToast',
              direction,
            },
          });
        }

        return {
          message:
            'MongoDB sync request timed out before the server reported a final result. Check MongoDB source status before retrying.',
          variant: 'warning',
        };
      }

      if (error instanceof ApiError && error.status === 423) {
        return {
          message: error.message,
          variant: 'warning',
        };
      }

      return {
        message: extractMutationErrorMessage(error, 'Failed to synchronize MongoDB sources.'),
        variant: 'error',
      };
    },
    [mongoSourceQuery]
  );

  const parsedPersistedSettings = useMemo(() => {
    const errors: string[] = [];
    const loggedErrors: Array<{ label: string; error: unknown }> = [];

    const parseSetting = <T>(label: string, parser: () => T, fallback: T): T => {
      try {
        return parser();
      } catch (error) {
        logClientError(error);
        const message =
          error instanceof Error ? error.message : `Invalid ${label} settings payload.`;
        errors.push(message);
        loggedErrors.push({ label, error });
        return fallback;
      }
    };

    return {
      policy: parseSetting(
        DATABASE_ENGINE_POLICY_KEY,
        () => parseDatabaseEnginePolicySetting(settingsMap?.get(DATABASE_ENGINE_POLICY_KEY)),
        DEFAULT_DATABASE_ENGINE_POLICY
      ),
      serviceRouteMap: parseSetting(
        DATABASE_ENGINE_SERVICE_ROUTE_MAP_KEY,
        () =>
          parseDatabaseEngineServiceRouteMapSetting(
            settingsMap?.get(DATABASE_ENGINE_SERVICE_ROUTE_MAP_KEY)
          ),
        {}
      ),
      collectionRouteMap: parseSetting(
        DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY,
        () =>
          parseDatabaseEngineCollectionRouteMapSetting(
            settingsMap?.get(DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY)
          ),
        {}
      ),
      backupSchedule: parseSetting(
        DATABASE_ENGINE_BACKUP_SCHEDULE_KEY,
        () =>
          parseDatabaseEngineBackupScheduleSetting(
            settingsMap?.get(DATABASE_ENGINE_BACKUP_SCHEDULE_KEY)
          ),
        DEFAULT_DATABASE_ENGINE_BACKUP_SCHEDULE
      ),
      operationControls: parseSetting(
        DATABASE_ENGINE_OPERATION_CONTROLS_KEY,
        () =>
          parseDatabaseEngineOperationControlsSetting(
            settingsMap?.get(DATABASE_ENGINE_OPERATION_CONTROLS_KEY)
          ),
        DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS
      ),
      errors,
      loggedErrors,
    };
  }, [settingsMap]);

  useEffect(() => {
    if (settingsMap) {
      setPolicy(parsedPersistedSettings.policy);
      setServiceRouteMap(parsedPersistedSettings.serviceRouteMap);
      setCollectionRouteMap(parsedPersistedSettings.collectionRouteMap);
      setBackupSchedule(parsedPersistedSettings.backupSchedule);
      setOperationControls(parsedPersistedSettings.operationControls);
      setValidationErrors(parsedPersistedSettings.errors);
      setIsDirty(false);
    }
  }, [parsedPersistedSettings, settingsMap]);

  useEffect(() => {
    if (parsedPersistedSettings.loggedErrors.length === 0) {
      lastValidationErrorSignatureRef.current = null;
      return;
    }

    const signature = parsedPersistedSettings.errors.join('::');
    if (lastValidationErrorSignatureRef.current === signature) return;
    lastValidationErrorSignatureRef.current = signature;

    parsedPersistedSettings.loggedErrors.forEach(
      ({ label, error }: { label: string; error: unknown }): void => {
        logClientError(error, {
          context: {
            source: 'useDatabaseEngineState',
            action: 'parsePersistedSettings',
            setting: label,
          },
        });
      }
    );
  }, [parsedPersistedSettings.errors, parsedPersistedSettings.loggedErrors]);

  const rows = useMemo<DatabaseCollectionRow[]>(() => {
    const data = schemaQuery.data;
    if (!data) return [];
    return [...data.collections]
      .map((collection: CollectionSchema): DatabaseCollectionRow => {
        const configuredProvider = collectionRouteMap[collection.name];
        return {
          name: collection.name,
          existsInMongo: true,
          mongoDocumentCount: collection.documentCount ?? null,
          mongoFieldCount: collection.fields.length,
          assignedProvider:
            configuredProvider === 'mongodb' || configuredProvider === 'redis'
              ? configuredProvider
              : 'auto',
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [collectionRouteMap, schemaQuery.data]);

  const handleSave = async () => {
    try {
      await updateSettingsBulk.mutateAsync([
        { key: DATABASE_ENGINE_POLICY_KEY, value: JSON.stringify(policy) },
        { key: DATABASE_ENGINE_SERVICE_ROUTE_MAP_KEY, value: JSON.stringify(serviceRouteMap) },
        {
          key: DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY,
          value: JSON.stringify(collectionRouteMap),
        },
        { key: DATABASE_ENGINE_BACKUP_SCHEDULE_KEY, value: JSON.stringify(backupSchedule) },
        { key: DATABASE_ENGINE_OPERATION_CONTROLS_KEY, value: JSON.stringify(operationControls) },
      ]);
      setIsDirty(false);
      toast('Database engine settings saved', { variant: 'success' });
    } catch (_error) {
      logClientError(_error);
      toast('Failed to save database engine settings', { variant: 'error' });
    }
  };

  return {
    engineStatus: engineStatusQuery.data,
    backupSchedulerStatus: backupSchedulerStatusQuery.data,
    operationsJobs: operationsJobsQuery.data,
    mongoSourceState: mongoSourceQuery.data,
    providerPreview: providerPreviewQuery.data,
    redisOverview: redisOverviewQuery.data,
    activeView,
    setActiveView,
    rows,
    isLoading:
      engineStatusQuery.isPending ||
      backupSchedulerStatusQuery.isPending ||
      operationsJobsQuery.isPending ||
      mongoSourceQuery.isPending ||
      settingsLoading,
    isSaving: updateSettingsBulk.isPending,
    policy,
    serviceRouteMap,
    collectionRouteMap,
    backupSchedule,
    operationControls,
    updatePolicy: (updates) => {
      setPolicy((prev) => ({ ...prev, ...updates }));
      setIsDirty(true);
    },
    updateServiceRoute: (service, provider) => {
      setServiceRouteMap((prev) => {
        const next = { ...prev };
        if (provider === 'auto') {
          delete next[service];
        } else {
          next[service] = provider;
        }
        return next;
      });
      setIsDirty(true);
    },
    updateCollectionRoute: (collection, provider) => {
      setCollectionRouteMap((prev) => {
        const next = { ...prev };
        if (provider === 'auto') {
          delete next[collection];
        } else {
          next[collection] = provider;
        }
        return next;
      });
      setIsDirty(true);
    },
    updateBackupSchedule: (updates) => {
      setBackupSchedule((prev) => ({ ...prev, ...updates }));
      setIsDirty(true);
    },
    updateOperationControls: (updates) => {
      setOperationControls((prev) => ({ ...prev, ...updates }));
      setIsDirty(true);
    },
    syncMongoSources: async (direction) => {
      const requestStartedAtMs = Date.now();
      try {
        const response = await syncMongoSourcesMutation.mutateAsync(direction);
        toast(response.message, { variant: 'success' });
        mongoSourceQuery.refetch().catch(() => undefined);
      } catch (error) {
        logClientError(error);
        const nextToast = await resolveMongoSyncToast(error, direction, requestStartedAtMs);
        toast(nextToast.message, { variant: nextToast.variant });
      }
    },
    saveSettings: handleSave,
    isDirty,
    refetchAll: () => {
      void engineStatusQuery.refetch();
      void backupSchedulerStatusQuery.refetch();
      void operationsJobsQuery.refetch();
      void mongoSourceQuery.refetch();
      void providerPreviewQuery.refetch();
      void schemaQuery.refetch();
      void redisOverviewQuery.refetch();
    },
    validationErrors,
    isSyncingMongoSources: syncMongoSourcesMutation.isPending,
  };
}
