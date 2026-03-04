import { type CaseResolverWorkspaceDebugEvent } from '@/shared/contracts/case-resolver';

import {
  computeCaseResolverConflictRetryDelayMs,
  createCaseResolverWorkspaceMutationId,
  getCaseResolverWorkspaceRevision,
  stampCaseResolverWorkspaceMutation,
} from './utils/workspace-persistence-utils';

import {
  logCaseResolverWorkspaceEvent,
  getCaseResolverWorkspaceDebugEventName,
  readCaseResolverWorkspaceDebugEvents,
} from './workspace-observability';

import {
  primeCaseResolverNavigationWorkspace,
  readCaseResolverNavigationWorkspace,
} from './utils/workspace-navigation-cache';

import {
  buildCaseResolverNodeFileSnapshotKey,
  CASE_RESOLVER_NODE_FILE_SNAPSHOT_STORAGE_METADATA_KEY,
  fetchCaseResolverNodeFileSnapshotText,
  fetchCaseResolverNodeFileSnapshot,
  persistCaseResolverNodeFileSnapshot,
  deleteCaseResolverNodeFileSnapshot,
} from './node-file-persistence';

export * from './workspace-persistence-shared';
export * from './workspace-persistence-fetch';
export * from './workspace-persistence-save';

export {
  createCaseResolverWorkspaceMutationId,
  getCaseResolverWorkspaceRevision,
  stampCaseResolverWorkspaceMutation,
  logCaseResolverWorkspaceEvent,
  getCaseResolverWorkspaceDebugEventName,
  readCaseResolverWorkspaceDebugEvents,
  primeCaseResolverNavigationWorkspace,
  readCaseResolverNavigationWorkspace,
  computeCaseResolverConflictRetryDelayMs,
  buildCaseResolverNodeFileSnapshotKey,
  CASE_RESOLVER_NODE_FILE_SNAPSHOT_STORAGE_METADATA_KEY,
  fetchCaseResolverNodeFileSnapshotText,
  fetchCaseResolverNodeFileSnapshot,
  persistCaseResolverNodeFileSnapshot,
  deleteCaseResolverNodeFileSnapshot,
};
export type { CaseResolverWorkspaceDebugEvent };
