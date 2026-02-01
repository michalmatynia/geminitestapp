"use client";

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from "@tanstack/react-query";
import { serializeSetting } from "@/shared/utils/settings-json";
import { fetchPlaywrightPersonas } from "@/features/playwright/utils/personas";
import { PLAYWRIGHT_PERSONA_SETTINGS_KEY } from "@/features/playwright/constants/playwright";
import type { PlaywrightPersona } from "@/features/playwright/types";

export const playwrightKeys = {
  all: ["playwright"] as const,
  personas: () => [...playwrightKeys.all, "personas"] as const,
};

export function usePlaywrightPersonas(): UseQueryResult<PlaywrightPersona[], Error> {
  return useQuery({
    queryKey: playwrightKeys.personas(),
    queryFn: fetchPlaywrightPersonas,
  });
}

export function useSavePlaywrightPersonasMutation(): UseMutationResult<
  void,
  Error,
  { personas: PlaywrightPersona[] }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ personas }: { personas: PlaywrightPersona[] }): Promise<void> => {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: PLAYWRIGHT_PERSONA_SETTINGS_KEY,
          value: serializeSetting(personas),
        }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Failed to save personas.");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: playwrightKeys.personas() });
    },
  });
}
