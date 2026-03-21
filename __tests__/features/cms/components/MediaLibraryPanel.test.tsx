import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@/__tests__/test-utils';
import React from 'react';
import { vi, describe, it, expect } from 'vitest';

import { MediaLibraryPanel } from '@/features/cms/components/page-builder/MediaLibraryPanel';

// Mock dependencies
vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock next/dynamic to return a synchronous component
vi.mock('next/dynamic', () => ({
  default: () => {
    const MockFileManager = ({
      onSelectFile,
    }: {
      onSelectFile?: (files: Array<{ id: string; filepath: string }>) => void;
    }) => (
      <div data-testid='file-manager'>
        <button
          data-testid='select-file-btn'
          onClick={() => onSelectFile?.([{ id: 'f1', filepath: '/uploads/img.png' }])}
        >
          Select
        </button>
      </div>
    );
    return MockFileManager;
  },
}));

// Mock Dialog components to just render children if open
vi.mock('@/shared/ui', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
      open ? <div data-testid='dialog'>{children}</div> : null,
    DialogContent: ({ children }: { children: React.ReactNode }) => (
      <div data-testid='dialog-content'>{children}</div>
    ),
    DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogClose: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('MediaLibraryPanel Component', () => {
  it('should render when open', () => {
    const onOpenChange = vi.fn();
    const onSelect = vi.fn();

    render(<MediaLibraryPanel open={true} onOpenChange={onOpenChange} onSelect={onSelect} />, {
      wrapper,
    });

    expect(screen.getAllByText('Media Library')[0]).toBeInTheDocument();
    expect(screen.getByTestId('file-manager')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    const { container } = render(
      <MediaLibraryPanel open={false} onOpenChange={vi.fn()} onSelect={vi.fn()} />,
      { wrapper }
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('should call onSelect when a file is selected', () => {
    const onSelect = vi.fn();
    render(<MediaLibraryPanel open={true} onOpenChange={vi.fn()} onSelect={onSelect} />, {
      wrapper,
    });

    const selectBtn = screen.getByTestId('select-file-btn');
    fireEvent.click(selectBtn);

    expect(onSelect).toHaveBeenCalledWith(['/uploads/img.png']);
  });
});
