import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { JobQueueContextValue } from '@/features/ai/ai-paths/components/JobQueueContext';
import type { AiPathRunRecord } from '@/shared/lib/ai-paths';

const { useJobQueueContextMock } = vi.hoisted(() => ({
  useJobQueueContextMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/components/JobQueueContext', () => ({
  useJobQueueContext: (...args: unknown[]) => useJobQueueContextMock(...args),
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

describe('JobQueueRunCard status pills', () => {
  beforeEach(() => {
    useJobQueueContextMock.mockReset();
    useJobQueueContextMock.mockReturnValue(buildContextValue());
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
});
