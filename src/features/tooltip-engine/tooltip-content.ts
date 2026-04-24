import type { DocumentationEntry, DocumentationModuleId } from '@/shared/contracts/documentation';

import { getDocumentationEntry, resolveDocumentationEntryFromElement } from '@/shared/lib/documentation/registry';

export const formatDocumentationTooltip = (entry: DocumentationEntry): string =>
  `${entry.title}: ${entry.content}`;

export const getDocumentationTooltip = (
  moduleId: DocumentationModuleId,
  docId: string
): string | null => {
  const entry = getDocumentationEntry(moduleId, docId);
  if (!entry) return null;
  return formatDocumentationTooltip(entry);
};

export const getDocumentationTooltipForElement = (
  moduleId: DocumentationModuleId,
  element: HTMLElement,
  fallbackDocId?: string
): string | null => {
  const entry =
    resolveDocumentationEntryFromElement(moduleId, element) ??
    (fallbackDocId !== undefined && fallbackDocId !== '' ? getDocumentationEntry(moduleId, fallbackDocId) : null);

  if (!entry) return null;
  return formatDocumentationTooltip(entry);
};
