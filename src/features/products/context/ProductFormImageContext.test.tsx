// @vitest-environment jsdom

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products/product';

import {
  ProductFormImageProvider,
  useProductFormImageState,
} from './ProductFormImageContext';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

const createProduct = (overrides: Partial<ProductWithImages> = {}): ProductWithImages =>
  ({
    id: 'product-1',
    sku: 'SKU-1',
    baseProductId: null,
    defaultPriceGroupId: null,
    ean: null,
    gtin: null,
    asin: null,
    name: { en: 'Product 1', pl: null, de: null },
    description: { en: '', pl: null, de: null },
    name_en: 'Product 1',
    name_pl: null,
    name_de: null,
    description_en: null,
    description_pl: null,
    description_de: null,
    supplierName: null,
    supplierLink: null,
    priceComment: null,
    stock: 1,
    price: 10,
    sizeLength: null,
    sizeWidth: null,
    weight: null,
    length: null,
    published: false,
    categoryId: null,
    catalogId: '',
    tags: [],
    producers: [],
    images: [],
    catalogs: [],
    parameters: [],
    imageLinks: [],
    imageBase64s: [],
    noteIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }) as ProductWithImages;

function ProductImageStateProbe(): React.JSX.Element {
  const { productId } = useProductFormImageState();
  return <div data-testid='product-id'>{productId ?? 'none'}</div>;
}

function ProductFormImageProviderHarness({
  product,
}: {
  product?: ProductWithImages;
}): React.JSX.Element {
  return (
    <QueryClientProvider client={createQueryClient()}>
      <ProductFormImageProvider
        product={product}
        uploading={false}
        uploadError={null}
        uploadSuccess={false}
      >
        <ProductImageStateProbe />
      </ProductFormImageProvider>
    </QueryClientProvider>
  );
}

describe('ProductFormImageProvider', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('keeps a stable hook order when the product prop appears after initial render', () => {
    const { rerender } = render(<ProductFormImageProviderHarness />);

    expect(screen.getByTestId('product-id')).toHaveTextContent('none');

    rerender(<ProductFormImageProviderHarness product={createProduct()} />);

    expect(screen.getByTestId('product-id')).toHaveTextContent('product-1');
    expect(
      consoleErrorSpy.mock.calls.some((call) =>
        String(call[0]).includes('React has detected a change in the order of Hooks')
      )
    ).toBe(false);
  });
});
