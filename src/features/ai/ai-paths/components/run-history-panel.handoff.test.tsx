import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useRunHistoryStateMock, useRunHistoryActionsMock, handoffRunMock } = vi.hoisted(() => ({
  useRunHistoryStateMock: vi.fn(),
  useRunHistoryActionsMock: vi.fn(),
  handoffRunMock: vi.fn(),
}));

vi.mock('../context', () => ({
  useRunHistoryState: useRunHistoryStateMock,
  useRunHistoryActions: useRunHistoryActionsMock,
}));

vi.mock('./run-history-utils', () => ({
  buildHistoryNodeOptions: vi.fn(() => []),
}));

vi.mock('./run-history-entry-actions', () => ({
  resolveRunHistoryEntryAction: vi.fn(() => null),
}));

vi.mock('./run-trace-utils', () => ({
  buildRunTraceComparison: vi.fn(() => null),
  readRuntimeTraceSummary: vi.fn(() => null),
  runTraceComparisonRowHasResumeChange: vi.fn(() => false),
}));

vi.mock('./RunHistoryEntries', () => ({
  RunHistoryEntries: () => <div>history entries</div>,
}));

import { RunHistoryPanel } from './run-history-panel';

describe('RunHistoryPanel handoff action', () => {
  beforeEach(() => {
    useRunHistoryStateMock.mockReset().mockReturnValue({
      runList: [
        {
          id: 'run-1',
          status: 'blocked_on_lease',
          createdAt: '2026-03-09T10:00:00.000Z',
          updatedAt: '2026-03-09T10:00:00.000Z',
          pathId: 'path-1',
          pathName: 'Blocked Run',
          meta: null,
        },
      ],
      runsRefreshing: false,
      expandedRunHistory: {},
      runHistorySelection: {},
      runFilter: 'all',
    });
    handoffRunMock.mockReset().mockResolvedValue(true);
    useRunHistoryActionsMock.mockReset().mockReturnValue({
      setRunFilter: vi.fn(),
      setExpandedRunHistory: vi.fn(),
      setRunHistorySelection: vi.fn(),
      refreshRuns: vi.fn(),
      openRunDetail: vi.fn(),
      resumeRun: vi.fn(),
      handoffRun: handoffRunMock,
      retryRunNode: vi.fn(),
      cancelRun: vi.fn(),
      requeueDeadLetter: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders a handoff action for blocked runs and shows inline success feedback', async () => {
    render(<RunHistoryPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Mark handoff-ready' }));

    expect(handoffRunMock).toHaveBeenCalledWith('run-1');
    await waitFor(() => {
      expect(screen.getByText('Handoff requested. Refreshing status...')).toBeTruthy();
    });
  });

  it('cleans up the handoff reset timeout on unmount', async () => {
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    const view = render(<RunHistoryPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Mark handoff-ready' }));

    expect(await screen.findByText('Handoff requested. Refreshing status...')).toBeTruthy();

    const callsBeforeUnmount = clearTimeoutSpy.mock.calls.length;
    view.unmount();

    expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(callsBeforeUnmount);
  });
});
