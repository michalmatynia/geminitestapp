'use client';

import { PLAYWRIGHT_PERSONA_SETTINGS_KEY } from '@/features/playwright/constants/playwright';
import type { PlaywrightPersona } from '@/features/playwright/types';
import { invalidateSettingsCache } from '@/shared/api/settings-client';
import { api } from '@/shared/lib/api-client';
import { createQueryHook, createMutationHook } from '@/shared/lib/api-hooks';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { serializeSetting } from '@/shared/utils/settings-json';

export const playwrightKeys = QUERY_KEYS.playwright;

export const usePlaywrightPersonas = createQueryHook<PlaywrightPersona[], void>({
  queryKeyFactory: () => playwrightKeys.personas(),
  endpoint: '', // Not used since we provide custom queryFn via hook options if needed, 
  // but here createQueryHook needs to support custom queryFn or we use the factory pattern
});

export function useSavePlaywrightPersonasMutation() {
  return createMutationHook<void, { personas: PlaywrightPersona[] }>({
    mutationFn: async ({ personas }: { personas: PlaywrightPersona[] }): Promise<void> => {
      await api.post('/api/settings', {
        key: PLAYWRIGHT_PERSONA_SETTINGS_KEY,
        value: serializeSetting(personas),
      });
      invalidateSettingsCache();
    },
    onSuccess: (_data, _variables, _context, queryClient) => {
      void queryClient.invalidateQueries({ queryKey: playwrightKeys.personas() });
    },
  })();
}
