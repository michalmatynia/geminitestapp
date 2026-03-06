import {
  type CaseResolverWorkspace,
  type CaseResolverWorkspaceMetadata,
  type CaseResolverWorkspaceFetchAttemptProfile,
  type CaseResolverWorkspaceRecordFetchResult,
  type CaseResolverWorkspaceFetchIfStaleResult as FetchIfStaleResult,
} from '@/shared/contracts/case-resolver';

import { getCaseResolverWorkspaceRevision } from './utils/workspace-persistence-utils';

import { logCaseResolverWorkspaceEvent } from './workspace-observability';

import {
  CASE_RESOLVER_WORKSPACE_DOCUMENTS_KEY,
  CASE_RESOLVER_WORKSPACE_KEY,
  CASE_RESOLVER_WORKSPACE_HISTORY_KEY,
  readWorkspaceMetadata,
  resolveSettingRecordFromSettingsPayload,
  resolveWorkspaceRecordFromSettingsPayload,
  buildSettingRecordFetchAttempts,
  buildWorkspaceRecordFetchAttempts,
  type WorkspaceMetadataLike,
} from './utils/workspace-settings-persistence-helpers';

import { fetchSettingsPayloadWithTimeout } from './node-file-persistence';

import {
  CASE_RESOLVER_WORKSPACE_FETCH_TIMEOUT_MS,
  readWorkspaceFromSettingRecord,
} from './workspace-persistence-shared';
import {
  applyCaseResolverWorkspaceDetachedHistoryPayload,
  parseCaseResolverWorkspaceDetachedHistoryPayload,
  type CaseResolverWorkspaceDetachedHistoryPayload,
} from './workspace-persistence-detached-history';
import {
  applyCaseResolverWorkspaceDetachedDocumentsPayload,
  parseCaseResolverWorkspaceDetachedDocumentsPayload,
  type CaseResolverWorkspaceDetachedDocumentsPayload,
} from './workspace-persistence-detached-documents';

export type WorkspaceRecordFetchAttempt = {
  key: string;
  url: string;
  scope: 'light' | 'heavy';
};

export type WorkspaceRecordAttemptResult =
  | {
      status: 'resolved';
      workspace: CaseResolverWorkspace;
      attemptKey: string;
      scope: 'light' | 'heavy';
    }
  | {
      status: 'incomplete';
      lastFailureMessage: string;
      sawMissingRequiredFile: boolean;
      lastMissingRequiredAttemptKey: string | null;
      sawTransportFailure: boolean;
      budgetExhausted: boolean;
    };

const resolveDetachedPayloadRequiredFileId = ({
  workspace,
  requiredFileId,
}: {
  workspace: CaseResolverWorkspace;
  requiredFileId: string;
}): string => {
  if (requiredFileId.length === 0) return '';
  const requiredFile = workspace.files.find((file): boolean => file.id === requiredFileId);
  if (!requiredFile) return requiredFileId;
  if (requiredFile.fileType === 'document' || requiredFile.fileType === 'scanfile') {
    return requiredFileId;
  }
  return '';
};

const fetchWorkspaceRecordByKeyAttempts = async ({
  source,
  workspaceKey,
  attempts,
  startedAt,
  maxTotalMs,
  attemptTimeoutMs,
  requiredFileId,
  logHeavyFallback,
}: {
  source: string;
  workspaceKey: string;
  attempts: WorkspaceRecordFetchAttempt[];
  startedAt: number;
  maxTotalMs: number;
  attemptTimeoutMs: number;
  requiredFileId: string;
  logHeavyFallback: boolean;
}): Promise<WorkspaceRecordAttemptResult> => {
  let lastFailureMessage = 'Workspace record request failed.';
  let sawMissingRequiredFile = false;
  let lastMissingRequiredAttemptKey: string | null = null;
  let sawTransportFailure = false;
  let budgetExhausted = false;
  let loggedHeavyFallback = false;

  for (const attempt of attempts) {
    const elapsedMs = Date.now() - startedAt;
    const remainingBudgetMs = maxTotalMs - elapsedMs;
    if (remainingBudgetMs <= 0) {
      budgetExhausted = true;
      lastFailureMessage = `Workspace fetch budget exhausted before attempt ${attempt.key}.`;
      break;
    }
    if (logHeavyFallback && !loggedHeavyFallback && attempt.scope === 'heavy') {
      loggedHeavyFallback = true;
      logCaseResolverWorkspaceEvent({
        source,
        action: 'refresh_fallback_to_heavy',
        durationMs: Date.now() - startedAt,
        message: `fallback=heavy_keyed key=${workspaceKey}`,
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
          message: `${lastFailureMessage} key=${workspaceKey}`,
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
          message: `${lastFailureMessage} key=${workspaceKey}`,
        });
        continue;
      }
      const workspace = readWorkspaceFromSettingRecord(workspaceRecord, '');
      if (
        requiredFileId.length > 0 &&
        !workspace.files.some((file): boolean => file.id === requiredFileId)
      ) {
        sawMissingRequiredFile = true;
        lastMissingRequiredAttemptKey = attempt.key;
        lastFailureMessage = `Attempt ${attempt.key} returned workspace without required file ${requiredFileId}.`;
        logCaseResolverWorkspaceEvent({
          source,
          action: 'refresh_attempt_failed',
          durationMs: Date.now() - startedAt,
          message: `${lastFailureMessage} key=${workspaceKey}`,
        });
        continue;
      }
      logCaseResolverWorkspaceEvent({
        source,
        action: 'refresh_success',
        workspaceRevision: getCaseResolverWorkspaceRevision(workspace),
        durationMs: Date.now() - startedAt,
        message: `attempt=${attempt.key} key=${workspaceKey}`,
      });
      return {
        status: 'resolved',
        workspace,
        attemptKey: attempt.key,
        scope: attempt.scope,
      };
    } catch (error: unknown) {
      sawTransportFailure = true;
      lastFailureMessage =
        error instanceof Error ? error.message : `Unknown refresh error (${attempt.key}).`;
      logCaseResolverWorkspaceEvent({
        source,
        action: 'refresh_attempt_failed',
        durationMs: Date.now() - startedAt,
        message: `Attempt ${attempt.key} failed: ${lastFailureMessage} key=${workspaceKey}`,
      });
    }
  }

  return {
    status: 'incomplete',
    lastFailureMessage,
    sawMissingRequiredFile,
    lastMissingRequiredAttemptKey,
    sawTransportFailure,
    budgetExhausted,
  };
};

const fetchWorkspaceDetachedHistoryPayloadByKey = async ({
  source,
  scope,
  fresh,
  startedAt,
  maxTotalMs,
  attemptTimeoutMs,
  requiredFileId,
}: {
  source: string;
  scope: 'light' | 'heavy';
  fresh: boolean;
  startedAt: number;
  maxTotalMs: number;
  attemptTimeoutMs: number;
  requiredFileId: string;
}): Promise<CaseResolverWorkspaceDetachedHistoryPayload | null> => {
  const attempts = buildSettingRecordFetchAttempts({
    key: CASE_RESOLVER_WORKSPACE_HISTORY_KEY,
    strategy: scope === 'heavy' ? 'heavy_only' : 'light_only',
    fresh,
  });

  for (const attempt of attempts) {
    const elapsedMs = Date.now() - startedAt;
    const remainingBudgetMs = maxTotalMs - elapsedMs;
    if (remainingBudgetMs <= 0) return null;
    const attemptUrl =
      requiredFileId.length > 0
        ? `${attempt.url}&caseResolverFileId=${encodeURIComponent(requiredFileId)}`
        : attempt.url;
    try {
      const response = await fetchSettingsPayloadWithTimeout({
        url: attemptUrl,
        timeoutMs: Math.min(attemptTimeoutMs, remainingBudgetMs),
      });
      if (!response.ok) continue;
      const payload = (await response.json()) as unknown;
      const record = resolveSettingRecordFromSettingsPayload(
        payload,
        CASE_RESOLVER_WORKSPACE_HISTORY_KEY
      );
      if (!record || typeof record.value !== 'string') continue;
      const detachedHistoryPayload = parseCaseResolverWorkspaceDetachedHistoryPayload(record.value);
      if (!detachedHistoryPayload) continue;
      return detachedHistoryPayload;
    } catch (error: unknown) {
      logCaseResolverWorkspaceEvent({
        source,
        action: 'refresh_detached_history_failed',
        durationMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : 'Unknown detached history fetch error.',
      });
    }
  }

  return null;
};

const fetchWorkspaceDetachedDocumentsPayloadByKey = async ({
  source,
  scope,
  fresh,
  startedAt,
  maxTotalMs,
  attemptTimeoutMs,
  requiredFileId,
}: {
  source: string;
  scope: 'light' | 'heavy';
  fresh: boolean;
  startedAt: number;
  maxTotalMs: number;
  attemptTimeoutMs: number;
  requiredFileId: string;
}): Promise<CaseResolverWorkspaceDetachedDocumentsPayload | null> => {
  const attempts = buildSettingRecordFetchAttempts({
    key: CASE_RESOLVER_WORKSPACE_DOCUMENTS_KEY,
    strategy: scope === 'heavy' ? 'heavy_only' : 'light_only',
    fresh,
  });

  for (const attempt of attempts) {
    const elapsedMs = Date.now() - startedAt;
    const remainingBudgetMs = maxTotalMs - elapsedMs;
    if (remainingBudgetMs <= 0) return null;
    const attemptUrl =
      requiredFileId.length > 0
        ? `${attempt.url}&caseResolverFileId=${encodeURIComponent(requiredFileId)}`
        : attempt.url;
    try {
      const response = await fetchSettingsPayloadWithTimeout({
        url: attemptUrl,
        timeoutMs: Math.min(attemptTimeoutMs, remainingBudgetMs),
      });
      if (!response.ok) continue;
      const payload = (await response.json()) as unknown;
      const record = resolveSettingRecordFromSettingsPayload(
        payload,
        CASE_RESOLVER_WORKSPACE_DOCUMENTS_KEY
      );
      if (!record || typeof record.value !== 'string') continue;
      const detachedDocumentsPayload = parseCaseResolverWorkspaceDetachedDocumentsPayload(
        record.value
      );
      if (!detachedDocumentsPayload) continue;
      return detachedDocumentsPayload;
    } catch (error: unknown) {
      logCaseResolverWorkspaceEvent({
        source,
        action: 'refresh_detached_documents_failed',
        durationMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : 'Unknown detached documents fetch error.',
      });
    }
  }

  return null;
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
    includeDetachedHistory?: boolean;
    includeDetachedDocuments?: boolean;
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
    includeDetachedHistory?: boolean;
    includeDetachedDocuments?: boolean;
  }
): Promise<CaseResolverWorkspaceRecordFetchResult> => {
  const startedAt = Date.now();
  const fetchStrategy = options?.strategy ?? 'light_then_heavy';
  const fetchFresh = options?.fresh !== false;
  const includeDetachedHistory = options?.includeDetachedHistory === true;
  const includeDetachedDocuments = options?.includeDetachedDocuments === true;
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
    attemptProfile === 'context_fast'
      ? Math.max(1_000, attemptTimeoutMs * 3)
      : attemptTimeoutMs * attempts.length;
  const maxTotalMs =
    typeof options?.maxTotalMs === 'number' && Number.isFinite(options.maxTotalMs)
      ? Math.max(1, Math.floor(options.maxTotalMs))
      : defaultMaxTotalMs;
  const primaryResult = await fetchWorkspaceRecordByKeyAttempts({
    source,
    workspaceKey: CASE_RESOLVER_WORKSPACE_KEY,
    attempts,
    startedAt,
    maxTotalMs,
    attemptTimeoutMs,
    requiredFileId,
    logHeavyFallback: fetchStrategy === 'light_then_heavy',
  });
  if (primaryResult.status === 'resolved') {
    const detachedPayloadRequiredFileId = resolveDetachedPayloadRequiredFileId({
      workspace: primaryResult.workspace,
      requiredFileId,
    });
    const [detachedDocumentsPayload, detachedHistoryPayload] = await Promise.all([
      includeDetachedDocuments
        ? fetchWorkspaceDetachedDocumentsPayloadByKey({
          source,
          scope: primaryResult.scope,
          fresh: fetchFresh,
          startedAt,
          maxTotalMs,
          attemptTimeoutMs,
          requiredFileId: detachedPayloadRequiredFileId,
        })
        : Promise.resolve(null),
      includeDetachedHistory
        ? fetchWorkspaceDetachedHistoryPayloadByKey({
          source,
          scope: primaryResult.scope,
          fresh: fetchFresh,
          startedAt,
          maxTotalMs,
          attemptTimeoutMs,
          requiredFileId: detachedPayloadRequiredFileId,
        })
        : Promise.resolve(null),
    ]);
    const workspaceWithDetachedDocuments = includeDetachedDocuments
      ? applyCaseResolverWorkspaceDetachedDocumentsPayload({
        workspace: primaryResult.workspace,
        detachedDocumentsPayload,
      })
      : primaryResult.workspace;
    const workspaceWithDetachedHistory = includeDetachedHistory
      ? applyCaseResolverWorkspaceDetachedHistoryPayload({
        workspace: workspaceWithDetachedDocuments,
        detachedHistoryPayload,
      })
      : workspaceWithDetachedDocuments;
    if (includeDetachedHistory && detachedHistoryPayload) {
      const detachedHistoryRevision = detachedHistoryPayload.workspaceRevision;
      const workspaceRevision = getCaseResolverWorkspaceRevision(primaryResult.workspace);
      if (detachedHistoryRevision !== workspaceRevision) {
        logCaseResolverWorkspaceEvent({
          source,
          action: 'refresh_detached_history_skipped',
          durationMs: Date.now() - startedAt,
          workspaceRevision,
          message: `detached_history_revision=${detachedHistoryRevision}`,
        });
      }
    }
    return {
      status: 'resolved',
      workspace: workspaceWithDetachedHistory,
      attemptKey: primaryResult.attemptKey,
      scope: primaryResult.scope,
      source: 'resolved_v2',
      durationMs: Date.now() - startedAt,
    };
  }

  const lastFailureMessage = primaryResult.lastFailureMessage;
  const sawWorkspaceRecordMissingRequiredFile = primaryResult.sawMissingRequiredFile;
  const lastMissingRequiredAttemptKey = primaryResult.lastMissingRequiredAttemptKey;
  const sawTransportFailure = primaryResult.sawTransportFailure;
  const budgetExhausted = primaryResult.budgetExhausted;

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

  if (!sawTransportFailure && !budgetExhausted) {
    return {
      status: 'no_record',
      durationMs: Date.now() - startedAt,
      message: lastFailureMessage,
    };
  }

  const unavailableReason: 'transport_error' | 'budget_exhausted' = budgetExhausted
    ? 'budget_exhausted'
    : 'transport_error';

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
  currentRevision: number,
  options?: {
    includeDetachedHistory?: boolean;
    includeDetachedDocuments?: boolean;
    requiredFileId?: string | null;
  }
): Promise<FetchIfStaleResult> => {
  const startedAt = Date.now();
  const normalizedRevision = Math.max(0, Math.floor(currentRevision));
  const includeDetachedHistory = options?.includeDetachedHistory === true;
  const includeDetachedDocuments = options?.includeDetachedDocuments === true;
  const requiredFileId = options?.requiredFileId?.trim() ?? '';
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
        typeof serverRevisionRaw === 'number' &&
        Number.isFinite(serverRevisionRaw) &&
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
    const detachedPayloadRequiredFileId = resolveDetachedPayloadRequiredFileId({
      workspace,
      requiredFileId,
    });
    const [detachedDocumentsPayload, detachedHistoryPayload] = await Promise.all([
      includeDetachedDocuments
        ? fetchWorkspaceDetachedDocumentsPayloadByKey({
          source,
          scope: 'light',
          fresh: true,
          startedAt,
          maxTotalMs: CASE_RESOLVER_WORKSPACE_FETCH_TIMEOUT_MS,
          attemptTimeoutMs: CASE_RESOLVER_WORKSPACE_FETCH_TIMEOUT_MS,
          requiredFileId: detachedPayloadRequiredFileId,
        })
        : Promise.resolve(null),
      includeDetachedHistory
        ? fetchWorkspaceDetachedHistoryPayloadByKey({
          source,
          scope: 'light',
          fresh: true,
          startedAt,
          maxTotalMs: CASE_RESOLVER_WORKSPACE_FETCH_TIMEOUT_MS,
          attemptTimeoutMs: CASE_RESOLVER_WORKSPACE_FETCH_TIMEOUT_MS,
          requiredFileId: detachedPayloadRequiredFileId,
        })
        : Promise.resolve(null),
    ]);
    const workspaceWithDetachedDocuments = includeDetachedDocuments
      ? applyCaseResolverWorkspaceDetachedDocumentsPayload({
        workspace,
        detachedDocumentsPayload,
      })
      : workspace;
    const workspaceWithDetachedHistory = includeDetachedHistory
      ? applyCaseResolverWorkspaceDetachedHistoryPayload({
        workspace: workspaceWithDetachedDocuments,
        detachedHistoryPayload,
      })
      : workspaceWithDetachedDocuments;
    logCaseResolverWorkspaceEvent({
      source,
      action: 'conditional_fetch_updated',
      workspaceRevision: getCaseResolverWorkspaceRevision(workspaceWithDetachedHistory),
      durationMs: Date.now() - startedAt,
    });
    return { updated: true, workspace: workspaceWithDetachedHistory };
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
