import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ColumnNodeItem } from '@/features/cms/components/page-builder/tree/ColumnNodeItem';
import { TreeSectionProvider } from '@/features/cms/components/page-builder/tree/TreeSectionContext';
import { setSectionDragData } from '@/features/cms/utils/page-builder-dnd';

const { endSectionDragMock, dropToColumnMock } = vi.hoisted(() => ({
  endSectionDragMock: vi.fn(),
  dropToColumnMock: vi.fn(),
}));

vi.mock('@/features/cms/hooks/usePageBuilderContext', () => ({
  usePageBuilder: () => ({
    state: {
      selectedNodeId: null,
    },
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
      startSectionDrag: vi.fn(),
      endSectionDrag: endSectionDragMock,
      clearAll: vi.fn(),
    },
  }),
}));

vi.mock('@/features/cms/hooks/useTreeActionsContext', () => ({
  useTreeActions: () => ({
    expandedIds: new Set<string>(),
    selectNode: vi.fn(),
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
      dropToColumn: dropToColumnMock,
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

vi.mock('@/features/cms/components/page-builder/ColumnBlockPicker', () => ({
  ColumnBlockPicker: () => <div data-testid='column-block-picker' />,
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

describe('ColumnNodeItem section payload drop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts section drag payload from dataTransfer and routes to sectionActions.dropToColumn', () => {
    const column = {
      id: 'column-1',
      type: 'Column',
      settings: {},
      blocks: [],
    };

    render(
      <TreeSectionProvider sectionId='target-section'>
        <ColumnNodeItem column={column as any} columnIndex={0} rowColumnCount={1} />
      </TreeSectionProvider>
    );

    const dataTransfer = createDataTransferStub();
    setSectionDragData(dataTransfer as unknown as DataTransfer, {
      id: 'source-section',
      type: 'TextElement',
      zone: 'template',
      index: 0,
    });

    const dropTarget = screen.getByText('Column 1').closest('div[draggable="false"]');
    expect(dropTarget).not.toBeNull();

    fireEvent.dragOver(dropTarget as Element, { dataTransfer });
    fireEvent.drop(dropTarget as Element, { dataTransfer });

    expect(dropToColumnMock).toHaveBeenCalledWith('source-section', 'target-section', 'column-1', 0);
    expect(endSectionDragMock).toHaveBeenCalledTimes(1);
  });
});

