import {
  type CaseResolverWorkspace,
  type CaseResolverDefaultDocumentFormat,
  type CaseResolverSettings,
} from '@/shared/contracts/case-resolver';
import { parseJsonSetting } from '@/shared/utils/settings-json';
import {
  DEFAULT_CASE_RESOLVER_SETTINGS,
} from './settings.constants';
import {
  normalizeCaseResolverDefaultDocumentFormatValue,
  normalizeCaseResolverPartySearchKindValue,
  toIsoDocumentDate,
} from './settings.helpers';
import {
  createDefaultCaseResolverWorkspace,
  normalizeCaseResolverWorkspace,
} from './settings.workspace';

export * from './settings.constants';
export * from './settings.helpers';
export * from './settings.files';
export * from './settings.workspace';
export * from './settings.snapshots';

export {
  sanitizeCaseResolverGraphNodeFileRelations,
  sanitizeCaseResolverNodeFileAssetSnapshots,
} from './nodefile-relations';
export {
  buildCaseResolverFolderRecords,
  parseCaseResolverFolderRecords,
} from './settings-folder-records';
export { sanitizeGraph, createEmptyCaseResolverGraph } from './settings-graph';
export {
  buildCaseResolverRelationGraph,
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
} from './settings-taxonomy';
export type { CaseResolverCategoryTreeNode } from './settings-taxonomy';
export {
  createCaseResolverAssetFile,
  getCaseResolverWorkspaceLatestTimestampMs,
  inferCaseResolverAssetKind,
  renameFolderPath,
  resolveCaseResolverUploadFolder,
} from './settings-workspace-helpers';

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

export const hasCaseResolverWorkspaceFilesArray = (
  raw: string | null | undefined,
): boolean => {
  const parsed = parseJsonSetting<unknown>(raw, null);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
  const record = parsed as Record<string, unknown>;
  return Array.isArray(record['files']);
};

export const parseCaseResolverWorkspace = (
  raw: string | null | undefined,
): CaseResolverWorkspace =>
  normalizeCaseResolverWorkspace(
    parseJsonSetting<unknown>(raw, createDefaultCaseResolverWorkspace()) as
      | CaseResolverWorkspace
      | null
      | undefined,
  );

const parseDateTokenToIso = (token: string): string | null => {
  const trimmed = token.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, yearRaw, monthRaw, dayRaw] = isoMatch;
    return toIsoDocumentDate(Number(yearRaw), Number(monthRaw), Number(dayRaw));
  }

  const dottedMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dottedMatch) {
    const [, dayRaw, monthRaw, yearRaw] = dottedMatch;
    return toIsoDocumentDate(Number(yearRaw), Number(monthRaw), Number(dayRaw));
  }

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, monthRaw, dayRaw, yearRaw] = slashMatch;
    return toIsoDocumentDate(Number(yearRaw), Number(monthRaw), Number(dayRaw));
  }

  return null;
};

export const extractCaseResolverDocumentDate = (
  content: string | null | undefined,
): string | null => {
  if (typeof content !== 'string') return null;

  const candidates = content.match(
    /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\.\d{1,2}\.\d{4}\b|\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
  );
  if (!candidates || candidates.length === 0) return null;

  for (const candidate of candidates) {
    const normalized = parseDateTokenToIso(candidate);
    if (normalized) return normalized;
  }
  return null;
};
