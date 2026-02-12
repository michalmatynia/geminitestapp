import { describe, expect, it } from 'vitest';

import { DRAG_KEYS, getNoteDragId, setNoteDragData } from '@/shared/utils/drag-drop';

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

describe('drag-drop note payloads', () => {
  it('sets NOTE_ID payload without text fallback', () => {
    const dataTransfer = createDataTransferStub();

    setNoteDragData(dataTransfer as unknown as DataTransfer, 'note-123');

    expect(dataTransfer.store.get(DRAG_KEYS.NOTE_ID)).toBe('note-123');
    expect(dataTransfer.store.get(DRAG_KEYS.TEXT)).toBeUndefined();
    expect(dataTransfer.effectAllowed).toBe('linkMove');
  });

  it('reads note id only from NOTE_ID key', () => {
    const dataTransfer = createDataTransferStub();
    dataTransfer.setData(DRAG_KEYS.TEXT, 'legacy-note-id');

    const noteId = getNoteDragId(dataTransfer as unknown as DataTransfer);
    expect(noteId).toBeNull();

    dataTransfer.setData(DRAG_KEYS.NOTE_ID, 'note-456');
    expect(getNoteDragId(dataTransfer as unknown as DataTransfer)).toBe('note-456');
  });
});
