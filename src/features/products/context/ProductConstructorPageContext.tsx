'use client';

import { createContext, useContext } from 'react';

import type { CatalogRecord, ProductParameter } from '@/shared/contracts/products';
import { internalError } from '@/shared/errors/app-error';

export type ProductConstructorParametersSection = {
  loading: boolean;
  parameters: ProductParameter[];
  catalogs: CatalogRecord[];
  selectedCatalogId: string | null;
  onCatalogChange: (catalogId: string) => void;
  onRefresh: () => void;
};

type ProductConstructorPageContextValue = {
  parameters: ProductConstructorParametersSection;
};

const ProductConstructorPageContext = createContext<ProductConstructorPageContextValue | null>(
  null
);

export function ProductConstructorPageProvider({
  value,
  children,
}: {
  value: ProductConstructorPageContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <ProductConstructorPageContext.Provider value={value}>
      {children}
    </ProductConstructorPageContext.Provider>
  );
}

function useProductConstructorPageContext(): ProductConstructorPageContextValue {
  const context = useContext(ProductConstructorPageContext);
  if (!context) {
    throw internalError(
      'useProductConstructorPageContext must be used within ProductConstructorPageProvider'
    );
  }
  return context;
}

export function useProductConstructorParametersSection(): ProductConstructorParametersSection {
  return useProductConstructorPageContext().parameters;
}
