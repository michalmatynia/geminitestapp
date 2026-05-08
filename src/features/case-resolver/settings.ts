/**
 * settings.ts — Public barrel for the case-resolver settings layer.
 *
 * Re-exports everything from the individual settings sub-modules so that
 * consumers only need a single import path. Also owns the top-level
 * `parseCaseResolverSettings` and `parseCaseResolverWorkspace` functions
 * which are the primary entry points for deserialising persisted JSON.
 */
import { type CaseResolverWorkspace, type CaseResolverSettings } from '@/shared/contracts/case-resolver';
import { validationError } from '@/shared/errors/app-error';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import { DEFAULT_CASE_RESOLVER_SETTINGS } from './settings.constants';
import {
  toIsoDocumentDate,
} from './settings.helpers';
import {
  createDefaultCaseResolverWorkspace,
  normalizeCaseResolverWorkspace,
} from './settings.workspace';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export * from './settings.constants';
export * from './settings.helpers';
export * from './settings.files';
export * from './settings.workspace';
export * from './settings.snapshots';
export * from './settings/document-format';

export { sanitizeCaseResolverGraphNodeFileRelations } from '@/features/case-resolver/nodefile-relations';
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

import { normalizeCaseResolverSettings } from './settings/normalize-settings';

// Deserialises and normalises the CaseResolver feature settings from a raw
// JSON string (as stored in the settings table). Falls back to
// DEFAULT_CASE_RESOLVER_SETTINGS for any missing or invalid fields.
export const parseCaseResolverSettings = (raw: string | null | undefined): CaseResolverSettings => {
  return normalizeCaseResolverSettings(
    parseJsonSetting<unknown>(raw, DEFAULT_CASE_RESOLVER_SETTINGS)
  );
};

// Quick check used before attempting a full workspace parse — avoids
// unnecessary work when the stored payload is clearly not a workspace object.
export const hasCaseResolverWorkspaceFilesArray = (raw: string | null | undefined): boolean => {
  const parsed = parseJsonSetting<unknown>(raw, null);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
  const record = parsed as Record<string, unknown>;
  return Array.isArray(record['files']);
};

/**
 * Strict workspace parser — throws a `validationError` on invalid JSON or a
 * non-object payload. Use `safeParseCaseResolverWorkspace` in UI contexts
 * where a fallback is preferable to an error boundary.
 */
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
    logClientError(error);
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

/**
 * Diagnostics attached to a workspace object after a safe parse.
 * Consumers can inspect these to show warnings or trigger re-save logic
 * when a fallback was applied.
 */
export type CaseResolverWorkspaceSafeParseDiagnostics = {
  parseFallbackApplied: boolean;
  parseFallbackReason: string | null;
  parseFallbackClass: 'none' | 'invalid_json' | 'default_workspace_fallback';
};

const CASE_RESOLVER_WORKSPACE_SAFE_PARSE_DIAGNOSTICS_EMPTY: CaseResolverWorkspaceSafeParseDiagnostics =
  {
    parseFallbackApplied: false,
    parseFallbackReason: null,
    parseFallbackClass: 'none',
  };

// Diagnostics are stored in a WeakMap keyed by the workspace object so they
// don't affect serialisation and are GC'd with the workspace instance.
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

/**
 * Safe workspace parser — never throws. On any parse failure it returns a
 * default empty workspace and attaches diagnostics describing what went wrong.
 * Use `getCaseResolverWorkspaceSafeParseDiagnostics` to inspect the result.
 */
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
    logClientError(firstError);
    const emptyWorkspace = createDefaultCaseResolverWorkspace();
    return attachCaseResolverWorkspaceSafeParseDiagnostics(emptyWorkspace, {
      parseFallbackApplied: true,
      parseFallbackReason:
        firstError instanceof Error ? firstError.message : 'workspace_parse_failed',
      parseFallbackClass: resolveWorkspaceParseFallbackClass(firstError),
    });
  }
};

// Attempts to parse a single date token in ISO (YYYY-MM-DD), dotted
// (DD.MM.YYYY), or slash (MM/DD/YYYY) format. Returns null on no match.
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

/**
 * Scans free-form document text for the first recognisable date string and
 * returns it normalised to ISO format (YYYY-MM-DD). Returns null when no
 * date is found. Used to pre-fill the document date field during OCR import.
 */
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
