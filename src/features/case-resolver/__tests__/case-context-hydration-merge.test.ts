import { describe, expect, it } from 'vitest';

import {
  createCaseResolverFile,
  createDefaultCaseResolverWorkspace,
} from '@/features/case-resolver/settings';
import {
  resolvePreferredCaseResolverWorkspace,
  shouldRefetchSettingsStoreForRequestedFile,
  shouldAdoptIncomingWorkspace,
} from '@/features/case-resolver/hooks/useCaseResolverState.helpers.hydration';

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

  it('prefers store workspace when store snapshot is available', () => {
    const storeWorkspace = createDefaultCaseResolverWorkspace();

    const selection = resolvePreferredCaseResolverWorkspace({
      storeWorkspace,
      hasStoreWorkspace: true,
      hasNavigationWorkspace: false,
      hasHeavyWorkspace: true,
      requestedFileId: 'case-heavy',
    });

    expect(selection.source).toBe('store');
    expect(selection.reason).toBe('store_only');
    expect(selection.workspace.files).toEqual([]);
  });

  it('keeps store workspace when additional fallback sources are present', () => {
    const caseFile = createCaseResolverFile({
      id: 'case-store',
      fileType: 'case',
      name: 'Case Store',
    });
    const storeWorkspace = {
      ...createDefaultCaseResolverWorkspace(),
      id: 'workspace-store',
      files: [caseFile],
      activeFileId: caseFile.id,
      workspaceRevision: 4,
    };
    const heavyWorkspace = {
      ...createDefaultCaseResolverWorkspace(),
      id: 'workspace-heavy',
      files: [caseFile],
      activeFileId: caseFile.id,
      workspaceRevision: 3,
    };

    const selection = resolvePreferredCaseResolverWorkspace({
      storeWorkspace,
      heavyWorkspace,
      hasStoreWorkspace: true,
      hasNavigationWorkspace: false,
      hasHeavyWorkspace: true,
      requestedFileId: null,
    });

    expect(selection.source).toBe('store');
    expect(selection.reason).toBe('store_only');
    expect(selection.workspace.workspaceRevision).toBe(4);
  });

  it('returns no source when store snapshot is unavailable', () => {
    const selection = resolvePreferredCaseResolverWorkspace({
      storeWorkspace: createDefaultCaseResolverWorkspace(),
      heavyWorkspace: createDefaultCaseResolverWorkspace(),
      hasStoreWorkspace: false,
      hasNavigationWorkspace: false,
      hasHeavyWorkspace: true,
      requestedFileId: null,
    });

    expect(selection.source).toBe('none');
    expect(selection.reason).toBe('no_workspace_source');
    expect(selection.workspace.files).toEqual([]);
  });

  it('returns no source when both snapshots are unavailable', () => {
    const selection = resolvePreferredCaseResolverWorkspace({
      storeWorkspace: createDefaultCaseResolverWorkspace(),
      heavyWorkspace: createDefaultCaseResolverWorkspace(),
      hasStoreWorkspace: false,
      hasNavigationWorkspace: false,
      hasHeavyWorkspace: false,
      requestedFileId: null,
    });

    expect(selection.source).toBe('none');
    expect(selection.reason).toBe('no_workspace_source');
    expect(selection.workspace.files).toEqual([]);
  });

  it('requests a one-shot store refetch when the requested file is missing from both store and active workspace', () => {
    const shouldRefetch = shouldRefetchSettingsStoreForRequestedFile({
      requestedFileId: 'case-requested',
      requestedFileResolvedInWorkspace: false,
      requestedFileResolvedInStore: false,
      isStoreLoading: false,
      isStoreFetching: false,
      lastRefetchedFileId: null,
    });

    expect(shouldRefetch).toBe(true);
  });

  it('does not refetch the store when the requested file is already available or already retried', () => {
    expect(
      shouldRefetchSettingsStoreForRequestedFile({
        requestedFileId: 'case-requested',
        requestedFileResolvedInWorkspace: true,
        requestedFileResolvedInStore: false,
        isStoreLoading: false,
        isStoreFetching: false,
        lastRefetchedFileId: null,
      })
    ).toBe(false);

    expect(
      shouldRefetchSettingsStoreForRequestedFile({
        requestedFileId: 'case-requested',
        requestedFileResolvedInWorkspace: false,
        requestedFileResolvedInStore: true,
        isStoreLoading: false,
        isStoreFetching: false,
        lastRefetchedFileId: null,
      })
    ).toBe(false);

    expect(
      shouldRefetchSettingsStoreForRequestedFile({
        requestedFileId: 'case-requested',
        requestedFileResolvedInWorkspace: false,
        requestedFileResolvedInStore: false,
        isStoreLoading: false,
        isStoreFetching: false,
        lastRefetchedFileId: 'case-requested',
      })
    ).toBe(false);
  });

  it('uses navigation workspace fallback when store snapshot misses the requested file', () => {
    const requestedCase = createCaseResolverFile({
      id: 'case-requested',
      fileType: 'case',
      name: 'Requested Case',
    });
    const storeWorkspace = {
      ...createDefaultCaseResolverWorkspace(),
      id: 'workspace-store',
      files: [],
      workspaceRevision: 4,
    };
    const navigationWorkspace = {
      ...createDefaultCaseResolverWorkspace(),
      id: 'workspace-nav',
      files: [requestedCase],
      activeFileId: requestedCase.id,
      workspaceRevision: 3,
    };

    const selection = resolvePreferredCaseResolverWorkspace({
      storeWorkspace,
      navigationWorkspace,
      hasStoreWorkspace: true,
      hasNavigationWorkspace: true,
      requestedFileId: requestedCase.id,
    });

    expect(selection.source).toBe('navigation');
    expect(selection.reason).toBe('navigation_requested_file_fallback');
    expect(selection.workspace.files.some((file) => file.id === requestedCase.id)).toBe(true);
  });

  it('uses navigation workspace when store is unavailable and requested file is present in navigation cache', () => {
    const requestedCase = createCaseResolverFile({
      id: 'case-requested',
      fileType: 'case',
      name: 'Requested Case',
    });
    const selection = resolvePreferredCaseResolverWorkspace({
      storeWorkspace: createDefaultCaseResolverWorkspace(),
      navigationWorkspace: {
        ...createDefaultCaseResolverWorkspace(),
        id: 'workspace-nav',
        files: [requestedCase],
        activeFileId: requestedCase.id,
      },
      hasStoreWorkspace: false,
      hasNavigationWorkspace: true,
      requestedFileId: requestedCase.id,
    });

    expect(selection.source).toBe('navigation');
    expect(selection.reason).toBe('navigation_only');
  });
});
