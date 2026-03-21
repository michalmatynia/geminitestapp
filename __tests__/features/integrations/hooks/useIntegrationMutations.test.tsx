import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@/__tests__/test-utils';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useAllegroApiRequest,
  useBaseApiRequest,
  useCreateIntegration,
  useDeleteConnection,
  useDisconnectAllegro,
  useSyncAllBaseImagesMutation,
  useTestConnection,
  useUpdateDefaultExportConnection,
  useUpdatePreferredInventory,
  useUpdatePreferredTemplate,
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

  it('useTestConnection posts the centralized test payload', async () => {
    vi.mocked(api.post).mockResolvedValue({
      ok: true,
      steps: [],
    } as never);

    const { result } = renderHook(() => useTestConnection(), { wrapper });

    await result.current.mutateAsync({
      integrationId: 'int-1',
      connectionId: 'conn-1',
      type: 'allegro/test',
      body: { mode: 'manual', manualTimeoutMs: 240000 },
      timeoutMs: 300000,
    });

    expect(api.post).toHaveBeenCalledWith(
      '/api/v2/integrations/int-1/connections/conn-1/allegro/test',
      {
        integrationId: 'int-1',
        connectionId: 'conn-1',
        type: 'allegro/test',
        body: { mode: 'manual', manualTimeoutMs: 240000 },
        timeoutMs: 300000,
      }
    );
  });

  it('useBaseApiRequest posts the centralized base api payload', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { ok: true } } as never);

    const { result } = renderHook(() => useBaseApiRequest(), { wrapper });

    await result.current.mutateAsync({
      integrationId: 'int-1',
      connectionId: 'conn-1',
      method: 'getInventories',
      parameters: { page: 1 },
    });

    expect(api.post).toHaveBeenCalledWith(
      '/api/v2/integrations/int-1/connections/conn-1/base/request',
      {
        integrationId: 'int-1',
        connectionId: 'conn-1',
        method: 'getInventories',
        parameters: { page: 1 },
      }
    );
  });

  it('useAllegroApiRequest posts the centralized allegro api payload', async () => {
    vi.mocked(api.post).mockResolvedValue({
      status: 200,
      statusText: 'OK',
      data: { items: [] },
      refreshed: false,
    } as never);

    const { result } = renderHook(() => useAllegroApiRequest(), { wrapper });

    await result.current.mutateAsync({
      integrationId: 'int-1',
      connectionId: 'conn-1',
      method: 'GET',
      path: '/sale/categories',
    });

    expect(api.post).toHaveBeenCalledWith(
      '/api/v2/integrations/int-1/connections/conn-1/allegro/request',
      {
        integrationId: 'int-1',
        connectionId: 'conn-1',
        method: 'GET',
        path: '/sale/categories',
      }
    );
  });

  it('useUpdatePreferredTemplate posts the centralized preference payload', async () => {
    vi.mocked(api.post).mockResolvedValue({ templateId: 'tpl-1' } as never);

    const { result } = renderHook(() => useUpdatePreferredTemplate(), { wrapper });

    await result.current.mutateAsync({
      templateId: 'tpl-1',
      connectionId: 'conn-1',
      inventoryId: 'inv-1',
    });

    expect(api.post).toHaveBeenCalledWith('/api/v2/integrations/exports/base/active-template', {
      templateId: 'tpl-1',
      connectionId: 'conn-1',
      inventoryId: 'inv-1',
    });
  });

  it('useSyncAllBaseImagesMutation returns the centralized sync job response', async () => {
    vi.mocked(api.post).mockResolvedValue({
      status: 'ok',
      jobId: 'job-1',
    } as never);

    const { result } = renderHook(() => useSyncAllBaseImagesMutation(), { wrapper });

    const response = await result.current.mutateAsync();

    expect(response.jobId).toBe('job-1');
    expect(api.post).toHaveBeenCalledWith('/api/v2/integrations/images/sync-base/all', {});
  });

  it('useUpdatePreferredInventory posts the centralized inventory preference payload', async () => {
    vi.mocked(api.post).mockResolvedValue({ inventoryId: 'inv-1' } as never);

    const { result } = renderHook(() => useUpdatePreferredInventory(), { wrapper });

    await result.current.mutateAsync({ inventoryId: 'inv-1' });

    expect(api.post).toHaveBeenCalledWith(
      '/api/v2/integrations/exports/base/default-inventory',
      { inventoryId: 'inv-1' }
    );
  });

  it('useUpdateDefaultExportConnection posts the centralized connection preference payload', async () => {
    vi.mocked(api.post).mockResolvedValue({ connectionId: 'conn-1' } as never);

    const { result } = renderHook(() => useUpdateDefaultExportConnection(), { wrapper });

    await result.current.mutateAsync({ connectionId: 'conn-1' });

    expect(api.post).toHaveBeenCalledWith(
      '/api/v2/integrations/exports/base/default-connection',
      { connectionId: 'conn-1' }
    );
  });
});
