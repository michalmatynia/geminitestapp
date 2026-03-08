/**
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { kangurKeys } from '@/shared/lib/query-key-exports';

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: apiGetMock,
  },
}));

import { useKangurObservabilitySummary } from './hooks';

const createTestClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const createSummaryResponse = () => ({
  summary: {
    generatedAt: '2026-03-07T12:00:00.000Z',
    range: '7d' as const,
    overallStatus: 'warning' as const,
    window: {
      from: '2026-02-28T12:00:00.000Z',
      to: '2026-03-07T12:00:00.000Z',
    },
    keyMetrics: {
      serverErrorRatePercent: 2.4,
      learnerSignInAttempts: 12,
      learnerSignInFailureRatePercent: 8.3,
      progressSyncFailures: 4,
      ttsRequests: 11,
      ttsGenerationFailures: 2,
      ttsFallbackRatePercent: 18.2,
    },
    alerts: [],
    serverLogs: {
      metrics: null,
      recent: [],
    },
    routes: {
      authMeGet: {
        metrics: null,
        latency: null,
        investigation: {
          label: 'Inspect route logs',
          href: '/admin/system/logs?source=kangur.auth.me.GET',
        },
      },
      learnerSignInPost: {
        metrics: null,
        latency: null,
        investigation: {
          label: 'Inspect route logs',
          href: '/admin/system/logs?source=kangur.auth.learnerSignIn.POST',
        },
      },
      progressPatch: {
        metrics: null,
        latency: null,
        investigation: {
          label: 'Inspect route logs',
          href: '/admin/system/logs?source=kangur.progress.PATCH',
        },
      },
      scoresPost: {
        metrics: null,
        latency: null,
        investigation: {
          label: 'Inspect route logs',
          href: '/admin/system/logs?source=kangur.scores.POST',
        },
      },
      assignmentsPost: {
        metrics: null,
        latency: null,
        investigation: {
          label: 'Inspect route logs',
          href: '/admin/system/logs?source=kangur.assignments.POST',
        },
      },
      learnersPost: {
        metrics: null,
        latency: null,
        investigation: {
          label: 'Inspect route logs',
          href: '/admin/system/logs?source=kangur.learners.POST',
        },
      },
      ttsPost: {
        metrics: null,
        latency: null,
        investigation: {
          label: 'Inspect route logs',
          href: '/admin/system/logs?source=kangur.tts.POST',
        },
      },
    },
    analytics: {
      totals: { events: 10, pageviews: 4 },
      visitors: 3,
      sessions: 5,
      topPaths: [],
      topEventNames: [],
      importantEvents: [],
      recent: [],
    },
    performanceBaseline: null,
    errors: null,
  },
});

describe('useKangurObservabilitySummary', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestClient();
  });

  const wrapper = ({ children }: { children: ReactNode }): ReactElement => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('loads the Kangur observability summary through the shared API client', async () => {
    apiGetMock.mockResolvedValue(createSummaryResponse());

    const { result } = renderHook(() => useKangurObservabilitySummary('7d'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiGetMock).toHaveBeenCalledWith('/api/kangur/observability/summary', {
      params: { range: '7d' },
    });
    expect(result.current.data).toEqual(createSummaryResponse().summary);
    expect(
      queryClient.getQueryCache().find({
        queryKey: kangurKeys.observability.summary('7d'),
      })
    ).toBeDefined();
  });

  it('fails when the API payload does not match the shared summary contract', async () => {
    apiGetMock.mockResolvedValue({
      summary: {
        generatedAt: '2026-03-07T12:00:00.000Z',
        range: '7d',
      },
    });

    const { result } = renderHook(() => useKangurObservabilitySummary('7d'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Invalid Kangur observability summary response');
  });
});
