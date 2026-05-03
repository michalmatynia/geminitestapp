'use client';

import type { ProductWithImages } from '@/shared/contracts/products/product';

import { createStrictViewContext } from '../../createStrictViewContext';

type MassListProductModalViewContextValue = {
  productIds: string[];
  products: ProductWithImages[];
  integrationId: string;
  connectionId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export const {
  Provider: MassListProductModalViewProvider,
  useValue: useMassListProductModalViewContext,
} = createStrictViewContext<MassListProductModalViewContextValue>({
  providerName: 'MassListProductModalViewProvider',
  errorMessage:
    'useMassListProductModalViewContext must be used within MassListProductModalViewProvider',
});
