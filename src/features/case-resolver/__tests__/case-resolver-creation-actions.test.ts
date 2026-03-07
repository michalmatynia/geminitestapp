import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useCaseResolverStateCreationActions } from '@/features/case-resolver/hooks/useCaseResolverState.creation-actions';
import { resolveCaseResolverTreeWorkspace } from '@/features/case-resolver/components/case-resolver-tree-workspace';
import {
  createCaseResolverFile,
  parseCaseResolverWorkspace,
} from '@/features/case-resolver/settings';
import type {
  CaseResolverRequestedCaseStatus,
  CaseResolverWorkspace,
} from '@/shared/contracts/case-resolver';
import type { SettingsStoreValue } from '@/shared/providers/SettingsStoreProvider';

import * as workspacePersistence from '@/features/case-resolver/workspace-persistence';

vi.mock('@/features/case-resolver/workspace-persistence', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/case-resolver/workspace-persistence')
      >('@/features/case-resolver/workspace-persistence');
  return {
    ...actual,
    fetchCaseResolverWorkspaceSnapshot: vi.fn(),
    getCaseResolverWorkspaceRevision: vi.fn(() => 0),
    logCaseResolverWorkspaceEvent: vi.fn(),
  };
});

const createMutableState = <T>(
  initial: T
): {
  get: () => T;
  set: React.Dispatch<React.SetStateAction<T>>;
} => {
  let current = initial;
  const set: React.Dispatch<React.SetStateAction<T>> = (value): void => {
    current = typeof value === 'function' ? (value as (prev: T) => T)(current) : value;
  };
  return {
    get: (): T => current,
    set,
  };
};

const createSettingsStore = (refetch: () => void): SettingsStoreValue => ({
  map: new Map(),
  isLoading: false,
  isFetching: false,
  error: null,
  get: () => undefined,
  getBoolean: (_key, fallback = false) => fallback,
  getNumber: (_key, fallback) => fallback,
  refetch,
});

const buildHarness = ({
  workspace,
  requestedFileId,
  selectedFileId,
  requestedCaseStatus,
  activeCaseId,
  canCreateInActiveCase,
}: {
  workspace: CaseResolverWorkspace;
  requestedFileId: string | null;
  selectedFileId: string | null;
  requestedCaseStatus: CaseResolverRequestedCaseStatus;
  activeCaseId: string | null;
  canCreateInActiveCase: boolean;
}) => {
  let currentWorkspace = workspace;
  const requestedCaseStatusState =
    createMutableState<CaseResolverRequestedCaseStatus>(requestedCaseStatus);
  const selectedFileState = createMutableState<string | null>(null);
  const selectedAssetState = createMutableState<string | null>(null);
  const selectedFolderState = createMutableState<string | null>(null);
  const toast = vi.fn();
  const refetch = vi.fn();

  const updateWorkspace = (
    updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace
  ): void => {
    currentWorkspace = updater(currentWorkspace);
  };
  const setWorkspace: React.Dispatch<React.SetStateAction<CaseResolverWorkspace>> = (
    value
  ): void => {
    currentWorkspace =
      typeof value === 'function'
        ? (value as (current: CaseResolverWorkspace) => CaseResolverWorkspace)(currentWorkspace)
        : value;
  };

  const { result } = renderHook(() =>
    useCaseResolverStateCreationActions({
      workspace: currentWorkspace,
      updateWorkspace,
      setWorkspace,
      syncPersistedWorkspaceTracking: vi.fn(),
      requestedFileId,
      selectedFileId,
      requestedCaseStatus: requestedCaseStatusState.get(),
      setRequestedCaseStatus: requestedCaseStatusState.set,
      activeCaseId,
      canCreateInActiveCase,
      defaultTagId: null,
      defaultCaseIdentifierId: null,
      defaultCategoryId: null,
      setSelectedFileId: selectedFileState.set,
      setSelectedAssetId: selectedAssetState.set,
      setSelectedFolderPath: selectedFolderState.set,
      settingsStoreRef: { current: createSettingsStore(refetch) },
      toast,
    })
  );

  return {
    result,
    getWorkspace: (): CaseResolverWorkspace => currentWorkspace,
    getRequestedCaseStatus: (): CaseResolverRequestedCaseStatus => requestedCaseStatusState.get(),
    toast,
    refetch,
  };
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('useCaseResolverStateCreationActions', () => {
  it('creates node file directly when active case context is ready', () => {
    const caseFile = createCaseResolverFile({
      id: 'case-1',
      fileType: 'case',
      name: 'Case 1',
    });
    const workspace: CaseResolverWorkspace = {
      ...parseCaseResolverWorkspace(null),
      files: [caseFile],
      folderRecords: [{ path: 'analysis', ownerCaseId: caseFile.id }],
      activeFileId: caseFile.id,
    };
    const harness = buildHarness({
      workspace,
      requestedFileId: null,
      selectedFileId: caseFile.id,
      requestedCaseStatus: 'ready',
      activeCaseId: caseFile.id,
      canCreateInActiveCase: true,
    });

    act(() => {
      harness.result.current.handleCreateNodeFile('analysis');
    });

    const createdAsset = harness
      .getWorkspace()
      .assets.find((asset) => asset.kind === 'node_file' && asset.folder === 'analysis');
    expect(createdAsset).toBeTruthy();
    expect(createdAsset?.metadata?.ownerCaseId).toBe(caseFile.id);
  });

  it('recovers requested context and creates node file when active case is temporarily unresolved', async () => {
    const caseFile = createCaseResolverFile({
      id: 'case-1',
      fileType: 'case',
      name: 'Case 1',
    });
    const refreshedWorkspace: CaseResolverWorkspace = {
      ...parseCaseResolverWorkspace(null),
      files: [caseFile],
      folderRecords: [{ path: 'analysis', ownerCaseId: caseFile.id }],
      activeFileId: caseFile.id,
    };
    const fetchSnapshotMock = vi.mocked(workspacePersistence.fetchCaseResolverWorkspaceSnapshot);
    fetchSnapshotMock.mockResolvedValueOnce(refreshedWorkspace);

    const harness = buildHarness({
      workspace: parseCaseResolverWorkspace(null),
      requestedFileId: caseFile.id,
      selectedFileId: null,
      requestedCaseStatus: 'ready',
      activeCaseId: null,
      canCreateInActiveCase: false,
    });

    act(() => {
      harness.result.current.handleCreateNodeFile('analysis');
    });

    await waitFor(() => {
      const created = harness.getWorkspace().assets.some((asset) => asset.kind === 'node_file');
      expect(created).toBe(true);
    });

    const createdAsset = harness
      .getWorkspace()
      .assets.find((asset) => asset.kind === 'node_file' && asset.folder === 'analysis');
    expect(fetchSnapshotMock).toHaveBeenCalledWith('case_view_create_node_file_recover');
    expect(harness.getRequestedCaseStatus()).toBe('ready');
    expect(harness.refetch).toHaveBeenCalled();
    expect(createdAsset?.metadata?.ownerCaseId).toBe(caseFile.id);
  });

  it('keeps recovered root node file visible in scoped case workspace', async () => {
    const caseFile = createCaseResolverFile({
      id: 'case-1',
      fileType: 'case',
      name: 'Case 1',
    });
    const refreshedWorkspace: CaseResolverWorkspace = {
      ...parseCaseResolverWorkspace(null),
      files: [caseFile],
      activeFileId: caseFile.id,
    };
    const fetchSnapshotMock = vi.mocked(workspacePersistence.fetchCaseResolverWorkspaceSnapshot);
    fetchSnapshotMock.mockResolvedValueOnce(refreshedWorkspace);

    const harness = buildHarness({
      workspace: parseCaseResolverWorkspace(null),
      requestedFileId: caseFile.id,
      selectedFileId: null,
      requestedCaseStatus: 'ready',
      activeCaseId: null,
      canCreateInActiveCase: false,
    });

    act(() => {
      harness.result.current.handleCreateNodeFile(null);
    });

    await waitFor(() => {
      const created = harness.getWorkspace().assets.some((asset) => asset.kind === 'node_file');
      expect(created).toBe(true);
    });

    const scopedWorkspace = resolveCaseResolverTreeWorkspace({
      selectedFileId: caseFile.id,
      requestedFileId: caseFile.id,
      workspace: harness.getWorkspace(),
    });
    const createdAssetId = harness
      .getWorkspace()
      .assets.find((asset) => asset.kind === 'node_file')?.id;

    expect(createdAssetId).toBeTruthy();
    expect(scopedWorkspace.assets.map((asset) => asset.id)).toContain(createdAssetId as string);
  });

  it('keeps node file create blocked when recovery cannot resolve case context', async () => {
    const missingRequestedFileId = 'case-missing';
    const fetchSnapshotMock = vi.mocked(workspacePersistence.fetchCaseResolverWorkspaceSnapshot);
    fetchSnapshotMock.mockResolvedValueOnce(parseCaseResolverWorkspace(null));

    const harness = buildHarness({
      workspace: parseCaseResolverWorkspace(null),
      requestedFileId: missingRequestedFileId,
      selectedFileId: null,
      requestedCaseStatus: 'ready',
      activeCaseId: null,
      canCreateInActiveCase: false,
    });

    act(() => {
      harness.result.current.handleCreateNodeFile(null);
    });

    await waitFor(() => {
      expect(harness.getRequestedCaseStatus()).toBe('missing');
    });

    expect(fetchSnapshotMock).toHaveBeenCalledWith('case_view_create_node_file_recover');
    expect(harness.getWorkspace().assets.some((asset) => asset.kind === 'node_file')).toBe(false);
    expect(harness.toast).toHaveBeenCalledWith('Cannot create node file without a selected case.', {
      variant: 'warning',
    });
  });
});
