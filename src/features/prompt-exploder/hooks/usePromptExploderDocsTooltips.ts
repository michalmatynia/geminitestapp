import { createDocsTooltipsState } from '@/shared/lib/documentation';

export const PROMPT_EXPLODER_DOCS_TOOLTIP_KEY = 'prompt_exploder:docs_tooltips_enabled';

const { readEnabled, useDocsTooltips } = createDocsTooltipsState(
  PROMPT_EXPLODER_DOCS_TOOLTIP_KEY,
  false
);

export const readPromptExploderDocsTooltipsEnabled = readEnabled;

export const usePromptExploderDocsTooltips = useDocsTooltips;
