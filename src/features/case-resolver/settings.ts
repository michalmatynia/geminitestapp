import {
  deriveDocumentContentSync,
  ensureHtmlForPreview,
  ensureSafeDocumentHtml,
  toStorageDocumentValue,
} from '@/features/document-editor/content-format';
import type {
  CaseResolverDefaultDocumentFormat,
  CaseResolverSettings,
} from '@/shared/contracts/case-resolver';
import {
  type CaseResolverAssetFile,
  type CaseResolverDocumentDateProposal,
  type CaseResolverDocumentFormatVersion,
  type CaseResolverDocumentHistoryEntry,
  type CaseResolverDocumentVersion,
  type CaseResolverEditorType,
  type CaseResolverFile,
  type CaseResolverFileType,
  type CaseResolverFolderRecord,
  type CaseResolverGraph,
  type CaseResolverNodeFileSnapshot,
  type CaseResolverPartyReference,
  type CaseResolverScanSlot,
  type CaseResolverWorkspace,
} from '@/shared/contracts/case-resolver';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import {
  sanitizeCaseResolverGraphNodeFileRelations,
  sanitizeCaseResolverNodeFileAssetSnapshots,
} from './nodefile-relations';
import {
  buildCaseResolverFolderRecords,
  parseCaseResolverFolderRecords,
} from './settings-folder-records';
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

export const CASE_RESOLVER_WORKSPACE_KEY = 'case_resolver_workspace_v1';
export const CASE_RESOLVER_TAGS_KEY = 'case_resolver_tags_v1';
export const CASE_RESOLVER_IDENTIFIERS_KEY = 'case_resolver_identifiers_v1';
export const CASE_RESOLVER_CATEGORIES_KEY = 'case_resolver_categories_v1';
export const CASE_RESOLVER_SETTINGS_KEY = 'case_resolver_settings_v1';
export const CASE_RESOLVER_DEFAULT_DOCUMENT_FORMAT_KEY = 'case_resolver_default_document_format_v1';
export const CASE_RESOLVER_NORMALIZATION_FALLBACK_TIMESTAMP = '1970-01-01T00:00:00.000Z';

export const DEFAULT_CASE_RESOLVER_OCR_PROMPT =
  'Extract all readable text from the attached image and return plain text only. Keep line breaks. Do not add commentary.';
export const DEFAULT_CASE_RESOLVER_SCANFILE_OCR_PROMPT =
  'Extract text from the uploaded document';

export type CaseResolverPartySearchKind = CaseResolverSettings['defaultAddresserPartyKind'];

export const DEFAULT_CASE_RESOLVER_SETTINGS: CaseResolverSettings = {
  ocrModel: '',
  ocrPrompt: DEFAULT_CASE_RESOLVER_OCR_PROMPT,
  defaultDocumentFormat: 'wysiwyg',
  confirmDeleteDocument: true,
  defaultAddresserPartyKind: 'person',
  defaultAddresseePartyKind: 'organization',
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

export const CASE_RESOLVER_PARTY_SEARCH_KIND_OPTIONS: Array<{
  value: CaseResolverPartySearchKind;
  label: string;
  description: string;
}> = [
  {
    value: 'person',
    label: 'Persons',
    description: 'Search and suggest only people.',
  },
  {
    value: 'organization',
    label: 'Organizations',
    description: 'Search and suggest only organizations.',
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

const normalizeCaseResolverRelatedFileLinks = (
  files: CaseResolverFile[]
): CaseResolverFile[] => {
  if (files.length === 0) return files;

  const filesById = new Map<string, CaseResolverFile>(
    files.map((file: CaseResolverFile): [string, CaseResolverFile] => [file.id, file])
  );
  const relationMap = new Map<string, Set<string>>();
  files.forEach((file: CaseResolverFile): void => {
    relationMap.set(file.id, new Set<string>());
  });

  files.forEach((file: CaseResolverFile): void => {
    if (file.fileType === 'case') return;
    const sourceSet = relationMap.get(file.id);
    if (!sourceSet) return;
    (file.relatedFileIds ?? []).forEach((relatedFileId: string): void => {
      const normalizedRelatedFileId = relatedFileId.trim();
      if (!normalizedRelatedFileId || normalizedRelatedFileId === file.id) return;
      const relatedFile = filesById.get(normalizedRelatedFileId);
      if (!relatedFile || relatedFile.fileType === 'case') return;
      sourceSet.add(normalizedRelatedFileId);
    });
  });

  relationMap.forEach((relatedIds: Set<string>, sourceId: string): void => {
    relatedIds.forEach((targetId: string): void => {
      const reciprocal = relationMap.get(targetId);
      if (!reciprocal) return;
      reciprocal.add(sourceId);
    });
  });

  return files.map((file: CaseResolverFile): CaseResolverFile => {
    if (file.fileType === 'case') {
      if (!file.relatedFileIds || file.relatedFileIds.length === 0) return file;
      return {
        ...file,
        relatedFileIds: undefined,
      };
    }

    const normalizedRelatedFileIds = Array.from(relationMap.get(file.id) ?? []).sort(
      (left: string, right: string): number => left.localeCompare(right)
    );
    const currentRelatedFileIds = sanitizeOptionalIdArray(file.relatedFileIds).sort(
      (left: string, right: string): number => left.localeCompare(right)
    );
    const hasSameRelatedFileIds =
      normalizedRelatedFileIds.length === currentRelatedFileIds.length &&
      normalizedRelatedFileIds.every(
        (relatedFileId: string, index: number): boolean =>
          relatedFileId === currentRelatedFileIds[index]
      );
    if (hasSameRelatedFileIds) return file;
    return {
      ...file,
      relatedFileIds:
        normalizedRelatedFileIds.length > 0 ? normalizedRelatedFileIds : undefined,
    };
  });
};

const sanitizeOptionalMimeType = (value: unknown): string | undefined => {
  const normalized = sanitizeOptionalId(value);
  return normalized ? normalized.toLowerCase() : undefined;
};

const normalizeWorkspaceRevision = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  return Math.floor(value);
};

const normalizeDocumentCity = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeIsoDocumentDate = (value: string): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
      return trimmed.slice(0, 10);
    }
  }
  return null;
};

const normalizeDocumentDateAction = (
  value: unknown
): CaseResolverDocumentDateProposal['action'] => {
  if (value === 'useDetectedDate' || value === 'keepText' || value === 'ignore') {
    return value;
  }
  return 'useDetectedDate';
};

const normalizeDocumentDateSource = (
  value: unknown
): CaseResolverDocumentDateProposal['source'] => (value === 'metadata' ? 'metadata' : 'text');

const normalizeDocumentDate = (value: unknown): CaseResolverDocumentDateProposal | null => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const isoDate = normalizeIsoDocumentDate(
      typeof record['isoDate'] === 'string' ? record['isoDate'] : ''
    );
    if (!isoDate) return null;
    const cityHint = normalizeDocumentCity(record['cityHint']);
    const city = normalizeDocumentCity(record['city']);
    return {
      isoDate,
      source: normalizeDocumentDateSource(record['source']),
      sourceLine:
        typeof record['sourceLine'] === 'string' && record['sourceLine'].trim().length > 0
          ? record['sourceLine'].trim()
          : null,
      cityHint,
      city: city ?? cityHint,
      action: normalizeDocumentDateAction(record['action']),
    };
  }

  const isoDate = normalizeIsoDocumentDate(typeof value === 'string' ? value : '');
  if (!isoDate) return null;
  return {
    isoDate,
    source: 'text',
    sourceLine: null,
    cityHint: null,
    city: null,
    action: 'useDetectedDate',
  };
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
): 'original' | 'exploded' => (value === 'exploded' ? 'exploded' : 'original');

const normalizeCaseResolverCaseStatus = (
  value: unknown
): 'pending' | 'completed' => (value === 'completed' ? 'completed' : 'pending');

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
    const resolvedHtmlContent = (() => {
      if (typeof rawHtml === 'string' && rawHtml.trim().length > 0) {
        return rawHtml;
      }
      if (typeof rawMarkdown === 'string' && rawMarkdown.trim().length > 0) {
        return ensureHtmlForPreview(rawMarkdown, 'markdown');
      }
      return ensureSafeDocumentHtml(fallbackContent);
    })();
    const canonical = deriveDocumentContentSync({
      mode: 'wysiwyg',
      value: resolvedHtmlContent,
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

const normalizeCaseResolverScanSlots = (input: unknown, fileId: string): CaseResolverScanSlot[] => {
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
    const rawStatus = typeof record['status'] === 'string' ? record['status'] : '';
    const status = (rawStatus === 'pending' || rawStatus === 'processing' || rawStatus === 'completed' || rawStatus === 'failed') 
      ? rawStatus 
      : 'completed';

    slots.push({
      id: rawId,
      fileId,
      status,
      progress: typeof record['progress'] === 'number' ? record['progress'] : 100,
      name: rawName || `Scan ${slots.length + 1}`,
      filepath: sanitizeOptionalId(record['filepath']),
      sourceFileId: sanitizeOptionalId(record['sourceFileId']),
      mimeType: sanitizeOptionalMimeType(record['mimeType']),
      size:
        typeof record['size'] === 'number' &&
          Number.isFinite(record['size']) &&
          record['size'] >= 0
          ? Math.round(record['size'])
          : undefined,
      ocrText: typeof record['ocrText'] === 'string' ? record['ocrText'] : '',
      ocrError:
        typeof record['ocrError'] === 'string' && record['ocrError'].trim().length > 0
          ? record['ocrError'].trim()
          : null,
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
    return 'wysiwyg';
  }
  return null;
};

const normalizeCaseResolverPartySearchKindValue = (
  input: unknown
): CaseResolverPartySearchKind | null => {
  if (typeof input !== 'string') return null;
  const normalized = input.trim().toLowerCase();
  if (normalized === 'person' || normalized === 'organization') {
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
      const candidate = record['defaultDocumentFormat'] ?? null;
      const parsedFromObject = normalizeCaseResolverDefaultDocumentFormatValue(candidate);
      if (parsedFromObject) return parsedFromObject;
    }
  }

  return fallback;
};

const normalizeCaseResolverSettings = (input: unknown): CaseResolverSettings => {
  if (typeof input === 'string') return DEFAULT_CASE_RESOLVER_SETTINGS;
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
      : null;
  const defaultDocumentFormat =
    normalizeCaseResolverDefaultDocumentFormatValue(rawFormatCandidate) ??
    DEFAULT_CASE_RESOLVER_SETTINGS.defaultDocumentFormat;
  const confirmDeleteDocument = record['confirmDeleteDocument'] !== false;
  const defaultAddresserPartyKind =
    normalizeCaseResolverPartySearchKindValue(record['defaultAddresserPartyKind']) ??
    DEFAULT_CASE_RESOLVER_SETTINGS.defaultAddresserPartyKind;
  const defaultAddresseePartyKind =
    normalizeCaseResolverPartySearchKindValue(record['defaultAddresseePartyKind']) ??
    DEFAULT_CASE_RESOLVER_SETTINGS.defaultAddresseePartyKind;
  return {
    ocrModel,
    ocrPrompt: ocrPrompt || DEFAULT_CASE_RESOLVER_SETTINGS.ocrPrompt,
    defaultDocumentFormat,
    confirmDeleteDocument,
    defaultAddresserPartyKind,
    defaultAddresseePartyKind,
  };
};

export const parseCaseResolverSettings = (raw: string | null | undefined): CaseResolverSettings => {
  return normalizeCaseResolverSettings(parseJsonSetting<unknown>(raw, DEFAULT_CASE_RESOLVER_SETTINGS));
};

export const createCaseResolverFile = (input: {
  id: string;
  workspaceId?: string;
  version?: CaseResolverDocumentVersion;
  fileType?: CaseResolverFileType | null | undefined;
  name: string;
  caseStatus?: 'pending' | 'completed' | null | undefined;
  folder?: string;
  parentCaseId?: string | null | undefined;
  referenceCaseIds?: string[] | null | undefined;
  relatedFileIds?: string[] | null | undefined;
  documentDate?: CaseResolverDocumentDateProposal | string | null | undefined;
  documentCity?: string | null | undefined;
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
  scanOcrModel?: string | null | undefined;
  scanOcrPrompt?: string | null | undefined;
  isSent?: boolean | null | undefined;
  isLocked?: boolean | null | undefined;
  graph?: Partial<CaseResolverGraph> | null;
  addresser?: CaseResolverPartyReference | null | undefined;
  addressee?: CaseResolverPartyReference | null | undefined;
  tagId?: string | null | undefined;
  caseIdentifierId?: string | null | undefined;
  categoryId?: string | null | undefined;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
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
  const fileType = normalizeCaseResolverFileType(input.fileType);
  const caseStatus =
    fileType === 'case' ? normalizeCaseResolverCaseStatus(input.caseStatus) : undefined;
  const resolvedEditorType: CaseResolverEditorType =
    fileType === 'scanfile' ? 'markdown' : 'wysiwyg';
  const resolvedCanonicalSource = (() => {
    if (resolvedEditorType === 'markdown') {
      if (
        typeof input.documentContentMarkdown === 'string' &&
        input.documentContentMarkdown.trim().length > 0
      ) {
        return input.documentContentMarkdown;
      }
      if (
        typeof input.documentContentPlainText === 'string' &&
        input.documentContentPlainText.trim().length > 0
      ) {
        return input.documentContentPlainText;
      }
      return activeDocumentContent;
    }
    if (typeof input.documentContentHtml === 'string' && input.documentContentHtml.trim().length > 0) {
      return input.documentContentHtml;
    }
    if (
      typeof input.documentContentMarkdown === 'string' &&
      input.documentContentMarkdown.trim().length > 0
    ) {
      return ensureHtmlForPreview(input.documentContentMarkdown, 'markdown');
    }
    return ensureSafeDocumentHtml(activeDocumentContent);
  })();
  const canonicalDocument = deriveDocumentContentSync({
    mode: resolvedEditorType,
    value: resolvedCanonicalSource,
    previousHtml: input.documentContentHtml,
    previousMarkdown: input.documentContentMarkdown,
  });
  const documentContent = toStorageDocumentValue(canonicalDocument);
  const editorType: CaseResolverEditorType = resolvedEditorType;
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
  const relatedFileIds = sanitizeOptionalIdArray(input.relatedFileIds).filter(
    (relatedId: string): boolean => relatedId !== input.id
  );
  const scanOcrModel =
    typeof input.scanOcrModel === 'string' ? input.scanOcrModel.trim() : '';
  const scanOcrPrompt =
    typeof input.scanOcrPrompt === 'string' && input.scanOcrPrompt.trim().length > 0
      ? input.scanOcrPrompt.trim()
      : DEFAULT_CASE_RESOLVER_SCANFILE_OCR_PROMPT;
  return {
    id: input.id,
    workspaceId: input.workspaceId ?? 'default',
    version: input.version ?? 'original',
    fileType,
    caseStatus,
    name: input.name.trim() || 'Untitled Case',
    folder: normalizeFolderPath(input.folder ?? ''),
    parentCaseId,
    referenceCaseIds,
    relatedFileIds: relatedFileIds.length > 0 ? relatedFileIds : undefined,
    documentDate: normalizeDocumentDate(input.documentDate),
    documentCity: normalizeDocumentCity(input.documentCity),
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
    scanSlots: normalizeCaseResolverScanSlots(input.scanSlots, input.id),
    scanOcrModel: fileType === 'scanfile' ? scanOcrModel : '',
    scanOcrPrompt: fileType === 'scanfile' ? scanOcrPrompt : '',
    isSent: input.isSent === true,
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
      nodeFileAssetIdByNode: input.graph?.nodeFileAssetIdByNode ?? {},
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
    id: 'empty',
    ownerId: 'system',
    isPublic: false,
    name: 'Default Empty Workspace',
    version: 2,
    workspaceRevision: 0,
    lastMutationId: null,
    lastMutationAt: null,
    folders: [],
    folderRecords: [],
    folderTimestamps: {},
    files: [],
    assets: [],
    relationGraph,
    activeFileId: null,
    createdAt: new Date().toISOString(),
    updatedAt: null,
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
        caseStatus: fileRecord['caseStatus'] as 'pending' | 'completed' | null | undefined,
        folder: file.folder,
        parentCaseId: file.parentCaseId,
        referenceCaseIds: file.referenceCaseIds,
        relatedFileIds: file.relatedFileIds,
        documentDate: file.documentDate,
        documentCity: (fileRecord['documentCity'] as string | null | undefined) ?? null,
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
        scanOcrModel: fileRecord['scanOcrModel'] as string | null | undefined,
        scanOcrPrompt: fileRecord['scanOcrPrompt'] as string | null | undefined,
        isSent: file.isSent,
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
  const validReferenceCaseIds = new Set<string>(caseFilesById.keys());
  const normalizedFilesWithCaseRelations = normalizedFilesBase.map((file: CaseResolverFile): CaseResolverFile => {
    const parentCaseId = resolveSafeCaseParentId(
      file.id,
      file.fileType,
      file.parentCaseId ?? null,
      caseFilesById
    );    const referenceCaseIds = file.referenceCaseIds
      .filter((referenceId: string): boolean => referenceId !== file.id && validReferenceCaseIds.has(referenceId));
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

  const filesWithSanitizedGraph = normalizedFiles.map((file: CaseResolverFile): CaseResolverFile => {
    const sanitizedGraph = sanitizeCaseResolverGraphNodeFileRelations({
      graph: file.graph || { nodes: [], edges: [], nodeMeta: {}, edgeMeta: {} },
      assets,
      files: normalizedFiles,
    });
    if (sanitizedGraph === file.graph) return file;
    return {
      ...file,
      graph: sanitizedGraph,
    };
  });
  const sanitizedAssets = sanitizeCaseResolverNodeFileAssetSnapshots({
    assets,
    files: filesWithSanitizedGraph,
  });

  const sanitizedFiles = filesWithSanitizedGraph.map((file: CaseResolverFile): CaseResolverFile => {
    const sanitizedGraph = sanitizeCaseResolverGraphNodeFileRelations({
      graph: file.graph || { nodes: [], edges: [], nodeMeta: {}, edgeMeta: {} },
      assets: sanitizedAssets,
      files: filesWithSanitizedGraph,
    });
    if (sanitizedGraph === file.graph) return file;
    return {
      ...file,
      graph: sanitizedGraph,
    };
  });
  const normalizedFilesWithRelatedLinks = normalizeCaseResolverRelatedFileLinks(sanitizedFiles);
  const validCaseIds = new Set<string>(
    normalizedFilesWithRelatedLinks
      .filter((file: CaseResolverFile): boolean => file.fileType === 'case')
      .map((file: CaseResolverFile): string => file.id)
  );

  const sourceFolderRecords = parseCaseResolverFolderRecords(
    workspaceRecord['folderRecords'],
    validCaseIds
  );
  const folderRecords = buildCaseResolverFolderRecords({
    sourceRecords: sourceFolderRecords,
    files: normalizedFilesWithRelatedLinks,
    assets: sanitizedAssets,
    validCaseIds,
  });
  const folders = normalizeFolderPaths([
    ...folderRecords.map((record: CaseResolverFolderRecord): string => record.path),
    ...normalizedFilesWithRelatedLinks.map((file: CaseResolverFile): string => file.folder),
    ...sanitizedAssets.map((asset: CaseResolverAssetFile): string => asset.folder),
  ]);
  const folderTimestamps = normalizeCaseResolverFolderTimestamps({
    source: workspaceRecord['folderTimestamps'],
    folders,
    files: normalizedFilesWithRelatedLinks,
    assets: sanitizedAssets,
    fallbackTimestamp: now,
  });
  const relationGraph = buildCaseResolverRelationGraph({
    source: workspaceRecord['relationGraph'],
    folders,
    files: normalizedFilesWithRelatedLinks,
    assets: sanitizedAssets,
  });

  const activeCandidate =
    typeof workspace.activeFileId === 'string' && workspace.activeFileId.trim().length > 0
      ? workspace.activeFileId
      : null;
  const activeFileId =
    activeCandidate &&
    normalizedFilesWithRelatedLinks.some((file: CaseResolverFile) => file.id === activeCandidate)
      ? activeCandidate
      : normalizedFilesWithRelatedLinks[0]?.id ?? null;

  return {
    id: typeof workspaceRecord['id'] === 'string' ? workspaceRecord['id'] : 'default',
    ownerId: typeof workspaceRecord['ownerId'] === 'string' ? workspaceRecord['ownerId'] : 'system',
    isPublic: workspaceRecord['isPublic'] === true,
    name: typeof workspaceRecord['name'] === 'string' ? workspaceRecord['name'] : 'Workspace',
    version: 2,
    workspaceRevision,
    lastMutationId,
    lastMutationAt,
    folders,
    folderRecords,
    folderTimestamps,
    files: normalizedFilesWithRelatedLinks,
    assets: sanitizedAssets,
    relationGraph,
    activeFileId,
    createdAt: normalizeTimestamp(workspaceRecord['createdAt'], now),
    updatedAt: normalizeOptionalTimestamp(workspaceRecord['updatedAt']),
  };};

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

const createEmptyNodeFileSnapshot = (): CaseResolverNodeFileSnapshot => ({
  kind: 'case_resolver_node_file_snapshot_v1',
  source: 'manual',
  nodes: [],
  edges: [],
  nodeMeta: {},
  edgeMeta: {},
  nodeFileMeta: {},
});

export const parseNodeFileSnapshot = (textContent: string): CaseResolverNodeFileSnapshot => {
  try {
    const parsed = JSON.parse(textContent) as unknown;
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      (parsed as Record<string, unknown>)['kind'] === 'case_resolver_node_file_snapshot_v1'
    ) {
      const record = parsed as Record<string, unknown>;
      const parsedNodes = (Array.isArray(record['nodes']) ? record['nodes'] : []) as CaseResolverNodeFileSnapshot['nodes'];
      const parsedEdges = (Array.isArray(record['edges']) ? record['edges'] : []) as CaseResolverNodeFileSnapshot['edges'];
      const parsedNodeFileMeta =
        record['nodeFileMeta'] !== null &&
        typeof record['nodeFileMeta'] === 'object' &&
        !Array.isArray(record['nodeFileMeta'])
          ? (record['nodeFileMeta'] as CaseResolverNodeFileSnapshot['nodeFileMeta'])
          : {};
      const parsedNodeMeta =
        record['nodeMeta'] !== null &&
        typeof record['nodeMeta'] === 'object' &&
        !Array.isArray(record['nodeMeta'])
          ? (record['nodeMeta'] as NonNullable<CaseResolverNodeFileSnapshot['nodeMeta']>)
          : {};
      const parsedEdgeMeta =
        record['edgeMeta'] !== null &&
        typeof record['edgeMeta'] === 'object' &&
        !Array.isArray(record['edgeMeta'])
          ? (record['edgeMeta'] as NonNullable<CaseResolverNodeFileSnapshot['edgeMeta']>)
          : {};
      if (
        parsedNodes.length > 0 ||
        parsedEdges.length > 0 ||
        Object.keys(parsedNodeFileMeta).length > 0 ||
        Object.keys(parsedNodeMeta).length > 0 ||
        Object.keys(parsedEdgeMeta).length > 0
      ) {
        return {
          kind: 'case_resolver_node_file_snapshot_v1',
          source: 'manual',
          nodes: [...parsedNodes],
          edges: [...parsedEdges],
          nodeMeta: { ...parsedNodeMeta },
          edgeMeta: { ...parsedEdgeMeta },
          nodeFileMeta: { ...parsedNodeFileMeta },
        };
      }

      const legacyNode = record['node'];
      const legacyNodeId =
        typeof record['nodeId'] === 'string' && record['nodeId'].trim().length > 0
          ? record['nodeId'].trim()
          : '';
      const legacyNodes: CaseResolverNodeFileSnapshot['nodes'] =
        legacyNode && typeof legacyNode === 'object' && !Array.isArray(legacyNode)
          ? [legacyNode as CaseResolverNodeFileSnapshot['nodes'][number]]
          : [];
      const resolvedLegacyNodeId =
        legacyNodeId ||
        (
          legacyNodes[0] &&
          typeof legacyNodes[0].id === 'string' &&
          legacyNodes[0].id.trim().length > 0
            ? legacyNodes[0].id.trim()
            : ''
        );
      const legacyEdges = (Array.isArray(record['connectedEdges']) ? record['connectedEdges'] : []) as CaseResolverNodeFileSnapshot['edges'];
      const sourceFileId = sanitizeOptionalId(record['sourceFileId']);
      const sourceFileName =
        typeof record['sourceFileName'] === 'string' && record['sourceFileName'].trim().length > 0
          ? record['sourceFileName'].trim()
          : 'Linked document';
      const sourceFileType: 'document' | 'scanfile' =
        record['sourceFileType'] === 'scanfile' ? 'scanfile' : 'document';
      const legacyNodeFileMeta: CaseResolverNodeFileSnapshot['nodeFileMeta'] =
        sourceFileId && resolvedLegacyNodeId
          ? {
            [resolvedLegacyNodeId]: {
              fileId: sourceFileId,
              fileType: sourceFileType,
              fileName: sourceFileName,
            },
          }
          : {};

      return {
        kind: 'case_resolver_node_file_snapshot_v1',
        source: 'manual',
        nodes: [...legacyNodes],
        edges: [...legacyEdges],
        nodeMeta: {},
        edgeMeta: {},
        nodeFileMeta: { ...legacyNodeFileMeta },
      };
    }
  } catch {
    // fall through to empty snapshot
  }
  return createEmptyNodeFileSnapshot();
};

export const serializeNodeFileSnapshot = (snapshot: CaseResolverNodeFileSnapshot): string => {
  return JSON.stringify(snapshot);
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
