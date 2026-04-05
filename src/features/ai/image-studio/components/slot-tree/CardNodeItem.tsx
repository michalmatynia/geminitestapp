'use client';

import { Trash2 } from 'lucide-react';
import React from 'react';

import { fromSlotMasterNodeId } from '@/features/ai/image-studio/utils/master-folder-tree';
import { TreeCaret, TreeContextMenu, TreeRow } from '@/shared/ui/data-display.public';
import { cn } from '@/shared/utils/ui-utils';
import { type MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import { canNestTreeNodeV2 } from '@/shared/utils/folder-tree-profiles-v2';
import { focusOnMount } from '@/shared/utils/focus-on-mount';

import { useSlotTreeContext } from './SlotTreeContext';


export interface CardNodeItemProps {
  node: MasterTreeNode;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  isRenaming: boolean;
  select: (event?: React.MouseEvent<HTMLElement>) => void;
  toggleExpand: () => void;
}

export function CardNodeItem(props: CardNodeItemProps): React.JSX.Element | null {
  const { node, depth, hasChildren, isExpanded, isSelected, isRenaming, select, toggleExpand } =
    props;

  const {
    controller,
    slotById,
    onDeleteSlot,
    onMoveSlot,
    startCardRename,
    commitCardRename,
    onSelectCardNode,
    clearSelection,
    stickySelectionMode,
    profile,
    icons: { FileIcon, DragHandleIcon },
    deleteSlotMutationPending,
  } = useSlotTreeContext();

  const slotId = fromSlotMasterNodeId(node.id);
  const card = slotId ? (slotById.get(slotId) ?? null) : null;
  if (!card || !slotId) return null;

  const roleLabel =
    typeof node.metadata?.['roleLabel'] === 'string' ? node.metadata['roleLabel'] : null;
  const allowMoveCardToRoot = canNestTreeNodeV2({
    profile,
    nodeType: 'file',
    nodeKind: 'card',
    targetType: 'root',
  });

  return (
    <TreeContextMenu
      items={[
        {
          id: 'select-card',
          label: 'Select card',
          onSelect: (): void => {
            onSelectCardNode(card, node.id);
            select();
          },
        },
        {
          id: 'rename-card',
          label: 'Rename card',
          onSelect: (): void => startCardRename(node.id),
        },
        ...(card.folderPath && allowMoveCardToRoot
          ? [
            {
              id: 'move-card-root',
              label: 'Move to root',
              onSelect: (): void => onMoveSlot(card, ''),
            },
          ]
          : []),
        {
          id: 'delete-card',
          label: 'Delete card',
          icon: <Trash2 className='size-3.5' />,
          tone: 'danger',
          onSelect: (): void => onDeleteSlot(card),
        },
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
          aria-label={card.name || node.name}
          selected={isSelected}
          className='h-8 text-xs'
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
              <FileIcon className='size-3.5 text-gray-400' />
            </span>
            <input
              ref={focusOnMount}
              value={controller.renameDraft}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                controller.updateRenameDraft(event.target.value);
              }}
              onBlur={(): void => commitCardRename(card)}
              onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>): void => {
                event.stopPropagation();
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitCardRename(card);
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
              aria-label='Rename card'
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
          aria-label={card.name || node.name}
          selected={isSelected}
          selectedClassName='bg-muted text-white hover:bg-muted'
          className='relative h-8 text-xs'
        >
          <div className='flex h-full w-full min-w-0 items-center gap-1 text-left'>
            <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100'>
              <DragHandleIcon className='size-3.5 shrink-0 cursor-grab text-gray-500' aria-hidden='true' />
            </span>
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
              className='flex h-full min-w-0 flex-1 items-center gap-1 text-left'
              data-slot-id={card.id}
              onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                event.stopPropagation();
                if (stickySelectionMode && isSelected) {
                  clearSelection();
                  return;
                }
                select(event);
                onSelectCardNode(card, node.id);
              }}
              onDoubleClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                event.stopPropagation();
                startCardRename(node.id);
              }}
              title={card.name || card.id}
            >
              <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center'>
                <FileIcon className='size-3.5 text-gray-400' aria-hidden='true' />
              </span>
              <span className='min-w-0 flex-1 truncate'>{card.name || node.name}</span>
              {roleLabel ? (
                <span className='max-w-[90px] shrink-0 truncate text-[10px] uppercase tracking-wide text-gray-500'>
                  {roleLabel}
                </span>
              ) : null}
              <span
                className={cn(
                  'size-1 shrink-0 rounded-full bg-blue-300/55 transition-opacity duration-150',
                  isSelected ? 'opacity-100' : 'opacity-0'
                )}
                aria-hidden='true'
              />
            </button>
            <button
              type='button'
              className={cn(
                'inline-flex shrink-0 items-center justify-center rounded p-0.5 text-gray-400 transition',
                'opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-300',
                deleteSlotMutationPending ? 'cursor-not-allowed opacity-40' : undefined
              )}
              onMouseDown={(event: React.MouseEvent<HTMLButtonElement>): void => {
                event.stopPropagation();
              }}
              onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                event.stopPropagation();
                onDeleteSlot(card);
              }}
              title='Delete card'
              aria-label={`Delete ${card.name || node.name}`}
              disabled={deleteSlotMutationPending}
            >
              <Trash2 className='size-3' aria-hidden='true' />
            </button>
          </div>
        </TreeRow>
      )}
    </TreeContextMenu>
  );
}
