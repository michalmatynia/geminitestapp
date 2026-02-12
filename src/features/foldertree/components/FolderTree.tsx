'use client';

import { Folder, Plus, ChevronRight, ChevronDown, ChevronLeft, Star, Upload } from 'lucide-react';
import React, { useState, useCallback, useMemo } from 'react';

import { useImportFolderMutation } from '@/features/foldertree/hooks/useFolderMutations';
import type { FolderTreeProps } from '@/features/foldertree/types/folder-tree-ui';
import { parseMultipleFolders, countMultipleFolders } from '@/features/foldertree/utils/folderImporter';
import { ICON_LIBRARY_MAP } from '@/features/icons';
import { logClientError } from '@/features/observability';
import type { CategoryWithChildren } from '@/shared/types/domain/notes';
import { Button, TreeHeader, useToast } from '@/shared/ui';
import { FolderTreePanel } from '@/shared/ui';
import { canNestTreeNode, collectTreeNodeIds, findTreeNodeById } from '@/shared/utils';
import { getFolderDragId, getNoteDragId } from '@/shared/utils/drag-drop';

import { FolderNode } from './tree/FolderNode';
import { FolderTreeProvider, useFolderTree } from '../context/FolderTreeContext';


function FolderTreeContent(): React.JSX.Element {
  const {
    folders,
    selectedFolderId,
    selectedNotebookId,
    onSelectFolder,
    onCreateFolder,
    onRelateNotes,
    selectedNoteId,
    onDropNote,
    onDropFolder,
    draggedNoteId,
    onToggleCollapse,
    isFavoritesActive,
    onToggleFavorites,
    canUndo,
    onUndo,
    undoHistory,
    onUndoAtIndex,
    onRefreshFolders,
    expandedFolderIds,
    onToggleExpand,
    profile,
  } = useFolderTree();

  const { toast } = useToast();
  const importFolderMutation = useImportFolderMutation();
  const [isAllNotesDragOver, setIsAllNotesDragOver] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);
  const [isDropzoneActive, setIsDropzoneActive] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showDropzone, setShowDropzone] = useState(false);

  const handleToggleSelectedCollapse = useCallback((): void => {
    if (!selectedFolderId) return;
    const target = findTreeNodeById(folders, selectedFolderId);
    if (!target) return;
    const targetIds = [target.id, ...collectTreeNodeIds(target.children)];
    
    const allExpanded = targetIds.every((id: string) => expandedFolderIds.has(id));
    targetIds.forEach((id: string) => {
      if (allExpanded) {
        if (expandedFolderIds.has(id)) onToggleExpand(id);
      } else {
        if (!expandedFolderIds.has(id)) onToggleExpand(id);
      }
    });
  }, [selectedFolderId, folders, expandedFolderIds, onToggleExpand]);

  const isSelectedSubtreeExpanded = useMemo((): boolean => {
    if (!selectedFolderId) return false;
    const target = findTreeNodeById(folders, selectedFolderId);
    if (!target) return false;
    const targetIds = [target.id, ...collectTreeNodeIds(target.children)];
    return targetIds.every((id: string) => expandedFolderIds.has(id));
  }, [selectedFolderId, folders, expandedFolderIds]);

  const handleFolderImport = useCallback(async (e: React.DragEvent): Promise<void> => {
    e.preventDefault();
    setIsDropzoneActive(false);

    if (!selectedNotebookId) {
      toast('Please select a notebook first', { variant: 'error' });
      return;
    }

    setIsImporting(true);

    try {
      const structures = await parseMultipleFolders(e.dataTransfer.items);

      if (!structures || structures.length === 0) {
        toast('No valid folder structure found', { variant: 'error' });
        setIsImporting(false);
        return;
      }

      const counts = countMultipleFolders(structures);

      const folderNames = structures.map((s: { name: string }) => s.name).join(', ');
      const displayName = structures.length === 1
        ? `folder "${structures[0]!.name}"`
        : `${structures.length} folders (${folderNames})`;

      const confirmed = confirm(
        `Import ${displayName} with ${counts.folders} total folders and ${counts.notes} notes?`
      );

      if (!confirmed) {
        setIsImporting(false);
        return;
      }

      await importFolderMutation.mutateAsync({
        notebookId: selectedNotebookId,
        parentFolderId: null,
        structures,
      });

      toast(`Successfully imported ${counts.folders} folders and ${counts.notes} notes`);

      if (onRefreshFolders) {
        await onRefreshFolders();
      }
    } catch (error) {
      logClientError(error, { context: { source: 'FolderTree', action: 'importFolder' } });
      const message = error instanceof Error ? error.message : 'An unexpected error occurred while importing';
      toast(message, { variant: 'error' });
    } finally {
      setIsImporting(false);
    }
  }, [selectedNotebookId, toast, onRefreshFolders, importFolderMutation]);

  const RootIcon = useMemo(() => {
    const iconId = profile.icons.root ?? 'Folder';
    return ICON_LIBRARY_MAP[iconId] ?? Folder;
  }, [profile.icons.root]);

  const handleDropzoneDragOver = useCallback((e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropzoneActive(true);
  }, []);

  const handleDropzoneDragLeave = useCallback((e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropzoneActive(false);
  }, []);

  const folderNodes = useMemo(
    () =>
      folders.map((folder: CategoryWithChildren) => (
        <FolderNode
          key={folder.id}
          folder={folder}
        />
      )),
    [folders]
  );

  return (
    <FolderTreePanel
      className='bg-gray-900 border-r border-border'
      bodyClassName='flex min-h-0 flex-1 flex-col'
      onDragEnterCapture={(e: React.DragEvent<HTMLDivElement>): void => {
        if (!draggedNoteId) return;
        e.preventDefault();
      }}
      onDragOverCapture={(e: React.DragEvent<HTMLDivElement>): void => {
        if (!draggedNoteId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDropCapture={(e: React.DragEvent<HTMLDivElement>): void => {
        if (!draggedNoteId) return;
        e.preventDefault();
        const target = (e.target as HTMLElement).closest('[data-note-id]');
        const targetId = target?.getAttribute('data-note-id');
        if (!targetId) {
          toast('Nothing to drop here', { variant: 'info' });
          return;
        }
        if (targetId === draggedNoteId) {
          toast('Can\'t link a note to itself', { variant: 'info' });
          return;
        }
        onRelateNotes(draggedNoteId, targetId);
      }}
      onDragOver={(e: React.DragEvent<HTMLDivElement>): void => {
        if (!draggedNoteId) return;
        e.preventDefault();
      }}
      onDrop={(e: React.DragEvent<HTMLDivElement>): void => {
        if (!draggedNoteId) return;
        e.preventDefault();
        const target = (e.target as HTMLElement).closest('[data-note-id]');
        const targetId = target?.getAttribute('data-note-id');
        if (!targetId) {
          toast('Nothing to drop here', { variant: 'info' });
          return;
        }
        if (targetId === draggedNoteId) {
          toast('Can\'t link a note to itself', { variant: 'info' });
          return;
        }
        onRelateNotes(draggedNoteId, targetId);
      }}
      header={(
        <TreeHeader
          title='Folders'
          actions={(
            <>
              <Button
                onClick={(): void => setShowDropzone(!showDropzone)}
                size='sm'
                variant='outline'
                className={`h-7 w-7 p-0 border hover:bg-muted/50 ${
                  showDropzone ? 'bg-blue-600/20 text-blue-400' : 'text-gray-300'
                }`}
                aria-label={showDropzone ? 'Hide dropzone' : 'Show dropzone'}
              >
                <Upload className='size-4' />
              </Button>
              <Button
                onClick={(): void => onCreateFolder(null)}
                size='sm'
                className='h-7 w-7 p-0 bg-blue-600 hover:bg-blue-700'
                aria-label='Add folder'
              >
                <Plus className='size-4' />
              </Button>
              {onUndo && (
                <Button
                  onClick={(): void => onUndo()}
                  size='sm'
                  variant='outline'
                  className='h-7 px-2 border text-gray-300 hover:bg-muted/50'
                  disabled={!canUndo}
                >
                  Undo
                </Button>
              )}
              <Button
                onClick={handleToggleSelectedCollapse}
                size='sm'
                variant='outline'
                className='h-7 w-7 p-0 border text-gray-300 hover:bg-muted/50'
                disabled={!selectedFolderId}
                aria-label={isSelectedSubtreeExpanded ? 'Collapse folder' : 'Expand folder'}
              >
                {isSelectedSubtreeExpanded ? (
                  <ChevronDown className='size-4' />
                ) : (
                  <ChevronRight className='size-4' />
                )}
              </Button>
              {onToggleCollapse && (
                <Button
                  onClick={(): void => onToggleCollapse()}
                  size='sm'
                  variant='outline'
                  className='h-7 w-7 p-0 border text-gray-300 hover:bg-muted/50'
                  aria-label='Collapse folder tree'
                >
                  <ChevronLeft className='size-4' />
                </Button>
              )}
            </>
          )}
        >
          <Button
            onClick={(): void => onSelectFolder(null)}
            onDragOver={(e: React.DragEvent<HTMLButtonElement>): void => {
              e.preventDefault();
              setIsAllNotesDragOver(true);
            }}
            onDragLeave={(): void => {
              setIsAllNotesDragOver(false);
            }}
            onDrop={(e: React.DragEvent<HTMLButtonElement>): void => {
              e.preventDefault();
              setIsAllNotesDragOver(false);
              const noteId = getNoteDragId(e.dataTransfer, draggedNoteId) || '';
              const folderId = getFolderDragId(e.dataTransfer);
              if (noteId) {
                const allowRootDrop = canNestTreeNode({
                  profile,
                  nodeType: 'file',
                  nodeKind: 'note',
                  targetIsRoot: true,
                });
                if (!allowRootDrop) {
                  toast('Root drop is disabled for notes in this tree profile.', { variant: 'info' });
                  return;
                }
                onDropNote(noteId, null);
              } else if (folderId) {
                const allowRootDrop = canNestTreeNode({
                  profile,
                  nodeType: 'folder',
                  nodeKind: 'folder',
                  targetIsRoot: true,
                });
                if (!allowRootDrop) {
                  toast('Root drop is disabled for folders in this tree profile.', { variant: 'info' });
                  return;
                }
                onDropFolder(folderId, null);
              } else {
                toast('Nothing to drop here', { variant: 'info' });
              }
            }}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition ${
              selectedFolderId === null && !selectedNoteId
                ? 'bg-blue-600 text-white'
                : isAllNotesDragOver
                  ? 'bg-green-600 text-white'
                  : 'text-gray-300 hover:bg-muted/50'
            } justify-start text-left`}
          >
            <RootIcon className='size-4' />
            <span>All Notes</span>
          </Button>
          {onToggleFavorites && (
            <Button
              onClick={(): void => onToggleFavorites()}
              className={`mt-1 w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition ${
                isFavoritesActive
                  ? 'bg-yellow-500/20 text-yellow-200'
                  : 'text-gray-300 hover:bg-muted/50'
              } justify-start text-left`}
            >
              <Star className='size-4' />
              <span>Favorites</span>
            </Button>
          )}
          {undoHistory && undoHistory.length > 0 && (
            <div className='mt-3 rounded border border-border bg-card/60 p-2 text-xs text-gray-300'>
              <Button
                onClick={(): void => setIsHistoryExpanded(!isHistoryExpanded)}
                className='flex w-full items-center justify-between mb-2 text-[10px] uppercase tracking-wide text-gray-500 hover:text-gray-300 transition'
              >
                <span>History</span>
                {isHistoryExpanded ? (
                  <ChevronDown className='size-3' />
                ) : (
                  <ChevronRight className='size-3' />
                )}
              </Button>
              {isHistoryExpanded && (
                <div className='space-y-1'>
                  {undoHistory.slice(0, 10).map((entry: { label: string }, index: number) => (
                    <Button
                      key={`${entry.label}-${index}`}
                      type='button'
                      onClick={(): void => onUndoAtIndex?.(index)}
                      className='flex w-full items-center justify-between rounded px-1.5 py-1 text-left text-gray-300 hover:bg-muted/50'
                    >
                      <span className='truncate'>{entry.label}</span>
                      <span className='text-[10px] text-gray-500'>Undo</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
        </TreeHeader>
      )}
    >

      {showDropzone && (
        <div
          className={`mx-4 mt-2 mb-3 border-2 border-dashed rounded-lg transition-all ${
            isDropzoneActive
              ? 'border-blue-500 bg-blue-500/10'
              : 'border bg-gray-800/30'
          } ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}
          onDragOver={handleDropzoneDragOver}
          onDragLeave={handleDropzoneDragLeave}
          onDrop={(e: React.DragEvent<HTMLDivElement>): void => { void handleFolderImport(e); }}
        >
          <div className='p-4 text-center'>
            <Upload
              className={`mx-auto mb-2 size-6 ${
                isDropzoneActive ? 'text-blue-400' : 'text-gray-500'
              }`}
            />
            <p className='text-xs text-gray-400'>
              {isImporting
                ? 'Importing folder structure...'
                : 'Drop folder(s) here to import'}
            </p>
            <p className='text-[10px] text-gray-600 mt-1'>
              Supports multiple folders · Markdown files (.md) will be converted to notes
            </p>
          </div>
        </div>
      )}

      <div className='flex-1 overflow-y-auto p-2'>
        {folders.length === 0 ? (
          <div className='p-4 text-center text-sm text-gray-500'>
            No folders yet
          </div>
        ) : (
          <div className='space-y-0.5'>{folderNodes}</div>
        )}
      </div>
    </FolderTreePanel>
  );
}

function FolderTreeBase(props: FolderTreeProps): React.JSX.Element {
  return (
    <FolderTreeProvider {...props}>
      <FolderTreeContent />
    </FolderTreeProvider>
  );
}

export const FolderTree = React.memo(FolderTreeBase);
FolderTree.displayName = 'FolderTree';
