// @vitest-environment jsdom

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiGetMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/lib/api-client', async () => {
  const actual = await vi.importActual<typeof import('@/shared/lib/api-client')>(
    '@/shared/lib/api-client'
  );

  return {
    ...actual,
    api: {
      ...actual.api,
      get: apiGetMock,
    },
  };
});

import { ApiError } from '@/shared/lib/api-client';

import { useAgentPersonaVisuals } from './useAgentPersonaVisuals';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const createWrapper = (queryClient: QueryClient) =>
  function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

describe('useAgentPersonaVisuals', () => {
  beforeEach(() => {
    apiGetMock.mockReset();
  });

  it('treats unauthorized persona visuals as optional data', async () => {
    apiGetMock.mockRejectedValue(new ApiError('Unauthorized', 401));

    const { result } = renderHook(() => useAgentPersonaVisuals('persona-1'), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual([]);
    });

    expect(apiGetMock).toHaveBeenCalledWith(
      '/api/agentcreator/personas/persona-1/visuals',
      { logError: false }
    );
  });

  it('treats missing persona visuals as optional data', async () => {
    apiGetMock.mockRejectedValue(new ApiError('Agent persona not found.', 404));

    const { result } = renderHook(() => useAgentPersonaVisuals('persona-2'), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual([]);
    });
  });

  it('returns persona visuals when the request succeeds', async () => {
    const persona = {
      id: 'persona-3',
      name: 'Tutor',
      moods: [],
    };
    apiGetMock.mockResolvedValue(persona);

    const { result } = renderHook(() => useAgentPersonaVisuals('persona-3'), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual([persona]);
    });
  });
});
