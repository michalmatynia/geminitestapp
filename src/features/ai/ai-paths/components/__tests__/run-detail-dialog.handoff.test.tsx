import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useRunHistoryStateMock, useRunHistoryActionsMock, handoffRunMock } = vi.hoisted(() => ({
  useRunHistoryStateMock: vi.fn(),
  useRunHistoryActionsMock: vi.fn(),
  handoffRunMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/context', () => ({
  useRunHistoryState: useRunHistoryStateMock,
  useRunHistoryActions: useRunHistoryActionsMock,
}));

vi.mock('@/shared/ui/templates/modals/DetailModal', () => ({
  DetailModal: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) =>
    isOpen ? <div>{children}</div> : null,
}));

vi.mock('@/features/ai/ai-paths/components/job-queue-panel-utils', () => ({
  normalizeRunEvents: vi.fn(() => []),
  normalizeRunNodes: vi.fn(() => []),
}));

vi.mock('@/features/ai/ai-paths/components/playwright-artifacts', () => ({
  collectPlaywrightArtifacts: vi.fn(() => []),
}));

vi.mock('@/features/ai/ai-paths/components/run-history-utils', () => ({
  buildHistoryNodeOptions: vi.fn(() => []),
}));

vi.mock('@/features/ai/ai-paths/components/run-history-entry-actions', () => ({
  resolveRunHistoryEntryAction: vi.fn(() => null),
}));

vi.mock('@/features/ai/ai-paths/components/run-trace-utils', () => ({
  readRuntimeTraceSummary: vi.fn(() => null),
}));

vi.mock('@/features/ai/ai-paths/components/run-timeline', () => ({
  RunTimeline: () => <div>timeline</div>,
}));

vi.mock('@/features/ai/ai-paths/components/RunHistoryEntries', () => ({
  RunHistoryEntries: () => <div>history</div>,
}));

import { RunDetailDialog } from '../run-detail-dialog';

describe('RunDetailDialog handoff action', () => {
  beforeEach(() => {
    useRunHistoryStateMock.mockReset().mockReturnValue({
      runDetailOpen: true,
      runDetailLoading: false,
      runDetail: {
        run: {
          id: 'run-1',
          status: 'blocked_on_lease',
          createdAt: '2026-03-09T10:00:00.000Z',
          startedAt: '2026-03-09T10:01:00.000Z',
          finishedAt: null,
          triggerEvent: 'manual',
          meta: {
            executionLease: {
              ownerAgentId: 'agent-other',
              ownerRunId: 'run-1',
            },
          },
        },
        nodes: [],
        events: [],
      },
      runStreamStatus: 'stopped',
      runStreamPaused: false,
      runEventsOverflow: false,
      runEventsBatchLimit: null,
      runHistoryNodeId: null,
    });
    handoffRunMock.mockReset().mockResolvedValue(true);
    useRunHistoryActionsMock.mockReset().mockReturnValue({
      setRunDetailOpen: vi.fn(),
      setRunStreamPaused: vi.fn(),
      setRunHistoryNodeId: vi.fn(),
      resumeRun: vi.fn(),
      handoffRun: handoffRunMock,
      retryRunNode: vi.fn(),
    });
  });

  it('shows the lease-blocked control and triggers handoff', async () => {
    render(<RunDetailDialog />);

    expect(screen.getByText('Execution lease blocked')).toBeTruthy();
    expect(screen.getByText('Current owner: agent-other (run-1)')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Mark handoff-ready' }));

    expect(handoffRunMock).toHaveBeenCalledWith('run-1');
    await waitFor(() => {
      expect(screen.getByText('Handoff requested. Refreshing run status...')).toBeTruthy();
    });
  });
});
