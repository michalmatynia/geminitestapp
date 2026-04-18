import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { AgentPersona } from '@/shared/contracts/agents';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

type AgentPersonaVisualsResult = Pick<UseQueryResult<AgentPersona[], Error>, 'data'>;

const createServerFallbackResult = (
  normalizedPersonaId: string | null
): AgentPersonaVisualsResult => ({
  data: normalizedPersonaId ? undefined : [],
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
    queryKey: normalizedPersonaId
      ? [...QUERY_KEYS.agentPersonas.detail(normalizedPersonaId), 'visuals']
      : [...QUERY_KEYS.agentPersonas.details(), 'visuals', 'none'],
    queryFn: async (): Promise<AgentPersona[]> => {
      if (!normalizedPersonaId) {
        return [];
      }
      const persona = await api.get<AgentPersona | null>(
        `/api/agentcreator/personas/${encodeURIComponent(normalizedPersonaId)}/visuals?optional=1`
      );
      return persona ? [persona] : [];
    },
    enabled: normalizedPersonaId !== null,
    staleTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    meta: {
      source: 'shared.hooks.useAgentPersonaVisuals',
      errorPresentation: 'silent',
    },
  });
}
