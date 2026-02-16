'use client';

import { FileText } from 'lucide-react';
import React, { useCallback } from 'react';

import { CaseResolverCanvasWorkspace } from '@/features/case-resolver/components/CaseResolverCanvasWorkspace';
import { CaseResolverFolderTree } from '@/features/case-resolver/components/CaseResolverFolderTree';
import { CaseResolverRichTextEditor } from '@/features/case-resolver/components/CaseResolverRichTextEditor';
import {
  CaseResolverPageProvider,
} from '@/features/case-resolver/context/CaseResolverPageContext';
import { AppModal, Button, Input, Label } from '@/shared/ui';

import { useCaseResolverState } from '../hooks/useCaseResolverState';
import {
  normalizeFolderPath,
  normalizeFolderPaths,
  renameFolderPath,
} from '../settings';
import { isPathWithinFolder } from '../utils/caseResolverUtils';

export function AdminCaseResolverPage(): React.JSX.Element {
  const state = useCaseResolverState();
  const {
    workspace,
    selectedFileId,
    selectedAssetId,
    selectedFolderPath,
    setSelectedFolderPath,
    folderPanelCollapsed,
    setFolderPanelCollapsed,
    setActiveMainView,
    editingDocumentDraft,
    setEditingDocumentDraft,
    caseResolverTags,
    caseResolverIdentifiers,
    caseResolverCategories,
    handleSelectFile,
    handleSelectAsset,
    handleSelectFolder,
    handleCreateFolder,
    handleCreateFile,
    handleDeleteFolder,
    handleOpenFileEditor,
    activeFile,
    selectedAsset,
    updateWorkspace,
    handleSaveFileEditor,
  } = state;

  const handleUpdateDraftDocumentContent = useCallback((next: string) => {
    setEditingDocumentDraft(curr => {
      if (!curr) return curr;
      return { ...curr, documentContent: next };
    });
  }, [setEditingDocumentDraft]);

  const handleMoveFolder = useCallback(
    async (folderPath: string, targetFolder: string): Promise<void> => {
      const normalizedSourceFolder = normalizeFolderPath(folderPath);
      if (!normalizedSourceFolder) return;
      const normalizedTargetFolder = normalizeFolderPath(targetFolder);
      const sourceFolderName = normalizedSourceFolder.includes('/')
        ? normalizedSourceFolder.slice(normalizedSourceFolder.lastIndexOf('/') + 1)
        : normalizedSourceFolder;
      const nextRootFolder = normalizeFolderPath(
        normalizedTargetFolder ? `${normalizedTargetFolder}/${sourceFolderName}` : sourceFolderName
      );
      if (!nextRootFolder || nextRootFolder === normalizedSourceFolder) {
        return;
      }

      updateWorkspace(
        (current) => {
          const now = new Date().toISOString();
          const renamePath = (value: string): string =>
            renameFolderPath(value, normalizedSourceFolder, nextRootFolder);

          const movedFolders = current.folders.map((folder: string): string => renamePath(folder));
          const movedFolderTimestamps = Object.fromEntries(
            Object.entries(current.folderTimestamps ?? {}).map(([path, timestamps]) => [
              renamePath(path),
              timestamps,
            ])
          );
          const movedFiles = current.files.map((file) => {
            const nextFolder = renamePath(file.folder);
            if (nextFolder === file.folder) return file;
            return {
              ...file,
              folder: nextFolder,
              updatedAt: now,
            };
          });
          const movedAssets = current.assets.map((asset) => {
            const nextFolder = renamePath(asset.folder);
            if (nextFolder === asset.folder) return asset;
            return {
              ...asset,
              folder: nextFolder,
              updatedAt: now,
            };
          });

          return {
            ...current,
            folders: normalizeFolderPaths(movedFolders),
            folderTimestamps: movedFolderTimestamps,
            files: movedFiles,
            assets: movedAssets,
          };
        },
        { persistToast: 'Case Resolver tree changes saved.' }
      );

      setSelectedFolderPath((current) => {
        if (!current || !isPathWithinFolder(current, normalizedSourceFolder)) {
          return current;
        }
        return renameFolderPath(current, normalizedSourceFolder, nextRootFolder);
      });
    },
    [setSelectedFolderPath, updateWorkspace]
  );

  // Main Render
  return (
    <CaseResolverPageProvider value={{
      workspace,
      selectedFileId,
      selectedAssetId,
      selectedFolderPath,
      activeFile,
      selectedAsset,
      panelCollapsed: folderPanelCollapsed,
      onPanelCollapsedChange: setFolderPanelCollapsed,
      onSelectFile: handleSelectFile,
      onSelectAsset: handleSelectAsset,
      onSelectFolder: handleSelectFolder,
      onCreateFile: handleCreateFile,
      onCreateFolder: handleCreateFolder,
      onDeleteFolder: handleDeleteFolder,
      onCreateScanFile: () => { handleCreateFile(null); }, // Simplified
      onCreateNodeFile: () => { handleCreateFile(null); }, // Simplified
      onUploadAssets: async () => [], // Simplified
      onMoveFile: async () => {},
      onMoveAsset: async () => {},
      onMoveFolder: handleMoveFolder,
      onRenameFile: async () => {},
      onRenameAsset: async () => {},
      onRenameFolder: async () => {},
      onToggleFolderLock: () => {},
      onDeleteFile: () => {},
      onToggleFileLock: () => {},
      onEditFile: handleOpenFileEditor,
      caseResolverTags,
      caseResolverIdentifiers,
      caseResolverCategories,
      onCreateDocumentFromSearch: () => { setActiveMainView('workspace'); handleCreateFile(null); },
      onOpenFileFromSearch: (id) => { setActiveMainView('workspace'); handleSelectFile(id); },
      onEditFileFromSearch: (id) => { setActiveMainView('workspace'); handleOpenFileEditor(id); },
      onUpdateSelectedAsset: () => {},
      onGraphChange: () => {},
    }}>
      <div className='flex h-full flex-col overflow-hidden bg-background'>
        <div className='flex flex-1 overflow-hidden'>
          {!folderPanelCollapsed && (
            <div className='w-80 flex-shrink-0 border-r border-border bg-card/20'>
              <CaseResolverFolderTree />
            </div>
          )}
          
          <div className='flex flex-1 flex-col overflow-hidden p-6'>
            <div className='mb-6 flex items-center justify-between'>
              <div>
                <h1 className='text-2xl font-bold text-white'>Case Resolver</h1>
                <p className='text-sm text-gray-400'>Manage complex document sets and canvas workspaces.</p>
              </div>
              <div className='flex gap-2'>
                <Button variant='default' size='sm' onClick={() => state.setIsPartiesModalOpen(true)} disabled={!activeFile}>
                  Parties & References
                </Button>
              </div>
            </div>

            {activeFile ? (
              activeFile.fileType === 'scanfile' ? (
                <div className='rounded-lg border border-border p-6 bg-card/10'>
                  <h2 className='text-xl font-semibold mb-4'>Scan Workspace: {activeFile.name}</h2>
                  <Button onClick={() => handleOpenFileEditor(activeFile.id)}>Open Scan Editor</Button>
                </div>
              ) : (
                <CaseResolverCanvasWorkspace />
              )
            ) : (
              <div className='flex flex-1 items-center justify-center rounded-lg border border-dashed border-border'>
                <div className='text-center'>
                  <FileText className='mx-auto mb-4 size-12 text-gray-600' />
                  <h3 className='text-lg font-medium text-gray-300'>No case selected</h3>
                  <p className='text-sm text-gray-500'>Select a file from the tree to begin.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* All Modals */}
        <AppModal
          open={editingDocumentDraft !== null}
          onOpenChange={(open) => { if (!open) handleSaveFileEditor(); }}
          title={editingDocumentDraft?.fileType === 'scanfile' ? 'Edit Scan' : 'Edit Document'}
          size='xl'
        >
          {editingDocumentDraft && (
            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label className='text-xs text-gray-400'>Name</Label>
                <Input 
                  value={editingDocumentDraft.name} 
                  onChange={(e) => setEditingDocumentDraft({...editingDocumentDraft, name: e.target.value})} 
                />
              </div>
              <CaseResolverRichTextEditor 
                value={editingDocumentDraft.documentContent} 
                onChange={handleUpdateDraftDocumentContent} 
              />
              <div className='flex justify-end gap-2'>
                <Button variant='outline' onClick={() => setEditingDocumentDraft(null)}>Cancel</Button>
                <Button onClick={handleSaveFileEditor}>Save Changes</Button>
              </div>
            </div>
          )}
        </AppModal>
      </div>
    </CaseResolverPageProvider>
  );
}
