import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { AgentPersona } from '@/shared/contracts/agents';
import { ApiError, api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

type AgentPersonaVisualsResult = Pick<UseQueryResult<AgentPersona[], Error>, 'data'>;

const isOptionalPersonaVisualsError = (error: unknown): error is ApiError =>
  error instanceof ApiError && [401, 403, 404].includes(error.status);

const createServerFallbackResult = (
  normalizedPersonaId: string | null
): AgentPersonaVisualsResult => ({
  data: normalizedPersonaId === null ? [] : undefined,
});

export function useAgentPersonaVisuals(
  personaId?: string | null
): AgentPersonaVisualsResult {
  const normalizedPersonaId =
    typeof personaId === 'string' && personaId.trim().length > 0 ? personaId.trim() : null;

  if (typeof window === 'undefined') {
    return createServerFallbackResult(normalizedPersonaId);
  }

  return useQuery<AgentPersona[], Error>({
    queryKey:
      normalizedPersonaId === null
        ? [...QUERY_KEYS.agentPersonas.details(), 'visuals', 'none']
        : [...QUERY_KEYS.agentPersonas.detail(normalizedPersonaId), 'visuals'],
    queryFn: async (): Promise<AgentPersona[]> => {
      if (normalizedPersonaId === null) {
        return [];
      }

      try {
        const persona = await api.get<AgentPersona>(
          `/api/agentcreator/personas/${encodeURIComponent(normalizedPersonaId)}/visuals`,
          { logError: false }
        );
        return [persona];
      } catch (error) {
        // Tutor visuals are optional enrichment on public Kangur surfaces.
        if (isOptionalPersonaVisualsError(error)) {
          return [];
        }
        throw error;
      }
    },
    enabled: normalizedPersonaId !== null,
    staleTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
