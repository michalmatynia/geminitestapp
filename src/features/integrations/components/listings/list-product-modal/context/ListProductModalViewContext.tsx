'use client';

import type { ProductWithImages } from '@/shared/contracts/products';
import { createStrictViewContext } from '../../createStrictViewContext';

type ListProductModalViewContextValue = {
  product: ProductWithImages;
  onClose: () => void;
  onSuccess: () => void;
  hasPresetSelection: boolean;
  autoSubmitOnOpen: boolean;
};

export const {
  Provider: ListProductModalViewProvider,
  useValue: useListProductModalViewContext,
} = createStrictViewContext<ListProductModalViewContextValue>({
  providerName: 'ListProductModalViewProvider',
  errorMessage: 'useListProductModalViewContext must be used within ListProductModalViewProvider',
});
