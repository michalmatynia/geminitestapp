import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  useCaseResolverStateFolderActions,
  type UseCaseResolverStateFolderActionsResult,
} from '@/features/case-resolver/hooks/useCaseResolverState.folder-actions';
import {
  createCaseResolverAssetFile,
  createCaseResolverFile,
  parseCaseResolverWorkspace,
} from '@/features/case-resolver/settings';
import type { CaseResolverFile, CaseResolverFileEditDraft } from '@/shared/contracts/case-resolver/file';
import type { CaseResolverWorkspace } from '@/shared/contracts/case-resolver/workspace';

const createMutableState = <T>(
  initial: T
): {
  set: React.Dispatch<React.SetStateAction<T>>;
} => {
  let current = initial;
  const set: React.Dispatch<React.SetStateAction<T>> = (value): void => {
    current = typeof value === 'function' ? (value as (prev: T) => T)(current) : value;
  };
  return { set };
};

const buildFolderActionsHarness = (): {
  result: { current: UseCaseResolverStateFolderActionsResult };
  getWorkspace: () => CaseResolverWorkspace;
} => {
  const caseFile = createCaseResolverFile({
    id: 'case-1',
    fileType: 'case',
    name: 'Case 1',
    folder: '',
  });
  const documentFile = createCaseResolverFile({
    id: 'doc-1',
    fileType: 'document',
    name: 'Document 1',
    folder: '',
    parentCaseId: caseFile.id,
  });
  const scanFile = createCaseResolverFile({
    id: 'scan-1',
    fileType: 'scanfile',
    name: 'Scan 1',
    folder: '',
    parentCaseId: caseFile.id,
  });
  const nodeFileAsset = createCaseResolverAssetFile({
    id: 'asset-node-1',
    sourceFileId: documentFile.id,
    folder: '',
    name: 'NodeFile 1',
    kind: 'node_file',
    mimeType: 'application/json',
    size: 32,
    filepath: '/tmp/nodefile-1.json',
    createdAt: '2026-02-01T10:00:00.000Z',
    updatedAt: '2026-02-01T10:00:00.000Z',
  });

  let workspace: CaseResolverWorkspace = {
    ...parseCaseResolverWorkspace(null),
    files: [caseFile, documentFile, scanFile],
    assets: [nodeFileAsset],
    activeFileId: documentFile.id,
  };

  const selectedFileState = createMutableState<string | null>(documentFile.id);
  const selectedAssetState = createMutableState<string | null>(null);
  const selectedFolderState = createMutableState<string | null>(null);
  const editingDraftState = createMutableState<CaseResolverFileEditDraft | null>(null);

  const updateWorkspace = (
    updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace
  ): void => {
    workspace = updater(workspace);
  };

  const { result } = renderHook(() =>
    useCaseResolverStateFolderActions({
      confirm: () => {},
      toast: () => {},
      updateWorkspace,
      workspace,
      selectedCaseScopeIds: null,
      selectedCaseContainerId: null,
      setSelectedFileId: selectedFileState.set,
      setSelectedAssetId: selectedAssetState.set,
      setSelectedFolderPath: selectedFolderState.set,
      setEditingDocumentDraft: editingDraftState.set,
      treeSaveToast: 'Case Resolver tree changes saved.',
    })
  );

  return {
    result,
    getWorkspace: (): CaseResolverWorkspace => workspace,
  };
};

describe('case resolver folder actions move regression', () => {
  it('moves a document file into a target folder', async () => {
    const harness = buildFolderActionsHarness();

    await harness.result.current.handleMoveFile('doc-1', 'docs/nested');

    const nextWorkspace = harness.getWorkspace();
    const movedFile = nextWorkspace.files.find(
      (file: CaseResolverFile): boolean => file.id === 'doc-1'
    );
    expect(movedFile?.folder).toBe('docs/nested');
    expect(nextWorkspace.folders).toContain('docs/nested');
  });

  it('moves a scan file into a target folder', async () => {
    const harness = buildFolderActionsHarness();

    await harness.result.current.handleMoveFile('scan-1', 'scan-uploads');

    const nextWorkspace = harness.getWorkspace();
    const movedFile = nextWorkspace.files.find(
      (file: CaseResolverFile): boolean => file.id === 'scan-1'
    );
    expect(movedFile?.folder).toBe('scan-uploads');
    expect(nextWorkspace.folders).toContain('scan-uploads');
  });

  it('moves a node file asset into a target folder', async () => {
    const harness = buildFolderActionsHarness();

    await harness.result.current.handleMoveAsset('asset-node-1', 'node-assets');

    const movedAsset = harness
      .getWorkspace()
      .assets.find((asset): boolean => asset.id === 'asset-node-1');
    expect(movedAsset?.folder).toBe('node-assets');
  });
});
