// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  InsightsProvider,
  useInsightsActions,
  useInsightsState,
} from './InsightsContext';

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  useAnalyticsInsightsQuery: vi.fn(),
  useLogInsightsQuery: vi.fn(),
  useRunAnalyticsInsightMutation: vi.fn(),
  useRunLogInsightMutation: vi.fn(),
  useRunRuntimeAnalyticsInsightMutation: vi.fn(),
  useRuntimeAnalyticsInsightsQuery: vi.fn(),
}));

vi.mock('@/shared/ui', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('../hooks/useInsightQueries', () => ({
  useAnalyticsInsightsQuery: () => mocks.useAnalyticsInsightsQuery(),
  useRuntimeAnalyticsInsightsQuery: () => mocks.useRuntimeAnalyticsInsightsQuery(),
  useLogInsightsQuery: () => mocks.useLogInsightsQuery(),
  useRunAnalyticsInsightMutation: () => mocks.useRunAnalyticsInsightMutation(),
  useRunRuntimeAnalyticsInsightMutation: () => mocks.useRunRuntimeAnalyticsInsightMutation(),
  useRunLogInsightMutation: () => mocks.useRunLogInsightMutation(),
}));

describe('InsightsContext', () => {
  beforeEach(() => {
    mocks.toast.mockReset();
    mocks.useAnalyticsInsightsQuery.mockReturnValue({ data: null, error: null });
    mocks.useRuntimeAnalyticsInsightsQuery.mockReturnValue({ data: null, error: null });
    mocks.useLogInsightsQuery.mockReturnValue({ data: null, error: null });
    mocks.useRunAnalyticsInsightMutation.mockReturnValue({ isError: false, isSuccess: false });
    mocks.useRunRuntimeAnalyticsInsightMutation.mockReturnValue({
      isError: false,
      isSuccess: false,
    });
    mocks.useRunLogInsightMutation.mockReturnValue({ isError: false, isSuccess: false });
  });

  it('throws when state hook is used outside the provider', () => {
    expect(() => renderHook(() => useInsightsState())).toThrow(
      'useInsightsState must be used within an InsightsProvider'
    );
  });

  it('throws when actions hook is used outside the provider', () => {
    expect(() => renderHook(() => useInsightsActions())).toThrow(
      'useInsightsActions must be used within an InsightsProvider'
    );
  });

  it('provides insights state and actions inside the provider', () => {
    const analyticsQuery = { data: { items: ['analytics'] } };
    const runtimeAnalyticsQuery = { data: { items: ['runtime'] } };
    const logsQuery = { data: { items: ['logs'] } };
    const runAnalyticsMutation = { isError: false, isSuccess: false, mutate: vi.fn() };
    const runRuntimeAnalyticsMutation = { isError: false, isSuccess: false, mutate: vi.fn() };
    const runLogsMutation = { isError: false, isSuccess: false, mutate: vi.fn() };

    mocks.useAnalyticsInsightsQuery.mockReturnValue(analyticsQuery);
    mocks.useRuntimeAnalyticsInsightsQuery.mockReturnValue(runtimeAnalyticsQuery);
    mocks.useLogInsightsQuery.mockReturnValue(logsQuery);
    mocks.useRunAnalyticsInsightMutation.mockReturnValue(runAnalyticsMutation);
    mocks.useRunRuntimeAnalyticsInsightMutation.mockReturnValue(runRuntimeAnalyticsMutation);
    mocks.useRunLogInsightMutation.mockReturnValue(runLogsMutation);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <InsightsProvider>{children}</InsightsProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useInsightsActions(),
        state: useInsightsState(),
      }),
      { wrapper }
    );

    expect(result.current.state).toMatchObject({
      analyticsQuery,
      logsQuery,
      runtimeAnalyticsQuery,
    });
    expect(result.current.actions).toMatchObject({
      runAnalyticsMutation,
      runLogsMutation,
      runRuntimeAnalyticsMutation,
    });
  });
});
