'use client';

import React, { useState } from 'react';
import type { PageZone } from '@/shared/contracts/cms';
import { useComponentTreePanelContext } from './ComponentTreePanelContext';
import { useDragState } from '../../../hooks/useDragStateContext';
import { SectionPicker } from './SectionPicker';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { useTreeActions } from '../../../hooks/useTreeActionsContext';

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
    moveSectionByMaster,
  } = useComponentTreePanelContext();
  const { sectionActions } = useTreeActions();
  const { activeDrag } = useDragState();
  const [isDropTarget, setIsDropTarget] = useState(false);

  const canDropHere = activeDrag?.type === 'section' && canDropSectionsAtRoot;

  return (
    <>
      {showSectionDropPlaceholder && canDropHere && (
        <div
          onDragOver={(e: React.DragEvent): void => {
            e.preventDefault();
            setIsDropTarget(true);
          }}
          onDragLeave={(): void => setIsDropTarget(false)}
          onDrop={(e: React.DragEvent): void => {
            e.preventDefault();
            setIsDropTarget(false);
            if (activeDrag?.type === 'section') {
              void moveSectionByMaster(activeDrag.id, zone, sectionCount);
            }
          }}
          className={cn(
            treePlaceholderClasses.rootDrop,
            isDropTarget ? treePlaceholderClasses.rootDropActive : treePlaceholderClasses.rootDropIdle
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
        <SectionPicker
          disabled={!currentPage}
          zone={zone}
          onSelect={(sectionType: string): void => sectionActions.add(sectionType, zone)}
        />
      </div>
    </>
  );
}
