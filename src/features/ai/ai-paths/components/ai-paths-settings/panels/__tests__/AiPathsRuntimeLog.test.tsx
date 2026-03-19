import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockState = vi.hoisted(() => ({
  runtimeState: {
    runtimeEvents: [] as Array<Record<string, unknown>>,
    eventsOverflowed: false,
  },
}));

vi.mock('@/features/ai/ai-paths/context', () => ({
  useRuntimeState: () => mockState.runtimeState,
}));

vi.mock('@/shared/ui', () => ({
  StatusBadge: ({
    status,
    variant,
    size,
    className,
  }: {
    status: string;
    variant: string;
    size: string;
    className?: string;
  }) => (
    <div
      data-testid='status-badge'
      data-status={status}
      data-variant={variant}
      data-size={size}
      data-classname={className ?? ''}
    />
  ),
  CompactEmptyState: ({
    title,
    description,
    className,
  }: {
    title: string;
    description: string;
    className?: string;
  }) => (
    <div data-testid='empty-state' data-classname={className ?? ''}>
      <div>{title}</div>
      <div>{description}</div>
    </div>
  ),
}));

import { AiPathsRuntimeLog } from '../AiPathsRuntimeLog';

describe('AiPathsRuntimeLog', () => {
  beforeEach(() => {
    mockState.runtimeState = {
      runtimeEvents: [],
      eventsOverflowed: false,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the empty state when there are no runtime events', () => {
    render(<AiPathsRuntimeLog />);

    expect(screen.getByText('Live Runtime Log')).toBeInTheDocument();
    expect(
      screen.getByText('Last 0 runtime events from local + server execution.')
    ).toBeInTheDocument();
    expect(screen.getByTestId('empty-state')).toHaveAttribute(
      'data-classname',
      'border-dashed border-border/60 py-4'
    );
    expect(screen.getByText('Log empty')).toBeInTheDocument();
    expect(
      screen.getByText('Runtime log is empty. Fire a trigger to stream node/run events.')
    ).toBeInTheDocument();
    expect(screen.queryByText(/Older events were dropped/)).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('status-badge')).toHaveLength(0);
  });

  it('renders the newest 80 events in reverse order with overflow and badge fallbacks', () => {
    vi.spyOn(Date.prototype, 'toLocaleTimeString').mockImplementation(function (this: Date) {
      return this.toISOString().slice(11, 16);
    });

    const runtimeEvents = Array.from({ length: 82 }, (_, index) => ({
      id: `event-${index}`,
      timestamp: new Date(Date.UTC(2026, 2, 19, 12, index, 0)).toISOString(),
      level: 'info',
      nodeType: 'default',
      type: 'generic',
      message: `Event ${index}`,
    }));

    runtimeEvents[79] = {
      ...runtimeEvents[79],
      level: undefined,
      nodeType: undefined,
      type: undefined,
      message: 'Third newest fallback',
    };
    runtimeEvents[80] = {
      ...runtimeEvents[80],
      level: 'warn',
      nodeType: undefined,
      type: 'queue',
      message: 'Second newest warning',
    };
    runtimeEvents[81] = {
      ...runtimeEvents[81],
      level: 'error',
      nodeType: 'model',
      type: 'ignored',
      message: 'Newest error',
    };

    mockState.runtimeState = {
      runtimeEvents,
      eventsOverflowed: true,
    };

    render(<AiPathsRuntimeLog />);

    expect(
      screen.getByText('Last 80 runtime events from local + server execution.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Older events were dropped (log capped at 82 entries). Open Run Detail for the full server-side event history.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('Event 0')).not.toBeInTheDocument();
    expect(screen.queryByText('Event 1')).not.toBeInTheDocument();
    expect(screen.getByText('Event 2')).toBeInTheDocument();
    expect(screen.getByText('Newest error')).toBeInTheDocument();
    expect(screen.getByText('Second newest warning')).toBeInTheDocument();
    expect(screen.getByText('Third newest fallback')).toBeInTheDocument();

    expect(screen.getAllByText(/^\d{2}:\d{2}$/).slice(0, 3).map((node) => node.textContent)).toEqual([
      '13:21',
      '13:20',
      '13:19',
    ]);

    expect(
      screen
        .getAllByTestId('status-badge')
        .slice(0, 6)
        .map((node) => ({
          status: node.getAttribute('data-status'),
          variant: node.getAttribute('data-variant'),
        }))
    ).toEqual([
      { status: 'error', variant: 'error' },
      { status: 'model', variant: 'neutral' },
      { status: 'warn', variant: 'warning' },
      { status: 'queue', variant: 'neutral' },
      { status: 'info', variant: 'info' },
      { status: 'event', variant: 'neutral' },
    ]);
  });
});
