import type { DocumentationEntry, DocumentationModuleId } from '@/shared/contracts/documentation';

import { getDocumentationEntry, resolveDocumentationEntryFromElement } from './registry';

/**
 * Formats a documentation entry as a tooltip string.
 */
export const formatDocumentationTooltip = (entry: DocumentationEntry): string =>
  `${entry.title}: ${entry.content}`;

/**
 * Resolves a documentation entry and formats it as a tooltip.
 */
export const getDocumentationTooltip = (
  moduleId: DocumentationModuleId,
  docId: string
): string | null => {
  const entry = getDocumentationEntry(moduleId, docId);
  if (!entry) return null;
  return formatDocumentationTooltip(entry);
};

/**
 * Resolves a documentation entry from an element or fallback docId and formats it as a tooltip.
 */
export const getDocumentationTooltipForElement = (
  moduleId: DocumentationModuleId,
  element: HTMLElement,
  fallbackDocId?: string
): string | null => {
  const entry =
    resolveDocumentationEntryFromElement(moduleId, element) ??
    (fallbackDocId ? getDocumentationEntry(moduleId, fallbackDocId) : null);

  if (!entry) return null;
  return formatDocumentationTooltip(entry);
};
