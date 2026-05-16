'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';

import type { Toast } from '@/shared/contracts/ui/base';
import {
  catalogToEntries,
  replaceCatalogPoolValues,
} from '@/shared/lib/ai-brain/catalog-entries';

import {
  PLAYWRIGHT_PERSONA_SETTINGS_KEY,
  parsePlaywrightPersonaIds,
} from './brain-runtime-shared';
import {
  sanitizeBrainProviderCatalog,
  type AiBrainProviderCatalog,
} from '../settings';

interface BrainSyncPersonasParams {
  setProviderCatalog: Dispatch<SetStateAction<AiBrainProviderCatalog>>;
  settingsMap: Map<string, string> | undefined;
  toast: Toast;
}

interface BrainSyncPersonasResult {
  syncPlaywrightPersonas: () => void;
}

export function useBrainSyncPersonas(params: BrainSyncPersonasParams): BrainSyncPersonasResult {
  const { setProviderCatalog, settingsMap, toast } = params;
  const syncPlaywrightPersonas = useCallback((): void => {
    if (!settingsMap) {
      toast('Settings are still loading.', { variant: 'error' });
      return;
    }
    const ids = parsePlaywrightPersonaIds(settingsMap.get(PLAYWRIGHT_PERSONA_SETTINGS_KEY));
    if (ids.length === 0) {
      toast('No Playwright personas found to sync.', { variant: 'error' });
      return;
    }
    setProviderCatalog((prev: AiBrainProviderCatalog) => {
      const baseEntries = catalogToEntries(prev);
      const nextEntries = replaceCatalogPoolValues(baseEntries, 'playwrightPersonas', ids);
      return sanitizeBrainProviderCatalog({
        ...prev,
        entries: nextEntries,
      });
    });
    toast('Playwright personas synced into Brain provider catalog.', { variant: 'success' });
  }, [setProviderCatalog, settingsMap, toast]);

  return { syncPlaywrightPersonas };
}
