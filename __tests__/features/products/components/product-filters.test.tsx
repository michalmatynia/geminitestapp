import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

import { ProductFilters } from '@/features/products/components/list/ProductFilters';
import { ProductListProvider, type ProductListContextType } from '@/features/products/context/ProductListContext';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

describe('ProductFilters Component', () => {
  const mockContextValue: Partial<ProductListContextType> = {
    search: '',
    setSearch: vi.fn(),
    sku: '',
    setSku: vi.fn(),
    minPrice: undefined,
    setMinPrice: vi.fn(),
    maxPrice: undefined,
    setMaxPrice: vi.fn(),
    startDate: '',
    setStartDate: vi.fn(),
    endDate: '',
    setEndDate: vi.fn(),
  };

  const renderWithProviders = (contextValue: Partial<ProductListContextType>) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ProductListProvider value={contextValue as ProductListContextType}>
          <ProductFilters />
        </ProductListProvider>
      </QueryClientProvider>
    );
  };

  it('renders all filter inputs', () => {
    renderWithProviders(mockContextValue);
    
    expect(screen.getByPlaceholderText('Search by product name...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search by SKU...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/min price/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/max price/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/from/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/to/i)).toBeInTheDocument();
  });

  it('calls setSearch when name input changes', async () => {
    renderWithProviders(mockContextValue);
    const input = screen.getByPlaceholderText('Search by product name...');
    fireEvent.change(input, { target: { value: 'laptop' } });
    await waitFor(() => expect(mockContextValue.setSearch).toHaveBeenCalledWith('laptop'), { timeout: 1000 });
  });

  it('calls setSku when SKU input changes', () => {
    renderWithProviders(mockContextValue);
    const input = screen.getByPlaceholderText('Search by SKU...');
    fireEvent.change(input, { target: { value: 'ABC' } });
    expect(mockContextValue.setSku).toHaveBeenCalledWith('ABC');
  });
});