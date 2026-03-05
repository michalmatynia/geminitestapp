'use client';

import React, { useState } from 'react';
import type { PageZone } from '@/shared/contracts/cms';
import { useComponentTreePanelContext } from './ComponentTreePanelContext';
import { useDragState } from '../../../hooks/useDragStateContext';
import { TreeSectionPicker } from './TreeSectionPicker';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/utils';

export function ZoneFooterNode({
  zone,
  sectionCount,
}: {
  zone: PageZone;
  sectionCount: number;
}): React.JSX.Element {
  const {
    currentPage,
    showSectionDropPlaceholder,
    canDropSectionsAtRoot,
    treePlaceholderClasses,
    treeRootDropLabel,
    draggedMasterSectionId,
    moveSectionByMaster,
  } = useComponentTreePanelContext();
  const { state: dragState, endSectionDrag } = useDragState();
  const [isDropTarget, setIsDropTarget] = useState(false);

  const draggedSectionId = dragState.section.id ?? draggedMasterSectionId;
  const canDropHere =
    showSectionDropPlaceholder && canDropSectionsAtRoot && Boolean(draggedSectionId);

  return (
    <>
      {canDropHere && (
        <div
          onDragOver={(e: React.DragEvent): void => {
            e.preventDefault();
            setIsDropTarget(true);
          }}
          onDragLeave={(e: React.DragEvent): void => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            setIsDropTarget(false);
          }}
          onDrop={(e: React.DragEvent): void => {
            e.preventDefault();
            setIsDropTarget(false);
            if (!draggedSectionId) return;
            void moveSectionByMaster(draggedSectionId, zone, sectionCount).finally(() => {
              endSectionDrag();
            });
          }}
          className={cn(
            'mb-1.5 flex h-6 items-center justify-center rounded border-2 border-dashed text-[9px] font-medium transition',
            isDropTarget ? treePlaceholderClasses.rootActive : treePlaceholderClasses.rootIdle
          )}
        >
          {treeRootDropLabel}
        </div>
      )}
      <div className='flex items-center justify-center py-2'>
        {sectionCount === 0 ? (
          <Button
            variant='ghost'
            size='sm'
            className='text-[10px] uppercase tracking-wider text-gray-500 hover:text-gray-300 h-auto py-1 font-semibold'
            disabled
          >
            Empty Zone
          </Button>
        ) : null}
        <TreeSectionPicker
          disabled={!currentPage}
          zone={zone}
        />
      </div>
    </>
  );
}
