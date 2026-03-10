'use client';


import type { AgentPersona } from '@/shared/contracts/agents';
import { fetchAgentPersonas } from '@/shared/lib/agent-personas';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import type { UseQueryResult } from '@tanstack/react-query';

export function useAgentPersonas(): UseQueryResult<AgentPersona[], Error> {
  return createListQueryV2<AgentPersona[], AgentPersona[]>({
    queryKey: QUERY_KEYS.agentPersonas.lists(),
    queryFn: fetchAgentPersonas,
    staleTime: 120_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'shared.hooks.useAgentPersonas',
      operation: 'list',
      resource: 'agent-personas',
      domain: 'global',
      tags: ['agentcreator', 'personas'],
      description: 'Loads agent personas.',
    },
  });
}
