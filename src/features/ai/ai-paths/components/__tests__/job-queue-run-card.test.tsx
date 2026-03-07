import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  JobQueueActionsValue,
  JobQueueContextValue,
  JobQueueStateValue,
} from '@/features/ai/ai-paths/components/JobQueueContext';
import type { AiPathRunRecord } from '@/shared/lib/ai-paths';

const { useJobQueueStateMock, useJobQueueActionsMock } = vi.hoisted(() => ({
  useJobQueueStateMock: vi.fn(),
  useJobQueueActionsMock: vi.fn(),
}));

const { useRunHistoryActionsMock } = vi.hoisted(() => ({
  useRunHistoryActionsMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/components/JobQueueContext', () => ({
  useJobQueueState: (...args: unknown[]) => useJobQueueStateMock(...args),
  useJobQueueActions: (...args: unknown[]) => useJobQueueActionsMock(...args),
}));

vi.mock('@/features/ai/ai-paths/context', () => ({
  useRunHistoryActions: (...args: unknown[]) => useRunHistoryActionsMock(...args),
}));

import { JobQueueRunCard } from '../job-queue-run-card';

const createRun = (status: string): AiPathRunRecord =>
  ({
    id: 'run-1',
    createdAt: '2026-03-05T00:00:00.000Z',
    updatedAt: '2026-03-05T00:00:00.000Z',
    status,
    pathId: 'path-1',
    pathName: 'Test Path',
    triggerEvent: 'manual',
  }) as AiPathRunRecord;

const buildContextValue = (): JobQueueContextValue =>
  ({
    pathFilter: '',
    setPathFilter: vi.fn(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
    statusFilter: 'all',
    setStatusFilter: vi.fn(),
    pageSize: 25,
    setPageSize: vi.fn(),
    page: 1,
    setPage: vi.fn(),
    expandedRunIds: new Set<string>(),
    toggleRun: vi.fn(),
    runDetails: {},
    runDetailLoading: new Set<string>(),
    runDetailErrors: {},
    historySelection: {},
    setHistorySelection: vi.fn(),
    streamStatuses: {},
    pausedStreams: new Set<string>(),
    toggleStream: vi.fn(),
    pauseAllStreams: vi.fn(),
    resumeAllStreams: vi.fn(),
    autoRefreshEnabled: false,
    setAutoRefreshEnabled: vi.fn(),
    autoRefreshInterval: 1000,
    setAutoRefreshInterval: vi.fn(),
    showMetricsPanel: false,
    setShowMetricsPanel: vi.fn(),
    queueHistory: [],
    setQueueHistory: vi.fn(),
    clearScope: null,
    setClearScope: vi.fn(),
    runToDelete: null,
    setRunToDelete: vi.fn(),
    panelLabel: 'Queue',
    panelDescription: 'Queue',
    lagThresholdMs: 0,
    runs: [],
    total: 0,
    totalPages: 0,
    queueStatus: undefined,
    isLoadingRuns: false,
    isLoadingQueueStatus: false,
    runsQueryError: null,
    isClearingRuns: false,
    isCancelingRun: () => false,
    isDeletingRun: () => false,
    refetchQueueData: vi.fn(),
    handleClearRuns: async () => {},
    handleCancelRun: async () => {},
    handleDeleteRun: async () => {},
    loadRunDetail: async () => {},
  }) as JobQueueContextValue;

const toActionsValue = (value: JobQueueContextValue): JobQueueActionsValue => ({
  setPathFilter: value.setPathFilter,
  setSearchQuery: value.setSearchQuery,
  setStatusFilter: value.setStatusFilter,
  setPageSize: value.setPageSize,
  setPage: value.setPage,
  toggleRun: value.toggleRun,
  setHistorySelection: value.setHistorySelection,
  toggleStream: value.toggleStream,
  pauseAllStreams: value.pauseAllStreams,
  resumeAllStreams: value.resumeAllStreams,
  setAutoRefreshEnabled: value.setAutoRefreshEnabled,
  setAutoRefreshInterval: value.setAutoRefreshInterval,
  setShowMetricsPanel: value.setShowMetricsPanel,
  setQueueHistory: value.setQueueHistory,
  setClearScope: value.setClearScope,
  setRunToDelete: value.setRunToDelete,
  refetchQueueData: value.refetchQueueData,
  handleClearRuns: value.handleClearRuns,
  handleCancelRun: value.handleCancelRun,
  handleDeleteRun: value.handleDeleteRun,
  loadRunDetail: value.loadRunDetail,
});

const toStateValue = (value: JobQueueContextValue): JobQueueStateValue => {
  const {
    setPathFilter: _setPathFilter,
    setSearchQuery: _setSearchQuery,
    setStatusFilter: _setStatusFilter,
    setPageSize: _setPageSize,
    setPage: _setPage,
    toggleRun: _toggleRun,
    setHistorySelection: _setHistorySelection,
    toggleStream: _toggleStream,
    pauseAllStreams: _pauseAllStreams,
    resumeAllStreams: _resumeAllStreams,
    setAutoRefreshEnabled: _setAutoRefreshEnabled,
    setAutoRefreshInterval: _setAutoRefreshInterval,
    setShowMetricsPanel: _setShowMetricsPanel,
    setQueueHistory: _setQueueHistory,
    setClearScope: _setClearScope,
    setRunToDelete: _setRunToDelete,
    refetchQueueData: _refetchQueueData,
    handleClearRuns: _handleClearRuns,
    handleCancelRun: _handleCancelRun,
    handleDeleteRun: _handleDeleteRun,
    loadRunDetail: _loadRunDetail,
    ...state
  } = value;
  return state;
};

describe('JobQueueRunCard status pills', () => {
  beforeEach(() => {
    const contextValue = buildContextValue();
    const runHistoryActions = {
      resumeRun: vi.fn(),
      retryRunNode: vi.fn(),
    };
    useJobQueueStateMock.mockReset();
    useJobQueueActionsMock.mockReset();
    useRunHistoryActionsMock.mockReset();
    useJobQueueStateMock.mockReturnValue(toStateValue(contextValue));
    useJobQueueActionsMock.mockReturnValue(toActionsValue(contextValue));
    useRunHistoryActionsMock.mockReturnValue(runHistoryActions);
  });

  it('renders only dotted running indicator for running runs', () => {
    render(<JobQueueRunCard runId='run-1' run={createRun('running')} />);

    expect(screen.getAllByText('Running')).toHaveLength(1);
    expect(screen.queryByText('running')).toBeNull();
  });

  it('renders status badge for non-running runs', () => {
    render(<JobQueueRunCard runId='run-1' run={createRun('queued')} />);

    expect(screen.getByText('queued')).toBeTruthy();
    expect(screen.queryByText('Running')).toBeNull();
  });

  it('retries failed history entries from the run card history panel', () => {
    const retryRunNode = vi.fn().mockResolvedValue(undefined);
    useRunHistoryActionsMock.mockReturnValue({
      resumeRun: vi.fn(),
      retryRunNode,
    });

    const contextValue = buildContextValue();
    contextValue.expandedRunIds = new Set(['run-1']);
    contextValue.runDetails = {
      'run-1': {
        run: {
          ...createRun('failed'),
          runtimeState: {
            history: {
              'node-failed': [
                {
                  timestamp: '2026-03-07T11:00:00.000Z',
                  pathId: 'path-1',
                  pathName: 'Test Path',
                  traceId: 'run-1',
                  spanId: 'node-failed:1:1',
                  nodeId: 'node-failed',
                  nodeType: 'template',
                  nodeTitle: 'Recover',
                  status: 'failed',
                  iteration: 1,
                  attempt: 1,
                  inputs: { value: 'seeded' },
                  outputs: { status: 'failed', error: 'boom' },
                  inputHash: 'hash-failed',
                  error: 'boom',
                },
              ],
            },
          },
          graph: {
            nodes: [
              {
                id: 'node-failed',
                type: 'template',
                title: 'Recover',
                position: { x: 0, y: 0 },
                data: {},
              },
            ],
            edges: [],
          },
        },
        nodes: [],
        events: [],
      },
    };
    useJobQueueStateMock.mockReturnValue(toStateValue(contextValue));
    useJobQueueActionsMock.mockReturnValue(toActionsValue(contextValue));

    render(<JobQueueRunCard runId='run-1' run={createRun('failed')} />);

    fireEvent.click(screen.getByRole('button', { name: 'Run history' }));
    fireEvent.click(screen.getByRole('button', { name: 'Retry node' }));

    expect(retryRunNode).toHaveBeenCalledWith('run-1', 'node-failed');
  });
});
