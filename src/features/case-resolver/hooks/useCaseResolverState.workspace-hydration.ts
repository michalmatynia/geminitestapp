import { useEffect, useRef, useState } from 'react';

import type { CaseResolverWorkspace } from '@/shared/contracts/case-resolver';

import {
  fetchCaseResolverWorkspaceRecord,
  fetchCaseResolverWorkspaceIfStale,
  getCaseResolverWorkspaceRevision,
  logCaseResolverWorkspaceEvent,
} from '../workspace-persistence';
import { logCaseResolverDurationMetric } from '../runtime/metrics';
import { shouldAdoptIncomingWorkspace } from './useCaseResolverState.helpers.hydration';

export function useCaseResolverStateWorkspaceHydration({
  workspaceRef,
  setWorkspace,
  isMountedRef,
  requestedFileId,
  canHydrateWorkspaceFromStore,
  preferredWorkspaceSource,
  preferredWorkspaceReason,
  hasWorkspaceFromStore,
  parsedWorkspace,
  isApplyingPromptExploderPartyProposal,
  syncPersistedWorkspaceTracking,
  clearQueuedWorkspacePersistMutation,
  isPromptExploderReturnFlow,
}: {
  workspaceRef: React.MutableRefObject<CaseResolverWorkspace>;
  setWorkspace: React.Dispatch<React.SetStateAction<CaseResolverWorkspace>>;
  isMountedRef: React.MutableRefObject<boolean>;
  requestedFileId: string | null;
  canHydrateWorkspaceFromStore: boolean;
  preferredWorkspaceSource: string;
  preferredWorkspaceReason: string;
  hasWorkspaceFromStore: boolean;
  parsedWorkspace: CaseResolverWorkspace;
  isApplyingPromptExploderPartyProposal: boolean;
  syncPersistedWorkspaceTracking: (workspace: CaseResolverWorkspace) => void;
  clearQueuedWorkspacePersistMutation: () => void;
  isPromptExploderReturnFlow: boolean;
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
      ].join(' '),
    });
  }, [hasWorkspaceFromStore, parsedWorkspace, preferredWorkspaceReason, preferredWorkspaceSource]);

  useEffect(() => {
    const normalizedRequestedFileId = requestedFileId?.trim() ?? '';
    const workspaceHasTreeData =
      workspaceRef.current.files.length > 0 ||
      workspaceRef.current.assets.length > 0 ||
      workspaceRef.current.folders.length > 0;
    const requestedFileResolvedInWorkspace =
      normalizedRequestedFileId.length === 0
        ? true
        : workspaceRef.current.files.some((file): boolean => file.id === normalizedRequestedFileId);
    if (workspaceHasTreeData && requestedFileResolvedInWorkspace) return;
    const shouldBootstrapRefresh =
      !canHydrateWorkspaceFromStore ||
      preferredWorkspaceSource === 'store' ||
      !requestedFileResolvedInWorkspace;
    if (!shouldBootstrapRefresh) return;
    let cancelled = false;
    void (async (): Promise<void> => {
      const bootstrapStartedAtMs = Date.now();
      const finishBootstrap = (message?: string): void => {
        logCaseResolverDurationMetric('case_open_bootstrap_ms', Date.now() - bootstrapStartedAtMs, {
          source: 'case_view_bootstrap',
          minDurationMs: 1,
          message,
        });
      };
      const currentRevision = getCaseResolverWorkspaceRevision(workspaceRef.current);
      let snapshot: CaseResolverWorkspace | null = null;

      if (isPromptExploderReturnFlow) {
        snapshot = await fetchCaseResolverWorkspaceRecord('case_view_bootstrap', {
          requiredFileId: requestedFileId,
          attemptProfile: 'context_fast',
          maxTotalMs: 6_500,
          attemptTimeoutMs: 2_200,
          includeDetachedHistory: true,
          includeDetachedDocuments: true,
        });
      } else {
        const result = await fetchCaseResolverWorkspaceIfStale(
          'case_view_bootstrap',
          currentRevision,
          {
            includeDetachedHistory: true,
            includeDetachedDocuments: true,
            requiredFileId: requestedFileId,
          }
        );
        if (result.updated) {
          snapshot = result.workspace;
        }
      }
      if (!isMountedRef.current || cancelled) return;
      if (!snapshot) {
        finishBootstrap('snapshot_unavailable');
        if (canHydrateWorkspaceFromStore && requestedFileResolvedInWorkspace) {
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
      finishBootstrap(`snapshot_revision=${getCaseResolverWorkspaceRevision(snapshot)}`);
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
    syncPersistedWorkspaceTracking,
    workspaceRef,
    isPromptExploderReturnFlow,
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
