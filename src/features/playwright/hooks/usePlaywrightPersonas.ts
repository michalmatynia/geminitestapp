'use client';

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';

import { PLAYWRIGHT_PERSONA_SETTINGS_KEY } from '@/features/playwright/constants/playwright';
import type { PlaywrightPersona } from '@/features/playwright/types';
import { fetchPlaywrightPersonas } from '@/features/playwright/utils/personas';
import { invalidateSettingsCache } from '@/shared/api/settings-client';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { serializeSetting } from '@/shared/utils/settings-json';

export const playwrightKeys = QUERY_KEYS.playwright;

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
      await api.post('/api/settings', {
        key: PLAYWRIGHT_PERSONA_SETTINGS_KEY,
        value: serializeSetting(personas),
      });
      invalidateSettingsCache();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: playwrightKeys.personas() });
    },
  });
}
