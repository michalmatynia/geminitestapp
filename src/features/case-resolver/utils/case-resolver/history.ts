import { ensureHtmlForPreview } from '@/features/document-editor/public';
import type {
  CaseResolverDocumentHistoryEntry,
  CaseResolverFileEditDraft,
} from '@/shared/contracts/case-resolver';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export const stripHtmlToComparablePlainText = (value: string): string =>
  value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h1|h2|h3|h4|h5|h6|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, '\'')
    .replace(/\s+/g, ' ')
    .trim();

const HISTORY_PREVIEW_ENTITY_MAP: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: '\'',
  nbsp: ' ',
};

export const decodeHistoryPreviewEntities = (value: string): string =>
  value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (fullMatch: string, entity: string): string => {
    const normalized = entity.trim();
    if (!normalized) return fullMatch;
    if (normalized.startsWith('#')) {
      const isHex = normalized[1]?.toLowerCase() === 'x';
      const rawCodePoint = isHex ? normalized.slice(2) : normalized.slice(1);
      const parsedCodePoint = Number.parseInt(rawCodePoint, isHex ? 16 : 10);
      if (!Number.isFinite(parsedCodePoint) || parsedCodePoint <= 0) {
        return fullMatch;
      }
      try {
        return String.fromCodePoint(parsedCodePoint);
      } catch (error) {
        logClientError(error);
        return fullMatch;
      }
    }
    return HISTORY_PREVIEW_ENTITY_MAP[normalized.toLowerCase()] ?? fullMatch;
  });

export const normalizeHistoryPreviewWhitespace = (value: string): string =>
  value
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export const stripHtmlForHistoryPreview = (value: string): string =>
  normalizeHistoryPreviewWhitespace(
    decodeHistoryPreviewEntities(
      value
        .replace(/<style[\s\S]*?<\/style>/gi, '\n')
        .replace(/<script[\s\S]*?<\/script>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|li|h1|h2|h3|h4|h5|h6|tr|td|th)>/gi, '\n')
        .replace(/<li[^>]*>/gi, '- ')
        .replace(/<[^>]+>/g, ' ')
    )
  );

export const truncateHistoryPreview = (value: string, maxChars: number): string => {
  if (value.length <= maxChars) return value;
  if (maxChars <= 0) return '';
  if (maxChars <= 3) return '.'.repeat(maxChars);
  return `${value.slice(0, maxChars - 3).trimEnd()}...`;
};

export const resolveHistoryPreviewFromCandidate = (
  value: string,
  candidateType: 'plainText' | 'markdown' | 'html' | 'content'
): string => {
  const normalizedValue = value.trim();
  if (!normalizedValue) return '';

  if (candidateType === 'plainText') {
    return normalizeHistoryPreviewWhitespace(decodeHistoryPreviewEntities(normalizedValue));
  }
  if (candidateType === 'markdown') {
    const markdownHtml = ensureHtmlForPreview(normalizedValue, 'markdown');
    return stripHtmlForHistoryPreview(markdownHtml);
  }
  if (candidateType === 'html') {
    return stripHtmlForHistoryPreview(normalizedValue);
  }
  if (/<[^>]+>/.test(normalizedValue)) {
    return stripHtmlForHistoryPreview(normalizedValue);
  }
  return normalizeHistoryPreviewWhitespace(decodeHistoryPreviewEntities(normalizedValue));
};

export const normalizeHistoryEditorType = (
  value:
    | CaseResolverFileEditDraft['editorType']
    | CaseResolverDocumentHistoryEntry['editorType']
    | undefined
): CaseResolverDocumentHistoryEntry['editorType'] => {
  if (value === 'markdown' || value === 'code') {
    return value;
  }
  return 'wysiwyg';
};
