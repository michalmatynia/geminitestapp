import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  timelineItems: [] as Array<Record<string, unknown>>,
  durationRows: [] as Array<Record<string, unknown>>,
  logClientError: vi.fn(), logClientCatch: vi.fn(),
}));

vi.mock('../run-trace-utils', () => ({
  buildRuntimeTimelineItems: () => mockState.timelineItems,
  buildRuntimeDurationRows: () => mockState.durationRows,
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: (...args: unknown[]) => mockState.logClientError(...args),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>): React.JSX.Element => (
    <button {...props}>{children}</button>
  ),
  Tooltip: ({
    content,
    children,
  }: {
    content: React.ReactNode;
    children: React.ReactNode;
  }): React.JSX.Element => (
    <div data-testid='tooltip' data-content={String(content)}>
      {children}
    </div>
  ),
  StatusBadge: ({
    status,
    variant,
  }: {
    status: React.ReactNode;
    variant?: string;
  }): React.JSX.Element => <span>{`${String(status)}:${variant ?? 'none'}`}</span>,
  Alert: ({
    children,
  }: {
    children: React.ReactNode;
  }): React.JSX.Element => <div data-testid='alert'>{children}</div>,
}));

import { RunTimeline } from '../run-timeline';

const run = {
  id: 'run-1',
  status: 'completed',
} as Parameters<typeof RunTimeline>[0]['run'];

const nodes = [] as Parameters<typeof RunTimeline>[0]['nodes'];

describe('RunTimeline', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockState.logClientError.mockReset();
    mockState.timelineItems = [];
    mockState.durationRows = [];
  });

  it('renders duration summaries, runtime timeline entries, and sorted event logs', () => {
    const circularMetadata: Record<string, unknown> = { label: 'broken' };
    circularMetadata['self'] = circularMetadata;

    mockState.durationRows = [
      {
        id: 'duration-1',
        label: 'Node Fast',
        status: 'completed',
        source: 'trace',
        durationMs: 1000,
      },
      {
        id: 'duration-2',
        label: 'Node Slow',
        status: 'failed',
        source: 'history',
        durationMs: 4000,
      },
      {
        id: 'duration-3',
        label: 'Node Untimed',
        status: 'completed',
        source: 'trace',
        durationMs: null,
      },
    ];
    mockState.timelineItems = [
      {
        id: 'timeline-run',
        kind: 'run',
        timestamp: new Date('2026-03-19T09:00:00.000Z'),
        status: 'completed',
        source: 'runtime',
        label: 'Run completed',
        description: 'Finished without retries.',
        details: ['path:path-1'],
        meta: 'Persisted summary mismatch',
      },
      {
        id: 'timeline-node',
        kind: 'node',
        timestamp: new Date('2026-03-19T08:59:00.000Z'),
        status: 'running',
        source: 'trace',
        label: 'Node A',
        description: null,
        details: [],
        meta: null,
      },
    ];

    const events = [
      {
        id: 'event-older',
        createdAt: '2026-03-19T09:00:00.000Z',
        level: 'warning',
        message: 'Older event',
        metadata: { attempt: 1 },
      },
      {
        id: 'event-newer',
        createdAt: '2026-03-19T09:05:00.000Z',
        level: 'error',
        message: 'Newer event',
        metadata: circularMetadata,
      },
    ] as Parameters<typeof RunTimeline>[0]['events'];

    render(
      <RunTimeline
        run={run}
        nodes={nodes}
        events={events}
        eventsOverflow
        eventsBatchLimit={50}
      />
    );

    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Persisted:success')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nodes (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Events (2)' })).toBeInTheDocument();

    expect(screen.getByText('Trace span duration summary')).toBeInTheDocument();
    expect(screen.getByText(/Total 5s/)).toBeInTheDocument();
    expect(screen.getByText(/Avg 3s/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fastest: Node Fast · 1s' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Slowest: Node Slow · 4s' })).toBeInTheDocument();
    expect(screen.getByText(/Timed 2\/3/)).toBeInTheDocument();
    expect(screen.getByText('Node Fast')).toBeInTheDocument();
    expect(screen.getByText('Node Slow')).toBeInTheDocument();
    expect(screen.getByText('Node Untimed')).toBeInTheDocument();
    expect(screen.getAllByText('completed:success').length).toBeGreaterThan(0);
    expect(screen.getAllByText('failed:error').length).toBeGreaterThan(0);
    expect(screen.getAllByText('trace').length).toBeGreaterThan(0);
    expect(screen.getAllByText('history').length).toBeGreaterThan(0);

    expect(screen.getByText('Runtime timeline')).toBeInTheDocument();
    expect(screen.getByText('2 entries')).toBeInTheDocument();
    expect(screen.getByText('Run completed')).toBeInTheDocument();
    expect(screen.getByText('Finished without retries.')).toBeInTheDocument();
    expect(screen.getByText('path:path-1')).toBeInTheDocument();
    expect(screen.getByTestId('alert')).toHaveTextContent('Persisted summary mismatch');

    expect(screen.getByText('Logs')).toBeInTheDocument();
    expect(screen.getByText('Truncated (limit 50):warning')).toBeInTheDocument();
    const logEntries = screen.getAllByText(/event$/);
    expect(logEntries[0]?.textContent).toBe('Newer event');
    expect(logEntries[1]?.textContent).toBe('Older event');
    expect(screen.getByText('error:error')).toBeInTheDocument();
    expect(screen.getByText('warning:warning')).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === '{\n  "attempt": 1\n}')
    ).toBeInTheDocument();
    expect(screen.getByText(/circular/i)).toBeInTheDocument();
    expect(mockState.logClientError).toHaveBeenCalledTimes(1);
  });

  it('persists filter and sort selections and can empty the timeline for current filters', async () => {
    mockState.durationRows = [
      {
        id: 'duration-1',
        label: 'Node B',
        status: 'failed',
        source: 'trace',
        durationMs: 2500,
      },
      {
        id: 'duration-2',
        label: 'Node A',
        status: 'completed',
        source: 'trace',
        durationMs: 500,
      },
    ];
    mockState.timelineItems = [
      {
        id: 'timeline-run',
        kind: 'run',
        timestamp: new Date('2026-03-19T09:00:00.000Z'),
        status: 'completed',
        source: 'runtime',
        label: 'Run only',
        description: null,
        details: [],
        meta: null,
      },
      {
        id: 'timeline-node',
        kind: 'node',
        timestamp: new Date('2026-03-19T08:59:00.000Z'),
        status: 'failed',
        source: 'trace',
        label: 'Node only',
        description: null,
        details: [],
        meta: null,
      },
    ];

    render(<RunTimeline run={run} nodes={nodes} events={[]} />);

    fireEvent.click(screen.getByRole('button', { name: 'A-Z' }));
    await waitFor(() => {
      expect(window.localStorage.getItem('ai-paths-run-timeline-status-sort')).toBe('alpha');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Run (1)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nodes (1)' }));

    await waitFor(() => {
      expect(
        JSON.parse(window.localStorage.getItem('ai-paths-run-timeline-filters') ?? '{}')
      ).toEqual({
        run: false,
        node: false,
        event: true,
      });
    });
    expect(screen.getByText('Timeline is empty for the current filters.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Restore defaults' }));

    await waitFor(() => {
      expect(window.localStorage.getItem('ai-paths-run-timeline-status-sort')).toBe('count');
      expect(
        JSON.parse(window.localStorage.getItem('ai-paths-run-timeline-filters') ?? '{}')
      ).toEqual({
        run: true,
        node: true,
        event: true,
      });
    });
    expect(screen.getByText('Run only')).toBeInTheDocument();
    expect(screen.getByText('Node only')).toBeInTheDocument();
  });

  it('handles malformed stored filters and shows empty states when no data is available', () => {
    window.localStorage.setItem('ai-paths-run-timeline-filters', '{bad-json');

    render(<RunTimeline run={run} nodes={nodes} events={[]} />);

    expect(screen.getByText('No node timing data available yet.')).toBeInTheDocument();
    expect(screen.getByText('Timeline is empty for the current filters.')).toBeInTheDocument();
    expect(screen.getByText('No logs captured for this run yet.')).toBeInTheDocument();
    expect(mockState.logClientError).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Filters only' }));

    const filterButtons = [
      screen.getByRole('button', { name: 'Run (0)' }),
      screen.getByRole('button', { name: 'Nodes (0)' }),
      screen.getByRole('button', { name: 'Events (0)' }),
    ];
    filterButtons.forEach((button) => {
      expect(button).toBeInTheDocument();
    });

    const logsHeading = screen.getByText('Logs');
    const logsSection = logsHeading.parentElement?.parentElement;
    expect(logsSection).not.toBeNull();
    if (logsSection) {
      expect(within(logsSection).getByText('No logs captured for this run yet.')).toBeInTheDocument();
    }
  });
});
