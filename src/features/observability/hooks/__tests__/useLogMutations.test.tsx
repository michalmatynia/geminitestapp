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
    post: apiPostMock,
    delete: vi.fn(),
  },
}));

vi.mock('@/shared/lib/ai-context-registry/page-context', () => ({
  useOptionalContextRegistryPageEnvelope: useOptionalContextRegistryPageEnvelopeMock,
}));

import { useInterpretLog, useRunLogInsight } from '../useLogMutations';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('useLogMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useOptionalContextRegistryPageEnvelopeMock.mockReturnValue({
      refs: [
        {
          id: 'page:system-logs',
          kind: 'static_node',
        },
        {
          id: 'runtime:system-logs:workspace',
          kind: 'runtime_document',
          providerId: 'system-logs-page-local',
          entityType: 'system_logs_workspace_state',
        },
      ],
      engineVersion: 'page-context:v1',
    });
    apiPostMock.mockResolvedValue({
      insight: {
        id: 'insight-1',
      },
    });
  });

  it('forwards the page context registry when generating a logs insight', async () => {
    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useRunLogInsight(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(apiPostMock).toHaveBeenCalledWith('/api/system/logs/insights', {
      contextRegistry: expect.objectContaining({
        refs: [
          expect.objectContaining({ id: 'page:system-logs' }),
          expect.objectContaining({ id: 'runtime:system-logs:workspace' }),
        ],
      }),
    });
  });

  it('forwards the page context registry when interpreting a specific log', async () => {
    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useInterpretLog(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('log-123');
    });

    expect(apiPostMock).toHaveBeenCalledWith('/api/system/logs/interpret', {
      logId: 'log-123',
      contextRegistry: expect.objectContaining({
        refs: [
          expect.objectContaining({ id: 'page:system-logs' }),
          expect.objectContaining({ id: 'runtime:system-logs:workspace' }),
        ],
      }),
    });
  });
});
