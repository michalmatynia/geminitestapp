import {
  DOCUMENTATION_MODULE_IDS,
  type DocumentationEntry,
} from '@/shared/contracts/documentation';

import {
  AI_PATHS_TOOLTIP_CATALOG,
  type AiPathsTooltipDocEntry,
} from '@docs/ai-paths/tooltip-catalog';

export type AiPathsDocEntry = AiPathsTooltipDocEntry;

export const AI_PATHS_DOC_CATALOG: AiPathsDocEntry[] = AI_PATHS_TOOLTIP_CATALOG;

export const AI_PATHS_DOCUMENTATION_CATALOG: DocumentationEntry[] = AI_PATHS_DOC_CATALOG.map(
  (entry: AiPathsDocEntry): DocumentationEntry => ({
    id: entry.id,
    moduleId: DOCUMENTATION_MODULE_IDS.aiPaths,
    title: entry.title,
    content: entry.summary,
    keywords: entry.aliases,
    ...(entry.docPath ? { relatedLinks: [entry.docPath] } : {}),
  })
);
