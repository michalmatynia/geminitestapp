'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';

import type { PageZone } from '@/shared/contracts/cms';
import type { BlockDragPayload } from '../types/drag-drop';
import { internalError } from '@/shared/errors/app-error';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BlockDragState = BlockDragPayload;

export interface SectionDragState {
  id: string | null;
  type: string | null;
  index: number | null;
  zone: PageZone | null;
}

export interface DragState {
  block: BlockDragState;
  section: SectionDragState;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type DragAction =
  | { type: 'START_BLOCK_DRAG'; payload: BlockDragState }
  | { type: 'END_BLOCK_DRAG' }
  | { type: 'START_SECTION_DRAG'; payload: SectionDragState }
  | { type: 'END_SECTION_DRAG' }
  | { type: 'CLEAR_ALL' };

// ---------------------------------------------------------------------------
// Initial State
// ---------------------------------------------------------------------------

const initialBlockDragState: BlockDragState = {
  id: null,
  type: null,
  fromSectionId: null,
  fromColumnId: null,
  fromParentBlockId: null,
};

const initialSectionDragState: SectionDragState = {
  id: null,
  type: null,
  index: null,
  zone: null,
};

const initialDragState: DragState = {
  block: initialBlockDragState,
  section: initialSectionDragState,
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function dragReducer(state: DragState, action: DragAction): DragState {
  switch (action.type) {
    case 'START_BLOCK_DRAG':
      return {
        ...state,
        block: action.payload,
      };
    case 'END_BLOCK_DRAG':
      return {
        ...state,
        block: initialBlockDragState,
      };
    case 'START_SECTION_DRAG':
      return {
        ...state,
        section: action.payload,
      };
    case 'END_SECTION_DRAG':
      return {
        ...state,
        section: initialSectionDragState,
      };
    case 'CLEAR_ALL':
      return initialDragState;
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface DragStateContextValue {
  state: DragState;
  dispatch: React.Dispatch<DragAction>;
}

const DragStateContext = createContext<DragStateContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface DragStateProviderProps {
  children: ReactNode;
}

export function DragStateProvider({ children }: DragStateProviderProps) {
  const [state, dispatch] = useReducer(dragReducer, initialDragState);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <DragStateContext.Provider value={value}>{children}</DragStateContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDragState() {
  const context = useContext(DragStateContext);
  if (!context) {
    throw internalError('useDragState must be used within a DragStateProvider');
  }

  const { state, dispatch } = context;

  const startBlockDrag = useCallback(
    (payload: BlockDragState) => {
      dispatch({ type: 'START_BLOCK_DRAG', payload });
    },
    [dispatch]
  );

  const endBlockDrag = useCallback(() => {
    dispatch({ type: 'END_BLOCK_DRAG' });
  }, [dispatch]);

  const startSectionDrag = useCallback(
    (payload: SectionDragState) => {
      dispatch({ type: 'START_SECTION_DRAG', payload });
    },
    [dispatch]
  );

  const endSectionDrag = useCallback(() => {
    dispatch({ type: 'END_SECTION_DRAG' });
  }, [dispatch]);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, [dispatch]);

  const isDraggingBlock = state.block.id !== null;
  const isDraggingSection = state.section.id !== null;

  return {
    state,
    isDraggingBlock,
    isDraggingSection,
    startBlockDrag,
    endBlockDrag,
    startSectionDrag,
    endSectionDrag,
    clearAll,
  };
}
