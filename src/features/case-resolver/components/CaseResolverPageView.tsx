'use client';

import React from 'react';

import { useCaseResolverViewContext } from './CaseResolverViewContext';
import { CaseResolverPageProvider } from '../context/CaseResolverPageContext';
import { CaseResolverFolderTree } from './CaseResolverFolderTree';
import { CaseResolverPageMainContent } from './page/CaseResolverPageMainContent';
import { CaseResolverCaptureMappingModal } from './page/CaseResolverCaptureMappingModal';

export function CaseResolverPageView(): React.JSX.Element {
  const contextValue = useCaseResolverViewContext();
  const { state } = contextValue;
  const { 
    workspace,
    activeCaseId,
    requestedCaseStatus,
    canCreateInActiveCase,
    selectedFileId,
    selectedAssetId,
    selectedFolderPath,
    activeFile,
    selectedAsset,
    folderPanelCollapsed,
    setFolderPanelCollapsed,
    handleSelectFile,
    handleSelectAsset,
    handleSelectFolder,
    handleCreateFolder,
    handleCreateFile,
    handleCreateScanFile,
    handleCreateNodeFile,
    handleCreateImageAsset,
    handleUploadScanFiles,
    handleRunScanFileOcr,
    handleUploadAssets,
    handleAttachAssetFile,
    handleDeleteFolder,
    handleOpenFileEditor,
    caseResolverTags,
    caseResolverIdentifiers,
    caseResolverCategories,
    handleUpdateSelectedAsset,
    ConfirmationModal,
    PromptInputModal,
  } = state;

  const {
    handleDeactivateActiveFile,
    handleToggleFolderLock,
    handleDeleteFile,
    handleDeleteAsset,
    handleToggleFileLock,
    handleCreateDocumentFromSearch,
    handleOpenFileFromSearch,
    handleEditFileFromSearch,
    handleGraphChange,
    handleRelationGraphChange,
    handleUpdateActiveCaseMetadata,
    caseTagOptions,
    caseIdentifierOptions,
    caseCategoryOptions,
    caseReferenceOptions,
    parentCaseOptions,
    partyOptions,
    setWorkspaceView,
    handleMoveFolder,
  } = contextValue;

  return (
    <CaseResolverPageProvider
      value={{
        workspace,
        activeCaseId,
        requestedCaseStatus,
        canCreateInActiveCase,
        selectedFileId,
        selectedAssetId,
        selectedFolderPath,
        activeFile,
        selectedAsset,
        panelCollapsed: folderPanelCollapsed,
        onPanelCollapsedChange: setFolderPanelCollapsed,
        onDeactivateActiveFile: handleDeactivateActiveFile,
        onSelectFile: handleSelectFile,
        onSelectAsset: handleSelectAsset,
        onSelectFolder: handleSelectFolder,
        onCreateFile: handleCreateFile,
        onCreateFolder: handleCreateFolder,
        onDeleteFolder: handleDeleteFolder,
        onCreateScanFile: handleCreateScanFile,
        onCreateImageAsset: handleCreateImageAsset,
        onCreateNodeFile: (targetFolderPath) => {
          handleCreateNodeFile(targetFolderPath);
          setWorkspaceView('document');
        },
        onUploadScanFiles: handleUploadScanFiles,
        onRunScanFileOcr: handleRunScanFileOcr,
        onUploadAssets: handleUploadAssets,
        onAttachAssetFile: handleAttachAssetFile,
        onMoveFile: state.handleMoveFile,
        onMoveAsset: state.handleMoveAsset,
        onMoveFolder: handleMoveFolder,
        onRenameFile: state.handleRenameFile,
        onRenameAsset: state.handleRenameAsset,
        onRenameFolder: state.handleRenameFolder,
        onToggleFolderLock: handleToggleFolderLock,
        onDeleteFile: handleDeleteFile,
        onDeleteAsset: handleDeleteAsset,
        onToggleFileLock: handleToggleFileLock,
        onEditFile: handleOpenFileEditor,
        caseResolverTags,
        caseResolverIdentifiers,
        caseResolverCategories,
        onCreateDocumentFromSearch: handleCreateDocumentFromSearch,
        onOpenFileFromSearch: handleOpenFileFromSearch,
        onEditFileFromSearch: handleEditFileFromSearch,
        onUpdateSelectedAsset: handleUpdateSelectedAsset,
        onGraphChange: handleGraphChange,
        onRelationGraphChange: handleRelationGraphChange,
        onLinkRelatedFiles: state.handleLinkRelatedFiles,
        onUnlinkRelatedFile: state.handleUnlinkRelatedFile,
        onUpdateActiveCase: handleUpdateActiveCaseMetadata,
        caseTagOptions,
        caseIdentifierOptions,
        caseCategoryOptions,
        caseReferenceOptions,
        parentCaseOptions,
        partyOptions,
      }}
    >
      <div className='flex h-full flex-col overflow-hidden bg-background'>
        <div className='flex flex-1 overflow-hidden'>
          {!folderPanelCollapsed && (
            <div className='w-80 flex-shrink-0 border-r border-border bg-card/20'>
              <CaseResolverFolderTree />
            </div>
          )}

          <CaseResolverPageMainContent />
        </div>

        <CaseResolverCaptureMappingModal />

        <ConfirmationModal />
        <PromptInputModal />
      </div>
    </CaseResolverPageProvider>
  );
}
