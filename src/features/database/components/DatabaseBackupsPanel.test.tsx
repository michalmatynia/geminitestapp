// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  state: {
    activeTab: 'mongodb',
    backupToDelete: 'old-local.archive',
    isLogModalOpen: false,
    isRestoreModalOpen: false,
    logModalContent: '',
    selectedBackupForRestore: null,
  },
  actions: {
    closeLogModal: vi.fn(),
    handleConfirmDelete: vi.fn(),
    handleRestoreConfirm: vi.fn(),
    setBackupToDelete: vi.fn(),
    setIsRestoreModalOpen: vi.fn(),
    setSelectedBackupForRestore: vi.fn(),
  },
}));

vi.mock('@/shared/ui/admin.public', () => ({
  AdminDatabaseBreadcrumbs: ({ current }: { current: string }) => <nav>{current}</nav>,
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Badge: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/shared/ui/templates.public', () => ({
  ConfirmModal: ({
    confirmText,
    isOpen,
    message,
    onClose,
    onConfirm,
    title,
  }: {
    confirmText?: string;
    isOpen: boolean;
    message?: React.ReactNode;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title: string;
  }) =>
    isOpen ? (
      <div aria-label={title} role='dialog'>
        <div>{message}</div>
        <button type='button' onClick={onClose}>
          Cancel
        </button>
        <button
          type='button'
          onClick={() => {
            void onConfirm();
          }}
        >
          {confirmText ?? 'Confirm'}
        </button>
      </div>
    ) : null,
}));

vi.mock('../context/DatabaseBackupsContext', () => ({
  DatabaseBackupsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useDatabaseBackupsActionsContext: () => mocks.actions,
  useDatabaseBackupsStateContext: () => mocks.state,
}));

vi.mock('./LogModal', () => ({
  LogModal: () => <div data-testid='log-modal' />,
}));

vi.mock('./RestoreModal', () => ({
  RestoreModal: () => <div data-testid='restore-modal' />,
}));

vi.mock('./backups/BackupDataTable', () => ({
  BackupDataTable: () => <div data-testid='backup-data-table' />,
}));

vi.mock('./backups/BackupSchedulerSettings', () => ({
  BackupSchedulerSettings: () => <div data-testid='backup-scheduler-settings' />,
}));

import { DatabaseBackupsPanel } from './DatabaseBackupsPanel';

describe('DatabaseBackupsPanel', () => {
  beforeEach(() => {
    mocks.state.backupToDelete = 'old-local.archive';
    mocks.state.isLogModalOpen = false;
    mocks.state.isRestoreModalOpen = false;
    mocks.state.selectedBackupForRestore = null;
    vi.clearAllMocks();
  });

  it('renders the delete confirmation and confirms local backup deletion', () => {
    render(<DatabaseBackupsPanel />);

    expect(screen.getByRole('dialog', { name: 'Delete Backup' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Are you sure you want to delete backup "old-local.archive"? This cannot be undone.'
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(mocks.actions.handleConfirmDelete).toHaveBeenCalledTimes(1);
  });

  it('clears the pending backup when the delete dialog is cancelled', () => {
    render(<DatabaseBackupsPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mocks.actions.setBackupToDelete).toHaveBeenCalledWith(null);
  });
});
