'use client';

import { useQueryClient } from '@tanstack/react-query';

import { PLAYWRIGHT_PERSONA_SETTINGS_KEY } from '@/features/playwright/constants/playwright';
import type { PlaywrightPersona } from '@/features/playwright/types';
import { fetchPlaywrightPersonas } from '@/features/playwright/utils/personas';
import { invalidateSettingsCache } from '@/shared/api/settings-client';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2, createUpdateMutationV2 } from '@/shared/lib/query-factories-v2';
import { playwrightKeys } from '@/shared/lib/query-key-exports';
import type { ListQuery, VoidMutation } from '@/shared/contracts/ui';
import { serializeSetting } from '@/shared/utils/settings-json';

export function usePlaywrightPersonas(): ListQuery<PlaywrightPersona> {
  const queryKey = playwrightKeys.personas();
  return createListQueryV2({
    queryKey,
    queryFn: fetchPlaywrightPersonas,
    meta: {
      source: 'playwright.hooks.usePlaywrightPersonas',
      operation: 'list',
      resource: 'playwright.personas',
      queryKey,
      tags: ['playwright', 'personas'],
    },
  });
}

export function useSavePlaywrightPersonasMutation(): VoidMutation<{ personas: PlaywrightPersona[] }> {
  const queryClient = useQueryClient();
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
      source: 'playwright.hooks.useSavePlaywrightPersonasMutation',
      operation: 'update',
      resource: 'playwright.personas',
      mutationKey,
      tags: ['playwright', 'personas', 'save'],
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: playwrightKeys.personas() });
    },
  });
}
