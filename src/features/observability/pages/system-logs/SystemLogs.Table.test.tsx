// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useSystemLogsStateMock: vi.fn(),
  useSystemLogsActionsMock: vi.fn(),
  getDocumentationTooltipMock: vi.fn(),
}));

vi.mock('@/features/observability/context/SystemLogsContext', () => ({
  useSystemLogsState: mocks.useSystemLogsStateMock,
  useSystemLogsActions: mocks.useSystemLogsActionsMock,
}));

vi.mock('@/shared/lib/documentation', () => ({
  DOCUMENTATION_MODULE_IDS: {
    observability: 'observability',
  },
  getDocumentationTooltip: mocks.getDocumentationTooltipMock,
}));

vi.mock('@/shared/ui', () => ({
  Alert: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Button: ({
    children,
    onClick,
    title,
    'aria-label': ariaLabel,
    disabled,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    title?: string;
    'aria-label'?: string;
    disabled?: boolean;
  }) => (
    <button
      type='button'
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      disabled={disabled}
    >
      {children}
    </button>
  ),
  Card: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Hint: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  MetadataItem: ({
    label,
    value,
  }: {
    label: React.ReactNode;
    value?: React.ReactNode;
  }) => (
    <div>
      {label}:{value ?? '—'}
    </div>
  ),
  Pagination: () => <div>pagination</div>,
  StandardDataTablePanel: ({
    columns,
    data,
    footer,
  }: {
    columns: Array<{
      id?: string;
      accessorKey?: string;
      cell?: (props: { row: { original: Record<string, unknown> } }) => React.ReactNode;
    }>;
    data: Array<Record<string, unknown>>;
    footer?: React.ReactNode;
  }) => (
    <div>
      {data.map((row, rowIndex) => (
        <div key={String(row.id ?? rowIndex)}>
          {columns.map((column, columnIndex) => (
            <div key={column.id ?? column.accessorKey ?? columnIndex}>
              {column.cell ? column.cell({ row: { original: row } }) : null}
            </div>
          ))}
        </div>
      ))}
      {footer}
    </div>
  ),
  StatusBadge: ({ status }: { status?: React.ReactNode }) => <div>{status}</div>,
  Tooltip: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  UI_GRID_ROOMY_CLASSNAME: 'grid gap-6',
}));

vi.mock('@/shared/ui/templates/modals', () => ({
  DetailModal: ({
    isOpen,
    title,
    subtitle,
    children,
    onClose,
  }: {
    isOpen: boolean;
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    children?: React.ReactNode;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div role='dialog' aria-label={typeof title === 'string' ? title : 'Detail modal'}>
        <div>{title}</div>
        {subtitle ? <div>{subtitle}</div> : null}
        <button type='button' onClick={onClose}>
          Close
        </button>
        {children}
      </div>
    ) : null,
}));

import { EventStreamPanel } from './SystemLogs.Table';

describe('EventStreamPanel', () => {
  const interpretMutate = vi.fn();
  const handleFilterChange = vi.fn();

  beforeEach(() => {
    interpretMutate.mockReset();
    handleFilterChange.mockReset();
    mocks.useSystemLogsStateMock.mockReset();
    mocks.useSystemLogsActionsMock.mockReset();
    mocks.getDocumentationTooltipMock.mockReset();

    mocks.getDocumentationTooltipMock.mockReturnValue('AI Interpretation');
    mocks.useSystemLogsActionsMock.mockReturnValue({
      setPage: vi.fn(),
      handleFilterChange,
    });
  });

  it('opens a log details modal and keeps detail filter actions working', () => {
    mocks.useSystemLogsStateMock.mockReturnValue({
      logsQuery: { isLoading: false },
      logs: [
        {
          id: 'log-1',
          createdAt: '2026-03-19T10:00:00.000Z',
          updatedAt: '2026-03-19T10:00:00.000Z',
          level: 'error',
          message: 'Unhandled checkout failure',
          source: 'web',
          requestId: 'req-123',
          traceId: null,
          correlationId: null,
          service: 'checkout',
          userId: null,
          context: { debug: false },
        },
      ],
      totalPages: 1,
      page: 1,
      interpretLogMutation: {
        mutate: interpretMutate,
        isPending: false,
      },
      logInterpretations: {},
    });

    render(<EventStreamPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'View details' }));

    expect(interpretMutate).toHaveBeenCalledWith('log-1');
    const dialog = screen.getByRole('dialog', { name: 'Log details' });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Unhandled checkout failure')).toBeInTheDocument();
    expect(within(dialog).getByText('Identification')).toBeInTheDocument();
    expect(within(dialog).getByText('Request ID:req-123')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'View all in request' }));

    expect(handleFilterChange).toHaveBeenCalledWith('requestId', 'req-123');
  });

  it('shows an existing AI interpretation without requesting it again', () => {
    mocks.useSystemLogsStateMock.mockReturnValue({
      logsQuery: { isLoading: false },
      logs: [
        {
          id: 'log-2',
          createdAt: '2026-03-19T11:00:00.000Z',
          updatedAt: '2026-03-19T11:00:00.000Z',
          level: 'warn',
          message: 'Kangur sync latency spike',
          source: 'kangur',
          requestId: null,
          traceId: null,
          correlationId: null,
          service: null,
          userId: null,
          context: {},
        },
      ],
      totalPages: 1,
      page: 1,
      interpretLogMutation: {
        mutate: interpretMutate,
        isPending: false,
      },
      logInterpretations: {
        'log-2': {
          summary: 'AI summary for the selected log.',
          warnings: ['Queue pressure is increasing.'],
        },
      },
    });

    render(<EventStreamPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'View details' }));

    expect(interpretMutate).not.toHaveBeenCalled();
    expect(screen.getByText('AI Interpretation Output')).toBeInTheDocument();
    expect(screen.getByText('AI summary for the selected log.')).toBeInTheDocument();
    expect(screen.getByText('• Queue pressure is increasing.')).toBeInTheDocument();
  });

  it('toggles footer pagination based on the page layout variant', () => {
    mocks.useSystemLogsStateMock.mockReturnValue({
      logsQuery: { isLoading: false },
      logs: [],
      totalPages: 3,
      page: 2,
      interpretLogMutation: {
        mutate: interpretMutate,
        isPending: false,
      },
      logInterpretations: {},
    });

    const { rerender } = render(<EventStreamPanel />);

    expect(screen.getByText('pagination')).toBeInTheDocument();

    rerender(<EventStreamPanel showFooterPagination={false} />);

    expect(screen.queryByText('pagination')).not.toBeInTheDocument();
  });

  it('shows a generating state when a log is selected during an active interpretation request', () => {
    mocks.useSystemLogsStateMock.mockReturnValue({
      logsQuery: { isLoading: false },
      logs: [
        {
          id: 'log-3',
          createdAt: '2026-03-19T12:00:00.000Z',
          updatedAt: '2026-03-19T12:00:00.000Z',
          level: 'error',
          message: 'Observability worker timeout',
          source: 'system-log-alerts',
          requestId: null,
          traceId: null,
          correlationId: null,
          service: null,
          userId: null,
          context: {},
        },
      ],
      totalPages: 1,
      page: 1,
      interpretLogMutation: {
        mutate: interpretMutate,
        isPending: true,
      },
      logInterpretations: {},
    });

    render(<EventStreamPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'View details' }));

    expect(interpretMutate).not.toHaveBeenCalled();
    expect(screen.getByText('Generating interpretation...')).toBeInTheDocument();
  });
});
