/**
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { vi } from 'vitest';

import AdminProductsPage from '@/app/(admin)/admin/products/page';
import { server } from '@/mocks/server';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { ToastProvider } from '@/shared/ui/toast';


const createTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

let queryClient: QueryClient;

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '/',
}));

const mockProducts = [
  {
    id: 'product-1',
    name_en: 'Product Alpha',
    name_pl: null,
    name_de: null,
    sku: 'ALPHA1',
    price: 100,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    images: [],
  },
  {
    id: 'product-2',
    name_en: 'Product Beta',
    name_pl: null,
    name_de: null,
    sku: 'BETA2',
    price: 200,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    images: [],
  },
];

describe('Admin Products List UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
    queryClient.setQueryData(QUERY_KEYS.userPreferences.all, {
      productListNameLocale: 'name_en',
      productListCatalogFilter: 'all',
      productListCurrencyCode: 'USD',
      productListPageSize: 24,
      productListThumbnailSource: 'file',
      productListFiltersCollapsedByDefault: false,
    });
    
    server.use(
      http.get('/api/products', () => {
        return HttpResponse.json(mockProducts);
      }),
      http.get('/api/products/count', () => {
        return HttpResponse.json({ count: mockProducts.length });
      }),
      http.get('/api/catalogs', () => {
        return HttpResponse.json([]);
      }),
      http.get('/api/products/validator-config', () => HttpResponse.json([])),
      http.get('/api/integrations/with-connections', () => HttpResponse.json([])),
      http.get('/api/integrations/exports/base/default-connection', () => HttpResponse.json({ connectionId: null })),
      http.get('/api/ai-paths/trigger-buttons', () => HttpResponse.json([])),
      http.post('/api/query-telemetry', () => HttpResponse.json({ ok: true })),
      http.post('/api/client-errors', () => HttpResponse.json({ success: true }))
    );
  });

  it('renders product rows', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AdminProductsPage />
        </ToastProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByLabelText('Open row actions').length).toBeGreaterThan(0);
    }, { timeout: 5000 });
  });

  it('shows row actions menu with Edit, Duplicate, and Remove', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AdminProductsPage />
        </ToastProvider>
      </QueryClientProvider>
    );
    await waitFor(() => {
      expect(screen.getAllByLabelText('Open row actions').length).toBeGreaterThan(0);
    }, { timeout: 5000 });

    const user = userEvent.setup();
    const actionButtons = screen.getAllByLabelText('Open row actions');
    await user.click(actionButtons[0]!);

    expect(await screen.findByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
    expect(screen.getByText('Remove')).toBeInTheDocument();
  });

  it('prompts for SKU before opening the create modal and pre-fills SKU', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AdminProductsPage />
        </ToastProvider>
      </QueryClientProvider>
    );

    const user = userEvent.setup();
    await user.click(screen.getAllByLabelText('Create new product')[0]!);

    // Interact with PromptModal
    const promptModal = await screen.findByRole('dialog', { name: /Create New Product/i });
    const promptInput = within(promptModal).getByRole('textbox');
    await user.type(promptInput, 'abc123');
    await user.click(within(promptModal).getByRole('button', { name: /Confirm/i }));

    // Wait for Product Form Modal and pre-filled SKU
    // We skip waiting for the heading because AppModal renders it twice (visible + sr-only), causing ambiguity
    await waitFor(() => {
      const skuInput = document.getElementById('sku') as HTMLInputElement;
      expect(skuInput).toBeInTheDocument();
      expect(skuInput.value).toBe('ABC123');
    });
  });
});
