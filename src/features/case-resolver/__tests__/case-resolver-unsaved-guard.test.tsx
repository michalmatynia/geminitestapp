import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CaseResolverPageView } from '@/features/case-resolver/components/CaseResolverPageView';
import type { CaseResolverViewContextValue } from '@/features/case-resolver/components/CaseResolverViewContext';
import type { CaseResolverStateValue } from '@/features/case-resolver/types';

let viewContextMock: CaseResolverViewContextValue;
const handleOpenFileEditorMock = vi.fn();
const handleSaveFileEditorMock = vi.fn();
const handleDiscardFileEditorDraftMock = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(''),
}));

vi.mock('@/features/case-resolver/components/CaseResolverViewContext', () => ({
  useCaseResolverViewContext: (): CaseResolverViewContextValue => viewContextMock,
}));

vi.mock('@/features/case-resolver/components/CaseResolverFolderTree', async () => {
  const { useCaseResolverPageContext } =
    await import('@/features/case-resolver/context/CaseResolverPageContext');
  const CaseResolverFolderTree = () => {
    const context = useCaseResolverPageContext();
    return (
      <button type='button' onClick={() => context.onEditFile('file-b')}>
        Switch File
      </button>
    );
  };
  return { CaseResolverFolderTree };
});

vi.mock('@/features/case-resolver/components/page/CaseResolverPageMainContent', () => ({
  CaseResolverPageMainContent: () => <div data-testid='main-content' />,
}));

vi.mock('@/features/case-resolver/components/page/CaseResolverCaptureMappingModal', () => ({
  CaseResolverCaptureMappingModal: () => <div data-testid='capture-modal' />,
}));

vi.mock('@/features/case-resolver/components/CaseResolverWorkspaceDebugPanel', () => ({
  CaseResolverWorkspaceDebugPanel: () => <div data-testid='workspace-debug' />,
}));

const createViewContextMock = ({
  isEditorDraftDirty,
}: {
  isEditorDraftDirty: boolean;
}): CaseResolverViewContextValue => {
  const state = {
    workspace: {
      id: 'workspace-1',
      files: [],
      assets: [],
      folders: [],
    },
    activeCaseId: 'case-a',
    requestedCaseStatus: 'ready',
    requestedCaseIssue: null,
    canCreateInActiveCase: true,
    selectedFileId: 'file-a',
    selectedAssetId: null,
    selectedFolderPath: null,
    activeFile: null,
    selectedAsset: null,
    folderPanelCollapsed: false,
    setFolderPanelCollapsed: vi.fn(),
    handleSelectFile: vi.fn(),
    handleSelectAsset: vi.fn(),
    handleSelectFolder: vi.fn(),
    handleCreateFolder: vi.fn(),
    handleCreateFile: vi.fn(),
    handleCreateScanFile: vi.fn(),
    handleCreateNodeFile: vi.fn(),
    handleCreateImageAsset: vi.fn(),
    handleUploadScanFiles: vi.fn(),
    handleRunScanFileOcr: vi.fn(),
    handleUploadAssets: vi.fn(),
    handleAttachAssetFile: vi.fn(),
    handleDeleteFolder: vi.fn(),
    handleOpenFileEditor: handleOpenFileEditorMock,
    editingDocumentDraft: {
      id: 'file-a',
      fileType: 'document',
    },
    caseResolverTags: [],
    caseResolverIdentifiers: [],
    caseResolverCategories: [],
    handleUpdateSelectedAsset: vi.fn(),
    handleSaveFileEditor: handleSaveFileEditorMock,
    handleDiscardFileEditorDraft: handleDiscardFileEditorDraftMock,
    handleRetryCaseContext: vi.fn(),
    ConfirmationModal: () => null,
    PromptInputModal: () => null,
    handleMoveFile: vi.fn(),
    handleMoveAsset: vi.fn(),
    handleRenameFile: vi.fn(),
    handleRenameAsset: vi.fn(),
    handleRenameFolder: vi.fn(),
    handleCreateDocumentFromSearch: vi.fn(),
    handleOpenFileFromSearch: vi.fn(),
    handleEditFileFromSearch: vi.fn(),
    handleResetCaseContext: vi.fn(),
  } as unknown as CaseResolverStateValue;

  return {
    state,
    handleDeactivateActiveFile: vi.fn(),
    handleToggleFolderLock: vi.fn(),
    handleDeleteFile: vi.fn(),
    handleDeleteAsset: vi.fn(),
    handleToggleFileLock: vi.fn(),
    handleCreateDocumentFromSearch: vi.fn(),
    handleOpenFileFromSearch: vi.fn(),
    handleEditFileFromSearch: vi.fn(),
    handleGraphChange: vi.fn(),
    handleRelationGraphChange: vi.fn(),
    handleUpdateActiveCaseMetadata: vi.fn(),
    caseTagOptions: [],
    caseIdentifierOptions: [],
    caseCategoryOptions: [],
    caseReferenceOptions: [],
    parentCaseOptions: [],
    partyOptions: [],
    setWorkspaceView: vi.fn(),
    handleMoveFolder: vi.fn(),
    isEditorDraftDirty,
    handleResetCaseContext: vi.fn(),
  } as unknown as CaseResolverViewContextValue;
};

describe('CaseResolverPageView unsaved guard', () => {
  beforeEach(() => {
    handleOpenFileEditorMock.mockReset();
    handleSaveFileEditorMock.mockReset();
    handleDiscardFileEditorDraftMock.mockReset();
  });

  it('switches files without prompt when draft is not dirty', () => {
    viewContextMock = createViewContextMock({ isEditorDraftDirty: false });

    render(<CaseResolverPageView />);
    fireEvent.click(screen.getByRole('button', { name: 'Switch File' }));

    expect(handleOpenFileEditorMock).toHaveBeenCalledTimes(1);
    expect(handleOpenFileEditorMock).toHaveBeenCalledWith('file-b', undefined);
    expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument();
  });

  it('keeps navigation unblocked for clean drafts across repeated switches', () => {
    viewContextMock = createViewContextMock({ isEditorDraftDirty: false });

    render(<CaseResolverPageView />);
    const switchButton = screen.getByRole('button', { name: 'Switch File' });
    fireEvent.click(switchButton);
    fireEvent.click(switchButton);

    expect(handleOpenFileEditorMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument();
  });

  it('opens unsaved prompt when draft is dirty before switching files', () => {
    viewContextMock = createViewContextMock({ isEditorDraftDirty: true });

    render(<CaseResolverPageView />);
    fireEvent.click(screen.getByRole('button', { name: 'Switch File' }));

    expect(handleOpenFileEditorMock).not.toHaveBeenCalled();
    expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
    expect(
      screen.getByText('You have unsaved changes in this document. What would you like to do?')
    ).toBeInTheDocument();
  });
});
