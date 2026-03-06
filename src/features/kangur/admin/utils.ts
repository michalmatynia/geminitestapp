import type { KangurLessonInlineBlock } from '@/shared/contracts/kangur';

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const moveItem = <T>(items: readonly T[], fromIndex: number, toIndex: number): T[] => {
  if (toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) {
    return [...items];
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  if (movedItem === undefined) {
    return [...items];
  }
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
};

export const parseNumberInput = (value: string, fallback: number): number => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const clampGridColumnStart = (
  columnStart: number | null,
  colSpan: number,
  columns: number
): number | null => {
  if (columnStart === null) {
    return null;
  }

  const maxColumnStart = Math.max(1, columns - colSpan + 1);
  return clamp(columnStart, 1, maxColumnStart);
};

export const parseOptionalNumberInput = (
  value: string,
  min: number,
  max: number
): number | null => {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return clamp(parsed, min, max);
};

export const insertAfterIndex = <T>(items: readonly T[], index: number, value: T): T[] => {
  const nextItems = [...items];
  nextItems.splice(index + 1, 0, value);
  return nextItems;
};

export const resolveInlineAccent = (
  type: KangurLessonInlineBlock['type']
): 'text' | 'svg' | 'image' => {
  if (type === 'svg') return 'svg';
  if (type === 'image') return 'image';
  return 'text';
};

export const resolveInlineHeading = (block: KangurLessonInlineBlock): string => {
  if (block.type === 'svg') return 'SVG block';
  if (block.type === 'image') return 'Image block';
  return 'Text block';
};
