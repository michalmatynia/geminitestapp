import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  jobQueueState: null as Record<string, unknown> | null,
  refetchQueueData: vi.fn(),
  setClearScope: vi.fn(),
  setAutoRefreshEnabled: vi.fn(),
  setAutoRefreshInterval: vi.fn(),
  pauseAllStreams: vi.fn(),
  reconnectAllStreams: vi.fn(),
}));

vi.mock('../JobQueueContext', () => ({
  useJobQueueState: () => mockState.jobQueueState,
  useJobQueueActions: () => ({
    refetchQueueData: mockState.refetchQueueData,
    setClearScope: mockState.setClearScope,
    setAutoRefreshEnabled: mockState.setAutoRefreshEnabled,
    setAutoRefreshInterval: mockState.setAutoRefreshInterval,
    pauseAllStreams: mockState.pauseAllStreams,
    reconnectAllStreams: mockState.reconnectAllStreams,
  }),
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
  Hint: ({ children }: { children: React.ReactNode }): React.JSX.Element => <div>{children}</div>,
  Label: ({ children }: { children: React.ReactNode }): React.JSX.Element => <label>{children}</label>,
  SelectSimple: ({
    ariaLabel,
    options,
    value,
    onValueChange,
    disabled,
  }: {
    ariaLabel?: string;
    options: Array<{ value: string; label: string }>;
    value?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
  }): React.JSX.Element => (
    <select
      aria-label={ariaLabel}
      value={value ?? ''}
      disabled={disabled}
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

import { JobQueueControls } from '../JobQueueControls';

describe('JobQueueControls', () => {
  beforeEach(() => {
    mockState.jobQueueState = {
      panelLabel: 'Job Queue',
      panelDescription: 'Monitor queued and running jobs.',
      isLoadingRuns: false,
      isClearingRuns: false,
      autoRefreshEnabled: true,
      autoRefreshInterval: 10000,
      expandedRunIds: new Set(['run-1']),
    };

    mockState.refetchQueueData.mockReset();
    mockState.setClearScope.mockReset();
    mockState.setAutoRefreshEnabled.mockReset();
    mockState.setAutoRefreshInterval.mockReset();
    mockState.pauseAllStreams.mockReset();
    mockState.reconnectAllStreams.mockReset();
  });

  it('renders control labels, interval options, and forwards enabled actions', () => {
    render(<JobQueueControls />);

    expect(screen.getByText('Job Queue')).toBeInTheDocument();
    expect(screen.getByText('Monitor queued and running jobs.')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Refresh' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Clear Finished' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Clear All' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Auto-refresh on' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Pause all streams' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Reconnect all streams' })).toBeEnabled();
    expect(screen.getAllByTestId('trash-icon')).toHaveLength(2);

    const intervalSelect = screen.getByLabelText('Base interval');
    expect(intervalSelect).toHaveValue('10000');
    expect(screen.getByRole('option', { name: '5s' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '10s' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '30s' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '60s' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear Finished' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear All' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pause all streams' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reconnect all streams' }));
    fireEvent.change(intervalSelect, { target: { value: '30000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Auto-refresh on' }));

    expect(mockState.refetchQueueData).toHaveBeenCalledTimes(1);
    expect(mockState.setClearScope).toHaveBeenNthCalledWith(1, 'terminal');
    expect(mockState.setClearScope).toHaveBeenNthCalledWith(2, 'all');
    expect(mockState.pauseAllStreams).toHaveBeenCalledTimes(1);
    expect(mockState.reconnectAllStreams).toHaveBeenCalledTimes(1);
    expect(mockState.setAutoRefreshInterval).toHaveBeenCalledWith(30000);
    expect(mockState.setAutoRefreshEnabled).toHaveBeenCalledTimes(1);
    const toggle = mockState.setAutoRefreshEnabled.mock.calls[0]?.[0] as (prev: boolean) => boolean;
    expect(toggle(true)).toBe(false);
  });

  it('renders disabled loading and clearing states', () => {
    mockState.jobQueueState = {
      panelLabel: 'Job Queue',
      panelDescription: 'Monitor queued and running jobs.',
      isLoadingRuns: true,
      isClearingRuns: true,
      autoRefreshEnabled: false,
      autoRefreshInterval: 60000,
      expandedRunIds: new Set(),
    };

    render(<JobQueueControls />);

    expect(screen.getByRole('button', { name: 'Refreshing...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear Finished' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear All' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Auto-refresh off' })).toBeEnabled();
    expect(screen.getByLabelText('Base interval')).toBeDisabled();
    expect(screen.getByLabelText('Base interval')).toHaveValue('60000');
    expect(screen.getByRole('button', { name: 'Pause all streams' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reconnect all streams' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Auto-refresh off' }));
    const toggle = mockState.setAutoRefreshEnabled.mock.calls[0]?.[0] as (prev: boolean) => boolean;
    expect(toggle(false)).toBe(true);
  });
});
