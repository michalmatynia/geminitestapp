import {
  type CaseResolverDocumentDateProposal,
  type CaseResolverDocumentFormatVersion,
  type CaseResolverFileType,
  type CaseResolverPartyReference,
} from '@/shared/contracts/case-resolver';
import { type CaseResolverPartySearchKind } from './settings.constants';

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

export const normalizeTimestamp = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;

export const normalizeOptionalTimestamp = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

export const sanitizeOptionalId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

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

export const toIsoDocumentDate = (year: number, month: number, day: number): string | null => {
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
