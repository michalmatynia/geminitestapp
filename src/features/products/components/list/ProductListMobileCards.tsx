'use client';

import { useQueryClient } from '@tanstack/react-query';
import { memo, useCallback } from 'react';
import type React from 'react';

import {
  useProductListRowActionsContext,
  useProductListRowRuntime,
  useProductListRowVisualsContext,
  useProductListSelectionContext,
} from '@/features/products/context/ProductListContext';
import type { ProductWithImages } from '@/shared/contracts/products/product';

import { ProductListMobileCardView } from './ProductListMobileCard.view';
import { resolveProductListMobileCardModel } from './ProductListMobileCards.model';
import { prefetchProductListings } from './ProductListMobileCards.prefetch';
import type { ProductListMobileCardOwnProps } from './ProductListMobileCards.types';

const ProductListMobileCard = memo(({
  product,
  isSelected,
  toggleSelection,
  prefetchListings,
}: ProductListMobileCardOwnProps): React.JSX.Element => {
  const rowActions = useProductListRowActionsContext();
  const rowVisuals = useProductListRowVisualsContext();
  const rowRuntime = useProductListRowRuntime(product.id, product.baseProductId);
  const model = resolveProductListMobileCardModel({ product, rowVisuals });

  return (
    <ProductListMobileCardView
      product={product}
      isSelected={isSelected}
      toggleSelection={toggleSelection}
      prefetchListings={prefetchListings}
      rowActions={rowActions}
      rowVisuals={rowVisuals}
      rowRuntime={rowRuntime}
      model={model}
    />
  );
});

ProductListMobileCard.displayName = 'ProductListMobileCard';

export const ProductListMobileCards = memo((): React.JSX.Element => {
  const { data, rowSelection, setRowSelection } = useProductListSelectionContext();
  const queryClient = useQueryClient();

  const toggleSelection = useCallback(
    (productId: string, nextChecked: boolean): void => {
      setRowSelection((prev) => {
        const next = { ...prev };
        if (nextChecked) {
          next[productId] = true;
        } else {
          delete next[productId];
        }
        return next;
      });
    },
    [setRowSelection]
  );

  const prefetchListings = useCallback(
    (productId: string): void => {
      prefetchProductListings(queryClient, productId);
    },
    [queryClient]
  );

  return (
    <ul className='space-y-3'>
      {data.map((product: ProductWithImages) => (
        <ProductListMobileCard
          key={product.id}
          product={product}
          isSelected={rowSelection[product.id] === true}
          toggleSelection={toggleSelection}
          prefetchListings={prefetchListings}
        />
      ))}
    </ul>
  );
});

ProductListMobileCards.displayName = 'ProductListMobileCards';
