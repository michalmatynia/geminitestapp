import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  CaseResolverWorkspace,
  CaseResolverRequestedCaseIssue,
  CaseResolverRequestedCaseStatus,
} from '@/shared/contracts/case-resolver';
import {
  fetchCaseResolverWorkspaceRecordDetailed,
  getCaseResolverWorkspaceRevision,
  logCaseResolverWorkspaceEvent,
} from '../workspace-persistence';
import { shouldAdoptIncomingWorkspace } from './useCaseResolverState.helpers.hydration';
import {
  buildRequestedContextRequestKey,
  hasRequestedCaseFile,
  hasValidRequestedContextInFlight,
  resolveRequestedCaseIssueAfterRefresh,
  shouldQueueRequestedContextAutoClear,
  shouldStartRequestedContextFetch,
} from './useCaseResolverState.helpers.requested-context';
import {
  reduceRequestedContextState,
  type CaseResolverRuntimeRequestedContextSlice,
  type RequestedContextEvent,
} from '../runtime';

const CASE_RESOLVER_REQUESTED_CONTEXT_FETCH_ATTEMPT_TIMEOUT_MS = 2_200;
const CASE_RESOLVER_REQUESTED_CONTEXT_FETCH_MAX_TOTAL_MS = 6_500;
const CASE_RESOLVER_REQUESTED_CONTEXT_STORE_HYDRATION_GRACE_MS = 1_200;
export const CASE_RESOLVER_REQUESTED_CONTEXT_LOADING_WATCHDOG_MS = 10_000;

type RequestedContextInFlightState = {
  requestKey: string;
  requestedFileId: string;
  startedAtMs: number;
};

type RequestedContextTransitionResolvedVia =
  | 'workspace_presence'
  | 'snapshot_fetch'
  | 'watchdog'
  | 'manual'
  | 'auto_clear'
  | 'none';

const mapRequestedContextRuntimeToLegacyStatus = (
  status: CaseResolverRuntimeRequestedContextSlice['status']
): CaseResolverRequestedCaseStatus => {
  if (status === 'loading') return 'loading';
  if (status === 'missing_not_found' || status === 'missing_unavailable') {
    return 'missing';
  }
  return 'ready';
};

const createInitialRequestedContextRuntimeState = (
  requestedFileId: string | null
): CaseResolverRuntimeRequestedContextSlice => {
  const normalizedRequestedFileId = requestedFileId?.trim() ?? '';
  if (!normalizedRequestedFileId) {
    return {
      requestedFileId: null,
      retryTick: 0,
      status: 'idle',
      issue: null,
      inFlightRequestKey: null,
      attemptedRequestKey: null,
      startedAtMs: null,
    };
  }
  return {
    requestedFileId: normalizedRequestedFileId,
    retryTick: 0,
    status: 'loading',
    issue: null,
    inFlightRequestKey: null,
    attemptedRequestKey: null,
    startedAtMs: null,
  };
};

export interface UseCaseResolverRequestedContextValue {
  requestedCaseStatus: CaseResolverRequestedCaseStatus;
  requestedCaseIssue: CaseResolverRequestedCaseIssue | null;
  requestedContextAutoClearRequestKey: string | null;
  setRequestedCaseStatus: (status: CaseResolverRequestedCaseStatus) => void;
  handleAcknowledgeRequestedContextAutoClear: (requestKey: string | null) => void;
  handleRetryCaseContext: () => void;
  resetRequestedContextState: () => void;
}

export function useCaseResolverStateRequestedContext({
  requestedFileId,
  workspace,
  workspaceRef,
  setWorkspace,
  isMountedRef,
  handledRequestedFileIdRef,
  syncPersistedWorkspaceTracking,
  clearQueuedWorkspacePersistMutation,
  isStoreLoading,
  isStoreFetching,
  storeWorkspaceHasRequestedFile,
  isPromptExploderReturnFlow,
}: {
  requestedFileId: string | null;
  workspace: CaseResolverWorkspace;
  workspaceRef: React.MutableRefObject<CaseResolverWorkspace>;
  setWorkspace: React.Dispatch<React.SetStateAction<CaseResolverWorkspace>>;
  isMountedRef: React.MutableRefObject<boolean>;
  handledRequestedFileIdRef: React.MutableRefObject<string | null>;
  syncPersistedWorkspaceTracking: (workspace: CaseResolverWorkspace) => void;
  clearQueuedWorkspacePersistMutation: () => void;
  isStoreLoading: boolean;
  isStoreFetching: boolean;
  storeWorkspaceHasRequestedFile: boolean;
  isPromptExploderReturnFlow: boolean;
}): UseCaseResolverRequestedContextValue {
  const initialRequestedContextRuntimeState = useMemo(
    (): CaseResolverRuntimeRequestedContextSlice =>
      createInitialRequestedContextRuntimeState(requestedFileId),
    [requestedFileId]
  );

  const [requestedCaseStatus, setRequestedCaseStatusState] =
    useState<CaseResolverRequestedCaseStatus>(
      mapRequestedContextRuntimeToLegacyStatus(initialRequestedContextRuntimeState.status)
    );
  const [requestedCaseIssue, setRequestedCaseIssueState] =
    useState<CaseResolverRequestedCaseIssue | null>(initialRequestedContextRuntimeState.issue);
  const [requestedContextRetryTick, setRequestedContextRetryTick] = useState(
    initialRequestedContextRuntimeState.retryTick
  );
  const [requestedContextAutoClearRequestKey, setRequestedContextAutoClearRequestKey] = useState<
    string | null
  >(null);

  const requestedWorkspaceRefreshFileIdRef = useRef<string | null>(null);
  const requestedWorkspaceMissingFileIdRef = useRef<string | null>(null);
  const requestedCaseStatusRef = useRef<CaseResolverRequestedCaseStatus>(
    mapRequestedContextRuntimeToLegacyStatus(initialRequestedContextRuntimeState.status)
  );
  const requestedCaseIssueRef = useRef<CaseResolverRequestedCaseIssue | null>(
    initialRequestedContextRuntimeState.issue
  );
  const requestedContextRetryTickRef = useRef<number>(
    initialRequestedContextRuntimeState.retryTick
  );
  const requestedContextRuntimeStateRef = useRef<CaseResolverRuntimeRequestedContextSlice>(
    initialRequestedContextRuntimeState
  );
  const requestedContextInFlightRef = useRef<RequestedContextInFlightState | null>(null);
  const requestedContextAttemptKeyRef = useRef<string | null>(null);
  const requestedContextStartedAtRef = useRef<number | null>(null);
  const requestedContextAutoClearRequestKeyRef = useRef<string | null>(null);
  const requestedContextLastQueuedAutoClearKeyRef = useRef<string | null>(null);
  const requestedContextStoreHydrationWaitRequestKeyRef = useRef<string | null>(null);
  const lastLoggedRequestedContextSignatureRef = useRef<string>('');

  const setRequestedCaseStatus = useCallback(
    (nextStatus: CaseResolverRequestedCaseStatus): void => {
      if (requestedCaseStatusRef.current === nextStatus) return;
      requestedCaseStatusRef.current = nextStatus;
      setRequestedCaseStatusState(nextStatus);
    },
    []
  );

  const setRequestedCaseIssue = useCallback(
    (nextIssue: CaseResolverRequestedCaseIssue | null): void => {
      if (requestedCaseIssueRef.current === nextIssue) return;
      requestedCaseIssueRef.current = nextIssue;
      setRequestedCaseIssueState(nextIssue);
    },
    []
  );

  const applyRequestedContextEvent = useCallback(
    (event: RequestedContextEvent): CaseResolverRuntimeRequestedContextSlice => {
      const nextState = reduceRequestedContextState(requestedContextRuntimeStateRef.current, event);
      requestedContextRuntimeStateRef.current = nextState;
      setRequestedCaseStatus(mapRequestedContextRuntimeToLegacyStatus(nextState.status));
      setRequestedCaseIssue(nextState.issue);
      if (requestedContextRetryTickRef.current !== nextState.retryTick) {
        requestedContextRetryTickRef.current = nextState.retryTick;
        setRequestedContextRetryTick(nextState.retryTick);
      }
      requestedContextAttemptKeyRef.current = nextState.attemptedRequestKey;
      requestedContextStartedAtRef.current = nextState.startedAtMs;
      if (!nextState.inFlightRequestKey) {
        requestedContextInFlightRef.current = null;
      } else {
        requestedContextInFlightRef.current = {
          requestKey: nextState.inFlightRequestKey,
          requestedFileId: nextState.requestedFileId ?? '',
          startedAtMs: nextState.startedAtMs ?? Date.now(),
        };
      }
      return nextState;
    },
    [setRequestedCaseIssue, setRequestedCaseStatus]
  );

  const logRequestedContextTransition = useCallback(
    (
      action: string,
      input?: {
        message?: string;
        requestKey?: string | null;
        resolvedVia?: RequestedContextTransitionResolvedVia;
      }
    ): void => {
      const message = input?.message;
      const requestKey = input?.requestKey ?? null;
      const resolvedVia = input?.resolvedVia ?? 'none';
      const normalizedRequestedFileId = requestedFileId?.trim() ?? '';
      const signature = [
        action,
        normalizedRequestedFileId,
        requestedCaseStatusRef.current,
        requestedCaseIssueRef.current ?? 'none',
        requestKey ?? 'none',
        resolvedVia,
        requestedContextInFlightRef.current?.requestKey ?? 'none',
        requestedContextAttemptKeyRef.current ?? 'none',
        message ?? '',
      ].join('|');
      if (lastLoggedRequestedContextSignatureRef.current === signature) return;
      lastLoggedRequestedContextSignatureRef.current = signature;
      logCaseResolverWorkspaceEvent({
        source: 'case_view',
        action,
        message: [
          normalizedRequestedFileId
            ? `requested_file_id=${normalizedRequestedFileId}`
            : 'requested_file_id=<none>',
          `request_key=${requestKey ?? 'none'}`,
          `in_flight=${requestedContextInFlightRef.current?.requestKey ?? 'none'}`,
          `attempted_key=${requestedContextAttemptKeyRef.current ?? 'none'}`,
          `resolved_via=${resolvedVia}`,
          `requested_case_status=${requestedCaseStatusRef.current}`,
          `requested_case_issue=${requestedCaseIssueRef.current ?? 'none'}`,
          message ?? '',
        ]
          .filter(Boolean)
          .join(' '),
      });
    },
    [requestedFileId]
  );

  const queueRequestedContextAutoClear = useCallback(
    ({
      requestKey,
      issue,
      message,
    }: {
      requestKey: string | null;
      issue: CaseResolverRequestedCaseIssue | null;
      message: string;
    }): void => {
      const normalizedRequestKey = requestKey?.trim() ?? '';
      if (issue === 'workspace_unavailable') {
        logRequestedContextTransition('requested_context_auto_clear_suppressed_unavailable', {
          message: `${message} reason_tag=auto_clear_suppressed_unavailable`,
          requestKey: normalizedRequestKey || requestedContextAttemptKeyRef.current,
          resolvedVia: 'none',
        });
        return;
      }
      if (
        !shouldQueueRequestedContextAutoClear({
          requestedFileId,
          requestedCaseStatus: 'missing',
          requestedCaseIssue: issue,
          requestKey: normalizedRequestKey,
          lastQueuedRequestKey: requestedContextLastQueuedAutoClearKeyRef.current,
        })
      ) {
        return;
      }
      requestedContextLastQueuedAutoClearKeyRef.current = normalizedRequestKey;
      requestedContextAutoClearRequestKeyRef.current = normalizedRequestKey;
      setRequestedContextAutoClearRequestKey(normalizedRequestKey);
      logRequestedContextTransition('requested_context_auto_cleared', {
        message,
        requestKey: normalizedRequestKey,
        resolvedVia: 'auto_clear',
      });
    },
    [logRequestedContextTransition, requestedFileId]
  );

  const handleAcknowledgeRequestedContextAutoClear = useCallback(
    (requestKey: string | null): void => {
      const normalizedRequestKey =
        requestKey?.trim() ?? requestedContextAutoClearRequestKeyRef.current?.trim() ?? '';
      if (!normalizedRequestKey) return;
      requestedContextLastQueuedAutoClearKeyRef.current = normalizedRequestKey;
      if (requestedContextAutoClearRequestKeyRef.current === normalizedRequestKey) {
        requestedContextAutoClearRequestKeyRef.current = null;
      }
      setRequestedContextAutoClearRequestKey((current: string | null): string | null =>
        current === normalizedRequestKey ? null : current
      );
    },
    []
  );

  const resetTransientRefs = useCallback((): void => {
    requestedWorkspaceRefreshFileIdRef.current = null;
    requestedWorkspaceMissingFileIdRef.current = null;
    requestedContextInFlightRef.current = null;
    requestedContextAttemptKeyRef.current = null;
    requestedContextStartedAtRef.current = null;
    requestedContextAutoClearRequestKeyRef.current = null;
    requestedContextLastQueuedAutoClearKeyRef.current = null;
    requestedContextStoreHydrationWaitRequestKeyRef.current = null;
    handledRequestedFileIdRef.current = null;
    setRequestedContextAutoClearRequestKey(null);
  }, [handledRequestedFileIdRef]);

  const handleRetryCaseContext = useCallback((): void => {
    const normalizedRequestedFileId = requestedFileId?.trim() ?? '';
    if (!normalizedRequestedFileId) {
      applyRequestedContextEvent({
        type: 'query_changed',
        requestedFileId: null,
      });
      return;
    }
    const nextRequestedContextState = applyRequestedContextEvent({
      type: 'retry',
    });
    const nextRequestKey = buildRequestedContextRequestKey(
      normalizedRequestedFileId,
      nextRequestedContextState.retryTick
    );
    resetTransientRefs();
    requestedWorkspaceRefreshFileIdRef.current = normalizedRequestedFileId;
    logRequestedContextTransition('requested_context_loading', {
      message: 'Manual retry requested.',
      requestKey: nextRequestKey,
      resolvedVia: 'manual',
    });
  }, [
    applyRequestedContextEvent,
    logRequestedContextTransition,
    requestedFileId,
    resetTransientRefs,
  ]);

  const resetRequestedContextState = useCallback((): void => {
    resetTransientRefs();
    applyRequestedContextEvent({ type: 'reset' });
    logRequestedContextTransition('requested_context_reset', {
      message: 'Case context reset requested.',
      resolvedVia: 'manual',
    });
  }, [applyRequestedContextEvent, logRequestedContextTransition, resetTransientRefs]);

  useEffect((): void => {
    applyRequestedContextEvent({
      type: 'query_changed',
      requestedFileId,
    });
  }, [applyRequestedContextEvent, requestedFileId]);

  useEffect(() => {
    const normalizedRequestedFileId = requestedFileId?.trim() ?? '';
    if (!normalizedRequestedFileId) {
      resetTransientRefs();
      applyRequestedContextEvent({
        type: 'query_changed',
        requestedFileId: null,
      });
      logRequestedContextTransition('requested_context_ready', {
        message: 'No requested file in query.',
        resolvedVia: 'none',
      });
      return;
    }

    const hasRequestedFileInWorkspace = hasRequestedCaseFile(
      workspace.files,
      normalizedRequestedFileId
    );
    if (!hasRequestedFileInWorkspace) return;

    if (requestedContextStoreHydrationWaitRequestKeyRef.current) {
      logRequestedContextTransition('requested_context_resolved_after_store_hydration', {
        message: 'Requested file resolved after waiting for store hydration.',
        requestKey: requestedContextStoreHydrationWaitRequestKeyRef.current,
        resolvedVia: 'workspace_presence',
      });
    }

    resetTransientRefs();
    applyRequestedContextEvent({
      type: 'workspace_contains_requested',
    });
    logRequestedContextTransition('requested_context_ready', {
      message: 'Requested file resolved in workspace.',
      resolvedVia: 'workspace_presence',
    });
  }, [
    applyRequestedContextEvent,
    logRequestedContextTransition,
    requestedFileId,
    resetTransientRefs,
    workspace.files,
  ]);

  useEffect(() => {
    const normalizedRequestedFileId = requestedFileId?.trim() ?? '';
    if (!normalizedRequestedFileId) return;
    if (hasRequestedCaseFile(workspaceRef.current.files, normalizedRequestedFileId)) return;

    const requestKey = buildRequestedContextRequestKey(
      normalizedRequestedFileId,
      requestedContextRetryTick
    );
    const shouldStartFetch = shouldStartRequestedContextFetch({
      currentRequestKey: requestKey,
      attemptedRequestKey: requestedContextAttemptKeyRef.current,
      inFlightRequestKey: requestedContextInFlightRef.current?.requestKey ?? null,
      currentStatus: requestedCaseStatusRef.current,
    });
    if (!shouldStartFetch) return;

    const startedAtMs = Date.now();
    requestedWorkspaceRefreshFileIdRef.current = normalizedRequestedFileId;
    requestedWorkspaceMissingFileIdRef.current = null;
    handledRequestedFileIdRef.current = null;
    applyRequestedContextEvent({
      type: 'refresh_started',
      requestKey,
      startedAtMs,
    });
    logRequestedContextTransition('requested_context_loading', {
      message: 'Refreshing workspace for requested file.',
      requestKey,
      resolvedVia: 'snapshot_fetch',
    });

    void (async (): Promise<void> => {
      const refreshedWorkspaceResult = await fetchCaseResolverWorkspaceRecordDetailed(
        'case_view_requested_context_resolve',
        {
          requiredFileId: normalizedRequestedFileId,
          attemptProfile: 'context_fast',
          maxTotalMs: CASE_RESOLVER_REQUESTED_CONTEXT_FETCH_MAX_TOTAL_MS,
          attemptTimeoutMs: CASE_RESOLVER_REQUESTED_CONTEXT_FETCH_ATTEMPT_TIMEOUT_MS,
          includeDetachedHistory: true,
        }
      );
      if (!isMountedRef.current) return;
      const currentInFlight = requestedContextInFlightRef.current;
      if (currentInFlight?.requestKey !== requestKey) return;

      requestedContextInFlightRef.current = null;
      requestedContextStartedAtRef.current = null;

      const latestRequestedFileId = requestedFileId?.trim() ?? '';
      if (!latestRequestedFileId || latestRequestedFileId !== normalizedRequestedFileId) {
        return;
      }

      if (
        refreshedWorkspaceResult.status === 'unavailable' ||
        refreshedWorkspaceResult.status === 'no_record'
      ) {
        if (
          refreshedWorkspaceResult.status === 'unavailable' &&
          refreshedWorkspaceResult.reason === 'budget_exhausted'
        ) {
          logRequestedContextTransition('requested_context_fetch_budget_exhausted', {
            message: `Fetch chain exhausted budget before resolving context. ${refreshedWorkspaceResult.message}`,
            requestKey,
            resolvedVia: 'snapshot_fetch',
          });
        }
        if (hasRequestedCaseFile(workspaceRef.current.files, normalizedRequestedFileId)) {
          requestedWorkspaceRefreshFileIdRef.current = null;
          requestedWorkspaceMissingFileIdRef.current = null;
          handledRequestedFileIdRef.current = null;
          applyRequestedContextEvent({
            type: 'workspace_contains_requested',
          });
          logRequestedContextTransition('requested_context_ready', {
            message:
              'Workspace refresh failed but requested file resolved from in-memory workspace.',
            requestKey,
            resolvedVia: 'workspace_presence',
          });
          return;
        }
        const shouldWaitForStoreHydration =
          requestedContextStoreHydrationWaitRequestKeyRef.current !== requestKey &&
          (isStoreLoading ||
            isStoreFetching ||
            storeWorkspaceHasRequestedFile ||
            isPromptExploderReturnFlow);
        if (shouldWaitForStoreHydration) {
          requestedContextStoreHydrationWaitRequestKeyRef.current = requestKey;
          requestedWorkspaceRefreshFileIdRef.current = normalizedRequestedFileId;
          requestedWorkspaceMissingFileIdRef.current = null;
          handledRequestedFileIdRef.current = null;
          logRequestedContextTransition('requested_context_waiting_for_store_hydration', {
            message: [
              `store_loading=${isStoreLoading ? 'true' : 'false'}`,
              `store_fetching=${isStoreFetching ? 'true' : 'false'}`,
              `store_has_requested=${storeWorkspaceHasRequestedFile ? 'true' : 'false'}`,
              `prompt_return_flow=${isPromptExploderReturnFlow ? 'true' : 'false'}`,
              `refresh_reason=${
                refreshedWorkspaceResult.status === 'unavailable'
                  ? refreshedWorkspaceResult.reason
                  : refreshedWorkspaceResult.status
              }`,
            ].join(' '),
            requestKey,
            resolvedVia: 'snapshot_fetch',
          });
          window.setTimeout((): void => {
            if (!isMountedRef.current) return;
            if (requestedCaseStatusRef.current !== 'loading') return;
            if (requestedContextAttemptKeyRef.current !== requestKey) return;
            applyRequestedContextEvent({ type: 'retry' });
          }, CASE_RESOLVER_REQUESTED_CONTEXT_STORE_HYDRATION_GRACE_MS);
          return;
        }
        const requestedIssueAfterRefresh = resolveRequestedCaseIssueAfterRefresh({
          refreshSucceeded: false,
          hasRequestedFileAfterRefresh: false,
        });
        requestedWorkspaceMissingFileIdRef.current = normalizedRequestedFileId;
        requestedWorkspaceRefreshFileIdRef.current = null;
        handledRequestedFileIdRef.current = null;
        applyRequestedContextEvent({
          type: 'refresh_failed',
        });
        logRequestedContextTransition('requested_context_missing_fetch_failed', {
          message: 'Workspace refresh failed while resolving requested file.',
          requestKey,
          resolvedVia: 'snapshot_fetch',
        });
        queueRequestedContextAutoClear({
          requestKey,
          issue: requestedIssueAfterRefresh,
          message: `Auto-cleared stale URL context after refresh failure. ${refreshedWorkspaceResult.message}`,
        });
        return;
      }

      if (refreshedWorkspaceResult.status === 'missing_required_file') {
        requestedWorkspaceMissingFileIdRef.current = normalizedRequestedFileId;
        requestedWorkspaceRefreshFileIdRef.current = null;
        handledRequestedFileIdRef.current = null;
        applyRequestedContextEvent({
          type: 'refresh_succeeded_missing',
        });
        logRequestedContextTransition('requested_context_missing_not_found', {
          message: 'Requested file not found in refreshed workspace record.',
          requestKey,
          resolvedVia: 'snapshot_fetch',
        });
        queueRequestedContextAutoClear({
          requestKey,
          issue: 'requested_file_missing',
          message: 'Auto-cleared stale URL context after requested file was not found.',
        });
        return;
      }

      const refreshedWorkspace = refreshedWorkspaceResult.workspace;

      const refreshedHasRequestedFile = hasRequestedCaseFile(
        refreshedWorkspace.files,
        normalizedRequestedFileId
      );
      const requestedIssueAfterRefresh = resolveRequestedCaseIssueAfterRefresh({
        refreshSucceeded: true,
        hasRequestedFileAfterRefresh: refreshedHasRequestedFile,
      });

      if (requestedIssueAfterRefresh === null) {
        setWorkspace((current: CaseResolverWorkspace): CaseResolverWorkspace => {
          const hydrationDecision = shouldAdoptIncomingWorkspace({
            current,
            incoming: refreshedWorkspace,
            requestedFileId: normalizedRequestedFileId,
          });
          if (!hydrationDecision.adopt) return current;
          if (hydrationDecision.reason === 'equal_revision_current_placeholder') {
            logCaseResolverWorkspaceEvent({
              source: 'case_view_requested_context_resolve',
              action: 'refresh_equal_revision_adopted',
              workspaceRevision: getCaseResolverWorkspaceRevision(refreshedWorkspace),
              message:
                'Adopted equal-revision workspace during requested context resolve because current workspace was placeholder.',
            });
          }
          syncPersistedWorkspaceTracking(refreshedWorkspace);
          clearQueuedWorkspacePersistMutation();
          return refreshedWorkspace;
        });
        requestedWorkspaceRefreshFileIdRef.current = null;
        requestedWorkspaceMissingFileIdRef.current = null;
        handledRequestedFileIdRef.current = null;
        applyRequestedContextEvent({
          type: 'refresh_succeeded_found',
        });
        logRequestedContextTransition('requested_context_ready', {
          message: 'Requested file resolved after workspace refresh.',
          requestKey,
          resolvedVia: 'snapshot_fetch',
        });
        return;
      }

      requestedWorkspaceMissingFileIdRef.current = normalizedRequestedFileId;
      requestedWorkspaceRefreshFileIdRef.current = null;
      handledRequestedFileIdRef.current = null;
      applyRequestedContextEvent({
        type: 'refresh_succeeded_missing',
      });
      logRequestedContextTransition('requested_context_missing_not_found', {
        message: 'Requested file not found after workspace refresh.',
        requestKey,
        resolvedVia: 'snapshot_fetch',
      });
      queueRequestedContextAutoClear({
        requestKey,
        issue: requestedIssueAfterRefresh,
        message: 'Auto-cleared stale URL context after requested file was not found.',
      });
    })();
  }, [
    clearQueuedWorkspacePersistMutation,
    applyRequestedContextEvent,
    handledRequestedFileIdRef,
    isMountedRef,
    queueRequestedContextAutoClear,
    logRequestedContextTransition,
    requestedContextRetryTick,
    requestedFileId,
    setWorkspace,
    syncPersistedWorkspaceTracking,
    workspaceRef,
    isStoreFetching,
    isStoreLoading,
    storeWorkspaceHasRequestedFile,
    isPromptExploderReturnFlow,
  ]);

  useEffect(() => {
    if (requestedCaseStatus !== 'loading') return;
    const normalizedRequestedFileId = requestedFileId?.trim() ?? '';
    if (!normalizedRequestedFileId) return;
    const requestKey = buildRequestedContextRequestKey(
      normalizedRequestedFileId,
      requestedContextRetryTick
    );

    const watchdogTimer = window.setInterval((): void => {
      const currentStatus = requestedCaseStatusRef.current;
      if (currentStatus !== 'loading') return;
      const hasValidInFlightRequest = hasValidRequestedContextInFlight({
        currentRequestKey: requestKey,
        inFlightRequestKey: requestedContextInFlightRef.current?.requestKey ?? null,
        startedAtMs: requestedContextStartedAtRef.current,
        nowMs: Date.now(),
        watchdogMs: CASE_RESOLVER_REQUESTED_CONTEXT_LOADING_WATCHDOG_MS,
      });
      if (hasValidInFlightRequest) return;
      if (hasRequestedCaseFile(workspaceRef.current.files, normalizedRequestedFileId)) {
        requestedContextInFlightRef.current = null;
        requestedContextStartedAtRef.current = null;
        requestedWorkspaceRefreshFileIdRef.current = null;
        requestedWorkspaceMissingFileIdRef.current = null;
        handledRequestedFileIdRef.current = null;
        applyRequestedContextEvent({
          type: 'workspace_contains_requested',
        });
        logRequestedContextTransition('requested_context_ready', {
          message:
            'Watchdog recovered requested context from in-memory workspace before forcing missing.',
          requestKey,
          resolvedVia: 'workspace_presence',
        });
        return;
      }

      requestedContextInFlightRef.current = null;
      requestedContextStartedAtRef.current = null;
      requestedWorkspaceRefreshFileIdRef.current = null;
      requestedWorkspaceMissingFileIdRef.current = normalizedRequestedFileId;
      handledRequestedFileIdRef.current = null;
      applyRequestedContextEvent({
        type: 'watchdog_timeout',
      });
      logRequestedContextTransition('requested_context_missing_fetch_failed', {
        message: 'Loading watchdog forced missing state after stalled context load.',
        requestKey,
        resolvedVia: 'watchdog',
      });
      queueRequestedContextAutoClear({
        requestKey,
        issue: 'workspace_unavailable',
        message: 'Auto-cleared stale URL context after loading watchdog timeout.',
      });
    }, 500);

    return (): void => {
      window.clearInterval(watchdogTimer);
    };
  }, [
    applyRequestedContextEvent,
    handledRequestedFileIdRef,
    queueRequestedContextAutoClear,
    logRequestedContextTransition,
    requestedCaseStatus,
    requestedContextRetryTick,
    requestedFileId,
    workspaceRef,
  ]);

  useEffect(() => {
    if (requestedCaseStatus !== 'loading') return;
    const deadlockGuardTimer = window.setTimeout((): void => {
      if (requestedCaseStatusRef.current !== 'loading') return;
      const normalizedRequestedFileId = requestedFileId?.trim() ?? '';
      if (!normalizedRequestedFileId) {
        requestedWorkspaceRefreshFileIdRef.current = null;
        requestedWorkspaceMissingFileIdRef.current = null;
        requestedContextInFlightRef.current = null;
        requestedContextAttemptKeyRef.current = null;
        requestedContextStartedAtRef.current = null;
        handledRequestedFileIdRef.current = null;
        applyRequestedContextEvent({
          type: 'query_changed',
          requestedFileId: null,
        });
        logRequestedContextTransition('requested_context_ready', {
          message: 'Deadlock guard resolved loading state with no requested file.',
          resolvedVia: 'watchdog',
        });
        return;
      }
      if (hasRequestedCaseFile(workspaceRef.current.files, normalizedRequestedFileId)) {
        requestedWorkspaceRefreshFileIdRef.current = null;
        requestedWorkspaceMissingFileIdRef.current = null;
        requestedContextInFlightRef.current = null;
        requestedContextAttemptKeyRef.current = null;
        requestedContextStartedAtRef.current = null;
        handledRequestedFileIdRef.current = null;
        applyRequestedContextEvent({
          type: 'workspace_contains_requested',
        });
        logRequestedContextTransition('requested_context_ready', {
          message: 'Deadlock guard resolved loading state from workspace presence.',
          resolvedVia: 'watchdog',
        });
        return;
      }
      if (requestedContextInFlightRef.current !== null) return;
      requestedWorkspaceRefreshFileIdRef.current = null;
      requestedWorkspaceMissingFileIdRef.current = normalizedRequestedFileId;
      requestedContextStartedAtRef.current = null;
      handledRequestedFileIdRef.current = null;
      applyRequestedContextEvent({
        type: 'watchdog_timeout',
      });
      logRequestedContextTransition('requested_context_missing_fetch_failed', {
        message: 'Deadlock guard forced missing state (loading without in-flight request).',
        requestKey: requestedContextAttemptKeyRef.current,
        resolvedVia: 'watchdog',
      });
      queueRequestedContextAutoClear({
        requestKey: requestedContextAttemptKeyRef.current,
        issue: 'workspace_unavailable',
        message: 'Auto-cleared stale URL context after deadlock guard transition.',
      });
    }, 1_500);

    return (): void => {
      window.clearTimeout(deadlockGuardTimer);
    };
  }, [
    applyRequestedContextEvent,
    handledRequestedFileIdRef,
    queueRequestedContextAutoClear,
    logRequestedContextTransition,
    requestedCaseStatus,
    requestedFileId,
    workspaceRef,
  ]);

  return {
    requestedCaseStatus,
    requestedCaseIssue,
    requestedContextAutoClearRequestKey,
    setRequestedCaseStatus,
    handleAcknowledgeRequestedContextAutoClear,
    handleRetryCaseContext,
    resetRequestedContextState,
  };
}
