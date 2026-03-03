import {
  type CaseResolverWorkspace,
  type CaseResolverWorkspaceDebugEvent,
  type CaseResolverWorkspaceMetadata,
  type PersistCaseResolverWorkspaceResult,
  type CaseResolverWorkspaceFetchAttemptProfile,
  type CaseResolverWorkspaceRecordFetchResult,
  type CaseResolverWorkspaceFetchIfStaleResult as FetchIfStaleResult,
} from '@/shared/contracts/case-resolver';
import { validationError } from '@/shared/errors/app-error';

import {
  getCaseResolverWorkspaceNormalizationDiagnostics,
  normalizeCaseResolverWorkspace,
  parseCaseResolverWorkspace,
} from './settings';

import {
  readPositiveIntegerEnv,
  formatByteCount,
  computeCaseResolverConflictRetryDelayMs,
  createCaseResolverWorkspaceMutationId,
  getCaseResolverWorkspaceRevision,
  stampCaseResolverWorkspaceMutation,
  safeParseJson,
} from './utils/workspace-persistence-utils';

import {
  logCaseResolverWorkspaceEvent,
  getCaseResolverWorkspaceDebugEventName,
  readCaseResolverWorkspaceDebugEvents,
} from './workspace-observability';

import {
  primeCaseResolverNavigationWorkspace,
  readCaseResolverNavigationWorkspace,
} from './utils/workspace-navigation-cache';

import {
  CASE_RESOLVER_WORKSPACE_KEY,
  readWorkspaceMetadata,
  resolveWorkspaceRecordFromSettingsPayload,
  buildWorkspaceRecordFetchAttempts,
  type SettingsRecordLike,
  type WorkspaceMetadataLike,
} from './utils/workspace-settings-persistence-helpers';

import {
  buildCaseResolverNodeFileSnapshotKey,
  CASE_RESOLVER_NODE_FILE_SNAPSHOT_STORAGE_METADATA_KEY,
  fetchSettingsPayloadWithTimeout,
  fetchCaseResolverNodeFileSnapshotText,
  fetchCaseResolverNodeFileSnapshot,
  persistCaseResolverNodeFileSnapshot,
  deleteCaseResolverNodeFileSnapshot,
  readCaseResolverNodeFileSnapshotStorageMode,
} from './node-file-persistence';

export {
  createCaseResolverWorkspaceMutationId,
  getCaseResolverWorkspaceRevision,
  stampCaseResolverWorkspaceMutation,
  logCaseResolverWorkspaceEvent,
  getCaseResolverWorkspaceDebugEventName,
  readCaseResolverWorkspaceDebugEvents,
  primeCaseResolverNavigationWorkspace,
  readCaseResolverNavigationWorkspace,
  computeCaseResolverConflictRetryDelayMs,
  buildCaseResolverNodeFileSnapshotKey,
  CASE_RESOLVER_NODE_FILE_SNAPSHOT_STORAGE_METADATA_KEY,
  fetchCaseResolverNodeFileSnapshotText,
  fetchCaseResolverNodeFileSnapshot,
  persistCaseResolverNodeFileSnapshot,
  deleteCaseResolverNodeFileSnapshot,
};
export type { CaseResolverWorkspaceDebugEvent };

const CASE_RESOLVER_NODE_FILE_SNAPSHOT_STORAGE_KEYED = 'keyed';
const CASE_RESOLVER_WORKSPACE_FETCH_TIMEOUT_MS_DEFAULT = 8_000;
const CASE_RESOLVER_WORKSPACE_MAX_PAYLOAD_BYTES_DEFAULT = 1_500_000;

const CASE_RESOLVER_WORKSPACE_MAX_PAYLOAD_BYTES = readPositiveIntegerEnv(
  'NEXT_PUBLIC_CASE_RESOLVER_WORKSPACE_MAX_PAYLOAD_BYTES',
  CASE_RESOLVER_WORKSPACE_MAX_PAYLOAD_BYTES_DEFAULT
);
const CASE_RESOLVER_WORKSPACE_FETCH_TIMEOUT_MS = readPositiveIntegerEnv(
  'NEXT_PUBLIC_CASE_RESOLVER_WORKSPACE_FETCH_TIMEOUT_MS',
  CASE_RESOLVER_WORKSPACE_FETCH_TIMEOUT_MS_DEFAULT
);

type PersistWorkspaceInput = {
  workspace: CaseResolverWorkspace;
  expectedRevision: number;
  mutationId: string;
  source: string;
};

export const getCaseResolverWorkspaceMaxPayloadBytes = (): number =>
  CASE_RESOLVER_WORKSPACE_MAX_PAYLOAD_BYTES;

export const isCaseResolverWorkspacePayloadTooLarge = (payloadBytes: number): boolean =>
  Number.isFinite(payloadBytes) && payloadBytes > CASE_RESOLVER_WORKSPACE_MAX_PAYLOAD_BYTES;

const readWorkspaceFromSettingRecord = (
  record: SettingsRecordLike | null,
  fallback: string
): CaseResolverWorkspace => {
  const rawValue = typeof record?.value === 'string' ? record.value : fallback;
  if (!rawValue.trim()) {
    return parseCaseResolverWorkspace(fallback);
  }
  return parseCaseResolverWorkspace(rawValue);
};

export const fetchCaseResolverWorkspaceMetadata = async (
  source: string
): Promise<CaseResolverWorkspaceMetadata | null> => {
  const startedAt = Date.now();
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout((): void => {
      controller.abort();
    }, CASE_RESOLVER_WORKSPACE_FETCH_TIMEOUT_MS)
    : null;
  try {
    const response = await fetch(
      `/api/settings?scope=light&fresh=1&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}&meta=1`,
      {
        method: 'GET',
        cache: 'no-store',
        ...(controller ? { signal: controller.signal } : {}),
      }
    );
    if (!response.ok) {
      logCaseResolverWorkspaceEvent({
        source,
        action: 'refresh_meta_failed',
        message: `Failed to fetch workspace metadata (${response.status}).`,
      });
      return null;
    }
    const payload = (await response.json()) as WorkspaceMetadataLike | null;
    const metadata = readWorkspaceMetadata(payload);
    logCaseResolverWorkspaceEvent({
      source,
      action: 'refresh_meta_success',
      workspaceRevision: metadata.revision,
      durationMs: Date.now() - startedAt,
    });
    return metadata;
  } catch (error: unknown) {
    logCaseResolverWorkspaceEvent({
      source,
      action: 'refresh_meta_failed',
      message: error instanceof Error ? error.message : 'Unknown metadata refresh error.',
      durationMs: Date.now() - startedAt,
    });
    return null;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

export const fetchCaseResolverWorkspaceRecord = async (
  source: string,
  options?: {
    fresh?: boolean;
    strategy?: 'light_then_heavy' | 'light_only' | 'heavy_only';
    requiredFileId?: string | null;
    attemptProfile?: CaseResolverWorkspaceFetchAttemptProfile;
    maxTotalMs?: number;
    attemptTimeoutMs?: number;
  }
): Promise<CaseResolverWorkspace | null> => {
  const result = await fetchCaseResolverWorkspaceRecordDetailed(source, options);
  return result.status === 'resolved' ? result.workspace : null;
};

export const fetchCaseResolverWorkspaceRecordDetailed = async (
  source: string,
  options?: {
    fresh?: boolean;
    strategy?: 'light_then_heavy' | 'light_only' | 'heavy_only';
    requiredFileId?: string | null;
    attemptProfile?: CaseResolverWorkspaceFetchAttemptProfile;
    maxTotalMs?: number;
    attemptTimeoutMs?: number;
  }
): Promise<CaseResolverWorkspaceRecordFetchResult> => {
  const startedAt = Date.now();
  const fetchStrategy = options?.strategy ?? 'light_then_heavy';
  const fetchFresh = options?.fresh !== false;
  const requiredFileId = options?.requiredFileId?.trim() ?? '';
  const attemptProfile = options?.attemptProfile ?? 'default';
  const attempts = buildWorkspaceRecordFetchAttempts({
    strategy: fetchStrategy,
    fresh: fetchFresh,
    attemptProfile,
  });
  const attemptTimeoutMs =
    typeof options?.attemptTimeoutMs === 'number' && Number.isFinite(options.attemptTimeoutMs)
      ? Math.max(1, Math.floor(options.attemptTimeoutMs))
      : CASE_RESOLVER_WORKSPACE_FETCH_TIMEOUT_MS;
  const defaultMaxTotalMs =
    attemptProfile === 'context_fast' ? Math.max(1_000, attemptTimeoutMs * 3) : attemptTimeoutMs * attempts.length;
  const maxTotalMs =
    typeof options?.maxTotalMs === 'number' && Number.isFinite(options.maxTotalMs)
      ? Math.max(1, Math.floor(options.maxTotalMs))
      : defaultMaxTotalMs;

  let lastFailureMessage = 'Workspace record request failed.';
  let loggedHeavyFallback = false;
  let sawWorkspaceRecordMissingRequiredFile = false;
  let lastMissingRequiredAttemptKey: string | null = null;
  let sawTransportFailure = false;
  let budgetExhausted = false;

  for (const attempt of attempts) {
    const elapsedMs = Date.now() - startedAt;
    const remainingBudgetMs = maxTotalMs - elapsedMs;
    if (remainingBudgetMs <= 0) {
      budgetExhausted = true;
      lastFailureMessage = `Workspace fetch budget exhausted before attempt ${attempt.key}.`;
      break;
    }
    if (!loggedHeavyFallback && fetchStrategy === 'light_then_heavy' && attempt.scope === 'heavy') {
      loggedHeavyFallback = true;
      logCaseResolverWorkspaceEvent({
        source,
        action: 'refresh_fallback_to_heavy',
        durationMs: Date.now() - startedAt,
        message: 'fallback=heavy_keyed',
      });
    }
    try {
      const response = await fetchSettingsPayloadWithTimeout({
        url: attempt.url,
        timeoutMs: Math.min(attemptTimeoutMs, remainingBudgetMs),
      });
      if (!response.ok) {
        sawTransportFailure = true;
        lastFailureMessage = `Attempt ${attempt.key} failed (${response.status}).`;
        logCaseResolverWorkspaceEvent({
          source,
          action: 'refresh_attempt_failed',
          durationMs: Date.now() - startedAt,
          message: lastFailureMessage,
        });
        continue;
      }
      const payload = (await response.json()) as unknown;
      const workspaceRecord = resolveWorkspaceRecordFromSettingsPayload(payload);
      if (!workspaceRecord) {
        lastFailureMessage = `Attempt ${attempt.key} returned no workspace record.`;
        logCaseResolverWorkspaceEvent({
          source,
          action: 'refresh_attempt_failed',
          durationMs: Date.now() - startedAt,
          message: lastFailureMessage,
        });
        continue;
      }
      const workspace = readWorkspaceFromSettingRecord(workspaceRecord, '');
      if (
        requiredFileId.length > 0 &&
        !workspace.files.some((file): boolean => file.id === requiredFileId)
      ) {
        sawWorkspaceRecordMissingRequiredFile = true;
        lastMissingRequiredAttemptKey = attempt.key;
        lastFailureMessage = `Attempt ${attempt.key} returned workspace without required file ${requiredFileId}.`;
        logCaseResolverWorkspaceEvent({
          source,
          action: 'refresh_attempt_failed',
          durationMs: Date.now() - startedAt,
          message: lastFailureMessage,
        });
        continue;
      }
      logCaseResolverWorkspaceEvent({
        source,
        action: 'refresh_success',
        workspaceRevision: getCaseResolverWorkspaceRevision(workspace),
        durationMs: Date.now() - startedAt,
        message: `attempt=${attempt.key}`,
      });
      return {
        status: 'resolved',
        workspace,
        attemptKey: attempt.key,
        scope: attempt.scope,
        durationMs: Date.now() - startedAt,
      };
    } catch (error: unknown) {
      sawTransportFailure = true;
      lastFailureMessage =
        error instanceof Error ? error.message : `Unknown refresh error (${attempt.key}).`;
      logCaseResolverWorkspaceEvent({
        source,
        action: 'refresh_attempt_failed',
        durationMs: Date.now() - startedAt,
        message: `Attempt ${attempt.key} failed: ${lastFailureMessage}`,
      });
    }
  }

  if (budgetExhausted) {
    logCaseResolverWorkspaceEvent({
      source,
      action: 'refresh_budget_exhausted',
      durationMs: Date.now() - startedAt,
      message: `attempt_profile=${attemptProfile} max_total_ms=${maxTotalMs}`,
    });
  }

  if (
    requiredFileId.length > 0 &&
    sawWorkspaceRecordMissingRequiredFile &&
    !sawTransportFailure &&
    !budgetExhausted
  ) {
    return {
      status: 'missing_required_file',
      attemptKey: lastMissingRequiredAttemptKey,
      durationMs: Date.now() - startedAt,
      message: lastFailureMessage,
    };
  }

  const unavailableReason: 'no_workspace_record' | 'transport_error' | 'budget_exhausted' =
    budgetExhausted ? 'budget_exhausted' : sawTransportFailure ? 'transport_error' : 'no_workspace_record';

  logCaseResolverWorkspaceEvent({
    source,
    action: 'refresh_failed',
    message: lastFailureMessage,
    durationMs: Date.now() - startedAt,
  });

  return {
    status: 'unavailable',
    reason: unavailableReason,
    durationMs: Date.now() - startedAt,
    message: lastFailureMessage,
  };
};

export const fetchCaseResolverWorkspaceSnapshot = async (
  source: string
): Promise<CaseResolverWorkspace | null> => {
  return await fetchCaseResolverWorkspaceRecord(source, { fresh: true });
};

export const fetchCaseResolverWorkspaceIfStale = async (
  source: string,
  currentRevision: number
): Promise<FetchIfStaleResult> => {
  const startedAt = Date.now();
  const normalizedRevision = Math.max(0, Math.floor(currentRevision));
  const url =
    `/api/settings?key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}` +
    `&fresh=1&ifRevisionGt=${normalizedRevision}`;
  try {
    const response = await fetchSettingsPayloadWithTimeout({
      url,
      timeoutMs: CASE_RESOLVER_WORKSPACE_FETCH_TIMEOUT_MS,
    });
    if (!response.ok) {
      logCaseResolverWorkspaceEvent({
        source,
        action: 'conditional_fetch_failed',
        message: `HTTP ${response.status}`,
        durationMs: Date.now() - startedAt,
      });
      return { updated: false, revision: normalizedRevision };
    }
    const payload = (await response.json()) as unknown;
    if (
      payload !== null &&
      typeof payload === 'object' &&
      !Array.isArray(payload) &&
      (payload as Record<string, unknown>)['upToDate'] === true
    ) {
      const serverRevisionRaw = (payload as Record<string, unknown>)['revision'];
      const revision =
        typeof serverRevisionRaw === 'number' && Number.isFinite(serverRevisionRaw) &&
        serverRevisionRaw > 0
          ? Math.floor(serverRevisionRaw)
          : normalizedRevision;
      logCaseResolverWorkspaceEvent({
        source,
        action: 'conditional_fetch_up_to_date',
        workspaceRevision: revision,
        durationMs: Date.now() - startedAt,
      });
      return { updated: false, revision };
    }
    const workspaceRecord = resolveWorkspaceRecordFromSettingsPayload(payload);
    if (!workspaceRecord) {
      logCaseResolverWorkspaceEvent({
        source,
        action: 'conditional_fetch_no_record',
        durationMs: Date.now() - startedAt,
      });
      return { updated: false, revision: normalizedRevision };
    }
    const workspace = readWorkspaceFromSettingRecord(workspaceRecord, '');
    logCaseResolverWorkspaceEvent({
      source,
      action: 'conditional_fetch_updated',
      workspaceRevision: getCaseResolverWorkspaceRevision(workspace),
      durationMs: Date.now() - startedAt,
    });
    return { updated: true, workspace };
  } catch (error: unknown) {
    logCaseResolverWorkspaceEvent({
      source,
      action: 'conditional_fetch_error',
      message: error instanceof Error ? error.message : 'Unknown error',
      durationMs: Date.now() - startedAt,
    });
    return { updated: false, revision: normalizedRevision };
  }
};

const summarizeWorkspacePersistPayload = (workspace: CaseResolverWorkspace): {
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

const sanitizeCanonicalNodeFileSnapshotPayload = (
  asset: CaseResolverWorkspace['assets'][number]
): CaseResolverWorkspace['assets'][number] => {
  if (asset.kind !== 'node_file') return asset;
  const inlineText = typeof asset.textContent === 'string' ? asset.textContent.trim() : '';
  if (inlineText.length > 0) {
    throw validationError('Inline Case Resolver node-file snapshots are no longer supported.', {
      source: 'case_resolver.workspace_persistence',
      assetId: asset.id,
      reason: 'inline_node_file_snapshot_not_supported',
    });
  }
  const storageMode = readCaseResolverNodeFileSnapshotStorageMode(asset);
  if (storageMode && storageMode !== CASE_RESOLVER_NODE_FILE_SNAPSHOT_STORAGE_KEYED) {
    throw validationError(
      'Legacy Case Resolver node-file snapshot storage metadata is no longer supported.',
      {
        source: 'case_resolver.workspace_persistence',
        assetId: asset.id,
        reason: 'legacy_snapshot_storage_mode_not_supported',
        storageMode,
      }
    );
  }
  return asset;
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
      return {
        ...fileRest,
        documentHistory: compactedHistory,
      } as CaseResolverWorkspace['files'][number];
    })
    : workspace.files;

  const compactedAssets = Array.isArray(workspace.assets)
    ? workspace.assets.map((asset): CaseResolverWorkspace['assets'][number] => {
      if (asset.kind !== 'node_file') return asset;
      const sanitizedAsset = sanitizeCanonicalNodeFileSnapshotPayload(asset);
      const { textContent: _textContent, ...assetRest } = sanitizedAsset;
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
      error instanceof Error
        ? error.message
        : 'Invalid Case Resolver workspace payload.';
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
