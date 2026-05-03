/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useBaseImportRunsMock: vi.fn(),
  useBaseImportQueueHealthMock: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: React.PropsWithChildren<{ href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/shared/lib/jobs/hooks/useJobQueries', () => ({
  useBaseImportRuns: (...args: unknown[]) => mocks.useBaseImportRunsMock(...args),
  useBaseImportQueueHealth: (...args: unknown[]) => mocks.useBaseImportQueueHealthMock(...args),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type='button' {...props}>
      {children}
    </button>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/shared/ui/data-display.public', () => ({
  StatusBadge: ({ status }: { status: string }) => <div>{status}</div>,
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  SelectSimple: ({
    value,
    onValueChange,
    options,
    ariaLabel,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    ariaLabel?: string;
  }) => (
    <select
      aria-label={ariaLabel ?? 'select'}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock('@/shared/ui/templates.public', () => ({
  PanelStats: ({ stats }: { stats: Array<{ key: string; value: React.ReactNode }> }) => (
    <div>
      {stats.map((stat) => (
        <div key={stat.key}>{stat.value}</div>
      ))}
    </div>
  ),
  StandardDataTablePanel: ({
    title,
    description,
    headerActions,
    alerts,
    columns,
    data,
  }: {
    title: React.ReactNode;
    description?: React.ReactNode;
    headerActions?: React.ReactNode;
    alerts?: React.ReactNode;
    columns: Array<{ id?: string; accessorKey?: string; header: string; cell?: (args: { row: { original: Record<string, unknown> } }) => React.ReactNode }>;
    data: Array<Record<string, unknown>>;
  }) => (
    <div>
      <div>{title}</div>
      <div>{description}</div>
      {headerActions}
      {alerts}
      {data.map((row, rowIndex) => (
        <div key={String(row['id'] ?? rowIndex)}>
          {columns.map((column, columnIndex) => (
            <div key={`${column.header}-${columnIndex}`}>
              {column.cell
                ? column.cell({ row: { original: row } })
                : String(row[column.accessorKey ?? ''] ?? '')}
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
}));

import { BaseImportRunsQueuePanel } from './BaseImportRunsQueuePanel';

describe('BaseImportRunsQueuePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useBaseImportRunsMock.mockReturnValue({
      data: [
        {
          id: 'run-1',
          status: 'failed',
          queueJobId: 'job-1',
          dispatchMode: 'queued',
          createdAt: '2026-04-09T19:54:40.074Z',
          updatedAt: '2026-04-09T19:54:42.212Z',
          finishedAt: '2026-04-09T19:54:42.195Z',
          summaryMessage:
            'Import completed: 0 imported, 0 updated, 0 skipped, 1 failed. Latest failure: FOASW022 [VALIDATION_ERROR]: Validation failed for FOASW022.',
          errorCode: 'VALIDATION_ERROR',
          error:
            'Validation failed for FOASW022. name_en: English name must use format: <name> | <size> | <material> | <category> | <lore or theme>',
          preflight: { ok: true, issues: [] },
          params: {
            connectionId: 'connection-1',
            inventoryId: 'inventory-1',
            catalogId: 'catalog-1',
          },
          stats: {
            total: 1,
            pending: 0,
            processing: 0,
            imported: 0,
            updated: 0,
            skipped: 0,
            failed: 1,
          },
        },
      ],
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    mocks.useBaseImportQueueHealthMock.mockReturnValue({
      data: {
        ok: true,
        mode: 'bullmq',
        redisAvailable: true,
        queues: {
          baseImport: {
            waitingCount: 0,
            activeCount: 0,
            completedCount: 0,
            failedCount: 1,
            running: true,
          },
        },
      },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
  });

  it('renders run-level import failure details directly in the summary column', () => {
    render(<BaseImportRunsQueuePanel />);

    expect(screen.getByText(/Latest failure: FOASW022 \[VALIDATION_ERROR\]/)).toBeInTheDocument();
    expect(
      screen.getByText(
        /VALIDATION_ERROR · Validation failed for FOASW022\. name_en: English name must use format:/
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open import page' })).toHaveAttribute(
      'href',
      '/admin/products/import?runId=run-1'
    );
    expect(screen.getByRole('link', { name: 'Download CSV report' })).toHaveAttribute(
      'href',
      '/api/v2/integrations/imports/base/runs/run-1/report?format=csv'
    );
  });
});
