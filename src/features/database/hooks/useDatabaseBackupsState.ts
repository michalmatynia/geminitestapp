'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { DatabaseBackupResponse, DatabaseInfo, DatabaseRestoreResponse, DatabaseType } from '@/shared/contracts/database';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { isValidDatabaseEngineBackupTimeUtc } from '@/shared/lib/db/database-engine-backup-schedule';
import {
  DATABASE_ENGINE_BACKUP_SCHEDULE_KEY,
  DATABASE_ENGINE_OPERATION_CONTROLS_KEY,
  DEFAULT_DATABASE_ENGINE_BACKUP_SCHEDULE,
  DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS,
  type DatabaseEngineBackupType,
} from '@/shared/lib/db/database-engine-constants';
import { localHmToUtcHm, utcHmToLocalHm } from '@/shared/lib/db/utils/backup-schedule-time';
import type { FileUploadHelpers } from '@/shared/contracts/ui/ui/base';
import { useToast } from '@/shared/ui/primitives.public';
import {
  logClientCatch,
  logClientError,
} from '@/shared/utils/observability/client-error-logger';

import {
  parseDatabaseEngineBackupScheduleSetting,
  parseDatabaseEngineOperationControlsSetting,
} from './database-engine-settings-parsing';
import {
  useCreateBackupMutation,
  useDatabaseBackups,
  useDeleteBackupMutation,
  useRestoreBackupMutation,
  useUploadBackupMutation,
} from '../hooks/useDatabaseQueries';

export function useDatabaseBackupsState() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DatabaseType>('mongodb');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logModalContent, setLogModalContent] = useState('');
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<string | null>(null);
  const [backupToDelete, setBackupToDelete] = useState<string | null>(null);
  const [schedulerEnabledDraft, setSchedulerEnabledDraft] = useState(false);
  const [repeatTickEnabledDraft, setRepeatTickEnabledDraft] = useState(false);
  const [activeTargetEnabledDraft, setActiveTargetEnabledDraft] = useState(false);
  const [activeTargetTimeLocalDraft, setActiveTargetTimeLocalDraft] = useState('02:00');

  const { toast } = useToast();
  const isProd = process.env['NODE_ENV'] === 'production';
  const settingsQuery = useSettingsMap({ scope: 'all' });
  const updateSetting = useUpdateSetting();
  const lastSettingsValidationSignatureRef = useRef<string | null>(null);

  const backupsQuery = useDatabaseBackups(activeTab);
  const data = useMemo(() => backupsQuery.data ?? [], [backupsQuery.data]);

  const createBackup = useCreateBackupMutation();
  const restoreBackup = useRestoreBackupMutation();
  const uploadBackup = useUploadBackupMutation();
  const deleteBackup = useDeleteBackupMutation();

  const readPayload = <T,>(result: { payload: T | unknown }): T => result.payload as T;

  const parsedSettings = useMemo(() => {
    const errors: string[] = [];
    const loggedErrors: unknown[] = [];

    const parseSetting = <T>(parser: () => T, fallback: T): T => {
      try {
        return parser();
      } catch (error) {
        logClientError(error);
        errors.push(error instanceof Error ? error.message : 'Invalid backup settings payload.');
        loggedErrors.push(error);
        return fallback;
      }
    };

    return {
      operationControls: parseSetting(
        () =>
          parseDatabaseEngineOperationControlsSetting(
            settingsQuery.data?.get(DATABASE_ENGINE_OPERATION_CONTROLS_KEY)
          ),
        DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS
      ),
      backupSchedule: parseSetting(
        () =>
          parseDatabaseEngineBackupScheduleSetting(
            settingsQuery.data?.get(DATABASE_ENGINE_BACKUP_SCHEDULE_KEY)
          ),
        DEFAULT_DATABASE_ENGINE_BACKUP_SCHEDULE
      ),
      errors,
      loggedErrors,
    };
  }, [settingsQuery.data]);

  const operationControls = parsedSettings.operationControls;
  const backupSchedule = parsedSettings.backupSchedule;
  const settingsValidationErrors = parsedSettings.errors;

  const backupRunNowAllowed = operationControls.allowManualBackupRunNow;
  const backupMaintenanceAllowed = operationControls.allowManualBackupMaintenance;
  const schedulerEnabled = backupSchedule.schedulerEnabled;
  const repeatSchedulerTickEnabled = backupSchedule.repeatTickEnabled;
  const isBackupScheduleSaving = updateSetting.isPending;
  const activeTargetKey: DatabaseEngineBackupType = 'mongodb';
  const activeTargetSchedule = backupSchedule[activeTargetKey];
  const activeTargetTimeLocalCurrent = useMemo(
    () => utcHmToLocalHm(activeTargetSchedule.timeUtc) ?? activeTargetSchedule.timeUtc,
    [activeTargetSchedule.timeUtc]
  );
  const activeTargetTimeLocalDraftValid = isValidDatabaseEngineBackupTimeUtc(
    activeTargetTimeLocalDraft
  );

  useEffect(() => {
    setSchedulerEnabledDraft(backupSchedule.schedulerEnabled);
    setRepeatTickEnabledDraft(backupSchedule.repeatTickEnabled);
    setActiveTargetEnabledDraft(activeTargetSchedule.enabled);
    setActiveTargetTimeLocalDraft(activeTargetTimeLocalCurrent);
  }, [
    backupSchedule.schedulerEnabled,
    backupSchedule.repeatTickEnabled,
    activeTargetSchedule.enabled,
    activeTargetTimeLocalCurrent,
  ]);

  useEffect(() => {
    if (parsedSettings.loggedErrors.length === 0) {
      lastSettingsValidationSignatureRef.current = null;
      return;
    }

    const signature = settingsValidationErrors.join('::');
    if (lastSettingsValidationSignatureRef.current === signature) return;
    lastSettingsValidationSignatureRef.current = signature;

    parsedSettings.loggedErrors.forEach((error: unknown): void => {
      logClientError(error, {
        context: {
          source: 'useDatabaseBackupsState',
          action: 'parsePersistedSettings',
        },
      });
    });

    toast(settingsValidationErrors[0] ?? 'Invalid database backup settings payload.', {
      variant: 'error',
    });
  }, [parsedSettings.loggedErrors, settingsValidationErrors, toast]);

  const isBackupScheduleDirty = useMemo(
    () =>
      schedulerEnabledDraft !== backupSchedule.schedulerEnabled ||
      repeatTickEnabledDraft !== backupSchedule.repeatTickEnabled ||
      activeTargetEnabledDraft !== activeTargetSchedule.enabled ||
      activeTargetTimeLocalDraft !== activeTargetTimeLocalCurrent,
    [
      schedulerEnabledDraft,
      backupSchedule.schedulerEnabled,
      repeatTickEnabledDraft,
      backupSchedule.repeatTickEnabled,
      activeTargetEnabledDraft,
      activeTargetSchedule.enabled,
      activeTargetTimeLocalDraft,
      activeTargetTimeLocalCurrent,
    ]
  );

  const openLogModal = useCallback((content: string): void => {
    setLogModalContent(content);
    setIsLogModalOpen(true);
  }, []);

  const closeLogModal = useCallback((): void => {
    setIsLogModalOpen(false);
    setLogModalContent('');
  }, []);

  const handleRestoreRequest = useCallback((backup: DatabaseInfo): void => {
    setSelectedBackupForRestore(backup.name);
    setIsRestoreModalOpen(true);
  }, []);

  const handleRestoreConfirm = async (truncate: boolean): Promise<void> => {
    const backupName = selectedBackupForRestore;
    setIsRestoreModalOpen(false);
    setSelectedBackupForRestore(null);

    if (!backupName) return;

    try {
      const result = await restoreBackup.mutateAsync({
        dbType: activeTab,
        backupName,
        truncateBeforeRestore: truncate,
      });
      const { ok } = result;
      const payload = readPayload<DatabaseRestoreResponse>(result);
      const log = String(payload.log ?? 'No log available.');

      if (ok) {
        openLogModal(
          `${payload.message ?? 'Backup restored successfully.'}

---LOG---
${log}`
        );
      } else {
        const meta = [
          payload.errorId ? `Error ID: ${payload.errorId}` : null,
          payload.stage ? `Stage: ${payload.stage}` : null,
          payload.backupName ? `Backup: ${payload.backupName}` : null,
        ]
          .filter(Boolean)
          .join('\n');

        openLogModal(
          `${payload.error ?? 'Failed to restore backup.'}${
            meta
              ? `

${meta}`
              : ''
          }

---LOG---
${log}`
        );
      }
    } catch (error: unknown) {
      logClientCatch(error, {
        source: 'DatabaseBackupsPanel',
        action: 'restoreBackup',
        backupName,
        dbType: activeTab,
      });
      openLogModal(`An error occurred during restoration.

${String(error)}`);
    }
  };

  const handleBackup = async (): Promise<void> => {
    try {
      const result = await createBackup.mutateAsync(activeTab);
      const { ok } = result;
      const payload = readPayload<DatabaseBackupResponse>(result);
      const log = String(payload.log ?? 'No log available.');
      if (ok) {
        if (payload.jobId) {
          toast(payload.message ?? `Database backup job queued (job: ${payload.jobId}).`, {
            variant: 'success',
          });
          return;
        }

        if (payload.warning) {
          openLogModal(`${payload.message ?? 'Backup created'}: ${payload.warning}

---LOG---
${log}`);
        } else {
          openLogModal(`${payload.message ?? 'Backup created successfully.'}

---LOG---
${log}`);
        }
      } else {
        openLogModal(`${payload.error ?? 'Failed to create backup.'}

---LOG---
${log}`);
      }
    } catch (error: unknown) {
      logClientCatch(error, {
        source: 'DatabaseBackupsPanel',
        action: 'createBackup',
        dbType: activeTab,
      });
      openLogModal(`An error occurred during backup.

${String(error)}`);
    }
  };

  const handleDeleteRequest = useCallback((backupName: string): void => {
    setBackupToDelete(backupName);
  }, []);

  const handleConfirmDelete = async (): Promise<void> => {
    if (!backupToDelete) return;
    try {
      const result = await deleteBackup.mutateAsync({
        dbType: activeTab,
        backupName: backupToDelete,
      });
      if (result.ok) {
        toast('Backup deleted successfully.', { variant: 'success' });
      } else {
        toast('Failed to delete backup.', { variant: 'error' });
      }
    } catch (error: unknown) {
      logClientCatch(error, {
        source: 'DatabaseBackupsPanel',
        action: 'deleteBackup',
        backupName: backupToDelete,
        dbType: activeTab,
      });
      toast('An error occurred during deletion.', { variant: 'error' });
    } finally {
      setBackupToDelete(null);
    }
  };

  const handleUpload = async (files: File[], helpers?: FileUploadHelpers): Promise<void> => {
    const file = files[0];
    if (!file) return;

    try {
      const result = await uploadBackup.mutateAsync({
        dbType: activeTab,
        file,
        onProgress: (loaded: number, total?: number) => helpers?.reportProgress(loaded, total),
      });
      if (result.ok) {
        toast('Backup uploaded successfully.', { variant: 'success' });
      } else {
        toast('Failed to upload backup.', { variant: 'error' });
      }
    } catch (error: unknown) {
      logClientCatch(error, {
        source: 'DatabaseBackupsPanel',
        action: 'uploadBackup',
        filename: file.name,
        dbType: activeTab,
      });
      toast('An error occurred during upload.', { variant: 'error' });
    }
  };

  const handlePreview = (backupName: string): void => {
    const url = `/admin/databases/preview?backup=${encodeURIComponent(backupName)}&type=${activeTab}`;
    router.push(url);
  };

  const handlePreviewCurrent = (): void => {
    router.push(`/admin/databases/preview?mode=current&type=${activeTab}`);
  };

  const handleSchedulerEnabledDraftChange = useCallback((enabled: boolean): void => {
    setSchedulerEnabledDraft(enabled);
  }, []);

  const handleRepeatSchedulerTickDraftChange = useCallback((enabled: boolean): void => {
    setRepeatTickEnabledDraft(enabled);
  }, []);

  const handleActiveTargetEnabledDraftChange = useCallback((enabled: boolean): void => {
    setActiveTargetEnabledDraft(enabled);
  }, []);

  const handleActiveTargetTimeLocalChange = useCallback((value: string): void => {
    setActiveTargetTimeLocalDraft(value);
  }, []);

  const saveDailySchedule = useCallback(async (): Promise<void> => {
    if (!isValidDatabaseEngineBackupTimeUtc(activeTargetTimeLocalDraft)) {
      toast('Backup time must be a valid HH:MM value.', { variant: 'error' });
      return;
    }

    const nextTimeUtc = localHmToUtcHm(activeTargetTimeLocalDraft);
    if (!nextTimeUtc) {
      toast('Failed to convert local backup time to UTC.', { variant: 'error' });
      return;
    }

    const activeTargetNext = {
      ...activeTargetSchedule,
      enabled: activeTargetEnabledDraft,
      cadence: 'daily' as const,
      intervalDays: 1,
      timeUtc: nextTimeUtc,
    };
    const nextSchedule = {
      ...backupSchedule,
      schedulerEnabled: schedulerEnabledDraft,
      repeatTickEnabled: repeatTickEnabledDraft,
      mongodb: activeTargetNext,
    };

    try {
      await updateSetting.mutateAsync({
        key: DATABASE_ENGINE_BACKUP_SCHEDULE_KEY,
        value: JSON.stringify(nextSchedule),
      });
      await settingsQuery.refetch();
      void fetch('/api/databases/engine/backup-scheduler/status', {
        method: 'GET',
        cache: 'no-store',
      });
      toast('Backup schedule saved.', { variant: 'success' });
    } catch (error: unknown) {
      logClientCatch(error, {
        source: 'DatabaseBackupsPanel',
        action: 'saveDailySchedule',
        setting: 'database_engine_backup_schedule_v1',
        dbType: activeTargetKey,
      });
      toast('Failed to save backup schedule.', { variant: 'error' });
    }
  }, [
    activeTargetTimeLocalDraft,
    toast,
    activeTargetSchedule,
    activeTargetEnabledDraft,
    activeTargetKey,
    backupSchedule,
    schedulerEnabledDraft,
    repeatTickEnabledDraft,
    updateSetting,
    settingsQuery,
  ]);

  return {
    activeTab,
    setActiveTab,
    isLogModalOpen,
    logModalContent,
    isRestoreModalOpen,
    selectedBackupForRestore,
    backupToDelete,
    setBackupToDelete,
    setIsRestoreModalOpen,
    setSelectedBackupForRestore,
    data,
    isLoading: backupsQuery.isFetching,
    isProd,
    backupRunNowAllowed,
    backupMaintenanceAllowed,
    schedulerEnabled,
    repeatSchedulerTickEnabled,
    schedulerEnabledDraft,
    repeatTickEnabledDraft,
    activeTargetEnabledDraft,
    activeTargetTimeLocalDraft,
    activeTargetTimeLocalDraftValid,
    isBackupScheduleDirty,
    activeTargetKey,
    isBackupScheduleSaving,
    settingsValidationErrors,
    closeLogModal,
    handleBackup,
    handleUpload,
    handleRestoreRequest,
    handleRestoreConfirm,
    handleDeleteRequest,
    handleConfirmDelete,
    handlePreview,
    handlePreviewCurrent,
    handleSchedulerEnabledDraftChange,
    handleRepeatSchedulerTickDraftChange,
    handleActiveTargetEnabledDraftChange,
    handleActiveTargetTimeLocalChange,
    saveDailySchedule,
  };
}
