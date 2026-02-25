/* eslint-disable */
// @ts-nocheck
'use client';

import React, { useState } from 'react';
import type { PageZone } from '@/shared/contracts/cms';
import { cn } from '@/shared/utils';
import { useComponentTreePanelContext } from './ComponentTreePanelContext';
import { useDragState } from '../../../hooks/useDragStateContext';
import { useTreeActions } from '../../../hooks/useTreeActionsContext';
import { readSectionDragData } from '../../../utils/page-builder-dnd';
import { isCmsSectionSamePositionDrop } from '../utils/cms-tree-external-drop';

const PROMOTABLE_BLOCK_TYPES = [
  'ImageElement',
  'TextElement',
  'ButtonElement',
  'Block',
  'TextAtom',
  'Model3DElement',
  'Slideshow',
];

interface SectionDropTargetProps {
  zone: PageZone;
  toIndex: number;
}

export function SectionDropTarget({
  zone,
  toIndex,
}: SectionDropTargetProps): React.ReactNode {
  const {
    showExtractPlaceholder,
    showSectionDropPlaceholder,
    canDropSectionsAtRoot,
    canDropBlocksAtRoot,
    treePlaceholderClasses,
    treeInlineDropLabel,
    draggedMasterSectionId,
    moveSectionByMaster,
  } = useComponentTreePanelContext();
  const [isOver, setIsOver] = useState(false);
  const { state: dragState, endBlockDrag, endSectionDrag } = useDragState();
  const { sectionActions } = useTreeActions();

  const draggedBlockId = dragState.block.id;
  const draggedBlockType = dragState.block.type;
  const draggedFromSectionId = dragState.block.fromSectionId;
  const draggedFromColumnId = dragState.block.fromColumnId;
  const draggedFromParentBlockId = dragState.block.fromParentBlockId;
  const draggedSectionId = dragState.section.id ?? draggedMasterSectionId;
  const draggedSectionZone = dragState.section.zone;
  const draggedSectionIndex = dragState.section.index;

  const isDraggingBlock = Boolean(draggedBlockId);
  const isDraggingSection = showSectionDropPlaceholder && canDropSectionsAtRoot && Boolean(draggedSectionId);
  const canPromoteBlock =
    showExtractPlaceholder &&
    canDropBlocksAtRoot &&
    isDraggingBlock &&
    PROMOTABLE_BLOCK_TYPES.includes(draggedBlockType ?? '');
  const isDragging = isDraggingSection || canPromoteBlock;

  if (!isDragging) return null;

  return (
    <div
      onDragOver={(event: React.DragEvent<HTMLDivElement>): void => {
        if (isDraggingSection) {
          const sectionDrag = readSectionDragData(event.dataTransfer, {
            id: draggedSectionId,
            zone: draggedSectionZone,
            index: draggedSectionIndex,
          });
          const dragSectionId = sectionDrag.id;
          if (!dragSectionId) return;
          const dragZone = (sectionDrag.zone as PageZone | null) ?? null;
          const dragIndex = sectionDrag.index;
          const isSamePosition = isCmsSectionSamePositionDrop({
            draggedZone: dragZone,
            draggedIndex: dragIndex,
            targetZone: zone,
            targetIndex: toIndex,
          });
          if (isSamePosition) return;
        }
        event.preventDefault();
        event.stopPropagation();
        setIsOver(true);
      }}
      onDragLeave={(event: React.DragEvent<HTMLDivElement>): void => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) return;
        setIsOver(false);
      }}
      onDrop={(event: React.DragEvent<HTMLDivElement>): void => {
        event.preventDefault();
        event.stopPropagation();
        setIsOver(false);

        if (isDraggingSection) {
          const sectionDrag = readSectionDragData(event.dataTransfer, {
            id: draggedSectionId,
            zone: draggedSectionZone,
            index: draggedSectionIndex,
          });
          const dragSectionId = sectionDrag.id;
          if (!dragSectionId) return;
          const dragZone = (sectionDrag.zone as PageZone | null) ?? null;
          const dragIndex = sectionDrag.index;
          const isSamePosition = isCmsSectionSamePositionDrop({
            draggedZone: dragZone,
            draggedIndex: dragIndex,
            targetZone: zone,
            targetIndex: toIndex,
          });
          if (isSamePosition) return;
          void moveSectionByMaster(dragSectionId, zone, toIndex).finally(() => {
            endSectionDrag();
          });
          return;
        }

        if (canPromoteBlock && draggedBlockId && draggedFromSectionId) {
          sectionActions.promoteBlockToSection(
            draggedBlockId,
            draggedFromSectionId,
            draggedFromColumnId ?? undefined,
            draggedFromParentBlockId ?? undefined,
            zone,
            toIndex
          );
          endBlockDrag();
        }
      }}
      className={`relative z-10 overflow-hidden transition-[height] ${
        isDragging ? 'h-8' : 'h-0'
      }`}
    >
      <div
        className={`absolute inset-x-1 top-1/2 flex -translate-y-1/2 items-center justify-center rounded border-2 border-dashed transition ${
          isOver
            ? canPromoteBlock
              ? 'border-emerald-500 bg-emerald-600/40 h-6'
              : `${treePlaceholderClasses.rootActive} h-6`
            : canPromoteBlock
              ? 'border-emerald-500/50 bg-emerald-600/20 h-5'
              : `${treePlaceholderClasses.rootIdle} h-5`
        }`}
      >
        {canPromoteBlock ? (
          <span className={`text-[9px] font-medium ${isOver ? 'text-emerald-200' : 'text-emerald-400'}`}>
            {isOver ? 'Release to extract' : 'Drop here to extract'}
          </span>
        ) : null}
        {isDraggingSection && !canPromoteBlock ? (
          <span
            className={cn(
              'text-[9px] font-medium',
              isOver ? treePlaceholderClasses.badgeActive : treePlaceholderClasses.badgeIdle
            )}
          >
            {isOver ? 'Release to move' : treeInlineDropLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
