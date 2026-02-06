import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { AdminLayoutProvider } from '@/features/admin/context/AdminLayoutContext';
import { PageBuilderLayout } from '@/features/cms/components/page-builder/PageBuilderLayout';
import { useCmsPages, useCmsPage, useCmsSlugs } from '@/features/cms/hooks/useCmsQueries';
import { initialState } from '@/features/cms/hooks/usePageBuilderContext';

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
vi.mock('@/features/admin/context/AdminLayoutContext', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    useAdminLayout: () => ({
      setIsProgrammaticallyCollapsed: vi.fn(),
    }),
  };
});

vi.mock('@/features/cms/hooks/useCmsQueries', async (importOriginal) => {
  const actual = await importOriginal() as any;
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

vi.mock('@/shared/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({ data: {} }),
  useUpdateUserPreferences: () => ({ mutate: vi.fn() }),
}));

vi.mock('@/shared/ui', async (importOriginal) => {
  const actual = await importOriginal() as any;
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
      {children}
    </AdminLayoutProvider>
  </QueryClientProvider>
);

describe('PageBuilder UI Integration', () => {
  const mockPages = [{ id: '1', name: 'Home', status: 'published', components: [] }];
  const testInitialState = {
    ...initialState,
    currentPage: mockPages[0],
    pages: mockPages,
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    (useCmsPages as any).mockReturnValue({ data: mockPages, isLoading: false });
    (useCmsPage as any).mockImplementation((id: string) => {
      if (id === '1') return { data: mockPages[0], isLoading: false };
      return { data: null, isLoading: false };
    });
    (useCmsSlugs as any).mockReturnValue({ data: [], isLoading: false });
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
