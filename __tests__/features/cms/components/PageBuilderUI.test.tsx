import { QueryClient, QueryClientProvider, UseQueryResult } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@/__tests__/test-utils';
import { http, HttpResponse } from 'msw';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { AdminLayoutProvider } from '@/features/admin/context/AdminLayoutContext';
import { PageBuilderLayout } from '@/features/cms/components/page-builder/PageBuilderLayout';
import { useCmsPages, useCmsPage, useCmsSlugs } from '@/features/cms/hooks/useCmsQueries';
import { initialState } from '@/features/cms/hooks/usePageBuilderContext';
import { server } from '@/mocks/server';
import { ToastProvider } from '@/shared/ui/toast';
import type {
  MasterTreeNode,
  MasterTreeViewNodeDto as MasterTreeViewNode,
} from '@/shared/contracts/master-folder-tree';
import type { Page, PageSummary, CmsSlugDto as CmsSlug } from '@/shared/contracts/cms';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('pageId=1'),
  usePathname: () => '/',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock('@/features/foldertree/v2', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/foldertree/v2')>();
  return {
    ...actual,
  FolderTreeViewportV2: ({
    controller,
    renderNode,
  }: {
    controller: { roots: MasterTreeViewNode[] };
    renderNode: (args: {
      node: MasterTreeViewNode;
      isExpanded: boolean;
      toggleExpand: () => void;
      depth: number;
      hasChildren: boolean;
      isSelected: boolean;
      isRenaming: boolean;
      isDragging: boolean;
      isDropTarget: boolean;
      dropPosition: 'inside' | 'before' | 'after' | null;
      select: () => void;
      startRename: () => void;
    }) => React.ReactNode;
  }) => (
    <div>
      {controller.roots.map((node) => (
        <div key={node.id}>
          {renderNode({
            node,
            isExpanded: true,
            toggleExpand: vi.fn(),
            depth: 0,
            hasChildren: (node.children?.length ?? 0) > 0,
            isSelected: false,
            isRenaming: false,
            isDragging: false,
            isDropTarget: false,
            dropPosition: null,
            select: vi.fn(),
            startRename: vi.fn(),
          })}
          {node.children?.map((child) => (
            <div key={child.id}>
              {renderNode({
                node: child,
                isExpanded: true,
                toggleExpand: vi.fn(),
                depth: 1,
                hasChildren: false,
                isSelected: false,
                isRenaming: false,
                isDragging: false,
                isDropTarget: false,
                dropPosition: null,
                select: vi.fn(),
                startRename: vi.fn(),
              })}
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
  useMasterFolderTreeShell: ({
    nodes,
    initiallyExpandedNodeIds,
  }: {
    nodes: MasterTreeNode[];
    initiallyExpandedNodeIds?: string[];
  }) => {
    const buildTree = (parentId: string | null): MasterTreeViewNode[] =>
      nodes
        .filter((n) => n.parentId === parentId)
        .map((node) => ({
          ...node,
          children: buildTree(node.id),
        }));
    const roots = buildTree(null);
    return {
      profile: {
        placeholders: { inlineDropLabel: 'Drop here' },
        nesting: { rules: [] },
      },
      appearance: { placeholderClasses: {}, rootDropUi: { label: 'Drop to root' } },
      controller: {
        nodes,
        roots,
        expandedNodeIds: new Set(initiallyExpandedNodeIds),
        selectNode: vi.fn(),
        toggleNodeExpanded: vi.fn(),
        moveNode: vi.fn(),
        startDrag: vi.fn(),
        clearDrag: vi.fn(),
      },
      panel: {
        collapsed: false,
        setCollapsed: vi.fn(),
        hasPersistedState: false,
      },
    };
  },
  };
});

vi.mock('@/features/admin/context/AdminLayoutContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/admin/context/AdminLayoutContext')>();
  return {
    ...actual,
    useAdminLayout: () => ({
      setIsProgrammaticallyCollapsed: vi.fn(),
    }),
  };
});

vi.mock('@/features/cms/hooks/useCmsQueries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/cms/hooks/useCmsQueries')>();
  return {
    ...actual,
    useCmsPages: vi.fn(),
    useCmsPage: vi.fn(),
    useCmsSlugs: vi.fn(),
    useCmsDomains: () => ({ data: [] }),
    useCmsMedia: () => ({ data: [], isLoading: false }),
    useUploadCmsMedia: () => ({ mutate: vi.fn() }),
    useUpdatePage: () => ({
      mutateAsync: vi.fn(),
      isPending: false,
    }),
  };
});

vi.mock('@/features/cms/hooks/useDragStateContext', () => ({
  DragStateProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useDragState: vi.fn(() => ({
    state: {
      block: {
        id: null,
        type: null,
        fromSectionId: null,
        fromColumnId: null,
        fromParentBlockId: null,
      },
      section: { id: null, type: null, index: null, zone: null },
    },
    isDraggingBlock: false,
    isDraggingSection: false,
    startBlockDrag: vi.fn(),
    endBlockDrag: vi.fn(),
    startSectionDrag: vi.fn(),
    endSectionDrag: vi.fn(),
    clearAll: vi.fn(),
  })),
}));

vi.mock('@/shared/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({ data: {} }),
  useUpdateUserPreferences: () => ({ mutate: vi.fn() }),
}));

vi.mock('@/shared/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui')>();
  return {
    ...actual,
    useToast: () => ({
      toast: vi.fn(),
    }),
  };
});

// Mock GSAP to avoid issues in tests
vi.mock('gsap', () => ({
  default: {
    to: vi.fn(),
    from: vi.fn(),
    set: vi.fn(),
    timeline: () => ({
      to: vi.fn(),
      from: vi.fn(),
      add: vi.fn(),
      play: vi.fn(),
    }),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <AdminLayoutProvider>
      <ToastProvider>{children}</ToastProvider>
    </AdminLayoutProvider>
  </QueryClientProvider>
);

describe('PageBuilder UI Integration', () => {
  const mockPages: PageSummary[] = [{ id: '1', name: 'Home', status: 'published', slugs: [] }];
  const mockFullPage: Page = {
    id: '1',
    name: 'Home',
    status: 'published',
    components: [],
    slugs: [],
    showMenu: true,
    themeId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const testInitialState = {
    ...initialState,
    currentPage: mockFullPage,
    pages: mockPages,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    server.use(
      http.get('/api/cms/slugs', () => HttpResponse.json([])),
      http.get('/api/user/preferences', () => HttpResponse.json({})),
      http.patch('/api/user/preferences', () => HttpResponse.json({})),
      http.post('/api/client-errors', () => HttpResponse.json({ success: true }))
    );
    vi.mocked(useCmsPages).mockReturnValue({ data: mockPages, isLoading: false } as UseQueryResult<
      PageSummary[],
      Error
    >);
    vi.mocked(useCmsPage).mockImplementation((id?: string) => {
      if (id === '1')
        return { data: mockFullPage, isLoading: false } as UseQueryResult<Page | null, Error>;
      return { data: null, isLoading: false } as UseQueryResult<Page | null, Error>;
    });
    vi.mocked(useCmsSlugs).mockReturnValue({ data: [], isLoading: false } as UseQueryResult<
      CmsSlug[],
      Error
    >);
  });

  it('should allow adding a section and see it in the preview', async () => {
    render(<PageBuilderLayout initialState={testInitialState} />, { wrapper });

    // 1. Initial state: No sections
    expect(screen.getByTestId('preview-empty')).toBeInTheDocument();

    // 2. Open section picker (default in sections mode)
    const addSectionBtn = screen.getAllByRole('button', { name: /Add section/i })[1]!;
    fireEvent.click(addSectionBtn);

    // 3. Select 'RichText' section
    const richTextBtn = screen.getByText('RichText');
    fireEvent.click(richTextBtn);

    // 4. Verify section is added to structure and preview
    await waitFor(() => {
      // In ComponentTreePanel, it should show 'RichText'
      const treeItems = screen.getAllByText('RichText');
      expect(treeItems.length).toBeGreaterThan(0);
    });
  });

  it('should handle undo/redo operations', async () => {
    render(<PageBuilderLayout initialState={testInitialState} />, { wrapper });

    // 1. Add a section
    fireEvent.click(screen.getAllByRole('button', { name: /Add section/i })[1]!);
    fireEvent.click(screen.getByText('RichText'));

    await waitFor(() => {
      expect(screen.getByText('RichText')).toBeInTheDocument();
    });

    // 2. Click Undo
    const undoBtn = screen.getByRole('button', { name: /undo/i });
    fireEvent.click(undoBtn);

    await waitFor(() => {
      expect(screen.queryByText('RichText')).not.toBeInTheDocument();
    });

    // 3. Click Redo
    const redoBtn = screen.getByRole('button', { name: /redo/i });
    fireEvent.click(redoBtn);

    await waitFor(() => {
      expect(screen.getByText('RichText')).toBeInTheDocument();
    });
  });

  it('should switch between desktop and mobile previews', async () => {
    render(<PageBuilderLayout initialState={testInitialState} />, { wrapper });

    // Default is desktop.
    screen.getByTestId('preview-empty');
    // Initially desktop has no max-w-[420px] on the wrapper (which is inside if hasSections,
    // but here we have empty preview).

    // Let's add a section to see the canvas
    fireEvent.click(screen.getAllByRole('button', { name: /Add section/i })[1]!);
    fireEvent.click(screen.getByText('RichText'));

    await waitFor(() => {
      expect(screen.getByTestId('preview-canvas')).toBeInTheDocument();
    });

    const canvas = screen.getByTestId('preview-canvas');
    expect(canvas).not.toHaveClass('max-w-[420px]');

    // Switch to mobile
    const mobileBtn = screen.getByLabelText(/Mobile preview/i);
    fireEvent.click(mobileBtn);

    await waitFor(() => {
      expect(canvas).toHaveClass('max-w-[420px]');
    });

    // Switch back to desktop
    const desktopBtn = screen.getByLabelText(/Desktop preview/i);
    fireEvent.click(desktopBtn);

    await waitFor(() => {
      expect(canvas).not.toHaveClass('max-w-[420px]');
    });
  });
});
