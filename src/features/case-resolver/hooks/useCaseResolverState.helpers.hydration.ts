import type { CaseResolverWorkspace } from '@/shared/contracts/case-resolver';
import { getCaseResolverWorkspaceRevision } from '../workspace-persistence';

export type CaseResolverWorkspaceHydrationDecisionReason =
  | 'incoming_newer_revision'
  | 'requested_file_missing_in_current'
  | 'equal_revision_current_placeholder'
  | 'current_default_placeholder'
  | 'keep_current';

export type CaseResolverWorkspaceHydrationDecision = {
  adopt: boolean;
  reason: CaseResolverWorkspaceHydrationDecisionReason;
};

export type CaseResolverWorkspaceHydrationSource = 'store' | 'navigation' | 'heavy' | 'none';

export type CaseResolverWorkspaceHydrationSourceReason =
  | CaseResolverWorkspaceHydrationDecisionReason
  | 'store_only'
  | 'navigation_requested_file_fallback'
  | 'navigation_only'
  | 'heavy_only'
  | 'store_preferred'
  | 'no_workspace_source';

export type CaseResolverWorkspaceHydrationSourceSelection = {
  workspace: CaseResolverWorkspace;
  source: CaseResolverWorkspaceHydrationSource;
  reason: CaseResolverWorkspaceHydrationSourceReason;
};

const normalizeRequestedFileId = (value: string | null | undefined): string =>
  typeof value === 'string' ? value.trim() : '';

const hasRequestedFile = (workspace: CaseResolverWorkspace, requestedFileId: string): boolean =>
  workspace.files.some((file): boolean => file.id === requestedFileId);

const isPlaceholderWorkspace = (workspace: CaseResolverWorkspace): boolean => {
  const hasContent =
    workspace.files.length > 0 ||
    workspace.assets.length > 0 ||
    workspace.folders.length > 0 ||
    (workspace.folderRecords?.length ?? 0) > 0;
  if (hasContent) return false;
  const normalizedWorkspaceId = workspace.id.trim().toLowerCase();
  return normalizedWorkspaceId === '' || normalizedWorkspaceId === 'empty';
};

export const shouldAdoptIncomingWorkspace = ({
  current,
  incoming,
  requestedFileId,
}: {
  current: CaseResolverWorkspace;
  incoming: CaseResolverWorkspace;
  requestedFileId: string | null;
}): CaseResolverWorkspaceHydrationDecision => {
  const currentRevision = getCaseResolverWorkspaceRevision(current);
  const incomingRevision = getCaseResolverWorkspaceRevision(incoming);
  if (incomingRevision > currentRevision) {
    return { adopt: true, reason: 'incoming_newer_revision' };
  }

  const currentIsPlaceholder = isPlaceholderWorkspace(current);
  const incomingIsPlaceholder = isPlaceholderWorkspace(incoming);

  if (incomingRevision === currentRevision && currentIsPlaceholder && !incomingIsPlaceholder) {
    return { adopt: true, reason: 'equal_revision_current_placeholder' };
  }

  if (currentIsPlaceholder && !incomingIsPlaceholder) {
    return { adopt: true, reason: 'current_default_placeholder' };
  }

  const normalizedRequestedFileId = normalizeRequestedFileId(requestedFileId);
  if (normalizedRequestedFileId) {
    const currentHasRequested = hasRequestedFile(current, normalizedRequestedFileId);
    const incomingHasRequested = hasRequestedFile(incoming, normalizedRequestedFileId);
    if (!currentHasRequested && incomingHasRequested) {
      return { adopt: true, reason: 'requested_file_missing_in_current' };
    }
  }

  return { adopt: false, reason: 'keep_current' };
};

export const shouldRefetchSettingsStoreForRequestedFile = ({
  requestedFileId,
  requestedFileResolvedInWorkspace,
  requestedFileResolvedInStore,
  isStoreLoading,
  isStoreFetching,
  lastRefetchedFileId,
}: {
  requestedFileId: string | null;
  requestedFileResolvedInWorkspace: boolean;
  requestedFileResolvedInStore: boolean;
  isStoreLoading: boolean;
  isStoreFetching: boolean;
  lastRefetchedFileId: string | null;
}): boolean => {
  const normalizedRequestedFileId = normalizeRequestedFileId(requestedFileId);
  if (!normalizedRequestedFileId) return false;
  if (requestedFileResolvedInWorkspace || requestedFileResolvedInStore) return false;
  if (isStoreLoading || isStoreFetching) return false;
  return lastRefetchedFileId !== normalizedRequestedFileId;
};

export const resolvePreferredCaseResolverWorkspace = ({
  storeWorkspace,
  navigationWorkspace,
  hasStoreWorkspace,
  hasNavigationWorkspace,
  requestedFileId,
}: {
  storeWorkspace: CaseResolverWorkspace;
  navigationWorkspace?: CaseResolverWorkspace;
  heavyWorkspace?: CaseResolverWorkspace;
  hasStoreWorkspace: boolean;
  hasNavigationWorkspace?: boolean;
  hasHeavyWorkspace?: boolean;
  requestedFileId: string | null;
}): CaseResolverWorkspaceHydrationSourceSelection => {
  const normalizedRequestedFileId = normalizeRequestedFileId(requestedFileId);
  const resolvedNavigationWorkspace = navigationWorkspace ?? storeWorkspace;
  const navigationHasRequestedFile =
    normalizedRequestedFileId.length > 0 &&
    hasRequestedFile(resolvedNavigationWorkspace, normalizedRequestedFileId);
  const storeHasRequestedFile =
    normalizedRequestedFileId.length > 0 &&
    hasRequestedFile(storeWorkspace, normalizedRequestedFileId);

  if (hasStoreWorkspace) {
    if (
      normalizedRequestedFileId.length > 0 &&
      hasNavigationWorkspace &&
      navigationHasRequestedFile &&
      !storeHasRequestedFile
    ) {
      return {
        workspace: resolvedNavigationWorkspace,
        source: 'navigation',
        reason: 'navigation_requested_file_fallback',
      };
    }
    return {
      workspace: storeWorkspace,
      source: 'store',
      reason: 'store_only',
    };
  }

  if (hasNavigationWorkspace && navigationHasRequestedFile) {
    return {
      workspace: resolvedNavigationWorkspace,
      source: 'navigation',
      reason: 'navigation_only',
    };
  }

  return {
    workspace: storeWorkspace,
    source: 'none',
    reason: 'no_workspace_source',
  };
};
