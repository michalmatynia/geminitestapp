import { describe, expect, it } from 'vitest';

import {
  readBlockDragData,
  setBlockDragData,
  setSectionDragData,
} from '@/features/cms/utils/page-builder-dnd';
import { DRAG_KEYS } from '@/shared/utils/drag-drop';

type DataTransferStub = {
  store: Map<string, string>;
  effectAllowed?: DataTransfer['effectAllowed'];
  setData: (key: string, value: string) => void;
  getData: (key: string) => string;
};

const createDataTransferStub = (): DataTransferStub => {
  const store = new Map<string, string>();
  return {
    store,
    effectAllowed: 'none',
    setData: (key: string, value: string): void => {
      store.set(key, value);
    },
    getData: (key: string): string => store.get(key) ?? '',
  };
};

describe('page-builder-dnd payloads', () => {
  it('writes section and block payloads without text fallback', () => {
    const dataTransfer = createDataTransferStub();

    setSectionDragData(dataTransfer as unknown as DataTransfer, {
      id: 'section-1',
      type: 'Grid',
      zone: 'content',
      index: 2,
    });

    expect(dataTransfer.store.get(DRAG_KEYS.SECTION_ID)).toBe('section-1');
    expect(dataTransfer.store.get(DRAG_KEYS.SECTION_TYPE)).toBe('Grid');
    expect(dataTransfer.store.get(DRAG_KEYS.SECTION_ZONE)).toBe('content');
    expect(dataTransfer.store.get(DRAG_KEYS.SECTION_INDEX)).toBe('2');
    expect(dataTransfer.store.get(DRAG_KEYS.TEXT)).toBeUndefined();
    expect(dataTransfer.effectAllowed).toBe('move');

    setBlockDragData(dataTransfer as unknown as DataTransfer, {
      id: 'block-1',
      type: 'TextElement',
      fromSectionId: 'section-1',
      fromColumnId: 'col-1',
      fromParentBlockId: 'parent-1',
    });

    expect(dataTransfer.store.get(DRAG_KEYS.BLOCK_ID)).toBe('block-1');
    expect(dataTransfer.store.get(DRAG_KEYS.BLOCK_TYPE)).toBe('TextElement');
    expect(dataTransfer.store.get(DRAG_KEYS.FROM_SECTION_ID)).toBe('section-1');
    expect(dataTransfer.store.get(DRAG_KEYS.FROM_COLUMN_ID)).toBe('col-1');
    expect(dataTransfer.store.get(DRAG_KEYS.FROM_PARENT_BLOCK_ID)).toBe('parent-1');
    expect(dataTransfer.store.get(DRAG_KEYS.TEXT)).toBeUndefined();
    expect(dataTransfer.effectAllowed).toBe('move');
  });

  it('reads block id only from BLOCK_ID key', () => {
    const dataTransfer = createDataTransferStub();
    dataTransfer.setData(DRAG_KEYS.TEXT, 'legacy-block-id');

    expect(readBlockDragData(dataTransfer as unknown as DataTransfer).id).toBeNull();

    dataTransfer.setData(DRAG_KEYS.BLOCK_ID, 'block-2');
    expect(readBlockDragData(dataTransfer as unknown as DataTransfer).id).toBe('block-2');
  });
});
