'use client';

import { useCallback, type Dispatch } from 'react';

import type { PageBuilderAction } from '@/shared/contracts/cms';

import type { TreeActionsActionsContextValue } from './useTreeActionsContext.types';

export function useTreeGridActions({
  dispatch,
  autoExpand,
}: {
  dispatch: Dispatch<PageBuilderAction>;
  autoExpand: TreeActionsActionsContextValue['autoExpand'];
}) {
  const addGridRow = useCallback(
    (sectionId: string) => {
      dispatch({ type: 'ADD_GRID_ROW', sectionId });
      autoExpand(sectionId);
    },
    [dispatch, autoExpand]
  );

  const removeGridRow = useCallback(
    (sectionId: string, rowId: string) => {
      dispatch({ type: 'REMOVE_GRID_ROW', sectionId, rowId });
    },
    [dispatch]
  );

  const addColumnToRow = useCallback(
    (sectionId: string, rowId: string) => {
      dispatch({ type: 'ADD_COLUMN_TO_ROW', sectionId, rowId });
      autoExpand(sectionId, rowId);
    },
    [dispatch, autoExpand]
  );

  const removeColumnFromRow = useCallback(
    (sectionId: string, columnId: string, rowId?: string) => {
      dispatch({
        type: 'REMOVE_COLUMN_FROM_ROW',
        sectionId,
        columnId,
        ...(rowId && { rowId }),
      });
    },
    [dispatch]
  );

  return {
    addGridRow,
    removeGridRow,
    addColumnToRow,
    removeColumnFromRow,
  };
}
