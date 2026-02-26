import { useEffect, useMemo, useRef } from 'react';

import type { CaseResolverFile, CaseResolverWorkspace } from '@/shared/contracts/case-resolver';
import type { Toast } from '@/shared/contracts/ui';

import { getCaseResolverWorkspaceNormalizationDiagnostics } from '../settings';
import { resolveCaseResolverTreeWorkspace } from '../components/case-resolver-tree-workspace';
import { collectCaseScopeIds } from './useCaseResolverState.helpers';
import { getCachedCaseResolverRuntimeIndexes } from '../runtime';
import {
  getCaseResolverWorkspaceRevision,
  logCaseResolverWorkspaceEvent,
} from '../workspace-persistence';

export interface UseCaseResolverWorkspaceDiagnosticsValue {
  treeWorkspace: CaseResolverWorkspace;
  selectedCaseScopeIds: Set<string> | null;
  workspaceIndexes: ReturnType<typeof getCachedCaseResolverRuntimeIndexes>;
  workspaceNormalizationDiagnostics: ReturnType<
    typeof getCaseResolverWorkspaceNormalizationDiagnostics
  >;
}

export function useCaseResolverStateWorkspaceDiagnostics({
  workspace,
  activeCaseId,
  selectedFileId,
  requestedFileId,
  toast,
}: {
  workspace: CaseResolverWorkspace;
  activeCaseId: string | null;
  selectedFileId: string | null;
  requestedFileId: string | null;
  toast: Toast;
}): UseCaseResolverWorkspaceDiagnosticsValue {
  const unresolvedOwnershipWarningShownRef = useRef(false);
  const lastLoggedOwnershipDiagnosticsSignatureRef = useRef<string>('');

  const selectedCaseScopeIds = useMemo(
    (): Set<string> | null => collectCaseScopeIds(workspace.files, activeCaseId),
    [activeCaseId, workspace.files],
  );

  const workspaceIndexes = useMemo(
    () => getCachedCaseResolverRuntimeIndexes(workspace),
    [workspace.assets, workspace.files, workspace.folderRecords, workspace.folders],
  );

  const workspaceNormalizationDiagnostics = useMemo(
    () => getCaseResolverWorkspaceNormalizationDiagnostics(workspace),
    [workspace],
  );

  const treeWorkspace = useMemo(
    (): CaseResolverWorkspace =>
      resolveCaseResolverTreeWorkspace({
        selectedFileId,
        requestedFileId,
        activeCaseId,
        workspace,
        indexes: workspaceIndexes,
      }),
    [activeCaseId, requestedFileId, selectedFileId, workspace, workspaceIndexes],
  );

  const unresolvedOwnershipInActiveScopeCount = useMemo((): number => {
    if (!activeCaseId) return 0;
    const scopedWorkspace = resolveCaseResolverTreeWorkspace({
      selectedFileId: activeCaseId,
      requestedFileId: null,
      activeCaseId,
      workspace,
      includeDescendantCaseScope: true,
      indexes: workspaceIndexes,
    });
    return scopedWorkspace.files.filter(
      (file: CaseResolverFile): boolean =>
        file.fileType !== 'case' && !file.parentCaseId,
    ).length;
  }, [activeCaseId, workspace, workspaceIndexes]);

  useEffect((): void => {
    const diagnosticsSignature = [
      getCaseResolverWorkspaceRevision(workspace),
      workspaceNormalizationDiagnostics.ownershipRepairedCount,
      workspaceNormalizationDiagnostics.ownershipUnresolvedCount,
      workspaceNormalizationDiagnostics.droppedDuplicateCount,
    ].join(':');
    if (lastLoggedOwnershipDiagnosticsSignatureRef.current === diagnosticsSignature) return;
    lastLoggedOwnershipDiagnosticsSignatureRef.current = diagnosticsSignature;
    logCaseResolverWorkspaceEvent({
      source: 'case_view',
      action: 'ownership_normalization_state',
      workspaceRevision: getCaseResolverWorkspaceRevision(workspace),
      message: [
        `ownership_repaired_count=${workspaceNormalizationDiagnostics.ownershipRepairedCount}`,
        `ownership_unresolved_count=${workspaceNormalizationDiagnostics.ownershipUnresolvedCount}`,
        `dropped_duplicate_count=${workspaceNormalizationDiagnostics.droppedDuplicateCount}`,
      ].join(' '),
    });
  }, [workspace, workspaceNormalizationDiagnostics]);

  useEffect((): void => {
    if (unresolvedOwnershipInActiveScopeCount <= 0) return;
    if (unresolvedOwnershipWarningShownRef.current) return;
    unresolvedOwnershipWarningShownRef.current = true;
    toast('Some documents have unresolved ownership and appear under Unassigned.', {
      variant: 'warning',
    });
  }, [toast, unresolvedOwnershipInActiveScopeCount]);

  return {
    treeWorkspace,
    selectedCaseScopeIds,
    workspaceIndexes,
    workspaceNormalizationDiagnostics,
  };
}
