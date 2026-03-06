import { type CaseResolverWorkspace } from '@/shared/contracts/case-resolver';

import {
  getCaseResolverWorkspaceRevision,
  safeParseJson,
} from './utils/workspace-persistence-utils';
import { type CaseResolverWorkspaceDetachedPayload } from './workspace-persistence-detached.types';

export const CASE_RESOLVER_WORKSPACE_DETACHED_HISTORY_SCHEMA_V2 =
  'case_resolver_workspace_detached_history_v2';
const CASE_RESOLVER_WORKSPACE_DETACHED_HISTORY_SCHEMA =
  CASE_RESOLVER_WORKSPACE_DETACHED_HISTORY_SCHEMA_V2;
const CASE_RESOLVER_DOCUMENT_HISTORY_VERSIONS = new Set(['original', 'exploded']);
const CASE_RESOLVER_DOCUMENT_HISTORY_EDITORS = new Set([
  'wysiwyg',
  'markdown',
  'code',
  'rich-text',
  'plain-text',
]);

type CaseResolverWorkspaceDetachedHistoryFileEntry = {
  id: string;
  documentHistory: CaseResolverWorkspace['files'][number]['documentHistory'];
};

export type CaseResolverWorkspaceDetachedHistoryPayload = CaseResolverWorkspaceDetachedPayload<
  typeof CASE_RESOLVER_WORKSPACE_DETACHED_HISTORY_SCHEMA,
  CaseResolverWorkspaceDetachedHistoryFileEntry
>;

const isCaseResolverDocumentHistoryEntry = (
  entry: unknown
): entry is CaseResolverWorkspace['files'][number]['documentHistory'][number] => {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
  const record = entry as Record<string, unknown>;

  const id = record['id'];
  const savedAt = record['savedAt'];
  const documentContentVersion = record['documentContentVersion'];
  const activeDocumentVersion = record['activeDocumentVersion'];
  const editorType = record['editorType'];
  const documentContent = record['documentContent'];

  return (
    typeof id === 'string' &&
    id.trim().length > 0 &&
    typeof savedAt === 'string' &&
    savedAt.trim().length > 0 &&
    typeof documentContentVersion === 'number' &&
    Number.isFinite(documentContentVersion) &&
    typeof activeDocumentVersion === 'string' &&
    CASE_RESOLVER_DOCUMENT_HISTORY_VERSIONS.has(activeDocumentVersion) &&
    typeof editorType === 'string' &&
    CASE_RESOLVER_DOCUMENT_HISTORY_EDITORS.has(editorType) &&
    typeof documentContent === 'string'
  );
};

const normalizeDetachedHistoryFiles = (
  input: unknown
): CaseResolverWorkspaceDetachedHistoryPayload['files'] => {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  return input
    .map((entry: unknown): CaseResolverWorkspaceDetachedHistoryFileEntry | null => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
      const entryRecord = entry as Record<string, unknown>;
      const id = typeof entryRecord['id'] === 'string' ? entryRecord['id'].trim() : '';
      if (!id || seen.has(id)) return null;
      const documentHistory = entryRecord['documentHistory'];
      if (!Array.isArray(documentHistory) || documentHistory.length === 0) return null;
      seen.add(id);
      return {
        id,
        documentHistory: documentHistory.filter(isCaseResolverDocumentHistoryEntry),
      };
    })
    .filter(
      (
        entry: CaseResolverWorkspaceDetachedHistoryFileEntry | null
      ): entry is CaseResolverWorkspaceDetachedHistoryFileEntry => Boolean(entry)
    );
};

export const buildCaseResolverWorkspaceDetachedHistoryPayload = (
  workspace: CaseResolverWorkspace
): CaseResolverWorkspaceDetachedHistoryPayload => ({
  schema: CASE_RESOLVER_WORKSPACE_DETACHED_HISTORY_SCHEMA,
  workspaceRevision: getCaseResolverWorkspaceRevision(workspace),
  lastMutationId:
    typeof workspace.lastMutationId === 'string' && workspace.lastMutationId.trim().length > 0
      ? workspace.lastMutationId.trim()
      : null,
  files: Array.isArray(workspace.files)
    ? workspace.files
      .map((file): CaseResolverWorkspaceDetachedHistoryFileEntry | null => {
        const documentHistory = Array.isArray(file.documentHistory) ? file.documentHistory : [];
        if (documentHistory.length === 0) return null;
        return {
          id: file.id,
          documentHistory,
        };
      })
      .filter(
        (
          entry: CaseResolverWorkspaceDetachedHistoryFileEntry | null
        ): entry is CaseResolverWorkspaceDetachedHistoryFileEntry => Boolean(entry)
      )
    : [],
});

export const stripCaseResolverWorkspaceDetachedHistory = (
  workspace: CaseResolverWorkspace
): CaseResolverWorkspace => {
  if (!Array.isArray(workspace.files) || workspace.files.length === 0) return workspace;
  return {
    ...workspace,
    files: workspace.files.map((file): CaseResolverWorkspace['files'][number] => {
      const fileRecord = { ...file } as Record<string, unknown>;
      delete fileRecord['documentHistory'];
      return fileRecord as unknown as CaseResolverWorkspace['files'][number];
    }),
  };
};

export const parseCaseResolverWorkspaceDetachedHistoryPayload = (
  raw: string | null | undefined
): CaseResolverWorkspaceDetachedHistoryPayload | null => {
  if (typeof raw !== 'string' || raw.trim().length === 0) return null;
  const parsed = safeParseJson<unknown>(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  const schemaRaw = record['schema'];
  if (
    typeof schemaRaw !== 'string' ||
    schemaRaw !== CASE_RESOLVER_WORKSPACE_DETACHED_HISTORY_SCHEMA
  ) {
    return null;
  }
  const workspaceRevisionRaw = record['workspaceRevision'];
  const workspaceRevision =
    typeof workspaceRevisionRaw === 'number' &&
    Number.isFinite(workspaceRevisionRaw) &&
    workspaceRevisionRaw > 0
      ? Math.floor(workspaceRevisionRaw)
      : 0;
  const lastMutationIdRaw = record['lastMutationId'];
  const lastMutationId =
    typeof lastMutationIdRaw === 'string' && lastMutationIdRaw.trim().length > 0
      ? lastMutationIdRaw.trim()
      : null;
  return {
    schema: CASE_RESOLVER_WORKSPACE_DETACHED_HISTORY_SCHEMA,
    workspaceRevision,
    lastMutationId,
    files: normalizeDetachedHistoryFiles(record['files']),
  };
};

export const applyCaseResolverWorkspaceDetachedHistoryPayload = ({
  workspace,
  detachedHistoryPayload,
}: {
  workspace: CaseResolverWorkspace;
  detachedHistoryPayload: CaseResolverWorkspaceDetachedHistoryPayload | null;
}): CaseResolverWorkspace => {
  if (!detachedHistoryPayload) return workspace;
  const workspaceRevision = getCaseResolverWorkspaceRevision(workspace);
  if (workspaceRevision <= 0 || detachedHistoryPayload.workspaceRevision !== workspaceRevision) {
    return workspace;
  }
  const workspaceLastMutationId =
    typeof workspace.lastMutationId === 'string' && workspace.lastMutationId.trim().length > 0
      ? workspace.lastMutationId.trim()
      : null;
  if (
    detachedHistoryPayload.lastMutationId !== null &&
    detachedHistoryPayload.lastMutationId !== workspaceLastMutationId
  ) {
    return workspace;
  }
  if (detachedHistoryPayload.files.length === 0 || workspace.files.length === 0) {
    return workspace;
  }
  const historyByFileId = new Map<
    string,
    CaseResolverWorkspace['files'][number]['documentHistory']
  >(
    detachedHistoryPayload.files.map(
      (entry): [string, CaseResolverWorkspace['files'][number]['documentHistory']] => [
        entry.id,
        entry.documentHistory,
      ]
    )
  );
  let updated = false;
  const files = workspace.files.map((file): CaseResolverWorkspace['files'][number] => {
    const detachedHistory = historyByFileId.get(file.id);
    if (!detachedHistory) return file;
    updated = true;
    return {
      ...file,
      documentHistory: detachedHistory,
    };
  });
  return updated
    ? {
      ...workspace,
      files,
    }
    : workspace;
};
