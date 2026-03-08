'use client';

import { Box, Trash2, GripVertical, type LucideIcon } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import {
  TreeRow,
  TreeCaret,
  TreeActionButton,
  TreeActionSlot,
  TreeContextMenu,
  type TreeContextMenuItem,
} from '@/shared/ui';
import { DRAG_KEYS, hasDragType } from '@/shared/utils/drag-drop';

import { BLOCK_ICONS, CONVERTIBLE_SECTION_TYPES, resolveBlockLabel } from './tree-constants';
import { useDragStateExtract } from '../../../hooks/useDragStateExtract';
import { usePageBuilder } from '../../../hooks/usePageBuilderContext';
import { useTreeActions } from '../../../hooks/useTreeActionsContext';
import { readBlockDragData, setBlockDragData } from '@/features/cms/utils/page-builder-dnd';
import { ColumnBlockPicker } from '../ColumnBlockPicker';
import { BlockNodeItem } from './BlockNodeItem';
import { useTreeColumnId } from './TreeColumnContext';
import { TreeParentBlockProvider } from './TreeParentBlockContext';
import { useTreeSectionId } from './TreeSectionContext';

import type { SectionBlockNodeItemProps } from './tree-types';
import type { BlockInstance } from '../../../types/page-builder';

export function SectionBlockNodeItem(props: SectionBlockNodeItemProps): React.ReactNode {
  const { block, index } = props;

  const sectionId = useTreeSectionId();
  const columnId = useTreeColumnId();
  const { state: pbState } = usePageBuilder();
  const { expandedIds, selectNode, toggleExpand, blockActions, sectionActions } = useTreeActions();

  const selectedNodeId = pbState.selectedNodeId;

  // Drag state from context
  const drag = useDragStateExtract();
  const { startBlockDrag, endBlockDrag, endSectionDrag } = drag.actions;

  const draggedBlockId = drag.block.id;
  const draggedBlockType = drag.block.type;
  const draggedFromSectionId = drag.block.fromSectionId;
  const draggedFromColumnId = drag.block.fromColumnId;
  const draggedFromParentBlockId = drag.block.fromParentBlockId;
  const draggedSectionId = drag.section.id;
  const draggedSectionType = drag.section.type;

  const isSelected = selectedNodeId === block.id;
  const isExpanded = expandedIds.has(block.id);
  const hasChildren = (block.blocks ?? []).length > 0;
  const Icon: LucideIcon = BLOCK_ICONS[block.type] ?? Box;
  const [isDragOver, setIsDragOver] = useState(false);
  const isDragging = draggedBlockId === block.id;
  const isTextAtom = block.type === 'TextAtom';
  const blockLabel = resolveBlockLabel(block, block.type);

  const sectionBlockMenuItems: TreeContextMenuItem[] = useMemo(
    () => [
      {
        id: 'remove-block',
        label: 'Remove block',
        icon: <Trash2 className='size-3.5' />,
        tone: 'danger',
        onSelect: (): void => {
          blockActions.remove(sectionId, block.id, columnId);
        },
      },
    ],
    [blockActions, sectionId, block.id, columnId]
  );

  return (
    <div className='group/sblock'>
      <TreeContextMenu items={sectionBlockMenuItems}>
        <TreeRow
          tone='none'
          draggable
          onDragStart={(e: React.DragEvent) => {
            setBlockDragData(e.dataTransfer, {
              id: block.id,
              type: block.type,
              fromSectionId: sectionId,
              fromColumnId: columnId ?? '',
              fromParentBlockId: '',
            });
            // Defer state updates to prevent re-render from cancelling drag
            setTimeout(() => {
              startBlockDrag({
                id: block.id,
                type: block.type,
                fromSectionId: sectionId,
                fromColumnId: columnId,
                fromParentBlockId: null,
              });
            }, 0);
          }}
          onDragEnd={() => {
            endBlockDrag();
          }}
          onDragOver={(e: React.DragEvent) => {
            const isSectionDrop =
              draggedSectionId &&
              draggedSectionId !== sectionId &&
              CONVERTIBLE_SECTION_TYPES.includes(draggedSectionType ?? '');
            const hasBlockPayload = hasDragType(e.dataTransfer, [DRAG_KEYS.BLOCK_ID]);
            const isBlockDrop = (draggedBlockId && draggedBlockId !== block.id) || hasBlockPayload;
            if (isTextAtom) {
              if (!isBlockDrop) return;
            } else if (!isBlockDrop && !isSectionDrop) {
              return;
            }
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(true);
          }}
          onDragLeave={(e: React.DragEvent) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            setIsDragOver(false);
          }}
          onDrop={(e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(false);
            const blockDrag = readBlockDragData(e.dataTransfer, {
              id: draggedBlockId,
              type: draggedBlockType,
              fromSectionId: draggedFromSectionId,
              fromColumnId: draggedFromColumnId,
              fromParentBlockId: draggedFromParentBlockId,
            });
            const dragId = blockDrag.id;
            const fromSection = blockDrag.fromSectionId ?? sectionId;
            const fromColumn = blockDrag.fromColumnId;
            const fromParent = blockDrag.fromParentBlockId;
            if (isTextAtom) {
              if (!dragId || dragId === block.id) return;
              const draggedType = blockDrag.type ?? '';
              const shouldNest = draggedType === 'TextAtomLetter';
              blockActions.dropToColumn(
                dragId,
                fromSection,
                fromColumn || undefined,
                sectionId,
                columnId,
                shouldNest ? (block.blocks ?? []).length : index,
                fromParent || undefined,
                shouldNest ? block.id : undefined
              );
              endBlockDrag();
              return;
            }
            if (dragId && dragId !== block.id) {
              blockActions.dropToColumn(
                dragId,
                fromSection,
                fromColumn || undefined,
                sectionId,
                columnId,
                (block.blocks ?? []).length,
                fromParent || undefined,
                block.id
              );
              endBlockDrag();
            } else if (draggedSectionId && draggedSectionId !== sectionId) {
              sectionActions.dropToColumn(
                draggedSectionId,
                sectionId,
                columnId,
                (block.blocks ?? []).length,
                block.id
              );
              endSectionDrag();
            }
          }}
          className={`flex w-full cursor-pointer items-center gap-1.5 rounded px-2 py-1.5 text-sm font-medium transition ${
            isDragOver
              ? 'bg-emerald-600/30 text-emerald-200 ring-1 ring-emerald-500/50'
              : isSelected
                ? 'bg-blue-600/80 text-white'
                : isDragging
                  ? 'opacity-40 text-gray-400'
                  : 'text-gray-300 hover:bg-muted/40'
          }`}
        >
          <div
            draggable
            onDragStart={(e: React.DragEvent) => {
              e.stopPropagation();
              setBlockDragData(e.dataTransfer, {
                id: block.id,
                type: block.type,
                fromSectionId: sectionId,
                fromColumnId: columnId ?? '',
                fromParentBlockId: '',
              });
              // Defer state updates to prevent re-render from cancelling drag
              setTimeout(() => {
                startBlockDrag({
                  id: block.id,
                  type: block.type,
                  fromSectionId: sectionId,
                  fromColumnId: columnId,
                  fromParentBlockId: null,
                });
              }, 0);
            }}
            onDragEnd={() => {
              endBlockDrag();
            }}
            onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
            className='flex items-center justify-center opacity-0 group-hover/sblock:opacity-100 group-focus-within/sblock:opacity-100'
            aria-hidden='true'
          >
            <GripVertical className='size-3 shrink-0 text-gray-600 cursor-grab active:cursor-grabbing' />
          </div>
          <TreeCaret
            isOpen={isExpanded}
            hasChildren={true}
            ariaLabel={isExpanded ? 'Collapse block' : 'Expand block'}
            onToggle={(): void => toggleExpand(block.id)}
            iconClassName='size-3'
            placeholderClassName='block size-3 shrink-0'
          />
          <button
            type='button'
            onClick={() => selectNode(block.id)}
            aria-pressed={isSelected}
            aria-label={`Select block ${blockLabel}`}
            className='flex min-w-0 flex-1 items-center gap-1.5 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
          >
            <Icon className='size-3.5 shrink-0' />
            <span className='min-w-0 flex-1 truncate text-left'>{blockLabel}</span>
          </button>
          {!isTextAtom && (
            <TreeActionSlot show='always' align='inline'>
              <ColumnBlockPicker
                onSelect={(elemType: string) =>
                  blockActions.addElementToNestedBlock(sectionId, columnId, block.id, elemType)
                }
              />
            </TreeActionSlot>
          )}
          {/* Delete button for section-type blocks */}
          {!isDragOver && (
            <TreeActionSlot show='hover' align='inline'>
              <TreeActionButton
                tone='danger'
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  blockActions.remove(sectionId, block.id, columnId);
                }}
                title='Remove block'
              >
                <Trash2 className='size-3' />
              </TreeActionButton>
            </TreeActionSlot>
          )}
        </TreeRow>
      </TreeContextMenu>

      {isExpanded && hasChildren && (
        <div className='ml-5 border-l border-border/30 pl-1'>
          {(block.blocks ?? []).map((child: BlockInstance, childIndex: number) => (
            <TreeParentBlockProvider key={child.id} parentBlockId={block.id}>
              <BlockNodeItem block={child} index={childIndex} />
            </TreeParentBlockProvider>
          ))}
        </div>
      )}
    </div>
  );
}
