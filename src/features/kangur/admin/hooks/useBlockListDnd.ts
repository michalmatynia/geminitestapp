import { useCallback, useRef, useState } from 'react';

import {
  getDragValue,
  resolveVerticalDropPosition,
  setDragData,
} from '@/shared/utils/drag-drop';

const DND_KEY = 'application/x-kangur-block-id';

export type BlockDragState = {
  draggedBlockId: string | null;
  targetBlockId: string | null;
  position: 'before' | 'after' | null;
};

export type BlockDragHandlers = {
  draggable: true;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
};

const INITIAL_STATE: BlockDragState = {
  draggedBlockId: null,
  targetBlockId: null,
  position: null,
};

export function useBlockListDnd(options: {
  onReorder: (draggedId: string, targetId: string, position: 'before' | 'after') => void;
}): {
  dragState: BlockDragState;
  getHandlers: (blockId: string) => BlockDragHandlers;
} {
  const { onReorder } = options;
  const [dragState, setDragState] = useState<BlockDragState>(INITIAL_STATE);
  // Ref tracks the dragged ID so onDragOver can read it without capturing stale state.
  // (dataTransfer.getData is blocked by browsers during dragover for security.)
  const draggedIdRef = useRef<string | null>(null);

  const getHandlers = useCallback(
    (blockId: string): BlockDragHandlers => ({
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        draggedIdRef.current = blockId;
        setDragData(e.dataTransfer, { [DND_KEY]: blockId }, { effectAllowed: 'move' });
        setDragState({ draggedBlockId: blockId, targetBlockId: null, position: null });
      },
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        const draggedId = draggedIdRef.current;
        if (!draggedId || draggedId === blockId) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const position = resolveVerticalDropPosition(e.clientY, rect, { thresholdRatio: 0.4 });
        if (!position) return;
        e.dataTransfer.dropEffect = 'move';
        setDragState((prev) => {
          if (prev.targetBlockId === blockId && prev.position === position) return prev;
          return { draggedBlockId: draggedId, targetBlockId: blockId, position };
        });
      },
      onDragLeave: (e: React.DragEvent) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setDragState((prev) =>
          prev.targetBlockId === blockId
            ? { ...prev, targetBlockId: null, position: null }
            : prev
        );
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        const draggedId = getDragValue(e.dataTransfer, DND_KEY);
        if (!draggedId || draggedId === blockId) {
          draggedIdRef.current = null;
          setDragState(INITIAL_STATE);
          return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        const position = resolveVerticalDropPosition(e.clientY, rect, { thresholdRatio: 0.4 });
        if (position) {
          onReorder(draggedId, blockId, position);
        }
        draggedIdRef.current = null;
        setDragState(INITIAL_STATE);
      },
      onDragEnd: () => {
        draggedIdRef.current = null;
        setDragState(INITIAL_STATE);
      },
    }),
    [onReorder]
  );

  return { dragState, getHandlers };
}
