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

vi.mock('@/shared/lib/ai-context-registry/page-context', () => ({
  useOptionalContextRegistryPageEnvelope: useOptionalContextRegistryPageEnvelopeMock,
}));

import { useRunAnalyticsInsight } from '../useAnalyticsQueries';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('useRunAnalyticsInsight', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
  });

  it('forwards the analytics page envelope when generating an insight', async () => {
    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useRunAnalyticsInsight(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(apiPostMock).toHaveBeenCalledWith('/api/analytics/insights', {
      contextRegistry: expect.objectContaining({
        refs: [
          expect.objectContaining({ id: 'page:analytics' }),
          expect.objectContaining({ id: 'runtime:analytics:workspace' }),
        ],
      }),
    });
  });
});
