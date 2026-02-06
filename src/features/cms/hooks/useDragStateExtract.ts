'use client';

import { useMemo } from 'react';

import type { PageZone } from '@/shared/types/domain/cms';

import { useDragState, type BlockDragState, type SectionDragState } from './useDragStateContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DragStateExtracted {
  // Block drag state (flattened)
  block: {
    id: string | null;
    type: string | null;
    fromSectionId: string | null;
    fromColumnId: string | null;
    fromParentBlockId: string | null;
  };

  // Section drag state (flattened)
  section: {
    id: string | null;
    type: string | null;
    index: number | null;
    zone: PageZone | null;
  };

  // Derived state
  isDraggingBlock: boolean;
  isDraggingSection: boolean;

  // Actions
  actions: {
    startBlockDrag: (payload: BlockDragState) => void;
    endBlockDrag: () => void;
    startSectionDrag: (payload: SectionDragState) => void;
    endSectionDrag: () => void;
    clearAll: () => void;
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * A convenience hook that extracts drag state from the DragStateContext
 * and provides a flattened, easy-to-use interface.
 *
 * This consolidates the repeated extraction pattern found across tree node
 * components, reducing boilerplate from ~10 lines to 1 line per component.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const drag = useDragStateExtract();
 *
 *   // Access block drag info
 *   if (drag.block.id === myBlockId) { ... }
 *
 *   // Access section drag info
 *   if (drag.section.zone === "header") { ... }
 *
 *   // Use derived state
 *   if (drag.isDraggingBlock) { ... }
 *
 *   // Trigger actions
 *   drag.actions.startBlockDrag({ id, type, fromSectionId, ... });
 *   drag.actions.endBlockDrag();
 * }
 * ```
 */
export function useDragStateExtract(): DragStateExtracted {
  const {
    state,
    isDraggingBlock,
    isDraggingSection,
    startBlockDrag,
    endBlockDrag,
    startSectionDrag,
    endSectionDrag,
    clearAll,
  } = useDragState();

  // Memoize the actions object to maintain referential stability
  const actions = useMemo(
    () => ({
      startBlockDrag,
      endBlockDrag,
      startSectionDrag,
      endSectionDrag,
      clearAll,
    }),
    [startBlockDrag, endBlockDrag, startSectionDrag, endSectionDrag, clearAll]
  );

  // Return the extracted state with a clean interface
  return useMemo(
    () => ({
      block: state.block,
      section: state.section,
      isDraggingBlock,
      isDraggingSection,
      actions,
    }),
    [state.block, state.section, isDraggingBlock, isDraggingSection, actions]
  );
}
