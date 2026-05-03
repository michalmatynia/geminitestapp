import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductParseActionsMatchResponse } from '@/shared/contracts/products/parse-actions';

const {
  markClosedMutateAsyncMock,
  matchMutateAsyncMock,
  toastMock,
} = vi.hoisted(() => ({
  markClosedMutateAsyncMock: vi.fn(),
  matchMutateAsyncMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('@/features/products/hooks/useProductParseActionsMutations', () => ({
  useMatchProductParseActions: () => ({
    mutateAsync: matchMutateAsyncMock,
    isPending: false,
  }),
  useMarkParsedTraderaMatchesClosed: () => ({
    mutateAsync: markClosedMutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock('@/shared/ui/app-modal', () => ({
  AppModal: ({
    children,
    footer,
    isOpen,
  }: {
    children?: React.ReactNode;
    footer?: React.ReactNode;
    isOpen?: boolean;
  }) =>
    isOpen ? (
      <div role='dialog'>
        <div>{children}</div>
        <div>{footer}</div>
      </div>
    ) : null,
}));

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

import { ProductParseActionsModal } from './ProductParseActionsModal';

const buildMatchedResponse = (): ProductParseActionsMatchResponse => ({
  source: 'tradera',
  parsedCount: 4,
  matchedCount: 3,
  actionableCount: 2,
  rows: [
    {
      row: {
        rowId: 'row-1',
        source: 'tradera',
        title: 'Link | 3 cm | Metal | Gaming Pin | Zelda',
        normalizedTitle: 'link 3 cm metal gaming pin zelda',
        objectNumber: '727745365',
        status: 'closed',
        currency: 'EUR',
        price: 6.17,
        rawPrice: 'EUR 6.17',
        rawText: 'row 1',
      },
      matchStatus: 'confirmed',
      confidence: 1,
      reason: 'title match',
      product: { id: 'product-1', sku: 'SKU-1', name: 'Link Pin' },
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'tradera',
        externalListingId: '727745365',
        status: 'active',
      },
      candidates: [],
    },
    {
      row: {
        rowId: 'row-2',
        source: 'tradera',
        title: 'Hornet | 4 cm | Metal | Gaming Pin | Hollow Knight',
        normalizedTitle: 'hornet 4 cm metal gaming pin hollow knight',
        objectNumber: '728085528',
        status: 'closed',
        currency: 'EUR',
        price: 7.28,
        rawPrice: 'EUR 7.28',
        rawText: 'row 2',
      },
      matchStatus: 'confirmed',
      confidence: 1,
      reason: 'title match',
      product: { id: 'product-2', sku: 'SKU-2', name: 'Hornet Pin' },
      listing: null,
      candidates: [],
    },
    {
      row: {
        rowId: 'row-3',
        source: 'tradera',
        title: 'Link | 3 cm | Metal | Gaming Pin | Zelda',
        normalizedTitle: 'link 3 cm metal gaming pin zelda',
        objectNumber: '727745366',
        status: 'closed',
        currency: 'EUR',
        price: 6.17,
        rawPrice: 'EUR 6.17',
        rawText: 'row 3',
      },
      matchStatus: 'confirmed',
      confidence: 1,
      reason: 'duplicate title match',
      product: { id: 'product-1', sku: 'SKU-1', name: 'Link Pin' },
      listing: null,
      candidates: [],
    },
    {
      row: {
        rowId: 'row-4',
        source: 'tradera',
        title: 'Ambiguous listing',
        normalizedTitle: 'ambiguous listing',
        objectNumber: null,
        status: null,
        currency: null,
        price: null,
        rawPrice: null,
        rawText: 'row 4',
      },
      matchStatus: 'ambiguous',
      confidence: 0.5,
      reason: 'multiple candidates',
      product: { id: 'product-3', sku: 'SKU-3', name: 'Ambiguous Pin' },
      listing: null,
      candidates: [{ id: 'product-3', sku: 'SKU-3', name: 'Ambiguous Pin' }],
    },
  ],
});

describe('ProductParseActionsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    matchMutateAsyncMock.mockResolvedValue(buildMatchedResponse());
  });

  it('finds unique confirmed product matches after parsing', async () => {
    const onFindMatches = vi.fn();

    render(
      <ProductParseActionsModal
        isOpen
        onClose={vi.fn()}
        onFindMatches={onFindMatches}
      />
    );

    expect(screen.getByRole('button', { name: 'Find Products' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Marketplace text'), {
      target: { value: 'pasted marketplace listing text' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Parse Preview' }));

    await waitFor(() => {
      expect(matchMutateAsyncMock).toHaveBeenCalledWith({
        source: 'tradera',
        text: 'pasted marketplace listing text',
      });
    });

    expect(await screen.findByText('Unique products')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Find 2 Products (3 rows)' }));

    expect(onFindMatches).toHaveBeenCalledWith(['product-1', 'product-2'], {
      matchedRowCount: 3,
    });
  });
});
