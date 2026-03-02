'use client';

import { type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';

import { AGENT_PERSONA_SETTINGS_KEY } from '@/features/ai/agentcreator/constants/personas';
import { fetchAgentPersonas } from '@/features/ai/agentcreator/utils/personas';
import { invalidateSettingsCache } from '@/shared/api/settings-client';
import type { AgentPersona } from '@/shared/contracts/agents';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2, createUpdateMutationV2 } from '@/shared/lib/query-factories-v2';
import { invalidateAgentPersonas } from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { serializeSetting } from '@/shared/utils/settings-json';

export const agentPersonaKeys = QUERY_KEYS.agentPersonas;

export function useAgentPersonas(): UseQueryResult<AgentPersona[], Error> {
  return createListQueryV2<AgentPersona[], AgentPersona[]>({
    queryKey: agentPersonaKeys.lists(),
    queryFn: fetchAgentPersonas,
    staleTime: 120_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'ai.agentcreator.hooks.useAgentPersonas',
      operation: 'list',
      resource: 'agent-personas',
      domain: 'global',
      tags: ['ai', 'agentcreator', 'personas'],
    },
  });
}

export function useSaveAgentPersonasMutation(): UseMutationResult<
  void,
  Error,
  { personas: AgentPersona[] }
  > {
  return createUpdateMutationV2<void, { personas: AgentPersona[] }>({
    mutationKey: agentPersonaKeys.mutation('save'),
    mutationFn: async ({ personas }: { personas: AgentPersona[] }): Promise<void> => {
      await api.post('/api/settings', {
        key: AGENT_PERSONA_SETTINGS_KEY,
        value: serializeSetting(personas),
      });
      invalidateSettingsCache();
    },
    meta: {
      source: 'ai.agentcreator.hooks.useSaveAgentPersonas',
      operation: 'update',
      resource: 'agent-personas',
      domain: 'global',
      tags: ['ai', 'agentcreator', 'personas'],
    },
    invalidate: (queryClient) => invalidateAgentPersonas(queryClient),
  });
}
