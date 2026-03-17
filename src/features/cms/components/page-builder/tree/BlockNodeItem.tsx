'use client';

import { Box, Trash2, GripVertical } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { useDragStateExtract } from '@/features/cms/hooks/useDragStateExtract';
import { usePageBuilder } from '@/features/cms/hooks/usePageBuilderContext';
import { useTreeActions } from '@/features/cms/hooks/useTreeActionsContext';
import { readBlockDragData, setBlockDragData } from '@/features/cms/utils/page-builder-dnd';
import type { TreeContextMenuItem } from '@/shared/contracts/ui';
import {
  TreeRow,
  TreeActionButton,
  TreeActionSlot,
  TreeContextMenu,
} from '@/shared/ui';
import { DRAG_KEYS, hasDragType } from '@/shared/utils/drag-drop';

import { BLOCK_ICONS, resolveBlockLabel } from './tree-constants';
import { useOptionalTreeColumnId } from './TreeColumnContext';
import { useOptionalTreeParentBlockId } from './TreeParentBlockContext';
import { useOptionalTreeRowId } from './TreeRowContext';
import { useTreeSectionId } from './TreeSectionContext';

import type { BlockNodeItemProps } from './tree-types';

export function BlockNodeItem(props: BlockNodeItemProps): React.ReactNode {
  const { block, index, disableDrag = false } = props;

  const sectionId = useTreeSectionId();
  const columnId = useOptionalTreeColumnId();
  const rowId = useOptionalTreeRowId();
  const resolvedParentBlockId = useOptionalTreeParentBlockId();
  const { state: pbState } = usePageBuilder();
  const { selectNode, blockActions } = useTreeActions();

  const selectedNodeId = pbState.selectedNodeId;

  // Drag state from context
  const drag = useDragStateExtract();
  const { startBlockDrag, endBlockDrag } = drag.actions;

  const draggedBlockId = drag.block.id;
  const draggedBlockType = drag.block.type;
  const draggedFromSectionId = drag.block.fromSectionId;
  const draggedFromColumnId = drag.block.fromColumnId;
  const draggedFromParentBlockId = drag.block.fromParentBlockId;

  const isSelected = selectedNodeId === block.id;
  const Icon = BLOCK_ICONS[block.type] ?? Box;
  const [isDragOver, setIsDragOver] = useState(false);
  const isDragging = draggedBlockId === block.id;
  const blockLabel = resolveBlockLabel(block, block.type);
  const canNestOnDrop = Array.isArray(block.blocks);

  const canDrag = !disableDrag;

  const blockMenuItems: TreeContextMenuItem[] = useMemo(
    () => [
      {
        id: 'remove-block',
        label: 'Remove block',
        icon: <Trash2 className='size-3.5' />,
        tone: 'danger',
        onSelect: (): void => {
          blockActions.remove(sectionId, block.id, columnId, resolvedParentBlockId);
        },
      },
    ],
    [blockActions, sectionId, block.id, columnId, resolvedParentBlockId]
  );

  return (
    <TreeContextMenu items={blockMenuItems}>
      <TreeRow
        tone='none'
        draggable={canDrag}
        onDragStart={(e: React.DragEvent) => {
          if (!canDrag) return;
          setBlockDragData(e.dataTransfer, {
            id: block.id,
            type: block.type,
            fromSectionId: sectionId,
            fromColumnId: columnId ?? '',
            fromParentBlockId: resolvedParentBlockId ?? '',
          });
          // Defer state updates to prevent re-render from cancelling drag
          setTimeout(() => {
            startBlockDrag({
              id: block.id,
              type: block.type,
              fromSectionId: sectionId,
              fromColumnId: columnId ?? null,
              fromParentBlockId: resolvedParentBlockId ?? null,
            });
          }, 0);
        }}
        onDragEnd={() => {
          if (!canDrag) return;
          endBlockDrag();
        }}
        onDragOver={(e: React.DragEvent) => {
          if (disableDrag) return;
          const hasBlockPayload = hasDragType(e.dataTransfer, [DRAG_KEYS.BLOCK_ID]);
          const blockDrag = readBlockDragData(e.dataTransfer, {
            id: draggedBlockId,
            ...(draggedBlockType !== undefined ? { type: draggedBlockType } : {}),
          });
          const dragId = blockDrag.id;
          if ((!dragId && !hasBlockPayload) || draggedBlockId === block.id || dragId === block.id)
            return;
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(true);
        }}
        onDragLeave={(e: React.DragEvent) => {
          if (disableDrag) return;
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setIsDragOver(false);
        }}
        onDrop={(e: React.DragEvent) => {
          if (disableDrag) return;
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(false);
          const blockDrag = readBlockDragData(e.dataTransfer, {
            id: draggedBlockId,
            ...(draggedBlockType !== undefined ? { type: draggedBlockType } : {}),
            fromSectionId: draggedFromSectionId,
            ...(draggedFromColumnId !== undefined ? { fromColumnId: draggedFromColumnId } : {}),
            ...(draggedFromParentBlockId !== undefined
              ? { fromParentBlockId: draggedFromParentBlockId }
              : {}),
          });
          const dragId = blockDrag.id;
          if (!dragId || dragId === block.id) return;
          const fromSection = blockDrag.fromSectionId ?? sectionId;
          const fromColumn = blockDrag.fromColumnId;
          const fromParent = blockDrag.fromParentBlockId;
          if (columnId) {
            blockActions.dropToColumn(
              dragId,
              fromSection,
              fromColumn || undefined,
              sectionId,
              columnId,
              canNestOnDrop ? (block.blocks ?? []).length : index,
              fromParent || undefined,
              canNestOnDrop ? block.id : resolvedParentBlockId
            );
            endBlockDrag();
            return;
          }
          if (!fromSection) return;
          if (rowId) {
            blockActions.dropToRow(
              dragId,
              fromSection,
              fromColumn || undefined,
              sectionId,
              rowId,
              canNestOnDrop ? (block.blocks ?? []).length : index,
              fromParent || undefined,
              canNestOnDrop ? block.id : undefined
            );
          } else {
            blockActions.dropToSection(
              dragId,
              fromSection,
              fromColumn || undefined,
              sectionId,
              canNestOnDrop ? (block.blocks ?? []).length : index,
              fromParent || undefined,
              canNestOnDrop ? block.id : undefined
            );
          }
          endBlockDrag();
        }}
        className={`group flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-sm transition ${'cursor-pointer'} ${
          isDragOver
            ? 'bg-emerald-600/30 text-emerald-200 ring-1 ring-emerald-500/50'
            : isSelected
              ? 'bg-blue-600/80 text-white'
              : isDragging
                ? 'opacity-40 text-gray-400'
                : 'text-gray-400 hover:bg-muted/40 hover:text-gray-300'
        }`}
      >
        {canDrag ? (
          <div
            draggable
            onDragStart={(e: React.DragEvent) => {
              if (!canDrag) return;
              e.stopPropagation();
              setBlockDragData(e.dataTransfer, {
                id: block.id,
                type: block.type,
                fromSectionId: sectionId,
                fromColumnId: columnId ?? '',
                fromParentBlockId: resolvedParentBlockId ?? '',
              });
              // Defer state updates to prevent re-render from cancelling drag
              setTimeout(() => {
                startBlockDrag({
                  id: block.id,
                  type: block.type,
                  fromSectionId: sectionId,
                  fromColumnId: columnId ?? null,
                  fromParentBlockId: resolvedParentBlockId ?? null,
                });
              }, 0);
            }}
            onDragEnd={() => {
              if (!canDrag) return;
              endBlockDrag();
            }}
            onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
            className='flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
            aria-hidden='true'
          >
            <GripVertical className='size-3 shrink-0 text-gray-600 cursor-grab active:cursor-grabbing' />
          </div>
        ) : (
          <span className='size-3 shrink-0' />
        )}
        <button
          type='button'
          onClick={() => selectNode(block.id)}
          aria-pressed={isSelected}
          aria-label={`Select block ${blockLabel}`}
          className='flex min-w-0 flex-1 items-center gap-1.5 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
        >
          <Icon className='size-3.5 shrink-0' />
          <span className='min-w-0 flex-1 truncate'>{blockLabel}</span>
        </button>
        {/* Delete button - visible on hover when selected or always visible on hover */}
        {!isDragOver && (
          <TreeActionSlot show='hover' align='end'>
            <TreeActionButton
              tone='danger'
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                blockActions.remove(sectionId, block.id, columnId, resolvedParentBlockId);
              }}
              title='Remove block'
            >
              <Trash2 className='size-3' />
            </TreeActionButton>
          </TreeActionSlot>
        )}
      </TreeRow>
    </TreeContextMenu>
  );
}
