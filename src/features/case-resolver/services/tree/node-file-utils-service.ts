/**
 * Node File Utils Service
 * 
 * Provides utilities for processing, normalizing, and resolving content for 
 * Case Resolver files and document nodes.
 */

import { CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS, CASE_RESOLVER_EXPLANATORY_NODE_OUTPUT_PORTS } from '@/shared/contracts/case-resolver/constants';
import { type CaseResolverFile, type CaseResolverJoinMode, type CaseResolverScanSlot } from '@/shared/contracts/case-resolver';

export const PREVIEW_MAX_CHARS = 400;
export const SEARCHABLE_CONTENT_MAX_CHARS = 6000;
export const NODEFILE_JOIN_VALUE_MAP: Record<CaseResolverJoinMode, string> = {
  newline: '\n',
  tab: '\t',
  space: ' ',
  none: '',
};

/**
 * Normalizes a text string for search.
 */
export const normalizeSearchText = (value: string): string =>
  value.toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Normalizes folder path segments.
 */
export const normalizeFolderPathSegments = (folderPath: string): string[] =>
  folderPath
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

/**
 * Checks if a candidate path is within the scope of a scope path.
 */
export const isFolderPathWithinScope = (
  candidateFolderPath: string,
  scopeFolderPath: string
): boolean =>
  candidateFolderPath === scopeFolderPath || candidateFolderPath.startsWith(`${scopeFolderPath}/`);

/**
 * Resolves a search label for a party reference.
 */
export const resolvePartyReferenceSearchLabel = (
  reference: CaseResolverFile['addresser'] | CaseResolverFile['addressee']
): string => {
  if (!reference) return '';
  const kind = typeof reference.kind === 'string' ? reference.kind.trim() : '';
  const id = typeof reference.id === 'string' ? reference.id.trim() : '';
  if (!kind && !id) return '';
  return [kind, id].filter(Boolean).join(':');
};

/**
 * Resolves an identifier label.
 */
export const resolveIdentifierSearchLabel = (
  identifierId: string | null | undefined,
  labelsById: Map<string, string>
): string => {
  const normalizedIdentifierId = typeof identifierId === 'string' ? identifierId.trim() : '';
  if (!normalizedIdentifierId) return '';
  return labelsById.get(normalizedIdentifierId) ?? normalizedIdentifierId;
};

/**
 * Resolves a content preview for a file.
 */
export const resolveContentPreview = (file: CaseResolverFile): string => {
  if (file.fileType === 'document') {
    const text = file.documentContentPlainText.trim() || file.documentContentMarkdown.trim();
    return text.length > PREVIEW_MAX_CHARS ? `${text.slice(0, PREVIEW_MAX_CHARS)}…` : text;
  }
  if (file.fileType === 'scanfile') {
    const combined = file.scanSlots
      .map((slot: CaseResolverScanSlot): string => (slot.ocrText ?? '').trim())
      .filter(Boolean)
      .join('\n\n');
    return combined.length > PREVIEW_MAX_CHARS ? `${combined.slice(0, PREVIEW_MAX_CHARS)}…` : combined;
  }
  return '';
};

/**
 * Resolves content suitable for document searching.
 */
export const resolveSearchableDocumentContent = (file: CaseResolverFile): string => {
  if (file.fileType === 'document') {
    const text = (file.documentContentPlainText.trim() || file.documentContentMarkdown.trim() || file.documentContent.trim());
    return text.length > SEARCHABLE_CONTENT_MAX_CHARS ? text.slice(0, SEARCHABLE_CONTENT_MAX_CHARS) : text;
  }
  if (file.fileType === 'scanfile') {
    const combined = file.scanSlots
      .map((slot: CaseResolverScanSlot): string => (slot.ocrText ?? '').trim())
      .filter(Boolean)
      .join('\n\n');
    return combined.length > SEARCHABLE_CONTENT_MAX_CHARS ? combined.slice(0, SEARCHABLE_CONTENT_MAX_CHARS) : combined;
  }
  return '';
};

/**
 * Node port utility functions.
 */
export const isDocumentWysiwygTextPort = (port: string | null | undefined): boolean => port === CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS[0];
export const isDocumentPlaintextContentPort = (port: string | null | undefined): boolean => port === CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS[1];
export const isDocumentPlainTextPort = (port: string | null | undefined): boolean => port === CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS[2];
export const isDocumentWysiwygContentPort = (port: string | null | undefined): boolean => port === CASE_RESOLVER_EXPLANATORY_NODE_OUTPUT_PORTS[3];

/**
 * Resolves output value by port.
 */
export const resolveOutputValueByPort = (
  outputs: { wysiwygText: string; plaintextContent: string; plainText: string; wysiwygContent: string } | null | undefined,
  fromPort: string | null | undefined,
  fallback: 'wysiwygText' | 'plaintextContent' | 'plainText' | 'wysiwygContent'
): string => {
  if (!outputs) return '';
  if (isDocumentWysiwygTextPort(fromPort)) return outputs.wysiwygText;
  if (isDocumentPlainTextPort(fromPort)) return outputs.plainText;
  if (isDocumentWysiwygContentPort(fromPort)) return outputs.wysiwygContent;
  if (isDocumentPlaintextContentPort(fromPort)) return outputs.plaintextContent;
  
  const map: Record<string, string> = {
    plainText: outputs.plainText,
    wysiwygContent: outputs.wysiwygContent,
    wysiwygText: outputs.wysiwygText,
    plaintextContent: outputs.plaintextContent,
  };
  return map[fallback] ?? outputs.plaintextContent;
};

/**
 * Joins string based on join mode.
 */
export const appendWithJoinMode = (current: string, value: string, joinMode: CaseResolverJoinMode): string => {
  if (!value) return current;
  if (!current) return value;
  return `${current}${NODEFILE_JOIN_VALUE_MAP[joinMode]}${value}`;
};
