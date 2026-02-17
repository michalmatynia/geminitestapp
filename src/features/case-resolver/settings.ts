import {
  deriveDocumentContentSync,
  normalizeRawDocumentModeFromContent,
  toStorageDocumentValue,
  type DocumentPersistenceMode,
} from '@/features/document-editor/content-format';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import { sanitizeGraph } from './settings-graph';
export { createEmptyCaseResolverGraph } from './settings-graph';
import { buildCaseResolverRelationGraph } from './settings-relation-graph';
import {
  createCaseResolverAssetFile,
  normalizeCaseResolverFolderTimestamps,
} from './settings-workspace-helpers';
export {
  createCaseResolverAssetFile,
  getCaseResolverWorkspaceLatestTimestampMs,
  inferCaseResolverAssetKind,
  renameFolderPath,
  resolveCaseResolverUploadFolder,
} from './settings-workspace-helpers';
export {
  createEmptyCaseResolverRelationGraph,
  toCaseResolverRelationAssetFileNodeId,
  toCaseResolverRelationCaseFileNodeId,
  toCaseResolverRelationCaseNodeId,
  toCaseResolverRelationFolderNodeId,
} from './settings-relation-graph';
export {
  buildCaseResolverCategoryTree,
  normalizeCaseResolverCategories,
  normalizeCaseResolverIdentifiers,
  normalizeCaseResolverTags,
  parseCaseResolverCategories,
  parseCaseResolverIdentifiers,
  parseCaseResolverTags,
  type CaseResolverCategoryTreeNode,
} from './settings-taxonomy';
import {
  type CaseResolverAssetFile,
  type CaseResolverDocumentFormatVersion,
  type CaseResolverDocumentHistoryEntry,
  type CaseResolverDocumentVersion,
  type CaseResolverEditorType,
  type CaseResolverFile,
  type CaseResolverFileType,
  type CaseResolverGraph,
  type CaseResolverPartyReference,
  type CaseResolverScanSlot,
  type CaseResolverWorkspace,
} from './types';

export const CASE_RESOLVER_WORKSPACE_KEY = 'case_resolver_workspace_v1';
export const CASE_RESOLVER_TAGS_KEY = 'case_resolver_tags_v1';
export const CASE_RESOLVER_IDENTIFIERS_KEY = 'case_resolver_identifiers_v1';
export const CASE_RESOLVER_CATEGORIES_KEY = 'case_resolver_categories_v1';
export const CASE_RESOLVER_SETTINGS_KEY = 'case_resolver_settings_v1';
export const CASE_RESOLVER_DEFAULT_DOCUMENT_FORMAT_KEY = 'case_resolver_default_document_format_v1';
export const CASE_RESOLVER_NORMALIZATION_FALLBACK_TIMESTAMP = '1970-01-01T00:00:00.000Z';

export type CaseResolverDefaultDocumentFormat = Extract<CaseResolverEditorType, 'markdown' | 'wysiwyg'>;

export const DEFAULT_CASE_RESOLVER_OCR_PROMPT =
  'Extract all readable text from the attached image and return plain text only. Keep line breaks. Do not add commentary.';

export type CaseResolverSettings = {
  ocrModel: string;
  ocrPrompt: string;
  defaultDocumentFormat: CaseResolverDefaultDocumentFormat;
  confirmDeleteDocument: boolean;
};

export const DEFAULT_CASE_RESOLVER_SETTINGS: CaseResolverSettings = {
  ocrModel: '',
  ocrPrompt: DEFAULT_CASE_RESOLVER_OCR_PROMPT,
  defaultDocumentFormat: 'markdown',
  confirmDeleteDocument: true,
};

export const CASE_RESOLVER_DEFAULT_DOCUMENT_FORMAT_OPTIONS: Array<{
  value: CaseResolverDefaultDocumentFormat;
  label: string;
  description: string;
}> = [
  {
    value: 'wysiwyg',
    label: 'WYSIWYG',
    description: 'Open and create documents using rich text editor mode.',
  },
  {
    value: 'markdown',
    label: 'Markdown',
    description: 'Open and create documents using markdown mode.',
  },
];

export const CASE_RESOLVER_CONFIRM_DELETE_OPTIONS: Array<{
  value: 'on' | 'off';
  label: string;
  description: string;
}> = [
  {
    value: 'on',
    label: 'On',
    description: 'Ask for confirmation before deleting a document.',
  },
  {
    value: 'off',
    label: 'Off',
    description: 'Delete documents immediately without confirmation.',
  },
];

export const normalizeFolderPath = (value: string): string => {
  const normalized = value.replace(/\\/g, '/').trim();
  const parts = normalized
    .split('/')
    .map((part: string) => part.trim())
    .filter((part: string) => part && part !== '.' && part !== '..')
    .map((part: string) => part.replace(/[^a-zA-Z0-9-_]/g, '_'))
    .filter(Boolean);
  return parts.join('/');
};

export const expandFolderPath = (value: string): string[] => {
  const normalized = normalizeFolderPath(value);
  if (!normalized) return [];
  const parts = normalized.split('/').filter(Boolean);
  return parts.map((_: string, index: number) => parts.slice(0, index + 1).join('/'));
};

export const normalizeFolderPaths = (folders: string[]): string[] => {
  const set = new Set<string>();
  folders
    .flatMap((folder: string) => expandFolderPath(folder))
    .forEach((folder: string) => {
      if (folder) set.add(folder);
    });
  return Array.from(set).sort((left: string, right: string) => left.localeCompare(right));
};

const normalizeTimestamp = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;

const normalizeOptionalTimestamp = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const sanitizeOptionalId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const sanitizeOptionalIdArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();
  value.forEach((entry: unknown): void => {
    if (typeof entry !== 'string') return;
    const normalized = entry.trim();
    if (!normalized) return;
    unique.add(normalized);
  });
  return Array.from(unique);
};

const sanitizeOptionalMimeType = (value: unknown): string | null => {
  const normalized = sanitizeOptionalId(value);
  return normalized ? normalized.toLowerCase() : null;
};

const normalizeWorkspaceRevision = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  return Math.floor(value);
};

const normalizeDocumentDate = (value: unknown): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
      return trimmed.slice(0, 10);
    }
  }
  return '';
};

const CASE_RESOLVER_DATE_LABEL_REGEX = /\b(date|document\s*date|data|data\s*dokumentu)\b/i;
const CASE_RESOLVER_YMD_DATE_REGEX = /\b((?:19|20)\d{2})[.\-/](0?[1-9]|1[0-2])[.\-/](0?[1-9]|[12]\d|3[01])\b/g;
const CASE_RESOLVER_DMY_DATE_REGEX = /\b(0?[1-9]|[12]\d|3[01])[.-](0?[1-9]|1[0-2])[.-]((?:19|20)\d{2})\b/g;
const CASE_RESOLVER_MDY_DATE_REGEX = /\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/((?:19|20)\d{2})\b/g;

const toIsoDocumentDate = (year: number, month: number, day: number): string | null => {
  if (year < 1900 || year > 2099) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const findFirstDateMatch = (source: string): string | null => {
  const text = source.trim();
  if (!text) return null;
  let firstIndex = Number.POSITIVE_INFINITY;
  let firstValue: string | null = null;
  const registerMatch = (index: number, value: string | null): void => {
    if (!value) return;
    if (index >= firstIndex) return;
    firstIndex = index;
    firstValue = value;
  };

  CASE_RESOLVER_YMD_DATE_REGEX.lastIndex = 0;
  let match = CASE_RESOLVER_YMD_DATE_REGEX.exec(text);
  while (match) {
    registerMatch(
      match.index,
      toIsoDocumentDate(
        Number(match[1]),
        Number(match[2]),
        Number(match[3])
      )
    );
    match = CASE_RESOLVER_YMD_DATE_REGEX.exec(text);
  }

  CASE_RESOLVER_DMY_DATE_REGEX.lastIndex = 0;
  match = CASE_RESOLVER_DMY_DATE_REGEX.exec(text);
  while (match) {
    registerMatch(
      match.index,
      toIsoDocumentDate(
        Number(match[3]),
        Number(match[2]),
        Number(match[1])
      )
    );
    match = CASE_RESOLVER_DMY_DATE_REGEX.exec(text);
  }

  CASE_RESOLVER_MDY_DATE_REGEX.lastIndex = 0;
  match = CASE_RESOLVER_MDY_DATE_REGEX.exec(text);
  while (match) {
    registerMatch(
      match.index,
      toIsoDocumentDate(
        Number(match[3]),
        Number(match[1]),
        Number(match[2])
      )
    );
    match = CASE_RESOLVER_MDY_DATE_REGEX.exec(text);
  }

  return firstValue;
};

export const extractCaseResolverDocumentDate = (source: string): string | null => {
  const normalized = source.trim();
  if (!normalized) return null;
  const text = normalized.replace(/<[^>]*>/g, ' ');
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!CASE_RESOLVER_DATE_LABEL_REGEX.test(line)) continue;
    const labeledMatch = findFirstDateMatch(line);
    if (labeledMatch) return labeledMatch;
  }
  return findFirstDateMatch(text);
};

const sanitizePartyReference = (value: unknown): CaseResolverPartyReference | null => {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const kindRaw = typeof record['kind'] === 'string' ? record['kind'].trim() : '';
  const id = typeof record['id'] === 'string' ? record['id'].trim() : '';
  if (!id) return null;
  if (kindRaw !== 'person' && kindRaw !== 'organization') return null;
  const kind: CaseResolverPartyReference['kind'] = kindRaw;
  return {
    kind,
    id,
  };
};

const normalizeCaseResolverFileType = (value: unknown): CaseResolverFileType => {
  if (value === 'case' || value === 'document' || value === 'scanfile') {
    return value;
  }
  return 'document';
};

const normalizeCaseResolverDocumentVersion = (
  value: unknown
): CaseResolverDocumentVersion => (value === 'exploded' ? 'exploded' : 'original');

const normalizeDocumentContentVersion = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1;
  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : 1;
};

const normalizeDocumentFormatVersion = (value: unknown): CaseResolverDocumentFormatVersion => {
  if (value === 1) return 1;
  return 1;
};

const CASE_RESOLVER_DOCUMENT_HISTORY_LIMIT = 120;

const normalizeCaseResolverDocumentHistory = (
  input: unknown,
  fallbackTimestamp: string
): CaseResolverDocumentHistoryEntry[] => {
  if (!Array.isArray(input)) return [];

  const seen = new Set<string>();
  const entries: CaseResolverDocumentHistoryEntry[] = [];

  input.forEach((entry: unknown, index: number): void => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
    const record = entry as Record<string, unknown>;

    const rawId =
      typeof record['id'] === 'string' && record['id'].trim().length > 0
        ? record['id'].trim()
        : `doc-history-${index + 1}`;
    if (seen.has(rawId)) return;
    seen.add(rawId);

    const fallbackContent =
      typeof record['documentContent'] === 'string' ? record['documentContent'] : '';
    const rawEditorType =
      typeof record['editorType'] === 'string' ? record['editorType'] : undefined;
    const rawMarkdown =
      typeof record['documentContentMarkdown'] === 'string'
        ? record['documentContentMarkdown']
        : undefined;
    const rawHtml =
      typeof record['documentContentHtml'] === 'string'
        ? record['documentContentHtml']
        : undefined;
    const activeDocumentVersion = normalizeCaseResolverDocumentVersion(
      record['activeDocumentVersion']
    );
    const resolvedMode: DocumentPersistenceMode = normalizeRawDocumentModeFromContent({
      mode: rawEditorType,
      rawContent: fallbackContent,
      rawMarkdown,
      rawHtml,
    });
    const canonical = deriveDocumentContentSync({
      mode: resolvedMode,
      value:
        resolvedMode === 'wysiwyg'
          ? (typeof record['documentContentHtml'] === 'string'
            ? record['documentContentHtml']
            : fallbackContent)
          : (typeof record['documentContentMarkdown'] === 'string'
            ? record['documentContentMarkdown']
            : fallbackContent),
      previousHtml: rawHtml,
      previousMarkdown: rawMarkdown,
    });

    entries.push({
      id: rawId,
      savedAt: normalizeTimestamp(record['savedAt'], fallbackTimestamp),
      documentContentVersion: normalizeDocumentContentVersion(record['documentContentVersion']),
      activeDocumentVersion,
      editorType: canonical.mode,
      documentContent: toStorageDocumentValue(canonical),
      documentContentMarkdown: canonical.markdown,
      documentContentHtml: canonical.html,
      documentContentPlainText: canonical.plainText,
    });
  });

  return entries
    .sort((left: CaseResolverDocumentHistoryEntry, right: CaseResolverDocumentHistoryEntry) => {
      const rightTimestamp = Date.parse(right.savedAt);
      const leftTimestamp = Date.parse(left.savedAt);
      if (Number.isFinite(rightTimestamp) && Number.isFinite(leftTimestamp) && rightTimestamp !== leftTimestamp) {
        return rightTimestamp - leftTimestamp;
      }
      return right.documentContentVersion - left.documentContentVersion;
    })
    .slice(0, CASE_RESOLVER_DOCUMENT_HISTORY_LIMIT);
};

const resolveSafeCaseParentId = (
  caseId: string,
  caseType: CaseResolverFileType,
  parentCaseId: string | null,
  caseMap: Map<string, CaseResolverFile>
): string | null => {
  if (!parentCaseId || parentCaseId === caseId) return null;
  const parentCase = caseMap.get(parentCaseId);
  if (parentCase?.fileType !== 'case') return null;
  if (caseType !== 'case') return parentCaseId;
  let current: string | null = parentCaseId;
  const visited = new Set<string>();
  while (current) {
    if (current === caseId || visited.has(current)) return null;
    visited.add(current);
    const parent = caseMap.get(current);
    if (parent?.fileType !== 'case') return null;
    current = parent.parentCaseId ?? null;
  }
  return parentCaseId;
};

const normalizeCaseResolverScanSlots = (input: unknown): CaseResolverScanSlot[] => {
  if (!Array.isArray(input)) return [];

  const seen = new Set<string>();
  const slots: CaseResolverScanSlot[] = [];

  input.forEach((entry: unknown, index: number): void => {
    if (!entry || typeof entry !== 'object') return;
    const record = entry as Record<string, unknown>;

    const rawId =
      typeof record['id'] === 'string' && record['id'].trim().length > 0
        ? record['id'].trim()
        : `scan-slot-${index + 1}`;
    if (seen.has(rawId)) return;
    seen.add(rawId);

    const rawName = typeof record['name'] === 'string' ? record['name'].trim() : '';
    slots.push({
      id: rawId,
      name: rawName || `Scan ${slots.length + 1}`,
      filepath: sanitizeOptionalId(record['filepath']),
      sourceFileId: sanitizeOptionalId(record['sourceFileId']),
      mimeType: sanitizeOptionalMimeType(record['mimeType']),
      size:
        typeof record['size'] === 'number' &&
          Number.isFinite(record['size']) &&
          record['size'] >= 0
          ? Math.round(record['size'])
          : null,
      ocrText: typeof record['ocrText'] === 'string' ? record['ocrText'] : '',
    });
  });

  return slots;
};

const normalizeCaseResolverDefaultDocumentFormatValue = (
  input: unknown
): CaseResolverDefaultDocumentFormat | null => {
  if (typeof input !== 'string') return null;
  const normalized = input.trim().toLowerCase();
  if (normalized === 'wysiwyg' || normalized === 'markdown') {
    return normalized;
  }
  return null;
};

export const parseCaseResolverDefaultDocumentFormat = (
  raw: string | null | undefined,
  fallback: CaseResolverDefaultDocumentFormat = DEFAULT_CASE_RESOLVER_SETTINGS.defaultDocumentFormat
): CaseResolverDefaultDocumentFormat => {
  const direct = normalizeCaseResolverDefaultDocumentFormatValue(raw);
  if (direct) return direct;

  if (typeof raw === 'string') {
    const parsed = parseJsonSetting<unknown>(raw, null);
    const parsedDirect = normalizeCaseResolverDefaultDocumentFormatValue(parsed);
    if (parsedDirect) return parsedDirect;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>;
      const candidate =
        record['defaultDocumentFormat'] ??
        record['defaultDocumentEditorType'] ??
        record['editorType'] ??
        null;
      const parsedFromObject = normalizeCaseResolverDefaultDocumentFormatValue(candidate);
      if (parsedFromObject) return parsedFromObject;
    }
  }

  return fallback;
};

const normalizeCaseResolverSettings = (input: unknown): CaseResolverSettings => {
  if (typeof input === 'string') {
    const defaultDocumentFormat = normalizeCaseResolverDefaultDocumentFormatValue(input);
    if (defaultDocumentFormat) {
      return {
        ...DEFAULT_CASE_RESOLVER_SETTINGS,
        defaultDocumentFormat,
      };
    }
    return DEFAULT_CASE_RESOLVER_SETTINGS;
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return DEFAULT_CASE_RESOLVER_SETTINGS;
  }
  const record = input as Record<string, unknown>;
  const ocrModel = typeof record['ocrModel'] === 'string' ? record['ocrModel'].trim() : '';
  const ocrPrompt = typeof record['ocrPrompt'] === 'string'
    ? record['ocrPrompt'].trim()
    : '';
  const rawFormatCandidate =
    typeof record['defaultDocumentFormat'] === 'string'
      ? record['defaultDocumentFormat']
      : typeof record['defaultDocumentEditorType'] === 'string'
        ? record['defaultDocumentEditorType']
        : typeof record['editorType'] === 'string'
          ? record['editorType']
          : null;
  const defaultDocumentFormat =
    normalizeCaseResolverDefaultDocumentFormatValue(rawFormatCandidate) ??
    DEFAULT_CASE_RESOLVER_SETTINGS.defaultDocumentFormat;
  const confirmDeleteDocument = record['confirmDeleteDocument'] !== false;
  return {
    ocrModel,
    ocrPrompt: ocrPrompt || DEFAULT_CASE_RESOLVER_SETTINGS.ocrPrompt,
    defaultDocumentFormat,
    confirmDeleteDocument,
  };
};

export const parseCaseResolverSettings = (raw: string | null | undefined): CaseResolverSettings => {
  const parsedDefaultDocumentFormat = normalizeCaseResolverDefaultDocumentFormatValue(raw);
  if (parsedDefaultDocumentFormat) {
    return {
      ...DEFAULT_CASE_RESOLVER_SETTINGS,
      defaultDocumentFormat: parsedDefaultDocumentFormat,
    };
  }
  return normalizeCaseResolverSettings(parseJsonSetting<unknown>(raw, DEFAULT_CASE_RESOLVER_SETTINGS));
};

export const createCaseResolverFile = (input: {
  id: string;
  fileType?: CaseResolverFileType | null | undefined;
  name: string;
  folder?: string;
  parentCaseId?: string | null | undefined;
  referenceCaseIds?: string[] | null | undefined;
  documentDate?: string | null | undefined;
  originalDocumentContent?: string | null | undefined;
  explodedDocumentContent?: string | null | undefined;
  activeDocumentVersion?: CaseResolverDocumentVersion | null | undefined;
  documentContent?: string | null | undefined;
  editorType?: CaseResolverEditorType | null | undefined;
  documentContentFormatVersion?: CaseResolverDocumentFormatVersion | number | null | undefined;
  documentContentVersion?: number | null | undefined;
  documentContentMarkdown?: string | null | undefined;
  documentContentHtml?: string | null | undefined;
  documentContentPlainText?: string | null | undefined;
  documentHistory?: CaseResolverDocumentHistoryEntry[] | null | undefined;
  documentConversionWarnings?: string[] | null | undefined;
  lastContentConversionAt?: string | null | undefined;
  scanSlots?: CaseResolverScanSlot[] | null | undefined;
  isLocked?: boolean | null | undefined;
  graph?: Partial<CaseResolverGraph> | null;
  addresser?: CaseResolverPartyReference | null | undefined;
  addressee?: CaseResolverPartyReference | null | undefined;
  tagId?: string | null | undefined;
  caseIdentifierId?: string | null | undefined;
  categoryId?: string | null | undefined;
  createdAt?: string;
  updatedAt?: string;
}): CaseResolverFile => {
  const now = new Date().toISOString();
  const createdAt = normalizeTimestamp(input.createdAt, now);
  const updatedAt = normalizeTimestamp(input.updatedAt, createdAt);
  const fallbackDocumentContent =
    typeof input.documentContent === 'string' ? input.documentContent : '';
  const originalDocumentContent =
    typeof input.originalDocumentContent === 'string'
      ? input.originalDocumentContent
      : fallbackDocumentContent;
  const explodedDocumentContent =
    typeof input.explodedDocumentContent === 'string' ? input.explodedDocumentContent : '';
  const requestedVersion = normalizeCaseResolverDocumentVersion(input.activeDocumentVersion);
  const activeDocumentVersion: CaseResolverDocumentVersion =
    requestedVersion === 'exploded' && explodedDocumentContent.trim().length === 0
      ? 'original'
      : requestedVersion;
  const activeDocumentContent =
    activeDocumentVersion === 'exploded' ? explodedDocumentContent : originalDocumentContent;
  const resolvedMode: DocumentPersistenceMode = normalizeRawDocumentModeFromContent({
    mode: input.editorType,
    rawContent: activeDocumentContent,
    rawMarkdown: input.documentContentMarkdown,
    rawHtml: input.documentContentHtml,
  });
  const canonicalDocument = deriveDocumentContentSync({
    mode: resolvedMode,
    value:
      resolvedMode === 'wysiwyg'
        ? (typeof input.documentContentHtml === 'string' && input.documentContentHtml.trim().length > 0
          ? input.documentContentHtml
          : activeDocumentContent)
        : (typeof input.documentContentMarkdown === 'string' && input.documentContentMarkdown.trim().length > 0
          ? input.documentContentMarkdown
          : activeDocumentContent),
    previousHtml: input.documentContentHtml,
    previousMarkdown: input.documentContentMarkdown,
  });
  const documentContent = toStorageDocumentValue(canonicalDocument);
  const editorType: CaseResolverEditorType = canonicalDocument.mode;
  const documentContentFormatVersion = normalizeDocumentFormatVersion(input.documentContentFormatVersion);
  const documentContentVersion = normalizeDocumentContentVersion(input.documentContentVersion);
  const documentConversionWarnings = Array.isArray(input.documentConversionWarnings)
    ? input.documentConversionWarnings
      .filter((entry: string | unknown): entry is string => typeof entry === 'string')
      .map((entry: string) => entry.trim())
      .filter((entry: string) => entry.length > 0)
    : canonicalDocument.warnings;
  const lastContentConversionAt = normalizeTimestamp(
    input.lastContentConversionAt,
    updatedAt
  );
  const parentCaseId = sanitizeOptionalId(input.parentCaseId);
  const referenceCaseIds = sanitizeOptionalIdArray(input.referenceCaseIds).filter(
    (referenceId: string): boolean => referenceId !== input.id
  );
  return {
    id: input.id,
    fileType: normalizeCaseResolverFileType(input.fileType),
    name: input.name.trim() || 'Untitled Case',
    folder: normalizeFolderPath(input.folder ?? ''),
    parentCaseId,
    referenceCaseIds,
    documentDate: normalizeDocumentDate(input.documentDate),
    originalDocumentContent,
    explodedDocumentContent,
    activeDocumentVersion,
    editorType,
    documentContentFormatVersion,
    documentContentVersion,
    documentContent,
    documentContentMarkdown: canonicalDocument.markdown,
    documentContentHtml: canonicalDocument.html,
    documentContentPlainText: canonicalDocument.plainText,
    documentHistory: normalizeCaseResolverDocumentHistory(input.documentHistory, updatedAt),
    documentConversionWarnings,
    lastContentConversionAt,
    scanSlots: normalizeCaseResolverScanSlots(input.scanSlots),
    isLocked: input.isLocked === true,
    addresser: sanitizePartyReference(input.addresser),
    addressee: sanitizePartyReference(input.addressee),
    tagId: sanitizeOptionalId(input.tagId),
    caseIdentifierId: sanitizeOptionalId(input.caseIdentifierId),
    categoryId: sanitizeOptionalId(input.categoryId),
    createdAt,
    updatedAt,
    graph: sanitizeGraph({
      nodes: input.graph?.nodes ?? [],
      edges: input.graph?.edges ?? [],
      nodeMeta: input.graph?.nodeMeta ?? {},
      edgeMeta: input.graph?.edgeMeta ?? {},
      pdfExtractionPresetId: input.graph?.pdfExtractionPresetId,
      documentFileLinksByNode: input.graph?.documentFileLinksByNode ?? {},
      documentDropNodeId: input.graph?.documentDropNodeId ?? null,
      documentSourceFileIdByNode: input.graph?.documentSourceFileIdByNode ?? {},
    }),
  };
};

export const createDefaultCaseResolverWorkspace = (): CaseResolverWorkspace => {
  const relationGraph = buildCaseResolverRelationGraph({
    source: null,
    folders: [],
    files: [],
    assets: [],
  });
  return {
    version: 2,
    workspaceRevision: 0,
    lastMutationId: null,
    lastMutationAt: null,
    folders: [],
    folderTimestamps: {},
    files: [],
    assets: [],
    relationGraph,
    activeFileId: null,
  };
};

export const normalizeCaseResolverWorkspace = (
  workspace: CaseResolverWorkspace | null | undefined
): CaseResolverWorkspace => {
  if (!workspace || typeof workspace !== 'object') {
    return createDefaultCaseResolverWorkspace();
  }
  const workspaceRecord = workspace as unknown as Record<string, unknown>;
  const now = new Date().toISOString();
  const workspaceRevision = normalizeWorkspaceRevision(workspaceRecord['workspaceRevision']);
  const lastMutationId = sanitizeOptionalId(workspaceRecord['lastMutationId']);
  const lastMutationAt = normalizeOptionalTimestamp(workspaceRecord['lastMutationAt']);

  const rawFiles = Array.isArray(workspace.files) ? workspace.files : [];
  const rawChildParentIds = new Set<string>();
  rawFiles.forEach((entry: unknown): void => {
    if (!entry || typeof entry !== 'object') return;
    const entryRecord = entry as Record<string, unknown>;
    const parentCaseId = sanitizeOptionalId(entryRecord['parentCaseId']);
    if (parentCaseId) {
      rawChildParentIds.add(parentCaseId);
    }
  });
  const fileIds = new Set<string>();
  const files = rawFiles
    .filter((file): file is CaseResolverFile => Boolean(file) && typeof file === 'object')
    .map((file: CaseResolverFile): CaseResolverFile | null => {
      const id = typeof file.id === 'string' && file.id.trim() ? file.id : '';
      if (!id || fileIds.has(id)) {
        return null;
      }
      fileIds.add(id);
      const fileRecord = file as unknown as Record<string, unknown>;
      const rawFileType = fileRecord['fileType'];
      const normalizedRawFileType = normalizeCaseResolverFileType(rawFileType);
      const shouldForceCaseType =
        fileRecord['isCaseContainer'] === true || rawChildParentIds.has(id);
      const normalizedFileType: CaseResolverFileType =
        shouldForceCaseType && normalizedRawFileType !== 'scanfile'
          ? 'case'
          : normalizedRawFileType;
      const normalizedCreatedAt = normalizeTimestamp(
        file.createdAt,
        CASE_RESOLVER_NORMALIZATION_FALLBACK_TIMESTAMP
      );
      const normalizedUpdatedAt = normalizeTimestamp(file.updatedAt, normalizedCreatedAt);
      return createCaseResolverFile({
        id,
        fileType: normalizedFileType,
        name: file.name,
        folder: file.folder,
        parentCaseId: file.parentCaseId,
        referenceCaseIds: file.referenceCaseIds,
        documentDate: file.documentDate,
        originalDocumentContent: file.originalDocumentContent,
        explodedDocumentContent: file.explodedDocumentContent,
        activeDocumentVersion: file.activeDocumentVersion,
        documentContent: file.documentContent,
        editorType: file.editorType,
        documentContentFormatVersion: file.documentContentFormatVersion,
        documentContentVersion: file.documentContentVersion,
        documentContentMarkdown: file.documentContentMarkdown,
        documentContentHtml: file.documentContentHtml,
        documentContentPlainText: file.documentContentPlainText,
        documentHistory: fileRecord['documentHistory'] as CaseResolverDocumentHistoryEntry[] | null | undefined,
        documentConversionWarnings: file.documentConversionWarnings,
        lastContentConversionAt: file.lastContentConversionAt,
        scanSlots: file.scanSlots,
        isLocked: file.isLocked,
        graph: file.graph,
        addresser: file.addresser,
        addressee: file.addressee,
        tagId: file.tagId,
        caseIdentifierId: file.caseIdentifierId,
        categoryId: file.categoryId,
        createdAt: normalizedCreatedAt,
        updatedAt: normalizedUpdatedAt,
      });
    })
    .filter((file: CaseResolverFile | null): file is CaseResolverFile => Boolean(file));

  const normalizedFilesBase = files;
  const caseFilesById = new Map<string, CaseResolverFile>(
    normalizedFilesBase
      .filter((file: CaseResolverFile): boolean => file.fileType === 'case')
      .map((file: CaseResolverFile): [string, CaseResolverFile] => [file.id, file])
  );
  const validCaseIds = new Set<string>(caseFilesById.keys());
  const normalizedFilesWithCaseRelations = normalizedFilesBase.map((file: CaseResolverFile): CaseResolverFile => {
    const parentCaseId = resolveSafeCaseParentId(
      file.id,
      file.fileType,
      file.parentCaseId,
      caseFilesById
    );
    const referenceCaseIds = file.referenceCaseIds
      .filter((referenceId: string): boolean => referenceId !== file.id && validCaseIds.has(referenceId));
    const uniqueReferenceCaseIds = Array.from(new Set(referenceCaseIds));
    return {
      ...file,
      parentCaseId,
      referenceCaseIds: uniqueReferenceCaseIds,
    };
  });
  const normalizedFilesWithoutOrphans =
    caseFilesById.size > 0
      ? normalizedFilesWithCaseRelations.filter(
        (file: CaseResolverFile): boolean =>
          file.fileType === 'case' || Boolean(file.parentCaseId)
      )
      : normalizedFilesWithCaseRelations;
  const normalizedFileIds = new Set<string>(
    normalizedFilesWithoutOrphans.map((file: CaseResolverFile): string => file.id)
  );
  const removedFileIds = new Set<string>(
    normalizedFilesWithCaseRelations
      .filter((file: CaseResolverFile): boolean =>
        !normalizedFileIds.has(file.id)
      )
      .map((file: CaseResolverFile): string => file.id)
  );
  const normalizedFiles =
    removedFileIds.size > 0
      ? normalizedFilesWithoutOrphans.map((file: CaseResolverFile): CaseResolverFile => {
        if (file.fileType !== 'case') return file;
        const nextReferenceCaseIds = file.referenceCaseIds.filter(
          (referenceCaseId: string): boolean => !removedFileIds.has(referenceCaseId)
        );
        if (nextReferenceCaseIds.length === file.referenceCaseIds.length) return file;
        return {
          ...file,
          referenceCaseIds: nextReferenceCaseIds,
        };
      })
      : normalizedFilesWithoutOrphans;
  const rawAssets = Array.isArray(workspaceRecord['assets'])
    ? (workspaceRecord['assets'] as CaseResolverAssetFile[])
    : [];
  const assetIds = new Set<string>();
  const assets = rawAssets
    .filter((asset): asset is CaseResolverAssetFile => Boolean(asset) && typeof asset === 'object')
    .map((asset: CaseResolverAssetFile): CaseResolverAssetFile | null => {
      const id = typeof asset.id === 'string' && asset.id.trim() ? asset.id : '';
      if (!id || assetIds.has(id)) {
        return null;
      }
      assetIds.add(id);
      const normalizedCreatedAt = normalizeTimestamp(
        asset.createdAt,
        CASE_RESOLVER_NORMALIZATION_FALLBACK_TIMESTAMP
      );
      const normalizedUpdatedAt = normalizeTimestamp(asset.updatedAt, normalizedCreatedAt);
      return createCaseResolverAssetFile({
        id,
        name: asset.name,
        folder: asset.folder,
        kind: asset.kind,
        filepath: asset.filepath,
        sourceFileId: asset.sourceFileId,
        mimeType: asset.mimeType,
        size: asset.size,
        textContent: asset.textContent,
        description: asset.description,
        createdAt: normalizedCreatedAt,
        updatedAt: normalizedUpdatedAt,
      });
    })
    .filter((asset: CaseResolverAssetFile | null): asset is CaseResolverAssetFile => Boolean(asset));

  const folderCandidates = [
    ...(Array.isArray(workspace.folders) ? workspace.folders : []),
    ...normalizedFiles.map((file: CaseResolverFile) => file.folder),
    ...assets.map((asset: CaseResolverAssetFile) => asset.folder),
  ];
  const folders = normalizeFolderPaths(folderCandidates);
  const folderTimestamps = normalizeCaseResolverFolderTimestamps({
    source: workspaceRecord['folderTimestamps'],
    folders,
    files: normalizedFiles,
    assets,
    fallbackTimestamp: now,
  });
  const relationGraph = buildCaseResolverRelationGraph({
    source: workspaceRecord['relationGraph'],
    folders,
    files: normalizedFiles,
    assets,
  });

  const activeCandidate =
    typeof workspace.activeFileId === 'string' && workspace.activeFileId.trim().length > 0
      ? workspace.activeFileId
      : null;
  const activeFileId =
    activeCandidate && normalizedFiles.some((file: CaseResolverFile) => file.id === activeCandidate)
      ? activeCandidate
      : normalizedFiles[0]?.id ?? null;

  return {
    version: 2,
    workspaceRevision,
    lastMutationId,
    lastMutationAt,
    folders,
    folderTimestamps,
    files: normalizedFiles,
    assets,
    relationGraph,
    activeFileId,
  };
};

export const parseCaseResolverWorkspace = (
  raw: string | null | undefined
): CaseResolverWorkspace => {
  const parsed = parseJsonSetting<CaseResolverWorkspace | null>(raw, null);
  return normalizeCaseResolverWorkspace(parsed);
};

export const hasCaseResolverWorkspaceFilesArray = (
  raw: string | null | undefined
): boolean => {
  if (typeof raw !== 'string' || raw.trim().length === 0) return false;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
    const record = parsed as Record<string, unknown>;
    return Array.isArray(record['files']);
  } catch {
    return false;
  }
};

export const upsertFileGraph = (
  workspace: CaseResolverWorkspace,
  fileId: string,
  graph: CaseResolverGraph
): CaseResolverWorkspace => {
  const nextFiles = workspace.files.map((file: CaseResolverFile): CaseResolverFile => {
    if (file.id !== fileId) return file;
    return {
      ...file,
      graph: sanitizeGraph(graph),
      updatedAt: new Date().toISOString(),
    };
  });

  return normalizeCaseResolverWorkspace({
    ...workspace,
    files: nextFiles,
  });
};
