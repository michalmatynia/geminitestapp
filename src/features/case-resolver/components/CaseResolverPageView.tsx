'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui';
import { useCaseResolverViewContext } from './CaseResolverViewContext';
import { CaseResolverPageProvider } from '../context/CaseResolverPageContext';
import { CaseResolverFolderTree } from './CaseResolverFolderTree';
import { CaseResolverPageMainContent } from './page/CaseResolverPageMainContent';
import { CaseResolverCaptureMappingModal } from './page/CaseResolverCaptureMappingModal';
import { CaseResolverWorkspaceDebugPanel } from './CaseResolverWorkspaceDebugPanel';
import { CaseResolverRuntimeProvider } from '../runtime';

export function CaseResolverPageView(): React.JSX.Element {
  const searchParams = useSearchParams();
  const contextValue = useCaseResolverViewContext();
  const { state } = contextValue;
  const workspaceDebugEnabled = (searchParams.get('debugWorkspace')?.trim() ?? '') === '1';
  const {
    workspace,
    activeCaseId,
    requestedCaseStatus,
    requestedCaseIssue,
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
    editingDocumentDraft,
    caseResolverTags,
    caseResolverIdentifiers,
    caseResolverCategories,
    handleUpdateSelectedAsset,
    handleSaveFileEditor,
    handleDiscardFileEditorDraft,
    handleRetryCaseContext,
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
    isEditorDraftDirty,
    handleResetCaseContext,
  } = contextValue;

  // Pending navigation stored as a callback so we can execute it after user confirms
  const [pendingNavigation, setPendingNavigation] = React.useState<(() => void) | null>(null);

  // Only guard document files — scan files don't have a text editor worth guarding
  const isDirtyDocumentDraft =
    isEditorDraftDirty &&
    editingDocumentDraft !== null &&
    editingDocumentDraft?.fileType !== 'scanfile';

  const guardNavigation = React.useCallback(
    (action: () => void): void => {
      if (isDirtyDocumentDraft) {
        // Wrap in an extra arrow so React doesn't treat `action` as a state-updater function
        setPendingNavigation(() => action);
        return;
      }
      action();
    },
    [isDirtyDocumentDraft]
  );

  return (
    <CaseResolverRuntimeProvider
      workspace={workspace}
      selectedFileId={selectedFileId}
      selectedAssetId={selectedAssetId}
      selectedFolderPath={selectedFolderPath}
      activeCaseId={activeCaseId}
      requestedFileId={state.requestedFileId}
      requestedContextStatus={requestedCaseStatus}
      requestedContextIssue={requestedCaseIssue}
    >
      <CaseResolverPageProvider
        value={{
          workspace,
          activeCaseId,
          requestedCaseStatus,
          requestedCaseIssue,
          canCreateInActiveCase,
          onRetryCaseContext: handleRetryCaseContext,
          onResetCaseContext: handleResetCaseContext as () => void,
          selectedFileId,
          selectedAssetId,
          selectedFolderPath,
          activeFile,
          selectedAsset,
          panelCollapsed: folderPanelCollapsed,
          onPanelCollapsedChange: setFolderPanelCollapsed,
          onDeactivateActiveFile: handleDeactivateActiveFile,
          onSelectFile: (fileId) => guardNavigation(() => handleSelectFile(fileId)),
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
          onEditFile: (fileId, options) => guardNavigation(() => handleOpenFileEditor(fileId, options)),
          caseResolverTags,
          caseResolverIdentifiers,
          caseResolverCategories,
          onCreateDocumentFromSearch: handleCreateDocumentFromSearch,
          onOpenFileFromSearch: (id) => guardNavigation(() => handleOpenFileFromSearch(id)),
          onEditFileFromSearch: (id) => guardNavigation(() => handleEditFileFromSearch(id)),
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
          <CaseResolverWorkspaceDebugPanel enabled={workspaceDebugEnabled} />

          {/* Unsaved-changes guard dialog */}
          <Dialog
            open={pendingNavigation !== null}
            onOpenChange={(open) => { if (!open) setPendingNavigation(null); }}
          >
            <DialogContent className='max-w-md'>
              <DialogHeader>
                <DialogTitle>Unsaved Changes</DialogTitle>
                <DialogDescription>
                  You have unsaved changes in this document. What would you like to do?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className='flex-col gap-2 sm:flex-col'>
                <Button
                  onClick={() => {
                    handleSaveFileEditor();
                    pendingNavigation?.();
                    setPendingNavigation(null);
                  }}
                  className='w-full border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                  variant='outline'
                >
                  Save &amp; Continue
                </Button>
                <Button
                  onClick={() => {
                    handleDiscardFileEditorDraft();
                    pendingNavigation?.();
                    setPendingNavigation(null);
                  }}
                  variant='outline'
                  className='w-full border-red-500/40 text-red-400 hover:bg-red-500/10'
                >
                  Discard Changes
                </Button>
                <Button
                  variant='ghost'
                  className='w-full'
                  onClick={() => setPendingNavigation(null)}
                >
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CaseResolverPageProvider>
    </CaseResolverRuntimeProvider>
  );
}
