import { useEffect, useRef, useState } from 'react';

import type { CaseResolverWorkspace } from '@/shared/contracts/case-resolver';

import { logCaseResolverDurationMetric } from '../runtime/metrics';
import { shouldAdoptIncomingWorkspace } from './useCaseResolverState.helpers.hydration';
import {
  fetchCaseResolverWorkspaceMetadata,
  fetchCaseResolverWorkspaceRecord,
  getCaseResolverWorkspaceRevision,
  logCaseResolverWorkspaceEvent,
} from '../workspace-persistence';

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
      const bootstrapStartedAtMs = Date.now();
      const finishBootstrap = (message?: string): void => {
        logCaseResolverDurationMetric('case_open_bootstrap_ms', Date.now() - bootstrapStartedAtMs, {
          source: 'case_view_bootstrap',
          minDurationMs: 1,
          message,
        });
      };
      const currentRevision = getCaseResolverWorkspaceRevision(workspaceRef.current);
      const metadata = await fetchCaseResolverWorkspaceMetadata('case_view_bootstrap');
      if (!isMountedRef.current || cancelled) return;
      const shouldFetchRecord =
        metadata === null
          ? true
          : metadata.exists !== false && metadata.revision >= currentRevision;
      const snapshot = shouldFetchRecord
        ? await fetchCaseResolverWorkspaceRecord('case_view_bootstrap')
        : null;
      if (!isMountedRef.current || cancelled) return;
      if (!snapshot) {
        finishBootstrap(
          metadata
            ? `metadata_revision=${metadata.revision} exists=${metadata.exists ? 'true' : 'false'}`
            : 'metadata=unavailable'
        );
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
