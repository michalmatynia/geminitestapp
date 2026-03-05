'use client';

import React, { useState } from 'react';
import type { PageZone } from '@/shared/contracts/cms';
import {
  useComponentTreePanelActions,
  useComponentTreePanelState,
} from './ComponentTreePanelContext';
import { useDragState } from '../../../hooks/useDragStateContext';
import { useTreeActions } from '../../../hooks/useTreeActionsContext';
import { usePageBuilder } from '../../../hooks/usePageBuilderContext';
import { readSectionDragData } from '@/features/cms/utils/page-builder-dnd';
import { isCmsSectionSamePositionDrop } from '@/features/cms/components/page-builder/utils/cms-tree-external-drop';

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
  toParentSectionId?: string | null;
  toIndex: number;
}

export function SectionDropTarget({
  zone,
  toParentSectionId = null,
  toIndex,
}: SectionDropTargetProps): React.ReactNode {
  const {
    showExtractPlaceholder,
    showSectionDropPlaceholder,
    canDropSectionsAtRoot,
    canDropBlocksAtRoot,
    treePlaceholderClasses,
    draggedMasterSectionId,
  } = useComponentTreePanelState();
  const { moveSectionByMaster } = useComponentTreePanelActions();
  const [isOver, setIsOver] = useState(false);
  const { state: pbState } = usePageBuilder();
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
  const draggedSection = pbState.sections.find((section) => section.id === draggedSectionId);
  const draggedSectionParentId = draggedSection?.parentSectionId ?? null;
  const draggedSectionResolvedZone = draggedSectionZone ?? draggedSection?.zone ?? null;
  const draggedSectionResolvedIndex = React.useMemo((): number | null => {
    if (draggedSectionIndex !== null) return draggedSectionIndex;
    if (!draggedSectionId || !draggedSection) return null;
    const siblingSections = pbState.sections.filter(
      (section) =>
        section.zone === draggedSection.zone &&
        (section.parentSectionId ?? null) === draggedSectionParentId
    );
    const siblingIndex = siblingSections.findIndex((section) => section.id === draggedSectionId);
    return siblingIndex >= 0 ? siblingIndex : null;
  }, [
    draggedSection,
    draggedSectionId,
    draggedSectionIndex,
    draggedSectionParentId,
    pbState.sections,
  ]);

  const isDraggingBlock = Boolean(draggedBlockId);
  const isDraggingSection =
    showSectionDropPlaceholder && canDropSectionsAtRoot && Boolean(draggedSectionId);
  const canPromoteBlock =
    showExtractPlaceholder &&
    canDropBlocksAtRoot &&
    isDraggingBlock &&
    PROMOTABLE_BLOCK_TYPES.includes(draggedBlockType ?? '');
  const isDragging = isDraggingSection || canPromoteBlock;
  const isSameSectionPositionTarget =
    isDraggingSection &&
    draggedSectionParentId === toParentSectionId &&
    isCmsSectionSamePositionDrop({
      draggedZone: draggedSectionResolvedZone,
      draggedIndex: draggedSectionResolvedIndex,
      targetZone: zone,
      targetIndex: toIndex,
    });
  const shouldRenderSectionTarget = isDraggingSection && !isSameSectionPositionTarget;
  const shouldRenderTarget = canPromoteBlock || shouldRenderSectionTarget;

  if (!isDragging || !shouldRenderTarget) return null;

  return (
    <div
      data-cms-section-drop-target='sibling'
      data-cms-section-drop-zone={zone}
      data-cms-section-drop-parent={toParentSectionId ?? 'root'}
      data-cms-section-drop-index={String(toIndex)}
      onDragOver={(event: React.DragEvent<HTMLDivElement>): void => {
        if (shouldRenderSectionTarget) {
          const sectionDrag = readSectionDragData(event.dataTransfer, {
            id: draggedSectionId,
            zone: draggedSectionZone,
            index: draggedSectionIndex,
          });
          const dragSectionId = sectionDrag.id;
          if (!dragSectionId) return;
          const dragZone = (sectionDrag.zone) ?? null;
          const dragIndex = sectionDrag.index;
          const isSamePosition =
            draggedSectionParentId === toParentSectionId &&
            isCmsSectionSamePositionDrop({
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

        if (shouldRenderSectionTarget) {
          const sectionDrag = readSectionDragData(event.dataTransfer, {
            id: draggedSectionId,
            zone: draggedSectionZone,
            index: draggedSectionIndex,
          });
          const dragSectionId = sectionDrag.id;
          if (!dragSectionId) return;
          const dragZone = (sectionDrag.zone) ?? null;
          const dragIndex = sectionDrag.index;
          const isSamePosition =
            draggedSectionParentId === toParentSectionId &&
            isCmsSectionSamePositionDrop({
              draggedZone: dragZone,
              draggedIndex: dragIndex,
              targetZone: zone,
              targetIndex: toIndex,
            });
          if (isSamePosition) return;
          void moveSectionByMaster(dragSectionId, zone, toIndex, toParentSectionId).finally(() => {
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
      className={`relative z-10 overflow-hidden transition-[height] ${isDragging ? 'h-8' : 'h-0'}`}
    >
      <div
        className={`absolute inset-x-1 top-1/2 flex -translate-y-1/2 items-center justify-center rounded border-2 border-dashed transition ${
          isOver
            ? canPromoteBlock
              ? 'border-emerald-500 bg-emerald-600/40 h-6'
              : `${treePlaceholderClasses.rootActive} h-4`
            : canPromoteBlock
              ? 'border-emerald-500/50 bg-emerald-600/20 h-5'
              : `${treePlaceholderClasses.rootIdle} h-3`
        }`}
      >
        {canPromoteBlock ? (
          <span
            className={`text-[9px] font-medium ${isOver ? 'text-emerald-200' : 'text-emerald-400'}`}
          >
            {isOver ? 'Release to extract' : 'Drop here to extract'}
          </span>
        ) : null}
      </div>
    </div>
  );
}
