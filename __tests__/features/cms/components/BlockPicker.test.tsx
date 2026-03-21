import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@/__tests__/test-utils';
import { vi } from 'vitest';

import { BlockPicker } from '@/features/cms/components/page-builder/BlockPicker';

// Create a new QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

// Mock the registry
vi.mock('@/features/cms/components/page-builder/section-registry', () => ({
  getAllowedBlockTypes: (type: string) => {
    if (type === 'RichText') {
      return [
        { type: 'Heading', label: 'Heading', icon: 'Heading' },
        { type: 'Text', label: 'Text', icon: 'AlignLeft' },
      ];
    }
    return [];
  },
}));

describe('BlockPicker Component', () => {
  it('should render nothing if no blocks are allowed for the section type', () => {
    const queryClient = createTestQueryClient();
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <BlockPicker sectionType='EmptySection' onSelect={vi.fn()} />
      </QueryClientProvider>
    );
    expect(container.firstChild).toBeNull();
  });

  it('should toggle the block menu when clicking the plus button', () => {
    const queryClient = createTestQueryClient();
    const onSelect = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <BlockPicker sectionType='RichText' onSelect={onSelect} />
      </QueryClientProvider>
    );

    const plusButton = screen.getByLabelText('Add block');

    // Initially closed
    expect(screen.queryByText('Heading')).not.toBeInTheDocument();

    // Open
    fireEvent.click(plusButton);
    expect(screen.getByText('Heading')).toBeInTheDocument();
    expect(screen.getByText('Text')).toBeInTheDocument();

    // Close
    fireEvent.click(plusButton);
    expect(screen.queryByText('Heading')).not.toBeInTheDocument();
  });

  it('should call onSelect and close when a block is clicked', () => {
    const queryClient = createTestQueryClient();
    const onSelect = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <BlockPicker sectionType='RichText' onSelect={onSelect} />
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByLabelText('Add block'));
    fireEvent.click(screen.getByText('Heading'));

    expect(onSelect).toHaveBeenCalledWith('Heading');
    expect(screen.queryByText('Heading')).not.toBeInTheDocument();
  });
});
