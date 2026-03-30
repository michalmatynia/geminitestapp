import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DatabaseInfo } from '@/shared/contracts/database';

const {
  backupMaintenanceAllowedState,
  handleDeleteRequestMock,
  handlePreviewMock,
  handleRestoreRequestMock,
} = vi.hoisted(() => ({
  backupMaintenanceAllowedState: { value: true },
  handleDeleteRequestMock: vi.fn(),
  handlePreviewMock: vi.fn(),
  handleRestoreRequestMock: vi.fn(),
}));

vi.mock('@/features/database/context/DatabaseBackupsContext', () => ({
  useDatabaseBackupsStateContext: () => ({
    backupMaintenanceAllowed: backupMaintenanceAllowedState.value,
  }),
  useDatabaseBackupsActionsContext: () => ({
    handlePreview: handlePreviewMock,
    handleRestoreRequest: handleRestoreRequestMock,
    handleDeleteRequest: handleDeleteRequestMock,
  }),
}));

vi.mock('@/shared/ui', () => ({
  ActionMenu: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid='database-action-menu'>{children}</div>
  ),
  DataTableSortableHeader: ({ label }: { label: string }) => <div>{label}</div>,
  DropdownMenuItem: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button type='button' {...props}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <div data-testid='database-action-separator' />,
}));

import { buildDatabaseColumns } from '@/features/database/components/DatabaseColumns';

const buildBackup = (overrides: Partial<DatabaseInfo> = {}): DatabaseInfo => ({
  name: 'backup-2026-03-22',
  size: 4096,
  createdAt: '2026-03-22T10:00:00.000Z',
  lastModifiedAt: '2026-03-22T11:00:00.000Z',
  lastRestored: '2026-03-22T12:00:00.000Z',
  ...overrides,
});

function renderActionsCell(backup: DatabaseInfo = buildBackup()) {
  const actionsColumn = buildDatabaseColumns({
    backupMaintenanceAllowed: backupMaintenanceAllowedState.value,
    handlePreview: handlePreviewMock,
    handleRestoreRequest: handleRestoreRequestMock,
    handleDeleteRequest: handleDeleteRequestMock,
  }).find((column) => column.id === 'actions');
  if (!actionsColumn || typeof actionsColumn.cell !== 'function') {
    throw new Error('Expected actions column with a cell renderer');
  }

  const content = actionsColumn.cell({
    row: { original: backup },
  } as never);

  return {
    backup,
    ...render(<>{content}</>),
  };
}

describe('buildDatabaseColumns actions cell', () => {
  beforeEach(() => {
    backupMaintenanceAllowedState.value = true;
    handleDeleteRequestMock.mockReset();
    handlePreviewMock.mockReset();
    handleRestoreRequestMock.mockReset();
  });

  it('passes the backup and handlers directly into the action items', () => {
    const { backup } = renderActionsCell();

    expect(screen.getByTestId('database-action-menu')).toBeInTheDocument();
    expect(screen.getByTestId('database-action-separator')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(handlePreviewMock).toHaveBeenCalledTimes(1);
    expect(handlePreviewMock).toHaveBeenCalledWith(backup.name);
    expect(handleRestoreRequestMock).toHaveBeenCalledTimes(1);
    expect(handleRestoreRequestMock).toHaveBeenCalledWith(backup);
    expect(handleDeleteRequestMock).toHaveBeenCalledTimes(1);
    expect(handleDeleteRequestMock).toHaveBeenCalledWith(backup.name);
  });

  it('disables restore and delete when backup maintenance is locked', () => {
    backupMaintenanceAllowedState.value = false;

    renderActionsCell();

    expect(screen.getByRole('button', { name: 'Preview' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Restore' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Restore' })).toHaveAttribute(
      'title',
      'Disabled by Database Engine operation controls'
    );
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveAttribute(
      'title',
      'Disabled by Database Engine operation controls'
    );
  });
});
