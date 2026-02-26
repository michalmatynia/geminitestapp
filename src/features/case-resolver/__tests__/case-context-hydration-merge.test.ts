import { describe, expect, it } from 'vitest';

import { createCaseResolverFile, createDefaultCaseResolverWorkspace } from '@/features/case-resolver/settings';
import { shouldAdoptIncomingWorkspace } from '@/features/case-resolver/hooks/useCaseResolverState.helpers.hydration';

describe('case resolver workspace hydration merge', () => {
  it('adopts equal-revision incoming workspace when current workspace is placeholder and incoming has data', () => {
    const current = createDefaultCaseResolverWorkspace();
    const caseFile = createCaseResolverFile({
      id: 'case-a',
      fileType: 'case',
      name: 'Case A',
    });
    const incoming = {
      ...createDefaultCaseResolverWorkspace(),
      id: 'workspace-non-empty',
      files: [caseFile],
      activeFileId: caseFile.id,
      workspaceRevision: 0,
    };

    const decision = shouldAdoptIncomingWorkspace({
      current,
      incoming,
      requestedFileId: caseFile.id,
    });

    expect(decision).toEqual({
      adopt: true,
      reason: 'equal_revision_current_placeholder',
    });
  });

  it('adopts incoming workspace when requested file is missing in current workspace', () => {
    const currentCase = createCaseResolverFile({
      id: 'case-current',
      fileType: 'case',
      name: 'Case Current',
    });
    const requestedCase = createCaseResolverFile({
      id: 'case-requested',
      fileType: 'case',
      name: 'Case Requested',
    });
    const current = {
      ...createDefaultCaseResolverWorkspace(),
      id: 'workspace-current',
      files: [currentCase],
      activeFileId: currentCase.id,
      workspaceRevision: 1,
    };
    const incoming = {
      ...createDefaultCaseResolverWorkspace(),
      id: 'workspace-incoming',
      files: [currentCase, requestedCase],
      activeFileId: requestedCase.id,
      workspaceRevision: 1,
    };

    const decision = shouldAdoptIncomingWorkspace({
      current,
      incoming,
      requestedFileId: requestedCase.id,
    });

    expect(decision).toEqual({
      adopt: true,
      reason: 'requested_file_missing_in_current',
    });
  });

  it('keeps current workspace when incoming workspace is older and does not resolve requested context', () => {
    const currentCase = createCaseResolverFile({
      id: 'case-current',
      fileType: 'case',
      name: 'Case Current',
    });
    const incomingCase = createCaseResolverFile({
      id: 'case-incoming',
      fileType: 'case',
      name: 'Case Incoming',
    });
    const current = {
      ...createDefaultCaseResolverWorkspace(),
      id: 'workspace-current',
      files: [currentCase],
      activeFileId: currentCase.id,
      workspaceRevision: 3,
    };
    const incoming = {
      ...createDefaultCaseResolverWorkspace(),
      id: 'workspace-incoming',
      files: [incomingCase],
      activeFileId: incomingCase.id,
      workspaceRevision: 2,
    };

    const decision = shouldAdoptIncomingWorkspace({
      current,
      incoming,
      requestedFileId: null,
    });

    expect(decision).toEqual({
      adopt: false,
      reason: 'keep_current',
    });
  });
});
