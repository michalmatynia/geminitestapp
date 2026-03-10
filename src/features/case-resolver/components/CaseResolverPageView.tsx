'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import React from 'react';
import { createPortal } from 'react-dom';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui';

import { CaseResolverFolderTree } from './CaseResolverFolderTree';
import {
  useCaseResolverViewActionsContext,
  useCaseResolverViewStateContext,
} from './CaseResolverViewContext';
import { CaseResolverWorkspaceDebugPanel } from './CaseResolverWorkspaceDebugPanel';
import { CaseResolverPageProvider } from '../context/CaseResolverPageContext';
import { CaseResolverRuntimeProvider } from '../runtime';
import { CaseResolverCaptureMappingModal } from './page/CaseResolverCaptureMappingModal';
import { CaseResolverPageMainContent } from './page/CaseResolverPageMainContent';

type PendingNavigation = {
  kind: 'document' | 'case';
  action: () => void;
};

export function CaseResolverPageView(): React.JSX.Element {
  const searchParams = useSearchParams();
  const {
    state,
    caseTagOptions,
    caseIdentifierOptions,
    caseCategoryOptions,
    caseReferenceOptions,
    parentCaseOptions,
    partyOptions,
    isEditorDraftDirty,
    isActiveCaseMetadataDirty,
    activeCaseFile,
    activeCaseMetadataDraft,
  } = useCaseResolverViewStateContext();
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
    setWorkspaceView,
    handleMoveFolder,
    handleSaveActiveCaseMetadata,
    handleDiscardActiveCaseMetadata,
    updateActiveCaseMetadataDraft,
    handleResetCaseContext,
  } = useCaseResolverViewActionsContext();
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
    isMenuCollapsed,
    setIsMenuCollapsed,
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

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Pending navigation stored as a callback so we can execute it after user confirms
  const [pendingNavigation, setPendingNavigation] = React.useState<PendingNavigation | null>(null);

  // Only guard document files — scan files don't have a text editor worth guarding
  const isDirtyDocumentDraft =
    isEditorDraftDirty &&
    editingDocumentDraft !== null &&
    editingDocumentDraft?.fileType !== 'scanfile';

  const guardNavigation = React.useCallback(
    (action: () => void): void => {
      if (isDirtyDocumentDraft) {
        setPendingNavigation({ kind: 'document', action });
        return;
      }
      if (isActiveCaseMetadataDirty) {
        setPendingNavigation({ kind: 'case', action });
        return;
      }
      action();
    },
    [isActiveCaseMetadataDirty, isDirtyDocumentDraft]
  );

  const menuToggleButton = !mounted
    ? null
    : createPortal(
      <Button
        size='xs'
        type='button'
        variant='outline'
        onClick={(): void => setIsMenuCollapsed(!isMenuCollapsed)}
        title={isMenuCollapsed ? 'Show side admin menu' : 'Hide side admin menu'}
        aria-label={isMenuCollapsed ? 'Show side admin menu' : 'Hide side admin menu'}
        className='fixed left-1/2 top-0 z-40 h-8 w-10 -translate-x-1/2 rounded-b-lg rounded-t-none border-t-0 bg-background/90 px-0 shadow-md backdrop-blur-sm animate-in fade-in slide-in-from-top-2'
      >
        {isMenuCollapsed ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
      </Button>,
      document.body
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
          onResetCaseContext: () => guardNavigation(handleResetCaseContext as () => void),
          selectedFileId,
          selectedAssetId,
          selectedFolderPath,
          activeFile,
          selectedAsset,
          activeCaseFile,
          panelCollapsed: folderPanelCollapsed,
          onPanelCollapsedChange: setFolderPanelCollapsed,
          onDeactivateActiveFile: () => guardNavigation(handleDeactivateActiveFile),
          onSelectFile: (fileId) => guardNavigation(() => handleSelectFile(fileId)),
          onSelectAsset: (assetId) => guardNavigation(() => handleSelectAsset(assetId)),
          onSelectFolder: (folderPath) => guardNavigation(() => handleSelectFolder(folderPath)),
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
          onEditFile: (fileId, options) =>
            guardNavigation(() => handleOpenFileEditor(fileId, options)),
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
          activeCaseMetadataDraft,
          isActiveCaseMetadataDirty,
          onUpdateActiveCaseDraft: updateActiveCaseMetadataDraft,
          onSaveActiveCase: handleSaveActiveCaseMetadata,
          onDiscardActiveCaseChanges: handleDiscardActiveCaseMetadata,
          caseTagOptions,
          caseIdentifierOptions,
          caseCategoryOptions,
          caseReferenceOptions,
          parentCaseOptions,
          partyOptions,
        }}
      >
        <div className='flex h-full flex-col overflow-hidden bg-background'>
          {menuToggleButton}
          <div className='flex flex-1 overflow-hidden'>
            {!folderPanelCollapsed && (
              <div
                className={`${
                  isMenuCollapsed ? 'w-[26rem]' : 'w-80'
                } flex-shrink-0 border-r border-border bg-card/20`}
              >
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
            onOpenChange={(open) => {
              if (!open) setPendingNavigation(null);
            }}
          >
            <DialogContent className='max-w-md'>
              <DialogHeader>
                <DialogTitle>Unsaved Changes</DialogTitle>
                <DialogDescription>
                  {pendingNavigation?.kind === 'case'
                    ? 'You have unsaved changes in this case. What would you like to do?'
                    : 'You have unsaved changes in this document. What would you like to do?'}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className='flex-col gap-2 sm:flex-col'>
                <Button
                  onClick={() => {
                    if (pendingNavigation?.kind === 'case') {
                      handleSaveActiveCaseMetadata();
                    } else {
                      handleSaveFileEditor();
                    }
                    pendingNavigation?.action();
                    setPendingNavigation(null);
                  }}
                  className='w-full border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                  variant='outline'
                >
                  Save
                </Button>
                <Button
                  variant='ghost'
                  className='w-full'
                  onClick={() => setPendingNavigation(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (pendingNavigation?.kind === 'case') {
                      handleDiscardActiveCaseMetadata();
                    } else {
                      handleDiscardFileEditorDraft();
                    }
                    pendingNavigation?.action();
                    setPendingNavigation(null);
                  }}
                  variant='outline'
                  className='w-full border-red-500/40 text-red-400 hover:bg-red-500/10'
                >
                  Discard
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CaseResolverPageProvider>
    </CaseResolverRuntimeProvider>
  );
}
