/**
 * settings.helpers.ts
 *
 * Shared normalisation and validation helpers used across the case-resolver
 * settings layer. These functions coerce raw user input or persisted JSON
 * values into safe, canonical forms.
 *
 * Responsibilities:
 *  - Folder path normalisation (backslash → forward slash, sanitise segments).
 *  - Timestamp normalisation (coerce to ISO string or fallback).
 *  - ID sanitisation (trim, deduplicate, filter empty).
 *  - Enum coercion (file type, party search kind, document format, etc.).
 *  - Date formatting (ISO YYYY-MM-DD).
 */
import { type CaseResolverDocumentDateProposal, type CaseResolverDocumentFormatVersion, type CaseResolverFileType, type CaseResolverPartyReference } from '@/shared/contracts/case-resolver';

import { type CaseResolverPartySearchKind } from './settings.constants';

// Normalises a folder path: converts backslashes to forward slashes, trims
// segments, removes `.` and `..` traversals, replaces non-alphanumeric chars
// with underscores. Returns an empty string for the root folder.
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

// Expands a folder path into all its ancestor paths. E.g. "a/b/c" becomes
// ["a", "a/b", "a/b/c"]. Used to ensure all parent folders exist.
export const expandFolderPath = (value: string): string[] => {
  const normalized = normalizeFolderPath(value);
  if (!normalized) return [];
  const parts = normalized.split('/').filter(Boolean);
  return parts.map((_: string, index: number) => parts.slice(0, index + 1).join('/'));
};

// Normalises an array of folder paths, expanding each to include all
// ancestors, deduplicating, and sorting lexicographically.
export const normalizeFolderPaths = (folders: string[]): string[] => {
  const set = new Set<string>();
  folders
    .flatMap((folder: string) => expandFolderPath(folder))
    .forEach((folder: string) => {
      if (folder) set.add(folder);
    });
  return Array.from(set).sort((left: string, right: string) => left.localeCompare(right));
};

// Coerces a value to a non-empty ISO timestamp string, falling back to
// `fallback` when the value is missing or invalid.
export const normalizeTimestamp = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;

// Same as normalizeTimestamp but returns null instead of a fallback when the
// value is missing or invalid (used for optional timestamp fields).
export const normalizeOptionalTimestamp = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

// Coerces a value to a trimmed non-empty string ID, or null when invalid.
export const sanitizeOptionalId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

// Sanitises an array of IDs: filters out non-strings, trims, deduplicates,
// and removes empty strings.
export const sanitizeOptionalIdArray = (value: unknown): string[] => {
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

export const sanitizeOptionalMimeType = (value: unknown): string | undefined => {
  const normalized = sanitizeOptionalId(value);
  return normalized ? normalized.toLowerCase() : undefined;
};

export const normalizeWorkspaceRevision = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  return Math.floor(value);
};

export const normalizeDocumentCity = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const normalizeIsoDocumentDate = (value: string): string | null => {
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

export const normalizeCaseHappeningDate = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalizeIsoDocumentDate(normalized) ?? normalized;
};

export const normalizeDocumentDateAction = (
  value: unknown
): CaseResolverDocumentDateProposal['action'] => {
  if (value === 'useDetectedDate' || value === 'keepText' || value === 'ignore') {
    return value;
  }
  return 'useDetectedDate';
};

export const normalizeDocumentDateSource = (
  value: unknown
): CaseResolverDocumentDateProposal['source'] => (value === 'metadata' ? 'metadata' : 'text');

export const normalizeDocumentDate = (value: unknown): CaseResolverDocumentDateProposal | null => {
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

const isValidDocumentDatePart = (value: number, min: number, max: number): boolean =>
  Number.isInteger(value) && value >= min && value <= max;

const hasValidIsoDocumentDateParts = (year: number, month: number, day: number): boolean =>
  isValidDocumentDatePart(year, 1900, 2099) &&
  isValidDocumentDatePart(month, 1, 12) &&
  isValidDocumentDatePart(day, 1, 31);

const formatIsoDocumentDate = (year: number, month: number, day: number): string =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

export const toIsoDocumentDate = (year: number, month: number, day: number): string | null => {
  if (!hasValidIsoDocumentDateParts(year, month, day)) return null;

  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return formatIsoDocumentDate(year, month, day);
};

export const sanitizePartyReference = (value: unknown): CaseResolverPartyReference | null => {
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

export const normalizeCaseResolverFileType = (value: unknown): CaseResolverFileType => {
  if (value === 'case' || value === 'document' || value === 'scanfile') {
    return value;
  }
  return 'document';
};

export const normalizeCaseResolverDocumentVersion = (value: unknown): 'original' | 'exploded' =>
  value === 'exploded' ? 'exploded' : 'original';

export const normalizeCaseResolverCaseStatus = (value: unknown): 'pending' | 'completed' =>
  value === 'completed' ? 'completed' : 'pending';

export const normalizeCaseTreeOrder = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const normalized = Math.floor(value);
  return normalized >= 0 ? normalized : undefined;
};

export const normalizeDocumentContentVersion = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1;
  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : 1;
};

export const normalizeCaseResolverDefaultDocumentFormatValue = (
  input: unknown
): 'wysiwyg' | 'markdown' | null => {
  if (typeof input !== 'string') return null;
  const normalized = input.trim().toLowerCase();
  if (normalized === 'wysiwyg' || normalized === 'markdown') {
    return normalized;
  }
  return null;
};

export const normalizeCaseResolverPartySearchKindValue = (
  input: unknown
): CaseResolverPartySearchKind | null => {
  if (typeof input !== 'string') return null;
  const normalized = input.trim().toLowerCase();
  if (normalized === 'person' || normalized === 'organization') {
    return normalized;
  }
  return null;
};

export const normalizeDocumentFormatVersion = (
  value: unknown
): CaseResolverDocumentFormatVersion => {
  if (value === 1) return 1;
  return 1;
};
