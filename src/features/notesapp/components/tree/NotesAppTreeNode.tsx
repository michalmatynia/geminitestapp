'use client';

import React from 'react';
import { ChevronDown, ChevronRight, FilePlus, FolderPlus, Copy, Edit2, Trash2 } from 'lucide-react';

import type { FolderTreeViewportRenderNodeInput } from '@/features/foldertree/v2';
import { useNotesAppContext } from '@/features/notesapp/hooks/NotesAppContext';
import {
  fromFolderMasterNodeId,
  fromNoteMasterNodeId,
} from '@/features/notesapp/utils/master-folder-tree';
import { getDocumentationTooltip } from '@/features/tooltip-engine';
import type { NotesMasterTreeOperations } from '@/shared/contracts/notes';
import { DOCUMENTATION_MODULE_IDS } from '@/shared/contracts/documentation';
import { Button, Input, Tooltip } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { useNotesAppTreeNodeRuntimeContext } from './NotesAppTreeNodeRuntimeContext';

export type NotesAppTreeNodeProps = FolderTreeViewportRenderNodeInput;

type NotesAppTreeNodeOperations = NotesMasterTreeOperations & {
  handleCreateFolder: (parentId?: string | null) => Promise<void>;
  handleDuplicateNote: (noteId: string) => Promise<void>;
  handleDeleteFolder: (folderId: string) => Promise<void>;
  handleDeleteNoteFromTree: (noteId: string) => Promise<void>;
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
}: NotesAppTreeNodeProps): React.JSX.Element {
  const { controller, FolderClosedIcon, FolderOpenIcon, FileIcon, DragHandleIcon } =
    useNotesAppTreeNodeRuntimeContext();
  const notesAppContext = useNotesAppContext();
  const {
    setSelectedFolderId,
    setSelectedNote,
    setIsEditing,
    setIsCreating,
    handleSelectNoteFromTree,
  } = notesAppContext;
  const operations = notesAppContext.operations as NotesAppTreeNodeOperations;

  const folderId = fromFolderMasterNodeId(node.id);
  const noteId = fromNoteMasterNodeId(node.id);
  const isFolder = Boolean(folderId);
  const canToggle = isFolder && hasChildren;
  const Icon = isFolder ? (isExpanded ? FolderOpenIcon : FolderClosedIcon) : FileIcon;

  return (
    <div
      className={cn(
        'group flex items-center gap-1 rounded px-2 py-1.5 text-sm transition-colors',
        isSelected ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-300 hover:bg-muted/40'
      )}
      style={{ marginLeft: `${depth * 16}px` }}
      onClick={(event): void => {
        select(event);
        if (folderId) {
          setSelectedFolderId(folderId);
          setSelectedNote(null);
          setIsEditing(false);
        } else if (noteId) {
          void handleSelectNoteFromTree(noteId);
        }
      }}
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
        >
          {isExpanded ? <ChevronDown className='size-3' /> : <ChevronRight className='size-3' />}
        </Button>
      ) : (
        <span className='inline-flex size-4 items-center justify-center text-xs opacity-30'>•</span>
      )}
      <Icon className='size-3.5 shrink-0' />
      {isRenaming ? (
        <Input
          autoFocus
          value={controller.renameDraft}
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
        />
      ) : (
        <span className='flex-1 truncate'>{node.name}</span>
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
                  className='size-6 p-0 text-gray-400 hover:bg-white/10 hover:text-white'
                >
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
                    void operations.handleCreateFolder(folderId);
                  }}
                  className='size-6 p-0 text-gray-400 hover:bg-white/10 hover:text-white'
                >
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
                  void operations.handleDuplicateNote(noteId);
                }}
                className='size-6 p-0 text-gray-400 hover:bg-white/10 hover:text-white'
              >
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
              className='size-6 p-0 text-gray-400 hover:bg-white/10 hover:text-white'
            >
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
                  void operations.handleDeleteFolder(folderId);
                  return;
                }
                if (noteId) {
                  void operations.handleDeleteNoteFromTree(noteId);
                }
              }}
              className='size-6 p-0 text-rose-400 hover:bg-red-500/20 hover:text-rose-300'
            >
              <Trash2 className='size-3' />
            </Button>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
