'use client';

import {
  ensureHtmlForPreview,
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

import { normalizeCaseResolverComparable } from '../party-matching';
import { normalizeFolderPath } from '../settings';


export const createId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
};

const IMAGE_FILE_EXTENSION_PATTERN = /\.(avif|bmp|gif|heic|heif|jpe?g|png|svg|tiff?|webp)$/i;
const PDF_FILE_EXTENSION_PATTERN = /\.pdf$/i;

export const isLikelyImageFile = (file: File): boolean => {
  const mimeType = file.type.trim().toLowerCase();
  if (mimeType.startsWith('image/')) return true;
  return IMAGE_FILE_EXTENSION_PATTERN.test(file.name.trim());
};

export const isLikelyPdfFile = (file: File): boolean => {
  const mimeType = file.type.trim().toLowerCase();
  if (mimeType === 'application/pdf') return true;
  return PDF_FILE_EXTENSION_PATTERN.test(file.name.trim());
};

export const isLikelyScanInputFile = (file: File): boolean =>
  isLikelyImageFile(file) || isLikelyPdfFile(file);

export const folderBaseName = (path: string): string => {
  const normalized = normalizeFolderPath(path);
  if (!normalized) return '';
  if (!normalized.includes('/')) return normalized;
  return normalized.slice(normalized.lastIndexOf('/') + 1);
};

export const isPathWithinFolder = (candidatePath: string, folderPath: string): boolean => {
  const normalizedCandidatePath = normalizeFolderPath(candidatePath);
  const normalizedFolderPath = normalizeFolderPath(folderPath);
  if (!normalizedFolderPath) return false;
  return (
    normalizedCandidatePath === normalizedFolderPath ||
    normalizedCandidatePath.startsWith(`${normalizedFolderPath}/`)
  );
};

export const createUniqueFolderPath = (existingFolders: string[], targetFolderPath: string | null): string => {
  const parent = normalizeFolderPath(targetFolderPath ?? '');
  const existing = new Set(existingFolders.map((folder: string) => normalizeFolderPath(folder)));
  const baseName = 'new-folder';

  let index = 1;
  while (index < 10000) {
    const candidateName = index === 1 ? baseName : `${baseName}-${index}`;
    const candidatePath = normalizeFolderPath(parent ? `${parent}/${candidateName}` : candidateName);
    if (candidatePath && !existing.has(candidatePath)) {
      return candidatePath;
    }
    index += 1;
  }

  return normalizeFolderPath(parent ? `${parent}/${baseName}-${Date.now()}` : `${baseName}-${Date.now()}`);
};

export const createUniqueDocumentName = (existingFiles: CaseResolverFile[], baseName: string): string => {
  const normalizedBase = baseName.trim() || 'Exploded Document';
  const existingNames = new Set(
    existingFiles.map((file: CaseResolverFile): string => file.name.trim().toLowerCase())
  );
  if (!existingNames.has(normalizedBase.toLowerCase())) {
    return normalizedBase;
  }

  let index = 2;
  while (index < 10000) {
    const candidate = `${normalizedBase} ${index}`;
    if (!existingNames.has(candidate.toLowerCase())) {
      return candidate;
    }
    index += 1;
  }

  return `${normalizedBase} ${Date.now()}`;
};

export const toNormalizedSearchValue = (...parts: Array<string | null | undefined>): string =>
  normalizeCaseResolverComparable(parts
    .map((value: string | null | undefined): string => value?.trim() ?? '')
    .filter((value: string): boolean => value.length > 0)
    .join(' '));

export const buildFilemakerAddressLabel = ({
  street,
  streetNumber,
  postalCode,
  city,
  country,
}: {
  street: string;
  streetNumber: string;
  postalCode: string;
  city: string;
  country: string;
}): string => {
  const streetLabel = [street.trim(), streetNumber.trim()].filter(Boolean).join(' ').trim();
  const cityLabel = [postalCode.trim(), city.trim()].filter(Boolean).join(' ').trim();
  return [streetLabel, cityLabel, country.trim()].filter(Boolean).join(', ');
};

export const buildCombinedOcrText = (slots: CaseResolverScanSlot[]): string => {
  const parts = slots
    .map((slot: CaseResolverScanSlot): string => {
      const text = (slot.ocrText || '').trim();
      if (!text) return '';
      return text;
    })
    .filter((value: string): boolean => value.length > 0);
  return parts.join('\n\n');
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

const normalizeHistoryEditorType = (
  value: CaseResolverFileEditDraft['editorType'] | CaseResolverDocumentHistoryEntry['editorType'] | undefined
): CaseResolverDocumentHistoryEntry['editorType'] => {
  if (value === 'markdown' || value === 'code') {
    return value;
  }
  return 'wysiwyg';
};

const toComparableHistoryPayload = (input: {
  activeDocumentVersion: CaseResolverDocumentHistoryEntry['activeDocumentVersion'] | CaseResolverFileEditDraft['activeDocumentVersion'] | undefined;
  editorType: CaseResolverDocumentHistoryEntry['editorType'] | CaseResolverFileEditDraft['editorType'] | undefined;
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

const stripHtmlToComparablePlainText = (value: string): string => value
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

const decodeHistoryPreviewEntities = (value: string): string =>
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
      } catch {
        return fullMatch;
      }
    }
    return HISTORY_PREVIEW_ENTITY_MAP[normalized.toLowerCase()] ?? fullMatch;
  });

const normalizeHistoryPreviewWhitespace = (value: string): string =>
  value
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const stripHtmlForHistoryPreview = (value: string): string =>
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

const truncateHistoryPreview = (value: string, maxChars: number): string => {
  if (value.length <= maxChars) return value;
  if (maxChars <= 0) return '';
  if (maxChars <= 3) return '.'.repeat(maxChars);
  return `${value.slice(0, maxChars - 3).trimEnd()}...`;
};

const resolveHistoryPreviewFromCandidate = (
  value: string,
  candidateType: 'plainText' | 'markdown' | 'html' | 'content',
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

export const resolveCaseResolverHistoryEntryPreview = (
  entry: CaseResolverDocumentHistoryEntry | null | undefined,
  maxChars = 240,
): string => {
  if (!entry) return '';
  const normalizedMaxChars = Number.isFinite(maxChars)
    ? Math.max(1, Math.floor(maxChars))
    : 240;

  const candidates: Array<{
    value: string | null | undefined;
    type: 'plainText' | 'markdown' | 'html' | 'content';
  }> = [
    { value: entry.documentContentPlainText, type: 'plainText' },
    { value: entry.documentContentMarkdown, type: 'markdown' },
    { value: entry.documentContentHtml, type: 'html' },
    { value: entry.documentContent, type: 'content' },
  ];

  for (const candidate of candidates) {
    if (typeof candidate.value !== 'string') continue;
    const previewText = resolveHistoryPreviewFromCandidate(candidate.value, candidate.type);
    if (!previewText) continue;
    return truncateHistoryPreview(previewText, normalizedMaxChars);
  }
  return '';
};

const hasMeaningfulComparableHistoryPayload = (
  payload: ReturnType<typeof toComparableHistoryPayload>
): boolean => {
  if (payload.documentContentPlainText.trim().length > 0) {
    return true;
  }
  const normalizedHtml = (() => {
    if (payload.documentContentHtml.trim().length > 0) {
      return payload.documentContentHtml;
    }
    if (payload.documentContentMarkdown.trim().length > 0) {
      return ensureHtmlForPreview(payload.documentContentMarkdown, 'markdown');
    }
    return ensureSafeDocumentHtml(payload.documentContent);
  })();
  return stripHtmlToComparablePlainText(normalizedHtml).length > 0;
};

const areComparableHistoryPayloadsEqual = (
  left: ReturnType<typeof toComparableHistoryPayload>,
  right: ReturnType<typeof toComparableHistoryPayload>,
): boolean =>
  left.activeDocumentVersion === right.activeDocumentVersion &&
  left.editorType === right.editorType &&
  left.documentContent === right.documentContent &&
  left.documentContentMarkdown === right.documentContentMarkdown &&
  left.documentContentHtml === right.documentContentHtml &&
  left.documentContentPlainText === right.documentContentPlainText;

export const createCaseResolverHistorySnapshotEntry = (input: {
  savedAt: string;
  documentContentVersion: number | null | undefined;
  activeDocumentVersion: CaseResolverDocumentHistoryEntry['activeDocumentVersion'] | CaseResolverFileEditDraft['activeDocumentVersion'] | undefined;
  editorType: CaseResolverDocumentHistoryEntry['editorType'] | CaseResolverFileEditDraft['editorType'] | undefined;
  documentContent: string | null | undefined;
  documentContentMarkdown: string | null | undefined;
  documentContentHtml: string | null | undefined;
  documentContentPlainText: string | null | undefined;
}): CaseResolverDocumentHistoryEntry | null => {
  const comparable = toComparableHistoryPayload({
    activeDocumentVersion: input.activeDocumentVersion,
    editorType: input.editorType,
    documentContent: input.documentContent,
    documentContentMarkdown: input.documentContentMarkdown,
    documentContentHtml: input.documentContentHtml,
    documentContentPlainText: input.documentContentPlainText,
  });
  if (!hasMeaningfulComparableHistoryPayload(comparable)) {
    return null;
  }
  return {
    id: createId('case-doc-history'),
    savedAt: input.savedAt,
    documentContentVersion:
      typeof input.documentContentVersion === 'number' && Number.isFinite(input.documentContentVersion)
        ? Math.max(0, Math.trunc(input.documentContentVersion))
        : 0,
    activeDocumentVersion: comparable.activeDocumentVersion,
    editorType: comparable.editorType,
    documentContent: comparable.documentContent,
    documentContentMarkdown: comparable.documentContentMarkdown,
    documentContentHtml: comparable.documentContentHtml,
    documentContentPlainText: comparable.documentContentPlainText,
  };
};

export const prependDraftHistorySnapshotForRevisionLoad = (input: {
  draft: CaseResolverFileEditDraft;
  loadedEntry: CaseResolverDocumentHistoryEntry;
  savedAt: string;
  historyLimit?: number;
}): CaseResolverDocumentHistoryEntry[] | undefined => {
  const { draft, loadedEntry, savedAt } = input;
  const historyLimit =
    typeof input.historyLimit === 'number' && Number.isFinite(input.historyLimit)
      ? Math.max(1, Math.floor(input.historyLimit))
      : 120;

  const currentComparable = toComparableHistoryPayload({
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

  // Loading the same content should not create a redundant snapshot entry.
  if (areComparableHistoryPayloadsEqual(currentComparable, loadedComparable)) {
    return draft.documentHistory;
  }

  const nextSnapshotEntry = createCaseResolverHistorySnapshotEntry({
    savedAt,
    documentContentVersion: draft.documentContentVersion,
    activeDocumentVersion: currentComparable.activeDocumentVersion,
    editorType: currentComparable.editorType,
    documentContent: currentComparable.documentContent,
    documentContentMarkdown: currentComparable.documentContentMarkdown,
    documentContentHtml: currentComparable.documentContentHtml,
    documentContentPlainText: currentComparable.documentContentPlainText,
  });
  if (!nextSnapshotEntry) {
    return draft.documentHistory;
  }

  const existingHistory = draft.documentHistory ?? [];
  const firstEntry = existingHistory[0];
  if (firstEntry) {
    const firstComparable = toComparableHistoryPayload({
      activeDocumentVersion: firstEntry.activeDocumentVersion,
      editorType: firstEntry.editorType,
      documentContent: firstEntry.documentContent,
      documentContentMarkdown: firstEntry.documentContentMarkdown,
      documentContentHtml: firstEntry.documentContentHtml,
      documentContentPlainText: firstEntry.documentContentPlainText,
    });
    const isSameAsFirstEntry =
      areComparableHistoryPayloadsEqual(firstComparable, currentComparable) &&
      firstEntry.documentContentVersion === nextSnapshotEntry.documentContentVersion;
    if (isSameAsFirstEntry) {
      return draft.documentHistory;
    }
  }

  return [nextSnapshotEntry, ...existingHistory].slice(0, historyLimit);
};

export const formatFileSize = (size: number | null): string => {
  if (size === null || !Number.isFinite(size) || size < 0) return 'Unknown';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const toLocalDateLabel = (value: string): string => {
  const normalized = value.trim();
  if (!normalized) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const [year, month, day] = normalized.split('-');
    if (year && month && day) {
      return `${day}.${month}.${year}`;
    }
  }
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = parsed.getFullYear();
  return `${day}.${month}.${year}`;
};

export const buildDocumentPdfMarkup = ({
  documentDate,
  documentPlace,
  addresserLabel,
  addresseeLabel,
  documentContent,
}: {
  documentDate: string;
  documentPlace?: string | null;
  addresserLabel: string;
  addresseeLabel: string;
  documentContent: string;
}): string => {
  const normalizedDocumentDate = toLocalDateLabel(documentDate);
  const normalizedDocumentPlace = (documentPlace ?? '').trim();
  const normalizedDocumentPlaceDate = [normalizedDocumentPlace, normalizedDocumentDate]
    .filter((value): value is string => value.length > 0)
    .join(' ');
  const normalizedAddresser = addresserLabel.trim();
  const normalizedAddressee = addresseeLabel.trim();
  const hasAddresser = normalizedAddresser.length > 0;
  const hasAddressee = normalizedAddressee.length > 0;
  const documentPlaceDateHtml = normalizedDocumentPlaceDate
    ? `<div class="document-date">${escapeHtml(normalizedDocumentPlaceDate)}</div>`
    : '';
  const addresserHtml = hasAddresser
    ? `<article class="meta-card">
          <div class="meta-value">${escapeHtml(normalizedAddresser)}</div>
        </article>`
    : '';
  const addresseeHtml = hasAddressee
    ? `<article class="meta-card meta-card-right">
          <div class="meta-value">${escapeHtml(normalizedAddressee)}</div>
        </article>`
    : '';
  const metaSectionHtml = hasAddresser || hasAddressee
    ? `<section class="meta">
        ${addresserHtml}
        ${addresseeHtml}
      </section>`
    : '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title></title>
    <style>
      @page {
        size: A4;
        /* Zero print margins suppress browser header/footer metadata (title/date/url). */
        margin: 0;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        padding: 0;
      }

      body {
        background: #e8edf3;
        color: #111827;
        font-family: "Times New Roman", Georgia, serif;
      }

      .sheet {
        width: 210mm;
        min-height: 297mm;
        margin: 20px auto;
        background: #ffffff;
        box-shadow: 0 0 0 1px #d1d5db, 0 10px 24px rgba(17, 24, 39, 0.16);
        padding: 16mm;
      }

      .meta {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 18px;
      }

      .document-header {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 14px;
        min-height: 16px;
      }

      .document-date {
        font-size: 12px;
        color: #111827;
      }

      .meta-card {
        padding: 0;
      }

      .meta-card-right {
        margin-left: auto;
        text-align: right;
      }

      .meta-value {
        margin-top: 4px;
        font-size: 14.4px;
        line-height: 1.4;
        color: #111827;
        white-space: pre-line;
      }

      .content {
        font-size: 12pt;
        line-height: 1.5;
      }

      .content p {
        margin: 0 0 0.9em 0;
      }

      .content h1,
      .content h2,
      .content h3,
      .content h4 {
        margin: 0.5em 0 0.35em 0;
        line-height: 1.25;
      }

      .content ul,
      .content ol {
        margin: 0 0 1em 1.4em;
        padding: 0;
      }

      .content blockquote {
        margin: 0 0 1em 0;
        padding-left: 12px;
        border-left: 3px solid #9ca3af;
      }

      .content table {
        border-collapse: collapse;
        width: 100%;
        margin: 0 0 1em 0;
      }

      .content th,
      .content td {
        border: 1px solid #d1d5db;
        padding: 6px 8px;
        text-align: left;
        vertical-align: top;
      }

      .content img {
        max-width: 100%;
        height: auto;
      }

      @media print {
        html,
        body {
          width: 210mm;
          min-height: 297mm;
        }

        body {
          background: #ffffff;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }

        .sheet {
          width: auto;
          min-height: auto;
          margin: 0;
          padding: 14mm;
          box-shadow: none;
        }
      }
    </style>
  </head>
  <body>
    <main class="sheet">
      <header class="document-header">
        ${documentPlaceDateHtml}
      </header>
      ${metaSectionHtml}
      <section class="content">${documentContent}</section>
    </main>
  </body>
</html>`;
};

type CaseResolverFilemakerPartySearchOption = {
  key: string;
  reference: CaseResolverPartyReference;
  label: string;
  details: string;
  searchLabel: string;
  value: string;
};

export const buildCaseResolverFilemakerPartySearchOptions = (
  database: FilemakerDatabase,
  kind: FilemakerPartyKind
): CaseResolverFilemakerPartySearchOption[] => {
  if (kind === 'person') {
    return database.persons
      .map((person: FilemakerPerson): CaseResolverFilemakerPartySearchOption => {
        const label = `${person.firstName} ${person.lastName}`.trim() || person.id;
        const details = buildFilemakerAddressLabel({
          street: person.street,
          streetNumber: person.streetNumber,
          postalCode: person.postalCode,
          city: person.city,
          country: person.country,
        });
        return {
          key: `person:${person.id}`,
          reference: { kind: 'person', id: person.id } as CaseResolverPartyReference,
          label,
          details,
          searchLabel: toNormalizedSearchValue(label, details, person.nip, person.regon, person.id),
          value: encodeFilemakerPartyReference({ kind: 'person', id: person.id }),
        };
      })
      .sort((left, right) => left.label.localeCompare(right.label));
  }

  return database.organizations
    .map((organization: FilemakerOrganization): CaseResolverFilemakerPartySearchOption => {
      const label = organization.name.trim() || organization.id;
      const details = buildFilemakerAddressLabel({
        street: organization.street,
        streetNumber: organization.streetNumber,
        postalCode: organization.postalCode,
        city: organization.city,
        country: organization.country,
      });
      return {
        key: `organization:${organization.id}`,
        reference: { kind: 'organization', id: organization.id } as CaseResolverPartyReference,
        label,
        details,
        searchLabel: toNormalizedSearchValue(label, details, organization.id),
        value: encodeFilemakerPartyReference({ kind: 'organization', id: organization.id }),
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label));
};

const encodeFilemakerPartyReference = (ref: CaseResolverPartyReference | null | undefined): string => {
  if (!ref) return '';
  return `${ref.kind}:${ref.id}`;
};

type CaseResolverTagPickerOption = {
  id: string;
  label: string;
  pathIds: string[];
  pathNames: string[];
  searchLabel: string;
};

export const buildCaseResolverTagPickerOptions = (
  tags: CaseResolverTag[]
): CaseResolverTagPickerOption[] => {
  const byId = new Map<string, CaseResolverTag>(
    tags.map((tag: CaseResolverTag): [string, CaseResolverTag] => [tag.id, tag])
  );
  const cache = new Map<string, { ids: string[]; names: string[] }>();

  const resolvePath = (tagId: string, trail: Set<string>): { ids: string[]; names: string[] } => {
    const cached = cache.get(tagId);
    if (cached) return cached;
    const tag = byId.get(tagId);
    if (!tag) return { ids: [], names: [] };
    if (trail.has(tagId)) {
      const fallback = { ids: [tag.id], names: [tag.label] };
      cache.set(tagId, fallback);
      return fallback;
    }
    if (!tag.parentId || !byId.has(tag.parentId)) {
      const rootPath = { ids: [tag.id], names: [tag.label] };
      cache.set(tagId, rootPath);
      return rootPath;
    }
    const nextTrail = new Set(trail);
    nextTrail.add(tagId);
    const parentPath = resolvePath(tag.parentId, nextTrail);
    const path = {
      ids: [...parentPath.ids, tag.id],
      names: [...parentPath.names, tag.label],
    };    cache.set(tagId, path);
    return path;
  };

  return tags
    .map((tag: CaseResolverTag): CaseResolverTagPickerOption => {
      const path = resolvePath(tag.id, new Set<string>());
      const label = path.names.join(' / ');
      return {
        id: tag.id,
        label,
        pathIds: path.ids,
        pathNames: path.names,
        searchLabel: label.toLowerCase(),
      };
    })
    .sort((left, right) =>
      left.label.localeCompare(right.label)
    );
};

const normalizeDraftDocumentDate = (value: unknown): CaseResolverFileEditDraft['documentDate'] => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const isoDate = typeof record['isoDate'] === 'string' ? record['isoDate'].trim() : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
    return {
      isoDate,
      source: record['source'] === 'metadata' ? 'metadata' : 'text',
      sourceLine:
        typeof record['sourceLine'] === 'string' && record['sourceLine'].trim().length > 0
          ? record['sourceLine'].trim()
          : null,
      cityHint:
        typeof record['cityHint'] === 'string' && record['cityHint'].trim().length > 0
          ? record['cityHint'].trim()
          : null,
      city:
        typeof record['city'] === 'string' && record['city'].trim().length > 0
          ? record['city'].trim()
          : null,
      action:
        record['action'] === 'keepText' || record['action'] === 'ignore'
          ? record['action']
          : 'useDetectedDate',
    };
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    const isoDate = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
      ? trimmed
      : /^\d{4}-\d{2}-\d{2}T/.test(trimmed)
        ? trimmed.slice(0, 10)
        : '';
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

  return null;
};

const normalizeDraftDocumentCity = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const buildFileEditDraft = (file: CaseResolverFile): CaseResolverFileEditDraft => {
  const originalDocumentContent = file.originalDocumentContent ?? file.documentContent;
  const explodedDocumentContent = file.explodedDocumentContent ?? '';
  const requestedVersion: CaseResolverDocumentVersion = file.activeDocumentVersion === 'exploded'
    ? 'exploded'
    : 'original';
  const activeDocumentVersion: CaseResolverDocumentVersion =
    requestedVersion === 'exploded' && explodedDocumentContent.trim().length === 0
      ? 'original'
      : requestedVersion;
  const activeDocumentContent = activeDocumentVersion === 'exploded'
    ? explodedDocumentContent
    : originalDocumentContent;
  const resolvedDraftEditorType: CaseResolverFileEditDraft['editorType'] =
    file.fileType === 'scanfile' ? 'markdown' : 'wysiwyg';
  const resolvedDraftMarkdown = (() => {
    if (
      typeof file.documentContentMarkdown === 'string' &&
      file.documentContentMarkdown.trim().length > 0
    ) {
      return file.documentContentMarkdown;
    }
    if (
      typeof file.documentContentPlainText === 'string' &&
      file.documentContentPlainText.trim().length > 0
    ) {
      return file.documentContentPlainText;
    }
    return activeDocumentContent;
  })();
  const resolvedDraftHtml = (() => {
    if (typeof file.documentContentHtml === 'string' && file.documentContentHtml.trim().length > 0) {
      return file.documentContentHtml;
    }
    if (
      resolvedDraftMarkdown.trim().length > 0
    ) {
      return ensureHtmlForPreview(resolvedDraftMarkdown, 'markdown');
    }
    return ensureSafeDocumentHtml(activeDocumentContent);
  })();
  return {
    id: file.id,
    fileType: file.fileType,
    name: file.name,
    folder: file.folder,
    parentCaseId: file.parentCaseId,
    referenceCaseIds: file.referenceCaseIds,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
    documentDate: normalizeDraftDocumentDate(file.documentDate),
    documentCity: normalizeDraftDocumentCity(file.documentCity),
    isSent: file.isSent === true,
    originalDocumentContent,
    explodedDocumentContent,
    activeDocumentVersion,
    editorType: resolvedDraftEditorType,
    documentContentFormatVersion: file.documentContentFormatVersion,
    documentContentVersion: file.documentContentVersion,
    baseDocumentContentVersion: file.documentContentVersion,
    content: activeDocumentContent,
    documentContent: activeDocumentContent,
    documentContentMarkdown: resolvedDraftMarkdown,
    documentContentHtml: resolvedDraftHtml,
    documentContentPlainText: file.documentContentPlainText,
    documentHistory: file.documentHistory,
    documentConversionWarnings: file.documentConversionWarnings,
    lastContentConversionAt: file.lastContentConversionAt,
    scanSlots: file.scanSlots,
    scanOcrModel: file.scanOcrModel,
    scanOcrPrompt: file.scanOcrPrompt,
    isLocked: file.isLocked,
    graph: file.graph,
    addresser: file.addresser,
    addressee: file.addressee,
    tagId: file.tagId,
    categoryId: file.categoryId,
    caseIdentifierId: file.caseIdentifierId,
  };
};
