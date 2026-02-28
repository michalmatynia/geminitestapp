/**
 * @vitest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import EditProductPage from '@/features/products/components/EditProductForm';
import { server } from '@/mocks/server';
import { ToastProvider } from '@/shared/ui/toast';
import type { ProductWithImages } from '@/shared/contracts/products';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 0,
    },
  },
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '',
}));

const mockProduct: ProductWithImages = {
  id: '1',
  name: { en: 'Test Product' },
  description: { en: '' },
  name_en: 'Test Product',
  name_pl: 'Produkt Testowy',
  name_de: 'Testprodukt',
  sku: 'TEST-123',
  price: 100,
  stock: 10,
  images: [],
  catalogs: [{ catalogId: 'c1', assignedAt: new Date().toISOString(), productId: '1' }],
  categories: [],
  tags: [],
  producers: [],
  published: true,
  catalogId: 'c1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} as unknown as ProductWithImages;

describe('EditProductForm', () => {
  beforeEach(() => {
    queryClient.clear();
    server.use(
      http.get('/api/languages', () =>
        HttpResponse.json([
          { id: 'l1', code: 'EN', name: 'English' },
          { id: 'l2', code: 'PL', name: 'Polish' },
        ])
      ),
      http.get('/api/price-groups', () => HttpResponse.json([])),
      http.get('/api/catalogs', () =>
        HttpResponse.json([
          { id: 'c1', name: 'Default', languageIds: ['l1', 'l2'], priceGroupIds: [] },
        ])
      ),
      http.get('/api/products/categories', () => HttpResponse.json([])),
      http.get('/api/products/tags', () => HttpResponse.json([])),
      http.get('/api/products/parameters', () => HttpResponse.json([])),
      http.get('/api/products/validator-config', () => HttpResponse.json([])),
      http.post('/api/client-errors', () => HttpResponse.json({ success: true }))
    );
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{ui}</ToastProvider>
      </QueryClientProvider>
    );
  };

  it('renders the form with product data in the General tab', async () => {
    renderWithProviders(<EditProductPage product={mockProduct} />);

    expect(await screen.findByText('Edit Product')).toBeInTheDocument();

    // Check for English Name input - using role to be specific
    const nameInput = await screen.findByRole('textbox', { name: /English Name/i });
    expect(nameInput).toHaveValue('Test Product');

    expect(screen.getByLabelText(/SKU/i)).toHaveValue('TEST-123');
  });

  it('renders the price in the Other tab', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EditProductPage product={mockProduct} />);

    // Wait for the form to load
    await screen.findByText('Edit Product');

    // Click on the 'Other' tab
    const otherTab = screen.getByRole('tab', { name: /Other/i });
    await user.click(otherTab);

    // Check for Base Price input
    await screen.findByText(/Base Price/i);
    const priceInput = screen.getByLabelText(/Base Price/i);
    expect(priceInput).toHaveValue(100);
  });

  it('renders other tabs navigation', async () => {
    renderWithProviders(<EditProductPage product={mockProduct} />);

    expect(await screen.findByRole('tab', { name: /General/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Other/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Parameters/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Images/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Import Info/i })).toBeInTheDocument();
  });

  it('enables Update after SKU value changes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EditProductPage product={mockProduct} />);

    const updateButton = await screen.findByRole('button', { name: /^Update$/i });
    expect(updateButton).toBeDisabled();

    const skuInput = screen.getByLabelText(/SKU/i);
    await user.clear(skuInput);
    await user.type(skuInput, 'TEST-123-NEW');

    await waitFor(() => {
      expect(updateButton).toBeEnabled();
    });
  });
});
