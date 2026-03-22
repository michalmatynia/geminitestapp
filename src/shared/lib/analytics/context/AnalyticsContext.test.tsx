import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useAnalyticsSummaryMock,
  useAnalyticsInsightsMock,
  useRunAnalyticsInsightMock,
  logClientCatchMock,
} = vi.hoisted(() => ({
  useAnalyticsSummaryMock: vi.fn(),
  useAnalyticsInsightsMock: vi.fn(),
  useRunAnalyticsInsightMock: vi.fn(),
  logClientCatchMock: vi.fn(),
}));

vi.mock('@/shared/lib/analytics/hooks/useAnalyticsQueries', () => ({
  useAnalyticsSummary: (...args: unknown[]) => useAnalyticsSummaryMock(...args),
  useAnalyticsInsights: (...args: unknown[]) => useAnalyticsInsightsMock(...args),
  useRunAnalyticsInsight: (...args: unknown[]) => useRunAnalyticsInsightMock(...args),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientCatch: logClientCatchMock,
}));

import {
  AnalyticsProvider,
  useAnalyticsFilters,
  useAnalyticsInsightsData,
  useAnalyticsSummaryData,
} from './AnalyticsContext';

describe('AnalyticsProvider', () => {
  beforeEach(() => {
    useAnalyticsSummaryMock.mockReset();
    useAnalyticsInsightsMock.mockReset();
    useRunAnalyticsInsightMock.mockReset();
    logClientCatchMock.mockReset();

    useAnalyticsSummaryMock.mockImplementation(
      ({ range, scope }: { range: string; scope: string }) =>
        ({
          data: {
            from: `2026-03-22T10:00:00.000Z-${range}-${scope}`,
            to: `2026-03-22T11:00:00.000Z-${range}-${scope}`,
          },
        }) as never
    );
    useAnalyticsInsightsMock.mockReturnValue({ data: { items: [] } } as never);
    useRunAnalyticsInsightMock.mockReturnValue({ mutateAsync: vi.fn() } as never);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AnalyticsProvider>{children}</AnalyticsProvider>
  );

  it('provides filters, summary state, and insights state and reacts to filter changes', () => {
    const { result } = renderHook(
      () => ({
        filters: useAnalyticsFilters(),
        summary: useAnalyticsSummaryData(),
        insights: useAnalyticsInsightsData(),
      }),
      { wrapper }
    );

    expect(result.current.filters.range).toBe('24h');
    expect(result.current.filters.scope).toBe('all');
    expect(result.current.summary.fromToLabel).toContain('→');
    expect(result.current.insights.insightsQuery).toEqual({ data: { items: [] } });

    act(() => {
      result.current.filters.setRange('7d');
      result.current.filters.setScope('admin');
    });

    expect(result.current.filters.range).toBe('7d');
    expect(result.current.filters.scope).toBe('admin');
    expect(useAnalyticsSummaryMock).toHaveBeenLastCalledWith({ range: '7d', scope: 'admin' });
  });

  it('logs and suppresses from/to label formatting failures', () => {
    const dateSpy = vi.spyOn(Date.prototype, 'toLocaleString').mockImplementation(() => {
      throw new Error('date formatting failed');
    });

    const { result } = renderHook(() => useAnalyticsSummaryData(), { wrapper });

    expect(result.current.fromToLabel).toBeNull();
    expect(logClientCatchMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: 'analytics.context',
        action: 'formatFromToLabel',
      })
    );

    dateSpy.mockRestore();
  });
});
