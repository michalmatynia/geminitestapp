import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React, { useEffect } from 'react';
import { vi } from 'vitest';

import { RunHistoryPanel } from '@/features/ai/ai-paths/components/run-history-panel';
import {
  RunHistoryProvider,
  useRunHistoryActions,
  type RunHistoryOperationHandlers,
} from '@/features/ai/ai-paths/context';
import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';

// Mock child components/utils
vi.mock('@/features/ai/ai-paths/components/RunHistoryEntries', () => ({
  RunHistoryEntries: () => <div data-testid='history-entries' />,
}));
vi.mock('@/features/ai/ai-paths/components/run-history-utils', () => ({
  buildHistoryNodeOptions: () => [],
}));

interface RunHistoryPanelHarnessProps {
  runs: AiPathRunRecord[];
  operationHandlers: RunHistoryOperationHandlers;
}

function RunHistoryPanelHarness({
  runs,
  operationHandlers,
}: RunHistoryPanelHarnessProps): React.JSX.Element {
  const actions = useRunHistoryActions();

  useEffect(() => {
    actions.setRunList(runs);
    actions.setRunOperationHandlers(operationHandlers);
    return () => {
      actions.setRunOperationHandlers(null);
    };
  }, [actions, operationHandlers, runs]);

  return <RunHistoryPanel />;
}

describe('RunHistoryPanel Component', () => {
  const renderPanel = ({
    runs = [],
    operationHandlers = {},
  }: {
    runs?: AiPathRunRecord[];
    operationHandlers?: RunHistoryOperationHandlers;
  } = {}) =>
    render(
      <RunHistoryProvider>
        <RunHistoryPanelHarness runs={runs} operationHandlers={operationHandlers} />
      </RunHistoryProvider>
    );

  it('should render empty state', () => {
    renderPanel();
    expect(screen.getByText('No runs yet')).toBeInTheDocument();
  });

  it('should render a list of runs', async () => {
    const runs = [
      { id: 'run-1', status: 'completed', createdAt: new Date().toISOString() },
      { id: 'run-2', status: 'failed', createdAt: new Date().toISOString() },
    ] as AiPathRunRecord[];
    renderPanel({ runs });

    expect(await screen.findByText(/completed/i)).toBeInTheDocument();
    // Use getAllByText because "Failed" also appears in filter buttons
    expect(screen.getAllByText(/failed/i).length).toBeGreaterThan(1);
  });

  it('should filter runs when a filter button is clicked', async () => {
    const runs = [
      { id: 'run-completed', status: 'completed', createdAt: new Date().toISOString() },
      { id: 'run-running', status: 'running', createdAt: new Date().toISOString() },
    ] as AiPathRunRecord[];
    renderPanel({ runs });

    const activeFilter = await screen.findByText('Active');
    fireEvent.click(activeFilter);

    await waitFor(() => {
      expect(screen.queryByText(/completed/i)).not.toBeInTheDocument();
    });
    expect(screen.getByText(/running/i)).toBeInTheDocument();
  });

  it("should show 'Resume' button only for failed/paused runs", async () => {
    const runs = [
      { id: 'run-failed', status: 'failed', createdAt: new Date().toISOString() },
      { id: 'run-running', status: 'running', createdAt: new Date().toISOString() },
    ] as AiPathRunRecord[];
    renderPanel({ runs });

    expect(await screen.findByText('Resume')).toBeInTheDocument();
    // Replay button is always shown for runs, but let's check count
    const resumeButtons = screen.queryAllByText('Resume');
    expect(resumeButtons.length).toBe(1);
  });

  it('should call onResumeRun when Resume is clicked', async () => {
    const runs = [
      { id: 'run-failed', status: 'failed', createdAt: new Date().toISOString() },
    ] as AiPathRunRecord[];
    const handleResumeRun = vi.fn().mockResolvedValue(undefined);
    renderPanel({
      runs,
      operationHandlers: {
        resumeRun: handleResumeRun,
      },
    });

    fireEvent.click(await screen.findByText('Resume'));
    await waitFor(() => {
      expect(handleResumeRun).toHaveBeenCalledWith('run-failed', 'resume');
    });
  });

  it('should call onCancelRun when Cancel is clicked for active runs', async () => {
    const runs = [
      { id: 'run-active', status: 'running', createdAt: new Date().toISOString() },
    ] as AiPathRunRecord[];
    const handleCancelRun = vi.fn().mockResolvedValue(undefined);
    renderPanel({
      runs,
      operationHandlers: {
        cancelRun: handleCancelRun,
      },
    });

    fireEvent.click(await screen.findByText('Cancel'));
    await waitFor(() => {
      expect(handleCancelRun).toHaveBeenCalledWith('run-active');
    });
  });
});
