'use client';

import type { UseMutationResult } from '@tanstack/react-query';

import { AGENT_PERSONA_SETTINGS_KEY } from '@/shared/contracts/agents';
import { invalidateSettingsCache } from '@/shared/api/settings-client';
import type { AgentPersona } from '@/shared/contracts/agents';
import { useAgentPersonas } from '@/shared/hooks/useAgentPersonas';
import { api } from '@/shared/lib/api-client';
import { normalizeAgentPersonas } from '@/shared/lib/agent-personas';
import { createUpdateMutationV2 } from '@/shared/lib/query-factories-v2';
import { invalidateAgentPersonas } from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { serializeSetting } from '@/shared/utils/settings-json';

export const agentPersonaKeys = QUERY_KEYS.agentPersonas;
export { useAgentPersonas };

export function useSaveAgentPersonasMutation(): UseMutationResult<
  void,
  Error,
  { personas: AgentPersona[] }
  > {
  return createUpdateMutationV2<void, { personas: AgentPersona[] }>({
    mutationKey: agentPersonaKeys.mutation('save'),
    mutationFn: async ({ personas }: { personas: AgentPersona[] }): Promise<void> => {
      const canonicalPersonas = normalizeAgentPersonas(personas);
      await api.post('/api/settings', {
        key: AGENT_PERSONA_SETTINGS_KEY,
        value: serializeSetting(canonicalPersonas),
      });
      invalidateSettingsCache();
    },
    meta: {
      source: 'ai.agentcreator.hooks.useSaveAgentPersonas',
      operation: 'update',
      resource: 'agent-personas',
      domain: 'global',
      tags: ['ai', 'agentcreator', 'personas'],
      description: 'Updates agent personas.'},
    invalidate: (queryClient) => invalidateAgentPersonas(queryClient),
  });
}
