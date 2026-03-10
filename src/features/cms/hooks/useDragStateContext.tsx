'use client';

import { createContext, useContext, useReducer, useMemo, useCallback, type ReactNode } from 'react';

import type { PageZone } from '@/shared/contracts/cms';
import { internalError } from '@/shared/errors/app-error';

import type { BlockDragPayload } from '../types/drag-drop';

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

interface DragStateStateContextValue {
  state: DragState;
  isDraggingBlock: boolean;
  isDraggingSection: boolean;
}

interface DragStateActionsContextValue {
  startBlockDrag: (payload: BlockDragState) => void;
  endBlockDrag: () => void;
  startSectionDrag: (payload: SectionDragState) => void;
  endSectionDrag: () => void;
  clearAll: () => void;
}

const DragStateStateContext = createContext<DragStateStateContextValue | null>(null);
const DragStateActionsContext = createContext<DragStateActionsContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface DragStateProviderProps {
  children: ReactNode;
}

export function DragStateProvider({ children }: DragStateProviderProps) {
  const [state, dispatch] = useReducer(dragReducer, initialDragState);
  const isDraggingBlock = state.block.id !== null;
  const isDraggingSection = state.section.id !== null;

  const startBlockDrag = useCallback((payload: BlockDragState) => {
    dispatch({ type: 'START_BLOCK_DRAG', payload });
  }, []);
  const endBlockDrag = useCallback(() => {
    dispatch({ type: 'END_BLOCK_DRAG' });
  }, []);
  const startSectionDrag = useCallback((payload: SectionDragState) => {
    dispatch({ type: 'START_SECTION_DRAG', payload });
  }, []);
  const endSectionDrag = useCallback(() => {
    dispatch({ type: 'END_SECTION_DRAG' });
  }, []);
  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  const stateValue = useMemo(
    (): DragStateStateContextValue => ({
      state,
      isDraggingBlock,
      isDraggingSection,
    }),
    [isDraggingBlock, isDraggingSection, state]
  );
  const actionsValue = useMemo(
    (): DragStateActionsContextValue => ({
      startBlockDrag,
      endBlockDrag,
      startSectionDrag,
      endSectionDrag,
      clearAll,
    }),
    [clearAll, endBlockDrag, endSectionDrag, startBlockDrag, startSectionDrag]
  );

  return (
    <DragStateActionsContext.Provider value={actionsValue}>
      <DragStateStateContext.Provider value={stateValue}>{children}</DragStateStateContext.Provider>
    </DragStateActionsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDragStateState(): DragStateStateContextValue {
  const context = useContext(DragStateStateContext);
  if (!context) {
    throw internalError('useDragStateState must be used within a DragStateProvider');
  }
  return context;
}

export function useDragStateActions(): DragStateActionsContextValue {
  const context = useContext(DragStateActionsContext);
  if (!context) {
    throw internalError('useDragStateActions must be used within a DragStateProvider');
  }
  return context;
}

export function useDragState(): DragStateStateContextValue & DragStateActionsContextValue {
  const state = useDragStateState();
  const actions = useDragStateActions();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}
