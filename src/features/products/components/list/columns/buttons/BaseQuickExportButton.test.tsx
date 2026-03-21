import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products';

const {
  toastMock,
  apiGetMock,
  apiPostMock,
  mutateAsyncMock,
  invalidateProductListingsAndBadgesMock,
} = vi.hoisted(() => ({
  toastMock: vi.fn(),
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  mutateAsyncMock: vi.fn(),
  invalidateProductListingsAndBadgesMock: vi.fn(),
}));

vi.mock('@/shared/ui', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  InsetPanel: ({
    children,
    className,
  }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
    <div className={className}>{children}</div>
  ),
  AppModal: ({
    open,
    title,
    children,
  }: {
    open?: boolean;
    title: React.ReactNode;
    children: React.ReactNode;
  }) =>
    open ? (
      <div role='dialog'>
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => apiGetMock(...args) as Promise<unknown>,
    post: (...args: unknown[]) => apiPostMock(...args) as Promise<unknown>,
  },
}));

vi.mock('@/features/integrations', () => ({
  fetchPreferredBaseConnection: () => Promise.resolve({ connectionId: 'conn-base-1' }),
  integrationSelectionQueryKeys: {
    defaultConnection: ['integrations', 'default-connection'],
  },
  useGenericExportToBaseMutation: () => ({
    isPending: false,
    mutateAsync: mutateAsyncMock,
  }),
}));

vi.mock('@/shared/lib/query-invalidation', () => ({
  invalidateProductListingsAndBadges: (...args: unknown[]) =>
    invalidateProductListingsAndBadgesMock(...args) as Promise<void>,
}));

import { BaseQuickExportButton } from './BaseQuickExportButton';

const product = {
  id: 'product-1',
  sku: 'SKU-001',
  name_en: 'Product 1',
  name_pl: '',
  name_de: '',
  description_en: null,
  description_pl: null,
  description_de: null,
  price: 10,
  stock: 3,
  weight: null,
  ean: null,
  baseProductId: null,
  images: [],
  imageLinks: [],
  imageBase64s: [],
  categoryId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  producer: null,
  parameters: [],
  tags: [],
  catalogs: [],
  defaultPriceGroupId: null,
  priceGroupPrices: [],
} as unknown as ProductWithImages;

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderButton = (overrides?: Partial<React.ComponentProps<typeof BaseQuickExportButton>>) => {
  const queryClient = createQueryClient();

  const props: React.ComponentProps<typeof BaseQuickExportButton> = {
    product,
    status: 'not_started',
    prefetchListings: vi.fn(),
    showMarketplaceBadge: false,
    onOpenIntegrations: undefined,
    onOpenExportSettings: undefined,
    ...overrides,
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <BaseQuickExportButton {...props} />
    </QueryClientProvider>
  );
};

const setupDefaultApiMocks = (): void => {
  apiGetMock.mockImplementation((url: string) => {
    if (url.startsWith('/api/v2/integrations/exports/base/default-connection')) {
      return Promise.resolve({ connectionId: 'conn-base-1' });
    }
    if (url.startsWith('/api/v2/integrations/exports/base/default-inventory')) {
      return Promise.resolve({ inventoryId: 'inv-main' });
    }
    if (url.startsWith('/api/v2/integrations/exports/base/active-template')) {
      return Promise.resolve({ templateId: null });
    }
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });

  apiPostMock.mockImplementation((url: string) => {
    if (url === '/api/v2/integrations/imports/base') {
      return Promise.resolve({
        inventories: [{ id: 'inv-main', name: 'Main inventory', is_default: true }],
      });
    }
    return Promise.reject(new Error(`Unexpected POST ${url}`));
  });

  mutateAsyncMock.mockResolvedValue({ success: true });
  invalidateProductListingsAndBadgesMock.mockResolvedValue(undefined);
};

describe('BaseQuickExportButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultApiMocks();
  });

  it('opens decision modal when SKU already exists in Base.com', async () => {
    apiPostMock.mockImplementation((url: string) => {
      if (url === '/api/v2/integrations/imports/base') {
        return Promise.resolve({
          inventories: [{ id: 'inv-main', name: 'Main inventory', is_default: true }],
        });
      }
      if (url === '/api/v2/integrations/products/product-1/base/sku-check') {
        return Promise.resolve({
          sku: 'SKU-001',
          exists: true,
          existingProductId: 'base-123',
        });
      }
      return Promise.reject(new Error(`Unexpected POST ${url}`));
    });

    renderButton();

    fireEvent.click(screen.getByRole('button', { name: 'One-click export to Base.com' }));

    await screen.findByRole('dialog');
    expect(screen.getByText('SKU already exists in Base.com')).toBeInTheDocument();
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it('links existing product and invalidates listing caches', async () => {
    apiPostMock.mockImplementation((url: string) => {
      if (url === '/api/v2/integrations/imports/base') {
        return Promise.resolve({
          inventories: [{ id: 'inv-main', name: 'Main inventory', is_default: true }],
        });
      }
      if (url === '/api/v2/integrations/products/product-1/base/sku-check') {
        return Promise.resolve({
          sku: 'SKU-001',
          exists: true,
          existingProductId: 'base-123',
        });
      }
      if (url === '/api/v2/integrations/products/product-1/base/link-existing') {
        return Promise.resolve({
          linked: true,
          listingId: 'listing-77',
          externalListingId: 'base-123',
        });
      }
      return Promise.reject(new Error(`Unexpected POST ${url}`));
    });

    renderButton();

    fireEvent.click(screen.getByRole('button', { name: 'One-click export to Base.com' }));

    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: 'Link existing product' }));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith(
        '/api/v2/integrations/products/product-1/base/link-existing',
        {
          connectionId: 'conn-base-1',
          inventoryId: 'inv-main',
          externalListingId: 'base-123',
        }
      );
    });

    expect(invalidateProductListingsAndBadgesMock).toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith('Linked to existing Base.com product.', {
      variant: 'success',
    });
  });

  it('opens integrations flow when choosing setup new connection', async () => {
    const onOpenIntegrations = vi.fn();

    apiPostMock.mockImplementation((url: string) => {
      if (url === '/api/v2/integrations/imports/base') {
        return Promise.resolve({
          inventories: [{ id: 'inv-main', name: 'Main inventory', is_default: true }],
        });
      }
      if (url === '/api/v2/integrations/products/product-1/base/sku-check') {
        return Promise.resolve({
          sku: 'SKU-001',
          exists: true,
          existingProductId: 'base-123',
        });
      }
      return Promise.reject(new Error(`Unexpected POST ${url}`));
    });

    renderButton({ onOpenIntegrations });

    fireEvent.click(screen.getByRole('button', { name: 'One-click export to Base.com' }));

    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: 'Set up new connection' }));

    expect(onOpenIntegrations).toHaveBeenCalledTimes(1);
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it('stops flow and shows error when SKU check fails', async () => {
    apiPostMock.mockImplementation((url: string) => {
      if (url === '/api/v2/integrations/imports/base') {
        return Promise.resolve({
          inventories: [{ id: 'inv-main', name: 'Main inventory', is_default: true }],
        });
      }
      if (url === '/api/v2/integrations/products/product-1/base/sku-check') {
        return Promise.reject(new Error('SKU check failed'));
      }
      return Promise.reject(new Error(`Unexpected POST ${url}`));
    });

    renderButton();

    fireEvent.click(screen.getByRole('button', { name: 'One-click export to Base.com' }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith('SKU check failed', {
        variant: 'error',
      });
    });

    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it('continues one-click export when SKU does not exist in Base.com', async () => {
    apiPostMock.mockImplementation((url: string) => {
      if (url === '/api/v2/integrations/imports/base') {
        return Promise.resolve({
          inventories: [{ id: 'inv-main', name: 'Main inventory', is_default: true }],
        });
      }
      if (url === '/api/v2/integrations/products/product-1/base/sku-check') {
        return Promise.resolve({
          sku: 'SKU-001',
          exists: false,
          existingProductId: null,
        });
      }
      return Promise.reject(new Error(`Unexpected POST ${url}`));
    });

    renderButton();

    fireEvent.click(screen.getByRole('button', { name: 'One-click export to Base.com' }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'product-1',
          connectionId: 'conn-base-1',
          inventoryId: 'inv-main',
        })
      );
    });

    expect(toastMock).toHaveBeenCalledWith('Base.com export started.', {
      variant: 'success',
    });
  });

  it('repairs a missing saved inventory when the connection has a default inventory', async () => {
    apiGetMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/v2/integrations/exports/base/default-connection')) {
        return Promise.resolve({ connectionId: 'conn-base-1' });
      }
      if (url.startsWith('/api/v2/integrations/exports/base/default-inventory')) {
        return Promise.resolve({ inventoryId: null });
      }
      if (url.startsWith('/api/v2/integrations/exports/base/active-template')) {
        return Promise.resolve({ templateId: null });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    apiPostMock.mockImplementation((url: string) => {
      if (url === '/api/v2/integrations/imports/base') {
        return Promise.resolve({
          inventories: [{ id: 'inv-main', name: 'Main inventory', is_default: true }],
        });
      }
      if (url === '/api/v2/integrations/exports/base/default-inventory') {
        return Promise.resolve({ inventoryId: 'inv-main' });
      }
      if (url === '/api/v2/integrations/products/product-1/base/sku-check') {
        return Promise.resolve({
          sku: 'SKU-001',
          exists: false,
          existingProductId: null,
        });
      }
      return Promise.reject(new Error(`Unexpected POST ${url}`));
    });

    renderButton();

    fireEvent.click(screen.getByRole('button', { name: 'One-click export to Base.com' }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'product-1',
          connectionId: 'conn-base-1',
          inventoryId: 'inv-main',
        })
      );
    });

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith(
        '/api/v2/integrations/exports/base/default-inventory',
        {
          inventoryId: 'inv-main',
        }
      );
    });
  });

  it('repairs a stale saved inventory when the connection has a default inventory', async () => {
    apiGetMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/v2/integrations/exports/base/default-connection')) {
        return Promise.resolve({ connectionId: 'conn-base-1' });
      }
      if (url.startsWith('/api/v2/integrations/exports/base/default-inventory')) {
        return Promise.resolve({ inventoryId: 'inv-stale' });
      }
      if (url.startsWith('/api/v2/integrations/exports/base/active-template')) {
        return Promise.resolve({ templateId: null });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    apiPostMock.mockImplementation((url: string) => {
      if (url === '/api/v2/integrations/imports/base') {
        return Promise.resolve({
          inventories: [{ id: 'inv-main', name: 'Main inventory', is_default: true }],
        });
      }
      if (url === '/api/v2/integrations/exports/base/default-inventory') {
        return Promise.resolve({ inventoryId: 'inv-main' });
      }
      if (url === '/api/v2/integrations/products/product-1/base/sku-check') {
        return Promise.resolve({
          sku: 'SKU-001',
          exists: false,
          existingProductId: null,
        });
      }
      return Promise.reject(new Error(`Unexpected POST ${url}`));
    });

    renderButton();

    fireEvent.click(screen.getByRole('button', { name: 'One-click export to Base.com' }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'product-1',
          connectionId: 'conn-base-1',
          inventoryId: 'inv-main',
        })
      );
    });

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith(
        '/api/v2/integrations/exports/base/default-inventory',
        {
          inventoryId: 'inv-main',
        }
      );
    });
  });

  it('opens Base export settings instead of re-exporting when the product is already exported', () => {
    const onOpenExportSettings = vi.fn();

    renderButton({
      status: 'active',
      showMarketplaceBadge: true,
      onOpenExportSettings,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Open Base.com listing actions (active).' }));

    expect(onOpenExportSettings).toHaveBeenCalledTimes(1);
    expect(mutateAsyncMock).not.toHaveBeenCalled();
    expect(apiPostMock).not.toHaveBeenCalledWith(
      '/api/v2/integrations/products/product-1/base/sku-check',
      expect.anything()
    );
  });
});
