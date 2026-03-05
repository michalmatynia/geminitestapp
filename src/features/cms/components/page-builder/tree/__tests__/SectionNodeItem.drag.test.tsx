import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SectionNodeItem } from '@/features/cms/components/page-builder/tree/SectionNodeItem';
import { MASTER_TREE_DRAG_NODE_ID } from '@/features/foldertree/v2';
import type { SectionInstance } from '@/shared/contracts/cms';
import { DRAG_KEYS } from '@/shared/utils/drag-drop';

const {
  startSectionMasterDragMock,
  endSectionMasterDragMock,
  startSectionDragMock,
  endSectionDragMock,
  selectNodeMock,
} = vi.hoisted(() => ({
  startSectionMasterDragMock: vi.fn(),
  endSectionMasterDragMock: vi.fn(),
  startSectionDragMock: vi.fn(),
  endSectionDragMock: vi.fn(),
  selectNodeMock: vi.fn(),
}));

vi.mock('@/features/cms/components/page-builder/tree/ComponentTreePanelContext', () => ({
  useComponentTreePanelState: () => ({
    draggedMasterSectionId: null,
    currentPage: { id: 'page-1' },
    clipboard: null,
    showExtractPlaceholder: true,
    showSectionDropPlaceholder: true,
    canDropSectionsAtRoot: true,
    canDropBlocksAtRoot: true,
    treePlaceholderClasses: {
      rootIdle: 'root-idle',
      rootActive: 'root-active',
      lineIdle: 'line-idle',
      lineActive: 'line-active',
      badgeIdle: 'badge-idle',
      badgeActive: 'badge-active',
    },
    treeInlineDropLabel: 'Drop here',
    treeRootDropLabel: 'Drop section',
  }),
  useComponentTreePanelActions: () => ({
    startSectionMasterDrag: startSectionMasterDragMock,
    endSectionMasterDrag: endSectionMasterDragMock,
    moveSectionByMaster: vi.fn(async () => true),
  }),
}));

vi.mock('@/features/cms/hooks/useDragStateExtract', () => ({
  useDragStateExtract: () => ({
    block: {
      id: null,
      type: null,
      fromSectionId: null,
      fromColumnId: null,
      fromParentBlockId: null,
    },
    section: {
      id: null,
      type: null,
      index: null,
      zone: null,
    },
    isDraggingBlock: false,
    isDraggingSection: false,
    actions: {
      startBlockDrag: vi.fn(),
      endBlockDrag: vi.fn(),
      startSectionDrag: startSectionDragMock,
      endSectionDrag: endSectionDragMock,
      clearAll: vi.fn(),
    },
  }),
}));

vi.mock('@/features/cms/hooks/usePageBuilderContext', () => ({
  usePageBuilder: () => ({
    state: {
      selectedNodeId: null,
      sections: [],
    },
  }),
}));

vi.mock('@/features/cms/hooks/useTreeActionsContext', () => ({
  useTreeActions: () => ({
    expandedIds: new Set<string>(),
    selectNode: selectNodeMock,
    toggleExpand: vi.fn(),
    autoExpand: vi.fn(),
    blockActions: {
      add: vi.fn(),
      addToColumn: vi.fn(),
      addElementToNestedBlock: vi.fn(),
      addElementToSectionBlock: vi.fn(),
      drop: vi.fn(),
      dropToColumn: vi.fn(),
      dropToSection: vi.fn(),
      dropToRow: vi.fn(),
      dropToSlideshowFrame: vi.fn(),
      remove: vi.fn(),
    },
    sectionActions: {
      add: vi.fn(),
      remove: vi.fn(),
      duplicate: vi.fn(),
      toggleVisibility: vi.fn(),
      dropInZone: vi.fn(),
      dropToColumn: vi.fn(),
      dropToSlideshowFrame: vi.fn(),
      convertToBlock: vi.fn(),
      promoteBlockToSection: vi.fn(),
      paste: vi.fn(),
    },
    gridActions: {
      addRow: vi.fn(),
      removeRow: vi.fn(),
      addColumn: vi.fn(),
      removeColumn: vi.fn(),
    },
  }),
}));

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

const createSection = (overrides: Partial<SectionInstance> = {}): SectionInstance =>
  ({
    id: 'section-1',
    type: 'Hero',
    zone: 'template',
    settings: {},
    blocks: [],
    ...overrides,
  }) as SectionInstance;

describe('SectionNodeItem drag bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes section and master-tree payloads and starts both drag channels', async () => {
    const section = createSection();
    const dataTransfer = createDataTransferStub();
    const { container } = render(<SectionNodeItem section={section} sectionIndex={2} />);

    const dragHandle = container.querySelector('[draggable="true"]');
    expect(dragHandle).not.toBeNull();
    fireEvent.dragStart(dragHandle as Element, { dataTransfer });

    expect(dataTransfer.store.get(DRAG_KEYS.SECTION_ID)).toBe('section-1');
    expect(dataTransfer.store.get(DRAG_KEYS.SECTION_TYPE)).toBe('Hero');
    expect(dataTransfer.store.get(DRAG_KEYS.SECTION_ZONE)).toBe('template');
    expect(dataTransfer.store.get(DRAG_KEYS.SECTION_INDEX)).toBe('2');
    expect(dataTransfer.store.get(MASTER_TREE_DRAG_NODE_ID)).toBe('cms-section:section-1');

    await waitFor(() => {
      expect(startSectionDragMock).toHaveBeenCalledWith({
        id: 'section-1',
        type: 'Hero',
        zone: 'template',
        index: 2,
      });
      expect(startSectionMasterDragMock).toHaveBeenCalledWith('section-1');
    });
  });

  it('clears both drag channels on drag end', () => {
    const section = createSection();
    const { container } = render(<SectionNodeItem section={section} sectionIndex={0} />);

    const dragHandle = container.querySelector('[draggable="true"]');
    expect(dragHandle).not.toBeNull();
    fireEvent.dragEnd(dragHandle as Element);

    expect(endSectionDragMock).toHaveBeenCalledTimes(1);
    expect(endSectionMasterDragMock).toHaveBeenCalledTimes(1);
  });

  it('selects section through tree actions', () => {
    render(<SectionNodeItem section={createSection()} sectionIndex={0} />);
    fireEvent.click(screen.getByText('Hero'));
    expect(selectNodeMock).toHaveBeenCalledWith('section-1');
  });
});
