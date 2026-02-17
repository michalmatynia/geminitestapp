import { typeStyles, type AiNode, type Edge } from '@/features/ai/ai-paths/lib';
import {
  deriveDocumentContentSync,
  normalizeRawDocumentModeFromContent,
  toStorageDocumentValue,
  type DocumentPersistenceMode,
} from '@/features/document-editor/content-format';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import {
  CASE_RESOLVER_RELATION_ROOT_FOLDER_ID,
  CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS,
  CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS,
  DEFAULT_CASE_RESOLVER_PDF_EXTRACTION_PRESET_ID,
  DEFAULT_CASE_RESOLVER_RELATION_EDGE_META,
  DEFAULT_CASE_RESOLVER_RELATION_NODE_META,
  DEFAULT_CASE_RESOLVER_EDGE_META,
  DEFAULT_CASE_RESOLVER_NODE_META,
  type CaseResolverAssetFile,
  type CaseResolverAssetKind,
  type CaseResolverCategory,
  type CaseResolverDocumentFormatVersion,
  type CaseResolverDocumentHistoryEntry,
  type CaseResolverIdentifier,
  type CaseResolverDocumentVersion,
  type CaseResolverEdgeMeta,
  type CaseResolverEditorType,
  type CaseResolverFile,
  type CaseResolverFileType,
  type CaseResolverFolderTimestamp,
  type CaseResolverGraph,
  type CaseResolverRelationEdgeKind,
  type CaseResolverRelationEdgeMeta,
  type CaseResolverRelationEntityType,
  type CaseResolverRelationFileKind,
  type CaseResolverRelationGraph,
  type CaseResolverRelationNodeMeta,
  type CaseResolverNodeMeta,
  type CaseResolverPartyReference,
  type CaseResolverScanSlot,
  type CaseResolverTag,
  type CaseResolverPdfExtractionPresetId,
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

const toTimestampMs = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
};

const pickEarliestTimestamp = (
  values: Array<string | null | undefined>,
  fallback: string
): string => {
  let best = fallback;
  let bestMs = toTimestampMs(fallback);
  values.forEach((value: string | null | undefined): void => {
    if (typeof value !== 'string') return;
    const valueMs = toTimestampMs(value);
    if (valueMs === null) return;
    if (bestMs === null || valueMs < bestMs) {
      best = value;
      bestMs = valueMs;
    }
  });
  return best;
};

const pickLatestTimestamp = (
  values: Array<string | null | undefined>,
  fallback: string
): string => {
  let best = fallback;
  let bestMs = toTimestampMs(fallback);
  values.forEach((value: string | null | undefined): void => {
    if (typeof value !== 'string') return;
    const valueMs = toTimestampMs(value);
    if (valueMs === null) return;
    if (bestMs === null || valueMs > bestMs) {
      best = value;
      bestMs = valueMs;
    }
  });
  return best;
};

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

const normalizeHexColor = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(normalized) || /^#[0-9a-fA-F]{3}$/.test(normalized)) {
    return normalized;
  }
  return fallback;
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

const sanitizeNodeMeta = (
  source: Record<string, CaseResolverNodeMeta> | null | undefined
): Record<string, CaseResolverNodeMeta> => {
  if (!source || typeof source !== 'object') return {};
  const next: Record<string, CaseResolverNodeMeta> = {};
  Object.entries(source).forEach(([nodeId, meta]: [string, CaseResolverNodeMeta]) => {
    if (!nodeId || !meta || typeof meta !== 'object') return;
    const role =
      meta.role === 'text_note' || meta.role === 'explanatory' || meta.role === 'ai_prompt'
        ? meta.role
        : DEFAULT_CASE_RESOLVER_NODE_META.role;
    const quoteMode =
      meta.quoteMode === 'none' || meta.quoteMode === 'double' || meta.quoteMode === 'single'
        ? meta.quoteMode
        : DEFAULT_CASE_RESOLVER_NODE_META.quoteMode;
    next[nodeId] = {
      role,
      quoteMode,
      includeInOutput:
        typeof meta.includeInOutput === 'boolean'
          ? meta.includeInOutput
          : DEFAULT_CASE_RESOLVER_NODE_META.includeInOutput,
      surroundPrefix:
        typeof meta.surroundPrefix === 'string'
          ? meta.surroundPrefix
          : DEFAULT_CASE_RESOLVER_NODE_META.surroundPrefix,
      surroundSuffix:
        typeof meta.surroundSuffix === 'string'
          ? meta.surroundSuffix
          : DEFAULT_CASE_RESOLVER_NODE_META.surroundSuffix,
    };
  });
  return next;
};

const sanitizeEdgeMeta = (
  source: Record<string, CaseResolverEdgeMeta> | null | undefined
): Record<string, CaseResolverEdgeMeta> => {
  if (!source || typeof source !== 'object') return {};
  const next: Record<string, CaseResolverEdgeMeta> = {};
  Object.entries(source).forEach(([edgeId, meta]: [string, CaseResolverEdgeMeta]) => {
    if (!edgeId || !meta || typeof meta !== 'object') return;
    const joinMode =
      meta.joinMode === 'newline' ||
      meta.joinMode === 'tab' ||
      meta.joinMode === 'space' ||
      meta.joinMode === 'none'
        ? meta.joinMode
        : DEFAULT_CASE_RESOLVER_EDGE_META.joinMode;
    next[edgeId] = { joinMode };
  });
  return next;
};

const sanitizeDocumentFileLinksByNode = (
  source: unknown,
  validNodeIds: Set<string>
): Record<string, string[]> => {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return {};
  }
  const result: Record<string, string[]> = {};
  Object.entries(source as Record<string, unknown>).forEach(([nodeId, rawLinks]: [string, unknown]) => {
    if (!validNodeIds.has(nodeId)) return;
    if (!Array.isArray(rawLinks)) return;
    const unique = new Set<string>();
    rawLinks.forEach((entry: unknown) => {
      if (typeof entry !== 'string') return;
      const normalized = entry.trim();
      if (!normalized) return;
      unique.add(normalized);
    });
    result[nodeId] = Array.from(unique);
  });
  return result;
};

const sanitizeDocumentSourceFileIdByNode = (
  source: unknown,
  validNodeIds: Set<string>
): Record<string, string> => {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return {};
  }
  const result: Record<string, string> = {};
  Object.entries(source as Record<string, unknown>).forEach(([nodeId, rawFileId]: [string, unknown]) => {
    if (!validNodeIds.has(nodeId)) return;
    if (typeof rawFileId !== 'string') return;
    const normalizedFileId = rawFileId.trim();
    if (!normalizedFileId) return;
    result[nodeId] = normalizedFileId;
  });
  return result;
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

export const normalizeCaseResolverIdentifiers = (input: unknown): CaseResolverIdentifier[] => {
  const now = new Date().toISOString();
  if (!Array.isArray(input)) return [];

  const seen = new Set<string>();
  const raw: CaseResolverIdentifier[] = [];

  input.forEach((entry: unknown, index: number): void => {
    if (!entry || typeof entry !== 'object') return;
    const record = entry as Record<string, unknown>;
    const rawId =
      typeof record['id'] === 'string' && record['id'].trim().length > 0
        ? record['id'].trim()
        : `identifier-${index + 1}`;
    if (seen.has(rawId)) return;
    seen.add(rawId);

    const rawName = typeof record['name'] === 'string' ? record['name'].trim() : '';
    raw.push({
      id: rawId,
      name: rawName || `Case Identifier ${raw.length + 1}`,
      parentId: sanitizeOptionalId(record['parentId']),
      color: normalizeHexColor(record['color'], '#f59e0b'),
      createdAt: normalizeTimestamp(record['createdAt'], now),
      updatedAt: normalizeTimestamp(record['updatedAt'], now),
    });
  });

  const byId = new Map<string, CaseResolverIdentifier>(
    raw.map(
      (identifier: CaseResolverIdentifier): [string, CaseResolverIdentifier] => [
        identifier.id,
        identifier,
      ]
    )
  );
  const normalizedParents = raw.map(
    (identifier: CaseResolverIdentifier): CaseResolverIdentifier => ({
      ...identifier,
      parentId: resolveSafeIdentifierParentId(identifier.id, identifier.parentId, byId),
    })
  );

  const grouped = new Map<string, CaseResolverIdentifier[]>();
  const getGroupKey = (parentId: string | null): string => parentId ?? '__root__';
  normalizedParents.forEach((identifier: CaseResolverIdentifier): void => {
    const key = getGroupKey(identifier.parentId);
    const current = grouped.get(key) ?? [];
    current.push(identifier);
    grouped.set(key, current);
  });

  const output: CaseResolverIdentifier[] = [];
  const visit = (parentId: string | null): void => {
    const group = grouped.get(getGroupKey(parentId)) ?? [];
    group
      .sort((left: CaseResolverIdentifier, right: CaseResolverIdentifier) => {
        const nameDelta = left.name.localeCompare(right.name);
        if (nameDelta !== 0) return nameDelta;
        return left.id.localeCompare(right.id);
      })
      .forEach((identifier: CaseResolverIdentifier): void => {
        output.push(identifier);
        visit(identifier.id);
      });
  };

  visit(null);
  return output;
};

export const normalizeCaseResolverTags = (input: unknown): CaseResolverTag[] => {
  const now = new Date().toISOString();
  if (!Array.isArray(input)) return [];

  const seen = new Set<string>();
  const raw: CaseResolverTag[] = [];

  input.forEach((entry: unknown, index: number): void => {
    if (!entry || typeof entry !== 'object') return;
    const record = entry as Record<string, unknown>;
    const rawId =
      typeof record['id'] === 'string' && record['id'].trim().length > 0
        ? record['id'].trim()
        : `tag-${index + 1}`;
    if (seen.has(rawId)) return;
    seen.add(rawId);

    const rawName = typeof record['name'] === 'string' ? record['name'].trim() : '';
    raw.push({
      id: rawId,
      name: rawName || `Tag ${raw.length + 1}`,
      parentId: sanitizeOptionalId(record['parentId']),
      color: normalizeHexColor(record['color'], '#38bdf8'),
      createdAt: normalizeTimestamp(record['createdAt'], now),
      updatedAt: normalizeTimestamp(record['updatedAt'], now),
    });
  });

  const byId = new Map<string, CaseResolverTag>(
    raw.map((tag: CaseResolverTag): [string, CaseResolverTag] => [tag.id, tag])
  );
  const normalizedParents = raw.map((tag: CaseResolverTag): CaseResolverTag => ({
    ...tag,
    parentId: resolveSafeTagParentId(tag.id, tag.parentId, byId),
  }));

  const grouped = new Map<string, CaseResolverTag[]>();
  const getGroupKey = (parentId: string | null): string => parentId ?? '__root__';
  normalizedParents.forEach((tag: CaseResolverTag): void => {
    const key = getGroupKey(tag.parentId);
    const current = grouped.get(key) ?? [];
    current.push(tag);
    grouped.set(key, current);
  });

  const output: CaseResolverTag[] = [];
  const visit = (parentId: string | null): void => {
    const group = grouped.get(getGroupKey(parentId)) ?? [];
    group
      .sort((left: CaseResolverTag, right: CaseResolverTag) => {
        const nameDelta = left.name.localeCompare(right.name);
        if (nameDelta !== 0) return nameDelta;
        return left.id.localeCompare(right.id);
      })
      .forEach((tag: CaseResolverTag): void => {
        output.push(tag);
        visit(tag.id);
      });
  };

  visit(null);
  return output;
};

function resolveSafeIdentifierParentId(
  identifierId: string,
  parentId: string | null,
  identifierMap: Map<string, CaseResolverIdentifier>
): string | null {
  if (!parentId || !identifierMap.has(parentId) || parentId === identifierId) return null;
  let current: string | null = parentId;
  const visited = new Set<string>();
  while (current) {
    if (current === identifierId || visited.has(current)) return null;
    visited.add(current);
    const parent = identifierMap.get(current);
    current = parent?.parentId ?? null;
  }
  return parentId;
}

function resolveSafeTagParentId(
  tagId: string,
  parentId: string | null,
  tagMap: Map<string, CaseResolverTag>
): string | null {
  if (!parentId || !tagMap.has(parentId) || parentId === tagId) return null;
  let current: string | null = parentId;
  const visited = new Set<string>();
  while (current) {
    if (current === tagId || visited.has(current)) return null;
    visited.add(current);
    const parent = tagMap.get(current);
    current = parent?.parentId ?? null;
  }
  return parentId;
}

const resolveSafeCategoryParentId = (
  categoryId: string,
  parentId: string | null,
  categoryMap: Map<string, CaseResolverCategory>
): string | null => {
  if (!parentId || !categoryMap.has(parentId) || parentId === categoryId) return null;
  let current: string | null = parentId;
  while (current) {
    if (current === categoryId) return null;
    const parent = categoryMap.get(current);
    current = parent?.parentId ?? null;
  }
  return parentId;
};

export const normalizeCaseResolverCategories = (input: unknown): CaseResolverCategory[] => {
  const now = new Date().toISOString();
  if (!Array.isArray(input)) return [];

  const seen = new Set<string>();
  const raw: CaseResolverCategory[] = [];
  input.forEach((entry: unknown, index: number): void => {
    if (!entry || typeof entry !== 'object') return;
    const record = entry as Record<string, unknown>;
    const rawId =
      typeof record['id'] === 'string' && record['id'].trim().length > 0
        ? record['id'].trim()
        : `category-${index + 1}`;
    if (seen.has(rawId)) return;
    seen.add(rawId);

    const rawName = typeof record['name'] === 'string' ? record['name'].trim() : '';
    raw.push({
      id: rawId,
      name: rawName || `Category ${raw.length + 1}`,
      parentId: sanitizeOptionalId(record['parentId']),
      sortOrder:
        typeof record['sortOrder'] === 'number' && Number.isFinite(record['sortOrder'])
          ? record['sortOrder']
          : index,
      description: typeof record['description'] === 'string' ? record['description'] : '',
      color: normalizeHexColor(record['color'], '#10b981'),
      createdAt: normalizeTimestamp(record['createdAt'], now),
      updatedAt: normalizeTimestamp(record['updatedAt'], now),
    });
  });

  const byId = new Map<string, CaseResolverCategory>(
    raw.map((category: CaseResolverCategory): [string, CaseResolverCategory] => [category.id, category])
  );
  const normalizedParents = raw.map((category: CaseResolverCategory): CaseResolverCategory => ({
    ...category,
    parentId: resolveSafeCategoryParentId(category.id, category.parentId, byId),
  }));

  const grouped = new Map<string, CaseResolverCategory[]>();
  const getGroupKey = (parentId: string | null): string => parentId ?? '__root__';
  normalizedParents.forEach((category: CaseResolverCategory): void => {
    const key = getGroupKey(category.parentId);
    const current = grouped.get(key) ?? [];
    current.push(category);
    grouped.set(key, current);
  });

  const output: CaseResolverCategory[] = [];
  const visit = (parentId: string | null): void => {
    const key = getGroupKey(parentId);
    const group = grouped.get(key) ?? [];
    group
      .sort((left: CaseResolverCategory, right: CaseResolverCategory) => {
        const sortDelta = left.sortOrder - right.sortOrder;
        if (sortDelta !== 0) return sortDelta;
        const nameDelta = left.name.localeCompare(right.name);
        if (nameDelta !== 0) return nameDelta;
        return left.id.localeCompare(right.id);
      })
      .forEach((category: CaseResolverCategory, index: number): void => {
        output.push({
          ...category,
          sortOrder: index,
        });
        visit(category.id);
      });
  };

  visit(null);
  return output;
};

export type CaseResolverCategoryTreeNode = CaseResolverCategory & {
  children: CaseResolverCategoryTreeNode[];
};

export const buildCaseResolverCategoryTree = (
  categories: CaseResolverCategory[]
): CaseResolverCategoryTreeNode[] => {
  const byId = new Map<string, CaseResolverCategoryTreeNode>();
  categories.forEach((category: CaseResolverCategory): void => {
    byId.set(category.id, { ...category, children: [] });
  });

  const roots: CaseResolverCategoryTreeNode[] = [];
  categories.forEach((category: CaseResolverCategory): void => {
    const current = byId.get(category.id);
    if (!current) return;
    if (!category.parentId) {
      roots.push(current);
      return;
    }
    const parent = byId.get(category.parentId);
    if (!parent) {
      roots.push(current);
      return;
    }
    parent.children.push(current);
  });

  const sortNodes = (nodes: CaseResolverCategoryTreeNode[]): void => {
    nodes.sort((left: CaseResolverCategoryTreeNode, right: CaseResolverCategoryTreeNode) => {
      const sortDelta = left.sortOrder - right.sortOrder;
      if (sortDelta !== 0) return sortDelta;
      const nameDelta = left.name.localeCompare(right.name);
      if (nameDelta !== 0) return nameDelta;
      return left.id.localeCompare(right.id);
    });
    nodes.forEach((node: CaseResolverCategoryTreeNode): void => {
      if (node.children.length > 0) sortNodes(node.children);
    });
  };
  sortNodes(roots);

  return roots;
};

export const parseCaseResolverTags = (raw: string | null | undefined): CaseResolverTag[] =>
  normalizeCaseResolverTags(parseJsonSetting<unknown>(raw, []));

export const parseCaseResolverIdentifiers = (
  raw: string | null | undefined
): CaseResolverIdentifier[] =>
  normalizeCaseResolverIdentifiers(parseJsonSetting<unknown>(raw, []));

export const parseCaseResolverCategories = (raw: string | null | undefined): CaseResolverCategory[] =>
  normalizeCaseResolverCategories(parseJsonSetting<unknown>(raw, []));

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

const ensureDocumentPromptPorts = (
  nodes: AiNode[],
  nodeMeta: Record<string, CaseResolverNodeMeta>,
  documentSourceFileIdByNode: Record<string, string>
): AiNode[] =>
  nodes.map((node: AiNode): AiNode => {
    if (node.type !== 'prompt') return node;
    const isTextNode =
      nodeMeta[node.id]?.role === 'text_note' || Boolean(documentSourceFileIdByNode[node.id]);
    if (!isTextNode) return node;
    const currentInputs = Array.isArray(node.inputs) ? node.inputs : [];
    const currentOutputs = Array.isArray(node.outputs) ? node.outputs : [];
    const nextInputs = [...CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS];
    const nextOutputs = [...CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS];
    const sameInputs =
      nextInputs.length === currentInputs.length &&
      nextInputs.every((port: string, index: number): boolean => port === currentInputs[index]);
    const sameOutputs =
      nextOutputs.length === currentOutputs.length &&
      nextOutputs.every((port: string, index: number): boolean => port === currentOutputs[index]);
    if (sameInputs && sameOutputs) return node;
    return {
      ...node,
      inputs: nextInputs,
      outputs: nextOutputs,
    };
  });

const sanitizeTextNodeEdgePorts = (
  edges: Edge[],
  textNodeIds: Set<string>
): Edge[] => {
  if (edges.length === 0 || textNodeIds.size === 0) return edges;
  const textfieldPort = CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS[0] ?? 'textfield';
  const contentPort = CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS[1] ?? 'content';
  const plainTextPort = CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS[2] ?? 'plainText';

  const normalizeInputPort = (value: string | undefined): string => {
    if (value === textfieldPort || value === contentPort || value === plainTextPort) return value;
    if (value === 'prompt') return textfieldPort;
    if (value === 'result') return contentPort;
    return contentPort;
  };

  const normalizeOutputPort = (value: string | undefined): string => {
    if (value === textfieldPort || value === contentPort || value === plainTextPort) return value;
    if (value === 'prompt') return textfieldPort;
    if (value === 'result') return contentPort;
    return contentPort;
  };

  return edges.map((edge: Edge): Edge => {
    let nextFromPort = edge.fromPort;
    let nextToPort = edge.toPort;
    if (textNodeIds.has(edge.from)) {
      const normalized = normalizeOutputPort(edge.fromPort);
      if (normalized !== edge.fromPort) {
        nextFromPort = normalized;
      }
    }
    if (textNodeIds.has(edge.to)) {
      const normalized = normalizeInputPort(edge.toPort);
      if (normalized !== edge.toPort) {
        nextToPort = normalized;
      }
    }
    if (nextFromPort === edge.fromPort && nextToPort === edge.toPort) return edge;
    return {
      ...edge,
      fromPort: nextFromPort,
      toPort: nextToPort,
    };
  });
};

const sanitizeGraph = (graph: unknown): CaseResolverGraph => {
  const graphRecord = graph && typeof graph === 'object' ? (graph as Record<string, unknown>) : {};
  const rawNodes = Array.isArray(graphRecord['nodes']) ? (graphRecord['nodes'] as AiNode[]) : [];
  const edges = Array.isArray(graphRecord['edges']) ? (graphRecord['edges'] as Edge[]) : [];
  const validNodeIds = new Set<string>(
    rawNodes
      .map((node: AiNode) => (typeof node?.id === 'string' ? node.id : ''))
      .filter(Boolean)
  );
  const edgesByNodeId = edges.filter(
    (edge: Edge): boolean =>
      typeof edge?.id === 'string' &&
      typeof edge.from === 'string' &&
      typeof edge.to === 'string' &&
      validNodeIds.has(edge.from) &&
      validNodeIds.has(edge.to)
  );

  const presetRaw = graphRecord['pdfExtractionPresetId'];
  const pdfExtractionPresetId: CaseResolverPdfExtractionPresetId =
    presetRaw === 'plain_text' || presetRaw === 'structured_sections' || presetRaw === 'facts_entities'
      ? presetRaw
      : DEFAULT_CASE_RESOLVER_PDF_EXTRACTION_PRESET_ID;
  const documentFileLinksByNode = sanitizeDocumentFileLinksByNode(
    graphRecord['documentFileLinksByNode'],
    validNodeIds
  );
  const documentSourceFileIdByNode = sanitizeDocumentSourceFileIdByNode(
    graphRecord['documentSourceFileIdByNode'],
    validNodeIds
  );
  const sanitizedNodeMeta = sanitizeNodeMeta(
    graphRecord['nodeMeta'] as Record<string, CaseResolverNodeMeta> | null | undefined
  );
  const nodes = ensureDocumentPromptPorts(rawNodes, sanitizedNodeMeta, documentSourceFileIdByNode);
  const textNodeIds = new Set<string>(
    nodes
      .filter((node: AiNode): boolean => {
        if (node.type !== 'prompt') return false;
        return (
          sanitizedNodeMeta[node.id]?.role === 'text_note' || Boolean(documentSourceFileIdByNode[node.id])
        );
      })
      .map((node: AiNode): string => node.id)
  );
  const sanitizedEdges = sanitizeTextNodeEdgePorts(edgesByNodeId, textNodeIds);
  const rawDocumentDropNodeId = graphRecord['documentDropNodeId'];
  const documentDropNodeId =
    typeof rawDocumentDropNodeId === 'string' &&
      rawDocumentDropNodeId.trim().length > 0 &&
      validNodeIds.has(rawDocumentDropNodeId)
      ? rawDocumentDropNodeId
      : null;

  return {
    nodes,
    edges: sanitizedEdges,
    nodeMeta: sanitizedNodeMeta,
    edgeMeta: sanitizeEdgeMeta(
      graphRecord['edgeMeta'] as Record<string, CaseResolverEdgeMeta> | null | undefined
    ),
    pdfExtractionPresetId,
    documentFileLinksByNode,
    documentDropNodeId,
    documentSourceFileIdByNode,
  };
};

export const createEmptyCaseResolverGraph = (): CaseResolverGraph => ({
  nodes: [],
  edges: [],
  nodeMeta: {},
  edgeMeta: {},
  pdfExtractionPresetId: DEFAULT_CASE_RESOLVER_PDF_EXTRACTION_PRESET_ID,
  documentFileLinksByNode: {},
  documentDropNodeId: null,
  documentSourceFileIdByNode: {},
});

type CaseResolverRelationNodeGroup = 'case' | 'folder' | 'file' | 'custom';

const RELATION_NODE_BASE_OFFSETS: Record<CaseResolverRelationNodeGroup, { x: number; y: number }> = {
  case: { x: 120, y: 120 },
  folder: { x: 520, y: 120 },
  file: { x: 920, y: 120 },
  custom: { x: 1320, y: 120 },
};

const RELATION_NODE_GRID_STEP_Y = 130;
const RELATION_NODE_GRID_COLUMNS = 2;
const RELATION_NODE_GRID_STEP_X = 260;

const getRelationNodePosition = (
  group: CaseResolverRelationNodeGroup,
  index: number
): { x: number; y: number } => {
  const base = RELATION_NODE_BASE_OFFSETS[group];
  const row = Math.floor(index / RELATION_NODE_GRID_COLUMNS);
  const col = index % RELATION_NODE_GRID_COLUMNS;
  return {
    x: base.x + col * RELATION_NODE_GRID_STEP_X,
    y: base.y + row * RELATION_NODE_GRID_STEP_Y,
  };
};

const resolveRelationNodeType = (entityType: CaseResolverRelationEntityType): AiNode['type'] => {
  if (entityType === 'folder') return 'database';
  if (entityType === 'file') return 'prompt';
  if (entityType === 'custom') return 'template';
  return 'template';
};

const hasKnownRelationNodeType = (value: string): value is AiNode['type'] =>
  Object.prototype.hasOwnProperty.call(typeStyles, value);

const sanitizeRelationNodeType = (value: unknown): AiNode['type'] => {
  if (typeof value !== 'string') return 'template';
  const normalized = value.trim();
  if (normalized.length === 0) return 'template';
  return hasKnownRelationNodeType(normalized) ? normalized : 'template';
};

const sanitizeRelationNodes = (value: unknown): AiNode[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const nodes: AiNode[] = [];
  value.forEach((entry: unknown, index: number): void => {
    if (!entry || typeof entry !== 'object') return;
    const record = entry as Record<string, unknown>;
    const rawId = typeof record['id'] === 'string' ? record['id'].trim() : '';
    if (!rawId || seen.has(rawId)) return;
    seen.add(rawId);
    const title =
      typeof record['title'] === 'string' && record['title'].trim().length > 0
        ? record['title'].trim()
        : `Relation ${index + 1}`;
    const description =
      typeof record['description'] === 'string' ? record['description'] : '';
    const positionRecord =
      record['position'] && typeof record['position'] === 'object'
        ? (record['position'] as Record<string, unknown>)
        : null;
    const x =
      positionRecord && typeof positionRecord['x'] === 'number' && Number.isFinite(positionRecord['x'])
        ? positionRecord['x']
        : 0;
    const y =
      positionRecord && typeof positionRecord['y'] === 'number' && Number.isFinite(positionRecord['y'])
        ? positionRecord['y']
        : 0;
    const inputs = Array.isArray(record['inputs'])
      ? (record['inputs'] as unknown[])
        .filter((port: unknown): port is string => typeof port === 'string' && port.trim().length > 0)
        .map((port: string) => port.trim())
      : [];
    const outputs = Array.isArray(record['outputs'])
      ? (record['outputs'] as unknown[])
        .filter((port: unknown): port is string => typeof port === 'string' && port.trim().length > 0)
        .map((port: string) => port.trim())
      : [];
    const config =
      record['config'] && typeof record['config'] === 'object' && !Array.isArray(record['config'])
        ? record['config']
        : undefined;
    nodes.push({
      id: rawId,
      type: sanitizeRelationNodeType(record['type']),
      title,
      description,
      inputs: inputs.length > 0 ? inputs : ['in'],
      outputs: outputs.length > 0 ? outputs : ['out'],
      position: { x, y },
      ...(config ? { config: config as AiNode['config'] } : {}),
    });
  });
  return nodes;
};

const sanitizeRelationEdges = (value: unknown, validNodeIds: Set<string>): Edge[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const edges: Edge[] = [];
  value.forEach((entry: unknown): void => {
    if (!entry || typeof entry !== 'object') return;
    const record = entry as Record<string, unknown>;
    const id = typeof record['id'] === 'string' ? record['id'].trim() : '';
    const from = typeof record['from'] === 'string' ? record['from'].trim() : '';
    const to = typeof record['to'] === 'string' ? record['to'].trim() : '';
    if (!id || !from || !to || seen.has(id)) return;
    if (!validNodeIds.has(from) || !validNodeIds.has(to)) return;
    seen.add(id);
    const label = typeof record['label'] === 'string' ? record['label'] : undefined;
    const fromPort = typeof record['fromPort'] === 'string' ? record['fromPort'] : undefined;
    const toPort = typeof record['toPort'] === 'string' ? record['toPort'] : undefined;
    edges.push({
      id,
      from,
      to,
      ...(label !== undefined ? { label } : {}),
      ...(fromPort !== undefined ? { fromPort } : {}),
      ...(toPort !== undefined ? { toPort } : {}),
    });
  });
  return edges;
};

const sanitizeRelationEntityType = (value: unknown): CaseResolverRelationEntityType =>
  value === 'case' || value === 'folder' || value === 'file' || value === 'custom'
    ? value
    : 'custom';

const sanitizeRelationFileKind = (value: unknown): CaseResolverRelationFileKind | null =>
  value === 'case_file' || value === 'asset_file' ? value : null;

const sanitizeRelationEdgeKind = (value: unknown): CaseResolverRelationEdgeKind =>
  value === 'contains' ||
    value === 'located_in' ||
    value === 'parent_case' ||
    value === 'references' ||
    value === 'related' ||
    value === 'custom'
    ? value
    : 'related';

const sanitizeRelationNodeMeta = (
  value: unknown,
  validNodeIds: Set<string>,
  now: string
): Record<string, CaseResolverRelationNodeMeta> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const result: Record<string, CaseResolverRelationNodeMeta> = {};
  Object.entries(value as Record<string, unknown>).forEach(([nodeId, entry]: [string, unknown]): void => {
    if (!validNodeIds.has(nodeId)) return;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
    const record = entry as Record<string, unknown>;
    const label =
      typeof record['label'] === 'string' && record['label'].trim().length > 0
        ? record['label'].trim()
        : nodeId;
    const entityId =
      typeof record['entityId'] === 'string' && record['entityId'].trim().length > 0
        ? record['entityId'].trim()
        : nodeId;
    const createdAt = normalizeTimestamp(record['createdAt'], now);
    const updatedAt = normalizeTimestamp(record['updatedAt'], createdAt);
    result[nodeId] = {
      ...DEFAULT_CASE_RESOLVER_RELATION_NODE_META,
      entityType: sanitizeRelationEntityType(record['entityType']),
      entityId,
      label,
      fileKind: sanitizeRelationFileKind(record['fileKind']),
      folderPath: sanitizeOptionalId(record['folderPath']),
      sourceFileId: sanitizeOptionalId(record['sourceFileId']),
      isStructural: record['isStructural'] === true,
      createdAt,
      updatedAt,
    };
  });
  return result;
};

const sanitizeRelationEdgeMeta = (
  value: unknown,
  validEdgeIds: Set<string>,
  now: string
): Record<string, CaseResolverRelationEdgeMeta> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const result: Record<string, CaseResolverRelationEdgeMeta> = {};
  Object.entries(value as Record<string, unknown>).forEach(([edgeId, entry]: [string, unknown]): void => {
    if (!validEdgeIds.has(edgeId)) return;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
    const record = entry as Record<string, unknown>;
    const createdAt = normalizeTimestamp(record['createdAt'], now);
    const updatedAt = normalizeTimestamp(record['updatedAt'], createdAt);
    result[edgeId] = {
      ...DEFAULT_CASE_RESOLVER_RELATION_EDGE_META,
      relationType: sanitizeRelationEdgeKind(record['relationType']),
      label:
        typeof record['label'] === 'string'
          ? record['label']
          : DEFAULT_CASE_RESOLVER_RELATION_EDGE_META.label,
      isStructural: record['isStructural'] === true,
      createdAt,
      updatedAt,
    };
  });
  return result;
};

const structuralRelationEdgeId = (
  relationType: CaseResolverRelationEdgeKind,
  from: string,
  to: string
): string => `struct:${relationType}:${encodeURIComponent(from)}:${encodeURIComponent(to)}`;

export const toCaseResolverRelationCaseNodeId = (caseId: string): string => `case:${caseId}`;
export const toCaseResolverRelationFolderNodeId = (folderPath: string): string =>
  `folder:${folderPath.trim() || CASE_RESOLVER_RELATION_ROOT_FOLDER_ID}`;
export const toCaseResolverRelationCaseFileNodeId = (caseId: string): string => `file:case:${caseId}`;
export const toCaseResolverRelationAssetFileNodeId = (assetId: string): string => `file:asset:${assetId}`;

type CaseResolverRelationNodeSeed = {
  id: string;
  entityType: CaseResolverRelationEntityType;
  entityId: string;
  label: string;
  title: string;
  description: string;
  group: CaseResolverRelationNodeGroup;
  fileKind: CaseResolverRelationFileKind | null;
  folderPath: string | null;
  sourceFileId: string | null;
  isStructural: boolean;
};

const resolveRelationNodeMetaUpdatedAt = (
  existing: CaseResolverRelationNodeMeta | undefined,
  seed: CaseResolverRelationNodeSeed,
  now: string
): string => {
  if (!existing) return now;
  const unchanged =
    existing.entityType === seed.entityType &&
    existing.entityId === seed.entityId &&
    existing.label === seed.label &&
    existing.fileKind === seed.fileKind &&
    existing.folderPath === seed.folderPath &&
    existing.sourceFileId === seed.sourceFileId &&
    existing.isStructural === seed.isStructural;
  if (unchanged) {
    return normalizeTimestamp(existing.updatedAt, normalizeTimestamp(existing.createdAt, now));
  }
  return now;
};

const resolveRelationEdgeMetaUpdatedAt = (
  existing: CaseResolverRelationEdgeMeta | undefined,
  input: { relationType: CaseResolverRelationEdgeKind; label: string; isStructural: boolean },
  now: string
): string => {
  if (!existing) return now;
  const unchanged =
    existing.relationType === input.relationType &&
    existing.label === input.label &&
    existing.isStructural === input.isStructural;
  if (unchanged) {
    return normalizeTimestamp(existing.updatedAt, normalizeTimestamp(existing.createdAt, now));
  }
  return now;
};

const relationFolderEntityIdFromPath = (folderPath: string): string => {
  const normalizedFolderPath = normalizeFolderPath(folderPath);
  return normalizedFolderPath || CASE_RESOLVER_RELATION_ROOT_FOLDER_ID;
};

const relationFolderPathFromEntityId = (entityId: string): string | null =>
  entityId === CASE_RESOLVER_RELATION_ROOT_FOLDER_ID ? '' : entityId;

const normalizeRelationMetaFolderPath = (
  value: string | null | undefined
): string | null => {
  const normalized = normalizeFolderPath(value ?? '');
  return normalized.length > 0 ? normalized : null;
};

const parentRelationFolderEntityId = (entityId: string): string | null => {
  if (entityId === CASE_RESOLVER_RELATION_ROOT_FOLDER_ID) return null;
  const folderPath = relationFolderPathFromEntityId(entityId) ?? '';
  if (!folderPath.includes('/')) return CASE_RESOLVER_RELATION_ROOT_FOLDER_ID;
  const parentFolderPath = folderPath.slice(0, folderPath.lastIndexOf('/'));
  return relationFolderEntityIdFromPath(parentFolderPath);
};

const buildCaseResolverRelationGraph = ({
  source,
  folders,
  files,
  assets,
}: {
  source: unknown;
  folders: string[];
  files: CaseResolverFile[];
  assets: CaseResolverAssetFile[];
}): CaseResolverRelationGraph => {
  const now = new Date().toISOString();
  const sourceRecord =
    source && typeof source === 'object' && !Array.isArray(source)
      ? (source as Record<string, unknown>)
      : {};
  const rawNodes = sanitizeRelationNodes(sourceRecord['nodes']);
  const rawNodeIds = new Set(rawNodes.map((node: AiNode): string => node.id));
  const rawEdges = sanitizeRelationEdges(sourceRecord['edges'], rawNodeIds);
  const rawEdgeIds = new Set(rawEdges.map((edge: Edge): string => edge.id));
  const rawNodeMeta = sanitizeRelationNodeMeta(sourceRecord['nodeMeta'], rawNodeIds, now);
  const rawEdgeMeta = sanitizeRelationEdgeMeta(sourceRecord['edgeMeta'], rawEdgeIds, now);
  const existingNodeById = new Map<string, AiNode>(
    rawNodes.map((node: AiNode): [string, AiNode] => [node.id, node])
  );
  const caseFiles = files.filter((file: CaseResolverFile): boolean => file.fileType === 'case');

  const nextNodes: AiNode[] = [];
  const nextNodeMeta: Record<string, CaseResolverRelationNodeMeta> = {};
  const nodeCounters: Record<CaseResolverRelationNodeGroup, number> = {
    case: 0,
    folder: 0,
    file: 0,
    custom: 0,
  };
  const usedNodeIds = new Set<string>();

  const upsertNode = (seed: CaseResolverRelationNodeSeed): void => {
    if (!seed.id || usedNodeIds.has(seed.id)) return;
    usedNodeIds.add(seed.id);
    const existingNode = existingNodeById.get(seed.id);
    const index = nodeCounters[seed.group];
    nodeCounters[seed.group] = index + 1;
    const defaultPosition = getRelationNodePosition(seed.group, index);
    const position =
      existingNode &&
      typeof existingNode.position?.x === 'number' &&
      Number.isFinite(existingNode.position.x) &&
      typeof existingNode.position?.y === 'number' &&
      Number.isFinite(existingNode.position.y)
        ? existingNode.position
        : defaultPosition;

    nextNodes.push({
      ...(existingNode ?? {
        id: seed.id,
        type: resolveRelationNodeType(seed.entityType),
        title: seed.title,
        description: seed.description,
        inputs: ['in'],
        outputs: ['out'],
        position,
      }),
      id: seed.id,
      type: existingNode?.type ?? resolveRelationNodeType(seed.entityType),
      title: seed.title,
      description: seed.description,
      inputs:
        Array.isArray(existingNode?.inputs) && existingNode.inputs.length > 0
          ? existingNode.inputs
          : ['in'],
      outputs:
        Array.isArray(existingNode?.outputs) && existingNode.outputs.length > 0
          ? existingNode.outputs
          : ['out'],
      position,
    });

    const existingMeta = rawNodeMeta[seed.id];
    const createdAt = normalizeTimestamp(existingMeta?.createdAt, now);
    const updatedAt = resolveRelationNodeMetaUpdatedAt(existingMeta, seed, now);
    nextNodeMeta[seed.id] = {
      ...DEFAULT_CASE_RESOLVER_RELATION_NODE_META,
      entityType: seed.entityType,
      entityId: seed.entityId,
      label: seed.label,
      fileKind: seed.fileKind,
      folderPath: seed.folderPath,
      sourceFileId: seed.sourceFileId,
      isStructural: seed.isStructural,
      createdAt,
      updatedAt,
    };
  };

  const folderEntityIds = new Set<string>([CASE_RESOLVER_RELATION_ROOT_FOLDER_ID]);
  folders.forEach((folderPath: string): void => {
    const normalizedFolderPath = normalizeFolderPath(folderPath);
    if (!normalizedFolderPath) return;
    folderEntityIds.add(relationFolderEntityIdFromPath(normalizedFolderPath));
  });
  caseFiles.forEach((file: CaseResolverFile): void => {
    folderEntityIds.add(relationFolderEntityIdFromPath(file.folder));
  });
  assets.forEach((asset: CaseResolverAssetFile): void => {
    folderEntityIds.add(relationFolderEntityIdFromPath(asset.folder));
  });

  const sortedFolderEntityIds = Array.from(folderEntityIds).sort((left: string, right: string) => {
    if (left === CASE_RESOLVER_RELATION_ROOT_FOLDER_ID) return -1;
    if (right === CASE_RESOLVER_RELATION_ROOT_FOLDER_ID) return 1;
    return left.localeCompare(right);
  });

  sortedFolderEntityIds.forEach((folderEntityId: string): void => {
    const folderPath = relationFolderPathFromEntityId(folderEntityId) ?? '';
    const folderName =
      folderEntityId === CASE_RESOLVER_RELATION_ROOT_FOLDER_ID
        ? '(root)'
        : folderPath.includes('/')
          ? folderPath.slice(folderPath.lastIndexOf('/') + 1)
          : folderPath;
    upsertNode({
      id: toCaseResolverRelationFolderNodeId(folderPath),
      entityType: 'folder',
      entityId: folderEntityId,
      label: folderName,
      title: `Folder: ${folderName}`,
      description:
        folderEntityId === CASE_RESOLVER_RELATION_ROOT_FOLDER_ID
          ? 'Workspace root folder'
          : `Folder path: ${folderPath}`,
      group: 'folder',
      fileKind: null,
      folderPath: normalizeRelationMetaFolderPath(folderPath),
      sourceFileId: null,
      isStructural: true,
    });
  });

  caseFiles.forEach((file: CaseResolverFile): void => {
    upsertNode({
      id: toCaseResolverRelationCaseNodeId(file.id),
      entityType: 'case',
      entityId: file.id,
      label: file.name,
      title: `Case: ${file.name}`,
      description: `Case ID: ${file.id}`,
      group: 'case',
      fileKind: null,
      folderPath: normalizeRelationMetaFolderPath(file.folder),
      sourceFileId: file.id,
      isStructural: true,
    });
  });

  assets.forEach((asset: CaseResolverAssetFile): void => {
    upsertNode({
      id: toCaseResolverRelationAssetFileNodeId(asset.id),
      entityType: 'file',
      entityId: `asset:${asset.id}`,
      label: asset.name,
      title: `Asset: ${asset.name}`,
      description: `Asset file (${asset.kind})`,
      group: 'file',
      fileKind: 'asset_file',
      folderPath: normalizeRelationMetaFolderPath(asset.folder),
      sourceFileId: asset.id,
      isStructural: true,
    });
  });

  rawNodes.forEach((node: AiNode): void => {
    if (usedNodeIds.has(node.id)) return;
    const existingMeta = rawNodeMeta[node.id];
    if (existingMeta?.isStructural) return;
    const entityType = existingMeta ? existingMeta.entityType : 'custom';
    const label = existingMeta?.label?.trim() ? existingMeta.label.trim() : node.title;
    const entityId = existingMeta?.entityId?.trim() ? existingMeta.entityId.trim() : node.id;
    const seed: CaseResolverRelationNodeSeed = {
      id: node.id,
      entityType,
      entityId,
      label,
      title: node.title,
      description: node.description ?? '',
      group: entityType === 'case' || entityType === 'folder' || entityType === 'file' ? entityType : 'custom',
      fileKind: existingMeta?.fileKind ?? null,
      folderPath: existingMeta?.folderPath ?? null,
      sourceFileId: existingMeta?.sourceFileId ?? null,
      isStructural: false,
    };
    upsertNode(seed);
  });

  const nextNodeIdSet = new Set<string>(nextNodes.map((node: AiNode): string => node.id));
  const nextEdges: Edge[] = [];
  const nextEdgeMeta: Record<string, CaseResolverRelationEdgeMeta> = {};
  const usedEdgeIds = new Set<string>();

  const upsertEdge = (input: {
    id: string;
    from: string;
    to: string;
    relationType: CaseResolverRelationEdgeKind;
    label: string;
    isStructural: boolean;
  }): void => {
    if (!input.id || usedEdgeIds.has(input.id)) return;
    if (!nextNodeIdSet.has(input.from) || !nextNodeIdSet.has(input.to)) return;
    usedEdgeIds.add(input.id);
    const existingEdge = rawEdges.find((edge: Edge): boolean => edge.id === input.id);
    const edgeLabel = input.label;
    const fromPort =
      typeof existingEdge?.fromPort === 'string' && existingEdge.fromPort.length > 0
        ? existingEdge.fromPort
        : 'out';
    const toPort =
      typeof existingEdge?.toPort === 'string' && existingEdge.toPort.length > 0
        ? existingEdge.toPort
        : 'in';
    nextEdges.push({
      id: input.id,
      from: input.from,
      to: input.to,
      ...(edgeLabel ? { label: edgeLabel } : {}),
      fromPort,
      toPort,
    });
    const existingMeta = rawEdgeMeta[input.id];
    const createdAt = normalizeTimestamp(existingMeta?.createdAt, now);
    const updatedAt = resolveRelationEdgeMetaUpdatedAt(
      existingMeta,
      {
        relationType: input.relationType,
        label: edgeLabel,
        isStructural: input.isStructural,
      },
      now
    );
    nextEdgeMeta[input.id] = {
      ...DEFAULT_CASE_RESOLVER_RELATION_EDGE_META,
      relationType: input.relationType,
      label: edgeLabel,
      isStructural: input.isStructural,
      createdAt,
      updatedAt,
    };
  };

  sortedFolderEntityIds.forEach((folderEntityId: string): void => {
    if (folderEntityId === CASE_RESOLVER_RELATION_ROOT_FOLDER_ID) return;
    const parentEntityId = parentRelationFolderEntityId(folderEntityId);
    if (!parentEntityId) return;
    const childFolderPath = relationFolderPathFromEntityId(folderEntityId) ?? '';
    const parentFolderPath = relationFolderPathFromEntityId(parentEntityId) ?? '';
    const from = toCaseResolverRelationFolderNodeId(parentFolderPath);
    const to = toCaseResolverRelationFolderNodeId(childFolderPath);
    upsertEdge({
      id: structuralRelationEdgeId('contains', from, to),
      from,
      to,
      relationType: 'contains',
      label: 'contains folder',
      isStructural: true,
    });
  });

  const validCaseIds = new Set<string>(caseFiles.map((file: CaseResolverFile): string => file.id));
  caseFiles.forEach((file: CaseResolverFile): void => {
    const folderNodeId = toCaseResolverRelationFolderNodeId(file.folder);
    const caseNodeId = toCaseResolverRelationCaseNodeId(file.id);
    upsertEdge({
      id: structuralRelationEdgeId('contains', folderNodeId, caseNodeId),
      from: folderNodeId,
      to: caseNodeId,
      relationType: 'contains',
      label: 'contains case',
      isStructural: true,
    });
    if (file.parentCaseId && validCaseIds.has(file.parentCaseId)) {
      const parentCaseNodeId = toCaseResolverRelationCaseNodeId(file.parentCaseId);
      upsertEdge({
        id: structuralRelationEdgeId('parent_case', parentCaseNodeId, caseNodeId),
        from: parentCaseNodeId,
        to: caseNodeId,
        relationType: 'parent_case',
        label: 'parent case',
        isStructural: true,
      });
    }
    file.referenceCaseIds
      .filter((referenceId: string): boolean => validCaseIds.has(referenceId))
      .forEach((referenceId: string): void => {
        const referenceCaseNodeId = toCaseResolverRelationCaseNodeId(referenceId);
        upsertEdge({
          id: structuralRelationEdgeId('references', caseNodeId, referenceCaseNodeId),
          from: caseNodeId,
          to: referenceCaseNodeId,
          relationType: 'references',
          label: 'references',
          isStructural: true,
        });
      });
  });

  assets.forEach((asset: CaseResolverAssetFile): void => {
    const folderNodeId = toCaseResolverRelationFolderNodeId(asset.folder);
    const assetFileNodeId = toCaseResolverRelationAssetFileNodeId(asset.id);
    upsertEdge({
      id: structuralRelationEdgeId('contains', folderNodeId, assetFileNodeId),
      from: folderNodeId,
      to: assetFileNodeId,
      relationType: 'contains',
      label: 'contains file',
      isStructural: true,
    });
  });

  rawEdges.forEach((edge: Edge): void => {
    const existingMeta = rawEdgeMeta[edge.id];
    if (existingMeta?.isStructural) return;
    if (!nextNodeIdSet.has(edge.from) || !nextNodeIdSet.has(edge.to)) return;
    const relationType = existingMeta ? existingMeta.relationType : 'related';
    const label = existingMeta?.label ?? edge.label ?? '';
    upsertEdge({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      relationType,
      label,
      isStructural: false,
    });
  });

  return {
    nodes: nextNodes,
    edges: nextEdges,
    nodeMeta: nextNodeMeta,
    edgeMeta: nextEdgeMeta,
  };
};

export const createEmptyCaseResolverRelationGraph = (): CaseResolverRelationGraph =>
  buildCaseResolverRelationGraph({
    source: {
      nodes: [],
      edges: [],
      nodeMeta: {},
      edgeMeta: {},
    },
    folders: [],
    files: [],
    assets: [],
  });

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

export const inferCaseResolverAssetKind = ({
  kind,
  mimeType,
  name,
}: {
  kind?: string | null | undefined;
  mimeType?: string | null | undefined;
  name?: string | null | undefined;
}): CaseResolverAssetKind => {
  const normalizedKind = (kind ?? '').trim().toLowerCase();
  if (
    normalizedKind === 'node_file' ||
    normalizedKind === 'image' ||
    normalizedKind === 'pdf' ||
    normalizedKind === 'file'
  ) {
    return normalizedKind;
  }

  const normalizedMime = (mimeType ?? '').trim().toLowerCase();
  if (normalizedMime.startsWith('image/')) return 'image';
  if (normalizedMime === 'application/pdf') return 'pdf';

  const normalizedName = (name ?? '').trim().toLowerCase();
  if (
    normalizedName.endsWith('.jpg') ||
    normalizedName.endsWith('.jpeg') ||
    normalizedName.endsWith('.png') ||
    normalizedName.endsWith('.webp') ||
    normalizedName.endsWith('.gif') ||
    normalizedName.endsWith('.bmp') ||
    normalizedName.endsWith('.avif') ||
    normalizedName.endsWith('.heic') ||
    normalizedName.endsWith('.heif') ||
    normalizedName.endsWith('.tif') ||
    normalizedName.endsWith('.tiff') ||
    normalizedName.endsWith('.svg')
  ) {
    return 'image';
  }
  if (normalizedName.endsWith('.pdf')) return 'pdf';
  return 'file';
};

const resolveUploadBucketForAssetKind = (
  kind: CaseResolverAssetKind
): 'images' | 'pdfs' | 'files' => {
  if (kind === 'image') return 'images';
  if (kind === 'pdf') return 'pdfs';
  return 'files';
};

export const resolveCaseResolverUploadFolder = ({
  baseFolder,
  kind,
  mimeType,
  name,
}: {
  baseFolder?: string | null | undefined;
  kind?: string | null | undefined;
  mimeType?: string | null | undefined;
  name?: string | null | undefined;
}): string => {
  const base = normalizeFolderPath(baseFolder ?? '');
  const inferredKind = inferCaseResolverAssetKind({ kind, mimeType, name });

  if (inferredKind === 'node_file') {
    return base;
  }

  const bucket = resolveUploadBucketForAssetKind(inferredKind);
  return normalizeFolderPath(base ? `${base}/${bucket}` : bucket);
};

export const createCaseResolverAssetFile = (input: {
  id: string;
  name: string;
  folder?: string;
  kind?: string | null | undefined;
  filepath?: string | null | undefined;
  sourceFileId?: string | null | undefined;
  mimeType?: string | null | undefined;
  size?: number | null | undefined;
  textContent?: string | null | undefined;
  description?: string | null | undefined;
  createdAt?: string;
  updatedAt?: string;
}): CaseResolverAssetFile => {
  const now = new Date().toISOString();
  const createdAt = normalizeTimestamp(input.createdAt, now);
  const updatedAt = normalizeTimestamp(input.updatedAt, createdAt);
  return {
    id: input.id,
    name: input.name.trim() || 'Untitled File',
    folder: normalizeFolderPath(input.folder ?? ''),
    kind: inferCaseResolverAssetKind({ kind: input.kind, mimeType: input.mimeType, name: input.name }),
    filepath:
      typeof input.filepath === 'string' && input.filepath.trim().length > 0
        ? input.filepath.trim()
        : null,
    sourceFileId:
      typeof input.sourceFileId === 'string' && input.sourceFileId.trim().length > 0
        ? input.sourceFileId.trim()
        : null,
    mimeType:
      typeof input.mimeType === 'string' && input.mimeType.trim().length > 0
        ? input.mimeType.trim().toLowerCase()
        : null,
    size:
      typeof input.size === 'number' && Number.isFinite(input.size) && input.size >= 0
        ? Math.round(input.size)
        : null,
    textContent:
      typeof input.textContent === 'string'
        ? input.textContent
        : '',
    description:
      typeof input.description === 'string'
        ? input.description
        : '',
    createdAt,
    updatedAt,
  };
};

const normalizeCaseResolverFolderTimestamps = ({
  source,
  folders,
  files,
  assets,
  fallbackTimestamp,
}: {
  source: unknown;
  folders: string[];
  files: CaseResolverFile[];
  assets: CaseResolverAssetFile[];
  fallbackTimestamp: string;
}): Record<string, CaseResolverFolderTimestamp> => {
  const sourceRecord =
    source && typeof source === 'object' && !Array.isArray(source)
      ? (source as Record<string, unknown>)
      : {};

  const contentStatsByFolder = new Map<string, { createdAt: string; updatedAt: string }>();
  const registerContentTimestamps = (folderPath: string, createdAt: string, updatedAt: string): void => {
    const ancestors = expandFolderPath(folderPath);
    ancestors.forEach((ancestor: string): void => {
      const current = contentStatsByFolder.get(ancestor);
      if (!current) {
        contentStatsByFolder.set(ancestor, { createdAt, updatedAt });
        return;
      }
      contentStatsByFolder.set(ancestor, {
        createdAt: pickEarliestTimestamp([current.createdAt, createdAt], current.createdAt),
        updatedAt: pickLatestTimestamp([current.updatedAt, updatedAt], current.updatedAt),
      });
    });
  };

  files.forEach((file: CaseResolverFile): void => {
    registerContentTimestamps(
      file.folder,
      normalizeTimestamp(file.createdAt, fallbackTimestamp),
      normalizeTimestamp(file.updatedAt, normalizeTimestamp(file.createdAt, fallbackTimestamp))
    );
  });
  assets.forEach((asset: CaseResolverAssetFile): void => {
    registerContentTimestamps(
      asset.folder,
      normalizeTimestamp(asset.createdAt, fallbackTimestamp),
      normalizeTimestamp(asset.updatedAt, normalizeTimestamp(asset.createdAt, fallbackTimestamp))
    );
  });

  const folderTimestamps: Record<string, CaseResolverFolderTimestamp> = {};
  folders.forEach((folderPath: string): void => {
    const rawEntry = sourceRecord[folderPath];
    const entryRecord =
      rawEntry && typeof rawEntry === 'object' && !Array.isArray(rawEntry)
        ? (rawEntry as Record<string, unknown>)
        : {};

    const recordedCreatedAt = normalizeTimestamp(entryRecord['createdAt'], fallbackTimestamp);
    const recordedUpdatedAt = normalizeTimestamp(entryRecord['updatedAt'], recordedCreatedAt);
    const contentStats = contentStatsByFolder.get(folderPath);

    const createdAt = pickEarliestTimestamp(
      [recordedCreatedAt, contentStats?.createdAt],
      recordedCreatedAt
    );
    const updatedAt = pickLatestTimestamp(
      [recordedUpdatedAt, contentStats?.updatedAt, createdAt],
      recordedUpdatedAt
    );

    folderTimestamps[folderPath] = {
      createdAt,
      updatedAt,
    };
  });

  return folderTimestamps;
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
  const normalizedFiles = normalizedFilesBase.map((file: CaseResolverFile): CaseResolverFile => {
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

const parseWorkspaceTimestampMs = (value: string | null | undefined): number => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getCaseResolverWorkspaceLatestTimestampMs = (
  workspace: CaseResolverWorkspace
): number => {
  let latest = 0;
  workspace.files.forEach((file: CaseResolverFile): void => {
    latest = Math.max(
      latest,
      parseWorkspaceTimestampMs(file.createdAt),
      parseWorkspaceTimestampMs(file.updatedAt)
    );
  });
  workspace.assets.forEach((asset: CaseResolverAssetFile): void => {
    latest = Math.max(
      latest,
      parseWorkspaceTimestampMs(asset.createdAt),
      parseWorkspaceTimestampMs(asset.updatedAt)
    );
  });
  return latest;
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

export const renameFolderPath = (
  value: string,
  sourceFolder: string,
  targetFolder: string
): string => {
  const normalizedValue = normalizeFolderPath(value);
  const normalizedSource = normalizeFolderPath(sourceFolder);
  const normalizedTarget = normalizeFolderPath(targetFolder);
  if (!normalizedSource) return normalizedValue;
  if (normalizedValue === normalizedSource) return normalizedTarget;
  if (normalizedValue.startsWith(`${normalizedSource}/`)) {
    const suffix = normalizedValue.slice(normalizedSource.length + 1);
    if (!normalizedTarget) return suffix;
    return `${normalizedTarget}/${suffix}`;
  }
  return normalizedValue;
};
