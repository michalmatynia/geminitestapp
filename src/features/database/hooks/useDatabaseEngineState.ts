'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useMemo, useCallback, useEffect, Dispatch, SetStateAction } from 'react';

import type {
  DatabaseEngineStatus,
  DatabaseEngineOperationJob,
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
  normalizeDatabaseEngineBackupSchedule,
} from '@/shared/lib/db/database-engine-backup-schedule';
import {
  DATABASE_ENGINE_BACKUP_SCHEDULE_KEY,
  DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY,
  DATABASE_ENGINE_OPERATION_CONTROLS_KEY,
  DATABASE_ENGINE_POLICY_KEY,
  DATABASE_ENGINE_SERVICE_ROUTE_MAP_KEY,
  DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS,
  DEFAULT_DATABASE_ENGINE_POLICY,
  type DatabaseEngineBackupSchedule,
  type DatabaseEngineOperationControls,
  type DatabaseEnginePolicy,
} from '@/shared/lib/db/database-engine-constants';
import { useToast } from '@/shared/ui';
import { parseJsonSetting } from '@/shared/utils/settings-json';

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
  // Legacy aliases kept for backward compatibility with existing page components.
  policyDraft: DatabaseEnginePolicy;
  setPolicyDraft: Dispatch<SetStateAction<DatabaseEnginePolicy>>;
  collectionRouteMapDraft: Record<string, string>;
  setCollectionRouteMapDraft: Dispatch<SetStateAction<Record<string, string>>>;
  operationJobs: DatabaseEngineOperationJob[];
  workspaceView: DatabaseEngineWorkspaceView;
  setView: (view: DatabaseEngineWorkspaceView) => void;
  isFetching: boolean;
  validationErrors: string[];
  saveConfiguration: () => Promise<void>;
  refetch: () => void;
  saving: boolean;
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
    normalizeDatabaseEngineBackupSchedule(null)
  );
  const [operationControls, setOperationControls] = useState<DatabaseEngineOperationControls>(
    DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS
  );

  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (settingsMap) {
      setPolicy(
        parseJsonSetting(settingsMap.get(DATABASE_ENGINE_POLICY_KEY), DEFAULT_DATABASE_ENGINE_POLICY)
      );
      setServiceRouteMap(
        parseJsonSetting(settingsMap.get(DATABASE_ENGINE_SERVICE_ROUTE_MAP_KEY), {})
      );
      setCollectionRouteMap(
        parseJsonSetting(settingsMap.get(DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY), {})
      );
      setBackupSchedule(
        normalizeDatabaseEngineBackupSchedule(settingsMap.get(DATABASE_ENGINE_BACKUP_SCHEDULE_KEY))
      );
      setOperationControls(
        parseJsonSetting(
          settingsMap.get(DATABASE_ENGINE_OPERATION_CONTROLS_KEY),
          DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS
        )
      );
      setIsDirty(false);
    }
  }, [settingsMap]);

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
        { key: DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY, value: JSON.stringify(collectionRouteMap) },
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
      setServiceRouteMap((prev) => ({ ...prev, [service]: provider }));
      setIsDirty(true);
    },
    updateCollectionRoute: (collection, provider) => {
      setCollectionRouteMap((prev) => ({ ...prev, [collection]: provider }));
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
    // Legacy aliases
    policyDraft: policy,
    setPolicyDraft: setPolicy,
    collectionRouteMapDraft: collectionRouteMap,
    setCollectionRouteMapDraft: setCollectionRouteMap,
    operationJobs: operationsJobsQuery.data?.jobs ?? [],
    workspaceView: activeView,
    setView: setActiveView,
    isFetching:
      engineStatusQuery.isFetching ||
      backupSchedulerStatusQuery.isFetching ||
      operationsJobsQuery.isFetching ||
      schemaQuery.isFetching ||
      redisOverviewQuery.isFetching,
    validationErrors: [],
    saveConfiguration: handleSave,
    refetch: () => {
      void engineStatusQuery.refetch();
      void backupSchedulerStatusQuery.refetch();
      void operationsJobsQuery.refetch();
      void providerPreviewQuery.refetch();
      void schemaQuery.refetch();
      void redisOverviewQuery.refetch();
    },
    saving: updateSettingsBulk.isPending,
  };
}
