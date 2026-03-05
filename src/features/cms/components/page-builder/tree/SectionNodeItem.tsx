'use client';

import { Box, Eye, EyeOff, Trash2, Plus, GripVertical, type LucideIcon } from 'lucide-react';
import React from 'react';

import { isCmsSectionHidden } from '@/features/cms/utils/page-builder-normalization';
import { setMasterTreeDragNodeData } from '@/features/foldertree/v2';
import { Button, Badge, TreeCaret } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { readSectionDragData, setSectionDragData } from '@/features/cms/utils/page-builder-dnd';
import { isDescendant } from '@/features/cms/hooks/page-builder/section-hierarchy';
import { BlockNodeItem } from './BlockNodeItem';
import {
  useComponentTreePanelActions,
  useComponentTreePanelState,
} from './ComponentTreePanelContext';
import { RowNodeItem } from './RowNodeItem';
import { SectionBlockNodeItem } from './SectionBlockNodeItem';
import { SlideshowFrameNodeItem } from './SlideshowFrameNodeItem';
import { TreeSectionProvider } from './TreeSectionContext';
import { toCmsSectionNodeId } from '../utils/cms-master-tree';
import { useDragStateExtract } from '../../../hooks/useDragStateExtract';
import { usePageBuilder } from '../../../hooks/usePageBuilderContext';
import { useTreeActions } from '../../../hooks/useTreeActionsContext';
import { TreeSectionPicker } from './TreeSectionPicker';
import type { SectionNodeItemProps } from './tree-types';

export function SectionNodeItem(props: SectionNodeItemProps): React.JSX.Element {
  const {
    section,
    sectionIndex,
    hasTreeChildren = false,
    isTreeExpanded = false,
    toggleTreeExpand,
  } = props;

  const { draggedMasterSectionId } = useComponentTreePanelState();
  const { startSectionMasterDrag, endSectionMasterDrag, moveSectionByMaster } =
    useComponentTreePanelActions();
  const { state: pbState } = usePageBuilder();
  const allSections = pbState.sections ?? [];
  const [isInsideDropOver, setIsInsideDropOver] = React.useState(false);
  const drag = useDragStateExtract();
  const { startSectionDrag, endSectionDrag } = drag.actions;
  const { expandedIds, sectionActions, blockActions, selectNode, toggleExpand } = useTreeActions();

  const isExpanded = expandedIds.has(section.id);
  const isRowExpanded = isExpanded || isTreeExpanded;
  const isSelected = pbState.selectedNodeId === section.id;
  const isDragging = draggedMasterSectionId === section.id;
  const isHidden = isCmsSectionHidden(section.settings?.['isHidden']);
  const draggedSectionId = drag.section.id ?? draggedMasterSectionId;

  const resolveInsideDropSectionId = React.useCallback(
    (dataTransfer: DataTransfer): string | null => {
      const sectionDrag = readSectionDragData(dataTransfer, {
        id: draggedSectionId,
        type: drag.section.type,
        zone: drag.section.zone,
        index: drag.section.index,
      });
      const dragSectionId = sectionDrag.id;
      if (!dragSectionId || dragSectionId === section.id) return null;
      if (isDescendant(allSections, dragSectionId, section.id)) return null;

      const dragSection = allSections.find((candidate) => candidate.id === dragSectionId);
      if (dragSection?.parentSectionId === section.id) return null;
      return dragSectionId;
    },
    [
      allSections,
      drag.section.index,
      drag.section.type,
      drag.section.zone,
      draggedSectionId,
      section.id,
    ]
  );

  const SectionIcon: LucideIcon = Box;
  const rootRows = section.blocks.filter((block) => block.type === 'Row');
  const hasRowBlocks = rootRows.length > 0;
  const showSectionLevelBlockPicker = section.type !== 'Grid' && !hasRowBlocks;
  const rowIndexById = new Map<string, number>();
  rootRows.forEach((row, index) => {
    rowIndexById.set(row.id, index);
  });
  const childSectionCount = allSections.filter(
    (candidate) => candidate.parentSectionId === section.id
  ).length;
  const hasBlockChildren = section.blocks.length > 0;
  const hasAnyChildren = hasBlockChildren || hasTreeChildren;

  const handleSectionDragStart = React.useCallback(
    (event: React.DragEvent): void => {
      const target = event.target as HTMLElement | null;
      const isInteractiveTarget =
        target?.closest(
          'button,a,input,textarea,select,[role="button"],[data-no-section-drag="true"]'
        ) !== null;
      const isDragHandle = target?.closest('[data-cms-section-drag-handle="true"]') !== null;
      if (isInteractiveTarget && !isDragHandle) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      setSectionDragData(event.dataTransfer, {
        id: section.id,
        type: section.type,
        zone: section.zone,
        index: sectionIndex,
      });
      setMasterTreeDragNodeData(event.dataTransfer, toCmsSectionNodeId(section.id), section.id);
      // Defer state updates to avoid cancelling the browser drag session.
      setTimeout(() => {
        startSectionDrag({
          id: section.id,
          type: section.type,
          zone: section.zone,
          index: sectionIndex,
        });
        startSectionMasterDrag(section.id);
      }, 0);
    },
    [section.id, section.type, section.zone, sectionIndex, startSectionDrag, startSectionMasterDrag]
  );

  const handleSectionDragEnd = React.useCallback((): void => {
    endSectionDrag();
    setIsInsideDropOver(false);
    endSectionMasterDrag();
  }, [endSectionDrag, endSectionMasterDrag]);

  const handleToggleExpand = React.useCallback((): void => {
    const nextOpen = !isRowExpanded;
    if (isExpanded !== nextOpen) {
      toggleExpand(section.id);
    }
    if (toggleTreeExpand && isTreeExpanded !== nextOpen) {
      toggleTreeExpand();
    }
  }, [isExpanded, isRowExpanded, isTreeExpanded, section.id, toggleExpand, toggleTreeExpand]);

  const handleSectionRowDragOver = React.useCallback(
    (event: React.DragEvent): void => {
      const dragSectionId = resolveInsideDropSectionId(event.dataTransfer);
      if (!dragSectionId) return;
      event.preventDefault();
      event.stopPropagation();
      setIsInsideDropOver(true);
    },
    [resolveInsideDropSectionId]
  );

  const handleSectionRowDragLeave = React.useCallback((event: React.DragEvent): void => {
    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
    setIsInsideDropOver(false);
  }, []);

  const handleSectionRowDrop = React.useCallback(
    (event: React.DragEvent): void => {
      event.preventDefault();
      event.stopPropagation();

      const dragSectionId = resolveInsideDropSectionId(event.dataTransfer);
      if (!dragSectionId) {
        setIsInsideDropOver(false);
        return;
      }

      setIsInsideDropOver(false);

      void moveSectionByMaster(dragSectionId, section.zone, childSectionCount, section.id).finally(() => {
        endSectionDrag();
      });
    },
    [
      childSectionCount,
      endSectionDrag,
      moveSectionByMaster,
      resolveInsideDropSectionId,
      section.id,
      section.zone,
    ]
  );

  return (
    <TreeSectionProvider sectionId={section.id}>
      <div
        className={cn(
          'group mb-1 flex flex-col transition-all',
          isDragging ? 'opacity-40 grayscale' : 'opacity-100'
        )}
      >
        <div
          data-cms-section-row='true'
          data-cms-section-id={section.id}
          data-cms-section-zone={section.zone}
          draggable
          className={cn(
            'flex items-center gap-2 rounded-md border py-1.5 pl-1 pr-2 transition',
            isInsideDropOver ? 'border-emerald-500/60 bg-emerald-500/10' : '',
            isSelected
              ? 'border-blue-500/50 bg-blue-500/10'
              : 'border-border/40 bg-card/20 hover:border-border/80 hover:bg-card/40'
          )}
          onClick={(e: React.MouseEvent): void => {
            e.stopPropagation();
            selectNode(section.id);
          }}
          onDragStart={handleSectionDragStart}
          onDragEnd={handleSectionDragEnd}
          onDragOver={handleSectionRowDragOver}
          onDragLeave={handleSectionRowDragLeave}
          onDrop={handleSectionRowDrop}
        >
          <TreeCaret
            isOpen={isRowExpanded}
            hasChildren={hasAnyChildren}
            ariaLabel={isRowExpanded ? `Collapse ${section.type}` : `Expand ${section.type}`}
            onToggle={(event?: React.MouseEvent | React.KeyboardEvent): void => {
              event?.stopPropagation?.();
              handleToggleExpand();
            }}
            iconClassName='size-3'
            placeholderClassName='block size-3 shrink-0'
          />
          <div
            data-cms-section-drag-handle='true'
            className='flex h-7 w-5 cursor-grab items-center justify-center text-gray-600 hover:text-gray-400 active:cursor-grabbing'
          >
            <GripVertical className='size-3.5' />
          </div>

          <div className='flex min-w-0 flex-1 items-center gap-2'>
            <SectionIcon
              className={cn('size-4 shrink-0', isHidden ? 'text-gray-600' : 'text-sky-400/80')}
            />
            <span
              className={cn(
                'truncate text-sm font-medium',
                isHidden ? 'text-gray-500 line-through' : 'text-gray-200'
              )}
            >
              {section.type}
            </span>
            {isHidden && (
              <Badge
                variant='neutral'
                className='bg-gray-800/50 text-[9px] uppercase tracking-wider text-gray-500 h-4 px-1'
              >
                Hidden
              </Badge>
            )}
          </div>

          <div className='flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100'>
            <Button
              variant='ghost'
              size='sm'
              onClick={(e: React.MouseEvent): void => {
                e.stopPropagation();
                sectionActions.toggleVisibility(section.id, !isHidden);
              }}
              data-no-section-drag='true'
              className='size-7 p-0 text-gray-500 hover:text-gray-200'
              title={isHidden ? 'Show section' : 'Hide section'}
            >
              {isHidden ? <EyeOff className='size-3.5' /> : <Eye className='size-3.5' />}
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={(e: React.MouseEvent): void => {
                e.stopPropagation();
                sectionActions.remove(section.id);
              }}
              data-no-section-drag='true'
              className='size-7 p-0 text-gray-500 hover:bg-red-500/10 hover:text-red-400'
              title='Delete section'
            >
              <Trash2 className='size-3.5' />
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={(e: React.MouseEvent): void => {
                e.stopPropagation();
                sectionActions.duplicate(section.id);
              }}
              data-no-section-drag='true'
              className='size-7 p-0 text-gray-500 hover:text-gray-200'
              title='Duplicate section'
            >
              <Plus className='size-3.5' />
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className='ml-4 mt-1 border-l-2 border-border/20 pl-2'>
            <div className='space-y-1'>
              {section.blocks.map((block, idx) => {
                if (block.type === 'Row') {
                  const rowIndex = rowIndexById.get(block.id) ?? idx;
                  return (
                    <RowNodeItem
                      key={block.id}
                      row={block}
                      rowIndex={rowIndex}
                      rowCount={rootRows.length}
                    />
                  );
                }
                if (block.type === 'SlideshowFrame') {
                  return <SlideshowFrameNodeItem key={block.id} frame={block} index={idx} />;
                }
                if (Array.isArray(block.blocks)) {
                  return <SectionBlockNodeItem key={block.id} block={block} index={idx} />;
                }
                return <BlockNodeItem key={block.id} block={block} index={idx} />;
              })}
            </div>
            {showSectionLevelBlockPicker ? (
              <div className='mt-2'>
                <TreeSectionPicker
                  disabled={false}
                  variant='blocks'
                  sectionType={section.type}
                  onSelect={(blockType: string) => blockActions.add(section.id, blockType)}
                />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </TreeSectionProvider>
  );
}
