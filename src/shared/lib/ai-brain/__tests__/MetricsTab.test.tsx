import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MetricsTab } from '@/shared/lib/ai-brain/components/MetricsTab';
import { useBrain } from '@/shared/lib/ai-brain/context/BrainContext';

vi.mock('@/shared/lib/ai-brain/context/BrainContext', () => ({
  useBrain: vi.fn(),
}));

vi.mock('@/shared/ui', () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
  MetadataItem: ({
    label,
    value,
  }: {
    label: string;
    value: React.ReactNode;
  }) => (
    <div>
      <span>{label}</span>
      <span>{String(value)}</span>
    </div>
  ),
  StatusBadge: ({
    label,
    status,
  }: {
    label: string;
    status: string;
  }) => (
    <span data-testid={`status-${status}`}>
      {label}
    </span>
  ),
  SectionHeader: ({
    title,
    description,
  }: {
    title: string;
    description?: string;
  }) => (
    <header>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </header>
  ),
  FormSection: ({
    title,
    description,
    children,
  }: {
    title: string;
    description?: string;
    children: React.ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {children}
    </section>
  ),
  CompactEmptyState: ({
    title,
    description,
  }: {
    title: string;
    description?: string;
  }) => (
    <div>
      <div>{title}</div>
      {description ? <div>{description}</div> : null}
    </div>
  ),
  Card: ({ children }: { children: React.ReactNode }) => <article>{children}</article>,
  UI_GRID_RELAXED_CLASSNAME: 'grid',
}));

describe('MetricsTab', () => {
  const analyticsRefetch = vi.fn();
  const logsRefetch = vi.fn();
  const insightsRefetch = vi.fn();
  const runtimeRefetch = vi.fn();

  beforeEach(() => {
    analyticsRefetch.mockReset();
    logsRefetch.mockReset();
    insightsRefetch.mockReset();
    runtimeRefetch.mockReset();
  });

  it('renders populated analytics, audits, and runtime metrics', () => {
    vi.mocked(useBrain).mockReturnValue({
      analyticsSummaryQuery: {
        isLoading: false,
        data: {
          totals: { events: 12, pageviews: 7 },
          visitors: 5,
          sessions: 4,
        },
        refetch: analyticsRefetch,
      },
      logMetricsQuery: {
        isLoading: false,
        data: {
          total: 22,
          last24Hours: 3,
          last7Days: 9,
          topSources: [{ source: 'api' }],
        },
        refetch: logsRefetch,
      },
      insightsQuery: {
        data: {
          analytics: [
            {
              status: 'healthy',
              createdAt: 'invalid-date',
              summary: 'Analytics insight summary',
            },
          ],
          runtimeAnalytics: [
            {
              status: 'warning',
              createdAt: '2026-03-21T12:00:00.000Z',
              summary: 'Runtime insight summary',
              metadata: { runtimeKernelParityRiskLevel: 'high' },
            },
          ],
          logs: [
            {
              status: 'error',
              createdAt: '2026-03-21T10:00:00.000Z',
              summary: 'Logs insight summary',
            },
          ],
        },
        refetch: insightsRefetch,
      },
      runtimeAnalyticsQuery: {
        isLoading: false,
        data: {
          traces: {
            kernelParity: {
              sampledRuns: 4,
              runsWithKernelParity: 3,
              sampledHistoryEntries: 5,
              strategyCounts: { code_object_v3: 2 },
            },
          },
          runs: {
            total: 16,
            successRate: 87.5,
            avgDurationMs: 2200,
          },
          nodes: {
            running: 6,
          },
        },
        refetch: runtimeRefetch,
      },
      runtimeAnalyticsLiveEnabled: true,
    } as unknown as ReturnType<typeof useBrain>);

    render(<MetricsTab />);

    expect(screen.getByText('Deep Metrics')).toBeInTheDocument();
    expect(screen.getByText('General Analytics')).toBeInTheDocument();
    expect(screen.getByText('Total Events')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Top Source')).toBeInTheDocument();
    expect(screen.getByText('api')).toBeInTheDocument();
    expect(screen.getAllByText('Generated')).toHaveLength(3);
    expect(screen.getByText('never')).toBeInTheDocument();
    expect(screen.getByText('Runtime insight summary')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('3/4 (75.0%)')).toBeInTheDocument();
    expect(screen.getByText('40.0%')).toBeInTheDocument();
    expect(screen.getByText('2s')).toBeInTheDocument();
    expect(screen.getByTestId('status-warning')).toHaveTextContent('warning');
  });

  it('renders empty and disabled states and skips runtime refresh when runtime analytics are off', () => {
    vi.mocked(useBrain).mockReturnValue({
      analyticsSummaryQuery: {
        isLoading: false,
        data: null,
        refetch: analyticsRefetch,
      },
      logMetricsQuery: {
        isLoading: false,
        data: null,
        refetch: logsRefetch,
      },
      insightsQuery: {
        data: undefined,
        refetch: insightsRefetch,
      },
      runtimeAnalyticsQuery: {
        isLoading: false,
        data: null,
        refetch: runtimeRefetch,
      },
      runtimeAnalyticsLiveEnabled: false,
    } as unknown as ReturnType<typeof useBrain>);

    render(<MetricsTab />);

    expect(screen.getByText('No analytics')).toBeInTheDocument();
    expect(screen.getByText('No log metrics')).toBeInTheDocument();
    expect(screen.getByText('Runtime analytics disabled')).toBeInTheDocument();
    expect(screen.getByText('No analytics audits found in history.')).toBeInTheDocument();
    expect(screen.getByText('No runtime analytics audits found in history.')).toBeInTheDocument();
    expect(screen.getByText('No system log audits found in history.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh All Metrics' }));

    expect(analyticsRefetch).toHaveBeenCalledTimes(1);
    expect(logsRefetch).toHaveBeenCalledTimes(1);
    expect(insightsRefetch).toHaveBeenCalledTimes(1);
    expect(runtimeRefetch).not.toHaveBeenCalled();
  });

  it('shows loading states and refreshes every query when runtime analytics are enabled', () => {
    vi.mocked(useBrain).mockReturnValue({
      analyticsSummaryQuery: {
        isLoading: true,
        data: null,
        refetch: analyticsRefetch,
      },
      logMetricsQuery: {
        isLoading: true,
        data: null,
        refetch: logsRefetch,
      },
      insightsQuery: {
        data: {
          analytics: [],
          runtimeAnalytics: [],
          logs: [],
        },
        refetch: insightsRefetch,
      },
      runtimeAnalyticsQuery: {
        isLoading: true,
        data: null,
        refetch: runtimeRefetch,
      },
      runtimeAnalyticsLiveEnabled: true,
    } as unknown as ReturnType<typeof useBrain>);

    render(<MetricsTab />);

    expect(screen.getByText('Loading analytics summary...')).toBeInTheDocument();
    expect(screen.getByText('Loading log metrics...')).toBeInTheDocument();
    expect(screen.getByText('Loading runtime analytics...')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh All Metrics' }));

    expect(analyticsRefetch).toHaveBeenCalledTimes(1);
    expect(logsRefetch).toHaveBeenCalledTimes(1);
    expect(insightsRefetch).toHaveBeenCalledTimes(1);
    expect(runtimeRefetch).toHaveBeenCalledTimes(1);
  });
});
