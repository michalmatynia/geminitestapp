import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useCreateIntegration,
  useDeleteConnection,
  useDisconnectAllegro,
  useUpsertConnection,
} from '@/features/integrations/hooks/useIntegrationMutations';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

vi.mock('@/shared/lib/api-client', () => {
  class ApiError extends Error {}
  return {
    ApiError,
    api: {
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  };
});

const createTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('useIntegrationMutations invalidation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('useCreateIntegration invalidates integrations root key', async () => {
    vi.mocked(api.post).mockResolvedValue({
      id: 'int-1',
      name: 'Integration',
      slug: 'integration',
    } as never);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreateIntegration(), { wrapper });

    await result.current.mutateAsync({ name: 'Integration', slug: 'integration' });

    expect(api.post).toHaveBeenCalledWith('/api/v2/integrations', {
      name: 'Integration',
      slug: 'integration',
    });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalled());
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.integrations.all,
    });
  });

  it('useUpsertConnection invalidates connections key after create', async () => {
    vi.mocked(api.post).mockResolvedValue({
      id: 'conn-1',
      integrationId: 'int-1',
      name: 'Connection',
    } as never);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpsertConnection(), { wrapper });

    const variables = {
      integrationId: 'int-1',
      payload: { name: 'Connection' },
    };
    await result.current.mutateAsync(variables);

    expect(api.post).toHaveBeenCalledWith('/api/v2/integrations/int-1/connections', variables.payload);
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalled());

    // Invalidation logic for connections calls it multiple times
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.integrations.connections(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.integrations.connections('int-1'),
    });
  });

  it('useUpsertConnection update path calls api.put and invalidates scoped keys', async () => {
    vi.mocked(api.put).mockResolvedValue({
      id: 'conn-1',
      integrationId: 'int-1',
      name: 'Updated Connection',
    } as never);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpsertConnection(), { wrapper });

    const variables = {
      integrationId: 'int-1',
      connectionId: 'conn-1',
      payload: { name: 'Updated Connection' },
    };
    await result.current.mutateAsync(variables);

    expect(api.put).toHaveBeenCalledWith('/api/v2/integrations/connections/conn-1', variables.payload);
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalled());
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.integrations.connections(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.integrations.connections('int-1'),
    });
  });

  it('useDeleteConnection invalidates connections key', async () => {
    vi.mocked(api.delete).mockResolvedValue({} as never);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteConnection(), { wrapper });

    await result.current.mutateAsync({
      integrationId: 'int-1',
      connectionId: 'conn-1',
      userPassword: 'password-123',
    });

    expect(api.delete).toHaveBeenCalledWith('/api/v2/integrations/connections/conn-1', {
      body: JSON.stringify({ userPassword: 'password-123' }),
    });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalled());
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.integrations.connections(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.integrations.connections('int-1'),
    });
  });

  it('useDeleteConnection appends replacementConnectionId when provided', async () => {
    vi.mocked(api.delete).mockResolvedValue({} as never);

    const { result } = renderHook(() => useDeleteConnection(), { wrapper });
    await result.current.mutateAsync({
      integrationId: 'int-1',
      connectionId: 'conn-1',
      userPassword: 'password-123',
      replacementConnectionId: 'conn-2',
    });

    expect(api.delete).toHaveBeenCalledWith(
      '/api/v2/integrations/connections/conn-1?replacementConnectionId=conn-2',
      { body: JSON.stringify({ userPassword: 'password-123' }) }
    );
  });

  it('useDisconnectAllegro invalidates connections key', async () => {
    vi.mocked(api.post).mockResolvedValue({} as never);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDisconnectAllegro(), { wrapper });

    const variables = {
      integrationId: 'int-1',
      connectionId: 'conn-1',
    };
    await result.current.mutateAsync(variables);

    expect(api.post).toHaveBeenCalledWith(
      '/api/v2/integrations/int-1/connections/conn-1/allegro/disconnect',
      variables
    );
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalled());
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.integrations.connections(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.integrations.connections('int-1'),
    });
  });
});
