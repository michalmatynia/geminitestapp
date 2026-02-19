'use client';

import {
  readDocsTooltipsEnabled,
  useDocsTooltipsSetting,
} from '@/features/tooltip-engine';

export const AI_PATHS_DOCS_TOOLTIP_KEY = 'ai_paths:docs_tooltips_enabled';

export const readAiPathsDocsTooltipsEnabled = (): boolean =>
  readDocsTooltipsEnabled(AI_PATHS_DOCS_TOOLTIP_KEY, false);

type AiPathsDocsTooltipsState = {
  docsTooltipsEnabled: boolean;
  setDocsTooltipsEnabled: (enabled: boolean) => void;
};

export function useAiPathsDocsTooltips(): AiPathsDocsTooltipsState {
  const { enabled, setEnabled } = useDocsTooltipsSetting(
    AI_PATHS_DOCS_TOOLTIP_KEY,
    false,
  );

  return {
    docsTooltipsEnabled: enabled,
    setDocsTooltipsEnabled: setEnabled,
  };
}
