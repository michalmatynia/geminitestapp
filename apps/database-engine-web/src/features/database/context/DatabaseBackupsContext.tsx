'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import { useDatabaseBackupsState } from '../hooks/useDatabaseBackupsState';

type DatabaseBackupsContextValue = ReturnType<typeof useDatabaseBackupsState>;

export type DatabaseBackupsStateContextValue = Omit<
  DatabaseBackupsContextValue,
  | 'setActiveTab'
  | 'setBackupToDelete'
  | 'setIsRestoreModalOpen'
  | 'setSelectedBackupForRestore'
  | 'closeLogModal'
  | 'handleBackup'
  | 'handleUpload'
  | 'handleRestoreRequest'
  | 'handleRestoreConfirm'
  | 'handleDeleteRequest'
  | 'handleConfirmDelete'
  | 'handlePreview'
  | 'handlePreviewCurrent'
  | 'handleSchedulerEnabledDraftChange'
  | 'handleRepeatSchedulerTickDraftChange'
  | 'handleActiveTargetEnabledDraftChange'
  | 'handleActiveTargetTimeLocalChange'
  | 'saveDailySchedule'
>;

export type DatabaseBackupsActionsContextValue = Pick<
  DatabaseBackupsContextValue,
  | 'setActiveTab'
  | 'setBackupToDelete'
  | 'setIsRestoreModalOpen'
  | 'setSelectedBackupForRestore'
  | 'closeLogModal'
  | 'handleBackup'
  | 'handleUpload'
  | 'handleRestoreRequest'
  | 'handleRestoreConfirm'
  | 'handleDeleteRequest'
  | 'handleConfirmDelete'
  | 'handlePreview'
  | 'handlePreviewCurrent'
  | 'handleSchedulerEnabledDraftChange'
  | 'handleRepeatSchedulerTickDraftChange'
  | 'handleActiveTargetEnabledDraftChange'
  | 'handleActiveTargetTimeLocalChange'
  | 'saveDailySchedule'
>;

const {
  Context: DatabaseBackupsStateContext,
  useStrictContext: useDatabaseBackupsStateContext,
} = createStrictContext<DatabaseBackupsStateContextValue>({
  hookName: 'useDatabaseBackupsStateContext',
  providerName: 'a DatabaseBackupsProvider',
  displayName: 'DatabaseBackupsStateContext',
  errorFactory: internalError,
});

const {
  Context: DatabaseBackupsActionsContext,
  useStrictContext: useDatabaseBackupsActionsContext,
} = createStrictContext<DatabaseBackupsActionsContextValue>({
  hookName: 'useDatabaseBackupsActionsContext',
  providerName: 'a DatabaseBackupsProvider',
  displayName: 'DatabaseBackupsActionsContext',
  errorFactory: internalError,
});

export { useDatabaseBackupsStateContext, useDatabaseBackupsActionsContext };

export function DatabaseBackupsProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const state = useDatabaseBackupsState();
  const {
    setActiveTab,
    setBackupToDelete,
    setIsRestoreModalOpen,
    setSelectedBackupForRestore,
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
    ...stateValue
  } = state;

  const actionsValue: DatabaseBackupsActionsContextValue = {
    setActiveTab,
    setBackupToDelete,
    setIsRestoreModalOpen,
    setSelectedBackupForRestore,
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

  return (
    <DatabaseBackupsActionsContext.Provider value={actionsValue}>
      <DatabaseBackupsStateContext.Provider value={stateValue}>
        {children}
      </DatabaseBackupsStateContext.Provider>
    </DatabaseBackupsActionsContext.Provider>
  );
}
