'use client';

import { Eye, FileText } from 'lucide-react';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { CaseResolverCanvasWorkspace } from '@/features/case-resolver/components/CaseResolverCanvasWorkspace';
import { CaseResolverFolderTree } from '@/features/case-resolver/components/CaseResolverFolderTree';
import { CaseResolverRichTextEditor } from '@/features/case-resolver/components/CaseResolverRichTextEditor';
import {
  CaseResolverPageProvider,
} from '@/features/case-resolver/context/CaseResolverPageContext';
import {
  savePromptExploderDraftPromptFromCaseResolver,
} from '@/features/prompt-exploder/bridge';
import { AppModal, Button, Input, useToast } from '@/shared/ui';

import { useCaseResolverState } from '../hooks/useCaseResolverState';
import { 
  toNormalizedSearchValue,
  buildFilemakerAddressLabel,
} from '../utils/caseResolverUtils';

import type {
  CaseResolverFile,
  CaseResolverTag,
} from '../types';


// Types moved to useCaseResolverState or domain types
type CaseResolverTagPickerOption = {
  id: string;
  label: string;
  pathIds: string[];
  pathNames: string[];
  searchLabel: string;
};

// Helper components & internal logic
const buildCaseResolverTagPickerOptions = (
  tags: CaseResolverTag[]
): CaseResolverTagPickerOption[] => {
  const byId = new Map<string, CaseResolverTag>(
    tags.map((tag: CaseResolverTag): [string, CaseResolverTag] => [tag.id, tag])
  );
  const cache = new Map<string, { ids: string[]; names: string[] }>();

  const resolvePath = (tagId: string, trail: Set<string>): { ids: string[]; names: string[] } => {
    const cached = cache.get(tagId);
    if (cached) return cached;
    const tag = byId.get(tagId);
    if (!tag) return { ids: [], names: [] };
    if (trail.has(tagId)) {
      const fallback = { ids: [tag.id], names: [tag.name] };
      cache.set(tagId, fallback);
      return fallback;
    }
    if (!tag.parentId || !byId.has(tag.parentId)) {
      const rootPath = { ids: [tag.id], names: [tag.name] };
      cache.set(tagId, rootPath);
      return rootPath;
    }
    const nextTrail = new Set(trail);
    nextTrail.add(tagId);
    const parentPath = resolvePath(tag.parentId, nextTrail);
    const path = {
      ids: [...parentPath.ids, tag.id],
      names: [...parentPath.names, tag.name],
    };
    cache.set(tagId, path);
    return path;
  };

  return tags
    .map((tag: CaseResolverTag): CaseResolverTagPickerOption => {
      const path = resolvePath(tag.id, new Set<string>());
      const label = path.names.join(' / ');
      return {
        id: tag.id,
        label,
        pathIds: path.ids,
        pathNames: path.names,
        searchLabel: label.toLowerCase(),
      };
    })
    .sort((left: CaseResolverTagPickerOption, right: CaseResolverTagPickerOption) =>
      left.label.localeCompare(right.label)
    );
};

export function AdminCaseResolverPage(): React.JSX.Element {
  const { toast } = useToast();
  const state = useCaseResolverState();
  const {
    workspace,
    selectedFileId,
    selectedAssetId,
    selectedFolderPath,
    folderPanelCollapsed,
    activeMainView,
    setActiveMainView,
    editingDocumentDraft,
    setEditingDocumentDraft,
    caseResolverTags,
    caseResolverCategories,
    filemakerDatabase,
    handleSelectFile,
    handleSelectAsset,
    handleSelectFolder,
    handleCreateFolder,
    handleCreateFile,
    handleDeleteFolder,
    handleOpenFileEditor,
    activeFile,
    selectedAsset,
    handleSaveFileEditor,
  } = state;

  const caseResolverTagPickerOptions = useMemo(() => buildCaseResolverTagPickerOptions(caseResolverTags), [caseResolverTags]);
  
  const caseResolverCategoryOptions = useMemo(() => {
    const byId = new Map(caseResolverCategories.map(c => [c.id, c]));
    const resolveDepth = (c: any): number => {
      let depth = 0;
      let pId = c.parentId;
      while (pId) {
        const p = byId.get(pId);
        if (!p) break;
        depth++;
        pId = p.parentId;
      }
      return depth;
    };
    return caseResolverCategories.map(c => ({
      value: c.id,
      label: `${' '.repeat(resolveDepth(c) * 2)}${c.name}`,
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [caseResolverCategories]);

  const filteredDocumentTagOptions = useMemo(() => {
    const q = documentTagSearchQuery.trim().toLowerCase();
    return q ? caseResolverTagPickerOptions.filter(o => o.searchLabel.includes(q)) : caseResolverTagPickerOptions;
  }, [caseResolverTagPickerOptions, documentTagSearchQuery]);

  const handleSelectDocumentDraftParty = useCallback((role: 'addresser' | 'addressee', ref: CaseResolverPartyReference | null) => {
    const label = ref ? resolveFilemakerPartyLabel(filemakerDatabase, ref) ?? '' : '';
    setEditingDocumentDraft(curr => curr ? { ...curr, [role]: ref } : curr);
    if (role === 'addresser') {
      setDocumentAddresserSearchQuery(label);
      setIsDocumentAddresserSearchOpen(false);
    } else {
      setDocumentAddresseeSearchQuery(label);
      setIsDocumentAddresseeSearchOpen(false);
    }
  }, [filemakerDatabase, setEditingDocumentDraft]);

  const handleSelectDocumentTag = useCallback((tagId: string | null) => {
    setEditingDocumentDraft(curr => curr ? { ...curr, tagId } : curr);
    setIsDocumentTagDropdownOpen(false);
    setDocumentTagSearchQuery('');
  }, [setEditingDocumentDraft]);

  const handleSelectDraftDocumentVersion = useCallback((version: CaseResolverDocumentVersion) => {
    setEditingDocumentDraft(curr => {
      if (!curr) return curr;
      const content = version === 'exploded' ? curr.explodedDocumentContent : curr.originalDocumentContent;
      return { ...curr, activeDocumentVersion: version, documentContent: content };
    });
  }, [setEditingDocumentDraft]);

  const handleUpdateDraftDocumentContent = useCallback((next: string) => {
    setEditingDocumentDraft(curr => {
      if (!curr) return curr;
      return curr.activeDocumentVersion === 'exploded' 
        ? { ...curr, explodedDocumentContent: next, documentContent: next }
        : { ...curr, originalDocumentContent: next, documentContent: next };
    });
  }, [setEditingDocumentDraft]);

  const handlePreviewPdf = useCallback(() => {
    if (!editingDocumentDraft) return;
    const markup = buildDocumentPdfMarkup({
      documentDate: editingDocumentDraft.documentDate,
      documentHash: buildCaseResolverDocumentHash(editingDocumentDraft.id, editingDocumentDraft.createdAt),
      createdAt: editingDocumentDraft.createdAt,
      updatedAt: editingDocumentDraft.updatedAt,
      addresserLabel: resolveFilemakerPartyLabel(filemakerDatabase, editingDocumentDraft.addresser) ?? 'Not selected',
      addresseeLabel: resolveFilemakerPartyLabel(filemakerDatabase, editingDocumentDraft.addressee) ?? 'Not selected',
      documentContent: editingDocumentDraft.documentContent,
    });
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(markup);
      win.document.close();
    }
  }, [editingDocumentDraft, filemakerDatabase]);

  const handleExportPdf = useCallback(() => {
    handlePreviewPdf();
    toast('PDF export triggered via preview window.', { variant: 'info' });
  }, [handlePreviewPdf, toast]);

  const handleSendDraftToPromptExploder = useCallback(() => {
    if (!editingDocumentDraft) return;
    savePromptExploderDraftPromptFromCaseResolver({
      prompt: editingDocumentDraft.documentContent,
      caseResolverContext: { fileId: editingDocumentDraft.id },
    });
  }, [editingDocumentDraft]);

  // Main Render
  return (
    <CaseResolverPageProvider value={{
      workspace,
      selectedFileId,
      selectedAssetId,
      selectedFolderPath,
      activeFile,
      selectedAsset,
      onSelectFile: handleSelectFile,
      onSelectAsset: handleSelectAsset,
      onSelectFolder: handleSelectFolder,
      onCreateFile: handleCreateFile,
      onCreateFolder: handleCreateFolder,
      onDeleteFolder: handleDeleteFolder,
      onOpenFileEditor: handleOpenFileEditor,
      onCreateDocumentFromSearch: () => { setActiveMainView('workspace'); handleCreateFile(null); },
      onOpenFileFromSearch: (id) => { setActiveMainView('workspace'); setIsPreviewPageVisible(false); handleSelectFile(id); },
      onEditFileFromSearch: (id) => { setActiveMainView('workspace'); setIsPreviewPageVisible(false); handleOpenFileEditor(id); },
    }}>
      <div className='flex h-full flex-col overflow-hidden bg-background'>
        <div className='flex flex-1 overflow-hidden'>
          {!folderPanelCollapsed && (
            <div className='w-80 flex-shrink-0 border-r border-border bg-card/20'>
              <CaseResolverFolderTree />
            </div>
          )}
          
          <div className='flex flex-1 flex-col overflow-hidden p-6'>
            {activeMainView === 'search' ? (
              <CaseResolverDocumentSearchPage />
            ) : (
              <>
                <div className='mb-6 flex items-center justify-between'>
                  <div>
                    <h1 className='text-2xl font-bold text-white'>Case Resolver</h1>
                    <p className='text-sm text-gray-400'>Manage complex document sets and canvas workspaces.</p>
                  </div>
                  <div className='flex gap-2'>
                    <Button variant='outline' size='sm' onClick={() => setActiveMainView('search')}>
                      <Eye className='mr-2 size-4' /> Search Documents
                    </Button>
                    <Button variant='default' size='sm' onClick={() => setIsPartiesModalOpen(true)} disabled={!activeFile}>
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
              </>
            )}
          </div>
        </div>

        {/* All Modals */}
        <AppModal
          open={editingDocumentDraft !== null}
          onOpenChange={(open) => !open && handleSaveFileEditor()}
          title={editingDocumentDraft?.fileType === 'scanfile' ? 'Edit Scan' : 'Edit Document'}
          size='xl'
        >
          {editingDocumentDraft && (
            <div className='space-y-4'>
              <Input 
                label='Name' 
                value={editingDocumentDraft.name} 
                onChange={(e) => setEditingDocumentDraft({...editingDocumentDraft, name: e.target.value})} 
              />
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

        {/* Other modals (Parties, etc) would go here, refactored similarly */}
      </div>
    </CaseResolverPageProvider>
  );
}
