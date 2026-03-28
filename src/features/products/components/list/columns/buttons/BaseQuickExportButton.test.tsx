import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products';
import { ApiError } from '@/shared/lib/api-client';

const {
  toastMock,
  apiGetMock,
  apiPostMock,
  mutateAsyncMock,
  fetchPreferredBaseConnectionMock,
  fetchIntegrationsWithConnectionsMock,
  invalidateProductListingsAndBadgesMock,
  subscribeToTrackedAiPathRunMock,
  trackedRunListeners,
} = vi.hoisted(() => ({
  toastMock: vi.fn(),
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  mutateAsyncMock: vi.fn(),
  fetchPreferredBaseConnectionMock: vi.fn(),
  fetchIntegrationsWithConnectionsMock: vi.fn(),
  invalidateProductListingsAndBadgesMock: vi.fn(),
  subscribeToTrackedAiPathRunMock: vi.fn(),
  trackedRunListeners: new Map<string, (snapshot: Record<string, unknown>) => void>(),
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

vi.mock('@/shared/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/api-client')>();
  return {
    ...actual,
    api: {
      get: (...args: unknown[]) => apiGetMock(...args) as Promise<unknown>,
      post: (...args: unknown[]) => apiPostMock(...args) as Promise<unknown>,
    },
  };
});

vi.mock('@/features/integrations/product-integrations-adapter', () => ({
  fetchPreferredBaseConnection: (...args: unknown[]) =>
    fetchPreferredBaseConnectionMock(...args) as Promise<unknown>,
  fetchIntegrationsWithConnections: (...args: unknown[]) =>
    fetchIntegrationsWithConnectionsMock(...args) as Promise<unknown>,
  integrationSelectionQueryKeys: {
    defaultConnection: ['integrations', 'default-connection'],
    withConnections: ['integrations', 'with-connections'],
  },
  isBaseIntegrationSlug: (value: string | null | undefined) =>
    ['baselinker', 'base-com', 'base'].includes((value ?? '').trim().toLowerCase()),
  useGenericExportToBaseMutation: () => ({
    isPending: false,
    mutateAsync: mutateAsyncMock,
  }),
}));

vi.mock('@/shared/lib/query-invalidation', () => ({
  invalidateProductListingsAndBadges: (...args: unknown[]) =>
    invalidateProductListingsAndBadgesMock(...args) as Promise<void>,
}));

vi.mock('@/shared/lib/ai-paths/client-run-tracker', () => ({
  subscribeToTrackedAiPathRun: (...args: unknown[]) =>
    subscribeToTrackedAiPathRunMock(...args),
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
    trackedRunListeners.clear();
    window.sessionStorage.clear();
    fetchPreferredBaseConnectionMock.mockResolvedValue({ connectionId: 'conn-base-1' });
    fetchIntegrationsWithConnectionsMock.mockResolvedValue([
      {
        id: 'integration-base-1',
        name: 'Base.com',
        slug: 'base-com',
        connections: [
          {
            id: 'conn-base-1',
            name: 'Base connection',
            integrationId: 'integration-base-1',
          },
        ],
      },
    ]);
    setupDefaultApiMocks();
    subscribeToTrackedAiPathRunMock.mockImplementation(
      (
        runId: string,
        listener: (snapshot: Record<string, unknown>) => void,
        options?: { initialSnapshot?: Record<string, unknown> }
      ) => {
        trackedRunListeners.set(runId, listener);
        if (options?.initialSnapshot) {
          listener({
            trackingState: 'active',
            updatedAt: '2026-03-23T12:00:00.000Z',
            finishedAt: null,
            errorMessage: null,
            entityId: product.id,
            entityType: 'product',
            ...options.initialSnapshot,
          });
        }
        return () => {
          trackedRunListeners.delete(runId);
        };
      }
    );
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

  it('continues export when loading the scoped active template fails', async () => {
    apiGetMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/v2/integrations/exports/base/default-inventory')) {
        return Promise.resolve({ inventoryId: 'inv-main' });
      }
      if (url.startsWith('/api/v2/integrations/exports/base/active-template')) {
        return Promise.reject(new Error('Active template unavailable'));
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

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

    expect(mutateAsyncMock).toHaveBeenCalledWith(
      expect.not.objectContaining({
        templateId: expect.any(String),
      })
    );
    expect(toastMock).toHaveBeenCalledWith('Base.com export started.', {
      variant: 'success',
    });
  });

  it('repairs a missing default Base.com connection when only one valid Base connection exists', async () => {
    fetchPreferredBaseConnectionMock.mockResolvedValue({ connectionId: null });

    apiPostMock.mockImplementation((url: string) => {
      if (url === '/api/v2/integrations/exports/base/default-connection') {
        return Promise.resolve({ connectionId: 'conn-base-1' });
      }
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
      expect(apiPostMock).toHaveBeenCalledWith(
        '/api/v2/integrations/exports/base/default-connection',
        {
          connectionId: 'conn-base-1',
        }
      );
    });

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'product-1',
          connectionId: 'conn-base-1',
          inventoryId: 'inv-main',
        })
      );
    });
  });

  it('continues export when integrations-with-connections fallback lookup fails', async () => {
    fetchIntegrationsWithConnectionsMock.mockRejectedValue(
      new Error('Integrations list temporarily unavailable')
    );

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
  });

  it('continues export when inventory lookup fails but a saved inventory is already configured', async () => {
    apiGetMock.mockImplementation((url: string) => {
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
        return Promise.reject(new Error('A connected service did not respond. Try again shortly.'));
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

  it('stops export and surfaces a blocked Base account when inventory lookup reports it', async () => {
    apiGetMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/v2/integrations/exports/base/default-inventory')) {
        return Promise.resolve({ inventoryId: 'inv-main' });
      }
      if (url.startsWith('/api/v2/integrations/exports/base/active-template')) {
        return Promise.resolve({ templateId: null });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    const blockedAccountError = new ApiError(
      'Base.com account for this connection is blocked. Unblock it in Base.com and retry.',
      400
    );
    blockedAccountError.payload = {
      code: 'INTEGRATION_ERROR',
      details: {
        errorCode: 'ERROR_USER_ACCOUNT_BLOCKED',
      },
    };

    apiPostMock.mockImplementation((url: string) => {
      if (url === '/api/v2/integrations/imports/base') {
        return Promise.reject(blockedAccountError);
      }
      return Promise.reject(new Error(`Unexpected POST ${url}`));
    });

    renderButton();

    fireEvent.click(screen.getByRole('button', { name: 'One-click export to Base.com' }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        'Base.com account for this connection is blocked. Unblock it in Base.com and retry.',
        { variant: 'error' }
      );
    });

    expect(mutateAsyncMock).not.toHaveBeenCalled();
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

  it('opens integration options instead of re-exporting when the Base row state is failed', () => {
    const onOpenIntegrations = vi.fn();

    renderButton({
      status: 'failed',
      showMarketplaceBadge: false,
      onOpenIntegrations,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Open Base.com recovery options (failed).' }));

    expect(onOpenIntegrations).toHaveBeenCalledWith({
      source: 'base_quick_export_failed',
      integrationSlug: 'baselinker',
      status: 'failed',
      runId: null,
    });
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it('opens integration options instead of re-exporting when the latest quick export failed', async () => {
    const onOpenIntegrations = vi.fn();

    window.sessionStorage.setItem(
      'base-quick-export-feedback',
      JSON.stringify({
        'product-1': {
          productId: 'product-1',
          runId: 'run-failed-retry',
          status: 'failed',
          expiresAt: Date.now() + 60_000,
        },
      })
    );

    renderButton({
      status: 'not_started',
      showMarketplaceBadge: false,
      onOpenIntegrations,
    });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Open Base.com recovery options (failed).' })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Open Base.com recovery options (failed).' }));

    expect(onOpenIntegrations).toHaveBeenCalledWith({
      source: 'base_quick_export_failed',
      integrationSlug: 'baselinker',
      status: 'failed',
      runId: 'run-failed-retry',
    });
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it('prefers authoritative exported row state over stale failed quick-export feedback', async () => {
    window.sessionStorage.setItem(
      'base-quick-export-feedback',
      JSON.stringify({
        'product-1': {
          productId: 'product-1',
          runId: 'run-failed-old',
          status: 'failed',
          expiresAt: Date.now() + 60_000,
        },
      })
    );

    renderButton({
      status: 'active',
      showMarketplaceBadge: true,
      onOpenExportSettings: vi.fn(),
    });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Open Base.com listing actions (active).' })
      ).toHaveClass('border-emerald-400/70');
    });

    expect(screen.queryByRole('button', { name: 'Base.com export failed.' })).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem('base-quick-export-feedback')).toBeNull();
  });

  it('does not resurrect stale failed quick-export feedback after remount when the row is exported', async () => {
    window.sessionStorage.setItem(
      'base-quick-export-feedback',
      JSON.stringify({
        'product-1': {
          productId: 'product-1',
          runId: 'run-failed-old',
          status: 'failed',
          expiresAt: Date.now() + 60_000,
        },
      })
    );

    const firstRender = renderButton({
      status: 'active',
      showMarketplaceBadge: true,
      onOpenExportSettings: vi.fn(),
    });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Open Base.com listing actions (active).' })
      ).toHaveClass('border-emerald-400/70');
    });

    firstRender.unmount();

    renderButton({
      status: 'active',
      showMarketplaceBadge: true,
      onOpenExportSettings: vi.fn(),
    });

    expect(
      screen.getByRole('button', { name: 'Open Base.com listing actions (active).' })
    ).toHaveClass('border-emerald-400/70');
    expect(screen.queryByRole('button', { name: 'Base.com export failed.' })).not.toBeInTheDocument();
  });

  it('reflects queued, running, and completed export run states on the button', async () => {
    mutateAsyncMock.mockResolvedValue({
      success: true,
      status: 'queued',
      runId: 'run-export-1',
    });
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

    const button = screen.getByRole('button', { name: 'One-click export to Base.com' });
    fireEvent.click(button);

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
      expect(screen.getByRole('button', { name: 'Base.com export queued.' })).toHaveClass(
        'border-amber-400/70'
      );
    });
    expect(screen.getByRole('button', { name: 'Base.com export queued.' })).toBeDisabled();

    act(() => {
      trackedRunListeners.get('run-export-1')?.({
        runId: 'run-export-1',
        status: 'running',
        trackingState: 'active',
        updatedAt: '2026-03-23T12:00:05.000Z',
        finishedAt: null,
        errorMessage: null,
        entityId: product.id,
        entityType: 'product',
      });
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Base.com export running.' })).toHaveClass(
        'border-cyan-400/70'
      );
    });
    expect(screen.getByRole('button', { name: 'Base.com export running.' })).toBeDisabled();

    act(() => {
      trackedRunListeners.get('run-export-1')?.({
        runId: 'run-export-1',
        status: 'completed',
        trackingState: 'stopped',
        updatedAt: '2026-03-23T12:00:10.000Z',
        finishedAt: '2026-03-23T12:00:10.000Z',
        errorMessage: null,
        entityId: product.id,
        entityType: 'product',
      });
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Base.com export completed.' })).toHaveClass(
        'border-emerald-400/70'
      );
    });
    expect(screen.getByRole('button', { name: 'Base.com export completed.' })).not.toBeDisabled();
  });

  it('rehydrates the most recent export run after the button remounts', async () => {
    mutateAsyncMock.mockResolvedValue({
      success: true,
      status: 'queued',
      runId: 'run-export-remount',
    });
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

    const firstRender = renderButton();
    fireEvent.click(screen.getByRole('button', { name: 'One-click export to Base.com' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Base.com export queued.' })).toHaveClass(
        'border-amber-400/70'
      );
    });

    firstRender.unmount();
    trackedRunListeners.clear();

    renderButton();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Base.com export queued.' })).toHaveClass(
        'border-amber-400/70'
      );
    });
    expect(subscribeToTrackedAiPathRunMock).toHaveBeenCalledWith(
      'run-export-remount',
      expect.any(Function),
      expect.objectContaining({
        initialSnapshot: expect.objectContaining({
          runId: 'run-export-remount',
          status: 'queued',
        }),
      })
    );
  });
});
