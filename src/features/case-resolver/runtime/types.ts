import type { CaseResolverWorkspace } from '@/shared/contracts/case-resolver/workspace';
import type { CaseResolverRequestedContextStatus } from '@/shared/contracts/case-resolver/base';

export type { CaseResolverRequestedContextStatus };

export type CaseResolverRuntimeWorkspaceSlice = {
  value: CaseResolverWorkspace;
  revision: number;
  isHydrated: boolean;
};

export type CaseResolverRuntimeSelectionSlice = {
  selectedFileId: string | null;
  selectedAssetId: string | null;
  selectedFolderPath: string | null;
  activeCaseId: string | null;
};

export type CaseResolverRuntimeTreeSlice = {
  includeDescendantCaseScope: boolean;
  treeSearchQuery: string;
  highlightedNodeFileAssetIds: string[];
};

export type CaseResolverRuntimeEditorSlice = {
  draftFileId: string | null;
  draftFingerprint: string | null;
  isDirty: boolean;
};

export type CaseResolverRuntimeRequestedContextSlice = {
  requestedFileId: string | null;
  retryTick: number;
  status: CaseResolverRequestedContextStatus;
  issue: null | 'requested_file_missing' | 'workspace_unavailable';
  inFlightRequestKey: string | null;
  attemptedRequestKey: string | null;
  startedAtMs: number | null;
};

export type CaseResolverRuntimePersistenceSlice = {
  isSaving: boolean;
  queuedMutationId: string | null;
  queuedExpectedRevision: number | null;
};

export type CaseResolverRuntimeCaseListSlice = {
  searchQuery: string;
  searchScope: 'all' | 'name' | 'folder' | 'content';
  sortBy:
    | 'updated'
    | 'created'
    | 'happeningDate'
    | 'name'
    | 'status'
    | 'signature'
    | 'locked'
    | 'sent';
  sortOrder: 'asc' | 'desc';
};

export type CaseResolverRuntimeState = {
  workspace: CaseResolverRuntimeWorkspaceSlice;
  selection: CaseResolverRuntimeSelectionSlice;
  requestedContext: CaseResolverRuntimeRequestedContextSlice;
  tree: CaseResolverRuntimeTreeSlice;
  editor: CaseResolverRuntimeEditorSlice;
  persistence: CaseResolverRuntimePersistenceSlice;
  caseList: CaseResolverRuntimeCaseListSlice;
};

export type CaseResolverRuntimeSnapshot = {
  version: number;
  state: CaseResolverRuntimeState;
};

export type CaseResolverRuntimeSelector<T> = (snapshot: CaseResolverRuntimeSnapshot) => T;
