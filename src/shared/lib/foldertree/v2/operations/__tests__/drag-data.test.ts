import { describe, expect, it } from 'vitest';

import { DRAG_KEYS } from '@/shared/utils/drag-drop';

import {
  getMasterTreeDragNodeData,
  MASTER_TREE_DRAG_NODE_ID,
  setMasterTreeDragNodeData,
} from '../drag-data';

type DataTransferStub = {
  effectAllowed?: DataTransfer['effectAllowed'];
  store: Map<string, string>;
  setData: (key: string, value: string) => void;
  getData: (key: string) => string;
};

const createDataTransferStub = (): DataTransferStub => {
  const store = new Map<string, string>();
  return {
    store,
    setData: (key: string, value: string): void => {
      store.set(key, value);
    },
    getData: (key: string): string => store.get(key) ?? '',
  };
};

describe('master tree drag payload helpers', () => {
  it('writes master tree drag id and text fallback', () => {
    const dataTransfer = createDataTransferStub();

    setMasterTreeDragNodeData(dataTransfer as unknown as DataTransfer, 'section:hero', 'Hero');

    expect(dataTransfer.store.get(MASTER_TREE_DRAG_NODE_ID)).toBe('section:hero');
    expect(dataTransfer.store.get(DRAG_KEYS.TEXT)).toBe('Hero');
    expect(dataTransfer.effectAllowed).toBe('move');
  });

  it('uses node id as text fallback by default', () => {
    const dataTransfer = createDataTransferStub();

    setMasterTreeDragNodeData(dataTransfer as unknown as DataTransfer, 'section:hero');

    expect(dataTransfer.store.get(MASTER_TREE_DRAG_NODE_ID)).toBe('section:hero');
    expect(dataTransfer.store.get(DRAG_KEYS.TEXT)).toBe('section:hero');
  });

  it('reads only the master tree drag mime payload', () => {
    const dataTransfer = createDataTransferStub();
    dataTransfer.setData(DRAG_KEYS.TEXT, 'legacy-id');
    expect(getMasterTreeDragNodeData(dataTransfer as unknown as DataTransfer)).toBeNull();

    dataTransfer.setData(MASTER_TREE_DRAG_NODE_ID, 'section:hero');
    expect(getMasterTreeDragNodeData(dataTransfer as unknown as DataTransfer)).toBe('section:hero');
  });
});
