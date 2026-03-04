import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ZoneFooterNode } from '@/features/cms/components/page-builder/tree/ZoneFooterNode';

const { moveSectionByMasterMock, endSectionDragMock, useDragStateMock } = vi.hoisted(() => ({
  moveSectionByMasterMock: vi.fn(async () => true),
  endSectionDragMock: vi.fn(),
  useDragStateMock: vi.fn(),
}));

vi.mock('@/features/cms/components/page-builder/tree/ComponentTreePanelContext', () => ({
  useComponentTreePanelContext: () => ({
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
    startSectionMasterDrag: vi.fn(),
    endSectionMasterDrag: vi.fn(),
    draggedMasterSectionId: 'section-master',
    moveSectionByMaster: moveSectionByMasterMock,
  }),
}));

vi.mock('@/features/cms/hooks/useDragStateContext', () => ({
  useDragState: () => useDragStateMock(),
}));

vi.mock('@/features/cms/hooks/useTreeActionsContext', () => ({
  useTreeActions: () => ({
    sectionActions: {
      add: vi.fn(),
    },
  }),
}));

vi.mock('@/features/cms/components/page-builder/tree/SectionPicker', () => ({
  SectionPicker: () => <div data-testid='section-picker' />,
}));

describe('ZoneFooterNode section drops', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefers drag state section id over master drag fallback', async () => {
    useDragStateMock.mockReturnValue({
      state: {
        block: {
          id: null,
          type: null,
          fromSectionId: null,
          fromColumnId: null,
          fromParentBlockId: null,
        },
        section: {
          id: 'section-state',
          type: 'Hero',
          index: 1,
          zone: 'header',
        },
      },
      endSectionDrag: endSectionDragMock,
    });

    render(<ZoneFooterNode zone='template' sectionCount={3} />);

    const dropTarget = screen.getByText('Drop section');
    fireEvent.dragOver(dropTarget);
    fireEvent.drop(dropTarget);

    expect(moveSectionByMasterMock).toHaveBeenCalledWith('section-state', 'template', 3);
    await waitFor(() => {
      expect(endSectionDragMock).toHaveBeenCalledTimes(1);
    });
  });

  it('falls back to dragged master section id when drag state is empty', () => {
    useDragStateMock.mockReturnValue({
      state: {
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
      },
      endSectionDrag: endSectionDragMock,
    });

    render(<ZoneFooterNode zone='footer' sectionCount={1} />);
    fireEvent.drop(screen.getByText('Drop section'));

    expect(moveSectionByMasterMock).toHaveBeenCalledWith('section-master', 'footer', 1);
  });
});
