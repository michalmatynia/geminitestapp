 
 
 
 
 
 

import {
  deriveDocumentContentSync,
  ensureHtmlForPreview,
  hasHtmlMarkup,
  ensureSafeDocumentHtml,
  stripHtmlToPlainText,
  toStorageDocumentValue,
} from '@/features/document-editor/content-format';
import type {
  CaseResolverDocumentHistoryEntry,
  CaseResolverFile,
  CaseResolverTag,
  CaseResolverPartyReference,
  CaseResolverFileEditDraft,
} from '@/shared/contracts/case-resolver';
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
  resolveHistoryPreviewFromCandidate,
  truncateHistoryPreview,
  normalizeHistoryEditorType,
} from './case-resolver/history';

export const createId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
};

const CASE_RESOLVER_DOCUMENT_HISTORY_LIMIT = 120;

const normalizeSemanticallyEmptyCanonicalContent = (
  canonical: ReturnType<typeof deriveDocumentContentSync>
): ReturnType<typeof deriveDocumentContentSync> => {
  if (canonical.plainText.trim().length > 0) return canonical;
  if (
    canonical.html.length === 0 &&
    canonical.markdown.length === 0 &&
    canonical.plainText.length === 0
  ) {
    return canonical;
  }
  return {
    ...canonical,
    html: '',
    markdown: '',
    plainText: '',
  };
};

const normalizePartyReference = (
  value: CaseResolverPartyReference | null | undefined
): CaseResolverPartyReference | null => {
  if (!value || typeof value !== 'object') return null;
  const kind = value.kind === 'person' || value.kind === 'organization' ? value.kind : null;
  const id = typeof value.id === 'string' ? value.id.trim() : '';
  if (!kind || !id) return null;
  return { kind, id };
};

const normalizeDocumentDateDraft = (
  value: CaseResolverFile['documentDate'] | CaseResolverFileEditDraft['documentDate'] | string | null | undefined
): CaseResolverFileEditDraft['documentDate'] => {
  if (!value) return null;
  if (typeof value === 'string') {
    const isoDate = value.trim();
    if (!isoDate) return null;
    return {
      isoDate,
      source: 'text',
      sourceLine: null,
      cityHint: null,
      city: null,
      action: 'useDetectedDate',
    };
  }
  return value;
};

const buildCanonicalDocumentForDraft = (
  file: CaseResolverFile
): ReturnType<typeof deriveDocumentContentSync> => {
  const mode: 'markdown' | 'wysiwyg' = file.fileType === 'scanfile' ? 'markdown' : 'wysiwyg';
  if (mode === 'markdown') {
    const source = (() => {
      if (typeof file.documentContentMarkdown === 'string' && file.documentContentMarkdown.trim()) {
        return file.documentContentMarkdown;
      }
      if (typeof file.documentContentPlainText === 'string' && file.documentContentPlainText.trim()) {
        return file.documentContentPlainText;
      }
      if (typeof file.documentContent === 'string' && file.documentContent.trim()) {
        return hasHtmlMarkup(file.documentContent)
          ? stripHtmlToPlainText(file.documentContent)
          : file.documentContent;
      }
      if (typeof file.documentContentHtml === 'string' && file.documentContentHtml.trim()) {
        return stripHtmlToPlainText(file.documentContentHtml);
      }
      return '';
    })();
    return normalizeSemanticallyEmptyCanonicalContent(
      deriveDocumentContentSync({
        mode: 'markdown',
        value: source,
        previousHtml: file.documentContentHtml ?? '',
        previousMarkdown: file.documentContentMarkdown ?? '',
      })
    );
  }

  const htmlSource = (() => {
    if (typeof file.documentContentHtml === 'string' && file.documentContentHtml.trim()) {
      return file.documentContentHtml;
    }
    if (typeof file.documentContentMarkdown === 'string' && file.documentContentMarkdown.trim()) {
      return ensureHtmlForPreview(file.documentContentMarkdown, 'markdown');
    }
    return ensureSafeDocumentHtml(file.documentContent ?? '');
  })();
  return normalizeSemanticallyEmptyCanonicalContent(
    deriveDocumentContentSync({
      mode: 'wysiwyg',
      value: htmlSource,
      previousHtml: file.documentContentHtml ?? '',
      previousMarkdown: file.documentContentMarkdown ?? '',
    })
  );
};

export const buildFileEditDraft = (file: CaseResolverFile): CaseResolverFileEditDraft => {
  const canonical = buildCanonicalDocumentForDraft(file);
  const activeDocumentVersion =
    file.activeDocumentVersion === 'exploded' && !file.explodedDocumentContent?.trim()
      ? 'original'
      : file.activeDocumentVersion === 'exploded'
        ? 'exploded'
        : 'original';
  const storedContent = toStorageDocumentValue(canonical);
  const resolvedOriginalDocumentContent =
    typeof file.originalDocumentContent === 'string'
      ? file.originalDocumentContent
      : activeDocumentVersion === 'original'
        ? storedContent
        : '';
  const resolvedExplodedDocumentContent =
    typeof file.explodedDocumentContent === 'string'
      ? file.explodedDocumentContent
      : activeDocumentVersion === 'exploded'
        ? storedContent
        : '';

  return {
    id: file.id,
    name: file.name,
    content: storedContent,
    fileType: file.fileType,
    folder: file.folder,
    caseTreeOrder: file.caseTreeOrder,
    parentCaseId: file.parentCaseId ?? null,
    referenceCaseIds: [...(file.referenceCaseIds ?? [])],
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
    documentDate: normalizeDocumentDateDraft(file.documentDate),
    documentCity: file.documentCity ?? null,
    happeningDate: file.happeningDate ?? null,
    isSent: file.isSent === true,
    originalDocumentContent: resolvedOriginalDocumentContent,
    explodedDocumentContent: resolvedExplodedDocumentContent,
    activeDocumentVersion,
    editorType: canonical.mode,
    documentContentFormatVersion: 1,
    documentContentVersion: file.documentContentVersion ?? 1,
    baseDocumentContentVersion: file.documentContentVersion ?? 1,
    documentContent: storedContent,
    documentContentMarkdown: canonical.markdown,
    documentContentHtml: canonical.html,
    documentContentPlainText: canonical.plainText,
    documentHistory: [...(file.documentHistory ?? [])],
    documentConversionWarnings: [...(canonical.warnings ?? file.documentConversionWarnings ?? [])],
    lastContentConversionAt: file.lastContentConversionAt ?? null,
    scanSlots: [...(file.scanSlots ?? [])],
    scanOcrModel: file.scanOcrModel ?? '',
    scanOcrPrompt: file.scanOcrPrompt ?? '',
    isLocked: file.isLocked === true,
    graph: file.graph,
    addresser: normalizePartyReference(file.addresser),
    addressee: normalizePartyReference(file.addressee),
    tagId: file.tagId ?? null,
    caseIdentifierId: file.caseIdentifierId ?? null,
    categoryId: file.categoryId ?? null,
  };
};

export const createCaseResolverHistorySnapshotEntry = (input: {
  savedAt: string;
  documentContentVersion: number;
  activeDocumentVersion: CaseResolverDocumentHistoryEntry['activeDocumentVersion'];
  editorType:
    | CaseResolverDocumentHistoryEntry['editorType']
    | CaseResolverFileEditDraft['editorType']
    | undefined;
  documentContent: string | null | undefined;
  documentContentMarkdown: string | null | undefined;
  documentContentHtml: string | null | undefined;
  documentContentPlainText: string | null | undefined;
}): CaseResolverDocumentHistoryEntry | null => {
  const normalizedEditorType = normalizeHistoryEditorType(input.editorType);
  const canonical = normalizeSemanticallyEmptyCanonicalContent(
    deriveDocumentContentSync({
      mode: normalizedEditorType === 'markdown' || normalizedEditorType === 'code' ? 'markdown' : 'wysiwyg',
      value:
        normalizedEditorType === 'markdown' || normalizedEditorType === 'code'
          ? input.documentContentMarkdown ??
            input.documentContentPlainText ??
            (hasHtmlMarkup(input.documentContent ?? '')
              ? stripHtmlToPlainText(input.documentContent ?? '')
              : (input.documentContent ?? ''))
          : input.documentContentHtml ??
            (typeof input.documentContentMarkdown === 'string' && input.documentContentMarkdown.trim()
              ? ensureHtmlForPreview(input.documentContentMarkdown, 'markdown')
              : ensureSafeDocumentHtml(input.documentContent ?? '')),
      previousMarkdown: input.documentContentMarkdown ?? '',
      previousHtml: input.documentContentHtml ?? '',
    })
  );

  if (
    canonical.plainText.trim().length === 0 &&
    canonical.markdown.trim().length === 0 &&
    canonical.html.trim().length === 0
  ) {
    return null;
  }

  return {
    id: createId('case-doc-history'),
    savedAt: input.savedAt,
    documentContentVersion: input.documentContentVersion,
    activeDocumentVersion: input.activeDocumentVersion === 'exploded' ? 'exploded' : 'original',
    editorType: normalizedEditorType,
    documentContent: toStorageDocumentValue(canonical),
    documentContentMarkdown: canonical.markdown,
    documentContentHtml: canonical.html,
    documentContentPlainText: canonical.plainText,
  };
};

export const prependDraftHistorySnapshotForRevisionLoad = ({
  draft,
  loadedEntry,
  savedAt,
  historyLimit = CASE_RESOLVER_DOCUMENT_HISTORY_LIMIT,
}: {
  draft: CaseResolverFileEditDraft;
  loadedEntry: CaseResolverDocumentHistoryEntry;
  savedAt: string;
  historyLimit?: number;
}): CaseResolverDocumentHistoryEntry[] => {
  const existingHistory = draft.documentHistory ?? [];
  const draftComparable = toComparableHistoryPayload({
    activeDocumentVersion: draft.activeDocumentVersion,
    editorType: draft.editorType,
    documentContent: draft.documentContent,
    documentContentMarkdown: draft.documentContentMarkdown,
    documentContentHtml: draft.documentContentHtml,
    documentContentPlainText: draft.documentContentPlainText,
  });
  const loadedComparable = toComparableHistoryPayload({
    activeDocumentVersion: loadedEntry.activeDocumentVersion,
    editorType: loadedEntry.editorType,
    documentContent: loadedEntry.documentContent,
    documentContentMarkdown: loadedEntry.documentContentMarkdown,
    documentContentHtml: loadedEntry.documentContentHtml,
    documentContentPlainText: loadedEntry.documentContentPlainText,
  });
  if (areHistoryPayloadsEqual(draftComparable, loadedComparable)) {
    return existingHistory;
  }

  const snapshot = createCaseResolverHistorySnapshotEntry({
    savedAt,
    documentContentVersion: draft.documentContentVersion ?? 0,
    activeDocumentVersion: draft.activeDocumentVersion === 'exploded' ? 'exploded' : 'original',
    editorType: draft.editorType,
    documentContent: draft.documentContent,
    documentContentMarkdown: draft.documentContentMarkdown,
    documentContentHtml: draft.documentContentHtml,
    documentContentPlainText: draft.documentContentPlainText,
  });
  if (!snapshot) return existingHistory;

  const top = existingHistory[0];
  if (top) {
    const topComparable = toComparableHistoryPayload({
      activeDocumentVersion: top.activeDocumentVersion,
      editorType: top.editorType,
      documentContent: top.documentContent,
      documentContentMarkdown: top.documentContentMarkdown,
      documentContentHtml: top.documentContentHtml,
      documentContentPlainText: top.documentContentPlainText,
    });
    const snapshotComparable = toComparableHistoryPayload({
      activeDocumentVersion: snapshot.activeDocumentVersion,
      editorType: snapshot.editorType,
      documentContent: snapshot.documentContent,
      documentContentMarkdown: snapshot.documentContentMarkdown,
      documentContentHtml: snapshot.documentContentHtml,
      documentContentPlainText: snapshot.documentContentPlainText,
    });
    if (areHistoryPayloadsEqual(topComparable, snapshotComparable)) {
      return existingHistory;
    }
  }

  return [snapshot, ...existingHistory].slice(0, Math.max(1, historyLimit));
};

export const resolveCaseResolverHistoryEntryPreview = (
  entry: CaseResolverDocumentHistoryEntry,
  maxChars: number = 240
): string => {
  const candidates: Array<{ value: string | undefined; type: 'plainText' | 'markdown' | 'html' | 'content' }> = [
    { value: entry.documentContentPlainText, type: 'plainText' },
    { value: entry.documentContentMarkdown, type: 'markdown' },
    { value: entry.documentContentHtml, type: 'html' },
    { value: entry.documentContent, type: 'content' },
  ];

  const preview = candidates.reduce<string>((resolved, candidate) => {
    if (resolved.length > 0) return resolved;
    const raw = typeof candidate.value === 'string' ? candidate.value : '';
    if (!raw.trim()) return resolved;
    return resolveHistoryPreviewFromCandidate(raw, candidate.type);
  }, '');

  if (!preview) return '';
  return truncateHistoryPreview(preview, maxChars);
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const asHtmlParagraphs = (value: string): string =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('');

export const buildDocumentPdfMarkup = ({
  documentDate,
  documentPlace,
  addresserLabel,
  addresseeLabel,
  documentContent,
}: {
  documentDate?: string | null;
  documentPlace?: string | null;
  addresserLabel?: string | null;
  addresseeLabel?: string | null;
  documentContent?: string | null;
}): string => {
  const hasHtml = typeof documentContent === 'string' && hasHtmlMarkup(documentContent);
  const content = hasHtml
    ? ensureSafeDocumentHtml(documentContent ?? '')
    : asHtmlParagraphs(documentContent ?? '');
  const datePlace = [documentPlace?.trim(), documentDate?.trim()].filter(Boolean).join(', ');

  return `
    <div class="case-document">
      ${datePlace ? `<div class="case-document__date-place">${escapeHtml(datePlace)}</div>` : ''}
      ${addresserLabel?.trim() ? `<div class="case-document__addresser">${asHtmlParagraphs(addresserLabel)}</div>` : ''}
      ${addresseeLabel?.trim() ? `<div class="case-document__addressee">${asHtmlParagraphs(addresseeLabel)}</div>` : ''}
      <div class="case-document__content">${content}</div>
    </div>
  `.trim();
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
  const normalizedName = typeof party.name === 'string' ? party.name.trim() : '';
  if (normalizedName) return normalizedName;
  return party.kind === 'organization' ? 'Unknown Organization' : 'Unknown Person';
};

type CaseResolverResolvedVersionContent = {
  contentMarkdown?: string;
  contentPlainText?: string;
  contentHtml?: string;
};

export const extractVersionContent = (
  version: CaseResolverResolvedVersionContent | undefined | null,
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
): CaseResolverResolvedVersionContent | null => {
  const baseContent =
    activeDocumentVersion === 'exploded'
      ? file.explodedDocumentContent ?? file.documentContent
      : file.originalDocumentContent ?? file.documentContent;
  return {
    contentMarkdown:
      activeDocumentVersion === 'exploded'
        ? file.explodedDocumentContent ?? file.documentContentMarkdown ?? baseContent
        : file.originalDocumentContent ?? file.documentContentMarkdown ?? baseContent,
    contentPlainText:
      activeDocumentVersion === 'exploded'
        ? file.explodedDocumentContent ?? file.documentContentPlainText ?? baseContent
        : file.originalDocumentContent ?? file.documentContentPlainText ?? baseContent,
    contentHtml:
      activeDocumentVersion === 'exploded'
        ? ensureSafeDocumentHtml(file.explodedDocumentContent ?? file.documentContentHtml ?? baseContent)
        : ensureSafeDocumentHtml(file.originalDocumentContent ?? file.documentContentHtml ?? baseContent),
  };
};

export const getTagColor = (tag: CaseResolverTag): string => {
  if (tag.color) return tag.color;
  // Default colors based on tag type/name if needed
  return '#6b7280';
};

export const canEditDocument = (file: CaseResolverFile): boolean => {
  return !file.isLocked;
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
