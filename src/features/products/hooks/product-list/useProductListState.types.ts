import type { ProductListContextType } from '@/features/products/context/ProductListContext';
import type { ProductWithImages } from '@/shared/contracts/products/product';

export type ProductListStateReturn = ProductListContextType & {
  isDebugOpen: boolean;
  isMounted: boolean;
  rowRuntimeReady: boolean;
  triggerListingStatusHighlight: (productId: string) => void;
  productToDelete: ProductWithImages | null;
  setProductToDelete: (product: ProductWithImages | null) => void;
  isMassDeleteConfirmOpen: boolean;
  setIsMassDeleteConfirmOpen: (open: boolean) => void;
  handleMassDelete: () => Promise<void>;
  handleConfirmSingleDelete: () => Promise<void>;
  bulkDeletePending: boolean;
};
