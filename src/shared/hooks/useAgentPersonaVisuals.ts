'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { AgentPersona } from '@/shared/contracts/agents';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

const createServerFallbackResult = (
  normalizedPersonaId: string | null
): UseQueryResult<AgentPersona[], Error> =>
  ({
    data: normalizedPersonaId ? undefined : [],
    dataUpdatedAt: 0,
    error: null,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    fetchStatus: 'idle',
    isError: false,
    isFetched: normalizedPersonaId === null,
    isFetchedAfterMount: false,
    isFetching: false,
    isInitialLoading: false,
    isLoading: false,
    isLoadingError: false,
    isPaused: false,
    isPending: normalizedPersonaId !== null,
    isPlaceholderData: false,
    isRefetchError: false,
    isRefetching: false,
    isStale: false,
    isSuccess: normalizedPersonaId === null,
    promise: Promise.resolve(normalizedPersonaId ? undefined : []),
    refetch: async () =>
      ({
        data: normalizedPersonaId ? undefined : [],
        error: null,
        status: normalizedPersonaId ? 'pending' : 'success',
        fetchStatus: 'idle',
      }) as never,
    status: normalizedPersonaId ? 'pending' : 'success',
  }) as UseQueryResult<AgentPersona[], Error>;

export function useAgentPersonaVisuals(
  personaId?: string | null
): UseQueryResult<AgentPersona[], Error> {
  const normalizedPersonaId =
    typeof personaId === 'string' && personaId.trim().length > 0 ? personaId.trim() : null;

  if (typeof window === 'undefined') {
    return createServerFallbackResult(normalizedPersonaId);
  }

  return useQuery<AgentPersona[], Error>({
    queryKey: normalizedPersonaId
      ? [...QUERY_KEYS.agentPersonas.detail(normalizedPersonaId), 'visuals']
      : [...QUERY_KEYS.agentPersonas.details(), 'visuals', 'none'],
    queryFn: async (): Promise<AgentPersona[]> => {
      if (!normalizedPersonaId) {
        return [];
      }
      const persona = await api.get<AgentPersona>(
        `/api/agentcreator/personas/${encodeURIComponent(normalizedPersonaId)}/visuals`
      );
      return [persona];
    },
    enabled: normalizedPersonaId !== null,
    staleTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
