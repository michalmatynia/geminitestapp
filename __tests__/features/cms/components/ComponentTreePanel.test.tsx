import { screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';

import { render } from '@/__tests__/test-utils';
import { ComponentTreePanel } from '@/features/cms/components/page-builder/ComponentTreePanel';
import { useCmsPages, useCmsPage } from '@/features/cms/hooks/useCmsQueries';
import { usePageBuilderState, usePageBuilderDispatch } from '@/features/cms/hooks/usePageBuilderContext';

// Mock the hooks
vi.mock('@/features/cms/hooks/usePageBuilderContext', () => {
  const usePageBuilderStateMock = vi.fn();
  const usePageBuilderDispatchMock = vi.fn();
  return {
    usePageBuilderState: usePageBuilderStateMock,
    usePageBuilderDispatch: usePageBuilderDispatchMock,
    usePageBuilder: () => ({
      state: usePageBuilderStateMock(),
      dispatch: usePageBuilderDispatchMock(),
    }),
  };
});

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
  const actual = await importOriginal<any>();
  return {
    ...actual,
    FolderTreePanel: ({ children, header }: any) => (
      <div>
        {header}
        {children}
      </div>
    ),
    TreeHeader: ({ title, subtitle, actions }: any) => (
      <div>
        <h1>{title}</h1>
        <h2>{subtitle}</h2>
        {actions}
      </div>
    ),
  };
});
vi.mock('@/features/cms/components/page-builder/tree', () => ({
  SectionNodeItem: ({ section }: any) => <div data-testid='section-item'>{section.type}</div>,
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
    (useCmsPages as any).mockReturnValue({ data: mockPages, isLoading: false });
    (useCmsPage as any).mockReturnValue({ data: null, isLoading: false });
  });

  it('should render empty when no page is selected', () => {
    (usePageBuilderState as any).mockReturnValue({ pages: mockPages, currentPage: null, sections: [] });
    (usePageBuilderDispatch as any).mockReturnValue(mockDispatch);

    render(<ComponentTreePanel />);
    expect(screen.getByTestId('empty-page-state')).toBeInTheDocument();
  });

  it('should render zones and sections when a page is selected', () => {
    const mockCurrentPage = { id: '1', name: 'Home' };
    const mockSections = [
      { id: 's1', type: 'Hero', zone: 'template', blocks: [] },
      { id: 's2', type: 'RichText', zone: 'footer', blocks: [] },
    ];

    (usePageBuilderState as any).mockReturnValue({ 
      pages: mockPages, 
      currentPage: mockCurrentPage, 
      sections: mockSections,
      selectedNodeId: null,
      collapsedZones: new Set()
    });
    (usePageBuilderDispatch as any).mockReturnValue(mockDispatch);

    render(<ComponentTreePanel />);

    // Check zones
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Template')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();

    // Check sections
    const sectionItems = screen.getAllByTestId('section-item');
    expect(sectionItems.length).toBe(2);
    expect(screen.getByText('Hero')).toBeInTheDocument();
    expect(screen.getByText('RichText')).toBeInTheDocument();
  });

  it('should toggle zone visibility', () => {
    const mockCurrentPage = { id: '1', name: 'Home' };
    const mockSections = [{ id: 's1', type: 'Hero', zone: 'header', blocks: [] }];

    (usePageBuilderState as any).mockReturnValue({ 
      pages: mockPages, 
      currentPage: mockCurrentPage, 
      sections: mockSections,
      selectedNodeId: null
    });
    (usePageBuilderDispatch as any).mockReturnValue(mockDispatch);

    render(<ComponentTreePanel />);

    // Initially visible
    expect(screen.getByText('Hero')).toBeInTheDocument();

    // Toggle header zone
    const headerToggle = screen.getByText('Header');
    fireEvent.click(headerToggle);

    // After toggle, it should be hidden (since we mocked the state to be updated by internal useState in real component, 
    // but here we are testing if the click event is handled and triggers re-render or state change if we were using external state.
    // Wait, ComponentTreePanel uses internal setCollapsedZones. So it should work without extra mocking of state for collapse.)
    
    expect(screen.queryByText('Hero')).not.toBeInTheDocument();
  });


});
