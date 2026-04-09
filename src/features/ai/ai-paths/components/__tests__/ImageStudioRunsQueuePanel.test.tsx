import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  hookValue: null as Record<string, unknown> | null,
  setStatusFilter: vi.fn(),
  setAutoRefreshEnabled: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock('../../hooks/useImageStudioRuns', () => ({
  useImageStudioRuns: () => mockState.hookValue,
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>): React.JSX.Element => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  SelectSimple: ({
    ariaLabel,
    options,
    value,
    onValueChange,
  }: {
    ariaLabel?: string;
    options: Array<{ value: string; label: string }>;
    value?: string;
    onValueChange?: (value: string) => void;
  }): React.JSX.Element => (
    <select
      aria-label={ariaLabel}
      value={value ?? ''}
      onChange={(event) => onValueChange?.(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock('@/shared/ui/data-display.public', () => ({
  StatusBadge: ({
    status,
    variant,
  }: {
    status: React.ReactNode;
    variant?: string;
  }): React.JSX.Element => (
    <span data-testid='status-badge'>{`${String(status)}:${variant ?? 'none'}`}</span>
  ),
}));

vi.mock('@/shared/ui/templates.public', () => ({
  PanelStats: ({
    stats,
  }: {
    stats: Array<{ key: string; label: string; value: React.ReactNode }>;
  }): React.JSX.Element => (
    <div data-testid='panel-stats'>
      {stats.map((stat) => (
        <div key={stat.key}>
          <span>{stat.label}</span>
          <div>{stat.value}</div>
        </div>
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
    isLoading,
  }: {
    title: string;
    description: string;
    headerActions?: React.ReactNode;
    alerts?: React.ReactNode;
    columns: Array<Record<string, unknown>>;
    data: Array<Record<string, unknown>>;
    isLoading?: boolean;
  }): React.JSX.Element => (
    <div>
      <h2>{title}</h2>
      <p>{description}</p>
      <div>{headerActions}</div>
      <div>{alerts}</div>
      {isLoading ? <div>Loading rows</div> : null}
      <table>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th key={String(column.id ?? column.accessorKey ?? index)}>
                {String(column.header ?? column.id ?? column.accessorKey ?? '')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={String(item.id)}>
              {columns.map((column, index) => {
                const accessorKey = column.accessorKey as string | undefined;
                const cell = column.cell as
                  | ((input: { row: { original: Record<string, unknown> } }) => React.ReactNode)
                  | undefined;
                const content = cell
                  ? cell({ row: { original: item } })
                  : accessorKey
                    ? String((item as Record<string, unknown>)[accessorKey] ?? '')
                    : '';
                return <td key={String(column.id ?? accessorKey ?? index)}>{content}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
}));

import { ImageStudioRunsQueuePanel } from '../ImageStudioRunsQueuePanel';

const buildRun = (overrides: Record<string, unknown>) => ({
  id: 'run-queued-1234567890',
  projectId: 'project-a',
  status: 'queued',
  dispatchMode: 'queued',
  request: { projectId: 'project-a', prompt: 'Prompt' },
  expectedOutputs: 2,
  outputs: [],
  errorMessage: null,
  createdAt: '2026-03-19T10:00:00.000Z',
  updatedAt: '2026-03-19T10:00:05.000Z',
  startedAt: null,
  finishedAt: null,
  historyEvents: [],
  ...overrides,
});

describe('ImageStudioRunsQueuePanel', () => {
  beforeEach(() => {
    mockState.setStatusFilter.mockReset();
    mockState.setAutoRefreshEnabled.mockReset();
    mockState.refetch.mockReset();

    mockState.hookValue = {
      runs: [
        buildRun({ id: 'queued-run-123456', status: 'queued', dispatchMode: 'queued' }),
        buildRun({
          id: 'running-run-12345',
          projectId: 'project-b',
          status: 'running',
          dispatchMode: 'inline',
          outputs: [{ id: 'out-1' }],
          startedAt: '2026-03-19T10:01:00.000Z',
        }),
        buildRun({
          id: 'complete-run-1234',
          projectId: 'project-c',
          status: 'completed',
          dispatchMode: null,
          outputs: [{ id: 'out-1' }, { id: 'out-2' }],
          startedAt: '2026-03-19T10:02:00.000Z',
          finishedAt: '2026-03-19T10:03:00.000Z',
        }),
        buildRun({
          id: 'failed-run-123456',
          projectId: 'project-d',
          status: 'failed',
          dispatchMode: 'queued',
          errorMessage: 'Worker failed',
          finishedAt: 'not-a-date',
        }),
      ],
      stats: {
        total: 4,
        queuedCount: 1,
        runningCount: 1,
      },
      statusFilter: 'all',
      setStatusFilter: mockState.setStatusFilter,
      autoRefreshEnabled: true,
      setAutoRefreshEnabled: mockState.setAutoRefreshEnabled,
      isLoading: false,
      isFetching: false,
      refetch: mockState.refetch,
    };
  });

  it('renders rows, status badges, stats, and forwards actions', () => {
    render(<ImageStudioRunsQueuePanel />);

    expect(screen.getByText('Image Studio Runs')).toBeInTheDocument();
    expect(
      screen.getByText('Queue-backed generation runs persisted from Image Studio.')
    ).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Auto-refresh on' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getAllByText('1')).toHaveLength(2);

    expect(screen.getByText('queued-run-1...')).toBeInTheDocument();
    expect(screen.getByText('running-run-...')).toBeInTheDocument();
    expect(screen.getByText('complete-run...')).toBeInTheDocument();
    expect(screen.getByText('failed-run-1...')).toBeInTheDocument();

    expect(screen.getAllByText('0/2')).toHaveLength(2);
    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.getByText('2/2')).toBeInTheDocument();
    expect(screen.getByText('Worker failed')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4);

    expect(screen.getAllByText(new Date('2026-03-19T10:00:00.000Z').toLocaleString())).toHaveLength(
      4
    );
    expect(screen.getByText(new Date('2026-03-19T10:01:00.000Z').toLocaleString())).toBeInTheDocument();
    expect(screen.getByText(new Date('2026-03-19T10:03:00.000Z').toLocaleString())).toBeInTheDocument();

    expect(screen.getAllByTestId('status-badge').map((node) => node.textContent)).toEqual(
      expect.arrayContaining([
        'queued:warning',
        'running:processing',
        'completed:success',
        'failed:error',
        'Inline:error',
        'Redis:success',
      ])
    );

    fireEvent.change(screen.getByLabelText('Filter by status'), {
      target: { value: 'failed' },
    });
    expect(mockState.setStatusFilter).toHaveBeenCalledWith('failed');

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(mockState.refetch).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Auto-refresh on' }));
    expect(mockState.setAutoRefreshEnabled).toHaveBeenCalledTimes(1);
    const toggle = mockState.setAutoRefreshEnabled.mock.calls[0]?.[0] as (prev: boolean) => boolean;
    expect(toggle(true)).toBe(false);
  });

  it('renders loading and fetching states for the header controls', () => {
    mockState.hookValue = {
      ...mockState.hookValue,
      runs: [],
      stats: {
        total: 0,
        queuedCount: 0,
        runningCount: 0,
      },
      autoRefreshEnabled: false,
      isLoading: true,
      isFetching: true,
      statusFilter: 'running',
    };

    render(<ImageStudioRunsQueuePanel />);

    expect(screen.getByRole('button', { name: 'Auto-refresh off' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refreshing...' })).toBeDisabled();
    expect(screen.getByText('Loading rows')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by status')).toHaveValue('running');

    fireEvent.click(screen.getByRole('button', { name: 'Auto-refresh off' }));
    const toggle = mockState.setAutoRefreshEnabled.mock.calls[0]?.[0] as (prev: boolean) => boolean;
    expect(toggle(false)).toBe(true);
  });
});
