import { fetchSettingsCached } from '@/shared/api/settings-client';
import { PLAYWRIGHT_PERSONA_SETTINGS_KEY, type PlaywrightPersona } from '@/shared/contracts/playwright';
import type { ListQuery } from '@/shared/contracts/ui/queries';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { playwrightKeys } from '@/shared/lib/query-key-exports';
import { useSavePlaywrightPersonasMutation as useSavePlaywrightPersonasMutationShared } from '@/shared/hooks/usePlaywrightPersonas';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import { normalizeIntegrationPlaywrightPersonas } from '@/features/playwright/utils/playwright-settings-baseline';

export function usePlaywrightPersonas(options?: {
  enabled?: boolean;
}): ListQuery<PlaywrightPersona> {
  const queryKey = playwrightKeys.personas();
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<PlaywrightPersona[]> => {
      const data = await fetchSettingsCached();
      const map = new Map(data.map((item: { key: string; value: string }) => [item.key, item.value]));
      const stored = parseJsonSetting<PlaywrightPersona[]>(
        map.get(PLAYWRIGHT_PERSONA_SETTINGS_KEY),
        []
      );
      return normalizeIntegrationPlaywrightPersonas(stored);
    },
    ...(options?.enabled !== undefined ? { enabled: options.enabled } : {}),
    meta: {
      source: 'playwright.hooks.usePlaywrightPersonas',
      operation: 'list',
      resource: 'playwright.personas',
      domain: 'playwright',
      queryKey,
      tags: ['playwright', 'personas'],
      description: 'Loads playwright personas.',
    },
  });
}

export const useSavePlaywrightPersonasMutation = useSavePlaywrightPersonasMutationShared;
