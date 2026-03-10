'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';

import type {
  DatabaseEngineStatus,
  DatabaseEngineOperationsJobs,
  DatabaseEngineBackupSchedulerStatus,
  RedisOverview,
  DatabaseEngineProviderPreview,
  DatabaseEngineWorkspaceView,
  UnifiedCollection,
  CollectionSchema,
} from '@/shared/contracts/database';
import { useSettingsMap, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
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
import { useToast } from '@/shared/ui';
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
  useDatabaseEngineProviderPreview,
  useDatabaseEngineStatus,
  useAllCollectionsSchema,
  useRedisOverview,
} from '../hooks/useDatabaseQueries';

export interface DatabaseCollectionRow extends UnifiedCollection {
  assignedProvider: 'mongodb' | 'prisma' | 'auto';
}

export interface UseDatabaseEngineStateReturn {
  engineStatus: DatabaseEngineStatus | undefined;
  backupSchedulerStatus: DatabaseEngineBackupSchedulerStatus | undefined;
  operationsJobs: DatabaseEngineOperationsJobs | undefined;
  providerPreview: DatabaseEngineProviderPreview | undefined;
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
  saveSettings: () => Promise<void>;
  isDirty: boolean;
  refetchAll: () => void;
  validationErrors: string[];
}

export function useDatabaseEngineState(): UseDatabaseEngineStateReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const engineStatusQuery = useDatabaseEngineStatus();
  const backupSchedulerStatusQuery = useDatabaseBackupSchedulerStatus();
  const operationsJobsQuery = useDatabaseEngineOperationsJobs(30);
  const providerPreviewQuery = useDatabaseEngineProviderPreview();
  const redisOverviewQuery = useRedisOverview();
  const schemaQuery = useAllCollectionsSchema();

  const activeView = (searchParams.get('view') as DatabaseEngineWorkspaceView) || 'engine';

  const setActiveView = useCallback(
    (view: DatabaseEngineWorkspaceView) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('view', view);
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  const { data: settingsMap, isPending: settingsLoading } = useSettingsMap({ scope: 'all' });

  const updateSettingsBulk = useUpdateSettingsBulk();

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

  const parsedPersistedSettings = useMemo(() => {
    const errors: string[] = [];
    const loggedErrors: Array<{ label: string; error: unknown }> = [];

    const parseSetting = <T>(label: string, parser: () => T, fallback: T): T => {
      try {
        return parser();
      } catch (error) {
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
    const byName = new Map<string, DatabaseCollectionRow>();
    data.collections.forEach((collection: CollectionSchema) => {
      const existing = byName.get(collection.name);
      const isMongo = collection.provider === 'mongodb';
      if (existing) {
        if (isMongo) {
          existing.existsInMongo = true;
          existing.mongoDocumentCount = collection.documentCount ?? null;
          existing.mongoFieldCount = collection.fields.length;
        } else {
          existing.existsInPrisma = true;
          existing.prismaRowCount = collection.documentCount ?? null;
          existing.prismaFieldCount = collection.fields.length;
        }
      } else {
        const newRow: DatabaseCollectionRow = {
          name: collection.name,
          existsInMongo: isMongo,
          existsInPrisma: !isMongo,
          mongoDocumentCount: isMongo ? (collection.documentCount ?? null) : null,
          prismaRowCount: isMongo ? null : (collection.documentCount ?? null),
          mongoFieldCount: isMongo ? collection.fields.length : null,
          prismaFieldCount: isMongo ? null : collection.fields.length,
          assignedProvider: 'auto',
        };
        byName.set(collection.name, newRow);
      }
    });
    return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [schemaQuery.data]);

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
      toast('Failed to save database engine settings', { variant: 'error' });
    }
  };

  return {
    engineStatus: engineStatusQuery.data,
    backupSchedulerStatus: backupSchedulerStatusQuery.data,
    operationsJobs: operationsJobsQuery.data,
    providerPreview: providerPreviewQuery.data,
    redisOverview: redisOverviewQuery.data,
    activeView,
    setActiveView,
    rows,
    isLoading:
      engineStatusQuery.isPending ||
      backupSchedulerStatusQuery.isPending ||
      operationsJobsQuery.isPending ||
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
    saveSettings: handleSave,
    isDirty,
    refetchAll: () => {
      void engineStatusQuery.refetch();
      void backupSchedulerStatusQuery.refetch();
      void operationsJobsQuery.refetch();
      void providerPreviewQuery.refetch();
      void schemaQuery.refetch();
      void redisOverviewQuery.refetch();
    },
    validationErrors,
  };
}
