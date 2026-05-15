/**
 * Case Resolver Workspace Persistence Save
 * 
 * Handles saving and persistence of case resolver workspace data.
 * Provides:
 * - Workspace data normalization and validation
 * - Settings-based persistence with compression
 * - Workspace revision tracking and history management
 * - Size limit validation and error handling
 * - Diagnostic information for workspace operations
 */

import {
  type CaseResolverWorkspace,
  type PersistCaseResolverWorkspaceResult,
} from '@/shared/contracts/case-resolver';
import { validationError } from '@/shared/errors/app-error';

import {
  getCaseResolverWorkspaceNormalizationDiagnostics,
  normalizeCaseResolverWorkspace,
} from './settings';
import {
  CASE_RESOLVER_WORKSPACE_DOCUMENTS_KEY,
  CASE_RESOLVER_WORKSPACE_HISTORY_KEY,
  CASE_RESOLVER_WORKSPACE_KEY,
  type SettingsRecordLike,
} from './utils/workspace-settings-persistence-helpers';
import {
  formatByteCount,
  getCaseResolverWorkspaceRevision,
  readPositiveIntegerEnv,
  safeParseJson,
} from './utils/workspace-persistence-utils';
import { logCaseResolverWorkspaceEvent } from './workspace-observability';
import {
  applyCaseResolverWorkspaceDetachedDocumentsPayload,
  buildCaseResolverWorkspaceDetachedDocumentsPayload,
  stripCaseResolverWorkspaceDetachedDocuments,
} from './workspace-persistence-detached-documents';
import {
  applyCaseResolverWorkspaceDetachedHistoryPayload,
  buildCaseResolverWorkspaceDetachedHistoryPayload,
  stripCaseResolverWorkspaceDetachedHistory,
} from './workspace-persistence-detached-history';
import {
  getCaseResolverWorkspaceMaxPayloadBytes,
  isCaseResolverWorkspacePayloadTooLarge,
  readWorkspaceFromSettingRecord,
} from './workspace-persistence-shared';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

const CASE_RESOLVER_WORKSPACE_PERSISTED_HISTORY_LIMIT_DEFAULT = 12;
const CASE_RESOLVER_WORKSPACE_PAYLOAD_PROFILE_WARN_BYTES_DEFAULT = 900_000;

const CASE_RESOLVER_WORKSPACE_PERSISTED_HISTORY_LIMIT = readPositiveIntegerEnv(
  'NEXT_PUBLIC_CASE_RESOLVER_WORKSPACE_PERSISTED_HISTORY_LIMIT',
  CASE_RESOLVER_WORKSPACE_PERSISTED_HISTORY_LIMIT_DEFAULT
);
const CASE_RESOLVER_WORKSPACE_PAYLOAD_PROFILE_WARN_BYTES = readPositiveIntegerEnv(
  'NEXT_PUBLIC_CASE_RESOLVER_WORKSPACE_PAYLOAD_PROFILE_WARN_BYTES',
  CASE_RESOLVER_WORKSPACE_PAYLOAD_PROFILE_WARN_BYTES_DEFAULT
);

export type PersistWorkspaceInput = {
  workspace: CaseResolverWorkspace;
  expectedRevision: number;
  mutationId: string;
  source: string;
};

type PersistedWorkspaceFile = CaseResolverWorkspace['files'][number];
type PersistedHistoryEntry = PersistedWorkspaceFile['documentHistory'][number];

const coercePersistedWorkspaceFile = (value: unknown): PersistedWorkspaceFile =>
  value as PersistedWorkspaceFile;

const coercePersistedHistoryEntry = (value: unknown): PersistedHistoryEntry =>
  value as PersistedHistoryEntry;

const summarizeWorkspacePersistPayload = (
  workspace: CaseResolverWorkspace
): {
  fileBytes: number;
  assetBytes: number;
  nodeFileInlineBytes: number;
  settingsBytes: number;
  historyBytes: number;
  historyEntryCount: number;
  largestEntries: string[];
  largestHistoryFiles: string[];
} => {
  const largestEntries: Array<{ label: string; bytes: number }> = [];
  const historyByFile: Array<{ id: string; bytes: number; entries: number }> = [];
  const registerLargest = (label: string, bytes: number): void => {
    largestEntries.push({ label, bytes });
  };

  let historyBytes = 0;
  let historyEntryCount = 0;
  const fileBytes = (workspace.files ?? []).reduce((sum, file): number => {
    const bytes = JSON.stringify(file).length;
    registerLargest(`file:${file.id}:${file.name}`, bytes);
    const fileHistory = Array.isArray(file.documentHistory) ? file.documentHistory : [];
    const fileHistoryBytes = fileHistory.reduce((historySum, entry): number => {
      return historySum + JSON.stringify(entry).length;
    }, 0);
    historyBytes += fileHistoryBytes;
    historyEntryCount += fileHistory.length;
    if (fileHistoryBytes > 0) {
      historyByFile.push({
        id: file.id,
        bytes: fileHistoryBytes,
        entries: fileHistory.length,
      });
    }
    return sum + bytes;
  }, 0);
  const assetBytes = (workspace.assets ?? []).reduce((sum, asset): number => {
    const bytes = JSON.stringify(asset).length;
    registerLargest(`asset:${asset.id}:${asset.name}`, bytes);
    return sum + bytes;
  }, 0);
  const nodeFileInlineBytes = (workspace.assets ?? []).reduce((sum, asset): number => {
    if (asset.kind !== 'node_file' || typeof asset.textContent !== 'string') return sum;
    return sum + asset.textContent.length;
  }, 0);
  const settingsBytes =
    workspace.settings && typeof workspace.settings === 'object'
      ? JSON.stringify(workspace.settings).length
      : 0;

  return {
    fileBytes,
    assetBytes,
    nodeFileInlineBytes,
    settingsBytes,
    historyBytes,
    historyEntryCount,
    largestEntries: largestEntries
      .sort((left, right): number => right.bytes - left.bytes)
      .slice(0, 5)
      .map((entry): string => `${entry.label}=${formatByteCount(entry.bytes)}`),
    largestHistoryFiles: historyByFile
      .sort((left, right): number => right.bytes - left.bytes)
      .slice(0, 5)
      .map(
        (entry): string =>
          `file:${entry.id}=${formatByteCount(entry.bytes)}(${entry.entries} entries)`
      ),
  };
};

export const compactCaseResolverWorkspaceForPersist = (
  workspace: CaseResolverWorkspace
): CaseResolverWorkspace => {
  const compactedFiles = Array.isArray(workspace.files)
    ? workspace.files.map((file): CaseResolverWorkspace['files'][number] => {
        const isScanFile = file.fileType === 'scanfile';
        const rawHistory = Array.isArray(file.documentHistory) ? file.documentHistory : [];
        const compactedHistory: PersistedHistoryEntry[] = rawHistory
          .slice(0, CASE_RESOLVER_WORKSPACE_PERSISTED_HISTORY_LIMIT)
          .filter(
            (entry: unknown): entry is Record<string, unknown> =>
              Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry)
          )
          .map((entryRecord): PersistedHistoryEntry => {
            const {
              action: _action,
              changes: _changes,
              documentId: _documentId,
              timestamp: _timestamp,
              userId: _userId,
              ...entryBase
            } = entryRecord;
            if (isScanFile) {
              const {
                documentContent: _documentContent,
                documentContentHtml: _documentContentHtml,
                documentContentPlainText: _documentContentPlainText,
                ...scanRest
              } = entryBase;
              return coercePersistedHistoryEntry(scanRest);
            }

            const {
              documentContentMarkdown: _documentContentMarkdown,
              documentContentPlainText: _documentContentPlainText,
              ...contentRest
            } = entryBase;
            const htmlValue =
              typeof contentRest['documentContentHtml'] === 'string'
                ? contentRest['documentContentHtml']
                : '';
            if (htmlValue.trim().length > 0) {
              const { documentContent: _documentContent, ...htmlRest } = contentRest;
              return coercePersistedHistoryEntry(htmlRest);
            }
            return coercePersistedHistoryEntry(contentRest);
          });
        if (isScanFile) {
          const {
            documentContent: _content,
            documentContentHtml: _html,
            documentContentPlainText: _plainText,
            explodedDocumentContent: _exploded,
            originalDocumentContent: _original,
            ...fileRest
          } = file;
          const compactedFileRecord: Record<string, unknown> = { ...fileRest };
          if (compactedHistory.length > 0) {
            compactedFileRecord['documentHistory'] = compactedHistory;
          }
          if (
            Array.isArray(file.documentConversionWarnings) &&
            file.documentConversionWarnings.length === 0
          ) {
            delete compactedFileRecord['documentConversionWarnings'];
          }
          return coercePersistedWorkspaceFile(compactedFileRecord);
        }
        const {
          documentContentMarkdown: _markdown,
          documentContentPlainText: _plainText,
          ...fileRest
        } = file;
        const compactedFileRecord: Record<string, unknown> = { ...fileRest };
        if (
          typeof file.documentContentHtml === 'string' &&
          file.documentContentHtml.trim().length > 0
        ) {
          delete compactedFileRecord['documentContent'];
        }
        if (compactedHistory.length > 0) {
          compactedFileRecord['documentHistory'] = compactedHistory;
        }
        if (
          Array.isArray(file.documentConversionWarnings) &&
          file.documentConversionWarnings.length === 0
        ) {
          delete compactedFileRecord['documentConversionWarnings'];
        }
        return coercePersistedWorkspaceFile(compactedFileRecord);
      })
    : workspace.files;

  const compactedAssets = Array.isArray(workspace.assets)
    ? workspace.assets.map((asset): CaseResolverWorkspace['assets'][number] => {
        if (asset.kind !== 'node_file') return asset;
        if (typeof asset.textContent === 'string' && asset.textContent.trim().length > 0) {
          throw validationError('Case Resolver inline node-file snapshots are unsupported.', {
            assetId: asset.id,
            reason: 'inline_node_file_snapshot_not_supported',
            source: 'case_resolver.workspace',
          });
        }
        const { textContent: _textContent, ...assetRest } = asset;
        return {
          ...assetRest,
        } as CaseResolverWorkspace['assets'][number];
      })
    : workspace.assets;

  return {
    ...workspace,
    assets: compactedAssets,
    files: compactedFiles,
  };
};

export const persistCaseResolverWorkspaceSnapshot = async (
  input: PersistWorkspaceInput
): Promise<PersistCaseResolverWorkspaceResult> => {
  const startedAt = Date.now();
  let normalizedWorkspace: CaseResolverWorkspace;
  try {
    normalizedWorkspace = normalizeCaseResolverWorkspace(input.workspace);
  } catch (error: unknown) {
    logClientError(error);
    const message =
      error instanceof Error ? error.message : 'Invalid Case Resolver workspace payload.';
    logCaseResolverWorkspaceEvent({
      source: input.source,
      action: 'persist_rejected_invalid_payload',
      durationMs: Date.now() - startedAt,
      expectedRevision: input.expectedRevision,
      message,
      mutationId: input.mutationId,
      workspaceRevision: getCaseResolverWorkspaceRevision(input.workspace),
    });
    return {
      ok: false,
      conflict: false,
      error: `Normalization failed for mutation ${input.mutationId} at revision ${input.expectedRevision}: ${message}`,
    };
  }
  const normalizedMutationId = input.mutationId.trim();
  const workspaceForPersistPipeline =
    normalizedMutationId.length > 0 && normalizedWorkspace.lastMutationId !== normalizedMutationId
      ? {
          ...normalizedWorkspace,
          lastMutationAt: normalizedWorkspace.lastMutationAt ?? new Date().toISOString(),
          lastMutationId: normalizedMutationId,
        }
      : normalizedWorkspace;
  const normalizationDiagnostics =
    getCaseResolverWorkspaceNormalizationDiagnostics(normalizedWorkspace);
  logCaseResolverWorkspaceEvent({
    source: input.source,
    action: 'ownership_normalization',
    message: [
      `ownership_repaired_count=${normalizationDiagnostics.ownershipRepairedCount}`,
      `ownership_unresolved_count=${normalizationDiagnostics.ownershipUnresolvedCount}`,
      `dropped_duplicate_count=${normalizationDiagnostics.droppedDuplicateCount}`,
    ].join(' '),
    mutationId: input.mutationId,
    workspaceRevision: getCaseResolverWorkspaceRevision(normalizedWorkspace),
  });
  let workspaceForPersist: CaseResolverWorkspace;
  try {
    workspaceForPersist = compactCaseResolverWorkspaceForPersist(workspaceForPersistPipeline);
  } catch (error: unknown) {
    logClientError(error);
    const message =
      error instanceof Error ? error.message : 'Invalid Case Resolver workspace payload.';
    logCaseResolverWorkspaceEvent({
      source: input.source,
      action: 'persist_rejected_invalid_payload',
      durationMs: Date.now() - startedAt,
      expectedRevision: input.expectedRevision,
      message,
      mutationId: input.mutationId,
      workspaceRevision: getCaseResolverWorkspaceRevision(workspaceForPersistPipeline),
    });
    return {
      ok: false,
      conflict: false,
      error: message,
    };
  }
  const detachedHistoryPayload =
    buildCaseResolverWorkspaceDetachedHistoryPayload(workspaceForPersist);
  const hasDetachedHistoryPayload = detachedHistoryPayload.files.length > 0;
  const serializedDetachedHistoryPayload = hasDetachedHistoryPayload
    ? JSON.stringify(detachedHistoryPayload)
    : '';
  const detachedHistoryPayloadBytes = serializedDetachedHistoryPayload.length;
  const detachedDocumentsPayload =
    buildCaseResolverWorkspaceDetachedDocumentsPayload(workspaceForPersist);
  const hasDetachedDocumentsPayload = detachedDocumentsPayload.files.length > 0;
  const serializedDetachedDocumentsPayload = hasDetachedDocumentsPayload
    ? JSON.stringify(detachedDocumentsPayload)
    : '';
  const detachedDocumentsPayloadBytes = serializedDetachedDocumentsPayload.length;
  const workspaceForPersistPrimary = stripCaseResolverWorkspaceDetachedHistory(
    stripCaseResolverWorkspaceDetachedDocuments(workspaceForPersist)
  );
  const serializedWorkspace = JSON.stringify(workspaceForPersistPrimary);
  const payloadBytes = serializedWorkspace.length;
  const payloadSummary = summarizeWorkspacePersistPayload(workspaceForPersist);
  logCaseResolverWorkspaceEvent({
    source: input.source,
    action: 'persist_attempt',
    expectedRevision: input.expectedRevision,
    mutationId: input.mutationId,
    payloadBytes,
    workspaceRevision: getCaseResolverWorkspaceRevision(normalizedWorkspace),
  });
  if (payloadBytes >= CASE_RESOLVER_WORKSPACE_PAYLOAD_PROFILE_WARN_BYTES) {
    logCaseResolverWorkspaceEvent({
      source: input.source,
      action: 'persist_payload_profile',
      expectedRevision: input.expectedRevision,
      message: [
        `threshold=${formatByteCount(CASE_RESOLVER_WORKSPACE_PAYLOAD_PROFILE_WARN_BYTES)}`,
        `files=${formatByteCount(payloadSummary.fileBytes)}`,
        `assets=${formatByteCount(payloadSummary.assetBytes)}`,
        `history=${formatByteCount(payloadSummary.historyBytes)}(${payloadSummary.historyEntryCount} entries)`,
        `detached_history=${formatByteCount(detachedHistoryPayloadBytes)}`,
        `detached_documents=${formatByteCount(detachedDocumentsPayloadBytes)}`,
        `nodefile_inline=${formatByteCount(payloadSummary.nodeFileInlineBytes)}`,
        `settings=${formatByteCount(payloadSummary.settingsBytes)}`,
        `largest=${payloadSummary.largestEntries.join(', ')}`,
        `largest_history=${payloadSummary.largestHistoryFiles.join(', ')}`,
      ].join(' '),
      mutationId: input.mutationId,
      payloadBytes,
      workspaceRevision: getCaseResolverWorkspaceRevision(normalizedWorkspace),
    });
  }
  if (isCaseResolverWorkspacePayloadTooLarge(payloadBytes)) {
    const maxPayloadBytes = getCaseResolverWorkspaceMaxPayloadBytes();
    const message = [
      'Case Resolver workspace is too large to save safely.',
      `Payload: ${formatByteCount(payloadBytes)}.`,
      `Limit: ${formatByteCount(maxPayloadBytes)}.`,
      'Reduce content size or split work into smaller documents.',
    ].join(' ');
    logCaseResolverWorkspaceEvent({
      source: input.source,
      action: 'persist_rejected_payload_too_large',
      durationMs: Date.now() - startedAt,
      expectedRevision: input.expectedRevision,
      message: [
        message,
        `files=${formatByteCount(payloadSummary.fileBytes)}`,
        `assets=${formatByteCount(payloadSummary.assetBytes)}`,
        `history=${formatByteCount(payloadSummary.historyBytes)}(${payloadSummary.historyEntryCount} entries)`,
        `detached_history=${formatByteCount(detachedHistoryPayloadBytes)}`,
        `detached_documents=${formatByteCount(detachedDocumentsPayloadBytes)}`,
        `nodefile_inline=${formatByteCount(payloadSummary.nodeFileInlineBytes)}`,
        `settings=${formatByteCount(payloadSummary.settingsBytes)}`,
        `largest=${payloadSummary.largestEntries.join(', ')}`,
        `largest_history=${payloadSummary.largestHistoryFiles.join(', ')}`,
      ].join(' '),
      mutationId: input.mutationId,
      payloadBytes,
      workspaceRevision: getCaseResolverWorkspaceRevision(normalizedWorkspace),
    });
    return {
      ok: false,
      conflict: false,
      error: message,
    };
  }

  if (hasDetachedDocumentsPayload) {
    let detachedDocumentsResponse: Response;
    try {
      detachedDocumentsResponse = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: CASE_RESOLVER_WORKSPACE_DOCUMENTS_KEY,
          value: serializedDetachedDocumentsPayload,
        }),
      });
    } catch (error: unknown) {
      logClientError(error);
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to persist detached Case Resolver workspace documents.';
      logCaseResolverWorkspaceEvent({
        source: input.source,
        action: 'persist_detached_documents_failed',
        durationMs: Date.now() - startedAt,
        expectedRevision: input.expectedRevision,
        message,
        mutationId: input.mutationId,
        payloadBytes: detachedDocumentsPayloadBytes,
        workspaceRevision: getCaseResolverWorkspaceRevision(workspaceForPersistPipeline),
      });
      return {
        ok: false,
        conflict: false,
        error: `Persistence failure for detached documents (Mutation: ${input.mutationId}): ${message}`,
      };
    }
    if (!detachedDocumentsResponse.ok) {
      const detachedRawText = await detachedDocumentsResponse.text();
      const detachedPayload = detachedRawText.trim().length
        ? safeParseJson<SettingsRecordLike>(detachedRawText)
        : null;
      const message =
        (detachedPayload &&
        typeof detachedPayload.value === 'string' &&
        detachedPayload.value.trim().length > 0
          ? detachedPayload.value
          : null) ??
        `Failed to persist detached Case Resolver workspace documents (${detachedDocumentsResponse.status}).`;
      logCaseResolverWorkspaceEvent({
        source: input.source,
        action: 'persist_detached_documents_failed',
        durationMs: Date.now() - startedAt,
        expectedRevision: input.expectedRevision,
        message,
        mutationId: input.mutationId,
        payloadBytes: detachedDocumentsPayloadBytes,
        workspaceRevision: getCaseResolverWorkspaceRevision(workspaceForPersistPipeline),
      });
      return {
        ok: false,
        conflict: false,
        error: `API rejection for detached documents (Mutation: ${input.mutationId}, Status: ${detachedDocumentsResponse.status}): ${message}`,
      };
    }
  }

  if (hasDetachedHistoryPayload) {
    let detachedHistoryResponse: Response;
    try {
      detachedHistoryResponse = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: CASE_RESOLVER_WORKSPACE_HISTORY_KEY,
          value: serializedDetachedHistoryPayload,
        }),
      });
    } catch (error: unknown) {
      logClientError(error);
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to persist detached Case Resolver workspace history.';
      logCaseResolverWorkspaceEvent({
        source: input.source,
        action: 'persist_detached_history_failed',
        durationMs: Date.now() - startedAt,
        expectedRevision: input.expectedRevision,
        message,
        mutationId: input.mutationId,
        payloadBytes: detachedHistoryPayloadBytes,
        workspaceRevision: getCaseResolverWorkspaceRevision(workspaceForPersistPipeline),
      });
      return {
        ok: false,
        conflict: false,
        error: message,
      };
    }
    if (!detachedHistoryResponse.ok) {
      const detachedRawText = await detachedHistoryResponse.text();
      const detachedPayload = detachedRawText.trim().length
        ? safeParseJson<SettingsRecordLike>(detachedRawText)
        : null;
      const message =
        (detachedPayload &&
        typeof detachedPayload.value === 'string' &&
        detachedPayload.value.trim().length > 0
          ? detachedPayload.value
          : null) ??
        `Failed to persist detached Case Resolver workspace history (${detachedHistoryResponse.status}).`;
      logCaseResolverWorkspaceEvent({
        source: input.source,
        action: 'persist_detached_history_failed',
        durationMs: Date.now() - startedAt,
        expectedRevision: input.expectedRevision,
        message,
        mutationId: input.mutationId,
        payloadBytes: detachedHistoryPayloadBytes,
        workspaceRevision: getCaseResolverWorkspaceRevision(workspaceForPersistPipeline),
      });
      return {
        ok: false,
        conflict: false,
        error: message,
      };
    }
  }

  let response: Response;
  try {
    response = await fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: CASE_RESOLVER_WORKSPACE_KEY,
        value: serializedWorkspace,
        expectedRevision: input.expectedRevision,
        mutationId: input.mutationId,
      }),
    });
  } catch (error: unknown) {
    logClientError(error);
    const message = error instanceof Error ? error.message : 'Failed to persist workspace.';
    logCaseResolverWorkspaceEvent({
      source: input.source,
      action: 'persist_failed',
      durationMs: Date.now() - startedAt,
      expectedRevision: input.expectedRevision,
      message,
      mutationId: input.mutationId,
      workspaceRevision: getCaseResolverWorkspaceRevision(workspaceForPersistPipeline),
    });
    return {
      ok: false,
      conflict: false,
      error: `API communication failure during persistence for mutation ${input.mutationId} at revision ${input.expectedRevision}: ${message}`,
    };
  }

  const rawText = await response.text();
  const payload = rawText.trim().length > 0 ? safeParseJson<SettingsRecordLike>(rawText) : null;

  if (response.ok) {
    const nextWorkspace = applyCaseResolverWorkspaceDetachedHistoryPayload({
      workspace: applyCaseResolverWorkspaceDetachedDocumentsPayload({
        workspace: readWorkspaceFromSettingRecord(payload, serializedWorkspace),
        detachedDocumentsPayload: hasDetachedDocumentsPayload ? detachedDocumentsPayload : null,
      }),
      detachedHistoryPayload: hasDetachedHistoryPayload ? detachedHistoryPayload : null,
    });
    logCaseResolverWorkspaceEvent({
      source: input.source,
      action: 'persist_success',
      currentRevision: getCaseResolverWorkspaceRevision(nextWorkspace),
      durationMs: Date.now() - startedAt,
      expectedRevision: input.expectedRevision,
      ...(payload?.idempotent === true ? { message: 'idempotent' } : {}),
      mutationId: input.mutationId,
      payloadBytes,
      workspaceRevision: getCaseResolverWorkspaceRevision(nextWorkspace),
    });
    return {
      ok: true,
      workspace: nextWorkspace,
      idempotent: payload?.idempotent === true,
    };
  }

  if (response.status === 409) {
    const currentWorkspace = readWorkspaceFromSettingRecord(payload, serializedWorkspace);
    const currentRevision = getCaseResolverWorkspaceRevision(currentWorkspace);
    logCaseResolverWorkspaceEvent({
      source: input.source,
      action: 'persist_conflict',
      currentRevision,
      durationMs: Date.now() - startedAt,
      expectedRevision: input.expectedRevision,
      mutationId: input.mutationId,
      payloadBytes,
      workspaceRevision: getCaseResolverWorkspaceRevision(workspaceForPersistPipeline),
    });
    return {
      ok: false,
      conflict: true,
      workspace: currentWorkspace,
      expectedRevision: input.expectedRevision,
      currentRevision,
    };
  }

  const message =
    (payload && typeof payload.value === 'string' && payload.value.trim().length > 0
      ? payload.value
      : null) ?? `Failed to persist Case Resolver workspace (${response.status}).`;
  logCaseResolverWorkspaceEvent({
    source: input.source,
    action: 'persist_failed',
    durationMs: Date.now() - startedAt,
    expectedRevision: input.expectedRevision,
    message,
    mutationId: input.mutationId,
    payloadBytes,
    workspaceRevision: getCaseResolverWorkspaceRevision(workspaceForPersistPipeline),
  });
  return {
    ok: false,
    conflict: false,
    error: message,
  };
};
