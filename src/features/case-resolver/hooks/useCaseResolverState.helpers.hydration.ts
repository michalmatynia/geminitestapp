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
  | 'navigation_newer_revision'
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

type CaseResolverWorkspaceHydrationDecisionResolver = (input: {
  current: CaseResolverWorkspace;
  incoming: CaseResolverWorkspace;
  requestedFileId: string | null;
}) => CaseResolverWorkspaceHydrationDecision | null;

type PreferredCaseResolverWorkspaceSelectionContext = {
  storeWorkspace: CaseResolverWorkspace;
  resolvedNavigationWorkspace: CaseResolverWorkspace;
  hasStoreWorkspace: boolean;
  hasNavigationWorkspace: boolean;
  normalizedRequestedFileId: string;
  hasRequestedFileId: boolean;
  navigationHasRequestedFile: boolean;
  storeHasRequestedFile: boolean;
  navigationRevision: number;
  storeRevision: number;
};

const normalizeRequestedFileId = (value: string | null | undefined): string =>
  typeof value === 'string' ? value.trim() : '';

const hasRequestedFile = (workspace: CaseResolverWorkspace, requestedFileId: string): boolean =>
  workspace.files.some((file): boolean => file.id === requestedFileId);

const resolveRequestedFileSatisfied = ({
  requestedFileId,
  workspace,
}: {
  requestedFileId: string;
  workspace: CaseResolverWorkspace;
}): boolean => {
  if (requestedFileId.length === 0) return true;
  return hasRequestedFile(workspace, requestedFileId);
};

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

const resolveIncomingRevisionDecision = ({
  current,
  incoming,
}: {
  current: CaseResolverWorkspace;
  incoming: CaseResolverWorkspace;
}): CaseResolverWorkspaceHydrationDecision | null => {
  const currentRevision = getCaseResolverWorkspaceRevision(current);
  const incomingRevision = getCaseResolverWorkspaceRevision(incoming);
  return incomingRevision > currentRevision
    ? { adopt: true, reason: 'incoming_newer_revision' }
    : null;
};

const resolvePlaceholderWorkspaceDecision = ({
  current,
  incoming,
}: {
  current: CaseResolverWorkspace;
  incoming: CaseResolverWorkspace;
}): CaseResolverWorkspaceHydrationDecision | null => {
  const currentRevision = getCaseResolverWorkspaceRevision(current);
  const incomingRevision = getCaseResolverWorkspaceRevision(incoming);
  const currentIsPlaceholder = isPlaceholderWorkspace(current);
  const incomingIsPlaceholder = isPlaceholderWorkspace(incoming);

  if (incomingRevision === currentRevision && currentIsPlaceholder && !incomingIsPlaceholder) {
    return { adopt: true, reason: 'equal_revision_current_placeholder' };
  }

  return currentIsPlaceholder && !incomingIsPlaceholder
    ? { adopt: true, reason: 'current_default_placeholder' }
    : null;
};

const resolveRequestedFileWorkspaceDecision = ({
  current,
  incoming,
  requestedFileId,
}: {
  current: CaseResolverWorkspace;
  incoming: CaseResolverWorkspace;
  requestedFileId: string | null;
}): CaseResolverWorkspaceHydrationDecision | null => {
  const normalizedRequestedFileId = normalizeRequestedFileId(requestedFileId);
  if (!normalizedRequestedFileId) {
    return null;
  }

  const currentHasRequested = hasRequestedFile(current, normalizedRequestedFileId);
  const incomingHasRequested = hasRequestedFile(incoming, normalizedRequestedFileId);
  return !currentHasRequested && incomingHasRequested
    ? { adopt: true, reason: 'requested_file_missing_in_current' }
    : null;
};

const HYDRATION_DECISION_RESOLVERS: CaseResolverWorkspaceHydrationDecisionResolver[] = [
  resolveIncomingRevisionDecision,
  resolvePlaceholderWorkspaceDecision,
  resolveRequestedFileWorkspaceDecision,
];

const resolveWorkspaceHydrationDecision = (input: {
  current: CaseResolverWorkspace;
  incoming: CaseResolverWorkspace;
  requestedFileId: string | null;
}): CaseResolverWorkspaceHydrationDecision | null => {
  for (const resolver of HYDRATION_DECISION_RESOLVERS) {
    const decision = resolver(input);
    if (decision) {
      return decision;
    }
  }
  return null;
};

const buildHydrationSourceSelection = (
  workspace: CaseResolverWorkspace,
  source: CaseResolverWorkspaceHydrationSource,
  reason: CaseResolverWorkspaceHydrationSourceReason
): CaseResolverWorkspaceHydrationSourceSelection => ({
  workspace,
  source,
  reason,
});

const buildPreferredCaseResolverWorkspaceSelectionContext = ({
  storeWorkspace,
  navigationWorkspace,
  hasStoreWorkspace,
  hasNavigationWorkspace,
  requestedFileId,
}: {
  storeWorkspace: CaseResolverWorkspace;
  navigationWorkspace?: CaseResolverWorkspace;
  hasStoreWorkspace: boolean;
  hasNavigationWorkspace?: boolean;
  requestedFileId: string | null;
}): PreferredCaseResolverWorkspaceSelectionContext => {
  const normalizedRequestedFileId = normalizeRequestedFileId(requestedFileId);
  const hasRequestedFileId = normalizedRequestedFileId.length > 0;
  const resolvedNavigationWorkspace = navigationWorkspace ?? storeWorkspace;
  return {
    storeWorkspace,
    resolvedNavigationWorkspace,
    hasStoreWorkspace,
    hasNavigationWorkspace: hasNavigationWorkspace === true,
    normalizedRequestedFileId,
    hasRequestedFileId,
    navigationHasRequestedFile:
      hasRequestedFileId && hasRequestedFile(resolvedNavigationWorkspace, normalizedRequestedFileId),
    storeHasRequestedFile:
      hasRequestedFileId && hasRequestedFile(storeWorkspace, normalizedRequestedFileId),
    navigationRevision: getCaseResolverWorkspaceRevision(resolvedNavigationWorkspace),
    storeRevision: getCaseResolverWorkspaceRevision(storeWorkspace),
  };
};

const resolveNavigationRequestedFileFallbackSelection = (
  context: PreferredCaseResolverWorkspaceSelectionContext
): CaseResolverWorkspaceHydrationSourceSelection | null =>
  context.hasRequestedFileId &&
  context.hasNavigationWorkspace &&
  context.navigationHasRequestedFile &&
  !context.storeHasRequestedFile
    ? buildHydrationSourceSelection(
        context.resolvedNavigationWorkspace,
        'navigation',
        'navigation_requested_file_fallback'
      )
    : null;

const resolveNewerNavigationWorkspaceSelection = (
  context: PreferredCaseResolverWorkspaceSelectionContext
): CaseResolverWorkspaceHydrationSourceSelection | null =>
  context.hasNavigationWorkspace &&
  context.navigationRevision > context.storeRevision &&
  resolveRequestedFileSatisfied({
    requestedFileId: context.normalizedRequestedFileId,
    workspace: context.resolvedNavigationWorkspace,
  })
    ? buildHydrationSourceSelection(
        context.resolvedNavigationWorkspace,
        'navigation',
        'navigation_newer_revision'
      )
    : null;

const resolveStorePreferredWorkspaceSelection = (
  context: PreferredCaseResolverWorkspaceSelectionContext
): CaseResolverWorkspaceHydrationSourceSelection | null => {
  if (!context.hasStoreWorkspace) {
    return null;
  }

  return (
    resolveNavigationRequestedFileFallbackSelection(context) ??
    resolveNewerNavigationWorkspaceSelection(context) ??
    buildHydrationSourceSelection(context.storeWorkspace, 'store', 'store_only')
  );
};

const resolveNavigationOnlyWorkspaceSelection = (
  context: PreferredCaseResolverWorkspaceSelectionContext
): CaseResolverWorkspaceHydrationSourceSelection | null =>
  context.hasNavigationWorkspace && context.navigationHasRequestedFile
    ? buildHydrationSourceSelection(
        context.resolvedNavigationWorkspace,
        'navigation',
        'navigation_only'
      )
    : null;

export const shouldAdoptIncomingWorkspace = ({
  current,
  incoming,
  requestedFileId,
}: {
  current: CaseResolverWorkspace;
  incoming: CaseResolverWorkspace;
  requestedFileId: string | null;
}): CaseResolverWorkspaceHydrationDecision => {
  return (
    resolveWorkspaceHydrationDecision({
      current,
      incoming,
      requestedFileId,
    }) ?? { adopt: false, reason: 'keep_current' }
  );
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
  const context = buildPreferredCaseResolverWorkspaceSelectionContext({
    storeWorkspace,
    navigationWorkspace,
    hasStoreWorkspace,
    hasNavigationWorkspace,
    requestedFileId,
  });

  return (
    resolveStorePreferredWorkspaceSelection(context) ??
    resolveNavigationOnlyWorkspaceSelection(context) ??
    buildHydrationSourceSelection(storeWorkspace, 'none', 'no_workspace_source')
  );
};
