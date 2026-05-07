// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DatabaseBackupsProvider,
  useDatabaseBackupsActionsContext,
  useDatabaseBackupsStateContext,
} from './DatabaseBackupsContext';

const mocks = vi.hoisted(() => ({
  useDatabaseBackupsState: vi.fn(),
}));

vi.mock('../hooks/useDatabaseBackupsState', () => ({
  useDatabaseBackupsState: () => mocks.useDatabaseBackupsState(),
}));

describe('DatabaseBackupsContext', () => {
  beforeEach(() => {
    mocks.useDatabaseBackupsState.mockReturnValue({
      activeTab: 'backups',
      backupToDelete: null,
      backups: [],
      closeLogModal: vi.fn(),
      handleActiveTargetEnabledDraftChange: vi.fn(),
      handleActiveTargetTimeLocalChange: vi.fn(),
      handleBackup: vi.fn(),
      handleConfirmDelete: vi.fn(),
      handleDeleteRequest: vi.fn(),
      handlePreview: vi.fn(),
      handlePreviewCurrent: vi.fn(),
      handleRepeatSchedulerTickDraftChange: vi.fn(),
      handleRestoreConfirm: vi.fn(),
      handleRestoreRequest: vi.fn(),
      handleSchedulerEnabledDraftChange: vi.fn(),
      handleUpload: vi.fn(),
      isRestoreModalOpen: false,
      saveDailySchedule: vi.fn(),
      selectedBackupForRestore: null,
      setActiveTab: vi.fn(),
      setBackupToDelete: vi.fn(),
      setIsRestoreModalOpen: vi.fn(),
      setSelectedBackupForRestore: vi.fn(),
    });
  });

  it('throws when strict hooks are used outside the provider', () => {
    expect(() => renderHook(() => useDatabaseBackupsStateContext())).toThrow(
      'useDatabaseBackupsStateContext must be used within a DatabaseBackupsProvider'
    );
    expect(() => renderHook(() => useDatabaseBackupsActionsContext())).toThrow(
      'useDatabaseBackupsActionsContext must be used within a DatabaseBackupsProvider'
    );
  });

  it('splits state and actions inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DatabaseBackupsProvider>{children}</DatabaseBackupsProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useDatabaseBackupsActionsContext(),
        state: useDatabaseBackupsStateContext(),
      }),
      { wrapper }
    );

    expect(result.current.state).toMatchObject({
      activeTab: 'backups',
      backups: [],
      isRestoreModalOpen: false,
      selectedBackupForRestore: null,
    });
    expect(result.current.actions.setActiveTab).toBeTypeOf('function');
    expect(result.current.actions.handleBackup).toBeTypeOf('function');
    expect(result.current.actions.saveDailySchedule).toBeTypeOf('function');
  });
});
