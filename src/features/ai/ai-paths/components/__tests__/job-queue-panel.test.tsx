import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  queueState: null as Record<string, unknown> | null,
  providerProps: [] as Array<Record<string, unknown>>,
  confirmModalProps: [] as Array<Record<string, unknown>>,
  overviewProps: [] as Array<Record<string, unknown>>,
  setShowMetricsPanel: vi.fn(),
  setQueueHistory: vi.fn(),
  setClearScope: vi.fn(),
  handleClearRuns: vi.fn(),
  setRunToDelete: vi.fn(),
  handleDeleteRun: vi.fn(),
  isDeletingRun: vi.fn(),
}));

vi.mock('../JobQueueContext', () => ({
  JobQueueProvider: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
  }) => {
    mockState.providerProps.push(props as Record<string, unknown>);
    return <div data-testid='job-queue-provider'>{children}</div>;
  },
  useJobQueueState: () => mockState.queueState,
  useJobQueueActions: () => ({
    setShowMetricsPanel: mockState.setShowMetricsPanel,
    setQueueHistory: mockState.setQueueHistory,
    setClearScope: mockState.setClearScope,
    handleClearRuns: mockState.handleClearRuns,
    setRunToDelete: mockState.setRunToDelete,
    handleDeleteRun: mockState.handleDeleteRun,
  }),
}));

vi.mock('../JobQueueControls', () => ({
  JobQueueControls: () => <div data-testid='job-queue-controls' />,
}));

vi.mock('../JobQueueFilterPanel', () => ({
  JobQueueFilterPanel: () => <div data-testid='job-queue-filter-panel' />,
}));

vi.mock('../JobQueueList', () => ({
  JobQueueList: () => <div data-testid='job-queue-list' />,
}));

vi.mock('../job-queue-overview', () => ({
  JobQueueOverview: (props: Record<string, unknown>) => {
    mockState.overviewProps.push(props);
    return (
      <div data-testid='job-queue-overview'>
        <button type='button' onClick={() => (props.onToggleMetricsPanel as () => void)()}>
          Toggle Metrics
        </button>
        <button type='button' onClick={() => (props.onClearHistory as () => void)()}>
          Clear History
        </button>
      </div>
    );
  },
}));

vi.mock('@/shared/ui', () => ({
  ConfirmModal: (props: Record<string, unknown>) => {
    mockState.confirmModalProps.push(props);
    return <div data-testid={`confirm-modal-${mockState.confirmModalProps.length - 1}`} />;
  },
}));

import { JobQueuePanel } from '../job-queue-panel';

const buildQueueState = (overrides: Record<string, unknown> = {}) => ({
  queueStatus: { queued: 3, running: 1 },
  queueHistory: [{ id: 'history-1' }],
  lagThresholdMs: 15_000,
  autoRefreshEnabled: true,
  autoRefreshInterval: 10_000,
  showMetricsPanel: false,
  clearScope: null,
  runToDelete: null,
  isDeletingRun: mockState.isDeletingRun,
  isLoadingQueueStatus: false,
  isClearingRuns: false,
  ...overrides,
});

describe('JobQueuePanel', () => {
  beforeEach(() => {
    mockState.queueState = buildQueueState();
    mockState.providerProps = [];
    mockState.confirmModalProps = [];
    mockState.overviewProps = [];
    mockState.setShowMetricsPanel.mockReset();
    mockState.setQueueHistory.mockReset();
    mockState.setClearScope.mockReset();
    mockState.handleClearRuns.mockReset();
    mockState.setRunToDelete.mockReset();
    mockState.handleDeleteRun.mockReset();
    mockState.isDeletingRun.mockReset().mockReturnValue(false);
  });

  it('passes provider props through and wires overview plus confirm modal actions', () => {
    mockState.queueState = buildQueueState({
      clearScope: 'terminal',
      runToDelete: { id: 'run-42' },
      isClearingRuns: true,
      isDeletingRun: mockState.isDeletingRun.mockImplementation((runId: string) => runId === 'run-42'),
    });

    render(
      <JobQueuePanel
        activePathId='path-1'
        initialSearchQuery='run-42'
        initialExpandedRunId='run-42'
        sourceFilter='manual'
        sourceMode='exclude'
        visibility='global'
        isActive={false}
      />
    );

    expect(screen.getByTestId('job-queue-provider')).toBeInTheDocument();
    expect(screen.getByTestId('job-queue-controls')).toBeInTheDocument();
    expect(screen.getByTestId('job-queue-overview')).toBeInTheDocument();
    expect(screen.getByTestId('job-queue-filter-panel')).toBeInTheDocument();
    expect(screen.getByTestId('job-queue-list')).toBeInTheDocument();

    expect(mockState.providerProps).toEqual([
      {
        activePathId: 'path-1',
        initialSearchQuery: 'run-42',
        initialExpandedRunId: 'run-42',
        sourceFilter: 'manual',
        sourceMode: 'exclude',
        visibility: 'global',
        isActive: false,
      },
    ]);

    expect(mockState.overviewProps[0]).toMatchObject({
      queueStatus: { queued: 3, running: 1 },
      queueStatusError: null,
      queueStatusFetching: false,
      queueHistory: [{ id: 'history-1' }],
      lagThresholdMs: 15_000,
      autoRefreshEnabled: true,
      autoRefreshInterval: 10_000,
      showMetricsPanel: false,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Toggle Metrics' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear History' }));

    expect(mockState.setShowMetricsPanel).toHaveBeenCalledTimes(1);
    expect(mockState.setQueueHistory).toHaveBeenCalledWith([]);
    const toggleMetrics = mockState.setShowMetricsPanel.mock.calls[0]?.[0] as (
      prev: boolean
    ) => boolean;
    expect(toggleMetrics(false)).toBe(true);

    expect(mockState.confirmModalProps).toHaveLength(3);
    expect(mockState.confirmModalProps[0]).toMatchObject({
      isOpen: true,
      title: 'Clear finished AI Path runs',
      confirmText: 'Clear Finished',
      isDangerous: true,
      loading: true,
    });
    expect(mockState.confirmModalProps[1]).toMatchObject({
      isOpen: false,
      title: 'Clear all AI Path runs',
      confirmText: 'Clear All',
      isDangerous: true,
      loading: true,
    });
    expect(mockState.confirmModalProps[2]).toMatchObject({
      isOpen: true,
      title: 'Delete AI Path run',
      confirmText: 'Delete Run',
      isDangerous: true,
      loading: true,
    });
    expect(mockState.confirmModalProps[2]?.message).toBe(
      'Delete run run-42? This removes its run, node, and event history.'
    );

    (mockState.confirmModalProps[0]?.onClose as () => void)();
    (mockState.confirmModalProps[0]?.onConfirm as () => void)();
    (mockState.confirmModalProps[1]?.onClose as () => void)();
    (mockState.confirmModalProps[1]?.onConfirm as () => void)();
    (mockState.confirmModalProps[2]?.onClose as () => void)();
    (mockState.confirmModalProps[2]?.onConfirm as () => void)();

    expect(mockState.setClearScope).toHaveBeenCalledWith(null);
    expect(mockState.handleClearRuns).toHaveBeenNthCalledWith(1, 'terminal');
    expect(mockState.handleClearRuns).toHaveBeenNthCalledWith(2, 'all');
    expect(mockState.setRunToDelete).toHaveBeenCalledWith(null);
    expect(mockState.handleDeleteRun).toHaveBeenCalledWith('run-42');
    expect(mockState.isDeletingRun).toHaveBeenCalledWith('run-42');
  });

  it('keeps the delete action inert when no run is selected', () => {
    mockState.queueState = buildQueueState({
      clearScope: 'all',
      runToDelete: null,
      isClearingRuns: false,
    });

    render(<JobQueuePanel />);

    expect(mockState.providerProps).toEqual([
      {
        activePathId: undefined,
        initialSearchQuery: undefined,
        initialExpandedRunId: undefined,
        sourceFilter: undefined,
        sourceMode: undefined,
        visibility: undefined,
        isActive: undefined,
      },
    ]);

    expect(mockState.confirmModalProps[0]).toMatchObject({ isOpen: false, loading: false });
    expect(mockState.confirmModalProps[1]).toMatchObject({ isOpen: true, loading: false });
    expect(mockState.confirmModalProps[2]).toMatchObject({
      isOpen: false,
      loading: false,
      message: 'Delete run ? This removes its run, node, and event history.',
    });

    (mockState.confirmModalProps[2]?.onConfirm as () => void)();

    expect(mockState.handleDeleteRun).not.toHaveBeenCalled();
    expect(mockState.isDeletingRun).not.toHaveBeenCalled();
  });
});
