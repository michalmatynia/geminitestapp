'use client';

import React from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  FilePlus, 
  FolderPlus, 
  Copy, 
  Edit2, 
  Trash2 
} from 'lucide-react';

import type { FolderTreeViewportRenderNodeInput } from '@/features/foldertree/v2';
import { useNotesAppContext } from '@/features/notesapp/hooks/NotesAppContext';
import { 
  fromFolderMasterNodeId, 
  fromNoteMasterNodeId 
} from '../../utils/master-folder-tree';
import type { MasterFolderTreeController } from '@/shared/contracts/master-folder-tree';

export type NotesAppTreeNodeProps = FolderTreeViewportRenderNodeInput & {
  controller: MasterFolderTreeController;
  FolderClosedIcon: React.ComponentType<{ className?: string }>;
  FolderOpenIcon: React.ComponentType<{ className?: string }>;
  FileIcon: React.ComponentType<{ className?: string }>;
  DragHandleIcon: React.ComponentType<{ className?: string }>;
};

export function NotesAppTreeNode({
  node,
  depth,
  hasChildren,
  isExpanded,
  isSelected,
  isRenaming,
  select,
  toggleExpand,
  startRename,
  controller,
  FolderClosedIcon,
  FolderOpenIcon,
  FileIcon,
  DragHandleIcon,
}: NotesAppTreeNodeProps): React.JSX.Element {
  const {
    setSelectedFolderId,
    setSelectedNote,
    setIsEditing,
    setIsCreating,
    handleSelectNoteFromTree,
    operations,
  } = useNotesAppContext();

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
}
