'use client';

import { useCallback, type Dispatch } from 'react';

import type { PageBuilderAction } from '@/shared/contracts/cms';

import type { TreeActionsActionsContextValue } from './useTreeActionsContext.types';
import type { PageZone, SectionInstance } from '../types/page-builder';

export function useTreeSectionActions({
  dispatch,
  autoExpand,
  sections,
}: {
  dispatch: Dispatch<PageBuilderAction>;
  autoExpand: TreeActionsActionsContextValue['autoExpand'];
  sections: SectionInstance[];
}) {
  const addSection = useCallback(
    (sectionType: string, zone: PageZone) => {
      dispatch({ type: 'ADD_SECTION', sectionType, zone });
    },
    [dispatch]
  );

  const removeSection = useCallback(
    (sectionId: string) => {
      dispatch({ type: 'REMOVE_SECTION', sectionId });
    },
    [dispatch]
  );

  const duplicateSection = useCallback(
    (sectionId: string) => {
      dispatch({ type: 'DUPLICATE_SECTION', sectionId });
    },
    [dispatch]
  );

  const toggleSectionVisibility = useCallback(
    (sectionId: string, isHidden: boolean) => {
      dispatch({ type: 'UPDATE_SECTION_SETTINGS', sectionId, settings: { isHidden } });
    },
    [dispatch]
  );

  const dropSectionInZone = useCallback(
    (droppedSectionId: string, zone: PageZone, toIndex: number) => {
      const section = sections.find((item: SectionInstance) => item.id === droppedSectionId);
      if (!section) {
        return;
      }

      if (section.zone === zone) {
        const zoneSections = sections.filter((item: SectionInstance) => item.zone === zone);
        const fromIndex = zoneSections.findIndex(
          (item: SectionInstance) => item.id === droppedSectionId
        );
        if (fromIndex === -1 || fromIndex === toIndex) {
          return;
        }

        dispatch({ type: 'REORDER_SECTIONS', zone, fromIndex, toIndex });
      } else {
        dispatch({
          type: 'MOVE_SECTION_TO_ZONE',
          sectionId: droppedSectionId,
          toZone: zone,
          toIndex,
        });
      }
    },
    [dispatch, sections]
  );

  const dropSectionToColumn = useCallback(
    (
      sectionId: string,
      toSectionId: string,
      toColumnId: string,
      toIndex: number,
      toParentBlockId?: string
    ) => {
      dispatch({
        type: 'MOVE_SECTION_TO_COLUMN',
        sectionId,
        toSectionId,
        toColumnId,
        ...(toParentBlockId && { toParentBlockId }),
        toIndex,
      });
      autoExpand(toSectionId, toColumnId, toParentBlockId);
    },
    [dispatch, autoExpand]
  );

  const dropSectionToSlideshowFrame = useCallback(
    (sectionId: string, toSectionId: string, toFrameId: string, toIndex: number) => {
      dispatch({
        type: 'MOVE_SECTION_TO_SLIDESHOW_FRAME',
        sectionId,
        toSectionId,
        toFrameId,
        toIndex,
      });
      autoExpand(toSectionId, toFrameId);
    },
    [dispatch, autoExpand]
  );

  const convertSectionToBlock = useCallback(
    (sectionId: string, toSectionId: string, toIndex: number) => {
      dispatch({ type: 'CONVERT_SECTION_TO_BLOCK', sectionId, toSectionId, toIndex });
      autoExpand(toSectionId);
    },
    [dispatch, autoExpand]
  );

  const promoteBlockToSection = useCallback(
    (
      blockId: string,
      fromSectionId: string,
      fromColumnId: string | undefined,
      fromParentBlockId: string | undefined,
      toZone: PageZone,
      toIndex: number
    ) => {
      dispatch({
        type: 'CONVERT_BLOCK_TO_SECTION',
        blockId,
        fromSectionId,
        ...(fromColumnId && { fromColumnId }),
        ...(fromParentBlockId && { fromParentBlockId }),
        toZone,
        toIndex,
      });
    },
    [dispatch]
  );

  const pasteSection = useCallback(
    (zone: PageZone) => {
      dispatch({ type: 'PASTE_SECTION', zone });
    },
    [dispatch]
  );

  return {
    addSection,
    removeSection,
    duplicateSection,
    toggleSectionVisibility,
    dropSectionInZone,
    dropSectionToColumn,
    dropSectionToSlideshowFrame,
    convertSectionToBlock,
    promoteBlockToSection,
    pasteSection,
  };
}
