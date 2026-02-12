'use client';

import { Box, Eye, EyeOff, Trash2, Plus, GripVertical, type LucideIcon } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { TreeRow, TreeCaret, TreeActionButton, TreeActionSlot, TreeContextMenu, type TreeContextMenuItem } from '@/shared/ui';
import { DRAG_KEYS, hasDragType, resolveVerticalDropPosition } from '@/shared/utils/drag-drop';

import { useDragStateExtract } from '../../../hooks/useDragStateExtract';
import { usePageBuilder } from '../../../hooks/usePageBuilderContext';
import { useTreeActions } from '../../../hooks/useTreeActionsContext';
import { readBlockDragData, readSectionDragData, setSectionDragData } from '../../../utils/page-builder-dnd';
import { BlockPicker } from '../BlockPicker';
import { getSectionDefinition } from '../section-registry';
import { BlockNodeItem } from './BlockNodeItem';
import { ColumnNodeItem } from './ColumnNodeItem';
import { RowNodeItem } from './RowNodeItem';
import { SlideshowFrameNodeItem } from './SlideshowFrameNodeItem';
import {
  SECTION_ICONS,
  CONVERTIBLE_SECTION_TYPES,
  resolveNodeLabel,
} from './tree-constants';
import { TreeSectionProvider } from './TreeSectionContext';

import type { SectionNodeItemProps } from './tree-types';
import type { BlockInstance, PageZone } from '../../../types/page-builder';

export function SectionNodeItem({
  section,
  sectionIndex,
}: SectionNodeItemProps): React.ReactNode {
  const { state: pbState } = usePageBuilder();
  const {
    expandedIds,
    selectNode,
    toggleExpand,
    blockActions,
    sectionActions,
    gridActions,
  } = useTreeActions();

  const selectedNodeId = pbState.selectedNodeId;

  // Drag state from context
  const drag = useDragStateExtract();
  const { endBlockDrag, startSectionDrag, endSectionDrag } = drag.actions;

  const draggedBlockId = drag.block.id;
  const draggedBlockType = drag.block.type;
  const draggedFromSectionId = drag.block.fromSectionId;
  const draggedFromColumnId = drag.block.fromColumnId;
  const draggedFromParentBlockId = drag.block.fromParentBlockId;
  const draggedSectionId = drag.section.id;
  const draggedSectionType = drag.section.type;
  const draggedSectionIndex = drag.section.index;
  const draggedSectionZone = drag.section.zone;

  const isSelected = selectedNodeId === section.id;
  const isFileSection =
    section.type === 'TextElement' ||
    section.type === 'TextAtom' ||
    section.type === 'ImageElement' ||
    section.type === 'ButtonElement';
  const isSlideshowSection = section.type === 'Slideshow';
  const hasChildren = section.blocks.length > 0;
  const hasAllowedBlocks = (getSectionDefinition(section.type)?.allowedBlockTypes?.length ?? 0) > 0;
  const canToggle = !isFileSection && (section.type === 'Grid' || hasChildren || hasAllowedBlocks);
  const isExpanded = canToggle && expandedIds.has(section.id);
  const targetAllowsTextElement =
    getSectionDefinition(section.type)?.allowedBlockTypes?.includes('TextElement') ?? false;
  const targetAllowsTextAtom =
    getSectionDefinition(section.type)?.allowedBlockTypes?.includes('TextAtom') ?? false;
  const targetAllowsImageElement =
    getSectionDefinition(section.type)?.allowedBlockTypes?.includes('ImageElement') ?? false;
  const targetAllowsButton =
    getSectionDefinition(section.type)?.allowedBlockTypes?.includes('Button') ?? false;
  const hasBlocks = section.blocks.length > 0;
  const Icon: LucideIcon = SECTION_ICONS[section.type] ?? Box;
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSectionDragOver, setIsSectionDragOver] = useState(false);
  const [isContentDragOver, setIsContentDragOver] = useState(false);
  const [sectionDropPosition, setSectionDropPosition] = useState<'above' | 'below' | null>(null);
  const isDraggingSection = draggedSectionId === section.id;
  const isHidden = Boolean(section.settings['isHidden']);

  const sectionMenuItems: TreeContextMenuItem[] = useMemo(
    () => [
      {
        id: 'toggle-visibility',
        label: isHidden ? 'Show section' : 'Hide section',
        icon: isHidden ? <Eye className='size-3.5' /> : <EyeOff className='size-3.5' />,
        onSelect: () => sectionActions.toggleVisibility(section.id, !isHidden),
      },
      { id: 'separator-1', separator: true },
      {
        id: 'delete-section',
        label: 'Delete section',
        icon: <Trash2 className='size-3.5' />,
        tone: 'danger',
        onSelect: () => sectionActions.remove(section.id),
      },
    ],
    [isHidden, sectionActions, section.id]
  );

  const gridRows = section.blocks.filter((b: BlockInstance) => b.type === 'Row');
  const gridColumns = section.blocks.filter((b: BlockInstance) => b.type === 'Column');
  const gridLayerEntries = section.blocks.flatMap((block: BlockInstance, index: number) =>
    block.type !== 'Row' && block.type !== 'Column' ? [{ block, index }] : []
  );

  const resolveSectionDropPosition = (clientY: number, rect: DOMRect): 'above' | 'below' | null => {
    const position = resolveVerticalDropPosition(clientY, rect, { thresholdRatio: 0.3, thresholdPx: 8 });
    if (position === 'before') return 'above';
    if (position === 'after') return 'below';
    return null;
  };

  return (
    <TreeSectionProvider sectionId={section.id}>
      <div className='group/section'>
        <TreeContextMenu items={sectionMenuItems}>
          <TreeRow
            tone='none'
            onClick={() => selectNode(section.id)}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectNode(section.id);
              }
            }}
            onDragOver={(e: React.DragEvent) => {
              e.preventDefault();
              e.stopPropagation();
              const sectionDrag = readSectionDragData(e.dataTransfer, {
                id: draggedSectionId,
                zone: draggedSectionZone,
                index: draggedSectionIndex,
              });
              const blockDrag = readBlockDragData(e.dataTransfer, {
                id: draggedBlockId,
                type: draggedBlockType,
              });
              const dragSectionId = sectionDrag.id;
              if (dragSectionId && dragSectionId !== section.id) {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const nextDrop = resolveSectionDropPosition(e.clientY, rect);
                const dragZone = (sectionDrag.zone as PageZone | null) ?? null;
                const dragIndex = sectionDrag.index;
                if (
                  nextDrop &&
              dragZone === section.zone &&
              dragIndex !== null
                ) {
                  const targetIndex =
                nextDrop === 'below' ? sectionIndex + 1 : sectionIndex;
                  if (targetIndex === dragIndex) {
                    setSectionDropPosition(null);
                    setIsSectionDragOver(true);
                    setIsDragOver(false);
                    return;
                  }
                }
                setSectionDropPosition(nextDrop);
                setIsSectionDragOver(true);
                setIsDragOver(false);
              } else if (blockDrag.id && !isFileSection) {
                setIsDragOver(true);
                setSectionDropPosition(null);
              }
            }}
            onDragLeave={(e: React.DragEvent) => {
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              setIsDragOver(false);
              setIsSectionDragOver(false);
              setSectionDropPosition(null);
            }}
            onDrop={(e: React.DragEvent) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragOver(false);
              setIsSectionDragOver(false);
              const dropPosition = sectionDropPosition;
              setSectionDropPosition(null);
              const sectionDrag = readSectionDragData(e.dataTransfer, {
                id: draggedSectionId,
                type: draggedSectionType,
                zone: draggedSectionZone,
                index: draggedSectionIndex,
              });
              const blockDrag = readBlockDragData(e.dataTransfer, {
                id: draggedBlockId,
                type: draggedBlockType,
                fromSectionId: draggedFromSectionId,
                fromColumnId: draggedFromColumnId,
                fromParentBlockId: draggedFromParentBlockId,
              });
              const dragBlockId = blockDrag.id;
              const dragSectionId = sectionDrag.id;
              const dragSectionType = sectionDrag.type;
              if (dragSectionId && dragSectionId !== section.id) {
                if (dragSectionType === 'TextElement' && targetAllowsTextElement) {
                  sectionActions.convertToBlock(dragSectionId, section.id, section.blocks.length);
                } else if (dragSectionType === 'TextAtom' && targetAllowsTextAtom) {
                  sectionActions.convertToBlock(dragSectionId, section.id, section.blocks.length);
                } else if (dragSectionType === 'ImageElement' && targetAllowsImageElement) {
                  sectionActions.convertToBlock(dragSectionId, section.id, section.blocks.length);
                } else if (dragSectionType === 'ButtonElement' && targetAllowsButton) {
                  sectionActions.convertToBlock(dragSectionId, section.id, section.blocks.length);
                } else if (section.type === 'Grid') {
                  if (CONVERTIBLE_SECTION_TYPES.includes(dragSectionType ?? '') && !dropPosition) {
                    const firstColumn =
                  gridRows.flatMap((row: BlockInstance) => row.blocks ?? []).find((b: BlockInstance) => b.type === 'Column') ??
                  gridColumns.find((b: BlockInstance) => b.type === 'Column');
                    if (firstColumn) {
                      sectionActions.dropToColumn(dragSectionId, section.id, firstColumn.id, (firstColumn.blocks ?? []).length);
                    }
                  } else {
                    const targetIndex = dropPosition === 'below' ? sectionIndex + 1 : sectionIndex;
                    sectionActions.dropInZone(dragSectionId, section.zone, targetIndex);
                  }
                } else {
                  const targetIndex = dropPosition === 'below' ? sectionIndex + 1 : sectionIndex;
                  sectionActions.dropInZone(dragSectionId, section.zone, targetIndex);
                }
                endSectionDrag();
              } else if (dragBlockId && !isFileSection) {
                const fromSection = blockDrag.fromSectionId ?? '';
                if (!fromSection) return;
                const fromColumn = blockDrag.fromColumnId;
                const fromParent = blockDrag.fromParentBlockId;
                const blockType = blockDrag.type ?? '';
                const isImageElement = blockType === 'ImageElement';
                if (section.type === 'Grid') {
                  if (isImageElement) {
                    blockActions.dropToSection(
                      dragBlockId,
                      fromSection,
                      fromColumn || undefined,
                      section.id,
                      section.blocks.length,
                      fromParent || undefined
                    );
                  } else {
                    const firstColumn =
                  gridRows.flatMap((row: BlockInstance) => row.blocks ?? []).find((b: BlockInstance) => b.type === 'Column') ??
                  gridColumns.find((b: BlockInstance) => b.type === 'Column');
                    if (firstColumn) {
                      blockActions.dropToColumn(
                        dragBlockId,
                        fromSection,
                        fromColumn || undefined,
                        section.id,
                        firstColumn.id,
                        (firstColumn.blocks ?? []).length,
                        fromParent || undefined
                      );
                    }
                  }
                } else if (fromColumn || fromParent) {
                  blockActions.dropToSection(
                    dragBlockId,
                    fromSection,
                    fromColumn || undefined,
                    section.id,
                    section.blocks.length,
                    fromParent || undefined
                  );
                } else {
                  blockActions.drop(dragBlockId, fromSection, section.id, section.blocks.length);
                }
                endBlockDrag();
              }
            }}
            className={`relative flex w-full cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm font-medium select-none ${
              isSectionDragOver
                ? 'bg-purple-600/30 text-purple-200 ring-1 ring-purple-500/50'
                : isDragOver
                  ? 'bg-emerald-600/30 text-emerald-200 ring-1 ring-emerald-500/50'
                  : isDraggingSection
                    ? 'opacity-40 text-gray-400'
                    : isSelected
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-200 hover:bg-muted/50'
            }`}
          >
            <div
              draggable
              onDragStart={(e: React.DragEvent) => {
                e.stopPropagation();

                // Set drag data FIRST - this must happen synchronously
                setSectionDragData(e.dataTransfer, {
                  id: section.id,
                  type: section.type,
                  zone: section.zone,
                  index: sectionIndex,
                });

                // IMPORTANT: Defer React state updates to prevent re-render from cancelling drag
                setTimeout(() => {
                  startSectionDrag({
                    id: section.id,
                    type: section.type,
                    index: sectionIndex,
                    zone: section.zone,
                  });
                }, 0);
              }}
              onDragEnd={() => {
                endSectionDrag();
              }}
              onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className='flex items-center justify-center opacity-0 group-hover/section:opacity-100'
              aria-label='Drag section'
            >
              <GripVertical className='size-3 shrink-0 text-gray-600 cursor-grab active:cursor-grabbing' />
            </div>
            <TreeCaret
              isOpen={isExpanded}
              hasChildren={canToggle}
              ariaLabel={isExpanded ? `Collapse ${section.type}` : `Expand ${section.type}`}
              onToggle={canToggle ? (): void => toggleExpand(section.id) : undefined}
              placeholderClassName='block size-3.5 shrink-0 pointer-events-none'
            />
            <Icon className='size-4 shrink-0 pointer-events-none' />
            <span className='flex-1 truncate text-left pointer-events-none'>
              {resolveNodeLabel(section.type, section.settings['label'])}
            </span>
            {isSectionDragOver && (
              <span className='text-[10px] text-purple-300 pointer-events-none'>Move here</span>
            )}
            {isDragOver && (
              <span className='text-[10px] text-emerald-300 pointer-events-none'>Drop here</span>
            )}
            <TreeActionSlot
              show='hover'
              isVisible={isSelected}
              align='inline'
              className='gap-0.5 pointer-events-none'
            >
              <TreeActionButton
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  sectionActions.toggleVisibility(section.id, !isHidden);
                }}
                onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
                className='pointer-events-auto'
                title={isHidden ? 'Show section' : 'Hide section'}
              >
                {isHidden ? <EyeOff className='size-3' /> : <Eye className='size-3' />}
              </TreeActionButton>
              <TreeActionButton
                tone='danger'
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  sectionActions.remove(section.id);
                }}
                onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
                className='pointer-events-auto'
                title='Delete section'
              >
                <Trash2 className='size-3' />
              </TreeActionButton>
            </TreeActionSlot>
          </TreeRow>
        </TreeContextMenu>


        {isExpanded && section.type === 'Grid' && (
          <div className='ml-4 border-l border-border/30 pl-1'>
            {gridRows.length > 0 ? (
              gridRows.map((row: BlockInstance, rowIndex: number) => (
                <RowNodeItem
                  key={row.id}
                  row={row}
                  rowIndex={rowIndex}
                  rowCount={gridRows.length}
                />
              ))
            ) : gridColumns.length > 0 ? (
              gridColumns.map((column: BlockInstance, colIndex: number) => (
                <ColumnNodeItem
                  key={column.id}
                  column={column}
                  columnIndex={colIndex}
                  rowColumnCount={gridColumns.length}
                />
              ))
            ) : (
              <div className='py-2 text-xs text-gray-500'>No rows yet.</div>
            )}
            {gridLayerEntries.length > 0 && (
              <div className='mt-2 space-y-1'>
                <div className='px-2 text-[10px] uppercase tracking-wide text-gray-500'>
                Grid backgrounds
                </div>
                {gridLayerEntries.map(({ block, index }: { block: BlockInstance; index: number }) => (
                  <BlockNodeItem
                    key={block.id}
                    block={block}
                    index={index}
                  />
                ))}
              </div>
            )}
            <button
              type='button'
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                gridActions.addRow(section.id);
              }}
              className='mt-1 flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-400 hover:bg-muted/40 hover:text-gray-200'
            >
              <Plus className='size-3' />
            Add row
            </button>
          </div>
        )}

        {isExpanded && section.type !== 'Grid' && !isFileSection && (
          <div
            className={`ml-4 border-l pl-1 ${isContentDragOver ? 'border-emerald-500 bg-emerald-600/10' : 'border-border/30'}`}
            onDragOver={(e: React.DragEvent) => {
              const hasBlockPayload = hasDragType(e.dataTransfer, [DRAG_KEYS.BLOCK_ID]);
              const blockDrag = readBlockDragData(e.dataTransfer, {
                id: draggedBlockId,
                type: draggedBlockType,
              });
              const dragId = blockDrag.id;
              if (!dragId && !hasBlockPayload) return;
              e.preventDefault();
              e.stopPropagation();
              setIsContentDragOver(true);
            }}
            onDragLeave={(e: React.DragEvent) => {
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              setIsContentDragOver(false);
            }}
            onDrop={(e: React.DragEvent) => {
              e.preventDefault();
              e.stopPropagation();
              setIsContentDragOver(false);
              const blockDrag = readBlockDragData(e.dataTransfer, {
                id: draggedBlockId,
                type: draggedBlockType,
                fromSectionId: draggedFromSectionId,
                fromColumnId: draggedFromColumnId,
                fromParentBlockId: draggedFromParentBlockId,
              });
              const dragId = blockDrag.id;
              if (!dragId) return;
              const fromSection = blockDrag.fromSectionId ?? '';
              if (!fromSection) return;
              const fromColumn = blockDrag.fromColumnId;
              const fromParent = blockDrag.fromParentBlockId;
              if (fromColumn || fromParent) {
                blockActions.dropToSection(dragId, fromSection, fromColumn || undefined, section.id, section.blocks.length, fromParent || undefined);
              } else {
                blockActions.drop(dragId, fromSection, section.id, section.blocks.length);
              }
              endBlockDrag();
            }}
          >
            {hasBlocks ? (
              section.blocks.map((block: BlockInstance, index: number) => (
                isSlideshowSection && block.type === 'SlideshowFrame' ? (
                  <SlideshowFrameNodeItem
                    key={block.id}
                    frame={block}
                    index={index}
                  />
                ) : (
                  <BlockNodeItem
                    key={block.id}
                    block={block}
                    index={index}
                  />
                )
              ))
            ) : (
              <div className='py-2 text-xs text-gray-500'>No blocks yet. Drag blocks here or use the + button below.</div>
            )}
            <div className='mt-1'>
              <BlockPicker
                sectionType={section.type}
                onSelect={(blockType: string) => blockActions.add(section.id, blockType)}
              />
            </div>
          </div>
        )}
      </div>
    </TreeSectionProvider>
  );
}
