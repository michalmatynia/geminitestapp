'use client';

import { ChevronDown, ChevronRight, FilePlus, FolderPlus, Copy, Edit2, Trash2 } from 'lucide-react';
import React from 'react';

import type { FolderTreeViewportRenderNodeInput as NotesAppTreeNodeProps } from '@/features/foldertree/public';
import { useNotesAppActions } from '@/features/notesapp/hooks/NotesAppContext';
import {
  fromFolderMasterNodeId,
  fromNoteMasterNodeId,
} from '@/features/notesapp/utils/master-folder-tree';
import { DOCUMENTATION_MODULE_IDS } from '@/shared/contracts/documentation';
import type { NotesMasterTreeOperations } from '@/shared/contracts/notes';
import { getDocumentationTooltip } from '@/shared/lib/documentation';
import { Button, Input, Tooltip } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { useNotesAppTreeNodeRuntimeContext } from './NotesAppTreeNodeRuntimeContext';

export type { NotesAppTreeNodeProps };

type NotesAppTreeNodeOperations = NotesMasterTreeOperations & {
  handleCreateFolder: (parentId?: string | null) => Promise<void>;
  handleDuplicateNote: (noteId: string) => Promise<void>;
  handleDeleteFolder: (folderId: string) => Promise<void>;
  handleDeleteNoteFromTree: (noteId: string) => Promise<void>;
};

export function NotesAppTreeNode(props: NotesAppTreeNodeProps): React.JSX.Element {
  const {
    node,
    depth,
    hasChildren,
    isExpanded,
    isSelected,
    isRenaming,
    select,
    toggleExpand,
    startRename,
  } = props;

  const { controller, FolderClosedIcon, FolderOpenIcon, FileIcon, DragHandleIcon } =
    useNotesAppTreeNodeRuntimeContext();
  const {
    setSelectedFolderId,
    setSelectedNote,
    setIsEditing,
    setIsCreating,
    handleSelectNoteFromTree,
    operations,
  } = useNotesAppActions();

  const folderId = fromFolderMasterNodeId(node.id);
  const noteId = fromNoteMasterNodeId(node.id);
  const isFolder = Boolean(folderId);
  const canToggle = isFolder && hasChildren;
  const Icon = isFolder ? (isExpanded ? FolderOpenIcon : FolderClosedIcon) : FileIcon;
  const handleSelectNode = (event: React.MouseEvent<HTMLElement>): void => {
    select(event as React.MouseEvent<HTMLDivElement>);
    if (folderId) {
      setSelectedFolderId(folderId);
      setSelectedNote(null);
      setIsEditing(false);
    } else if (noteId) {
      void handleSelectNoteFromTree(noteId);
    }
  };

  return (
    <div
      className={cn(
        'group flex items-center gap-1 rounded px-2 py-1.5 text-sm transition-colors',
        isSelected ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-300 hover:bg-muted/40'
      )}
      style={{ marginLeft: `${depth * 16}px` }}
    >
      <DragHandleIcon className='size-3 shrink-0 text-gray-500 opacity-0 transition-opacity group-hover:opacity-100' />
      {canToggle ? (
        <Button
          variant='ghost'
          size='sm'
          onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
            event.stopPropagation();
            toggleExpand();
          }}
          className='size-4 p-0 text-gray-500 hover:bg-white/10 hover:text-gray-300'
          aria-label={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
          title={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}>
          {isExpanded ? <ChevronDown className='size-3' /> : <ChevronRight className='size-3' />}
        </Button>
      ) : (
        <span className='inline-flex size-4 items-center justify-center text-xs opacity-30'>•</span>
      )}
      {isRenaming ? (
        <Input
          ref={(node) => {
            node?.focus();
          }}
          value={controller.renameDraft}
          aria-label={`Rename ${node.name}`}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            controller.updateRenameDraft(event.target.value);
          }}
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
          className='h-7 min-w-0 flex-1 border-blue-500 bg-gray-800 px-1 py-0.5 text-sm text-white outline-none'
         title='Input field'/>
      ) : (
        <button
          type='button'
          onClick={handleSelectNode}
          aria-pressed={isSelected}
          aria-label={`Select ${node.name}`}
          className='flex min-w-0 flex-1 items-center gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
        >
          <Icon className='size-3.5 shrink-0' />
          <span className='truncate'>{node.name}</span>
        </button>
      )}

      {!isRenaming && (
        <div className='ml-auto hidden items-center gap-1 group-hover:flex'>
          {folderId ? (
            <>
              <Tooltip
                content={
                  getDocumentationTooltip(DOCUMENTATION_MODULE_IDS.notesapp, 'notesapp_add_note') ??
                  'Add note'
                }
              >
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                    event.stopPropagation();
                    setSelectedFolderId(folderId);
                    setSelectedNote(null);
                    setIsCreating(true);
                  }}
                  aria-label='Add note'
                  className='size-6 p-0 text-gray-400 hover:bg-white/10 hover:text-white'
                  title={'Add note'}>
                  <FilePlus className='size-3' />
                </Button>
              </Tooltip>
              <Tooltip
                content={
                  getDocumentationTooltip(
                    DOCUMENTATION_MODULE_IDS.notesapp,
                    'notesapp_add_subfolder'
                  ) ?? 'Add subfolder'
                }
              >
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                    event.stopPropagation();
                    void (operations as NotesAppTreeNodeOperations).handleCreateFolder(folderId);
                  }}
                  aria-label='Add subfolder'
                  className='size-6 p-0 text-gray-400 hover:bg-white/10 hover:text-white'
                  title={'Add subfolder'}>
                  <FolderPlus className='size-3' />
                </Button>
              </Tooltip>
            </>
          ) : null}
          {noteId ? (
            <Tooltip
              content={
                getDocumentationTooltip(
                  DOCUMENTATION_MODULE_IDS.notesapp,
                  'notesapp_duplicate_note'
                ) ?? 'Duplicate note'
              }
            >
              <Button
                variant='ghost'
                size='sm'
                onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                  event.stopPropagation();
                  void (operations as NotesAppTreeNodeOperations).handleDuplicateNote(noteId);
                }}
                aria-label='Duplicate note'
                className='size-6 p-0 text-gray-400 hover:bg-white/10 hover:text-white'
                title={'Duplicate note'}>
                <Copy className='size-3' />
              </Button>
            </Tooltip>
          ) : null}
          <Tooltip
            content={
              getDocumentationTooltip(DOCUMENTATION_MODULE_IDS.notesapp, 'notesapp_rename') ??
              'Rename'
            }
          >
            <Button
              variant='ghost'
              size='sm'
              onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                event.stopPropagation();
                startRename();
              }}
              aria-label='Rename'
              className='size-6 p-0 text-gray-400 hover:bg-white/10 hover:text-white'
              title={'Rename'}>
              <Edit2 className='size-3' />
            </Button>
          </Tooltip>
          <Tooltip
            content={
              getDocumentationTooltip(DOCUMENTATION_MODULE_IDS.notesapp, 'notesapp_delete') ??
              'Delete'
            }
          >
            <Button
              variant='ghost'
              size='sm'
              onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                event.stopPropagation();
                if (folderId) {
                  void (operations as NotesAppTreeNodeOperations).handleDeleteFolder(folderId);
                  return;
                }
                if (noteId) {
                  void (operations as NotesAppTreeNodeOperations).handleDeleteNoteFromTree(noteId);
                }
              }}
              aria-label='Delete'
              className='size-6 p-0 text-rose-400 hover:bg-red-500/20 hover:text-rose-300'
              title={'Delete'}>
              <Trash2 className='size-3' />
            </Button>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
