'use client';

import type { UseQueryResult } from '@tanstack/react-query';

import { fetchAgentPersonaMemory, type FetchAgentPersonaMemoryParams } from '@/features/ai/agentcreator/api/persona-memory';
import type { PersonaMemorySearchResponse } from '@/shared/contracts/persona-memory';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export function useAgentPersonaMemory(
  personaId: string,
  params: FetchAgentPersonaMemoryParams
): UseQueryResult<PersonaMemorySearchResponse, Error> {
  return createListQueryV2<PersonaMemorySearchResponse, PersonaMemorySearchResponse>({
    queryKey: QUERY_KEYS.agentPersonas.memory(personaId, params),
    queryFn: () => fetchAgentPersonaMemory(personaId, params),
    enabled: Boolean(personaId),
    staleTime: 30_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'ai.agentcreator.hooks.useAgentPersonaMemory',
      operation: 'list',
      resource: 'agent-persona-memory',
      domain: 'global',
      tags: ['ai', 'agentcreator', 'personas', 'memory'],
    },
  });
}
