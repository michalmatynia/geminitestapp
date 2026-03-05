'use client';

import React, { createContext, useContext } from 'react';

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

const DatabaseBackupsStateContext = createContext<DatabaseBackupsStateContextValue | null>(null);
const DatabaseBackupsActionsContext = createContext<DatabaseBackupsActionsContextValue | null>(
  null
);

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

export function useDatabaseBackupsStateContext(): DatabaseBackupsStateContextValue {
  const context = useContext(DatabaseBackupsStateContext);
  if (!context) {
    throw new Error(
      'useDatabaseBackupsStateContext must be used within a DatabaseBackupsProvider'
    );
  }
  return context;
}

export function useDatabaseBackupsActionsContext(): DatabaseBackupsActionsContextValue {
  const context = useContext(DatabaseBackupsActionsContext);
  if (!context) {
    throw new Error(
      'useDatabaseBackupsActionsContext must be used within a DatabaseBackupsProvider'
    );
  }
  return context;
}
