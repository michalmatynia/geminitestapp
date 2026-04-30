import type { QueryClient } from '@tanstack/react-query';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { SingleQuery } from '@/shared/contracts/ui/queries';

export type ProductListCacheEntry =
  | ProductWithImages[]
  | { items?: ProductWithImages[] | null; products?: ProductWithImages[] | null }
  | null
  | undefined;

export type ProductEditHydrationInput = {
  editingProduct: ProductWithImages | null;
  setEditingProduct: (product: ProductWithImages | null) => void;
  setActionError: (error: string | null) => void;
  setRefreshTrigger: Dispatch<SetStateAction<number>>;
  clearProductEditorQueryParams: () => void;
};

export type ProductEditHydrationResult = {
  isEditHydrating: boolean;
  handleOpenEditModal: (product: ProductWithImages) => void;
  handleCloseEdit: () => void;
  prefetchProductDetail: (productId: string) => void;
  editingProductDetailQuery: SingleQuery<ProductWithImages>;
};

export type ProductEditHydrationRefs = {
  editOpenRequestTokenRef: MutableRefObject<number>;
  openingProductFromQueryRef: MutableRefObject<string | null>;
};

export type ProductEditHydrationToast = (
  message: string,
  options: { variant: 'error' | 'warning' }
) => void;

export type ProductEditHydrationQueryClientInput = {
  queryClient: QueryClient;
};
