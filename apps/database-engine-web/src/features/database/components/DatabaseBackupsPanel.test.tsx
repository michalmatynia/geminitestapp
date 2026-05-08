// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  state: {
    activeTab: 'mongodb',
    backupToDelete: 'old-local.archive',
    data: [
      {
        name: 'geminitestapp/app-backup-1.archive',
        size: 1024,
        createdAt: '2026-05-07T10:00:00.000Z',
        lastModifiedAt: '2026-05-07T10:00:00.000Z',
      },
      {
        name: 'studiq/studiq-backup-1.archive',
        size: 2048,
        createdAt: '2026-05-08T10:00:00.000Z',
        lastModifiedAt: '2026-05-08T10:00:00.000Z',
      },
    ],
    backupRunNowAllowed: true,
    isProd: false,
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
  Button: ({
    asChild,
    children,
  }: {
    asChild?: boolean;
    children?: React.ReactNode;
  }) => (asChild ? <>{children}</> : <button type='button'>{children}</button>),
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

vi.mock('../context/DatabaseEngineContext', () => ({
  useDatabaseEngineActionsContext: () => ({
    backupManagedMongo: vi.fn(),
  }),
  useDatabaseEngineStateContext: () => ({
    isBackingUpManagedMongo: false,
    operationsJobs: {
      timestamp: '2026-05-08T10:30:00.000Z',
      queueStatus: {},
      jobs: [
        {
          id: 'job-backup-studiq',
          type: 'db_backup',
          status: 'completed',
          dbType: 'mongodb',
          direction: null,
          source: 'database_engine_managed_backup',
          payload: { application: 'studiq' },
          resultSummary: 'Backup created',
          createdAt: '2026-05-08T10:00:00.000Z',
          updatedAt: null,
          startedAt: null,
          finishedAt: null,
          errorMessage: null,
          progress: 100,
        },
      ],
    },
  }),
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

    expect(screen.getByText('GeminiTest App')).toBeInTheDocument();
    expect(screen.getByText('StudiQ')).toBeInTheDocument();
    expect(screen.getByText('CMS Builder')).toBeInTheDocument();
    expect(screen.getByText('Ecommerce')).toBeInTheDocument();
    expect(screen.getByText('geminitestapp/app-backup-1.archive')).toBeInTheDocument();
    expect(screen.getByText('studiq/studiq-backup-1.archive')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Local Tables' })[1]).toHaveAttribute(
      'href',
      '/admin/databases/engine?view=crud&application=studiq&source=local'
    );
    expect(screen.getAllByRole('link', { name: 'Cloud Tables' })[1]).toHaveAttribute(
      'href',
      '/admin/databases/engine?view=crud&application=studiq&source=cloud'
    );
    expect(screen.getByText('Recent Backup Jobs')).toBeInTheDocument();
    expect(screen.getByText('job-backup-studiq')).toBeInTheDocument();
    expect(screen.getByText('Target: studiq')).toBeInTheDocument();
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
