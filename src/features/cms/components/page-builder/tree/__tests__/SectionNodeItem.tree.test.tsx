import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SectionNodeItem } from '@/features/cms/components/page-builder/tree/SectionNodeItem';
import { setSectionDragData } from '@/features/cms/utils/page-builder-dnd';
import type { SectionInstance } from '@/shared/contracts/cms';

const {
  moveSectionByMasterMock,
  endSectionDragMock,
  pageBuilderStateRef,
  dragStateRef,
  expandedIdsRef,
  componentTreePanelState,
} = vi.hoisted(() => ({
  moveSectionByMasterMock: vi.fn(async () => true),
  endSectionDragMock: vi.fn(),
  pageBuilderStateRef: {
    current: {
      selectedNodeId: null as string | null,
      sections: [] as SectionInstance[],
    },
  },
  dragStateRef: {
    current: {
      section: {
        id: null as string | null,
        type: null as string | null,
        zone: null as 'header' | 'template' | 'footer' | null,
        index: null as number | null,
      },
    },
  },
  expandedIdsRef: {
    current: new Set<string>(),
  },
  componentTreePanelState: {
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
  },
}));

vi.mock('@/features/cms/components/page-builder/tree/ComponentTreePanelContext', () => ({
  useComponentTreePanelState: () => componentTreePanelState,
  useComponentTreePanelActions: () => ({
    startSectionMasterDrag: vi.fn(),
    endSectionMasterDrag: vi.fn(),
    moveSectionByMaster: moveSectionByMasterMock,
  }),
}));

vi.mock('@/features/cms/hooks/usePageBuilderContext', () => ({
  usePageBuilder: () => ({
    state: pageBuilderStateRef.current,
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
    section: dragStateRef.current.section,
    isDraggingBlock: false,
    isDraggingSection: Boolean(dragStateRef.current.section.id),
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
    expandedIds: expandedIdsRef.current,
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

vi.mock('@/features/cms/components/page-builder/tree/RowNodeItem', () => ({
  RowNodeItem: ({ row }: { row: { id: string } }) => <div data-testid={`row-${row.id}`} />,
}));

vi.mock('@/features/cms/components/page-builder/tree/ColumnNodeItem', () => ({
  ColumnNodeItem: ({ column }: { column: { id: string } }) => (
    <div data-testid={`column-${column.id}`} />
  ),
}));

vi.mock('@/features/cms/components/page-builder/tree/SlideshowFrameNodeItem', () => ({
  SlideshowFrameNodeItem: ({ frame }: { frame: { id: string } }) => (
    <div data-testid={`frame-${frame.id}`} />
  ),
}));

vi.mock('@/features/cms/components/page-builder/tree/SectionBlockNodeItem', () => ({
  SectionBlockNodeItem: ({ block }: { block: { id: string } }) => (
    <div data-testid={`section-block-${block.id}`} />
  ),
}));

vi.mock('@/features/cms/components/page-builder/tree/BlockNodeItem', () => ({
  BlockNodeItem: ({ block }: { block: { id: string } }) => (
    <div data-testid={`block-${block.id}`} />
  ),
}));

vi.mock('@/features/cms/components/page-builder/tree/TreeSectionPicker', () => ({
  renderTreeSectionPicker: () => <div data-testid='section-picker' />,
}));

type DataTransferStub = {
  store: Map<string, string>;
  effectAllowed?: DataTransfer['effectAllowed'];
  types: readonly string[];
  setData: (key: string, value: string) => void;
  getData: (key: string) => string;
};

const createDataTransferStub = (): DataTransfer => {
  const store = new Map<string, string>();
  const stub: DataTransferStub = {
    store,
    effectAllowed: 'none',
    get types() {
      return Array.from(store.keys());
    },
    setData: (key: string, value: string): void => {
      store.set(key, value);
    },
    getData: (key: string): string => store.get(key) ?? '',
  };
  return stub as DataTransfer;
};

const createSection = (overrides: Partial<SectionInstance> = {}): SectionInstance =>
  ({
    id: 'section-1',
    type: 'Hero',
    zone: 'template',
    parentSectionId: null,
    settings: {},
    blocks: [],
    ...overrides,
  }) as SectionInstance;

describe('SectionNodeItem tree behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pageBuilderStateRef.current = {
      selectedNodeId: null,
      sections: [],
    };
    dragStateRef.current = {
      section: {
        id: null,
        type: null,
        zone: null,
        index: null,
      },
    };
    expandedIdsRef.current = new Set<string>();
  });

  it('routes root section blocks through specialized node renderers', () => {
    const section = createSection({
      blocks: [
        { id: 'row-1', type: 'Row', settings: {}, blocks: [] },
        { id: 'frame-1', type: 'SlideshowFrame', settings: {}, blocks: [] },
        { id: 'container-1', type: 'Container', settings: {}, blocks: [] },
        { id: 'leaf-1', type: 'TextElement', settings: {} },
      ],
    });
    pageBuilderStateRef.current.sections = [section];
    expandedIdsRef.current = new Set(['section-1']);

    render(<SectionNodeItem section={section} sectionIndex={0} />);

    expect(screen.getByTestId('row-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('frame-frame-1')).toBeInTheDocument();
    expect(screen.getByTestId('section-block-container-1')).toBeInTheDocument();
    expect(screen.getByTestId('block-leaf-1')).toBeInTheDocument();
  });

  it('nests dropped sections when dropped on the section row', async () => {
    const targetSection = createSection({ id: 'target-section', zone: 'header' });
    const sourceSection = createSection({ id: 'source-section', zone: 'template' });
    pageBuilderStateRef.current.sections = [targetSection, sourceSection];
    dragStateRef.current.section = {
      id: 'source-section',
      type: 'Hero',
      zone: 'template',
      index: 0,
    };

    const { container } = render(<SectionNodeItem section={targetSection} sectionIndex={0} />);

    const dataTransfer = createDataTransferStub();
    setSectionDragData(dataTransfer, {
      id: 'source-section',
      type: 'Hero',
      zone: 'template',
      index: 0,
    });

    const sectionRow = container.querySelector('[data-cms-section-row="true"]');
    expect(sectionRow).not.toBeNull();

    fireEvent.dragOver(sectionRow as Element, { dataTransfer });
    fireEvent.drop(sectionRow as Element, { dataTransfer });

    expect(moveSectionByMasterMock).toHaveBeenCalledWith(
      'source-section',
      'header',
      0,
      'target-section'
    );
    await waitFor(() => {
      expect(endSectionDragMock).toHaveBeenCalledTimes(1);
    });
  });

  it('does not render standalone inside-drop placeholder', () => {
    const targetSection = createSection({ id: 'target-section', zone: 'header' });
    const sourceSection = createSection({ id: 'source-section', zone: 'template' });
    pageBuilderStateRef.current.sections = [targetSection, sourceSection];
    dragStateRef.current.section = {
      id: 'source-section',
      type: 'Hero',
      zone: 'template',
      index: 0,
    };

    render(<SectionNodeItem section={targetSection} sectionIndex={0} />);

    expect(screen.queryByText('Drop inside to nest')).toBeNull();
    expect(screen.queryByText('Release to nest section')).toBeNull();
  });

  it('ignores row drop when dragged section is already a child of target', () => {
    const targetSection = createSection({ id: 'target-section', zone: 'header' });
    const sourceSection = createSection({
      id: 'source-section',
      zone: 'header',
      parentSectionId: 'target-section',
    });
    pageBuilderStateRef.current.sections = [targetSection, sourceSection];
    dragStateRef.current.section = {
      id: 'source-section',
      type: 'Hero',
      zone: 'header',
      index: 0,
    };

    const { container } = render(<SectionNodeItem section={targetSection} sectionIndex={0} />);
    const sectionRow = container.querySelector('[data-cms-section-row="true"]');
    expect(sectionRow).not.toBeNull();

    const dataTransfer = createDataTransferStub();
    setSectionDragData(dataTransfer, {
      id: 'source-section',
      type: 'Hero',
      zone: 'header',
      index: 0,
    });

    fireEvent.dragOver(sectionRow as Element, { dataTransfer });
    fireEvent.drop(sectionRow as Element, { dataTransfer });

    expect(moveSectionByMasterMock).not.toHaveBeenCalled();
  });

  it('ignores row drop when dragging ancestor section onto descendant target', () => {
    const parentSection = createSection({ id: 'parent-section', zone: 'header' });
    const childSection = createSection({
      id: 'child-section',
      zone: 'header',
      parentSectionId: 'parent-section',
    });
    pageBuilderStateRef.current.sections = [parentSection, childSection];
    dragStateRef.current.section = {
      id: 'parent-section',
      type: 'Hero',
      zone: 'header',
      index: 0,
    };

    const { container } = render(<SectionNodeItem section={childSection} sectionIndex={0} />);
    const sectionRow = container.querySelector('[data-cms-section-row="true"]');
    expect(sectionRow).not.toBeNull();

    const dataTransfer = createDataTransferStub();
    setSectionDragData(dataTransfer, {
      id: 'parent-section',
      type: 'Hero',
      zone: 'header',
      index: 0,
    });

    fireEvent.dragOver(sectionRow as Element, { dataTransfer });
    fireEvent.drop(sectionRow as Element, { dataTransfer });

    expect(moveSectionByMasterMock).not.toHaveBeenCalled();
  });
});
