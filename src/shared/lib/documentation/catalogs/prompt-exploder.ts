import {
  DOCUMENTATION_MODULE_IDS,
  type DocumentationEntry,
} from '@/shared/contracts/documentation';
import {
  PROMPT_EXPLODER_TOOLTIP_CATALOG,
  type PromptExploderTooltipDocEntry,
} from '@docs/prompt-exploder/tooltip-catalog';

export type PromptExploderDocEntry = PromptExploderTooltipDocEntry;

export const PROMPT_EXPLODER_DOC_CATALOG: PromptExploderDocEntry[] =
  PROMPT_EXPLODER_TOOLTIP_CATALOG;

export const PROMPT_EXPLODER_DOCUMENTATION_CATALOG: DocumentationEntry[] =
  PROMPT_EXPLODER_DOC_CATALOG.map((entry) => ({
    id: entry.id,
    moduleId: DOCUMENTATION_MODULE_IDS.promptExploder,
    title: entry.title,
    content: entry.summary,
    keywords: entry.aliases,
    ...(entry.docPath ? { relatedLinks: [entry.docPath] } : {}),
  }));
