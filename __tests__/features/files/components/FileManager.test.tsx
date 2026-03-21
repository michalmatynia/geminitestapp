import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import FileManager from '@/features/files/components/FileManager';
import {
  useFileQueries,
  useDeleteFile,
  useUpdateFileTags,
} from '@/features/files/hooks/useFileQueries';

// Mock hooks
vi.mock('@/features/files/hooks/useFileQueries', () => ({
  useFileQueries: vi.fn(),
  useDeleteFile: vi.fn(),
  useUpdateFileTags: vi.fn(),
}));

vi.mock('@/shared/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui')>();
  return {
    ...actual,
    useToast: () => ({ toast: vi.fn() }),
    FilePreviewModal: ({
      children,
      onClose,
    }: {
      children: React.ReactNode;
      onClose: () => void;
    }) => (
      <div data-testid='preview-modal'>
        <button onClick={onClose}>Close</button>
        {children}
      </div>
    ),
  };
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('FileManager Component', () => {
  const mockFiles = [
    {
      id: 'file-1',
      filename: 'image1.jpg',
      filepath: '/uploads/image1.jpg',
      products: [{ product: { id: 'p1', name: 'Product 1' } }],
      tags: ['nature'],
    },
    {
      id: 'file-2',
      filename: 'image2.png',
      filepath: '/uploads/image2.png',
      products: [],
      tags: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFileQueries).mockReturnValue({ data: mockFiles, isLoading: false } as any);
    vi.mocked(useDeleteFile).mockReturnValue({ mutateAsync: vi.fn() } as any);
    vi.mocked(useUpdateFileTags).mockReturnValue({ mutateAsync: vi.fn() } as any);
  });

  it('should render the file list', () => {
    render(<FileManager />, { wrapper });
    expect(screen.getAllByText('image1.jpg').length).toBeGreaterThan(0);
    expect(screen.getAllByText('image2.png').length).toBeGreaterThan(0);
    expect(screen.getByText('Product 1')).toBeInTheDocument();
  });

  it('should handle single file selection', () => {
    const onSelectFile = vi.fn();
    render(
      <FileManager
        onSelectFile={onSelectFile}
        selectionMode='single'
        autoConfirmSelection={true}
      />,
      { wrapper }
    );

    const file1 = screen.getByAltText('image1.jpg');
    fireEvent.click(file1);

    expect(onSelectFile).toHaveBeenCalledWith([{ id: 'file-1', filepath: '/uploads/image1.jpg' }]);
  });

  it('should handle multiple file selection and confirmation', () => {
    const onSelectFile = vi.fn();
    render(<FileManager onSelectFile={onSelectFile} selectionMode='multiple' />, { wrapper });

    const file1 = screen.getByAltText('image1.jpg');
    const file2 = screen.getByAltText('image2.png');

    fireEvent.click(file1);
    fireEvent.click(file2);

    const confirmBtn = screen.getByText(/Confirm Selection \(2\)/i);
    fireEvent.click(confirmBtn);

    expect(onSelectFile).toHaveBeenCalledWith([
      { id: 'file-1', filepath: '/uploads/image1.jpg' },
      { id: 'file-2', filepath: '/uploads/image2.png' },
    ]);
  });

  it('should open preview modal when View is clicked', () => {
    render(<FileManager mode='view' />, { wrapper });

    const viewButtons = screen.getAllByText('View');
    fireEvent.click(viewButtons[0]!);

    expect(screen.getByTestId('preview-modal')).toBeInTheDocument();
    expect(screen.getByText('Linked Products')).toBeInTheDocument();
  });

  it('should call delete mutation when Delete is clicked and confirmed', async () => {
    const mockDelete = vi.fn().mockResolvedValue({});
    vi.mocked(useDeleteFile).mockReturnValue({ mutateAsync: mockDelete } as any);

    render(<FileManager />, { wrapper });

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]!);

    // The ConfirmModal should be visible now
    const confirmButton = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(confirmButton);

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('file-1'));
  });

  it('should filter files by search input', async () => {
    render(<FileManager />, { wrapper });
    const searchInput = screen.getByPlaceholderText('Search by filename...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    await waitFor(() => expect(searchInput).toHaveValue('test'));
  });
});
