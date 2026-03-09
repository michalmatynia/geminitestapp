import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiPostMock, useOptionalContextRegistryPageEnvelopeMock } = vi.hoisted(() => ({
  apiPostMock: vi.fn(),
  useOptionalContextRegistryPageEnvelopeMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: vi.fn(),
    post: apiPostMock,
  },
}));

vi.mock('@/features/ai/ai-context-registry/context/page-context', () => ({
  useOptionalContextRegistryPageEnvelope: useOptionalContextRegistryPageEnvelopeMock,
}));

import {
  useRunAnalyticsInsightMutation,
  useRunLogInsightMutation,
  useRunRuntimeAnalyticsInsightMutation,
} from '../useInsightQueries';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const createWrapper = () => {
  const queryClient = createQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('insight run mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useOptionalContextRegistryPageEnvelopeMock.mockReturnValue({
      refs: [
        {
          id: 'page:ai-insights',
          kind: 'static_node',
        },
        {
          id: 'runtime:ai-insights:workspace',
          kind: 'runtime_document',
          providerId: 'ai-insights-page-local',
          entityType: 'ai_insights_workspace_state',
        },
      ],
      engineVersion: 'page-context:v1',
    });
    apiPostMock.mockResolvedValue({ insight: { id: 'insight-1' } });
  });

  it('forwards the page envelope when running analytics insights from the dashboard', async () => {
    const { result } = renderHook(() => useRunAnalyticsInsightMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(apiPostMock).toHaveBeenCalledWith('/api/analytics/insights', {
      contextRegistry: expect.objectContaining({
        refs: expect.arrayContaining([expect.objectContaining({ id: 'page:ai-insights' })]),
      }),
    });
  });

  it('forwards the page envelope when running log insights from the dashboard', async () => {
    const { result } = renderHook(() => useRunLogInsightMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(apiPostMock).toHaveBeenCalledWith('/api/system/logs/insights', {
      contextRegistry: expect.objectContaining({
        refs: expect.arrayContaining([expect.objectContaining({ id: 'page:ai-insights' })]),
      }),
    });
  });

  it('forwards the page envelope when running runtime analytics insights from the dashboard', async () => {
    const { result } = renderHook(() => useRunRuntimeAnalyticsInsightMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(apiPostMock).toHaveBeenCalledWith('/api/ai-paths/runtime-analytics/insights', {
      contextRegistry: expect.objectContaining({
        refs: expect.arrayContaining([expect.objectContaining({ id: 'page:ai-insights' })]),
      }),
    });
  });
});
