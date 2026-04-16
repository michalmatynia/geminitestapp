'use client';
// ProductLeafCategoriesContextRegistrySource: small page-context source used by
// the AI context registry. Exposes leaf category and catalog information from
// product form metadata to downstream AI prompt enrichers and context resolvers.

import { useMemo } from 'react';

import { useProductFormMetadataState } from '@/features/products/context/ProductFormMetadataContext';
import { useRegisterContextRegistryPageSource } from '@/shared/lib/ai-context-registry/page-context';

import { buildProductLeafCategoriesContextBundle } from './workspace';

export function ProductLeafCategoriesContextRegistrySource(props: {
  sourceId?: string;
}): null {
  const { sourceId = 'product-leaf-categories' } = props;
  const { categories, catalogs, selectedCatalogIds } = useProductFormMetadataState();

  const source = useMemo(
    () => ({
      refs: [],
      resolved: buildProductLeafCategoriesContextBundle({
        categories,
        catalogs,
        selectedCatalogIds,
      }),
    }),
    [catalogs, categories, selectedCatalogIds]
  );

  useRegisterContextRegistryPageSource(sourceId, source);
  return null;
}
