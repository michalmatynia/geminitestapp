import { useCallback, useEffect, useMemo } from 'react';

import type { CaseResolverWorkspace } from '@/shared/contracts/case-resolver';

import { normalizeCaseResolverWorkspace } from '../settings';
import {
  createCaseResolverWorkspaceMutationId,
  getCaseResolverWorkspaceRevision,
  logCaseResolverWorkspaceEvent,
  primeCaseResolverNavigationWorkspace,
  stampCaseResolverWorkspaceMutation,
} from '../workspace-persistence';
import { serializeWorkspaceForUnsavedChangesCheck } from './useCaseResolverState.helpers';

import type { UseCaseResolverPersistenceValue } from './useCaseResolverState.persistence-actions';

export type CaseResolverWorkspaceUpdateOptions = {
  persistToast?: string;
  persistNow?: boolean;
  mutationId?: string;
  source?: string;
  skipNormalization?: boolean;
};

export interface UseCaseResolverWorkspaceMutationsValue {
  updateWorkspace: (
    updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace,
    options?: CaseResolverWorkspaceUpdateOptions
  ) => void;
}

export function useCaseResolverStateWorkspaceMutations({
  workspace,
  setWorkspace,
  persistedWorkspaceComparableSnapshot,
  persistence,
}: {
  workspace: CaseResolverWorkspace;
  setWorkspace: React.Dispatch<React.SetStateAction<CaseResolverWorkspace>>;
  persistedWorkspaceComparableSnapshot: string;
  persistence: UseCaseResolverPersistenceValue;
}): UseCaseResolverWorkspaceMutationsValue {
  const {
    queuedExpectedRevisionRef,
    lastPersistedRevisionRef,
    pendingSaveToastRef,
    enqueueWorkspacePersistMutation,
    flushWorkspacePersist,
    clearConflictRetryTimer,
    persistWorkspaceTimerRef,
    isWorkspaceSaving,
    setWorkspaceSaveStatus,
    setWorkspaceSaveError,
  } = persistence;

  const updateWorkspace = useCallback(
    (
      updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace,
      options?: CaseResolverWorkspaceUpdateOptions
    ): void => {
      setWorkspace((current: CaseResolverWorkspace) => {
        const baseCurrent = options?.skipNormalization
          ? current
          : normalizeCaseResolverWorkspace(current);
        const updated = updater(baseCurrent);
        if (updated === current || updated === baseCurrent) return current;
        const normalizedUpdated = options?.skipNormalization
          ? updated
          : normalizeCaseResolverWorkspace(updated);
        const mutationId =
          options?.mutationId?.trim() ||
          createCaseResolverWorkspaceMutationId('case-resolver-workspace');
        const stampedWorkspace = stampCaseResolverWorkspaceMutation(normalizedUpdated, {
          baseRevision: getCaseResolverWorkspaceRevision(baseCurrent),
          mutationId,
          normalizeWorkspace: options?.skipNormalization ? false : true,
        });
        logCaseResolverWorkspaceEvent({
          source: options?.source ?? 'case_view',
          action: 'mutation_enqueued',
          mutationId,
          expectedRevision: queuedExpectedRevisionRef.current ?? lastPersistedRevisionRef.current,
          workspaceRevision: getCaseResolverWorkspaceRevision(stampedWorkspace),
        });
        primeCaseResolverNavigationWorkspace(stampedWorkspace);
        if (options?.persistToast) {
          pendingSaveToastRef.current = options.persistToast;
        }
        const expectedRevision =
          queuedExpectedRevisionRef.current ?? lastPersistedRevisionRef.current;
        enqueueWorkspacePersistMutation({
          serializedWorkspace: JSON.stringify(stampedWorkspace),
          expectedRevision,
          mutationId,
        });
        return stampedWorkspace;
      });
      if (options?.persistToast || options?.persistNow) {
        window.setTimeout((): void => {
          flushWorkspacePersist();
        }, 0);
      }
    },
    [
      enqueueWorkspacePersistMutation,
      flushWorkspacePersist,
      lastPersistedRevisionRef,
      pendingSaveToastRef,
      queuedExpectedRevisionRef,
      setWorkspace,
    ]
  );

  useEffect(() => {
    return (): void => {
      clearConflictRetryTimer();
      if (persistWorkspaceTimerRef.current) {
        window.clearTimeout(persistWorkspaceTimerRef.current);
        persistWorkspaceTimerRef.current = null;
      }
    };
  }, [clearConflictRetryTimer, persistWorkspaceTimerRef]);

  const workspaceComparableSnapshot = useMemo(
    (): string => serializeWorkspaceForUnsavedChangesCheck(workspace),
    [workspace]
  );
  const isWorkspaceDirty = useMemo(
    (): boolean => workspaceComparableSnapshot !== persistedWorkspaceComparableSnapshot,
    [persistedWorkspaceComparableSnapshot, workspaceComparableSnapshot]
  );

  useEffect(() => {
    if (isWorkspaceSaving) return;
    if (isWorkspaceDirty) {
      setWorkspaceSaveStatus((current) =>
        current === 'conflict' || current === 'error' ? current : 'dirty'
      );
      return;
    }
    setWorkspaceSaveStatus('saved');
    setWorkspaceSaveError(null);
  }, [isWorkspaceDirty, isWorkspaceSaving, setWorkspaceSaveError, setWorkspaceSaveStatus]);

  return {
    updateWorkspace,
  };
}
