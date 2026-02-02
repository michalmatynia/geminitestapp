"use client";

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from "@tanstack/react-query";
import { serializeSetting } from "@/shared/utils/settings-json";
import { fetchAgentPersonas } from "@/features/ai/agentcreator/utils/personas";
import { AGENT_PERSONA_SETTINGS_KEY } from "@/features/ai/agentcreator/constants/personas";
import type { AgentPersona } from "@/features/ai/agentcreator/types";

export const agentPersonaKeys = {
  all: ["agent-personas"] as const,
  list: () => [...agentPersonaKeys.all, "list"] as const,
};

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
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: AGENT_PERSONA_SETTINGS_KEY,
          value: serializeSetting(personas),
        }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Failed to save agent personas.");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: agentPersonaKeys.list() });
    },
  });
}
