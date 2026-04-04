/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useProductListingsDataMock,
  useProductListingsUIStateMock,
  useProductListingsModalsMock,
} = vi.hoisted(() => ({
  useProductListingsDataMock: vi.fn(),
  useProductListingsUIStateMock: vi.fn(),
  useProductListingsModalsMock: vi.fn(),
}));

vi.mock('@/features/integrations/context/ProductListingsContext', () => ({
  useProductListingsData: () => useProductListingsDataMock(),
  useProductListingsUIState: () => useProductListingsUIStateMock(),
  useProductListingsModals: () => useProductListingsModalsMock(),
}));

import { ProductListingsSyncPanel } from './ProductListingsSyncPanel';

describe('ProductListingsSyncPanel', () => {
  const setIsSyncImagesConfirmOpen = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useProductListingsDataMock.mockReturnValue({
      product: {
        sku: 'SKU-1',
        name_en: 'Example product',
        description_en: 'Example description',
        price: 123,
        stock: 5,
        ean: 'EAN-1',
        weight: 100,
        imageLinks: [],
        images: [],
      },
      listings: [
        {
          id: 'listing-base-1',
          status: 'active',
          integration: {
            name: 'Base.com',
            slug: 'base-com',
          },
        },
      ],
    });
    useProductListingsUIStateMock.mockReturnValue({
      syncingImages: null,
    });
    useProductListingsModalsMock.mockReturnValue({
      setIsSyncImagesConfirmOpen,
    });
  });

  it('opens the Base image sync confirmation when the listing is idle', () => {
    render(<ProductListingsSyncPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Sync Image URLs' }));

    expect(setIsSyncImagesConfirmOpen).toHaveBeenCalledWith(true);
  });

  it('disables Base image sync while the listing export is queued or running', () => {
    useProductListingsDataMock.mockReturnValue({
      product: {
        sku: 'SKU-1',
        name_en: 'Example product',
        description_en: 'Example description',
        price: 123,
        stock: 5,
        ean: 'EAN-1',
        weight: 100,
        imageLinks: [],
        images: [],
      },
      listings: [
        {
          id: 'listing-base-1',
          status: 'pending',
          integration: {
            name: 'Base.com',
            slug: 'base-com',
          },
        },
      ],
    });

    render(<ProductListingsSyncPanel />);

    expect(screen.getByRole('button', { name: 'Sync Image URLs' })).toBeDisabled();
  });
});
