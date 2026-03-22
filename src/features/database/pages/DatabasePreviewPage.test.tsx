// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type {
  DatabaseTableDetail,
  DatabaseTablePreviewData,
} from '@/shared/contracts/database';

const useDatabasePreviewState = vi.fn();

vi.mock('../hooks/useDatabasePreviewState', () => ({
  useDatabasePreviewState: () => useDatabasePreviewState(),
}));

vi.mock('@/shared/ui', () => ({
  AdminDatabasePageLayout: ({
    children,
    title,
  }: {
    children?: React.ReactNode;
    title?: string;
  }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
  Badge: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  Button: ({
    children,
    disabled,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button type='button' disabled={disabled} onClick={onClick} {...props}>
      {children}
    </button>
  ),
  Pagination: () => <div data-testid='pagination' />,
  FormSection: ({
    actions,
    children,
    title,
  }: {
    actions?: React.ReactNode;
    children?: React.ReactNode;
    title?: string;
  }) => (
    <section>
      <h2>{title}</h2>
      {actions}
      {children}
    </section>
  ),
  Tabs: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
    <div {...props}>{children}</div>
  ),
  TabsTrigger: ({ children }: { children?: React.ReactNode }) => <button type='button'>{children}</button>,
  StandardDataTablePanel: ({ data }: { data: unknown[] }) => (
    <div data-testid='standard-data-table-panel' data-row-count={String(data.length)} />
  ),
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
  Alert: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SearchInput: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  CollapsibleSection: ({
    actions,
    children,
    title,
  }: {
    actions?: React.ReactNode;
    children?: React.ReactNode;
    title?: React.ReactNode;
  }) => (
    <section>
      <div>
        {title}
        {actions}
      </div>
      {children}
    </section>
  ),
  MetadataItem: ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
      {label}:{value}
    </div>
  ),
  LoadingState: ({ message }: { message?: string }) => <div>{message}</div>,
  CompactEmptyState: ({
    description,
    title,
  }: {
    description?: string;
    title: string;
  }) => (
    <div>
      <span>{title}</span>
      <span>{description}</span>
    </div>
  ),
  Hint: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  UI_CENTER_ROW_RELAXED_CLASSNAME: 'row-relaxed',
  UI_CENTER_ROW_SPACED_CLASSNAME: 'row-spaced',
  UI_GRID_RELAXED_CLASSNAME: 'grid-relaxed',
}));

import { TableDetailCard } from './DatabasePreviewPage';

describe('TableDetailCard', () => {
  const detail: DatabaseTableDetail = {
    name: 'users',
    rowEstimate: 1234,
    sizeFormatted: '2 MB',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, defaultValue: null, isPrimaryKey: true },
    ],
    indexes: [
      {
        name: 'users_pkey',
        columns: ['id'],
        isUnique: true,
        definition: 'PRIMARY KEY (id)',
      },
    ],
    foreignKeys: [
      {
        name: 'users_account_id_fkey',
        column: 'account_id',
        referencedTable: 'accounts',
        referencedColumn: 'id',
        onDelete: 'CASCADE',
      },
    ],
  } as DatabaseTableDetail;

  it('renders title, actions, preview metadata, and tab content directly', () => {
    const onQueryTable = vi.fn();
    const onManageTable = vi.fn();
    const tableRow: DatabaseTablePreviewData = {
      name: 'users',
      totalRows: 42,
      rows: [{ id: '1', email: 'alice@example.com' }],
    } as DatabaseTablePreviewData;

    useDatabasePreviewState.mockReturnValue({
      tableRows: [tableRow],
      page: 1,
      pageSize: 20,
    });

    render(
      <TableDetailCard
        detail={detail}
        onQueryTable={onQueryTable}
        onManageTable={onManageTable}
      />
    );

    expect(screen.getByText('users')).toBeInTheDocument();
    expect(screen.getByText('1,234 rows • 2 MB')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Query' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manage' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview (42)' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Query' }));
    fireEvent.click(screen.getByRole('button', { name: 'Manage' }));

    expect(onQueryTable).toHaveBeenCalledWith('users');
    expect(onManageTable).toHaveBeenCalledWith('users');

    const tables = screen.getAllByTestId('standard-data-table-panel');
    expect(tables).toHaveLength(4);
    expect(tables.map((table) => table.dataset.rowCount)).toEqual(['1', '1', '1', '1']);
  });

  it('shows the preview empty state when the table has no row data', () => {
    useDatabasePreviewState.mockReturnValue({
      tableRows: [
        {
          name: 'users',
          totalRows: 0,
          rows: [],
        },
      ],
      page: 1,
      pageSize: 20,
    });

    render(<TableDetailCard detail={detail} />);

    expect(screen.getByText('No row data available')).toBeInTheDocument();
    expect(screen.getByText('This table appears to be empty.')).toBeInTheDocument();
  });
});
