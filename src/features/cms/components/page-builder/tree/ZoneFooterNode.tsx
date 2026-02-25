'use client';

import React, { useState } from 'react';
import type { PageZone } from '@/shared/contracts/cms';
import { useComponentTreePanelContext } from './ComponentTreePanelContext';
import { useDragState } from '../../../hooks/useDragStateContext';
import { useTreeActions } from '../../../hooks/useTreeActionsContext';
import { SectionPicker } from '../SectionPicker';
import { SectionDropTarget } from './SectionDropTarget';

interface ZoneFooterNodeProps {
  zone: PageZone;
  sectionCount: number;
}

export function ZoneFooterNode({
  zone,
  sectionCount,
}: ZoneFooterNodeProps): React.ReactNode {
  const {
    currentPage,
    clipboard,
    canDropSectionsAtRoot,
    treePlaceholderClasses,
    treeRootDropLabel,
    draggedMasterSectionId,
    moveSectionByMaster,
  } = useComponentTreePanelContext();
  const [isZoneDragOver, setIsZoneDragOver] = useState(false);
  const { state: dragState, endSectionDrag } = useDragState();
  const { sectionActions } = useTreeActions();

  const draggedSectionId = dragState.section.id ?? draggedMasterSectionId;
  const hasSections = sectionCount > 0;

  return (
    <>
      {hasSections ? (
        <SectionDropTarget zone={zone} toIndex={sectionCount} />
      ) : (
        <div
          onDragOver={(event: React.DragEvent<HTMLDivElement>): void => {
            if (!draggedSectionId) return;
            if (!canDropSectionsAtRoot) return;
            event.preventDefault();
            event.stopPropagation();
            setIsZoneDragOver(true);
          }}
          onDragLeave={(): void => {
            setIsZoneDragOver(false);
          }}
          onDrop={(event: React.DragEvent<HTMLDivElement>): void => {
            event.preventDefault();
            event.stopPropagation();
            setIsZoneDragOver(false);
            if (!draggedSectionId) return;
            if (!canDropSectionsAtRoot) return;
            void moveSectionByMaster(draggedSectionId, zone, 0).finally(() => {
              endSectionDrag();
            });
          }}
          className={`rounded border border-dashed px-3 py-3 text-center text-xs transition ${
            isZoneDragOver
              ? treePlaceholderClasses.rootActive
              : treePlaceholderClasses.rootIdle
          }`}
        >
          {isZoneDragOver ? treeRootDropLabel : 'No sections'}
        </div>
      )}

      <div className='mt-2 flex flex-wrap items-center gap-1'>
        {clipboard?.type === 'section' ? (
          <button
            type='button'
            onClick={(): void => sectionActions.paste(zone)}
            className='rounded px-1.5 py-0.5 text-[10px] text-gray-400 transition hover:bg-foreground/10 hover:text-gray-200'
            title='Paste section'
          >
            Paste
          </button>
        ) : null}
        <SectionPicker
          disabled={!currentPage}
          zone={zone}
          onSelect={(sectionType: string): void => sectionActions.add(sectionType, zone)}
        />
      </div>
    </>
  );
}
