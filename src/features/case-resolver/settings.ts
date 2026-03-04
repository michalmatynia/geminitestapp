import {
  type CaseResolverWorkspace,
  type CaseResolverDefaultDocumentFormat,
  type CaseResolverSettings,
} from '@/shared/contracts/case-resolver';
import { parseJsonSetting } from '@/shared/utils/settings-json';
import { validationError } from '@/shared/errors/app-error';
import { DEFAULT_CASE_RESOLVER_SETTINGS } from './settings.constants';
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
} from '@/features/case-resolver/nodefile-relations';
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
  fallback: CaseResolverDefaultDocumentFormat = 'wysiwyg'
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
  const ocrPrompt = typeof record['ocrPrompt'] === 'string' ? record['ocrPrompt'].trim() : '';
  const rawFormatCandidate =
    typeof record['defaultDocumentFormat'] === 'string' ? record['defaultDocumentFormat'] : null;
  const normalizedDefaultDocumentFormat =
    normalizeCaseResolverDefaultDocumentFormatValue(rawFormatCandidate);
  const defaultDocumentFormat: CaseResolverDefaultDocumentFormat =
    normalizedDefaultDocumentFormat ?? 'wysiwyg';
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
  return normalizeCaseResolverSettings(
    parseJsonSetting<unknown>(raw, DEFAULT_CASE_RESOLVER_SETTINGS)
  );
};

export const hasCaseResolverWorkspaceFilesArray = (raw: string | null | undefined): boolean => {
  const parsed = parseJsonSetting<unknown>(raw, null);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
  const record = parsed as Record<string, unknown>;
  return Array.isArray(record['files']);
};

export const parseCaseResolverWorkspace = (
  raw: string | null | undefined
): CaseResolverWorkspace => {
  if (!raw || raw.trim().length === 0) {
    return createDefaultCaseResolverWorkspace();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error: unknown) {
    throw validationError('Case Resolver workspace payload is not valid JSON.', {
      source: 'case_resolver.workspace',
      reason: 'invalid_json',
      cause: error instanceof Error ? error.message : 'unknown_error',
    });
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw validationError('Case Resolver workspace payload must be a JSON object.', {
      source: 'case_resolver.workspace',
      reason: 'payload_not_object',
    });
  }

  return normalizeCaseResolverWorkspace(parsed as CaseResolverWorkspace);
};

export type CaseResolverWorkspaceSafeParseDiagnostics = {
  parseFallbackApplied: boolean;
  parseFallbackReason: string | null;
  parseFallbackClass:
    | 'none'
    | 'invalid_json'
    | 'graph_stripped_recovered'
    | 'default_workspace_fallback';
};

const CASE_RESOLVER_WORKSPACE_SAFE_PARSE_DIAGNOSTICS_EMPTY: CaseResolverWorkspaceSafeParseDiagnostics =
  {
    parseFallbackApplied: false,
    parseFallbackReason: null,
    parseFallbackClass: 'none',
  };

const caseResolverWorkspaceSafeParseDiagnosticsByWorkspace = new WeakMap<
  CaseResolverWorkspace,
  CaseResolverWorkspaceSafeParseDiagnostics
>();

const attachCaseResolverWorkspaceSafeParseDiagnostics = (
  workspace: CaseResolverWorkspace,
  diagnostics: CaseResolverWorkspaceSafeParseDiagnostics
): CaseResolverWorkspace => {
  caseResolverWorkspaceSafeParseDiagnosticsByWorkspace.set(workspace, diagnostics);
  return workspace;
};

export const getCaseResolverWorkspaceSafeParseDiagnostics = (
  workspace: CaseResolverWorkspace | null | undefined
): CaseResolverWorkspaceSafeParseDiagnostics =>
  workspace
    ? (caseResolverWorkspaceSafeParseDiagnosticsByWorkspace.get(workspace) ??
      CASE_RESOLVER_WORKSPACE_SAFE_PARSE_DIAGNOSTICS_EMPTY)
    : CASE_RESOLVER_WORKSPACE_SAFE_PARSE_DIAGNOSTICS_EMPTY;

export const getCaseResolverWorkspaceSafeParseStatus = (
  workspace: CaseResolverWorkspace | null | undefined
): CaseResolverWorkspaceSafeParseDiagnostics['parseFallbackClass'] =>
  getCaseResolverWorkspaceSafeParseDiagnostics(workspace).parseFallbackClass;

const resolveWorkspaceParseFallbackClass = (
  error: unknown
): CaseResolverWorkspaceSafeParseDiagnostics['parseFallbackClass'] => {
  if (!(error instanceof Error)) return 'default_workspace_fallback';
  if (error.message.includes('not valid JSON')) return 'invalid_json';
  return 'default_workspace_fallback';
};

const stripWorkspaceGraphPayload = (
  raw: string | null | undefined
): string | null => {
  if (typeof raw !== 'string' || raw.trim().length === 0) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  const nextRecord: Record<string, unknown> = {
    ...record,
    relationGraph: null,
  };
  const rawFiles = Array.isArray(record['files']) ? record['files'] : null;
  if (rawFiles) {
    nextRecord['files'] = rawFiles.map((entry: unknown): unknown => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return entry;
      const fileRecord = entry as Record<string, unknown>;
      return {
        ...fileRecord,
        graph: null,
      };
    });
  }
  return JSON.stringify(nextRecord);
};

export const safeParseCaseResolverWorkspace = (
  raw: string | null | undefined
): CaseResolverWorkspace => {
  try {
    const workspace = parseCaseResolverWorkspace(raw);
    return attachCaseResolverWorkspaceSafeParseDiagnostics(
      workspace,
      CASE_RESOLVER_WORKSPACE_SAFE_PARSE_DIAGNOSTICS_EMPTY
    );
  } catch (firstError: unknown) {
    const fallbackRaw = stripWorkspaceGraphPayload(raw);
    if (fallbackRaw) {
      try {
        const fallbackWorkspace = parseCaseResolverWorkspace(fallbackRaw);
        return attachCaseResolverWorkspaceSafeParseDiagnostics(fallbackWorkspace, {
          parseFallbackApplied: true,
          parseFallbackReason:
            firstError instanceof Error ? firstError.message : 'workspace_parse_failed',
          parseFallbackClass: 'graph_stripped_recovered',
        });
      } catch {
        // Use default workspace fallback below.
      }
    }
    const emptyWorkspace = createDefaultCaseResolverWorkspace();
    return attachCaseResolverWorkspaceSafeParseDiagnostics(
      emptyWorkspace,
      {
        parseFallbackApplied: true,
        parseFallbackReason: firstError instanceof Error ? firstError.message : 'workspace_parse_failed',
        parseFallbackClass: resolveWorkspaceParseFallbackClass(firstError),
      }
    );
  }
};

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
  content: string | null | undefined
): string | null => {
  if (typeof content !== 'string') return null;

  const candidates = content.match(
    /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\.\d{1,2}\.\d{4}\b|\b\d{1,2}\/\d{1,2}\/\d{4}\b/g
  );
  if (!candidates || candidates.length === 0) return null;

  for (const candidate of candidates) {
    const normalized = parseDateTokenToIso(candidate);
    if (normalized) return normalized;
  }
  return null;
};
