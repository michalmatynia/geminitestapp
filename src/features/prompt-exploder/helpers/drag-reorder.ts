import type {
  PromptExploderListItem,
  PromptExploderSegment,
} from '@/shared/contracts/prompt-exploder';

export type DragDropPosition = 'before' | 'after';

function reorderByIndices<T>(
  items: T[],
  draggedIndex: number,
  targetIndex: number,
  position: DragDropPosition
): T[] {
  if (!Array.isArray(items) || items.length < 2) return items;
  if (draggedIndex === targetIndex) return items;
  if (draggedIndex < 0 || targetIndex < 0) return items;
  if (draggedIndex >= items.length || targetIndex >= items.length) return items;

  const next = [...items];
  const [dragged] = next.splice(draggedIndex, 1);
  if (!dragged) return items;

  let insertIndex = targetIndex;
  if (position === 'after') {
    insertIndex += 1;
  }
  if (draggedIndex < targetIndex) {
    insertIndex -= 1;
  }

  if (insertIndex < 0) insertIndex = 0;
  if (insertIndex > next.length) insertIndex = next.length;
  next.splice(insertIndex, 0, dragged);
  return next;
}

export function reorderListItemsForDrop(
  items: PromptExploderListItem[],
  draggedIndex: number,
  targetIndex: number,
  position: DragDropPosition
): PromptExploderListItem[] {
  return reorderByIndices(items, draggedIndex, targetIndex, position);
}

export function reorderSegmentsForDrop(
  segments: PromptExploderSegment[],
  draggedId: string,
  targetId: string,
  position: DragDropPosition
): PromptExploderSegment[] {
  if (!draggedId || !targetId || draggedId === targetId) return segments;

  const draggedIndex = segments.findIndex((segment) => segment.id === draggedId);
  const targetIndex = segments.findIndex((segment) => segment.id === targetId);
  if (draggedIndex < 0 || targetIndex < 0) return segments;

  return reorderByIndices(segments, draggedIndex, targetIndex, position);
}

export function resolveDropPosition(
  pointerClientY: number,
  targetTop: number,
  targetHeight: number
): DragDropPosition {
  const middleY = targetTop + targetHeight / 2;
  return pointerClientY < middleY ? 'before' : 'after';
}
