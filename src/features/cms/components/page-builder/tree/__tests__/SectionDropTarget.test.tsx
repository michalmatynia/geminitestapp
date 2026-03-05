import React from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SectionDropTarget } from '@/features/cms/components/page-builder/tree/SectionDropTarget';
import type { SectionInstance } from '@/shared/contracts/cms';

const { pageBuilderStateRef, dragStateRef } = vi.hoisted(() => ({
  pageBuilderStateRef: {
    current: {
      sections: [] as SectionInstance[],
    },
  },
  dragStateRef: {
    current: {
      section: {
        id: null as string | null,
        type: null as string | null,
        index: null as number | null,
        zone: null as 'header' | 'template' | 'footer' | null,
      },
    },
  },
}));

vi.mock('@/features/cms/components/page-builder/tree/ComponentTreePanelContext', () => ({
  useComponentTreePanelState: () => ({
    currentPage: { id: 'page-1' },
    clipboard: null,
    showExtractPlaceholder: true,
    showSectionDropPlaceholder: true,
    canDropSectionsAtRoot: true,
    canDropBlocksAtRoot: false,
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
    draggedMasterSectionId: null,
  }),
  useComponentTreePanelActions: () => ({
    startSectionMasterDrag: vi.fn(),
    endSectionMasterDrag: vi.fn(),
    moveSectionByMaster: vi.fn(async () => true),
  }),
}));

vi.mock('@/features/cms/hooks/usePageBuilderContext', () => ({
  usePageBuilder: () => ({
    state: pageBuilderStateRef.current,
  }),
}));

vi.mock('@/features/cms/hooks/useDragStateContext', () => ({
  useDragState: () => ({
    state: {
      block: {
        id: null,
        type: null,
        fromSectionId: null,
        fromColumnId: null,
        fromParentBlockId: null,
      },
      section: dragStateRef.current.section,
    },
    endBlockDrag: vi.fn(),
    endSectionDrag: vi.fn(),
  }),
}));

vi.mock('@/features/cms/hooks/useTreeActionsContext', () => ({
  useTreeActions: () => ({
    sectionActions: {
      promoteBlockToSection: vi.fn(),
    },
  }),
}));

const createSection = (overrides: Partial<SectionInstance>): SectionInstance =>
  ({
    id: 'section-default',
    type: 'Hero',
    zone: 'template',
    parentSectionId: null,
    settings: {},
    blocks: [],
    ...overrides,
  }) as SectionInstance;

describe('SectionDropTarget rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pageBuilderStateRef.current.sections = [];
    dragStateRef.current.section = {
      id: null,
      type: null,
      index: null,
      zone: null,
    };
  });

  it('hides the no-op self-position section target', () => {
    pageBuilderStateRef.current.sections = [
      createSection({ id: 'section-a' }),
      createSection({ id: 'section-b' }),
    ];
    dragStateRef.current.section = {
      id: 'section-a',
      type: 'Hero',
      zone: 'template',
      index: 0,
    };

    const { container } = render(
      <SectionDropTarget zone='template' toParentSectionId={null} toIndex={0} />
    );

    expect(container.querySelector('[data-cms-section-drop-target="sibling"]')).toBeNull();
  });

  it('keeps non-self section targets visible', () => {
    pageBuilderStateRef.current.sections = [
      createSection({ id: 'section-a' }),
      createSection({ id: 'section-b' }),
    ];
    dragStateRef.current.section = {
      id: 'section-a',
      type: 'Hero',
      zone: 'template',
      index: 0,
    };

    const { container } = render(
      <SectionDropTarget zone='template' toParentSectionId={null} toIndex={2} />
    );

    expect(container.querySelector('[data-cms-section-drop-target="sibling"]')).not.toBeNull();
  });
});
