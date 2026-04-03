'use client';

import type { ProductWithImages } from '@/shared/contracts/products';
import { createStrictViewContext } from '../../createStrictViewContext';

type SelectProductForListingModalContextValue = {
  isLoadingProducts: boolean;
  products: ProductWithImages[] | null | undefined;
  selectedProductId: string | null;
  setSelectedProductId: (productId: string | null) => void;
  productSearch: string;
  setProductSearch: (value: string) => void;
  error: string | null;
};

const {
  Provider: StrictSelectProductForListingModalProvider,
  useValue: useSelectProductForListingModalContext,
} = createStrictViewContext<SelectProductForListingModalContextValue>({
  providerName: 'SelectProductForListingModalProvider',
  errorMessage:
    'useSelectProductForListingModalContext must be used within SelectProductForListingModalProvider',
});

type SelectProductForListingModalProviderProps = SelectProductForListingModalContextValue & {
  children: React.ReactNode;
};

export function SelectProductForListingModalProvider({
  children,
  ...value
}: SelectProductForListingModalProviderProps): React.JSX.Element {
  return (
    <StrictSelectProductForListingModalProvider value={value}>
      {children}
    </StrictSelectProductForListingModalProvider>
  );
}

export { useSelectProductForListingModalContext };
