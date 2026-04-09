// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useAnalyticsFiltersMock: vi.fn(),
  useAnalyticsSummaryDataMock: vi.fn(),
  useAnalyticsInsightsDataMock: vi.fn(),
  useAnalyticsEventsMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-context-registry/page-context', () => ({
  ContextRegistryPageProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  useRegisterContextRegistryPageSource: vi.fn(),
}));

vi.mock('@/shared/lib/analytics/context-registry/workspace', () => ({
  ANALYTICS_CONTEXT_ROOT_IDS: [],
  buildAnalyticsWorkspaceContextBundle: vi.fn(() => ({})),
}));

vi.mock('../context/AnalyticsContext', () => ({
  AnalyticsProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  useAnalyticsFilters: mocks.useAnalyticsFiltersMock,
  useAnalyticsSummaryData: mocks.useAnalyticsSummaryDataMock,
  useAnalyticsInsightsData: mocks.useAnalyticsInsightsDataMock,
}));

vi.mock('../hooks/useAnalyticsQueries', () => ({
  useAnalyticsEvents: mocks.useAnalyticsEventsMock,
}));

vi.mock('../components/AnalyticsEventsTable', () => ({
  __esModule: true,
  default: ({ title }: { title?: string }) => (
    <div>
      {title ? <div>{title}</div> : null}
      <div>analytics-events-table</div>
    </div>
  ),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Button: ({ children, onClick, disabled }: { children?: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
  Card: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/shared/ui/data-display.public', () => ({
  DataTable: () => <div>data-table</div>,
  StatusBadge: ({ status }: { status?: React.ReactNode }) => <div>{status}</div>,
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  FormSection: ({ children, title }: { children?: React.ReactNode; title?: React.ReactNode }) => (
    <div>
      {title ? <div>{title}</div> : null}
      {children}
    </div>
  ),
  Hint: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectSimple: ({ value, options, onValueChange }: any) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)} aria-label='Select option'>
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock('@/shared/ui/navigation-and-layout.public', () => ({
  MetadataItem: ({
    label,
    value,
  }: {
    label: string;
    value: React.ReactNode;
  }) => (
    <div>
      <div>{label}</div>
      <div>{value}</div>
    </div>
  ),
  Pagination: (props: {
    page: number;
    totalPages?: number;
  }) => {
    const { page, totalPages } = props;
    return <div>{`pagination:${page}/${totalPages ?? 1}`}</div>;
  },
  SectionHeader: ({
    title,
    description,
    actions,
  }: {
    title?: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
  }) => (
    <div>
      {title ? <div>{title}</div> : null}
      {description ? <div>{description}</div> : null}
      {actions}
    </div>
  ),
  UI_GRID_RELAXED_CLASSNAME: 'grid gap-4',
  UI_GRID_ROOMY_CLASSNAME: 'grid gap-6',
}));

import AdminAnalyticsPage from './AdminAnalyticsPage';

describe('AdminAnalyticsPage', () => {
  beforeEach(() => {
    mocks.useAnalyticsFiltersMock.mockReset();
    mocks.useAnalyticsSummaryDataMock.mockReset();
    mocks.useAnalyticsInsightsDataMock.mockReset();
    mocks.useAnalyticsEventsMock.mockReset();

    mocks.useAnalyticsFiltersMock.mockReturnValue({
      range: '24h',
      setRange: vi.fn(),
      scope: 'public',
      setScope: vi.fn(),
    });

    mocks.useAnalyticsSummaryDataMock.mockReturnValue({
      summaryQuery: {
        data: {
          from: '2026-03-19T00:00:00.000Z',
          to: '2026-03-19T12:00:00.000Z',
          scope: 'public',
          totals: { events: 10, pageviews: 8 },
          visitors: 6,
          sessions: 7,
          topPages: [],
          topReferrers: [],
          topEventNames: [],
          topLanguages: [],
          topCountries: [],
          topRegions: [],
          topCities: [],
          topBrowsers: [],
          topOs: [],
          topDevices: [],
          topUtmSources: [],
          topUtmMediums: [],
          topUtmCampaigns: [],
          recent: [],
        },
        isLoading: false,
        error: null,
        isFetching: false,
        refetch: vi.fn(),
      },
      fromToLabel: 'window-label',
    });

    mocks.useAnalyticsInsightsDataMock.mockReturnValue({
      insightsQuery: {
        data: { insights: [] },
        isLoading: false,
        error: null,
      },
      runInsightMutation: {
        isPending: false,
        mutate: vi.fn(),
      },
    });

    mocks.useAnalyticsEventsMock.mockReturnValue({
      data: {
        events: [],
        total: 50,
        page: 1,
        pageSize: 25,
        totalPages: 2,
        range: '24h',
        scope: 'public',
        type: 'pageview',
        search: '',
        country: '',
        referrerHost: '',
        browser: '',
        device: '',
        bot: 'all',
      },
      isLoading: false,
      isFetching: false,
    });
  });

  it('renders website connections with top pagination from the paginated events query', () => {
    render(<AdminAnalyticsPage />);

    expect(mocks.useAnalyticsEventsMock).toHaveBeenCalledWith({
      page: 1,
      pageSize: 25,
      range: '24h',
      scope: 'public',
      type: 'pageview',
    });
    expect(screen.queryByText('Website Connections')).not.toBeInTheDocument();
    expect(screen.getByText('analytics-events-table')).toBeInTheDocument();
    expect(screen.getByText('pagination:1/2')).toBeInTheDocument();
  });
});
