'use client';

import { useEffect } from 'react';

import type { Language } from '@/shared/contracts/internationalization';
import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { isEditingProductHydrated } from './editingProductHydration';

const areMetadataQueriesReady = (catalogsReady: boolean, languagesReady: boolean): boolean =>
  catalogsReady && languagesReady;

export const useProductMetadataFormGuard = ({
  catalogs,
  catalogsReady,
  filteredLanguages,
  languages,
  languagesReady,
  product,
  selectedCatalogIds,
}: {
  catalogs: CatalogRecord[];
  catalogsReady: boolean;
  filteredLanguages: Language[];
  languages: Language[];
  languagesReady: boolean;
  product: ProductWithImages | undefined;
  selectedCatalogIds: string[];
}): void => {
  useEffect(() => {
    if (product === undefined) return;
    if (!areMetadataQueriesReady(catalogsReady, languagesReady)) return;
    if (selectedCatalogIds.length === 0) return;
    if (languages.length === 0) return;
    if (filteredLanguages.length > 0) return;
    logClientError(new Error('[ProductForm] filteredLanguages empty after queries resolved'), {
      context: {
        service: 'products',
        category: 'form-guard',
        productId: product.id,
        isHydrated: isEditingProductHydrated(product),
        selectedCatalogIds,
        catalogsCount: catalogs.length,
        languagesCount: languages.length,
      },
    });
  }, [catalogs, catalogsReady, filteredLanguages, languages, languagesReady, product,
    selectedCatalogIds]);
};
