/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurObservabilitySummaryMock, refetchMock, replaceMock, navigationState } = vi.hoisted(() => ({
  useKangurObservabilitySummaryMock: vi.fn(),
  refetchMock: vi.fn(),
  replaceMock: vi.fn(),
  navigationState: {
    pathname: '/admin/kangur/observability',
    search: '',
  },
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigationState.pathname,
  useRouter: () => ({
    replace: replaceMock,
  }),
  useSearchParams: () => new URLSearchParams(navigationState.search),
}));

vi.mock('@/features/kangur/observability/hooks', () => ({
  useKangurObservabilitySummary: useKangurObservabilitySummaryMock,
}));

vi.mock('@/features/kangur/docs/tooltips', () => ({
  KangurDocsTooltipEnhancer: () => null,
  useKangurDocsTooltips: () => ({
    enabled: false,
    helpSettings: {
      version: 1,
      docsTooltips: {
        enabled: false,
        homeEnabled: false,
        lessonsEnabled: false,
        testsEnabled: false,
        profileEnabled: false,
        parentDashboardEnabled: false,
        adminEnabled: false,
      },
    },
  }),
}));

import { AdminKangurObservabilityPage } from './AdminKangurObservabilityPage';

const createSummary = (range: '24h' | '7d' | '30d' = '24h') => ({
  generatedAt: '2026-03-07T12:00:00.000Z',
  range,
  overallStatus: 'warning' as const,
  window: {
    from: '2026-03-06T12:00:00.000Z',
    to: '2026-03-07T12:00:00.000Z',
  },
  keyMetrics: {
    serverErrorRatePercent: 2.4,
    learnerSignInAttempts: 12,
    learnerSignInFailureRatePercent: 8.3,
    progressSyncFailures: 4,
    ttsRequests: 11,
    ttsFallbackRatePercent: 18.2,
  },
  alerts: [
    {
      id: 'kangur-server-error-rate',
      title: 'Server error rate',
      status: 'ok' as const,
      value: 2.4,
      unit: '%',
      warningThreshold: 3,
      criticalThreshold: 5,
      summary: 'Healthy.',
      investigation: {
        label: 'View error logs',
        href: '/admin/system/logs?query=kangur.&level=error&from=2026-03-06T12:00:00.000Z&to=2026-03-07T12:00:00.000Z',
      },
    },
    {
      id: 'kangur-learner-signin-failure-rate',
      title: 'Learner sign-in failure rate',
      status: 'warning' as const,
      value: 8.3,
      unit: '%',
      warningThreshold: 5,
      criticalThreshold: 10,
      summary: 'Watch learner sign-in failures.',
      investigation: {
        label: 'Review sign-in analytics',
        href: '/admin/kangur/observability?range=24h#recent-analytics-events',
      },
    },
    {
      id: 'kangur-progress-sync-failures',
      title: 'Progress sync failures',
      status: 'warning' as const,
      value: 4,
      unit: 'count',
      warningThreshold: 3,
      criticalThreshold: 10,
      summary: 'Progress sync failures detected.',
      investigation: {
        label: 'Review sync analytics',
        href: '/admin/kangur/observability?range=24h#recent-analytics-events',
      },
    },
    {
      id: 'kangur-tts-fallback-rate',
      title: 'TTS fallback rate',
      status: 'ok' as const,
      value: 18.2,
      unit: '%',
      warningThreshold: 20,
      criticalThreshold: 35,
      summary: 'Fallback rate within threshold.',
      investigation: {
        label: 'View fallback logs',
        href: '/admin/system/logs?source=kangur.tts.fallback&from=2026-03-06T12:00:00.000Z&to=2026-03-07T12:00:00.000Z',
      },
    },
    {
      id: 'kangur-performance-baseline',
      title: 'Performance baseline',
      status: 'warning' as const,
      value: 1,
      unit: 'count',
      warningThreshold: 1,
      criticalThreshold: 2,
      summary: 'Latest baseline is degraded.',
      investigation: {
        label: 'Open baseline details',
        href: '/admin/kangur/observability?range=24h#performance-baseline',
      },
    },
  ],
  serverLogs: {
    metrics: {
      total: 14,
      levels: { info: 10, warn: 2, error: 2 },
      last24Hours: 14,
      last7Days: 20,
      topSources: [{ source: 'kangur.tts', count: 5 }],
      topServices: [{ service: 'app', count: 14 }],
      topPaths: [{ path: '/api/kangur/tts', count: 5 }],
      generatedAt: '2026-03-07T12:00:00.000Z',
    },
    recent: [
      {
        id: 'log-1',
        createdAt: '2026-03-07T11:45:00.000Z',
        level: 'error' as const,
        message: 'Kangur TTS fallback used.',
        source: 'kangur.tts.fallback',
        path: '/api/kangur/tts',
        requestId: 'req-1',
        traceId: 'trace-1',
      },
    ],
  },
  routes: {
    authMeGet: null,
    learnerSignInPost: null,
    progressPatch: null,
    scoresPost: null,
    assignmentsPost: null,
    learnersPost: null,
    ttsPost: {
      total: 5,
      levels: { info: 4, warn: 0, error: 1 },
      last24Hours: 5,
      last7Days: 5,
      topSources: [{ source: 'kangur.tts', count: 5 }],
      topServices: [{ service: 'app', count: 5 }],
      topPaths: [{ path: '/api/kangur/tts', count: 5 }],
      generatedAt: '2026-03-07T12:00:00.000Z',
    },
  },
  analytics: {
    totals: { events: 10, pageviews: 4 },
    visitors: 3,
    sessions: 5,
    topPaths: [{ path: '/kangur', count: 4 }],
    topEventNames: [{ name: 'kangur_game_completed', count: 3 }],
    importantEvents: [{ name: 'kangur_progress_sync_failed', count: 4 }],
    recent: [
      {
        id: 'event-1',
        ts: '2026-03-07T11:40:00.000Z',
        type: 'event' as const,
        name: 'kangur_progress_sync_failed',
        path: '/kangur/play',
        visitorId: 'visitor-1',
        sessionId: 'session-1',
        meta: null,
      },
    ],
  },
  performanceBaseline: {
    generatedAt: '2026-03-07T08:00:00.000Z',
    unitStatus: 'pass',
    unitDurationMs: 1000,
    e2eStatus: 'infra_fail',
    e2eDurationMs: 2000,
    infraFailures: 1,
    failedRuns: 0,
    bundleRiskTotalBytes: 100,
    bundleRiskTotalLines: 10,
  },
  errors: {
    analytics: 'Analytics aggregation is partially degraded.',
  },
});

describe('AdminKangurObservabilityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigationState.pathname = '/admin/kangur/observability';
    navigationState.search = '';
    useKangurObservabilitySummaryMock.mockImplementation((range: '24h' | '7d' | '30d') => ({
      data: createSummary(range),
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchMock,
    }));
  });

  it('renders the Kangur observability summary cards and quick links', () => {
    navigationState.search = 'range=30d';
    render(<AdminKangurObservabilityPage />);

    expect(screen.getByText('Kangur Observability')).toBeInTheDocument();
    expect(screen.getByText('Learner sign-in failure rate')).toBeInTheDocument();
    expect(screen.getByText('Progress sync failures detected.')).toBeInTheDocument();
    expect(screen.getByText('Kangur TTS fallback used.')).toBeInTheDocument();
    expect(useKangurObservabilitySummaryMock).toHaveBeenCalledWith('30d');
    const allLogsHref = screen.getByRole('link', { name: /all kangur logs/i }).getAttribute('href');
    const logsUrl = new URL(allLogsHref ?? '', 'http://localhost');
    expect(logsUrl.pathname).toBe('/admin/system/logs');
    expect(logsUrl.searchParams.get('query')).toBe('kangur.');
    expect(logsUrl.searchParams.get('from')).toBe('2026-03-06T12:00:00.000Z');
    expect(logsUrl.searchParams.get('to')).toBe('2026-03-07T12:00:00.000Z');
    expect(screen.getByRole('link', { name: /view error logs/i })).toHaveAttribute(
      'href',
      '/admin/system/logs?query=kangur.&level=error&from=2026-03-06T12:00:00.000Z&to=2026-03-07T12:00:00.000Z'
    );
    expect(screen.getByRole('link', { name: /open baseline details/i })).toHaveAttribute(
      'href',
      '/admin/kangur/observability?range=24h#performance-baseline'
    );
  });

  it('switches the summary range from the segmented control', async () => {
    render(<AdminKangurObservabilityPage />);

    fireEvent.click(screen.getByRole('button', { name: '7d' }));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/admin/kangur/observability?range=7d', {
        scroll: false,
      });
    });
  });
});
