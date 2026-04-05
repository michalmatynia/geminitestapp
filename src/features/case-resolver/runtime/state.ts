import type { CaseResolverWorkspace } from '@/shared/contracts/case-resolver/workspace';

import { parseCaseResolverWorkspace } from '../settings';
import { getCaseResolverWorkspaceRevision } from '../workspace-persistence';

import type { CaseResolverRuntimeState } from './types';

export const createEmptyCaseResolverWorkspace = (): CaseResolverWorkspace => ({
  ...parseCaseResolverWorkspace(null),
});

export const createInitialCaseResolverRuntimeState = (
  workspace: CaseResolverWorkspace
): CaseResolverRuntimeState => ({
  workspace: {
    value: workspace,
    revision: getCaseResolverWorkspaceRevision(workspace),
    isHydrated: workspace.files.length > 0 || workspace.assets.length > 0,
  },
  selection: {
    selectedFileId: null,
    selectedAssetId: null,
    selectedFolderPath: null,
    activeCaseId: null,
  },
  requestedContext: {
    requestedFileId: null,
    retryTick: 0,
    status: 'idle',
    issue: null,
    inFlightRequestKey: null,
    attemptedRequestKey: null,
    startedAtMs: null,
  },
  tree: {
    includeDescendantCaseScope: true,
    treeSearchQuery: '',
    highlightedNodeFileAssetIds: [],
  },
  editor: {
    draftFileId: null,
    draftFingerprint: null,
    isDirty: false,
  },
  persistence: {
    isSaving: false,
    queuedMutationId: null,
    queuedExpectedRevision: null,
  },
  caseList: {
    searchQuery: '',
    searchScope: 'all',
    sortBy: 'updated',
    sortOrder: 'desc',
  },
});
