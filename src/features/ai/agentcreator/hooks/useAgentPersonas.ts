'use client';

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';

import { AGENT_PERSONA_SETTINGS_KEY } from '@/features/ai/agentcreator/constants/personas';
import type { AgentPersona } from '@/features/ai/agentcreator/types';
import { fetchAgentPersonas } from '@/features/ai/agentcreator/utils/personas';
import { invalidateSettingsCache } from '@/shared/api/settings-client';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { serializeSetting } from '@/shared/utils/settings-json';

export const agentPersonaKeys = QUERY_KEYS.agentPersonas;

export function useAgentPersonas(): UseQueryResult<AgentPersona[], Error> {
  return useQuery({
    queryKey: agentPersonaKeys.list(),
    queryFn: fetchAgentPersonas,
  });
}

export function useSaveAgentPersonasMutation(): UseMutationResult<
  void,
  Error,
  { personas: AgentPersona[] }
  > {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ personas }: { personas: AgentPersona[] }): Promise<void> => {
      await api.post('/api/settings', {
        key: AGENT_PERSONA_SETTINGS_KEY,
        value: serializeSetting(personas),
      });
      invalidateSettingsCache();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: agentPersonaKeys.list() });
    },
  });
}
