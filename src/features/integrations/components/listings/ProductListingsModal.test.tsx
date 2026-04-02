/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { productListingsProviderPropsMock } = vi.hoisted(() => ({
  productListingsProviderPropsMock: vi.fn(),
}));

vi.mock('@/features/integrations/context/ProductListingsContext', () => ({
  ProductListingsProvider: ({
    children: _children,
    ...props
  }: {
    children?: React.ReactNode;
    product: unknown;
    onClose: () => void;
    onStartListing?: unknown;
    onListingsUpdated?: unknown;
    filterIntegrationSlug?: string | null | undefined;
    recoveryContext?: unknown;
  }) => {
    productListingsProviderPropsMock(props);
    return <div data-testid='product-listings-provider' />;
  },
  useProductListingsData: () => {
    throw new Error('useProductListingsData should not be called in this test');
  },
  useProductListingsLogs: () => {
    throw new Error('useProductListingsLogs should not be called in this test');
  },
  useProductListingsModals: () => {
    throw new Error('useProductListingsModals should not be called in this test');
  },
}));

vi.mock('./product-listings-modal/context/ProductListingsModalViewContext', async () => {
  const ReactModule = await import('react');

  type ModalViewValue = {
    product: unknown;
    onClose: () => void;
    onStartListing?: unknown;
    filterIntegrationSlug?: string | null | undefined;
    onListingsUpdated?: unknown;
    recoveryContext?: unknown;
  };

  const Context = ReactModule.createContext<ModalViewValue | null>(null);

  return {
    ProductListingsModalViewProvider: ({
      value,
      children,
    }: {
      value: ModalViewValue;
      children: React.ReactNode;
    }) => <Context.Provider value={value}>{children}</Context.Provider>,
    useProductListingsModalViewContext: () => {
      const value = ReactModule.useContext(Context);
      if (!value) {
        throw new Error('Missing ProductListingsModalViewContext value');
      }
      return value;
    },
  };
});

import { ProductListingsModal } from './ProductListingsModal';

describe('ProductListingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('derives the marketplace filter from recovery context when the explicit filter is missing', () => {
    render(
      <ProductListingsModal
        isOpen={true}
        item={
          {
            id: 'product-1',
            name: 'Product 1',
          } as never
        }
        onClose={vi.fn()}
        recoveryContext={{
          source: 'tradera_quick_export_failed',
          integrationSlug: 'tradera',
          status: 'failed',
          runId: 'run-tradera-1',
        }}
      />
    );

    expect(productListingsProviderPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        filterIntegrationSlug: 'tradera',
        recoveryContext: expect.objectContaining({
          source: 'tradera_quick_export_failed',
          integrationSlug: 'tradera',
        }),
      })
    );
  });

  it('keeps an explicit marketplace filter over the recovery-context fallback', () => {
    render(
      <ProductListingsModal
        isOpen={true}
        item={
          {
            id: 'product-1',
            name: 'Product 1',
          } as never
        }
        onClose={vi.fn()}
        filterIntegrationSlug='playwright-programmable'
        recoveryContext={{
          source: 'tradera_quick_export_failed',
          integrationSlug: 'tradera',
          status: 'failed',
          runId: 'run-tradera-1',
        }}
      />
    );

    expect(productListingsProviderPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        filterIntegrationSlug: 'playwright-programmable',
      })
    );
  });
});
