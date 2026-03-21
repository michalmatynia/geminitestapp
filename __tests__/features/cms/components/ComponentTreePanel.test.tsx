import { screen, fireEvent } from '@/__tests__/test-utils';
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { render } from '@/__tests__/test-utils';
import { ComponentTreePanel } from '@/features/cms/components/page-builder/ComponentTreePanel';
import { useCmsPages, useCmsPage } from '@/features/cms/hooks/useCmsQueries';

// Define shared mocks
const { usePageBuilderStateMock, usePageBuilderDispatchMock } = vi.hoisted(() => ({
  usePageBuilderStateMock: vi.fn(),
  usePageBuilderDispatchMock: vi.fn(),
}));

// Mock the hooks
vi.mock('@/features/cms/hooks/usePageBuilderContext', () => ({
  usePageBuilderState: usePageBuilderStateMock,
  usePageBuilderDispatch: usePageBuilderDispatchMock,
  usePageBuilder: () => ({
    state: usePageBuilderStateMock(),
    dispatch: usePageBuilderDispatchMock(),
  }),
}));

vi.mock('@/features/cms/hooks/useCmsQueries', () => ({
  useCmsPages: vi.fn(),
  useCmsPage: vi.fn(),
}));

vi.mock('@/features/cms/hooks/useDragStateContext', () => ({
  useDragState: vi.fn(() => ({
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
    endBlockDrag: vi.fn(),
    endSectionDrag: vi.fn(),
  })),
}));

// Mock the child components to simplify testing
vi.mock('@/shared/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui')>();
  return {
    ...actual,
    FolderTreePanel: ({
      children,
      header,
    }: {
      children: React.ReactNode;
      header?: React.ReactNode;
    }) => (
      <div>
        {header}
        {children}
      </div>
    ),
    TreeHeader: ({
      title,
      subtitle,
      actions,
    }: {
      title?: string;
      subtitle?: string;
      actions?: React.ReactNode;
    }) => (
      <div>
        <h1>{title}</h1>
        <h2>{subtitle}</h2>
        {actions}
      </div>
    ),
  };
});

vi.mock('@/features/cms/components/page-builder/tree', () => ({
  SectionNodeItem: ({ section }: { section: { type: string } }) => (
    <div data-testid='section-item'>{section.type}</div>
  ),
  ZoneFooterNode: () => <div data-testid='zone-footer' />,
  SectionDropTarget: () => <div data-testid='section-drop-target' />,
}));

describe('ComponentTreePanel Component', () => {
  const mockDispatch = vi.fn();
  const mockPages = [
    { id: '1', name: 'Home', status: 'published' },
    { id: '2', name: 'About', status: 'draft' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCmsPages).mockReturnValue({ data: mockPages, isLoading: false } as any);
    vi.mocked(useCmsPage).mockReturnValue({ data: null, isLoading: false } as any);
  });

  it('should render empty when no page is selected', () => {
    usePageBuilderStateMock.mockReturnValue({
      pages: mockPages,
      currentPage: null,
      sections: [],
    });
    usePageBuilderDispatchMock.mockReturnValue(mockDispatch);

    render(<ComponentTreePanel />);
    expect(screen.getByTestId('empty-page-state')).toBeInTheDocument();
  });

  it('should render zones and sections when a page is selected', () => {
    const mockCurrentPage = { id: '1', name: 'Home' };
    const mockSections = [
      { id: 's1', type: 'Hero', zone: 'template', blocks: [] },
      { id: 's2', type: 'RichText', zone: 'footer', blocks: [] },
    ];

    usePageBuilderStateMock.mockReturnValue({
      pages: mockPages,
      currentPage: mockCurrentPage,
      sections: mockSections,
      selectedNodeId: null,
      collapsedZones: new Set(),
    });
    usePageBuilderDispatchMock.mockReturnValue(mockDispatch);

    render(<ComponentTreePanel />);

    // Check zones
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Template')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
    // The tree uses virtualization and zone grouping; assert section count summary instead
    // of relying on specific section rows being present in the current viewport.
    expect(screen.getByText('2 sections')).toBeInTheDocument();
  });

  it('should toggle zone visibility', () => {
    const mockCurrentPage = { id: '1', name: 'Home' };
    const mockSections = [{ id: 's1', type: 'Hero', zone: 'header', blocks: [] }];

    usePageBuilderStateMock.mockReturnValue({
      pages: mockPages,
      currentPage: mockCurrentPage,
      sections: mockSections,
      selectedNodeId: null,
    });
    usePageBuilderDispatchMock.mockReturnValue(mockDispatch);

    render(<ComponentTreePanel />);

    // Initially visible
    expect(screen.getByText('Hero')).toBeInTheDocument();

    // Toggle header zone
    const headerToggle = screen.getByText('Header');
    fireEvent.click(headerToggle);

    // After toggle, it should be hidden
    expect(screen.queryByText('Hero')).not.toBeInTheDocument();
  });
});
