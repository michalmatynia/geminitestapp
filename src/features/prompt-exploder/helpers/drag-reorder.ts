import type {
  PromptExploderListItem,
  PromptExploderSegment,
} from '../types';

export const reorderListItemsForDrop = (
  items: PromptExploderListItem[],
  fromIndex: number,
  toIndex: number,
  position: 'before' | 'after'
): PromptExploderListItem[] => {
  if (fromIndex === toIndex) return items;
  if (fromIndex < 0 || toIndex < 0) return items;
  if (fromIndex >= items.length || toIndex >= items.length) return items;
  const dragged = items[fromIndex];
  if (!dragged) return items;
  const remaining = items.filter((_, index) => index !== fromIndex);
  const targetBaseIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
  const insertIndex =
    position === 'after' ? Math.min(targetBaseIndex + 1, remaining.length) : targetBaseIndex;
  return [
    ...remaining.slice(0, insertIndex),
    dragged,
    ...remaining.slice(insertIndex),
  ];
};

export const reorderSegmentsForDrop = (
  segments: PromptExploderSegment[],
  draggedId: string,
  targetId: string,
  position: 'before' | 'after'
): PromptExploderSegment[] => {
  if (!draggedId || !targetId || draggedId === targetId) return segments;
  const dragged = segments.find((segment) => segment.id === draggedId);
  if (!dragged) return segments;
  const remaining = segments.filter((segment) => segment.id !== draggedId);
  const targetIndex = remaining.findIndex((segment) => segment.id === targetId);
  if (targetIndex < 0) return segments;
  const insertIndex = position === 'after' ? targetIndex + 1 : targetIndex;
  return [
    ...remaining.slice(0, insertIndex),
    dragged,
    ...remaining.slice(insertIndex),
  ];
};

export const resolveDropPosition = (
  clientY: number,
  rectTop: number,
  rectHeight: number
): 'before' | 'after' => {
  const offsetY = clientY - rectTop;
  return offsetY >= rectHeight / 2 ? 'after' : 'before';
};
