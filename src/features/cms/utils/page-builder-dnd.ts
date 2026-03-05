import {
  DRAG_KEYS,
  getFirstDragValue,
  parseDragIndex,
  setDragData,
} from '@/shared/utils/drag-drop';
import type { PageZone } from '@/shared/contracts/cms';
import type {
  BlockDragState as BlockDragData,
  SectionDragState as SectionDragData,
} from '../hooks/useDragStateContext';

export type { SectionDragData };

export type { BlockDragData };

export const setSectionDragData = (
  dataTransfer: DataTransfer,
  payload: { id: string; type: string; zone: PageZone; index: number }
): void => {
  setDragData(
    dataTransfer,
    {
      [DRAG_KEYS.SECTION_ID]: payload.id,
      [DRAG_KEYS.SECTION_TYPE]: payload.type,
      [DRAG_KEYS.SECTION_ZONE]: payload.zone,
      [DRAG_KEYS.SECTION_INDEX]: payload.index,
    },
    { effectAllowed: 'move' }
  );
};

export const setBlockDragData = (
  dataTransfer: DataTransfer,
  payload: {
    id: string;
    type: string;
    fromSectionId: string;
    fromColumnId?: string | null;
    fromParentBlockId?: string | null;
  }
): void => {
  setDragData(
    dataTransfer,
    {
      [DRAG_KEYS.BLOCK_ID]: payload.id,
      [DRAG_KEYS.BLOCK_TYPE]: payload.type,
      [DRAG_KEYS.FROM_SECTION_ID]: payload.fromSectionId,
      [DRAG_KEYS.FROM_COLUMN_ID]: payload.fromColumnId ?? '',
      [DRAG_KEYS.FROM_PARENT_BLOCK_ID]: payload.fromParentBlockId ?? '',
    },
    { effectAllowed: 'move' }
  );
};

export const readSectionDragData = (
  dataTransfer: DataTransfer,
  fallback?: Partial<SectionDragData>
): SectionDragData => {
  const id = getFirstDragValue(dataTransfer, [DRAG_KEYS.SECTION_ID], fallback?.id ?? null);
  const type = getFirstDragValue(dataTransfer, [DRAG_KEYS.SECTION_TYPE], fallback?.type ?? null);
  const rawZone = getFirstDragValue(dataTransfer, [DRAG_KEYS.SECTION_ZONE], fallback?.zone ?? null);
  const zone: PageZone | null =
    rawZone === 'header' || rawZone === 'template' || rawZone === 'footer'
      ? rawZone
      : (fallback?.zone ?? null);
  const rawIndex = getFirstDragValue(
    dataTransfer,
    [DRAG_KEYS.SECTION_INDEX],
    fallback?.index !== undefined && fallback?.index !== null ? String(fallback.index) : null
  );
  const index = rawIndex ? parseDragIndex(rawIndex) : (fallback?.index ?? null);
  return { id, type, zone, index };
};

export const readBlockDragData = (
  dataTransfer: DataTransfer,
  fallback?: Partial<BlockDragData>
): BlockDragData => {
  const id = getFirstDragValue(dataTransfer, [DRAG_KEYS.BLOCK_ID], fallback?.id ?? null);
  const type = getFirstDragValue(dataTransfer, [DRAG_KEYS.BLOCK_TYPE], fallback?.type ?? null);
  const fromSectionId = getFirstDragValue(
    dataTransfer,
    [DRAG_KEYS.FROM_SECTION_ID],
    fallback?.fromSectionId ?? null
  );
  const fromColumnId = getFirstDragValue(
    dataTransfer,
    [DRAG_KEYS.FROM_COLUMN_ID],
    fallback?.fromColumnId ?? null
  );
  const fromParentBlockId = getFirstDragValue(
    dataTransfer,
    [DRAG_KEYS.FROM_PARENT_BLOCK_ID],
    fallback?.fromParentBlockId ?? null
  );
  return { id, type, fromSectionId, fromColumnId, fromParentBlockId };
};
