'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';

import type { CaseResolverWorkspace } from '@/shared/contracts/case-resolver';
import { getCaseResolverWorkspaceRevision } from '../workspace-persistence';
import { createCaseResolverRuntimeStore } from './store';
import { createInitialCaseResolverRuntimeState } from './state';
import type { CaseResolverRuntimeSelector } from './types';
import type { CaseResolverRuntimeStore } from './store';
import { useCaseResolverSelector } from './hooks/useCaseResolverStore';
import { incrementCaseResolverCounterMetric } from './metrics';

type CaseResolverRuntimeProviderProps = {
  workspace: CaseResolverWorkspace;
  selectedFileId: string | null;
  selectedAssetId: string | null;
  selectedFolderPath: string | null;
  activeCaseId: string | null;
  requestedFileId: string | null;
  requestedContextStatus: 'loading' | 'ready' | 'missing';
  requestedContextIssue: 'requested_file_missing' | 'workspace_unavailable' | null;
  children: React.ReactNode;
};

const CaseResolverRuntimeStoreContext = createContext<CaseResolverRuntimeStore | null>(null);

const mapRequestedStatus = (
  requestedContextStatus: 'loading' | 'ready' | 'missing',
  requestedContextIssue: 'requested_file_missing' | 'workspace_unavailable' | null
): 'idle' | 'loading' | 'ready' | 'missing_not_found' | 'missing_unavailable' => {
  if (requestedContextStatus === 'loading') return 'loading';
  if (requestedContextStatus === 'ready') return 'ready';
  if (requestedContextIssue === 'workspace_unavailable') return 'missing_unavailable';
  if (requestedContextIssue === 'requested_file_missing') return 'missing_not_found';
  return 'idle';
};

export function CaseResolverRuntimeProvider({
  workspace,
  selectedFileId,
  selectedAssetId,
  selectedFolderPath,
  activeCaseId,
  requestedFileId,
  requestedContextStatus,
  requestedContextIssue,
  children,
}: CaseResolverRuntimeProviderProps): React.JSX.Element {
  const storeRef = useRef<CaseResolverRuntimeStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createCaseResolverRuntimeStore(
      createInitialCaseResolverRuntimeState(workspace)
    );
  }
  const store = storeRef.current;

  const workspaceRevision = getCaseResolverWorkspaceRevision(workspace);

  useEffect((): void => {
    store.patchState((currentState) => {
      const nextRequestedStatus = mapRequestedStatus(requestedContextStatus, requestedContextIssue);
      const isWorkspaceChanged =
        currentState.workspace.value !== workspace ||
        currentState.workspace.revision !== workspaceRevision;
      const isSelectionChanged =
        currentState.selection.selectedFileId !== selectedFileId ||
        currentState.selection.selectedAssetId !== selectedAssetId ||
        currentState.selection.selectedFolderPath !== selectedFolderPath ||
        currentState.selection.activeCaseId !== activeCaseId;
      const isRequestedContextChanged =
        currentState.requestedContext.requestedFileId !== requestedFileId ||
        currentState.requestedContext.status !== nextRequestedStatus ||
        currentState.requestedContext.issue !== requestedContextIssue;
      if (!isWorkspaceChanged && !isSelectionChanged && !isRequestedContextChanged) {
        return currentState;
      }
      const transitionCount =
        (isWorkspaceChanged ? 1 : 0) +
        (isSelectionChanged ? 1 : 0) +
        (isRequestedContextChanged ? 1 : 0);
      if (transitionCount > 0) {
        incrementCaseResolverCounterMetric('context_state_transition_count', {
          count: transitionCount,
          source: 'runtime_provider',
        });
      }
      const nextWorkspaceSlice = isWorkspaceChanged
        ? {
            value: workspace,
            revision: workspaceRevision,
            isHydrated: workspace.files.length > 0 || workspace.assets.length > 0,
          }
        : currentState.workspace;
      const nextSelectionSlice = isSelectionChanged
        ? {
            selectedFileId,
            selectedAssetId,
            selectedFolderPath,
            activeCaseId,
          }
        : currentState.selection;
      const nextRequestedContextSlice = isRequestedContextChanged
        ? {
            ...currentState.requestedContext,
            requestedFileId,
            status: nextRequestedStatus,
            issue: requestedContextIssue,
          }
        : currentState.requestedContext;
      return {
        ...currentState,
        workspace: nextWorkspaceSlice,
        selection: nextSelectionSlice,
        requestedContext: nextRequestedContextSlice,
      };
    });
  }, [
    activeCaseId,
    requestedContextIssue,
    requestedContextStatus,
    requestedFileId,
    selectedAssetId,
    selectedFileId,
    selectedFolderPath,
    store,
    workspace,
    workspaceRevision,
  ]);

  const contextValue = useMemo((): CaseResolverRuntimeStore => store, [store]);

  return (
    <CaseResolverRuntimeStoreContext.Provider value={contextValue}>
      {children}
    </CaseResolverRuntimeStoreContext.Provider>
  );
}

function useCaseResolverRuntimeStore(): CaseResolverRuntimeStore {
  const store = useContext(CaseResolverRuntimeStoreContext);
  if (!store) {
    throw new Error('useCaseResolverRuntimeStore must be used within CaseResolverRuntimeProvider');
  }
  return store;
}

export function useCaseResolverRuntimeSelector<T>(
  selector: CaseResolverRuntimeSelector<T>,
  equalityFn?: (left: T, right: T) => boolean
): T {
  const store = useCaseResolverRuntimeStore();
  return useCaseResolverSelector(store, selector, equalityFn);
}
