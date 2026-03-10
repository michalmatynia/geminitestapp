'use client';

import { Trash2 } from 'lucide-react';
import React from 'react';

import { fromFolderMasterNodeId } from '@/features/ai/image-studio/utils/master-folder-tree';
import { TreeCaret, TreeContextMenu, TreeRow } from '@/shared/ui';
import { cn, type MasterTreeNode } from '@/shared/utils';
import { canNestTreeNodeV2 } from '@/shared/utils';
import { focusOnMount } from '@/shared/utils/focus-on-mount';

import { useSlotTreeContext } from './SlotTreeContext';


export interface FolderNodeItemProps {
  node: MasterTreeNode;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  isRenaming: boolean;
  isDropTarget: boolean;
  dropPosition: 'inside' | 'before' | 'after' | null;
  select: (event?: React.MouseEvent<HTMLElement>) => void;
  toggleExpand: () => void;
}

export function FolderNodeItem(props: FolderNodeItemProps): React.JSX.Element | null {
  const {
    node,
    depth,
    hasChildren,
    isExpanded,
    isSelected,
    isRenaming,
    isDropTarget,
    dropPosition,
    select,
    toggleExpand,
  } = props;

  const {
    controller,
    onSelectFolder,
    onDeleteFolder,
    onMoveFolder,
    startFolderRename,
    commitFolderRename,
    clearSelection,
    stickySelectionMode,
    selectedSlotId,
    profile,
    placeholderClasses,
    icons: { FolderClosedIcon, FolderOpenIcon, DragHandleIcon },
  } = useSlotTreeContext();

  const folderPath = fromFolderMasterNodeId(node.id);
  if (folderPath === null) return null;

  const allowMoveFolderToRoot = canNestTreeNodeV2({
    profile,
    nodeType: 'folder',
    nodeKind: 'folder',
    targetType: 'root',
  });
  const showInlineDrop = isDropTarget && dropPosition === 'inside';

  return (
    <TreeContextMenu
      items={[
        {
          id: 'select-folder',
          label: 'Select folder',
          onSelect: (): void => {
            onSelectFolder(folderPath);
            select();
          },
        },
        {
          id: 'rename-folder',
          label: 'Rename folder',
          onSelect: (): void => startFolderRename(node.id),
        },
        {
          id: 'delete-folder',
          label: 'Delete folder',
          icon: <Trash2 className='size-3.5' />,
          tone: 'danger',
          onSelect: (): void => onDeleteFolder(folderPath),
        },
        ...(allowMoveFolderToRoot
          ? [
            {
              id: 'move-folder-root',
              label: 'Move to root',
              onSelect: (): void => {
                void onMoveFolder(folderPath, '');
              },
            },
          ]
          : []),
      ]}
    >
      {isRenaming ? (
        <TreeRow
          depth={depth}
          baseIndent={8}
          indent={12}
          tone='subtle'
          role='treeitem'
          aria-level={depth + 1}
          aria-selected={isSelected}
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-label={node.name}
          selected={isSelected}
          selectedClassName='bg-muted text-white hover:bg-muted'
          className='relative h-8 text-xs'
        >
          <div
            className='flex h-full w-full min-w-0 items-center gap-1'
            onMouseDownCapture={(event: React.MouseEvent<HTMLDivElement>): void => {
              event.stopPropagation();
            }}
            onClickCapture={(event: React.MouseEvent<HTMLDivElement>): void => {
              event.stopPropagation();
            }}
          >
            <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center' />
            <TreeCaret
              isOpen={isExpanded}
              hasChildren={hasChildren}
              ariaLabel={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
              onToggle={hasChildren ? toggleExpand : undefined}
              className='w-3 text-gray-400'
              buttonClassName='hover:bg-gray-700'
              placeholderClassName='w-3'
            />
            <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center'>
              <FolderOpenIcon className='size-3.5 text-gray-400' />
            </span>
            <input
              ref={focusOnMount}
              value={controller.renameDraft}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                controller.updateRenameDraft(event.target.value);
              }}
              onBlur={(): void => commitFolderRename(node.id)}
              onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>): void => {
                event.stopPropagation();
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitFolderRename(node.id);
                  return;
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  controller.cancelRename();
                }
              }}
              onPointerDown={(event: React.PointerEvent<HTMLInputElement>): void => {
                event.stopPropagation();
              }}
              onClick={(event: React.MouseEvent<HTMLInputElement>): void => {
                event.stopPropagation();
              }}
              className='h-6 w-full rounded border border-border/70 bg-card/80 px-2 text-xs text-gray-100 outline-none ring-0 focus:border-sky-400'
              aria-label='Rename folder'
            />
          </div>
        </TreeRow>
      ) : (
        <TreeRow
          depth={depth}
          baseIndent={8}
          indent={12}
          tone='subtle'
          role='treeitem'
          aria-level={depth + 1}
          aria-selected={isSelected}
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-label={node.name}
          selected={isSelected}
          selectedClassName='bg-muted text-white hover:bg-muted'
          dragOver={showInlineDrop}
          dragOverClassName='bg-transparent text-gray-100 ring-0'
          className='relative h-8 text-xs'
        >
          <div className='flex h-full w-full min-w-0 items-center gap-1 text-left'>
            <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100'>
              <DragHandleIcon className='size-3.5 shrink-0 cursor-grab text-gray-500' aria-hidden='true' />
            </span>
            <div
              className={cn(
                'pointer-events-none absolute left-2.5 top-2 bottom-2 w-px rounded-full transition-opacity duration-150',
                placeholderClasses.lineActive,
                showInlineDrop ? 'opacity-100' : 'opacity-0'
              )}
            />
            <TreeCaret
              isOpen={isExpanded}
              hasChildren={hasChildren}
              ariaLabel={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
              onToggle={hasChildren ? toggleExpand : undefined}
              className='w-3 text-gray-400'
              buttonClassName='hover:bg-gray-700'
              placeholderClassName='w-3'
            />
            <button
              type='button'
              className='flex h-full min-w-0 flex-1 cursor-pointer items-center gap-1 text-left'
              onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                event.stopPropagation();
                if (selectedSlotId) {
                  // Delay folder selection to differentiate from potential double-click rename
                  setTimeout(() => {
                    if (stickySelectionMode && isSelected) {
                      clearSelection();
                      return;
                    }
                    select(event);
                    onSelectFolder(folderPath);
                  }, 180);
                  return;
                }
                if (stickySelectionMode && isSelected) {
                  clearSelection();
                  return;
                }
                select(event);
                onSelectFolder(folderPath);
              }}
              onDoubleClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                event.preventDefault();
                event.stopPropagation();
                startFolderRename(node.id);
              }}
              title={folderPath || 'Project root'}
              data-folder-path={folderPath}
            >
              {isExpanded ? (
                <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center'>
                  <FolderOpenIcon className='size-3.5 text-gray-400' aria-hidden='true' />
                </span>
              ) : (
                <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center'>
                  <FolderClosedIcon className='size-3.5 text-gray-400' aria-hidden='true' />
                </span>
              )}
              <span className='min-w-0 flex-1 truncate'>{node.name}</span>
            </button>
            <span
              className={cn(
                'shrink-0 text-[10px] transition-opacity duration-150',
                showInlineDrop
                  ? `${placeholderClasses.badgeActive} opacity-100`
                  : `${placeholderClasses.badgeIdle} opacity-0`
              )}
            >
              {profile.placeholders.inlineDropLabel}
            </span>
            <button
              type='button'
              className='inline-flex shrink-0 items-center justify-center rounded p-0.5 text-gray-400 opacity-0 transition hover:bg-red-500/20 hover:text-red-300 group-hover:opacity-100'
              onMouseDown={(event: React.MouseEvent<HTMLButtonElement>): void => {
                event.stopPropagation();
              }}
              onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                event.stopPropagation();
                onDeleteFolder(folderPath);
              }}
              title='Delete folder'
              aria-label={`Delete ${node.name}`}
            >
              <Trash2 className='size-3' aria-hidden='true' />
            </button>
          </div>
        </TreeRow>
      )}
    </TreeContextMenu>
  );
}
