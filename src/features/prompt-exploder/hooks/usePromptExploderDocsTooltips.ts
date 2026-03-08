import { readDocsTooltipsEnabled, useDocsTooltipsSetting } from '@/shared/lib/documentation';

export const PROMPT_EXPLODER_DOCS_TOOLTIP_KEY = 'prompt_exploder:docs_tooltips_enabled';

export const readPromptExploderDocsTooltipsEnabled = (): boolean =>
  readDocsTooltipsEnabled(PROMPT_EXPLODER_DOCS_TOOLTIP_KEY, false);

type PromptExploderDocsTooltipsState = {
  docsTooltipsEnabled: boolean;
  setDocsTooltipsEnabled: (enabled: boolean) => void;
};

export function usePromptExploderDocsTooltips(): PromptExploderDocsTooltipsState {
  const { enabled, setEnabled } = useDocsTooltipsSetting(PROMPT_EXPLODER_DOCS_TOOLTIP_KEY, false);

  return {
    docsTooltipsEnabled: enabled,
    setDocsTooltipsEnabled: setEnabled,
  };
}
