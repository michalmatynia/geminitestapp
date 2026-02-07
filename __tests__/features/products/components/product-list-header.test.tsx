import React from 'react';
import { vi } from 'vitest';

import { ProductListHeader } from '@/features/products/components/list/ProductListHeader';
import { ProductListContext } from '@/features/products/context/ProductListContext';

import { render, screen, fireEvent } from '../../../test-utils';

vi.mock('@/shared/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui')>();
  return {
    ...actual,
    useToast: () => ({
      toast: vi.fn(),
    }),
  };
});

describe('ProductListHeader Component', () => {
  const mockContextValue = {
    onCreateProduct: vi.fn(),
    onCreateFromDraft: vi.fn(),
    activeDrafts: [],
    page: 1,
    totalPages: 5,
    setPage: vi.fn(),
    pageSize: 24,
    setPageSize: vi.fn(),
    nameLocale: 'name_en' as const,
    setNameLocale: vi.fn(),
    languageOptions: [
      { value: 'name_en' as const, label: 'English' },
      { value: 'name_pl' as const, label: 'Polish' },
      { value: 'name_de' as const, label: 'German' },
    ],
    currencyCode: 'USD',
    setCurrencyCode: vi.fn(),
    currencyOptions: ['USD', 'PLN', 'EUR'],
    catalogFilter: 'all',
    setCatalogFilter: vi.fn(),
    catalogs: [
      {
        id: 'cat-1',
        name: 'Catalog 1',
        description: null,
        isDefault: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        languageIds: ['en'],
        priceGroupIds: ['pg-1'],
      },
      {
        id: 'cat-2',
        name: 'Catalog 2',
        description: null,
        isDefault: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        languageIds: ['en'],
        priceGroupIds: ['pg-1'],
      },
    ],
  };

  const renderWithContext = (ui: React.ReactNode, contextValue = mockContextValue) => {
    return render(
      <ProductListContext.Provider value={contextValue as any}>
        {ui}
      </ProductListContext.Provider>
    );
  };

  it('renders title and buttons', () => {
    renderWithContext(<ProductListHeader />);

    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByLabelText('Create new product')).toBeInTheDocument();
  });

  it('calls onCreateProduct when create button is clicked', () => {
    renderWithContext(<ProductListHeader />);
    fireEvent.click(screen.getByLabelText('Create new product'));
    expect(mockContextValue.onCreateProduct).toHaveBeenCalled();
  });

  it('renders pagination info correctly', () => {
    renderWithContext(<ProductListHeader />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('/')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls setPage when Prev/Next buttons are clicked', () => {
    // Override page to 2 for this test to enable 'Previous' button logic if needed,
    // though Pagination component might handle disabled states.
    // Here we just check calls.
    renderWithContext(<ProductListHeader />, { ...mockContextValue, page: 2 });
    
    // Check for previous button. Note: The exact label/text depends on the Pagination component implementation.
    // Assuming standard accessible labels or text.
    const prevButton = screen.getByLabelText('Previous page'); // Adjust selector if needed based on Pagination component
    fireEvent.click(prevButton);
    expect(mockContextValue.setPage).toHaveBeenCalledWith(1);

    const nextButton = screen.getByLabelText('Next page'); // Adjust selector if needed
    fireEvent.click(nextButton);
    expect(mockContextValue.setPage).toHaveBeenCalledWith(3);
  });
});
