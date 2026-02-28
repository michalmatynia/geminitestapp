import { useCallback, useRef, useState } from 'react';
import {
  computeCaseResolverConflictRetryDelayMs,
  createCaseResolverWorkspaceMutationId,
  getCaseResolverWorkspaceRevision,
  logCaseResolverWorkspaceEvent,
  persistCaseResolverWorkspaceSnapshot,
} from '../workspace-persistence';
import type { CaseResolverWorkspace } from '@/shared/contracts/case-resolver';
import { parseCaseResolverWorkspace } from '../settings';
import { serializeWorkspaceForUnsavedChangesCheck } from './useCaseResolverState.helpers';
import {
  beginCaseResolverWorkspacePersistAttempt,
  clearCaseResolverWorkspacePersistQueue,
  completeCaseResolverWorkspacePersistAttemptConflict,
  completeCaseResolverWorkspacePersistAttemptFailure,
  completeCaseResolverWorkspacePersistAttemptSuccess,
  createCaseResolverWorkspacePersistQueueState,
  enqueueCaseResolverWorkspacePersistMutation,
  type CaseResolverWorkspacePersistQueueState,
} from './useCaseResolverState.helpers.persist-queue';

const CASE_RESOLVER_WORKSPACE_CONFLICT_AUTO_RETRY_LIMIT = 5;

export type WorkspaceSaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'conflict' | 'error';

export interface UseCaseResolverPersistenceValue {
  isWorkspaceSaving: boolean;
  workspaceSaveStatus: WorkspaceSaveStatus;
  workspaceSaveError: string | null;
  setWorkspaceSaveStatus: React.Dispatch<React.SetStateAction<WorkspaceSaveStatus>>;
  setWorkspaceSaveError: React.Dispatch<React.SetStateAction<string | null>>;
  lastPersistedValueRef: React.MutableRefObject<string>;
  lastPersistedRevisionRef: React.MutableRefObject<number>;
  pendingSaveToastRef: React.MutableRefObject<string | null>;
  queuedSerializedWorkspaceRef: React.MutableRefObject<string | null>;
  queuedExpectedRevisionRef: React.MutableRefObject<number | null>;
  queuedMutationIdRef: React.MutableRefObject<string | null>;
  conflictRetryTimerRef: React.MutableRefObject<number | null>;
  persistWorkspaceTimerRef: React.MutableRefObject<number | null>;
  persistWorkspaceInFlightRef: React.MutableRefObject<boolean>;
  workspaceConflictAutoRetryCountRef: React.MutableRefObject<number>;
  syncPersistedWorkspaceTracking: (nextWorkspace: CaseResolverWorkspace) => void;
  enqueueWorkspacePersistMutation: (input: {
    serializedWorkspace: string;
    expectedRevision: number;
    mutationId: string;
  }) => void;
  clearQueuedWorkspacePersistMutation: () => void;
  clearConflictRetryTimer: () => void;
  flushWorkspacePersist: () => void;
}

import { type SettingsStoreValue } from '@/shared/providers/SettingsStoreProvider';
import { type Toast } from '@/shared/contracts/ui';

export function useCaseResolverPersistence({
  initialWorkspaceState,
  settingsStoreRef,
  toast,
  setPersistedWorkspaceSnapshot,
  setPersistedWorkspaceComparableSnapshot,
}: {
  initialWorkspaceState: CaseResolverWorkspace;
  settingsStoreRef: React.MutableRefObject<SettingsStoreValue>;
  toast: Toast;
  setPersistedWorkspaceSnapshot: (val: string) => void;
  setPersistedWorkspaceComparableSnapshot: (val: string) => void;
}): UseCaseResolverPersistenceValue {
  const [isWorkspaceSaving, setIsWorkspaceSaving] = useState(false);
  const [workspaceSaveStatus, setWorkspaceSaveStatus] = useState<WorkspaceSaveStatus>('idle');
  const [workspaceSaveError, setWorkspaceSaveError] = useState<string | null>(null);

  const lastPersistedValueRef = useRef<string>(JSON.stringify(initialWorkspaceState));
  const lastPersistedRevisionRef = useRef<number>(
    getCaseResolverWorkspaceRevision(initialWorkspaceState)
  );
  const pendingSaveToastRef = useRef<string | null>(null);
  const queuedSerializedWorkspaceRef = useRef<string | null>(null);
  const queuedExpectedRevisionRef = useRef<number | null>(null);
  const queuedMutationIdRef = useRef<string | null>(null);
  const queueStateRef = useRef<CaseResolverWorkspacePersistQueueState>(
    createCaseResolverWorkspacePersistQueueState()
  );
  const conflictRetryTimerRef = useRef<number | null>(null);
  const persistWorkspaceTimerRef = useRef<number | null>(null);
  const persistWorkspaceInFlightRef = useRef(false);
  const workspaceConflictAutoRetryCountRef = useRef(0);

  const applyQueueState = useCallback((nextState: CaseResolverWorkspacePersistQueueState): void => {
    queueStateRef.current = nextState;
    queuedSerializedWorkspaceRef.current = nextState.queuedSerializedWorkspace;
    queuedExpectedRevisionRef.current = nextState.queuedExpectedRevision;
    queuedMutationIdRef.current = nextState.queuedMutationId;
    persistWorkspaceInFlightRef.current = nextState.inFlightSerializedWorkspace !== null;
    workspaceConflictAutoRetryCountRef.current = nextState.conflictAutoRetryCount;
  }, []);

  const syncPersistedWorkspaceTracking = useCallback(
    (nextWorkspace: CaseResolverWorkspace): void => {
      const serialized = JSON.stringify(nextWorkspace);
      lastPersistedValueRef.current = serialized;
      setPersistedWorkspaceSnapshot(serialized);
      setPersistedWorkspaceComparableSnapshot(
        serializeWorkspaceForUnsavedChangesCheck(nextWorkspace)
      );
      lastPersistedRevisionRef.current = getCaseResolverWorkspaceRevision(nextWorkspace);
    },
    [setPersistedWorkspaceSnapshot, setPersistedWorkspaceComparableSnapshot]
  );

  const enqueueWorkspacePersistMutation = useCallback(
    (input: {
      serializedWorkspace: string;
      expectedRevision: number;
      mutationId: string;
    }): void => {
      applyQueueState(enqueueCaseResolverWorkspacePersistMutation(queueStateRef.current, input));
    },
    [applyQueueState]
  );

  const clearQueuedWorkspacePersistMutation = useCallback((): void => {
    applyQueueState(clearCaseResolverWorkspacePersistQueue(queueStateRef.current));
  }, [applyQueueState]);

  const clearConflictRetryTimer = useCallback((): void => {
    if (conflictRetryTimerRef.current === null) return;
    window.clearTimeout(conflictRetryTimerRef.current);
    conflictRetryTimerRef.current = null;
  }, []);

  const flushWorkspacePersist = useCallback((): void => {
    if (persistWorkspaceInFlightRef.current) return;
    clearConflictRetryTimer();

    if (settingsStoreRef.current.isFetching) {
      persistWorkspaceTimerRef.current = window.setTimeout(() => {
        persistWorkspaceTimerRef.current = null;
        flushWorkspacePersist();
      }, 100);
      return;
    }

    const persistAttemptResult = beginCaseResolverWorkspacePersistAttempt({
      state: queueStateRef.current,
      lastPersistedSerialized: lastPersistedValueRef.current,
      lastPersistedRevision: lastPersistedRevisionRef.current,
      fallbackMutationId: createCaseResolverWorkspaceMutationId('case-resolver-workspace-manual'),
    });
    applyQueueState(persistAttemptResult.nextState);
    const persistAttempt = persistAttemptResult.attempt;
    if (!persistAttempt) {
      setIsWorkspaceSaving(false);
      setWorkspaceSaveStatus('saved');
      setWorkspaceSaveError(null);
      return;
    }
    const {
      serializedWorkspace: nextSerializedWorkspace,
      expectedRevision,
      mutationId,
    } = persistAttempt;
    const parsedWorkspaceForPersist = parseCaseResolverWorkspace(nextSerializedWorkspace);

    setIsWorkspaceSaving(true);
    setWorkspaceSaveStatus('saving');
    setWorkspaceSaveError(null);
    let shouldContinuePersistQueue = true;

    void persistCaseResolverWorkspaceSnapshot({
      workspace: parsedWorkspaceForPersist,
      expectedRevision,
      mutationId,
      source: 'case_view',
    })
      .then((result) => {
        if (result.ok) {
          clearConflictRetryTimer();
          const persistedWorkspace = result.workspace;
          syncPersistedWorkspaceTracking(persistedWorkspace);
          applyQueueState(
            completeCaseResolverWorkspacePersistAttemptSuccess(queueStateRef.current, {
              persistedRevision: getCaseResolverWorkspaceRevision(persistedWorkspace),
            })
          );
          logCaseResolverWorkspaceEvent({
            source: 'case_view',
            action: 'manual_save_success',
            mutationId,
            expectedRevision,
            workspaceRevision: getCaseResolverWorkspaceRevision(persistedWorkspace),
          });
          settingsStoreRef.current.refetch();
          if (pendingSaveToastRef.current) {
            toast(pendingSaveToastRef.current, { variant: 'success' });
            pendingSaveToastRef.current = null;
          }
          setWorkspaceSaveStatus('saved');
          setWorkspaceSaveError(null);
          return;
        }

        if (!result.ok && result.conflict) {
          const serverWorkspace = result.workspace;
          const serverRevision = getCaseResolverWorkspaceRevision(serverWorkspace);
          syncPersistedWorkspaceTracking(serverWorkspace);
          logCaseResolverWorkspaceEvent({
            source: 'case_view',
            action: 'manual_save_conflict',
            mutationId,
            expectedRevision,
            workspaceRevision: serverRevision,
          });
          const conflictResult = completeCaseResolverWorkspacePersistAttemptConflict({
            state: queueStateRef.current,
            serverRevision,
            maxAutoRetryCount: CASE_RESOLVER_WORKSPACE_CONFLICT_AUTO_RETRY_LIMIT,
          });
          applyQueueState(conflictResult.nextState);
          if (conflictResult.exhausted) {
            clearConflictRetryTimer();
            shouldContinuePersistQueue = false;
            pendingSaveToastRef.current = null;
            const retryErrorMessage =
              'Could not save Case Resolver changes because workspace kept changing. Please try again.';
            logCaseResolverWorkspaceEvent({
              source: 'case_view',
              action: 'manual_save_conflict_retry_exhausted',
              mutationId,
              expectedRevision,
              workspaceRevision: serverRevision,
              message: retryErrorMessage,
            });
            setWorkspaceSaveStatus('error');
            setWorkspaceSaveError(retryErrorMessage);
            toast(retryErrorMessage, { variant: 'error' });
            return;
          }

          const retryDelayMs = computeCaseResolverConflictRetryDelayMs(conflictResult.retryCount);
          setWorkspaceSaveStatus('saving');
          setWorkspaceSaveError(null);
          clearConflictRetryTimer();
          conflictRetryTimerRef.current = window.setTimeout((): void => {
            conflictRetryTimerRef.current = null;
            flushWorkspacePersist();
          }, retryDelayMs);
          shouldContinuePersistQueue = false;
          logCaseResolverWorkspaceEvent({
            source: 'case_view',
            action: 'manual_save_conflict_retry',
            mutationId,
            expectedRevision: serverRevision,
            workspaceRevision: serverRevision,
            message: `Auto-retrying save after conflict (${conflictResult.retryCount}/${CASE_RESOLVER_WORKSPACE_CONFLICT_AUTO_RETRY_LIMIT}) in ${retryDelayMs}ms.`,
          });
          return;
        }

        clearConflictRetryTimer();
        applyQueueState(completeCaseResolverWorkspacePersistAttemptFailure(queueStateRef.current));
        if (pendingSaveToastRef.current) {
          pendingSaveToastRef.current = null;
        }
        shouldContinuePersistQueue = false;
        const errorMessage = result.error || 'Failed to save Case Resolver workspace.';
        logCaseResolverWorkspaceEvent({
          source: 'case_view',
          action: 'manual_save_error',
          mutationId,
          expectedRevision,
          message: errorMessage,
        });
        setWorkspaceSaveStatus('error');
        setWorkspaceSaveError(errorMessage);
        toast(errorMessage, { variant: 'error' });
      })
      .finally(() => {
        applyQueueState({
          ...queueStateRef.current,
          inFlightSerializedWorkspace: null,
          inFlightExpectedRevision: null,
          inFlightMutationId: null,
        });
        if (
          shouldContinuePersistQueue &&
          queueStateRef.current.queuedSerializedWorkspace &&
          queueStateRef.current.queuedSerializedWorkspace !== lastPersistedValueRef.current
        ) {
          flushWorkspacePersist();
          return;
        }
        setIsWorkspaceSaving(false);
      });
  }, [
    applyQueueState,
    clearConflictRetryTimer,
    settingsStoreRef,
    syncPersistedWorkspaceTracking,
    toast,
  ]);

  return {
    isWorkspaceSaving,
    workspaceSaveStatus,
    workspaceSaveError,
    setWorkspaceSaveStatus,
    setWorkspaceSaveError,
    lastPersistedValueRef,
    lastPersistedRevisionRef,
    pendingSaveToastRef,
    queuedSerializedWorkspaceRef,
    queuedExpectedRevisionRef,
    queuedMutationIdRef,
    conflictRetryTimerRef,
    persistWorkspaceTimerRef,
    persistWorkspaceInFlightRef,
    workspaceConflictAutoRetryCountRef,
    syncPersistedWorkspaceTracking,
    enqueueWorkspacePersistMutation,
    clearQueuedWorkspacePersistMutation,
    clearConflictRetryTimer,
    flushWorkspacePersist,
  };
}
