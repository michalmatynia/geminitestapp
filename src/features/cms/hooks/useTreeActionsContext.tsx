'use client';

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react';

import { useAutoExpand } from './useAutoExpand';
import { usePageBuilder } from './usePageBuilderContext';

import type { PageZone, SectionInstance } from '../types/page-builder';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TreeActionsContextValue {
  // UI State
  expandedIds: Set<string>;

  // Selection & Expansion
  selectNode: (nodeId: string) => void;
  toggleExpand: (nodeId: string) => void;
  autoExpand: (...nodeIds: (string | string[] | null | undefined)[]) => void;

  // Block Operations
  blockActions: {
    add: (sectionId: string, blockType: string) => void;
    addToColumn: (sectionId: string, columnId: string, blockType: string) => void;
    addElementToNestedBlock: (
      sectionId: string,
      columnId: string,
      parentBlockId: string,
      elementType: string
    ) => void;
    addElementToSectionBlock: (
      sectionId: string,
      parentBlockId: string,
      elementType: string
    ) => void;
    drop: (blockId: string, fromSectionId: string, toSectionId: string, toIndex: number) => void;
    dropToColumn: (
      blockId: string,
      fromSectionId: string,
      fromColumnId: string | undefined,
      toSectionId: string,
      toColumnId: string,
      toIndex: number,
      fromParentBlockId?: string,
      toParentBlockId?: string
    ) => void;
    dropToSection: (
      blockId: string,
      fromSectionId: string,
      fromColumnId: string | undefined,
      toSectionId: string,
      toIndex: number,
      fromParentBlockId?: string
    ) => void;
    dropToRow: (
      blockId: string,
      fromSectionId: string,
      fromColumnId: string | undefined,
      toSectionId: string,
      toRowId: string,
      toIndex: number,
      fromParentBlockId?: string
    ) => void;
    dropToSlideshowFrame: (
      blockId: string,
      fromSectionId: string,
      fromColumnId: string | undefined,
      fromParentBlockId: string | undefined,
      toSectionId: string,
      toFrameId: string,
      toIndex: number
    ) => void;
    remove: (sectionId: string, blockId: string, columnId?: string, parentBlockId?: string) => void;
  };

  // Section Operations
  sectionActions: {
    add: (sectionType: string, zone: PageZone) => void;
    remove: (sectionId: string) => void;
    toggleVisibility: (sectionId: string, isHidden: boolean) => void;
    dropInZone: (sectionId: string, zone: PageZone, toIndex: number) => void;
    dropToColumn: (
      sectionId: string,
      toSectionId: string,
      toColumnId: string,
      toIndex: number,
      toParentBlockId?: string
    ) => void;
    dropToSlideshowFrame: (
      sectionId: string,
      toSectionId: string,
      toFrameId: string,
      toIndex: number
    ) => void;
    convertToBlock: (sectionId: string, toSectionId: string, toIndex: number) => void;
    promoteBlockToSection: (
      blockId: string,
      fromSectionId: string,
      fromColumnId: string | undefined,
      fromParentBlockId: string | undefined,
      toZone: PageZone,
      toIndex: number
    ) => void;
    paste: (zone: PageZone) => void;
  };

  // Grid Operations
  gridActions: {
    addRow: (sectionId: string) => void;
    removeRow: (sectionId: string, rowId: string) => void;
    addColumn: (sectionId: string, rowId: string) => void;
    removeColumn: (sectionId: string, columnId: string, rowId?: string) => void;
  };
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const TreeActionsContext = createContext<TreeActionsContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface TreeActionsProviderProps {
  children: ReactNode;
  expandedIds: Set<string>;
  setExpandedIds: Dispatch<SetStateAction<Set<string>>>;
}

export function TreeActionsProvider({
  children,
  expandedIds,
  setExpandedIds,
}: TreeActionsProviderProps) {
  const { state, dispatch } = usePageBuilder();
  const { autoExpand, toggleExpand } = useAutoExpand(setExpandedIds);

  // ---------------------------------------------------------------------------
  // Selection
  // ---------------------------------------------------------------------------

  const selectNode = useCallback(
    (nodeId: string) => {
      dispatch({ type: 'SELECT_NODE', nodeId });
    },
    [dispatch]
  );

  // ---------------------------------------------------------------------------
  // Block Operations
  // ---------------------------------------------------------------------------

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
      fromParentBlockId?: string
    ) => {
      dispatch({
        type: 'MOVE_BLOCK_TO_SECTION',
        blockId,
        fromSectionId,
        ...(fromColumnId && { fromColumnId }),
        ...(fromParentBlockId && { fromParentBlockId }),
        toSectionId,
        toIndex,
      });
      autoExpand(toSectionId);
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
      fromParentBlockId?: string
    ) => {
      dispatch({
        type: 'MOVE_BLOCK_TO_ROW',
        blockId,
        fromSectionId,
        ...(fromColumnId && { fromColumnId }),
        ...(fromParentBlockId && { fromParentBlockId }),
        toSectionId,
        toRowId,
        toIndex,
      });
      autoExpand(toSectionId, toRowId);
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

  // ---------------------------------------------------------------------------
  // Section Operations
  // ---------------------------------------------------------------------------

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

  const toggleSectionVisibility = useCallback(
    (sectionId: string, isHidden: boolean) => {
      dispatch({ type: 'UPDATE_SECTION_SETTINGS', sectionId, settings: { isHidden } });
    },
    [dispatch]
  );

  const dropSectionInZone = useCallback(
    (droppedSectionId: string, zone: PageZone, toIndex: number) => {
      const section = state.sections.find((s: SectionInstance) => s.id === droppedSectionId);
      if (!section) return;
      if (section.zone === zone) {
        const zoneSections = state.sections.filter((s: SectionInstance) => s.zone === zone);
        const fromIndex = zoneSections.findIndex((s: SectionInstance) => s.id === droppedSectionId);
        if (fromIndex === -1 || fromIndex === toIndex) return;
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
    [state.sections, dispatch]
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

  // ---------------------------------------------------------------------------
  // Grid Operations
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Context Value
  // ---------------------------------------------------------------------------

  const blockActions = useMemo(
    () => ({
      add: addBlock,
      addToColumn: addBlockToColumn,
      addElementToNestedBlock,
      addElementToSectionBlock,
      drop: dropBlock,
      dropToColumn: dropBlockToColumn,
      dropToSection: dropBlockToSection,
      dropToRow: dropBlockToRow,
      dropToSlideshowFrame: dropBlockToSlideshowFrame,
      remove: removeBlock,
    }),
    [
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
    ]
  );

  const sectionActions = useMemo(
    () => ({
      add: addSection,
      remove: removeSection,
      toggleVisibility: toggleSectionVisibility,
      dropInZone: dropSectionInZone,
      dropToColumn: dropSectionToColumn,
      dropToSlideshowFrame: dropSectionToSlideshowFrame,
      convertToBlock: convertSectionToBlock,
      promoteBlockToSection,
      paste: pasteSection,
    }),
    [
      addSection,
      removeSection,
      toggleSectionVisibility,
      dropSectionInZone,
      dropSectionToColumn,
      dropSectionToSlideshowFrame,
      convertSectionToBlock,
      promoteBlockToSection,
      pasteSection,
    ]
  );

  const gridActions = useMemo(
    () => ({
      addRow: addGridRow,
      removeRow: removeGridRow,
      addColumn: addColumnToRow,
      removeColumn: removeColumnFromRow,
    }),
    [addGridRow, removeGridRow, addColumnToRow, removeColumnFromRow]
  );

  const value = useMemo<TreeActionsContextValue>(
    () => ({
      expandedIds,
      selectNode,
      toggleExpand,
      autoExpand,
      blockActions,
      sectionActions,
      gridActions,
    }),
    [expandedIds, selectNode, toggleExpand, autoExpand, blockActions, sectionActions, gridActions]
  );

  return <TreeActionsContext.Provider value={value}>{children}</TreeActionsContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTreeActions(): TreeActionsContextValue {
  const context = useContext(TreeActionsContext);
  if (!context) {
    throw new Error('useTreeActions must be used within a TreeActionsProvider');
  }
  return context;
}
