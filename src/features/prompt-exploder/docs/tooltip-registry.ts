import {
  DOCUMENTATION_MODULE_IDS,
  getDocumentationEntry,
  resolveDocumentationEntryFromElement,
} from '@/shared/lib/documentation';
import { formatDocumentationTooltip } from '@/features/tooltip-engine';

import { type PromptExploderDocEntry } from './catalog';

const MODULE_ID = DOCUMENTATION_MODULE_IDS.promptExploder;

export const resolvePromptExploderTooltipDoc = (
  element: HTMLElement
): PromptExploderDocEntry | null => {
  const entry = resolveDocumentationEntryFromElement(MODULE_ID, element);
  if (!entry) return null;

  return {
    id: entry.id,
    title: entry.title,
    summary: entry.content,
    section: 'General',
    aliases: entry.keywords,
    docPath: entry.relatedLinks?.[0] ?? '/docs/PROMPT_EXPLODER_FEATURE_DOCUMENTATION.md',
  };
};

export const buildPromptExploderTooltipText = (doc: PromptExploderDocEntry): string =>
  formatDocumentationTooltip({
    id: doc.id,
    moduleId: MODULE_ID,
    title: doc.title,
    content: doc.summary,
    keywords: doc.aliases,
    ...(doc.docPath ? { relatedLinks: [doc.docPath] } : {}),
  });

export const promptExploderGenericTooltip = (_element: HTMLElement): string => {
  const fallbackDoc = getDocumentationEntry(MODULE_ID, 'workflow_overview');
  if (!fallbackDoc) return '';
  return formatDocumentationTooltip(fallbackDoc);
};
