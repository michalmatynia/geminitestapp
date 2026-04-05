import { invalidateSettingsCache } from '@/shared/api/settings-client';
import type { PlaywrightPersona } from '@/shared/contracts/playwright';
import { PLAYWRIGHT_PERSONA_SETTINGS_KEY } from '@/shared/contracts/playwright';
import type { ListQuery, VoidMutation } from '@/shared/contracts/ui/ui/queries';
import { api } from '@/shared/lib/api-client';
import { fetchPlaywrightPersonas } from '@/shared/lib/playwright/personas';
import { createListQueryV2, createUpdateMutationV2 } from '@/shared/lib/query-factories-v2';
import { playwrightKeys } from '@/shared/lib/query-key-exports';
import { serializeSetting } from '@/shared/utils/settings-json';

export function usePlaywrightPersonas(options?: {
  enabled?: boolean;
}): ListQuery<PlaywrightPersona> {
  const queryKey = playwrightKeys.personas();
  return createListQueryV2({
    queryKey,
    queryFn: fetchPlaywrightPersonas,
    ...(options?.enabled !== undefined ? { enabled: options.enabled } : {}),
    meta: {
      source: 'shared.hooks.usePlaywrightPersonas',
      operation: 'list',
      resource: 'playwright.personas',
      domain: 'playwright',
      queryKey,
      tags: ['playwright', 'personas'],
      description: 'Loads playwright personas.',
    },
  });
}

export function useSavePlaywrightPersonasMutation(): VoidMutation<{
  personas: PlaywrightPersona[];
}> {
  const mutationKey = playwrightKeys.personas();
  return createUpdateMutationV2({
    mutationFn: async ({ personas }: { personas: PlaywrightPersona[] }): Promise<void> => {
      await api.post<void>('/api/settings', {
        key: PLAYWRIGHT_PERSONA_SETTINGS_KEY,
        value: serializeSetting(personas),
      });
      invalidateSettingsCache();
    },
    mutationKey,
    meta: {
      source: 'shared.hooks.useSavePlaywrightPersonasMutation',
      operation: 'update',
      resource: 'playwright.personas',
      domain: 'playwright',
      mutationKey,
      tags: ['playwright', 'personas', 'save'],
      description: 'Updates playwright personas.',
    },
    invalidateKeys: [playwrightKeys.personas()],
  });
}
