'use client';

 
 
 
 
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  ensureSafeDocumentHtml,
} from '@/features/document-editor/content-format';
import type {
  CaseResolverDocumentHistoryEntry,
  CaseResolverFile,
  CaseResolverScanSlot,
  CaseResolverDocumentVersion,
  CaseResolverTag,
  CaseResolverPartyReference,
  CaseResolverFileEditDraft,
} from '@/shared/contracts/case-resolver';
import type {
  FilemakerDatabaseDto as FilemakerDatabase,
  FilemakerOrganizationDto as FilemakerOrganization,
  FilemakerPartyKindDto as FilemakerPartyKind,
  FilemakerPersonDto as FilemakerPerson,
} from '@/shared/contracts/filemaker';

// Modular imports
export {
  isLikelyImageFile,
  isLikelyPdfFile,
  isLikelyScanInputFile,
  createUniqueDocumentName,
  buildCombinedOcrText,
} from './case-resolver/files';

export {
  folderBaseName,
  isPathWithinFolder,
  createUniqueFolderPath,
} from './case-resolver/folders';

export {
  toNormalizedSearchValue,
  buildFilemakerAddressLabel,
} from './case-resolver/parties';

export {
  stripHtmlToComparablePlainText,
  decodeHistoryPreviewEntities,
  normalizeHistoryPreviewWhitespace,
  stripHtmlForHistoryPreview,
  truncateHistoryPreview,
  resolveHistoryPreviewFromCandidate,
  normalizeHistoryEditorType,
} from './case-resolver/history';

import {
  normalizeHistoryEditorType,
} from './case-resolver/history';

export const createId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
};

const hashString32 = (value: string, seed: number): number => {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
};

export const buildCaseResolverDocumentHash = (id: string, createdAt: string): string => {
  const source = `${id.trim()}|${createdAt.trim()}`;
  const reversed = source.split('').reverse().join('');
  const partA = hashString32(source, 0x811c9dc5);
  const partB = hashString32(reversed, 0x9e3779b1);
  return `DOC-${partA.toString(16).padStart(8, '0')}${partB.toString(16).padStart(8, '0')}`.toUpperCase();
};

export const toComparableHistoryPayload = (input: {
  activeDocumentVersion:
    | CaseResolverDocumentHistoryEntry['activeDocumentVersion']
    | CaseResolverFileEditDraft['activeDocumentVersion']
    | undefined;
  editorType:
    | CaseResolverDocumentHistoryEntry['editorType']
    | CaseResolverFileEditDraft['editorType']
    | undefined;
  documentContent: string | null | undefined;
  documentContentMarkdown: string | null | undefined;
  documentContentHtml: string | null | undefined;
  documentContentPlainText: string | null | undefined;
}) => {
  return {
    activeDocumentVersion: input.activeDocumentVersion === 'exploded' ? 'exploded' : 'original',
    editorType: normalizeHistoryEditorType(input.editorType),
    documentContent: input.documentContent ?? '',
    documentContentMarkdown: input.documentContentMarkdown ?? '',
    documentContentHtml: input.documentContentHtml ?? '',
    documentContentPlainText: input.documentContentPlainText ?? '',
  } as const;
};

export const areHistoryPayloadsEqual = (
  a: ReturnType<typeof toComparableHistoryPayload>,
  b: ReturnType<typeof toComparableHistoryPayload>
): boolean => {
  return (
    a.activeDocumentVersion === b.activeDocumentVersion &&
    a.editorType === b.editorType &&
    a.documentContent === b.documentContent &&
    a.documentContentMarkdown === b.documentContentMarkdown &&
    a.documentContentHtml === b.documentContentHtml &&
    a.documentContentPlainText === b.documentContentPlainText
  );
};

export const extractPartyName = (party: CaseResolverPartyReference): string => {
  if (party.organization) return party.organization.name;
  if (party.person) {
    const parts = [party.person.firstName, party.person.lastName].filter(Boolean);
    return parts.join(' ');
  }
  return 'Unknown Party';
};

export const extractVersionContent = (
  version: CaseResolverDocumentVersion | undefined | null,
  editorType: CaseResolverFileEditDraft['editorType']
): string => {
  if (!version) return '';
  if (editorType === 'markdown') return version.contentMarkdown ?? '';
  if (editorType === 'code') return version.contentPlainText ?? '';
  return version.contentHtml ?? '';
};

export const resolveActiveVersion = (
  file: CaseResolverFile,
  activeDocumentVersion: CaseResolverFileEditDraft['activeDocumentVersion']
): CaseResolverDocumentVersion | null => {
  if (activeDocumentVersion === 'exploded') return file.explodedVersion ?? null;
  return file.originalVersion ?? null;
};

export const getTagColor = (tag: CaseResolverTag): string => {
  if (tag.color) return tag.color;
  // Default colors based on tag type/name if needed
  return '#6b7280';
};

export const canEditDocument = (file: CaseResolverFile): boolean => {
  // Logic for whether document can be edited
  return !file.isArchived;
};

export const isHtmlContent = (content: string): boolean => {
  return /<[a-z][\s\S]*>/i.test(content);
};

export const getSafeInitialContent = (
  content: string | null | undefined,
  editorType: CaseResolverFileEditDraft['editorType']
): string => {
  if (!content) return '';
  if (editorType === 'wysiwyg') return ensureSafeDocumentHtml(content);
  return content;
};
