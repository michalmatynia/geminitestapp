import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  JobTableActionsRuntimeProvider,
  JobTablePanelRuntimeProvider,
} from '@/shared/lib/jobs/components/context/JobTableRuntimeContext';
import { JobTable } from '@/shared/lib/jobs/components/JobTable';
import type { JobRowData } from '@/shared/lib/jobs/types';
import { StandardDataTablePanelRuntimeContext } from '@/shared/ui';

const standardDataTablePanelMock = vi.hoisted(() => vi.fn());

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: React.PropsWithChildren<{ href: string } & Record<string, unknown>>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>();

  return {
    ...actual,
    ExternalLink: () => <span data-testid='external-link' />,
  };
});

vi.mock('@/shared/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui')>();

  return {
    ...actual,
    StandardDataTablePanel: standardDataTablePanelMock,
  };
});

vi.mock('@/shared/lib/jobs/components/job-table/JobStatusCell', () => ({
  JobStatusCell: ({
    errorMessage,
    status,
  }: {
    errorMessage?: string | null;
    status: string;
  }) => <div data-testid='job-status-cell'>{`${status}|${errorMessage ?? ''}`}</div>,
}));

vi.mock('@/shared/lib/jobs/components/job-table/JobTimingCell', () => ({
  JobTimingCell: ({
    createdAt,
    finishedAt,
  }: {
    createdAt: string;
    finishedAt?: string | null;
  }) => <div data-testid='job-timing-cell'>{`${createdAt}|${finishedAt ?? ''}`}</div>,
}));

vi.mock('@/shared/lib/jobs/components/job-table/JobActionsCell', () => ({
  JobActionsCell: ({ jobId, status }: { jobId: string; status: string }) => (
    <div data-testid='job-actions-cell'>{`${jobId}|${status}`}</div>
  ),
}));

describe('JobTable', () => {
  beforeEach(() => {
    standardDataTablePanelMock.mockReset();
    standardDataTablePanelMock.mockImplementation(
      ({
        columns,
        data,
        isLoading,
      }: {
        columns: Array<{
          accessorKey?: string;
          cell?: (input: { row: { original: JobRowData } }) => React.JSX.Element;
          header?: React.ReactNode | (() => React.JSX.Element);
          id?: string;
        }>;
        data: JobRowData[];
        isLoading?: boolean;
      }) => {
        const runtime = React.useContext(StandardDataTablePanelRuntimeContext);

        return (
          <div data-loading={isLoading ? 'true' : 'false'} data-testid='standard-data-table-panel'>
            <div data-testid='panel-header'>{runtime?.header}</div>
            <div data-testid='panel-alerts'>{runtime?.alerts}</div>
            <div data-testid='panel-filters'>{runtime?.filters}</div>
            <div data-testid='panel-footer'>{runtime?.footer}</div>
            {data.map((row) => (
              <div data-testid={`row-${row.id}`} key={row.id}>
                {columns.map((column, index) => {
                  const columnKey = column.id ?? column.accessorKey ?? `column-${index}`;
                  const header =
                    typeof column.header === 'function' ? column.header() : column.header ?? null;
                  const cell = column.cell?.({ row: { original: row } });

                  return (
                    <section data-testid={`cell-${row.id}-${columnKey}`} key={`${row.id}-${columnKey}`}>
                      {header}
                      {cell}
                    </section>
                  );
                })}
              </div>
            ))}
          </div>
        );
      }
    );
  });

  it('passes runtime slots and renders row cells for product and non-product rows', () => {
    render(
      <JobTablePanelRuntimeProvider
        value={{
          header: <div>Header Slot</div>,
          alerts: <div>Alert Slot</div>,
          filters: <div>Filter Slot</div>,
          footer: <div>Footer Slot</div>,
        }}
      >
        <JobTableActionsRuntimeProvider
          value={{
            onViewDetails: vi.fn(),
            onCancel: vi.fn(),
            isCancelling: () => false,
          }}
        >
          <JobTable
            data={[
              {
                id: 'listing-1',
                status: 'running',
                progress: 100,
                error: null,
                errorMessage: 'retry later',
                createdAt: '2026-03-25T10:00:00.000Z',
                startedAt: '2026-03-25T10:00:00.000Z',
                finishedAt: '2026-03-25T10:05:00.000Z',
                entityName: 'Alpha',
                entitySubText: 'SKU: A-1',
                productId: 'prod-1',
                type: 'Export: Tradera',
              },
              {
                id: 'listing-2',
                status: 'completed',
                progress: 100,
                error: null,
                createdAt: '2026-03-25T11:00:00.000Z',
                startedAt: '2026-03-25T11:00:00.000Z',
                finishedAt: null,
                entityName: 'Beta',
                entitySubText: null,
                productId: null,
                type: 'Removal: Allegro',
              },
            ]}
            isLoading
          />
        </JobTableActionsRuntimeProvider>
      </JobTablePanelRuntimeProvider>
    );

    expect(screen.getByTestId('standard-data-table-panel')).toHaveAttribute('data-loading', 'true');
    expect(screen.getByTestId('panel-header')).toHaveTextContent('Header Slot');
    expect(screen.getByTestId('panel-alerts')).toHaveTextContent('Alert Slot');
    expect(screen.getByTestId('panel-filters')).toHaveTextContent('Filter Slot');
    expect(screen.getByTestId('panel-footer')).toHaveTextContent('Footer Slot');

    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('SKU: A-1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open product' })).toHaveAttribute(
      'href',
      '/admin/products?id=prod-1'
    );
    expect(screen.getByText('Export: Tradera')).toBeInTheDocument();
    expect(screen.getByText('listing-1')).toBeInTheDocument();
    expect(screen.getAllByTestId('job-status-cell')[0]).toHaveTextContent('running|retry later');
    expect(screen.getAllByTestId('job-timing-cell')[0]).toHaveTextContent(
      '2026-03-25T10:00:00.000Z|2026-03-25T10:05:00.000Z'
    );
    expect(screen.getAllByTestId('job-actions-cell')[0]).toHaveTextContent('listing-1|running');

    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Removal: Allegro')).toBeInTheDocument();
    expect(screen.getByText('listing-2')).toBeInTheDocument();
    expect(screen.getAllByTestId('job-actions-cell')[1]).toHaveTextContent('listing-2|completed');
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getAllByText('Actions')).toHaveLength(2);
  });
});
