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
  safeParseJson,
} from './utils/workspace-persistence-utils';

import { logCaseResolverWorkspaceEvent } from './workspace-observability';

import {
  CASE_RESOLVER_WORKSPACE_KEY,
  type SettingsRecordLike,
} from './utils/workspace-settings-persistence-helpers';

import { readCaseResolverNodeFileSnapshotStorageMode } from './node-file-persistence';

import {
  getCaseResolverWorkspaceMaxPayloadBytes,
  isCaseResolverWorkspacePayloadTooLarge,
  readWorkspaceFromSettingRecord,
} from './workspace-persistence-shared';

const CASE_RESOLVER_NODE_FILE_SNAPSHOT_STORAGE_KEYED = 'keyed';

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
  largestEntries: string[];
} => {
  const largestEntries: Array<{ label: string; bytes: number }> = [];
  const registerLargest = (label: string, bytes: number): void => {
    largestEntries.push({ label, bytes });
  };

  const fileBytes = (workspace.files ?? []).reduce((sum, file): number => {
    const bytes = JSON.stringify(file).length;
    registerLargest(`file:${file.id}:${file.name}`, bytes);
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
    largestEntries: largestEntries
      .sort((left, right): number => right.bytes - left.bytes)
      .slice(0, 5)
      .map((entry): string => `${entry.label}=${formatByteCount(entry.bytes)}`),
  };
};

const assertCanonicalNodeFileSnapshotPayload = (
  asset: CaseResolverWorkspace['assets'][number]
): void => {
  if (asset.kind !== 'node_file') return;
  const inlineText = typeof asset.textContent === 'string' ? asset.textContent.trim() : '';
  if (inlineText.length > 0) {
    throw validationError('Inline Case Resolver node-file snapshots are no longer supported.', {
      source: 'case_resolver.workspace_persist',
      assetId: asset.id,
    });
  }
  const storageMode = readCaseResolverNodeFileSnapshotStorageMode(asset);
  if (
    typeof storageMode === 'string' &&
    storageMode.trim().length > 0 &&
    storageMode !== CASE_RESOLVER_NODE_FILE_SNAPSHOT_STORAGE_KEYED
  ) {
    throw validationError('Legacy Case Resolver node-file snapshot storage mode is invalid.', {
      source: 'case_resolver.workspace_persist',
      assetId: asset.id,
      storageMode,
    });
  }
  return;
};

export const compactCaseResolverWorkspaceForPersist = (
  workspace: CaseResolverWorkspace
): CaseResolverWorkspace => {
  const compactedFiles = Array.isArray(workspace.files)
    ? workspace.files.map((file): CaseResolverWorkspace['files'][number] => {
      const fileRecord = file as unknown as Record<string, unknown>;
      const isScanFile = file.fileType === 'scanfile';
      const rawHistory = fileRecord['documentHistory'];
      const compactedHistory = Array.isArray(rawHistory)
        ? rawHistory.map((entry: unknown) => {
          if (!entry || typeof entry !== 'object') return entry;
          const entryRecord = entry as Record<string, unknown>;
          const rest = { ...entryRecord };
          if (isScanFile) {
            delete rest['documentContent'];
            delete rest['documentContentHtml'];
            delete rest['documentContentPlainText'];
          } else {
            const htmlValue =
                  typeof rest['documentContentHtml'] === 'string'
                    ? rest['documentContentHtml']
                    : '';
            if (htmlValue.trim().length > 0) {
              delete rest['documentContent'];
            }
            delete rest['documentContentMarkdown'];
            delete rest['documentContentPlainText'];
          }
          return rest;
        })
        : rawHistory;
      if (isScanFile) {
        const {
          documentContent: _content,
          documentContentHtml: _html,
          documentContentPlainText: _plainText,
          originalDocumentContent: _original,
          explodedDocumentContent: _exploded,
          ...fileRest
        } = file;
        return {
          ...fileRest,
          documentHistory: compactedHistory,
        } as CaseResolverWorkspace['files'][number];
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
      return {
        ...fileRest,
        documentHistory: compactedHistory,
      } as CaseResolverWorkspace['files'][number];
    })
    : workspace.files;

  const compactedAssets = Array.isArray(workspace.assets)
    ? workspace.assets.map((asset): CaseResolverWorkspace['assets'][number] => {
      if (asset.kind !== 'node_file') return asset;
      assertCanonicalNodeFileSnapshotPayload(asset);
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
  let workspaceForPersistPipeline = normalizedWorkspace;
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
  const serializedWorkspace = JSON.stringify(workspaceForPersist);
  const payloadBytes = serializedWorkspace.length;
  logCaseResolverWorkspaceEvent({
    source: input.source,
    action: 'persist_attempt',
    mutationId: input.mutationId,
    expectedRevision: input.expectedRevision,
    workspaceRevision: getCaseResolverWorkspaceRevision(normalizedWorkspace),
    payloadBytes,
  });
  if (isCaseResolverWorkspacePayloadTooLarge(payloadBytes)) {
    const maxPayloadBytes = getCaseResolverWorkspaceMaxPayloadBytes();
    const payloadSummary = summarizeWorkspacePersistPayload(workspaceForPersist);
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
        `nodefile_inline=${formatByteCount(payloadSummary.nodeFileInlineBytes)}`,
        `settings=${formatByteCount(payloadSummary.settingsBytes)}`,
        `largest=${payloadSummary.largestEntries.join(', ')}`,
      ].join(' '),
    });
    return {
      ok: false,
      conflict: false,
      error: message,
    };
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
    const nextWorkspace = readWorkspaceFromSettingRecord(payload, serializedWorkspace);
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
