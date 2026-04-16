import React from 'react';
import { act } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  JobQueueActionsValue,
  JobQueueContextValue,
  JobQueueStateValue,
} from '@/features/ai/ai-paths/components/JobQueueContext';
import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';

const { useJobQueueStateMock, useJobQueueActionsMock } = vi.hoisted(() => ({
  useJobQueueStateMock: vi.fn(),
  useJobQueueActionsMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/components/JobQueueContext', () => ({
  useJobQueueState:
    useJobQueueStateMock as typeof import('@/features/ai/ai-paths/components/JobQueueContext').useJobQueueState,
  useJobQueueActions:
    useJobQueueActionsMock as typeof import('@/features/ai/ai-paths/components/JobQueueContext').useJobQueueActions,
}));

import { JobQueueList } from '../JobQueueList';

const createRun = (id: string, patch?: Partial<AiPathRunRecord>): AiPathRunRecord =>
  ({
    id,
    createdAt: '2026-03-09T07:27:00.000Z',
    updatedAt: '2026-03-09T07:27:00.000Z',
    status: 'queued',
    pathId: `path-${id}`,
    pathName: `Path ${id}`,
    triggerEvent: 'manual',
    ...patch,
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
    autoRefreshInterval: 1_000,
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
    runs: [createRun('run-1'), createRun('run-2')],
    total: 2,
    totalPages: 1,
    queueStatus: undefined,
    isLoadingRuns: false,
    isLoadingQueueStatus: false,
    runsQueryError: null,
    isClearingRuns: false,
    isCancelingRun: () => false,
    isDeletingRun: () => false,
    refetchQueueData: vi.fn(),
    handleClearRuns: async () => {},
    handleResumeRun: async () => {},
    handleHandoffRun: async () => false,
    handleRetryRunNode: async () => {},
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
  handleResumeRun: value.handleResumeRun,
  handleHandoffRun: value.handleHandoffRun,
  handleRetryRunNode: value.handleRetryRunNode,
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
    handleResumeRun: _handleResumeRun,
    handleHandoffRun: _handleHandoffRun,
    handleRetryRunNode: _handleRetryRunNode,
    handleCancelRun: _handleCancelRun,
    handleDeleteRun: _handleDeleteRun,
    loadRunDetail: _loadRunDetail,
    ...state
  } = value;

  return state;
};

describe('JobQueueList hydration', () => {
  beforeEach(() => {
    const contextValue = buildContextValue();
    useJobQueueStateMock.mockReset();
    useJobQueueActionsMock.mockReset();
    useJobQueueStateMock.mockReturnValue(toStateValue(contextValue));
    useJobQueueActionsMock.mockReturnValue(toActionsValue(contextValue));
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('hydrates a non-empty queue list without recoverable errors', async () => {
    const serverMarkup = renderToString(<JobQueueList />);

    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = serverMarkup;
    expect(container.textContent).toContain('Showing 2 of 2 runs');

    const recoverableErrors: string[] = [];
    let root: ReturnType<typeof hydrateRoot> | null = null;

    await act(async () => {
      root = hydrateRoot(container, <JobQueueList />, {
        onRecoverableError: (error) => {
          recoverableErrors.push(error.message);
        },
      });
      await Promise.resolve();
    });

    expect(recoverableErrors).toEqual([]);
    expect(container.textContent).toContain('Showing 2 of 2 runs');

    await act(async () => {
      root?.unmount();
    });
  });
});
