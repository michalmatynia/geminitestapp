'use client';

import { useMemo } from 'react';

import {
  KANGUR_HELP_SETTINGS_KEY,
  areKangurDocsTooltipsEnabled,
  parseKangurHelpSettings,
  type KangurDocsTooltipSurface,
  type KangurHelpSettings,
} from '@/features/kangur/help-settings';
import {
  DOCUMENTATION_MODULE_IDS,
  DocumentationTooltipEnhancer,
  getDocumentationTooltip,
} from '@/shared/lib/documentation';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

export const getKangurDocTooltip = (docId: string): string | null =>
  getDocumentationTooltip(DOCUMENTATION_MODULE_IDS.kangur, docId);

export function useKangurHelpSettings(): KangurHelpSettings {
  const settingsStore = useSettingsStore();
  const rawHelpSettings = settingsStore.get(KANGUR_HELP_SETTINGS_KEY);

  return useMemo(() => parseKangurHelpSettings(rawHelpSettings), [rawHelpSettings]);
}

export function useKangurDocsTooltips(surface: KangurDocsTooltipSurface): {
  helpSettings: KangurHelpSettings;
  enabled: boolean;
} {
  const helpSettings = useKangurHelpSettings();

  return {
    helpSettings,
    enabled: areKangurDocsTooltipsEnabled(helpSettings, surface),
  };
}

export function KangurDocsTooltipEnhancer({
  enabled,
  rootId,
}: {
  enabled: boolean;
  rootId: string;
}): React.JSX.Element {
  const tooltipEnhancerEnabled = enabled;
  const tooltipRootId = rootId;

  return (
    <DocumentationTooltipEnhancer
      enabled={tooltipEnhancerEnabled}
      moduleId={DOCUMENTATION_MODULE_IDS.kangur}
      rootId={tooltipRootId}
    />
  );
}
