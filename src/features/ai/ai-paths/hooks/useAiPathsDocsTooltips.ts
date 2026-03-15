import { createDocsTooltipsState, type DocsTooltipsState } from '@/shared/lib/documentation';

export const AI_PATHS_DOCS_TOOLTIP_KEY = 'ai_paths:docs_tooltips_enabled';

const { readEnabled, useDocsTooltips } = createDocsTooltipsState(
  AI_PATHS_DOCS_TOOLTIP_KEY,
  false
);

export type AiPathsDocsTooltipsState = DocsTooltipsState;

export const readAiPathsDocsTooltipsEnabled = readEnabled;

export const useAiPathsDocsTooltips = useDocsTooltips;
