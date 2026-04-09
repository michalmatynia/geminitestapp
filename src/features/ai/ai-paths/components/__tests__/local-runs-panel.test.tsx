import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  localRunsValue: null as Record<string, unknown> | null,
  tablePropsValue: null as Record<string, unknown> | null,
  useLocalRunsArgs: null as unknown,
  useLocalRunsTableProps: vi.fn(),
  refetch: vi.fn(),
  clearRuns: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/hooks/useLocalRuns', () => ({
  useLocalRuns: (args: unknown) => {
    mockState.useLocalRunsArgs = args;
    return mockState.localRunsValue;
  },
}));

vi.mock('@/features/ai/ai-paths/hooks/useLocalRunsTableProps', () => ({
  useLocalRunsTableProps: (...args: unknown[]) => mockState.useLocalRunsTableProps(...args),
}));

vi.mock('lucide-react', () => ({
  Trash2: () => <span data-testid='trash-icon' />,
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>): React.JSX.Element => (
    <button {...props}>{children}</button>
  ),
  StandardDataTablePanel: ({
    title,
    description,
    refresh,
    headerActions,
    alerts,
    isLoading,
    data,
  }: {
    title: string;
    description: string;
    refresh?: { onRefresh: () => void; isRefreshing: boolean };
    headerActions?: React.ReactNode;
    alerts?: React.ReactNode;
    isLoading?: boolean;
    data?: unknown;
  }): React.JSX.Element => (
    <div>
      <h2>{title}</h2>
      <p>{description}</p>
      {refresh ? (
        <button
          type='button'
          onClick={refresh.onRefresh}
          disabled={refresh.isRefreshing}
        >
          {refresh.isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      ) : null}
      {headerActions}
      {alerts}
      <div data-testid='table-loading'>{String(Boolean(isLoading))}</div>
      <div data-testid='table-data'>{JSON.stringify(data ?? null)}</div>
    </div>
  ),
  MetadataItem: ({
    label,
    value,
    hint,
  }: {
    label: React.ReactNode;
    value: React.ReactNode;
    hint?: React.ReactNode;
  }): React.JSX.Element => (
    <div>
      <div>{label}</div>
      <div>{value}</div>
      {hint ? <div>{hint}</div> : null}
    </div>
  ),
}));

vi.mock('@/shared/ui/templates/modals', () => ({
  ConfirmModal: ({
    isOpen,
    title,
    message,
    confirmText,
    onClose,
    onConfirm,
    loading,
  }: {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    onClose: () => void;
    onConfirm: () => void;
    loading?: boolean;
  }) =>
    isOpen ? (
      <div>
        <div>{title}</div>
        <div>{message}</div>
        <button type='button' onClick={onClose}>
          Close {confirmText}
        </button>
        <button type='button' onClick={onConfirm} disabled={loading}>
          {confirmText}
        </button>
      </div>
    ) : null,
}));

import { LocalRunsPanel } from '../local-runs-panel';

const buildLocalRunsValue = (overrides: Record<string, unknown> = {}) => ({
  runs: [{ id: 'run-1' }],
  metrics: {
    total: 12,
    success: 9,
    successRate: 75,
    error: 3,
    avgDuration: 450,
    p95Duration: 65_000,
    lastRunAt: '2026-03-19T10:00:00.000Z',
  },
  isLoading: false,
  isFetching: false,
  isUpdating: false,
  refetch: mockState.refetch,
  clearRuns: mockState.clearRuns,
  ...overrides,
});

describe('LocalRunsPanel', () => {
  beforeEach(() => {
    mockState.refetch.mockReset();
    mockState.clearRuns.mockReset();
    mockState.useLocalRunsTableProps.mockReset();
    mockState.tablePropsValue = {
      columns: [],
      data: [{ id: 'run-1' }],
      isLoading: false,
    };
    mockState.useLocalRunsTableProps.mockImplementation(() => mockState.tablePropsValue);
    mockState.localRunsValue = buildLocalRunsValue();
  });

  it('renders external local runs, metrics, refresh, and clear actions', () => {
    render(<LocalRunsPanel sourceFilter='ai_paths_ui' sourceMode='exclude' />);

    expect(screen.getByText('External Local Runs')).toBeInTheDocument();
    expect(
      screen.getByText('Recent local execution history and performance metrics.')
    ).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('450ms')).toBeInTheDocument();
    expect(screen.getByText('3/19/2026, 11:00:00 AM')).toBeInTheDocument();
    expect(screen.getByText('Visible in this tab')).toBeInTheDocument();
    expect(screen.getByText('75% success rate')).toBeInTheDocument();
    expect(screen.getByText('Failures in this list')).toBeInTheDocument();
    expect(screen.getByText('p95 1m 5s')).toBeInTheDocument();
    expect(screen.getByText('Newest execution')).toBeInTheDocument();
    expect(screen.getAllByTestId('trash-icon')).toHaveLength(2);
    expect(screen.getByTestId('table-loading')).toHaveTextContent('false');
    expect(screen.getByTestId('table-data')).toHaveTextContent('"run-1"');

    expect(mockState.useLocalRunsTableProps).toHaveBeenCalledWith(
      mockState.localRunsValue?.runs,
      false
    );

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(mockState.refetch).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Clear Finished' }));
    expect(screen.getByText('Clear finished local runs')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close Clear Finished' }));
    expect(screen.queryByText('Clear finished local runs')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear Finished' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Clear Finished' }).at(-1)!);
    expect(mockState.clearRuns).toHaveBeenCalledWith('terminal');

    fireEvent.click(screen.getByRole('button', { name: 'Clear All' }));
    expect(screen.getByText('Clear all local runs')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Clear All' }).at(-1)!);
    expect(mockState.clearRuns).toHaveBeenCalledWith('all');
  });

  it('renders the ai_paths_ui local label and loading/updating state', () => {
    mockState.tablePropsValue = {
      columns: [],
      data: [],
      isLoading: true,
    };
    mockState.localRunsValue = buildLocalRunsValue({
      metrics: {
        total: 2,
        success: 1,
        successRate: 50,
        error: 1,
        avgDuration: 1500,
        p95Duration: 61_000,
        lastRunAt: 'not-a-date',
      },
      isLoading: true,
      isFetching: true,
      isUpdating: true,
    });

    render(<LocalRunsPanel sourceFilter='ai_paths_ui' sourceMode='include' />);

    expect(screen.getByText('Local Runs')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refreshing...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear Finished' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear All' })).toBeDisabled();
    expect(screen.getByText('2s')).toBeInTheDocument();
    expect(screen.getByText('p95 1m 1s')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.getByTestId('table-loading')).toHaveTextContent('true');
  });

  it('falls back to default label and hyphen formatting for empty metrics', () => {
    mockState.localRunsValue = buildLocalRunsValue({
      metrics: {
        total: 0,
        success: 0,
        successRate: 0,
        error: 0,
        avgDuration: Number.NaN,
        p95Duration: null,
        lastRunAt: null,
      },
    });

    render(<LocalRunsPanel />);

    expect(screen.getByText('Local Runs')).toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('p95 -')).toBeInTheDocument();
  });
});
