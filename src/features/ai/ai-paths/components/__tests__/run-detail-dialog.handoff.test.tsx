import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useRunHistoryStateMock,
  useRunHistoryActionsMock,
  handoffRunMock,
  collectPlaywrightArtifactsMock,
  collectPlaywrightRuntimePosturesMock,
  formatPlaywrightRuntimePostureBrowserMock,
  formatPlaywrightRuntimePostureIdentityMock,
  formatPlaywrightRuntimePostureProxyMock,
  formatPlaywrightRuntimePostureStickyStateMock,
  resolvePlaywrightArtifactDisplayNameMock,
} = vi.hoisted(() => ({
  useRunHistoryStateMock: vi.fn(),
  useRunHistoryActionsMock: vi.fn(),
  handoffRunMock: vi.fn(),
  collectPlaywrightArtifactsMock: vi.fn(),
  collectPlaywrightRuntimePosturesMock: vi.fn(),
  formatPlaywrightRuntimePostureBrowserMock: vi.fn(),
  formatPlaywrightRuntimePostureIdentityMock: vi.fn(),
  formatPlaywrightRuntimePostureProxyMock: vi.fn(),
  formatPlaywrightRuntimePostureStickyStateMock: vi.fn(),
  resolvePlaywrightArtifactDisplayNameMock: vi.fn(),
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
  collectPlaywrightArtifacts: collectPlaywrightArtifactsMock,
  collectPlaywrightRuntimePostures: collectPlaywrightRuntimePosturesMock,
  formatPlaywrightRuntimePostureBrowser: formatPlaywrightRuntimePostureBrowserMock,
  formatPlaywrightRuntimePostureIdentity: formatPlaywrightRuntimePostureIdentityMock,
  formatPlaywrightRuntimePostureProxy: formatPlaywrightRuntimePostureProxyMock,
  formatPlaywrightRuntimePostureStickyState: formatPlaywrightRuntimePostureStickyStateMock,
  resolvePlaywrightArtifactDisplayName: resolvePlaywrightArtifactDisplayNameMock,
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
    collectPlaywrightArtifactsMock.mockReset().mockReturnValue([]);
    collectPlaywrightRuntimePosturesMock.mockReset().mockReturnValue([]);
    formatPlaywrightRuntimePostureBrowserMock.mockReset().mockReturnValue(null);
    formatPlaywrightRuntimePostureIdentityMock.mockReset().mockReturnValue(null);
    formatPlaywrightRuntimePostureProxyMock.mockReset().mockReturnValue(null);
    formatPlaywrightRuntimePostureStickyStateMock.mockReset().mockReturnValue(null);
    resolvePlaywrightArtifactDisplayNameMock
      .mockReset()
      .mockImplementation((artifact: { name: string }) => artifact.name);
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

  it('renders aggregated Playwright runtime posture and relabeled posture artifacts', () => {
    collectPlaywrightArtifactsMock.mockReturnValue([
      {
        nodeId: 'node-playwright',
        nodeTitle: 'Playwright node',
        nodeType: 'playwright',
        name: 'runtime-posture',
        path: 'run-1/runtime-posture.json',
        url: '/api/ai-paths/playwright/run-1/artifacts/runtime-posture.json',
        mimeType: 'application/json',
        kind: 'json',
      },
    ]);
    collectPlaywrightRuntimePosturesMock.mockReturnValue([
      {
        nodeId: 'node-playwright',
        nodeTitle: 'Playwright node',
        nodeType: 'playwright',
      },
    ]);
    formatPlaywrightRuntimePostureBrowserMock.mockReturnValue('Chrome · Headed');
    formatPlaywrightRuntimePostureIdentityMock.mockReturnValue(
      'Search profile · en-US · America/New_York'
    );
    formatPlaywrightRuntimePostureProxyMock.mockReturnValue(
      'Brightdata · Sticky · Applied · proxy.local:8080'
    );
    formatPlaywrightRuntimePostureStickyStateMock.mockReturnValue('Loaded sticky state');
    resolvePlaywrightArtifactDisplayNameMock.mockReturnValue('Runtime posture');

    render(<RunDetailDialog />);

    expect(screen.getByText('Playwright Artifacts (1)')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Runtime posture' })
    ).toHaveAttribute('href', '/api/ai-paths/playwright/run-1/artifacts/runtime-posture.json');
    expect(screen.getByText('Playwright Runtime Posture (1)')).toBeTruthy();
    expect(screen.getByText('Chrome · Headed')).toBeTruthy();
    expect(screen.getByText('Search profile · en-US · America/New_York')).toBeTruthy();
    expect(screen.getByText('Brightdata · Sticky · Applied · proxy.local:8080')).toBeTruthy();
    expect(screen.getByText('Loaded sticky state')).toBeTruthy();
  });
});
