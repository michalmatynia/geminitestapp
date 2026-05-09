import { type CaseResolverWorkspaceDebugEvent } from '@/shared/contracts/case-resolver';

import {
  buildCaseResolverNodeFileSnapshotKey,
  deleteCaseResolverNodeFileSnapshot,
  fetchCaseResolverNodeFileSnapshot,
  fetchCaseResolverNodeFileSnapshotText,
  persistCaseResolverNodeFileSnapshot,
} from './node-file-persistence';
import {
  primeCaseResolverNavigationWorkspace,
  readCaseResolverNavigationWorkspace,
} from './utils/workspace-navigation-cache';
import {
  computeCaseResolverConflictRetryDelayMs,
  createCaseResolverWorkspaceMutationId,
  getCaseResolverWorkspaceRevision,
  stampCaseResolverWorkspaceMutation,
} from './utils/workspace-persistence-utils';
import {
  getCaseResolverWorkspaceDebugEventName,
  logCaseResolverWorkspaceEvent,
  readCaseResolverWorkspaceDebugEvents,
} from './workspace-observability';

export * from './workspace-persistence-shared';
export * from './workspace-persistence-fetch';
export * from './workspace-persistence-save';

export {
  buildCaseResolverNodeFileSnapshotKey,
  computeCaseResolverConflictRetryDelayMs,
  createCaseResolverWorkspaceMutationId,
  deleteCaseResolverNodeFileSnapshot,
  fetchCaseResolverNodeFileSnapshot,
  fetchCaseResolverNodeFileSnapshotText,
  getCaseResolverWorkspaceDebugEventName,
  getCaseResolverWorkspaceRevision,
  logCaseResolverWorkspaceEvent,
  persistCaseResolverNodeFileSnapshot,
  primeCaseResolverNavigationWorkspace,
  readCaseResolverNavigationWorkspace,
  readCaseResolverWorkspaceDebugEvents,
  stampCaseResolverWorkspaceMutation,
};
export type { CaseResolverWorkspaceDebugEvent };
