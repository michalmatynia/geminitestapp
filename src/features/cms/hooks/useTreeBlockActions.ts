'use client';

import { useCallback, type Dispatch } from 'react';

import type { PageBuilderAction } from '@/shared/contracts/cms';

import type { TreeActionsActionsContextValue } from './useTreeActionsContext.types';

export function useTreeBlockActions({
  dispatch,
  autoExpand,
}: {
  dispatch: Dispatch<PageBuilderAction>;
  autoExpand: TreeActionsActionsContextValue['autoExpand'];
}) {
  const addBlock = useCallback(
    (sectionId: string, blockType: string) => {
      dispatch({ type: 'ADD_BLOCK', sectionId, blockType });
      autoExpand(sectionId);
    },
    [dispatch, autoExpand]
  );

  const addBlockToColumn = useCallback(
    (sectionId: string, columnId: string, blockType: string) => {
      dispatch({ type: 'ADD_BLOCK_TO_COLUMN', sectionId, columnId, blockType });
      autoExpand(sectionId, columnId);
    },
    [dispatch, autoExpand]
  );

  const addElementToNestedBlock = useCallback(
    (sectionId: string, columnId: string, parentBlockId: string, elementType: string) => {
      dispatch({
        type: 'ADD_ELEMENT_TO_NESTED_BLOCK',
        sectionId,
        columnId,
        parentBlockId,
        elementType,
      });
      autoExpand(sectionId, columnId, parentBlockId);
    },
    [dispatch, autoExpand]
  );

  const addElementToSectionBlock = useCallback(
    (sectionId: string, parentBlockId: string, elementType: string) => {
      dispatch({ type: 'ADD_ELEMENT_TO_SECTION_BLOCK', sectionId, parentBlockId, elementType });
      autoExpand(sectionId, parentBlockId);
    },
    [dispatch, autoExpand]
  );

  const dropBlock = useCallback(
    (blockId: string, fromSectionId: string, toSectionId: string, toIndex: number) => {
      dispatch({
        type: 'MOVE_BLOCK',
        blockId,
        fromSectionId,
        toSectionId,
        toIndex,
      });
      autoExpand(toSectionId);
    },
    [dispatch, autoExpand]
  );

  const dropBlockToColumn = useCallback(
    (
      blockId: string,
      fromSectionId: string,
      fromColumnId: string | undefined,
      toSectionId: string,
      toColumnId: string,
      toIndex: number,
      fromParentBlockId?: string,
      toParentBlockId?: string
    ) => {
      dispatch({
        type: 'MOVE_BLOCK_TO_COLUMN',
        blockId,
        fromSectionId,
        ...(fromColumnId && { fromColumnId }),
        ...(fromParentBlockId && { fromParentBlockId }),
        toSectionId,
        toColumnId,
        ...(toParentBlockId && { toParentBlockId }),
        toIndex,
      });
      autoExpand(toSectionId, toColumnId, toParentBlockId);
    },
    [dispatch, autoExpand]
  );

  const dropBlockToSection = useCallback(
    (
      blockId: string,
      fromSectionId: string,
      fromColumnId: string | undefined,
      toSectionId: string,
      toIndex: number,
      fromParentBlockId?: string,
      toParentBlockId?: string
    ) => {
      dispatch({
        type: 'MOVE_BLOCK_TO_SECTION',
        blockId,
        fromSectionId,
        ...(fromColumnId && { fromColumnId }),
        ...(fromParentBlockId && { fromParentBlockId }),
        toSectionId,
        ...(toParentBlockId && { toParentBlockId }),
        toIndex,
      });
      autoExpand(toSectionId, toParentBlockId);
    },
    [dispatch, autoExpand]
  );

  const dropBlockToRow = useCallback(
    (
      blockId: string,
      fromSectionId: string,
      fromColumnId: string | undefined,
      toSectionId: string,
      toRowId: string,
      toIndex: number,
      fromParentBlockId?: string,
      toParentBlockId?: string
    ) => {
      dispatch({
        type: 'MOVE_BLOCK_TO_ROW',
        blockId,
        fromSectionId,
        ...(fromColumnId && { fromColumnId }),
        ...(fromParentBlockId && { fromParentBlockId }),
        toSectionId,
        toRowId,
        ...(toParentBlockId && { toParentBlockId }),
        toIndex,
      });
      autoExpand(toSectionId, toRowId, toParentBlockId);
    },
    [dispatch, autoExpand]
  );

  const dropBlockToSlideshowFrame = useCallback(
    (
      blockId: string,
      fromSectionId: string,
      fromColumnId: string | undefined,
      fromParentBlockId: string | undefined,
      toSectionId: string,
      toFrameId: string,
      toIndex: number
    ) => {
      dispatch({
        type: 'MOVE_BLOCK_TO_SLIDESHOW_FRAME',
        blockId,
        fromSectionId,
        ...(fromColumnId && { fromColumnId }),
        ...(fromParentBlockId && { fromParentBlockId }),
        toSectionId,
        toFrameId,
        toIndex,
      });
      autoExpand(toSectionId, toFrameId);
    },
    [dispatch, autoExpand]
  );

  const removeBlock = useCallback(
    (sectionId: string, blockId: string, columnId?: string, parentBlockId?: string) => {
      if (parentBlockId && columnId) {
        dispatch({
          type: 'REMOVE_ELEMENT_FROM_NESTED_BLOCK',
          sectionId,
          columnId,
          parentBlockId,
          elementId: blockId,
        });
      } else if (parentBlockId) {
        dispatch({
          type: 'REMOVE_ELEMENT_FROM_SECTION_BLOCK',
          sectionId,
          parentBlockId,
          elementId: blockId,
        });
      } else if (columnId) {
        dispatch({
          type: 'REMOVE_BLOCK_FROM_COLUMN',
          sectionId,
          columnId,
          blockId,
        });
      } else {
        dispatch({
          type: 'REMOVE_BLOCK',
          sectionId,
          blockId,
        });
      }
    },
    [dispatch]
  );

  return {
    addBlock,
    addBlockToColumn,
    addElementToNestedBlock,
    addElementToSectionBlock,
    dropBlock,
    dropBlockToColumn,
    dropBlockToSection,
    dropBlockToRow,
    dropBlockToSlideshowFrame,
    removeBlock,
  };
}
