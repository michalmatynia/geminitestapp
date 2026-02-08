'use client';

import { Trash2, Frame, GripVertical, type LucideIcon } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { TreeRow, TreeCaret, TreeActionButton, TreeActionSlot, TreeContextMenu, type TreeContextMenuItem } from '@/shared/ui';
import { DRAG_KEYS, hasDragType } from '@/shared/utils/drag-drop';

import { useDragStateExtract } from '../../../hooks/useDragStateExtract';
import { usePageBuilder } from '../../../hooks/usePageBuilderContext';
import { useTreeActions } from '../../../hooks/useTreeActionsContext';
import { readBlockDragData, readSectionDragData, setBlockDragData } from '../../../utils/page-builder-dnd';
import { ColumnBlockPicker } from '../ColumnBlockPicker';
import { getBlockDefinition } from '../section-registry';
import { BlockNodeItem } from './BlockNodeItem';
import { BLOCK_ICONS, CONVERTIBLE_SECTION_TYPES, resolveBlockLabel } from './tree-constants';

import type { SlideshowFrameNodeItemProps } from './tree-types';
import type { BlockInstance } from '../../../types/page-builder';

export function SlideshowFrameNodeItem({
  frame,
  index,
  sectionId,
}: SlideshowFrameNodeItemProps): React.ReactNode {
  const { state: pbState } = usePageBuilder();
  const {
    expandedIds,
    selectNode,
    toggleExpand,
    blockActions,
    sectionActions,
  } = useTreeActions();

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
  const isSelected = selectedNodeId === frame.id;
  const isExpanded = expandedIds.has(frame.id);
  const hasChildren = (frame.blocks ?? []).length > 0;
  const Icon: LucideIcon = BLOCK_ICONS[frame.type] ?? Frame;
  const [isDragOver, setIsDragOver] = useState(false);
  const isDragging = draggedBlockId === frame.id;
  const blockLabel = resolveBlockLabel(frame, 'Frame');
  const frameAllowedTypes = getBlockDefinition('SlideshowFrame')?.allowedBlockTypes ?? [];
  const frameMenuItems: TreeContextMenuItem[] = useMemo(
    () => [
      {
        id: 'remove-frame',
        label: 'Remove frame',
        icon: <Trash2 className='size-3.5' />,
        tone: 'danger',
        onSelect: (): void => {
          blockActions.remove(sectionId, frame.id);
        },
      },
    ],
    [blockActions, sectionId, frame.id]
  );

  return (
    <div className='group/frame'>
      <TreeContextMenu items={frameMenuItems}>
        <TreeRow
          tone='none'
          role='button'
          tabIndex={0}
          onClick={() => selectNode(frame.id)}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              selectNode(frame.id);
            }
          }}
          onDragOver={(e: React.DragEvent) => {
            const hasBlockPayload = hasDragType(e.dataTransfer, [DRAG_KEYS.TEXT]);
            const blockDrag = readBlockDragData(e.dataTransfer, {
              id: draggedBlockId,
              type: draggedBlockType,
            });
            const dragId = blockDrag.id;
            // Check for section drag (for convertible sections like Block, TextElement, etc.)
            const isSectionDrag = draggedSectionId && draggedSectionId !== sectionId && CONVERTIBLE_SECTION_TYPES.includes(draggedSectionType ?? '');
            // Accept block drag OR section drag
            if (!dragId && !hasBlockPayload && !isSectionDrag) return;
            if (dragId === frame.id) return; // Don't allow dropping on self
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

            // First check for section drag data
            const sectionDrag = readSectionDragData(e.dataTransfer, {
              id: draggedSectionId,
              type: draggedSectionType,
            });
            const sectionIdToDrop = sectionDrag.id;
            const sectionTypeToDrop = sectionDrag.type;

            // Handle section drop (convert section to block in frame)
            if (sectionIdToDrop && sectionIdToDrop !== sectionId && CONVERTIBLE_SECTION_TYPES.includes(sectionTypeToDrop ?? '')) {
            // Convert the section to a block inside the frame
              sectionActions.dropToSlideshowFrame(sectionIdToDrop, sectionId, frame.id, (frame.blocks ?? []).length);
              endSectionDrag();
              return;
            }

            const blockDrag = readBlockDragData(e.dataTransfer, {
              id: draggedBlockId,
              type: draggedBlockType,
              fromSectionId: draggedFromSectionId,
              fromColumnId: draggedFromColumnId,
              fromParentBlockId: draggedFromParentBlockId,
            });
            const dragType = blockDrag.type ?? '';
            const dragId = blockDrag.id;

            if (!dragId) return;

            // Handle SlideshowFrame reordering
            if (dragType === 'SlideshowFrame') {
              if (dragId === frame.id) return;
              const fromSection = blockDrag.fromSectionId ?? sectionId;
              blockActions.drop(dragId, fromSection, sectionId, index);
            }
            // Handle dropping allowed block types INTO the frame
            else if (frameAllowedTypes.includes(dragType)) {
              const fromSection = blockDrag.fromSectionId ?? sectionId;
              const fromColumn = blockDrag.fromColumnId ?? undefined;
              const fromParentBlock = blockDrag.fromParentBlockId ?? undefined;
              const frameBlockCount = (frame.blocks ?? []).length;
              blockActions.dropToSlideshowFrame(dragId, fromSection, fromColumn, fromParentBlock, sectionId, frame.id, frameBlockCount);
            } else {
              return;
            }

            endBlockDrag();
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
                id: frame.id,
                type: frame.type,
                fromSectionId: sectionId,
                fromColumnId: '',
                fromParentBlockId: '',
              });
              setTimeout(() => {
                startBlockDrag({
                  id: frame.id,
                  type: frame.type,
                  fromSectionId: sectionId,
                  fromColumnId: null,
                  fromParentBlockId: null,
                });
              }, 0);
            }}
            onDragEnd={() => {
              endBlockDrag();
            }}
            onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className='flex items-center justify-center opacity-0 group-hover/frame:opacity-100'
            aria-label='Drag frame'
          >
            <GripVertical className='size-3 shrink-0 text-gray-600 cursor-grab active:cursor-grabbing' />
          </div>
          <TreeCaret
            isOpen={isExpanded}
            hasChildren={true}
            ariaLabel={isExpanded ? 'Collapse frame' : 'Expand frame'}
            onToggle={(): void => toggleExpand(frame.id)}
            iconClassName='size-3'
            placeholderClassName='block size-3 shrink-0'
          />
          <Icon className='size-3.5 shrink-0' />
          <span className='flex-1 truncate text-left'>{blockLabel}</span>
          {isDragOver && (
            <span className='text-[10px] text-emerald-300'>Drop here</span>
          )}
          <TreeActionSlot show='always' align='inline'>
            <div draggable={false} onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}>
              <ColumnBlockPicker
                onSelect={(elemType: string) => blockActions.addElementToSectionBlock(sectionId, frame.id, elemType)}
                allowedBlockTypes={frameAllowedTypes}
              />
            </div>
          </TreeActionSlot>
          {!isDragOver && (
            <TreeActionSlot show='hover' align='inline'>
              <TreeActionButton
                tone='danger'
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  blockActions.remove(sectionId, frame.id);
                }}
                title='Remove frame'
              >
                <Trash2 className='size-3' />
              </TreeActionButton>
            </TreeActionSlot>
          )}
        </TreeRow>
      </TreeContextMenu>

      {isExpanded && (
        <div
          className='ml-5 border-l border-border/30 pl-1'
          onDragOver={(e: React.DragEvent) => {
            const hasBlockPayload = hasDragType(e.dataTransfer, [DRAG_KEYS.TEXT]);
            const blockDrag = readBlockDragData(e.dataTransfer, {
              id: draggedBlockId,
              type: draggedBlockType,
            });
            const dragId = blockDrag.id;
            if (!dragId && !hasBlockPayload) return;
            if (dragId === frame.id) return;
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
            const dragType = blockDrag.type ?? '';
            const dragId = blockDrag.id;
            if (!dragId) return;
            // Handle dropping allowed block types INTO the frame
            if (frameAllowedTypes.includes(dragType)) {
              const fromSection = blockDrag.fromSectionId ?? sectionId;
              const fromColumn = blockDrag.fromColumnId ?? undefined;
              const fromParentBlock = blockDrag.fromParentBlockId ?? undefined;
              const frameBlockCount = (frame.blocks ?? []).length;
              blockActions.dropToSlideshowFrame(dragId, fromSection, fromColumn, fromParentBlock, sectionId, frame.id, frameBlockCount);
            }
            endBlockDrag();
          }}
        >
          {hasChildren ? (
            (frame.blocks ?? []).map((child: BlockInstance, childIndex: number) => (
              <div
                key={child.id}
                draggable
                onDragStart={(e: React.DragEvent) => {
                  setBlockDragData(e.dataTransfer, {
                    id: child.id,
                    type: child.type,
                    fromSectionId: sectionId,
                    fromColumnId: '',
                    fromParentBlockId: frame.id,
                  });
                  setTimeout(() => {
                    startBlockDrag({
                      id: child.id,
                      type: child.type,
                      fromSectionId: sectionId,
                      fromColumnId: null,
                      fromParentBlockId: frame.id,
                    });
                  }, 0);
                }}
                onDragEnd={() => {
                  endBlockDrag();
                }}
              >
                <BlockNodeItem
                  block={child}
                  index={childIndex}
                  sectionId={sectionId}
                  parentBlockId={frame.id}
                  disableDrag
                />
              </div>
            ))
          ) : (
            <div
              className={`mt-1 flex min-h-[36px] items-center gap-2 rounded border border-dashed px-2 py-1 text-[11px] transition ${
                isDragOver
                  ? 'border-emerald-500/70 bg-emerald-500/10 text-emerald-200'
                  : 'border-border/30 text-gray-500'
              }`}
            >
              {isDragOver ? 'Drop here' : 'Add elements to this frame'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
