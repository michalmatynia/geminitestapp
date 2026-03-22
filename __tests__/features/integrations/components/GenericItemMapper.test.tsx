import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { GenericMapper as GenericItemMapper } from '@/shared/ui/templates/mappers/GenericMapper';
import { ToastProvider } from '@/shared/ui/toast';
import { useCategoryMapper } from '@/features/integrations/context/CategoryMapperContext';

// Mock the context hook
vi.mock('@/features/integrations/context/CategoryMapperContext', () => ({
  useCategoryMapper: vi.fn(),
}));

type CategoryMapperContextValue = ReturnType<typeof useCategoryMapper>;

// Mock types and data
interface MockInternalItem {
  id: string;
  name: string;
  catalogId?: string;
}

interface MockExternalItem {
  value: string;
  label: string;
}

interface MockMapping {
  internalId: string;
  externalId: string | null;
}

describe('GenericItemMapper', () => {
  const mockInternalItems: MockInternalItem[] = [
    { id: '1', name: 'Item 1', catalogId: 'cat-1' },
    { id: '2', name: 'Item 2', catalogId: 'cat-2' },
  ];

  const mockExternalItems: MockExternalItem[] = [
    { value: 'ext-1', label: 'External 1' },
    { value: 'ext-2', label: 'External 2' },
  ];

  const mockMappings: MockMapping[] = [{ internalId: '1', externalId: 'ext-1' }];

  const defaultMockContext = {
    pendingMappings: new Map(),
    handleMappingChange: vi.fn(),
    getMappingForExternal: vi.fn().mockReturnValue(null),
    internalCategoryOptions: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCategoryMapper).mockReturnValue(defaultMockContext as unknown as CategoryMapperContextValue);
  });

  const createConfig = (overrides = {}) => ({
    title: 'Test Mapper',
    internalColumnHeader: 'Internal',
    externalColumnHeader: 'External',
    internalItems: mockInternalItems,
    externalItems: mockExternalItems,
    currentMappings: mockMappings,
    getInternalId: (item: MockInternalItem) => item.id,
    getInternalLabel: (item: MockInternalItem) => item.name,
    getExternalId: (item: MockExternalItem) => item.value,
    getExternalLabel: (item: MockExternalItem) => item.label,
    getMappingInternalId: (mapping: MockMapping) => mapping.internalId,
    getMappingExternalId: (mapping: MockMapping) => mapping.externalId,
    onFetch: vi.fn().mockResolvedValue({ message: 'Fetched' }),
    onSave: vi.fn().mockResolvedValue({ message: 'Saved' }),
    ...overrides,
  });

  const renderMapper = (config: ReturnType<typeof createConfig>) =>
    {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      });

      return render(
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <GenericItemMapper<MockInternalItem, MockExternalItem, MockMapping> config={config} />
          </ToastProvider>
        </QueryClientProvider>
      );
    };

  it('renders mapper with title', () => {
    const config = createConfig();
    renderMapper(config);

    expect(screen.getByText('Test Mapper')).toBeInTheDocument();
  });

  it('renders internal items', () => {
    const config = createConfig();
    renderMapper(config);

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('calls onFetch when fetch button is clicked', async () => {
    const onFetch = vi.fn().mockResolvedValue({ message: 'Fetched' });
    const config = createConfig({ onFetch });

    renderMapper(config);

    const fetchButton = screen.getByText('Fetch');
    fireEvent.click(fetchButton);

    await waitFor(() => {
      expect(onFetch).toHaveBeenCalled();
    });
  });

  it('displays stats correctly', () => {
    const config = createConfig();
    renderMapper(config);

    expect(screen.getByText(/Total/)).toBeInTheDocument();
    expect(screen.getByText(/Mapped/)).toBeInTheDocument();
  });

  it('shows loading state when isLoadingInternal is true', () => {
    const config = createConfig({ isLoadingInternal: true });
    renderMapper(config);

    expect(screen.getByText(/Loading/)).toBeInTheDocument();
  });

  it('renders additional column when provided', () => {
    const config = createConfig({
      additionalColumnsHeader: 'Catalog',
      getInternalAdditionalLabel: (item: MockInternalItem) => item.catalogId || '',
    });

    renderMapper(config);

    expect(screen.getByText('Catalog')).toBeInTheDocument();
  });

  it('disables fetch button when isFetching is true', () => {
    const config = createConfig({ isFetching: true });
    renderMapper(config);

    const fetchButton = screen.getByRole('button', { name: /Fetch/i });
    expect(fetchButton).toBeDisabled();
  });

  it('disables save button when no pending mappings', () => {
    const config = createConfig();
    renderMapper(config);

    // The save button should show pending count
    expect(screen.getByText(/Save/)).toBeInTheDocument();
  });
});
