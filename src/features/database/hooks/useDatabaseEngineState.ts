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
  UnifiedCollection
} from '@/shared/contracts/database';
import { useSettingsMap, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import {
  isValidDatabaseEngineBackupTimeUtc,
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
  type DatabaseEngineProvider,
  type DatabaseEngineServiceRoute,
  type DatabaseEngineBackupType,
} from '@/shared/lib/db/database-engine-constants';
import { normalizeDatabaseEngineOperationControls } from '@/shared/lib/db/database-engine-operation-controls';
import { useToast } from '@/shared/ui';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import {
  useAllCollectionsSchema,
  useDatabaseEngineOperationsJobs,
  useDatabaseBackupSchedulerStatus,
  useDatabaseEngineProviderPreview,
  useDatabaseEngineStatus,
  useRedisOverview,
} from '../hooks/useDatabaseQueries';

export type { DatabaseEngineWorkspaceView };

export type DatabaseCollectionRow = UnifiedCollection;

const services: DatabaseEngineServiceRoute[] = ['app', 'auth', 'product', 'integrations', 'cms'];

const parseServiceRouteMap = (raw: string | undefined): Partial<Record<DatabaseEngineServiceRoute, DatabaseEngineProvider>> => {
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

export interface UseDatabaseEngineStateReturn {
  workspaceView: DatabaseEngineWorkspaceView;
  setView: (view: DatabaseEngineWorkspaceView) => void;
  policyDraft: DatabaseEnginePolicy;
  setPolicyDraft: Dispatch<SetStateAction<DatabaseEnginePolicy>>;
  serviceRouteMapDraft: Partial<Record<DatabaseEngineServiceRoute, DatabaseEngineProvider>>;
  setServiceRouteMapDraft: Dispatch<SetStateAction<Partial<Record<DatabaseEngineServiceRoute, DatabaseEngineProvider>>>>;
  collectionRouteMapDraft: Record<string, DatabaseEngineProvider>;
  setCollectionRouteMapDraft: Dispatch<SetStateAction<Record<string, DatabaseEngineProvider>>>;
  backupScheduleDraft: DatabaseEngineBackupSchedule;
  setBackupScheduleDraft: Dispatch<SetStateAction<DatabaseEngineBackupSchedule>>;
  operationControlsDraft: DatabaseEngineOperationControls;
  setOperationControlsDraft: Dispatch<SetStateAction<DatabaseEngineOperationControls>>;
  rows: DatabaseCollectionRow[];
  validationErrors: string[];
  saveConfiguration: () => Promise<void>;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => void;
  engineStatus: DatabaseEngineStatus | undefined;
  operationJobs: DatabaseEngineOperationJob[];
  operationQueueStatus: DatabaseEngineOperationsJobs['queueStatus'] | null;
  backupSchedulerStatus: DatabaseEngineBackupSchedulerStatus | undefined;
  redisOverview: RedisOverview | undefined;
  providerPreview: DatabaseEngineProviderPreview | undefined;
  saving: boolean;
}

export function useDatabaseEngineState(): UseDatabaseEngineStateReturn {
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
  
  const [workspaceView, setWorkspaceView] = useState<DatabaseEngineWorkspaceView>(
    (searchParams.get('view') as DatabaseEngineWorkspaceView) || 'engine'
  );

  const policyFromSettings = useMemo(() => 
    parseJsonSetting<DatabaseEnginePolicy>(settingsQuery.data?.get(DATABASE_ENGINE_POLICY_KEY), DEFAULT_DATABASE_ENGINE_POLICY),
  [settingsQuery.data]
  );

  const serviceRouteMapFromSettings = useMemo(() => 
    parseServiceRouteMap(settingsQuery.data?.get(DATABASE_ENGINE_SERVICE_ROUTE_MAP_KEY)),
  [settingsQuery.data]
  );

  const collectionRouteMapFromSettings = useMemo(() => 
    parseCollectionRouteMap(settingsQuery.data?.get(DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY)),
  [settingsQuery.data]
  );

  const backupScheduleFromSettings = useMemo(() => 
    normalizeDatabaseEngineBackupSchedule(settingsQuery.data?.get(DATABASE_ENGINE_BACKUP_SCHEDULE_KEY)),
  [settingsQuery.data]
  );

  const operationControlsFromSettings = useMemo(() => 
    normalizeDatabaseEngineOperationControls(settingsQuery.data?.get(DATABASE_ENGINE_OPERATION_CONTROLS_KEY) ?? DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS),
  [settingsQuery.data]
  );

  const [policyDraft, setPolicyDraft] = useState<DatabaseEnginePolicy>(policyFromSettings);
  const [serviceRouteMapDraft, setServiceRouteMapDraft] = useState(serviceRouteMapFromSettings);
  const [collectionRouteMapDraft, setCollectionRouteMapDraft] = useState(collectionRouteMapFromSettings);
  const [backupScheduleDraft, setBackupScheduleDraft] = useState(backupScheduleFromSettings);
  const [operationControlsDraft, setOperationControlsDraft] = useState(operationControlsFromSettings);

  useEffect(() => {
    setPolicyDraft(policyFromSettings);
    setServiceRouteMapDraft(serviceRouteMapFromSettings);
    setCollectionRouteMapDraft(collectionRouteMapFromSettings);
    setBackupScheduleDraft(backupScheduleFromSettings);
    setOperationControlsDraft(operationControlsFromSettings);
  }, [policyFromSettings, serviceRouteMapFromSettings, collectionRouteMapFromSettings, backupScheduleFromSettings, operationControlsFromSettings]);

  const rows = useMemo<DatabaseCollectionRow[]>(() => {
    const data = schemaQuery.data;
    if (!data) return [];
    const byName = new Map<string, DatabaseCollectionRow>();
    data.collections.forEach((collection) => {
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
          mongoDocumentCount: isMongo ? collection.documentCount ?? null : null,
          prismaRowCount: isMongo ? null : collection.documentCount ?? null,
          mongoFieldCount: isMongo ? collection.fields.length : null,
          prismaFieldCount: isMongo ? null : collection.fields.length,
          assignedProvider: 'auto',
        };
        byName.set(collection.name, newRow);
      }
    });
    return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [schemaQuery.data]);

  const providerPreviewQuery = useDatabaseEngineProviderPreview(
    rows.length > 0 ? rows.map((r) => r.name) : undefined
  );

  const validationErrors = useMemo(() => {
    const issues: string[] = [];
    const validateTarget = (dbType: DatabaseEngineBackupType): void => {
      const target = backupScheduleDraft[dbType];
      if (!backupScheduleDraft.schedulerEnabled || !target.enabled) return;
      if (!isValidDatabaseEngineBackupTimeUtc(target.timeUtc)) {
        issues.push(`${dbType} schedule time must be HH:MM (UTC).`);
      }
    };
    validateTarget('mongodb');
    validateTarget('postgresql');
    return issues;
  }, [backupScheduleDraft]);

  const saveConfiguration = async () => {
    if (validationErrors.length > 0) {
      toast(validationErrors[0] ?? 'Validation failed', { variant: 'error' });
      return;
    }
    try {
      await updateSettingsBulk.mutateAsync([
        { key: DATABASE_ENGINE_POLICY_KEY, value: JSON.stringify(policyDraft) },
        { key: DATABASE_ENGINE_SERVICE_ROUTE_MAP_KEY, value: JSON.stringify(serviceRouteMapDraft) },
        { key: DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY, value: JSON.stringify(collectionRouteMapDraft) },
        { key: DATABASE_ENGINE_BACKUP_SCHEDULE_KEY, value: JSON.stringify(backupScheduleDraft) },
        { key: DATABASE_ENGINE_OPERATION_CONTROLS_KEY, value: JSON.stringify(operationControlsDraft) },
      ]);
      toast('Configuration saved.', { variant: 'success' });
    } catch (_e) {
      toast('Failed to save configuration.', { variant: 'error' });
    }
  };

  const setView = useCallback((nextView: DatabaseEngineWorkspaceView) => {
    setWorkspaceView(nextView);
    const params = new URLSearchParams(searchParams.toString());
    if (nextView === 'engine') params.delete('view');
    else params.set('view', nextView);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  return {
    workspaceView,
    setView,
    policyDraft,
    setPolicyDraft,
    serviceRouteMapDraft,
    setServiceRouteMapDraft,
    collectionRouteMapDraft,
    setCollectionRouteMapDraft,
    backupScheduleDraft,
    setBackupScheduleDraft,
    operationControlsDraft,
    setOperationControlsDraft,
    rows,
    validationErrors,
    saveConfiguration,
    isLoading: settingsQuery.isLoading || schemaQuery.isLoading,
    isFetching: settingsQuery.isFetching || schemaQuery.isFetching,
    refetch: () => {
      void settingsQuery.refetch();
      void schemaQuery.refetch();
      void redisQuery.refetch();
      void engineStatusQuery.refetch();
      void backupSchedulerStatusQuery.refetch();
      void operationsJobsQuery.refetch();
    },
    engineStatus: engineStatusQuery.data,
    operationJobs: operationsJobsQuery.data?.jobs ?? [],
    operationQueueStatus: operationsJobsQuery.data?.queueStatus ?? null,
    backupSchedulerStatus: backupSchedulerStatusQuery.data,
    redisOverview: redisQuery.data,
    providerPreview: providerPreviewQuery.data,
    saving: updateSettingsBulk.isPending,
  };
}
