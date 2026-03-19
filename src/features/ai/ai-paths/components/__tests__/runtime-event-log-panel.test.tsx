import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  runtimeEvents: [] as Array<Record<string, unknown>>,
  clearRuntimeEvents: vi.fn(),
  logClientError: vi.fn(),
}));

vi.mock('../../context', () => ({
  useRuntimeState: () => ({ runtimeEvents: mockState.runtimeEvents }),
  useRuntimeActions: () => ({ clearRuntimeEvents: mockState.clearRuntimeEvents }),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: (...args: unknown[]) => mockState.logClientError(...args),
}));

vi.mock('@/shared/ui', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>): React.JSX.Element => (
    <button {...props}>{children}</button>
  ),
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  SelectSimple: ({
    ariaLabel,
    options,
    value,
    onValueChange,
    disabled,
  }: {
    ariaLabel?: string;
    options: Array<{ value: string; label: string }>;
    value?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
  }): React.JSX.Element => (
    <select
      aria-label={ariaLabel}
      value={value ?? ''}
      disabled={disabled}
      onChange={(event) => onValueChange?.(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  StatusBadge: ({
    status,
    variant,
    hideLabel,
  }: {
    status: React.ReactNode;
    variant?: string;
    hideLabel?: boolean;
  }): React.JSX.Element => (
    <span>{hideLabel ? `dot:${variant ?? 'none'}` : `${String(status)}:${variant ?? 'none'}`}</span>
  ),
}));

import { RuntimeEventLogPanel } from '../runtime-event-log-panel';

function findScrollContainer(container: HTMLElement): HTMLDivElement {
  const element = Array.from(container.querySelectorAll('div')).find((node) =>
    node.className.includes('max-h-[200px]')
  );
  if (!(element instanceof HTMLDivElement)) {
    throw new Error('Unable to find runtime event scroll container');
  }
  return element;
}

describe('RuntimeEventLogPanel', () => {
  beforeEach(() => {
    mockState.runtimeEvents = [];
    mockState.clearRuntimeEvents.mockReset();
    mockState.logClientError.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders counts, filters events, and forwards export and clear actions', async () => {
    mockState.runtimeEvents = [
      {
        id: 'event-1',
        timestamp: '2026-03-19T09:00:00.123Z',
        level: 'info',
        kind: 'run_started',
        source: 'server',
        nodeTitle: 'Node A',
        message: 'Run queued',
      },
      {
        id: 'event-2',
        timestamp: '2026-03-19T09:00:01.456Z',
        level: 'warn',
        kind: 'node_retry',
        message: 'Retrying node',
      },
      {
        id: 'event-3',
        timestamp: '2026-03-19T09:00:02.789Z',
        level: 'error',
        message: 'Unhandled event',
      },
    ];

    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:events');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    render(<RuntimeEventLogPanel />);

    expect(screen.getByText('Runtime Events')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1 err:error')).toBeInTheDocument();
    expect(screen.getByText('1 warn:warning')).toBeInTheDocument();
    expect(screen.getByLabelText('Event level filter')).toHaveValue('all');
    expect(screen.getByRole('button', { name: 'Export' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Expand event log' }));

    expect(screen.getByRole('button', { name: 'Collapse event log' })).toBeInTheDocument();
    expect(screen.getByText('Run queued')).toBeInTheDocument();
    expect(screen.getByText('Retrying node')).toBeInTheDocument();
    expect(screen.getByText('Unhandled event')).toBeInTheDocument();
    expect(screen.getByText('run_started:info')).toBeInTheDocument();
    expect(screen.getByText('node_retry:success')).toBeInTheDocument();
    expect(screen.getByText('event:neutral')).toBeInTheDocument();
    expect(screen.getByText('server:processing')).toBeInTheDocument();
    expect(screen.getByText('[Node A]')).toBeInTheDocument();
    expect(screen.getByText('dot:neutral')).toBeInTheDocument();
    expect(screen.getByText('dot:warning')).toBeInTheDocument();
    expect(screen.getByText('dot:error')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Event level filter'), { target: { value: 'warn' } });

    expect(screen.queryByText('Run queued')).not.toBeInTheDocument();
    expect(screen.getByText('Retrying node')).toBeInTheDocument();
    expect(screen.queryByText('Unhandled event')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    const exportedBlob = createObjectURLSpy.mock.calls[0]?.[0];
    expect(exportedBlob).toBeInstanceOf(Blob);
    await expect(exportedBlob?.text()).resolves.toContain('Run queued');
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:events');

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(mockState.clearRuntimeEvents).toHaveBeenCalledTimes(1);
  });

  it('auto-scrolls new events until the user scrolls away from the bottom', () => {
    mockState.runtimeEvents = [
      {
        id: 'event-1',
        timestamp: '2026-03-19T09:00:00.000Z',
        level: 'info',
        kind: 'run_started',
        message: 'First event',
      },
    ];

    const { container, rerender } = render(<RuntimeEventLogPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Expand event log' }));

    const scrollContainer = findScrollContainer(container);
    Object.defineProperty(scrollContainer, 'scrollHeight', { value: 200, writable: true });
    Object.defineProperty(scrollContainer, 'clientHeight', { value: 100, writable: true });
    scrollContainer.scrollTop = 0;

    mockState.runtimeEvents = [
      ...mockState.runtimeEvents,
      {
        id: 'event-2',
        timestamp: '2026-03-19T09:00:01.000Z',
        level: 'info',
        kind: 'node_started',
        message: 'Second event',
      },
    ];
    rerender(<RuntimeEventLogPanel />);
    expect(scrollContainer.scrollTop).toBe(200);

    Object.defineProperty(scrollContainer, 'scrollHeight', { value: 300, writable: true });
    scrollContainer.scrollTop = 10;
    fireEvent.scroll(scrollContainer);

    mockState.runtimeEvents = [
      ...mockState.runtimeEvents,
      {
        id: 'event-3',
        timestamp: '2026-03-19T09:00:02.000Z',
        level: 'warn',
        kind: 'node_retry',
        message: 'Third event',
      },
    ];
    rerender(<RuntimeEventLogPanel />);
    expect(scrollContainer.scrollTop).toBe(10);

    scrollContainer.scrollTop = 281;
    fireEvent.scroll(scrollContainer);
    Object.defineProperty(scrollContainer, 'scrollHeight', { value: 360, writable: true });

    mockState.runtimeEvents = [
      ...mockState.runtimeEvents,
      {
        id: 'event-4',
        timestamp: '2026-03-19T09:00:03.000Z',
        level: 'error',
        kind: 'run_failed',
        message: 'Fourth event',
      },
    ];
    rerender(<RuntimeEventLogPanel />);
    expect(scrollContainer.scrollTop).toBe(360);
  });

  it('falls back to the raw timestamp when time formatting throws and shows filtered empty state', () => {
    const RealDate = Date;

    class ThrowingDate extends RealDate {
      constructor(value?: string | number | Date) {
        if (value === 'throw-iso') {
          throw new Error('broken timestamp');
        }
        super(value);
      }

      static now = RealDate.now;
      static parse = RealDate.parse;
      static UTC = RealDate.UTC;
    }

    vi.stubGlobal('Date', ThrowingDate as unknown as DateConstructor);

    mockState.runtimeEvents = [
      {
        id: 'event-1',
        timestamp: 'throw-iso',
        level: 'info',
        kind: 'custom_event',
        message: 'Broken clock event',
      },
    ];

    render(<RuntimeEventLogPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Expand event log' }));

    expect(screen.getByText('throw-iso')).toBeInTheDocument();
    expect(screen.getByText('custom_event:neutral')).toBeInTheDocument();
    expect(mockState.logClientError).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText('Event level filter'), { target: { value: 'error' } });
    expect(screen.getByText('No events matching "error"')).toBeInTheDocument();
  });

  it('disables export and clear when there are no runtime events', () => {
    render(<RuntimeEventLogPanel />);

    expect(screen.queryByText(/err:error/)).not.toBeInTheDocument();
    expect(screen.queryByText(/warn:warning/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Expand event log' }));
    expect(screen.getByText('No events')).toBeInTheDocument();
  });
});
