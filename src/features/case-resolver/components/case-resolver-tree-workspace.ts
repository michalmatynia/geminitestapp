import type { CaseResolverWorkspace } from '@/shared/contracts/case-resolver';

import { resolveScopedCaseResolverWorkspaceWithIndexes } from '../runtime';

import type { CaseResolverRuntimeIndexes } from '../runtime';

type ResolveCaseResolverTreeWorkspaceArgs = {
  selectedFileId: string | null;
  requestedFileId: string | null;
  activeCaseId?: string | null;
  workspace: CaseResolverWorkspace;
  includeDescendantCaseScope?: boolean;
  indexes?: CaseResolverRuntimeIndexes;
};

export const resolveCaseResolverTreeWorkspace = ({
  selectedFileId,
  requestedFileId,
  activeCaseId = null,
  workspace,
  includeDescendantCaseScope = true,
  indexes,
}: ResolveCaseResolverTreeWorkspaceArgs): CaseResolverWorkspace =>
  resolveScopedCaseResolverWorkspaceWithIndexes({
    selectedFileId,
    requestedFileId,
    activeCaseId,
    workspace,
    includeDescendantCaseScope,
    indexes,
  });
