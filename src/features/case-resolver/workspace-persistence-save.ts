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
  formatByteCount,
  getCaseResolverWorkspaceRevision,
  readPositiveIntegerEnv,
  safeParseJson,
} from './utils/workspace-persistence-utils';

import { logCaseResolverWorkspaceEvent } from './workspace-observability';

import {
  CASE_RESOLVER_WORKSPACE_DOCUMENTS_KEY,
  CASE_RESOLVER_WORKSPACE_KEY,
  CASE_RESOLVER_WORKSPACE_HISTORY_KEY,
  type SettingsRecordLike,
} from './utils/workspace-settings-persistence-helpers';

import {
  getCaseResolverWorkspaceMaxPayloadBytes,
  isCaseResolverWorkspacePayloadTooLarge,
  readWorkspaceFromSettingRecord,
} from './workspace-persistence-shared';
import {
  applyCaseResolverWorkspaceDetachedHistoryPayload,
  buildCaseResolverWorkspaceDetachedHistoryPayload,
  stripCaseResolverWorkspaceDetachedHistory,
} from './workspace-persistence-detached-history';
import {
  applyCaseResolverWorkspaceDetachedDocumentsPayload,
  buildCaseResolverWorkspaceDetachedDocumentsPayload,
  stripCaseResolverWorkspaceDetachedDocuments,
} from './workspace-persistence-detached-documents';

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
  type PersistedHistoryEntry = CaseResolverWorkspace['files'][number]['documentHistory'][number];
  const compactedFiles = Array.isArray(workspace.files)
    ? workspace.files.map((file): CaseResolverWorkspace['files'][number] => {
      const fileRecord = file as unknown as Record<string, unknown>;
      const isScanFile = file.fileType === 'scanfile';
      const rawHistory = fileRecord['documentHistory'];
      const compactedHistory: PersistedHistoryEntry[] = Array.isArray(rawHistory)
        ? rawHistory
          .slice(0, CASE_RESOLVER_WORKSPACE_PERSISTED_HISTORY_LIMIT)
          .filter(
            (entry: unknown): entry is Record<string, unknown> =>
              Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry)
          )
          .map((entryRecord): PersistedHistoryEntry => {
            const rest = { ...entryRecord };
            // Keep history snapshots lightweight in persisted workspace.
            delete rest['changes'];
            delete rest['timestamp'];
            delete rest['documentId'];
            delete rest['userId'];
            delete rest['action'];
            if (isScanFile) {
              delete rest['documentContent'];
              delete rest['documentContentHtml'];
              delete rest['documentContentPlainText'];
            } else {
              const htmlValue =
                typeof rest['documentContentHtml'] === 'string' ? rest['documentContentHtml'] : '';
              if (htmlValue.trim().length > 0) {
                delete rest['documentContent'];
              }
              delete rest['documentContentMarkdown'];
              delete rest['documentContentPlainText'];
            }
            return rest as PersistedHistoryEntry;
          })
        : [];
      if (isScanFile) {
        const {
          documentContent: _content,
          documentContentHtml: _html,
          documentContentPlainText: _plainText,
          originalDocumentContent: _original,
          explodedDocumentContent: _exploded,
          ...fileRest
        } = file;
        const compactedFile = {
          ...fileRest,
        } as CaseResolverWorkspace['files'][number];
        if (compactedHistory.length > 0) {
          compactedFile.documentHistory = compactedHistory;
        }
        if (
          Array.isArray(compactedFile.documentConversionWarnings) &&
          compactedFile.documentConversionWarnings.length === 0
        ) {
          delete (compactedFile as Record<string, unknown>)['documentConversionWarnings'];
        }
        return compactedFile;
      }
      const {
        documentContentMarkdown: _markdown,
        documentContentPlainText: _plainText,
        ...fileRest
      } = file;
      if (
        typeof file.documentContentHtml === 'string' &&
          file.documentContentHtml.trim().length > 0 &&
          'documentContent' in fileRest
      ) {
        delete (fileRest as Record<string, unknown>)['documentContent'];
      }
      const compactedFile = {
        ...fileRest,
      } as CaseResolverWorkspace['files'][number];
      if (compactedHistory.length > 0) {
        compactedFile.documentHistory = compactedHistory;
      }
      if (
        Array.isArray(compactedFile.documentConversionWarnings) &&
        compactedFile.documentConversionWarnings.length === 0
      ) {
        delete (compactedFile as Record<string, unknown>)['documentConversionWarnings'];
      }
      return compactedFile;
    })
    : workspace.files;

  const compactedAssets = Array.isArray(workspace.assets)
    ? workspace.assets.map((asset): CaseResolverWorkspace['assets'][number] => {
      if (asset.kind !== 'node_file') return asset;
      if (typeof asset.textContent === 'string' && asset.textContent.trim().length > 0) {
        throw validationError(
          'Legacy inline Case Resolver node-file snapshots are no longer supported.',
          {
            source: 'case_resolver.workspace',
            assetId: asset.id,
            reason: 'legacy_inline_node_file_snapshot',
          }
        );
      }
      const { textContent: _textContent, ...assetRest } = asset;
      return {
        ...assetRest,
      } as CaseResolverWorkspace['assets'][number];
    })
    : workspace.assets;

  return {
    ...workspace,
    files: compactedFiles,
    assets: compactedAssets,
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
    const message =
      error instanceof Error ? error.message : 'Invalid Case Resolver workspace payload.';
    logCaseResolverWorkspaceEvent({
      source: input.source,
      action: 'persist_rejected_invalid_payload',
      mutationId: input.mutationId,
      expectedRevision: input.expectedRevision,
      workspaceRevision: getCaseResolverWorkspaceRevision(input.workspace),
      durationMs: Date.now() - startedAt,
      message,
    });
    return {
      ok: false,
      conflict: false,
      error: message,
    };
  }
  const normalizedMutationId = input.mutationId.trim();
  let workspaceForPersistPipeline =
    normalizedMutationId.length > 0 && normalizedWorkspace.lastMutationId !== normalizedMutationId
      ? {
        ...normalizedWorkspace,
        lastMutationId: normalizedMutationId,
        lastMutationAt: normalizedWorkspace.lastMutationAt ?? new Date().toISOString(),
      }
      : normalizedWorkspace;
  const normalizationDiagnostics =
    getCaseResolverWorkspaceNormalizationDiagnostics(normalizedWorkspace);
  logCaseResolverWorkspaceEvent({
    source: input.source,
    action: 'ownership_normalization',
    mutationId: input.mutationId,
    workspaceRevision: getCaseResolverWorkspaceRevision(normalizedWorkspace),
    message: [
      `ownership_repaired_count=${normalizationDiagnostics.ownershipRepairedCount}`,
      `ownership_unresolved_count=${normalizationDiagnostics.ownershipUnresolvedCount}`,
      `dropped_duplicate_count=${normalizationDiagnostics.droppedDuplicateCount}`,
    ].join(' '),
  });
  let workspaceForPersist: CaseResolverWorkspace;
  try {
    workspaceForPersist = compactCaseResolverWorkspaceForPersist(workspaceForPersistPipeline);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Invalid Case Resolver workspace payload.';
    logCaseResolverWorkspaceEvent({
      source: input.source,
      action: 'persist_rejected_invalid_payload',
      mutationId: input.mutationId,
      expectedRevision: input.expectedRevision,
      workspaceRevision: getCaseResolverWorkspaceRevision(workspaceForPersistPipeline),
      durationMs: Date.now() - startedAt,
      message,
    });
    return {
      ok: false,
      conflict: false,
      error: message,
    };
  }
  const detachedHistoryPayload = buildCaseResolverWorkspaceDetachedHistoryPayload(workspaceForPersist);
  const hasDetachedHistoryPayload = detachedHistoryPayload.files.length > 0;
  const serializedDetachedHistoryPayload = hasDetachedHistoryPayload
    ? JSON.stringify(detachedHistoryPayload)
    : '';
  const detachedHistoryPayloadBytes = serializedDetachedHistoryPayload.length;
  const detachedDocumentsPayload = buildCaseResolverWorkspaceDetachedDocumentsPayload(
    workspaceForPersist
  );
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
    mutationId: input.mutationId,
    expectedRevision: input.expectedRevision,
    workspaceRevision: getCaseResolverWorkspaceRevision(normalizedWorkspace),
    payloadBytes,
  });
  if (payloadBytes >= CASE_RESOLVER_WORKSPACE_PAYLOAD_PROFILE_WARN_BYTES) {
    logCaseResolverWorkspaceEvent({
      source: input.source,
      action: 'persist_payload_profile',
      mutationId: input.mutationId,
      expectedRevision: input.expectedRevision,
      workspaceRevision: getCaseResolverWorkspaceRevision(normalizedWorkspace),
      payloadBytes,
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
      mutationId: input.mutationId,
      expectedRevision: input.expectedRevision,
      workspaceRevision: getCaseResolverWorkspaceRevision(normalizedWorkspace),
      payloadBytes,
      durationMs: Date.now() - startedAt,
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
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to persist detached Case Resolver workspace documents.';
      logCaseResolverWorkspaceEvent({
        source: input.source,
        action: 'persist_detached_documents_failed',
        mutationId: input.mutationId,
        expectedRevision: input.expectedRevision,
        workspaceRevision: getCaseResolverWorkspaceRevision(workspaceForPersistPipeline),
        payloadBytes: detachedDocumentsPayloadBytes,
        durationMs: Date.now() - startedAt,
        message,
      });
      return {
        ok: false,
        conflict: false,
        error: message,
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
        mutationId: input.mutationId,
        expectedRevision: input.expectedRevision,
        workspaceRevision: getCaseResolverWorkspaceRevision(workspaceForPersistPipeline),
        payloadBytes: detachedDocumentsPayloadBytes,
        durationMs: Date.now() - startedAt,
        message,
      });
      return {
        ok: false,
        conflict: false,
        error: message,
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
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to persist detached Case Resolver workspace history.';
      logCaseResolverWorkspaceEvent({
        source: input.source,
        action: 'persist_detached_history_failed',
        mutationId: input.mutationId,
        expectedRevision: input.expectedRevision,
        workspaceRevision: getCaseResolverWorkspaceRevision(workspaceForPersistPipeline),
        payloadBytes: detachedHistoryPayloadBytes,
        durationMs: Date.now() - startedAt,
        message,
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
        mutationId: input.mutationId,
        expectedRevision: input.expectedRevision,
        workspaceRevision: getCaseResolverWorkspaceRevision(workspaceForPersistPipeline),
        payloadBytes: detachedHistoryPayloadBytes,
        durationMs: Date.now() - startedAt,
        message,
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
    return {
      ok: false,
      conflict: false,
      error: error instanceof Error ? error.message : 'Failed to persist workspace.',
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
      mutationId: input.mutationId,
      expectedRevision: input.expectedRevision,
      workspaceRevision: getCaseResolverWorkspaceRevision(nextWorkspace),
      currentRevision: getCaseResolverWorkspaceRevision(nextWorkspace),
      payloadBytes,
      durationMs: Date.now() - startedAt,
      ...(payload?.idempotent === true ? { message: 'idempotent' } : {}),
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
      mutationId: input.mutationId,
      expectedRevision: input.expectedRevision,
      currentRevision,
      workspaceRevision: getCaseResolverWorkspaceRevision(workspaceForPersistPipeline),
      payloadBytes,
      durationMs: Date.now() - startedAt,
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
    mutationId: input.mutationId,
    expectedRevision: input.expectedRevision,
    workspaceRevision: getCaseResolverWorkspaceRevision(workspaceForPersistPipeline),
    payloadBytes,
    durationMs: Date.now() - startedAt,
    message,
  });
  return {
    ok: false,
    conflict: false,
    error: message,
  };
};
