'use client';

import {
  ChevronDown,
  ChevronRight,
  Copy,
  Edit2,
  FilePlus,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  GripVertical,
  Star,
  Trash2,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef } from 'react';

import {
  applyInternalMasterTreeDrop,
  isInternalMasterTreeNode,
  MasterFolderTree,
  useMasterFolderTreeInstance,
} from '@/features/foldertree';
import { useNotesAppContext } from '@/features/notesapp/hooks/NotesAppContext';
import { Button, FolderTreePanel, TreeHeader } from '@/shared/ui';
import {
  type MasterTreeId,
  type MasterTreeNode,
} from '@/shared/utils';
import { getFolderDragId, getNoteDragId } from '@/shared/utils/drag-drop';

import {
  buildMasterNodesFromNotesFolderTree,
  fromFolderMasterNodeId,
  fromNoteMasterNodeId,
  toFolderMasterNodeId,
  toNoteMasterNodeId,
} from '../utils/master-folder-tree';
import {
  createNotesMasterTreeAdapter,
  resolveNotesFolderTargetForNode,
} from '../utils/notes-master-tree-adapter';
import {
  canDropNotesNode,
  resolveNotesExternalDropAction,
} from '../utils/notes-master-tree-external-drop';

export function NotesAppFolderTree(): React.JSX.Element {
  const {
    settings,
    filters,
    folderTree,
    selectedNote,
    setSelectedNote,
    setIsEditing,
    setIsCreating,
    setIsFolderTreeCollapsed,
    draggedNoteId,
    operations,
    undoStack,
    undoHistory,
    handleUndoFolderTree,
    handleUndoAtIndex,
    setSelectedFolderId,
    handleSelectNoteFromTree,
  } = useNotesAppContext();
  const hasInitializedCollapseSyncRef = useRef(false);

  const masterNodes = useMemo(
    (): MasterTreeNode[] => buildMasterNodesFromNotesFolderTree(folderTree),
    [folderTree]
  );
  const initialExpandedFolderNodeIds = useMemo(
    () =>
      masterNodes
        .filter((node: MasterTreeNode) => node.type === 'folder')
        .map((node: MasterTreeNode) => node.id),
    [masterNodes]
  );
  const selectedMasterNodeId = useMemo((): MasterTreeId | null => {
    if (selectedNote?.id) return toNoteMasterNodeId(selectedNote.id);
    if (settings.selectedFolderId) return toFolderMasterNodeId(settings.selectedFolderId);
    return null;
  }, [selectedNote?.id, settings.selectedFolderId]);

  const notesAdapter = useMemo(
    () => createNotesMasterTreeAdapter(operations),
    [operations]
  );
  const {
    appearance: { rootDropUi, resolveIcon },
    controller,
    panelCollapsed,
    setPanelCollapsed,
  } = useMasterFolderTreeInstance({
    instance: 'notes',
    nodes: masterNodes,
    selectedNodeId: selectedMasterNodeId,
    initiallyExpandedNodeIds: initialExpandedFolderNodeIds,
    adapter: notesAdapter,
  });

  useEffect(() => {
    setIsFolderTreeCollapsed(panelCollapsed);
  }, [panelCollapsed, setIsFolderTreeCollapsed]);

  useEffect(() => {
    if (!hasInitializedCollapseSyncRef.current) {
      hasInitializedCollapseSyncRef.current = true;
      return;
    }
    setPanelCollapsed(isFolderTreeCollapsed);
  }, [isFolderTreeCollapsed, setPanelCollapsed]);


  const selectedFolderForCreate = useMemo(
    (): string | null => resolveNotesFolderTargetForNode(controller.nodes, controller.selectedNodeId),
    [controller.nodes, controller.selectedNodeId]
  );

  const isAllNotesActive = !settings.selectedFolderId && !selectedNote;
  const {
    RootIcon,
    FolderClosedIcon,
    FolderOpenIcon,
    FileIcon,
    DragHandleIcon,
  } = useMemo(
    () => ({
      RootIcon: resolveIcon({ slot: 'root', fallback: Folder, fallbackId: 'Folder' }),
      FolderClosedIcon: resolveIcon({
        slot: 'folderClosed',
        kind: 'folder',
        fallback: Folder,
        fallbackId: 'Folder',
      }),
      FolderOpenIcon: resolveIcon({
        slot: 'folderOpen',
        kind: 'folder',
        fallback: FolderOpen,
        fallbackId: 'FolderOpen',
      }),
      FileIcon: resolveIcon({
        slot: 'file',
        kind: 'note',
        fallback: FileText,
        fallbackId: 'FileText',
      }),
      DragHandleIcon: resolveIcon({
        slot: 'dragHandle',
        fallback: GripVertical,
        fallbackId: 'GripVertical',
      }),
    }),
    [resolveIcon]
  );

  return (
    <FolderTreePanel
      className='bg-gray-900 border-r border-border'
      bodyClassName='flex min-h-0 flex-1 flex-col'
      masterInstance='notes'
      header={(
        <TreeHeader
          title='Folders'
          actions={(
            <>
              <Button
                onClick={(): void => {
                  void operations.handleCreateFolder(selectedFolderForCreate);
                }}
                size='sm'
                variant='outline'
                className='h-7 w-7 p-0 border text-gray-300 hover:bg-muted/50'
                title='Add folder'
              >
                <FolderPlus className='size-4' />
              </Button>
              <Button
                onClick={(): void => {
                  setSelectedFolderId(selectedFolderForCreate);
                  setIsCreating(true);
                  setSelectedNote(null);
                }}
                size='sm'
                variant='outline'
                className='h-7 w-7 p-0 border text-gray-300 hover:bg-muted/50'
                title='Add note'
              >
                <FilePlus className='size-4' />
              </Button>
              <Button
                onClick={(): void => {
                  void handleUndoFolderTree(1);
                }}
                size='sm'
                variant='outline'
                className='h-7 px-2 border text-gray-300 hover:bg-muted/50'
                disabled={undoStack.length === 0}
              >
                Undo
              </Button>
              <Button
                onClick={(): void => {
                  setIsFolderTreeCollapsed(true);
                  setPanelCollapsed(true);
                }}
                size='sm'
                variant='outline'
                className='h-7 w-7 p-0 border text-gray-300 hover:bg-muted/50'
                title='Collapse folder tree'
              >
                <ChevronRight className='size-4' />
              </Button>
            </>
          )}
        >
          <Button
            onClick={(): void => {
              setSelectedFolderId(null);
              setSelectedNote(null);
              setIsEditing(false);
              controller.selectNode(null);
            }}
            className={`w-full justify-start gap-2 px-2 py-1.5 text-left text-sm ${
              isAllNotesActive
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-muted/50'
            }`}
          >
            <RootIcon className='size-4' />
            <span>All Notes</span>
          </Button>
          <Button
            onClick={(): void => {
              filters.handleToggleFavoritesFilter(
                setSelectedFolderId,
                setSelectedNote,
                setIsEditing
              );
            }}
            className={`mt-1 w-full justify-start gap-2 px-2 py-1.5 text-left text-sm ${
              filters.filterFavorite === true
                ? 'bg-yellow-500/20 text-yellow-200'
                : 'text-gray-300 hover:bg-muted/50'
            }`}
          >
            <Star className='size-4' />
            <span>Favorites</span>
          </Button>
          {undoHistory.length > 0 && (
            <div className='mt-3 rounded border border-border bg-card/60 p-2 text-xs text-gray-300'>
              <div className='mb-2 text-[10px] uppercase tracking-wide text-gray-500'>
                History
              </div>
              <div className='space-y-1'>
                {undoHistory.slice(0, 10).map((entry: { label: string }, index: number) => (
                  <Button
                    key={`${entry.label}-${index}`}
                    type='button'
                    onClick={(): void => handleUndoAtIndex(index)}
                    className='flex w-full items-center justify-between rounded px-1.5 py-1 text-left text-gray-300 hover:bg-muted/50'
                  >
                    <span className='truncate'>{entry.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </TreeHeader>
      )}
    >
      <div className='min-h-0 flex-1 overflow-auto p-2'>
        <MasterFolderTree
          controller={controller}
          rootDropUi={rootDropUi}
          resolveDraggedNodeId={(event: React.DragEvent<HTMLElement>): string | null => {
            const noteId = getNoteDragId(event.dataTransfer, draggedNoteId);
            if (noteId) return toNoteMasterNodeId(noteId);
            const folderId = getFolderDragId(event.dataTransfer);
            if (folderId) return toFolderMasterNodeId(folderId);
            return null;
          }}
          canDrop={({ draggedNodeId, targetId }, ctlr): boolean => {
            return canDropNotesNode({
              draggedNodeId,
              targetId,
              nodes: ctlr.nodes,
            });
          }}
          onNodeDrop={async ({ draggedNodeId, targetId, position, rootDropZone }, ctlr): Promise<void> => {
            const isInternalDrag = isInternalMasterTreeNode(ctlr.nodes, draggedNodeId);

            if (isInternalDrag) {
              await applyInternalMasterTreeDrop({
                controller: ctlr,
                draggedNodeId,
                targetId,
                position,
                rootDropZone,
              });
              return;
            }

            const action = resolveNotesExternalDropAction({
              draggedNodeId,
              targetId,
              nodes: ctlr.nodes,
              roots: ctlr.roots,
              rootDropZone,
            });
            if (!action) return;

            if (action.type === 'relate_notes') {
              await operations.handleRelateNotes(action.noteId, action.targetNoteId);
              return;
            }
            if (action.type === 'move_note') {
              await operations.handleMoveNoteToFolder(action.noteId, action.targetFolderId);
              return;
            }
            if (action.type === 'reorder_folder_root_top') {
              await operations.handleReorderFolder(action.folderId, action.anchorFolderId, 'before');
              return;
            }
            await operations.handleMoveFolderToFolder(action.folderId, action.targetFolderId);
          }}
          renderNode={({ node, depth, hasChildren, isExpanded, isSelected, isRenaming, select, toggleExpand, startRename }) => {
            const folderId = fromFolderMasterNodeId(node.id);
            const noteId = fromNoteMasterNodeId(node.id);
            const isFolder = Boolean(folderId);
            const canToggle = isFolder && hasChildren;
            const Icon = isFolder
              ? (isExpanded ? FolderOpenIcon : FolderClosedIcon)
              : FileIcon;

            return (
              <div
                className={`group flex items-center gap-1 rounded px-2 py-1.5 text-sm ${
                  isSelected ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-muted/40'
                }`}
                style={{ marginLeft: `${depth * 16}px` }}
                onClick={(): void => {
                  select();
                  if (folderId) {
                    setSelectedFolderId(folderId);
                    setSelectedNote(null);
                    setIsEditing(false);
                  } else if (noteId) {
                    void handleSelectNoteFromTree(noteId);
                  }
                }}
              >
                <DragHandleIcon className='size-3 shrink-0 text-gray-500' />
                {canToggle ? (
                  <button
                    type='button'
                    onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                      event.stopPropagation();
                      toggleExpand();
                    }}
                    className='inline-flex size-4 items-center justify-center rounded hover:bg-muted/40'
                    aria-label={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
                  >
                    {isExpanded ? (
                      <ChevronDown className='size-3' />
                    ) : (
                      <ChevronRight className='size-3' />
                    )}
                  </button>
                ) : (
                  <span className='inline-flex size-4 items-center justify-center text-xs opacity-30'>•</span>
                )}
                <Icon className='size-3.5 shrink-0' />
                {isRenaming ? (
                  <input
                    value={controller.renameDraft}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                      controller.updateRenameDraft(event.target.value)
                    }
                    onBlur={(): void => {
                      void controller.commitRename();
                    }}
                    onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>): void => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void controller.commitRename();
                      } else if (event.key === 'Escape') {
                        event.preventDefault();
                        controller.cancelRename();
                      }
                    }}
                    onClick={(event: React.MouseEvent<HTMLInputElement>): void => event.stopPropagation()}
                    className='flex-1 rounded border border-blue-500 bg-gray-800 px-1 py-0.5 text-sm text-white outline-none'
                  />
                ) : (
                  <span className='flex-1 truncate'>{node.name}</span>
                )}

                {!isRenaming && (
                  <div className='ml-auto hidden items-center gap-1 group-hover:flex'>
                    {folderId ? (
                      <>
                        <button
                          type='button'
                          title='Add note'
                          onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                            event.stopPropagation();
                            setSelectedFolderId(folderId);
                            setSelectedNote(null);
                            setIsCreating(true);
                          }}
                          className='rounded p-1 text-gray-300 hover:bg-muted/50'
                        >
                          <FilePlus className='size-3' />
                        </button>
                        <button
                          type='button'
                          title='Add subfolder'
                          onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                            event.stopPropagation();
                            void operations.handleCreateFolder(folderId);
                          }}
                          className='rounded p-1 text-gray-300 hover:bg-muted/50'
                        >
                          <FolderPlus className='size-3' />
                        </button>
                      </>
                    ) : null}
                    {noteId ? (
                      <button
                        type='button'
                        title='Duplicate note'
                        onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                          event.stopPropagation();
                          void operations.handleDuplicateNote(noteId);
                        }}
                        className='rounded p-1 text-gray-300 hover:bg-muted/50'
                      >
                        <Copy className='size-3' />
                      </button>
                    ) : null}
                    <button
                      type='button'
                      title='Rename'
                      onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                        event.stopPropagation();
                        startRename();
                      }}
                      className='rounded p-1 text-gray-300 hover:bg-muted/50'
                    >
                      <Edit2 className='size-3' />
                    </button>
                    <button
                      type='button'
                      title='Delete'
                      onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                        event.stopPropagation();
                        if (folderId) {
                          void operations.handleDeleteFolder(folderId);
                          return;
                        }
                        if (noteId) {
                          void operations.handleDeleteNoteFromTree(noteId);
                        }
                      }}
                      className='rounded p-1 text-red-400 hover:bg-red-500/20'
                    >
                      <Trash2 className='size-3' />
                    </button>
                  </div>
                )}
              </div>
            );
          }}
        />
      </div>
    </FolderTreePanel>
  );
}
