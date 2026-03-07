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

const buildComparedRuns = (): AiPathRunRecord[] => {
  const leftRun = {
    id: 'run-left',
    status: 'completed',
    pathId: 'path-1',
    pathName: 'Path 1',
    createdAt: '2026-03-07T10:00:00.000Z',
    startedAt: '2026-03-07T10:00:01.000Z',
    finishedAt: '2026-03-07T10:00:03.000Z',
    runtimeState: {
      history: {
        'node-resume': [
          {
            timestamp: '2026-03-07T10:00:01.100Z',
            pathId: 'path-1',
            pathName: 'Path 1',
            traceId: 'run-left',
            spanId: 'node-resume:1:1',
            nodeId: 'node-resume',
            nodeType: 'fetcher',
            nodeTitle: 'Resume Node',
            status: 'completed',
            iteration: 1,
            attempt: 1,
            inputs: { query: 'alpha' },
            outputs: { value: 'left' },
          },
        ],
        'node-plain': [
          {
            timestamp: '2026-03-07T10:00:01.200Z',
            pathId: 'path-1',
            pathName: 'Path 1',
            traceId: 'run-left',
            spanId: 'node-plain:1:1',
            nodeId: 'node-plain',
            nodeType: 'parser',
            nodeTitle: 'Plain Node',
            status: 'completed',
            iteration: 1,
            attempt: 1,
            inputs: { value: 'left-input' },
            outputs: { value: 'left-output' },
          },
        ],
      },
    },
    meta: {
      runtimeTrace: {
        version: 'ai-paths.trace.v1',
        traceId: 'run-left',
        runId: 'run-left',
        source: 'server',
        startedAt: '2026-03-07T10:00:01.000Z',
        finishedAt: '2026-03-07T10:00:03.000Z',
        spans: [
          {
            spanId: 'node-resume:1:1',
            runId: 'run-left',
            traceId: 'run-left',
            nodeId: 'node-resume',
            nodeType: 'fetcher',
            nodeTitle: 'Resume Node',
            iteration: 1,
            attempt: 1,
            startedAt: '2026-03-07T10:00:01.000Z',
            finishedAt: '2026-03-07T10:00:01.100Z',
            status: 'completed',
          },
          {
            spanId: 'node-plain:1:1',
            runId: 'run-left',
            traceId: 'run-left',
            nodeId: 'node-plain',
            nodeType: 'parser',
            nodeTitle: 'Plain Node',
            iteration: 1,
            attempt: 1,
            startedAt: '2026-03-07T10:00:01.100Z',
            finishedAt: '2026-03-07T10:00:01.250Z',
            status: 'completed',
          },
        ],
      },
    },
  } as AiPathRunRecord;

  const rightRun = {
    id: 'run-right',
    status: 'completed',
    pathId: 'path-1',
    pathName: 'Path 1',
    createdAt: '2026-03-07T10:05:00.000Z',
    startedAt: '2026-03-07T10:05:01.000Z',
    finishedAt: '2026-03-07T10:05:03.000Z',
    runtimeState: {
      history: {
        'node-resume': [
          {
            timestamp: '2026-03-07T10:05:01.100Z',
            pathId: 'path-1',
            pathName: 'Path 1',
            traceId: 'run-right',
            spanId: 'node-resume:2:1',
            nodeId: 'node-resume',
            nodeType: 'fetcher',
            nodeTitle: 'Resume Node',
            status: 'cached',
            iteration: 1,
            attempt: 2,
            inputs: { query: 'alpha' },
            outputs: { value: 'left' },
            resumeMode: 'resume',
            resumeDecision: 'reused',
            resumeReason: 'completed_upstream',
          },
        ],
        'node-plain': [
          {
            timestamp: '2026-03-07T10:05:01.200Z',
            pathId: 'path-1',
            pathName: 'Path 1',
            traceId: 'run-right',
            spanId: 'node-plain:1:1',
            nodeId: 'node-plain',
            nodeType: 'parser',
            nodeTitle: 'Plain Node',
            status: 'completed',
            iteration: 1,
            attempt: 1,
            inputs: { value: 'right-input' },
            outputs: { value: 'right-output' },
          },
        ],
      },
    },
    meta: {
      runtimeTrace: {
        version: 'ai-paths.trace.v1',
        traceId: 'run-right',
        runId: 'run-right',
        source: 'server',
        startedAt: '2026-03-07T10:05:01.000Z',
        finishedAt: '2026-03-07T10:05:03.000Z',
        spans: [
          {
            spanId: 'node-resume:2:1',
            runId: 'run-right',
            traceId: 'run-right',
            nodeId: 'node-resume',
            nodeType: 'fetcher',
            nodeTitle: 'Resume Node',
            iteration: 1,
            attempt: 2,
            startedAt: '2026-03-07T10:05:01.000Z',
            finishedAt: '2026-03-07T10:05:01.050Z',
            status: 'cached',
            resume: {
              mode: 'resume',
              decision: 'reused',
              reason: 'completed_upstream',
              sourceSpanId: 'node-resume:1:1',
              sourceStatus: 'completed',
            },
          },
          {
            spanId: 'node-plain:1:1',
            runId: 'run-right',
            traceId: 'run-right',
            nodeId: 'node-plain',
            nodeType: 'parser',
            nodeTitle: 'Plain Node',
            iteration: 1,
            attempt: 1,
            startedAt: '2026-03-07T10:05:01.100Z',
            finishedAt: '2026-03-07T10:05:01.240Z',
            status: 'completed',
          },
        ],
      },
    },
  } as AiPathRunRecord;

  return [leftRun, rightRun];
};

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

  it('filters compare rows down to resume behavior changes only', async () => {
    renderPanel({ runs: buildComparedRuns() });

    fireEvent.click(screen.getByRole('button', { name: 'Compare runs' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Set A' })[0]!);
    fireEvent.click(screen.getAllByRole('button', { name: 'Set B' })[1]!);

    expect(await screen.findByText('Showing 2 of 2 rows.')).toBeInTheDocument();
    expect(screen.getByText('Resume Node (fetcher)')).toBeInTheDocument();
    expect(screen.getByText('Plain Node (parser)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Resume changes only' }));

    expect(await screen.findByText('Showing 1 of 2 rows.')).toBeInTheDocument();
    expect(screen.getByText('Resume Node (fetcher)')).toBeInTheDocument();
    expect(screen.queryByText('Plain Node (parser)')).not.toBeInTheDocument();
  });

  it('resets the compare resume-only filter when compare mode is reopened', async () => {
    renderPanel({ runs: buildComparedRuns() });

    fireEvent.click(screen.getByRole('button', { name: 'Compare runs' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Set A' })[0]!);
    fireEvent.click(screen.getAllByRole('button', { name: 'Set B' })[1]!);
    fireEvent.click(await screen.findByRole('button', { name: 'Resume changes only' }));

    expect(await screen.findByText('Showing 1 of 2 rows.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Exit compare' }));
    fireEvent.click(screen.getByRole('button', { name: 'Compare runs' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Set A' })[0]!);
    fireEvent.click(screen.getAllByRole('button', { name: 'Set B' })[1]!);

    expect(await screen.findByText('Showing 2 of 2 rows.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resume changes only' })).toBeInTheDocument();
  });

  it('clears the selected compare inspector row when the resume-only filter hides it', async () => {
    renderPanel({ runs: buildComparedRuns() });

    fireEvent.click(screen.getByRole('button', { name: 'Compare runs' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Set A' })[0]!);
    fireEvent.click(screen.getAllByRole('button', { name: 'Set B' })[1]!);

    expect(await screen.findByText('Showing 2 of 2 rows.')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Inspect payloads' })[1]!);

    expect(await screen.findByText('Payload Inspector')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide payloads' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Resume changes only' }));

    await waitFor(() => {
      expect(screen.queryByText('Payload Inspector')).not.toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Hide payloads' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show all rows' }));

    expect(await screen.findByText('Showing 2 of 2 rows.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hide payloads' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Inspect payloads' })).toHaveLength(2);
  });
});
