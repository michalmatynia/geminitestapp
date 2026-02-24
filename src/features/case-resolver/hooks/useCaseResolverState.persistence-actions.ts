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

const CASE_RESOLVER_WORKSPACE_CONFLICT_AUTO_RETRY_LIMIT = 5;

export type WorkspaceSaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'conflict' | 'error';

export function useCaseResolverPersistence({
  initialWorkspaceState,
  settingsStoreRef,
  toast,
  setPersistedWorkspaceSnapshot,
  setPersistedWorkspaceComparableSnapshot,
}: {
  initialWorkspaceState: CaseResolverWorkspace;
  settingsStoreRef: React.MutableRefObject<any>;
  toast: any;
  setPersistedWorkspaceSnapshot: (val: string) => void;
  setPersistedWorkspaceComparableSnapshot: (val: string) => void;
}) {
  const [isWorkspaceSaving, setIsWorkspaceSaving] = useState(false);
  const [workspaceSaveStatus, setWorkspaceSaveStatus] = useState<WorkspaceSaveStatus>('idle');
  const [workspaceSaveError, setWorkspaceSaveError] = useState<string | null>(null);

  const lastPersistedValueRef = useRef<string>(JSON.stringify(initialWorkspaceState));
  const lastPersistedRevisionRef = useRef<number>(getCaseResolverWorkspaceRevision(initialWorkspaceState));
  const pendingSaveToastRef = useRef<string | null>(null);
  const queuedSerializedWorkspaceRef = useRef<string | null>(null);
  const queuedExpectedRevisionRef = useRef<number | null>(null);
  const queuedMutationIdRef = useRef<string | null>(null);
  const conflictRetryTimerRef = useRef<number | null>(null);
  const persistWorkspaceTimerRef = useRef<number | null>(null);
  const persistWorkspaceInFlightRef = useRef(false);
  const workspaceConflictAutoRetryCountRef = useRef(0);

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

    const nextSerialized = queuedSerializedWorkspaceRef.current;
    if (!nextSerialized || nextSerialized === lastPersistedValueRef.current) {
      workspaceConflictAutoRetryCountRef.current = 0;
      setIsWorkspaceSaving(false);
      setWorkspaceSaveStatus('saved');
      setWorkspaceSaveError(null);
      return;
    }
    const expectedRevision =
      queuedExpectedRevisionRef.current ?? lastPersistedRevisionRef.current;
    const mutationId =
      queuedMutationIdRef.current ??
      createCaseResolverWorkspaceMutationId('case-resolver-workspace-manual');
    const parsedWorkspaceForPersist = parseCaseResolverWorkspace(nextSerialized);

    persistWorkspaceInFlightRef.current = true;
    setIsWorkspaceSaving(true);
    setWorkspaceSaveStatus('saving');
    setWorkspaceSaveError(null);
    let shouldContinuePersistQueue = true;

    void persistCaseResolverWorkspaceSnapshot({
      workspace: parsedWorkspaceForPersist,
      expectedRevision,
      mutationId,
      source: 'case_view',
    }).then((result) => {
      if (result.ok) {
        clearConflictRetryTimer();
        workspaceConflictAutoRetryCountRef.current = 0;
        const persistedWorkspace = result.workspace;
        syncPersistedWorkspaceTracking(persistedWorkspace);
        logCaseResolverWorkspaceEvent({
          source: 'case_view',
          action: 'manual_save_success',
          mutationId,
          expectedRevision,
          workspaceRevision: getCaseResolverWorkspaceRevision(persistedWorkspace),
        });
        settingsStoreRef.current.refetch();
        if (queuedSerializedWorkspaceRef.current === nextSerialized) {
          queuedSerializedWorkspaceRef.current = null;
          queuedExpectedRevisionRef.current = null;
          queuedMutationIdRef.current = null;
        } else if (queuedSerializedWorkspaceRef.current) {
          queuedExpectedRevisionRef.current = lastPersistedRevisionRef.current;
        }
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
        const nextRetryCount = workspaceConflictAutoRetryCountRef.current + 1;
        workspaceConflictAutoRetryCountRef.current = nextRetryCount;
        if (nextRetryCount > CASE_RESOLVER_WORKSPACE_CONFLICT_AUTO_RETRY_LIMIT) {
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

        queuedSerializedWorkspaceRef.current = nextSerialized;
        queuedExpectedRevisionRef.current = serverRevision;
        queuedMutationIdRef.current = mutationId;
        const retryDelayMs = computeCaseResolverConflictRetryDelayMs(nextRetryCount);
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
          message: `Auto-retrying save after conflict (${nextRetryCount}/${CASE_RESOLVER_WORKSPACE_CONFLICT_AUTO_RETRY_LIMIT}) in ${retryDelayMs}ms.`,
        });
        return;
      }

      clearConflictRetryTimer();
      workspaceConflictAutoRetryCountRef.current = 0;
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
    }).finally(() => {
      persistWorkspaceInFlightRef.current = false;
      if (
        shouldContinuePersistQueue &&
        queuedSerializedWorkspaceRef.current &&
        queuedSerializedWorkspaceRef.current !== lastPersistedValueRef.current
      ) {
        flushWorkspacePersist();
        return;
      }
      setIsWorkspaceSaving(false);
    });
  }, [clearConflictRetryTimer, syncPersistedWorkspaceTracking, toast, settingsStoreRef]);

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
    clearConflictRetryTimer,
    flushWorkspacePersist,
  };
}
