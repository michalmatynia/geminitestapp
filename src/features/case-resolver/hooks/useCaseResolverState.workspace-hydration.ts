import { useEffect, useRef, useState } from 'react';

import type { CaseResolverWorkspace } from '@/shared/contracts/case-resolver';
import type { SettingsStoreValue } from '@/shared/providers/SettingsStoreProvider';

import { shouldAdoptIncomingWorkspace } from './useCaseResolverState.helpers.hydration';
import {
  fetchCaseResolverWorkspaceSnapshot,
  getCaseResolverWorkspaceRevision,
  logCaseResolverWorkspaceEvent,
} from '../workspace-persistence';

export function useCaseResolverStateWorkspaceHydration({
  workspace,
  workspaceRef,
  setWorkspace,
  isMountedRef,
  requestedFileId,
  canHydrateWorkspaceFromStore,
  preferredWorkspaceSource,
  preferredWorkspaceReason,
  hasWorkspaceFromStore,
  hasWorkspaceFromHeavyScope,
  parsedWorkspace,
  isApplyingPromptExploderPartyProposal,
  heavySettingsIsFetching,
  heavySettingsIsLoading,
  refetchHeavySettings,
  syncPersistedWorkspaceTracking,
  clearQueuedWorkspacePersistMutation,
  settingsStoreRef,
}: {
  workspace: CaseResolverWorkspace;
  workspaceRef: React.MutableRefObject<CaseResolverWorkspace>;
  setWorkspace: React.Dispatch<React.SetStateAction<CaseResolverWorkspace>>;
  isMountedRef: React.MutableRefObject<boolean>;
  requestedFileId: string | null;
  canHydrateWorkspaceFromStore: boolean;
  preferredWorkspaceSource: string;
  preferredWorkspaceReason: string;
  hasWorkspaceFromStore: boolean;
  hasWorkspaceFromHeavyScope: boolean;
  parsedWorkspace: CaseResolverWorkspace;
  isApplyingPromptExploderPartyProposal: boolean;
  heavySettingsIsFetching: boolean;
  heavySettingsIsLoading: boolean;
  refetchHeavySettings: () => Promise<unknown>;
  syncPersistedWorkspaceTracking: (workspace: CaseResolverWorkspace) => void;
  clearQueuedWorkspacePersistMutation: () => void;
  settingsStoreRef: React.MutableRefObject<SettingsStoreValue>;
}): void {
  const [bootstrapRefreshRetryTick, setBootstrapRefreshRetryTick] = useState(0);
  const bootstrapRefreshRetryAttemptRef = useRef(0);
  const bootstrapRefreshRetryTimerRef = useRef<number | null>(null);
  const lastWorkspaceSourceSelectionSignatureRef = useRef<string>('');

  useEffect((): void => {
    const selectionSignature = [
      preferredWorkspaceSource,
      preferredWorkspaceReason,
      hasWorkspaceFromStore ? 'store:1' : 'store:0',
      hasWorkspaceFromHeavyScope ? 'heavy:1' : 'heavy:0',
      getCaseResolverWorkspaceRevision(parsedWorkspace),
    ].join('|');
    if (lastWorkspaceSourceSelectionSignatureRef.current === selectionSignature) return;
    lastWorkspaceSourceSelectionSignatureRef.current = selectionSignature;
    logCaseResolverWorkspaceEvent({
      source: 'case_view',
      action: 'hydrate_workspace_source_selected',
      workspaceRevision: getCaseResolverWorkspaceRevision(parsedWorkspace),
      message: [
        `source=${preferredWorkspaceSource}`,
        `reason=${preferredWorkspaceReason}`,
        `has_store=${hasWorkspaceFromStore ? 'true' : 'false'}`,
        `has_heavy=${hasWorkspaceFromHeavyScope ? 'true' : 'false'}`,
      ].join(' '),
    });
  }, [
    hasWorkspaceFromHeavyScope,
    hasWorkspaceFromStore,
    parsedWorkspace,
    preferredWorkspaceReason,
    preferredWorkspaceSource,
  ]);

  useEffect(() => {
    const workspaceHasTreeData =
      workspaceRef.current.files.length > 0 ||
      workspaceRef.current.assets.length > 0 ||
      workspaceRef.current.folders.length > 0;
    if (workspaceHasTreeData) return;
    const shouldBootstrapRefresh =
      !canHydrateWorkspaceFromStore || preferredWorkspaceSource === 'store';
    if (!shouldBootstrapRefresh) return;
    let cancelled = false;
    void (async (): Promise<void> => {
      const snapshot = await fetchCaseResolverWorkspaceSnapshot('case_view_bootstrap');
      if (!isMountedRef.current || cancelled) return;
      if (!snapshot) {
        if (canHydrateWorkspaceFromStore) {
          logCaseResolverWorkspaceEvent({
            source: 'case_view_bootstrap',
            action: 'refresh_failed_no_retry',
            message:
              'Bootstrap refresh failed while store snapshot is available; skipping retry loop.',
          });
          return;
        }
        if (bootstrapRefreshRetryTimerRef.current !== null) {
          window.clearTimeout(bootstrapRefreshRetryTimerRef.current);
        }
        const nextAttempt = bootstrapRefreshRetryAttemptRef.current + 1;
        bootstrapRefreshRetryAttemptRef.current = nextAttempt;
        const retryDelayMs = Math.min(10_000, 700 * nextAttempt);
        bootstrapRefreshRetryTimerRef.current = window.setTimeout((): void => {
          bootstrapRefreshRetryTimerRef.current = null;
          setBootstrapRefreshRetryTick((current: number): number => current + 1);
        }, retryDelayMs);
        logCaseResolverWorkspaceEvent({
          source: 'case_view_bootstrap',
          action: 'refresh_retry_scheduled',
          message: `retry_in_ms=${retryDelayMs} attempt=${nextAttempt}`,
        });
        return;
      }
      bootstrapRefreshRetryAttemptRef.current = 0;
      if (bootstrapRefreshRetryTimerRef.current !== null) {
        window.clearTimeout(bootstrapRefreshRetryTimerRef.current);
        bootstrapRefreshRetryTimerRef.current = null;
      }
      setWorkspace((current: CaseResolverWorkspace): CaseResolverWorkspace => {
        const hydrationDecision = shouldAdoptIncomingWorkspace({
          current,
          incoming: snapshot,
          requestedFileId,
        });
        if (!hydrationDecision.adopt) return current;
        if (hydrationDecision.reason === 'equal_revision_current_placeholder') {
          logCaseResolverWorkspaceEvent({
            source: 'case_view_bootstrap',
            action: 'refresh_equal_revision_adopted',
            workspaceRevision: getCaseResolverWorkspaceRevision(snapshot),
            message:
              'Adopted equal-revision workspace snapshot because current workspace was placeholder.',
          });
        }
        syncPersistedWorkspaceTracking(snapshot);
        clearQueuedWorkspacePersistMutation();
        return snapshot;
      });
      settingsStoreRef.current.refetch();
    })();
    return (): void => {
      cancelled = true;
    };
  }, [
    bootstrapRefreshRetryTick,
    canHydrateWorkspaceFromStore,
    clearQueuedWorkspacePersistMutation,
    isMountedRef,
    preferredWorkspaceSource,
    requestedFileId,
    setWorkspace,
    settingsStoreRef,
    syncPersistedWorkspaceTracking,
    workspaceRef,
  ]);

  useEffect((): (() => void) | void => {
    const hasWorkspaceData =
      workspace.files.length > 0 || workspace.assets.length > 0 || workspace.folders.length > 0;
    if (hasWorkspaceData) return;
    if (heavySettingsIsFetching || heavySettingsIsLoading) return;
    const refreshTimer = window.setTimeout((): void => {
      void refetchHeavySettings();
    }, 1_500);
    return (): void => {
      window.clearTimeout(refreshTimer);
    };
  }, [
    heavySettingsIsFetching,
    heavySettingsIsLoading,
    refetchHeavySettings,
    workspace.assets.length,
    workspace.files.length,
    workspace.folders.length,
  ]);

  useEffect(() => {
    if (!canHydrateWorkspaceFromStore) return;
    if (isApplyingPromptExploderPartyProposal) return;
    setWorkspace((current: CaseResolverWorkspace): CaseResolverWorkspace => {
      const hydrationDecision = shouldAdoptIncomingWorkspace({
        current,
        incoming: parsedWorkspace,
        requestedFileId,
      });
      if (!hydrationDecision.adopt) return current;
      if (hydrationDecision.reason === 'equal_revision_current_placeholder') {
        logCaseResolverWorkspaceEvent({
          source: 'case_view_sync',
          action: 'refresh_equal_revision_adopted',
          workspaceRevision: getCaseResolverWorkspaceRevision(parsedWorkspace),
          message:
            'Adopted equal-revision workspace from settings store because current workspace was placeholder.',
        });
      }

      syncPersistedWorkspaceTracking(parsedWorkspace);
      clearQueuedWorkspacePersistMutation();
      return parsedWorkspace;
    });
  }, [
    canHydrateWorkspaceFromStore,
    clearQueuedWorkspacePersistMutation,
    isApplyingPromptExploderPartyProposal,
    parsedWorkspace,
    requestedFileId,
    setWorkspace,
    syncPersistedWorkspaceTracking,
  ]);

  useEffect(() => {
    return (): void => {
      if (bootstrapRefreshRetryTimerRef.current) {
        window.clearTimeout(bootstrapRefreshRetryTimerRef.current);
        bootstrapRefreshRetryTimerRef.current = null;
      }
    };
  }, []);
}
