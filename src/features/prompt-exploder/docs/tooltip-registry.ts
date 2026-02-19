'use client';

import {
  DOCUMENTATION_MODULE_IDS,
  getDocumentationEntry,
  resolveDocumentationEntryFromElement,
} from '@/features/documentation';
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
    summary: entry.summary,
    section: entry.section ?? 'General',
    aliases: entry.aliases,
    docPath: entry.docPath ?? '/docs/PROMPT_EXPLODER_FEATURE_DOCUMENTATION.md',
  };
};

export const buildPromptExploderTooltipText = (
  doc: PromptExploderDocEntry
): string => formatDocumentationTooltip({
  id: doc.id,
  moduleId: MODULE_ID,
  title: doc.title,
  summary: doc.summary,
  section: doc.section,
  aliases: doc.aliases,
  docPath: doc.docPath,
});

export const promptExploderGenericTooltip = (_element: HTMLElement): string => {
  const fallbackDoc = getDocumentationEntry(MODULE_ID, 'workflow_overview');
  if (!fallbackDoc) return '';
  return formatDocumentationTooltip(fallbackDoc);
};
