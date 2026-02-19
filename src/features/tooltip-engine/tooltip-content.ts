import {
  getDocumentationEntry,
  resolveDocumentationEntryFromElement,
  type DocumentationEntry,
  type DocumentationModuleId,
} from '@/features/documentation';

export const formatDocumentationTooltip = (entry: DocumentationEntry): string =>
  `${entry.title}: ${entry.summary}`;

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
  const entry = resolveDocumentationEntryFromElement(moduleId, element)
    ?? (fallbackDocId ? getDocumentationEntry(moduleId, fallbackDocId) : null);

  if (!entry) return null;
  return formatDocumentationTooltip(entry);
};
