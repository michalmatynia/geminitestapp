/**
 * Page Builder Drag and Drop Utilities
 * 
 * Drag-and-drop operation utilities for page builder interface.
 * Provides:
 * - Drag state management and parsing
 * - Block drag data handling
 * - Page zone drag operations
 * - Drag index calculation and validation
 * - Drop target resolution
 */

import type { PageZone } from '@/shared/contracts/cms';
import {
  DRAG_KEYS,
  getFirstDragValue,
  parseDragIndex,
  setDragData,
} from '@/shared/utils/drag-drop';

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

const getFallbackIndexString = (fallback?: Partial<SectionDragData>): string | null => {
  if (fallback?.index === undefined || fallback.index === null) return null;
  return String(fallback.index);
};

const resolveZone = (rawZone: string | null, fallbackZone: PageZone | null): PageZone | null => {
  if (rawZone === 'header' || rawZone === 'template' || rawZone === 'footer') {
    return rawZone;
  }
  return fallbackZone;
};

const getRawIndex = (
  dataTransfer: DataTransfer,
  fallback?: Partial<SectionDragData>
): string | null =>
  getFirstDragValue(
    dataTransfer,
    [DRAG_KEYS.SECTION_INDEX],
    getFallbackIndexString(fallback)
  );

const extractSectionData = (
  dataTransfer: DataTransfer,
  fallback?: Partial<SectionDragData>
): SectionDragData => {
  const id = getFirstDragValue(dataTransfer, [DRAG_KEYS.SECTION_ID], fallback?.id ?? null);
  const type = getFirstDragValue(dataTransfer, [DRAG_KEYS.SECTION_TYPE], fallback?.type ?? null);
  const rawZone = getFirstDragValue(dataTransfer, [DRAG_KEYS.SECTION_ZONE], fallback?.zone ?? null);
  const zone = resolveZone(rawZone, fallback?.zone ?? null);
  const rawIndex = getRawIndex(dataTransfer, fallback);
  const index = typeof rawIndex === 'string' && rawIndex !== '' ? parseDragIndex(rawIndex) : (fallback?.index ?? null);
  return { id, type, zone, index };
};

export const readSectionDragData = (
  dataTransfer: DataTransfer,
  fallback?: Partial<SectionDragData>
): SectionDragData => extractSectionData(dataTransfer, fallback);

const getBlockDragValue = (
  dataTransfer: DataTransfer,
  key: string,
  fallback: string | null | undefined
): string | null => getFirstDragValue(dataTransfer, [key], fallback ?? null);

const extractBlockData = (
  dataTransfer: DataTransfer,
  fallback?: Partial<BlockDragData>
): BlockDragData => {
  const id = getBlockDragValue(dataTransfer, DRAG_KEYS.BLOCK_ID, fallback?.id);
  const type = getBlockDragValue(dataTransfer, DRAG_KEYS.BLOCK_TYPE, fallback?.type);
  const fromSectionId = getBlockDragValue(dataTransfer, DRAG_KEYS.FROM_SECTION_ID, fallback?.fromSectionId);
  const fromColumnId = getBlockDragValue(dataTransfer, DRAG_KEYS.FROM_COLUMN_ID, fallback?.fromColumnId);
  const fromParentBlockId = getBlockDragValue(dataTransfer, DRAG_KEYS.FROM_PARENT_BLOCK_ID, fallback?.fromParentBlockId);
  return { id, type, fromSectionId, fromColumnId, fromParentBlockId };
};

export const readBlockDragData = (
  dataTransfer: DataTransfer,
  fallback?: Partial<BlockDragData>
): BlockDragData => extractBlockData(dataTransfer, fallback);
