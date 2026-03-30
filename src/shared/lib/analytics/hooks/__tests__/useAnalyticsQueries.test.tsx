import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  apiGetMock,
  apiPostMock,
  fetchAnalyticsSummaryMock,
  fetchAnalyticsEventsMock,
  createSingleQueryV2Mock,
  createCreateMutationV2Mock,
  useOptionalContextRegistryPageEnvelopeMock,
} = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  fetchAnalyticsSummaryMock: vi.fn(),
  fetchAnalyticsEventsMock: vi.fn(),
  createSingleQueryV2Mock: vi.fn((config: unknown) => config),
  createCreateMutationV2Mock: vi.fn((config: unknown) => config),
  useOptionalContextRegistryPageEnvelopeMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: apiGetMock,
    post: apiPostMock,
  },
}));

vi.mock('@/shared/lib/analytics/api', () => ({
  fetchAnalyticsSummary: fetchAnalyticsSummaryMock,
  fetchAnalyticsEvents: fetchAnalyticsEventsMock,
}));

vi.mock('@/shared/lib/query-factories-v2', () => ({
  createSingleQueryV2: createSingleQueryV2Mock,
  createCreateMutationV2: createCreateMutationV2Mock,
}));

vi.mock('@/shared/lib/ai-context-registry/page-context', () => ({
  useOptionalContextRegistryPageEnvelope: useOptionalContextRegistryPageEnvelopeMock,
}));

import {
  useAnalyticsEvents,
  useAnalyticsInsights,
  useAnalyticsSummary,
  useRunAnalyticsInsight,
  useTrackEventMutation,
} from '../useAnalyticsQueries';

describe('useAnalyticsQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchAnalyticsSummaryMock.mockResolvedValue({ summary: true });
    fetchAnalyticsEventsMock.mockResolvedValue({ items: [], total: 0 });
    apiGetMock.mockResolvedValue({ insight: { id: 'insight-1' } });
    useOptionalContextRegistryPageEnvelopeMock.mockReturnValue({
      refs: [
        {
          id: 'page:analytics',
          kind: 'static_node',
        },
        {
          id: 'runtime:analytics:workspace',
          kind: 'runtime_document',
          providerId: 'analytics-page-local',
          entityType: 'analytics_workspace_state',
        },
      ],
      engineVersion: 'page-context:v1',
    });
    apiPostMock.mockResolvedValue({ insight: { id: 'insight-1' } });
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(null, { status: 202 }))));
  });

  it('builds the analytics summary query with defaults and executes its fetcher', async () => {
    const { result } = renderHook(() => useAnalyticsSummary());

    expect(createSingleQueryV2Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '24h-all',
        enabled: true,
        meta: expect.objectContaining({
          source: 'analytics.hooks.useAnalyticsSummary',
          resource: 'analytics.summary',
        }),
      })
    );

    await expect(result.current.queryFn()).resolves.toEqual({ summary: true });
    expect(fetchAnalyticsSummaryMock).toHaveBeenCalledWith({ range: '24h', scope: 'all' });
  });

  it('builds analytics events and insights queries with explicit filters', async () => {
    const { result: eventsResult } = renderHook(() =>
      useAnalyticsEvents({
        page: 3,
        pageSize: 50,
        range: '7d',
        scope: 'admin',
        type: 'pageview',
        search: 'kangur',
        country: 'PL',
        referrerHost: 'google.com',
        browser: 'Firefox',
        device: 'desktop',
        bot: 'exclude',
        enabled: false,
      })
    );

    expect(createSingleQueryV2Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
        meta: expect.objectContaining({
          source: 'analytics.hooks.useAnalyticsEvents',
          resource: 'analytics.events',
        }),
      })
    );
    await expect(eventsResult.current.queryFn()).resolves.toEqual({ items: [], total: 0 });
    expect(fetchAnalyticsEventsMock).toHaveBeenCalledWith({
      page: 3,
      pageSize: 50,
      range: '7d',
      scope: 'admin',
      type: 'pageview',
      search: 'kangur',
      country: 'PL',
      referrerHost: 'google.com',
      browser: 'Firefox',
      device: 'desktop',
      bot: 'exclude',
    });

    const { result: insightsResult } = renderHook(() =>
      useAnalyticsInsights({ limit: 8, enabled: false })
    );
    expect(createSingleQueryV2Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '8',
        enabled: false,
        meta: expect.objectContaining({
          source: 'analytics.hooks.useAnalyticsInsights',
          resource: 'analytics.insights',
        }),
      })
    );
    await expect(insightsResult.current.queryFn()).resolves.toEqual({ insight: { id: 'insight-1' } });
    expect(apiGetMock).toHaveBeenCalledWith('/api/analytics/insights', {
      params: { limit: 8 },
    });
  });

  it('uses default analytics query parameters when callers do not provide overrides', async () => {
    const { result: eventsResult } = renderHook(() => useAnalyticsEvents());
    await act(async () => {
      await eventsResult.current.queryFn();
    });
    expect(fetchAnalyticsEventsMock).toHaveBeenCalledWith({
      page: 1,
      pageSize: 25,
      range: '24h',
      scope: 'all',
      type: 'all',
      search: '',
      country: '',
      referrerHost: '',
      browser: '',
      device: '',
      bot: 'all',
    });

    const { result: insightsResult } = renderHook(() => useAnalyticsInsights());
    await act(async () => {
      await insightsResult.current.queryFn();
    });
    expect(apiGetMock).toHaveBeenCalledWith('/api/analytics/insights', {
      params: { limit: 5 },
    });
  });

  it('forwards the analytics page envelope when generating an insight and omits it when unavailable', async () => {
    const { result } = renderHook(() => useRunAnalyticsInsight());

    await act(async () => {
      await result.current.mutationFn();
    });

    expect(apiPostMock).toHaveBeenCalledWith('/api/analytics/insights', {
      contextRegistry: expect.objectContaining({
        refs: [
          expect.objectContaining({ id: 'page:analytics' }),
          expect.objectContaining({ id: 'runtime:analytics:workspace' }),
        ],
      }),
    });

    useOptionalContextRegistryPageEnvelopeMock.mockReturnValue(null);
    const { result: withoutContextResult } = renderHook(() => useRunAnalyticsInsight());
    await act(async () => {
      await withoutContextResult.current.mutationFn();
    });

    expect(apiPostMock).toHaveBeenLastCalledWith('/api/analytics/insights', {});
  });

  it('uses sendBeacon for track events when available and falls back to fetch when beacon dispatch fails', async () => {
    const sendBeaconMock = vi.fn(() => true);
    Object.defineProperty(window.navigator, 'sendBeacon', {
      configurable: true,
      value: sendBeaconMock,
    });

    const { result } = renderHook(() => useTrackEventMutation());
    await act(async () => {
      await result.current.mutationFn({ type: 'pageview', scope: 'public' });
    });

    expect(sendBeaconMock).toHaveBeenCalledWith(
      '/api/analytics/events',
      expect.any(Blob)
    );
    expect(fetch).not.toHaveBeenCalled();

    sendBeaconMock.mockReturnValue(false);
    await act(async () => {
      await result.current.mutationFn({ type: 'pageview', scope: 'public' });
    });

    expect(fetch).toHaveBeenCalledWith('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'pageview', scope: 'public' }),
      credentials: 'include',
      keepalive: true,
    });
  });

  it('falls back to fetch when sendBeacon is unavailable and swallows async fetch failures', async () => {
    Object.defineProperty(window.navigator, 'sendBeacon', {
      configurable: true,
      value: undefined,
    });
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network down'))));

    const { result } = renderHook(() => useTrackEventMutation());
    await expect(
      act(async () => {
        await result.current.mutationFn({ type: 'pageview', scope: 'public' });
      })
    ).resolves.toBeUndefined();

    expect(fetch).toHaveBeenCalledWith('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'pageview', scope: 'public' }),
      credentials: 'include',
      keepalive: true,
    });
  });
});
