'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { Dispatch, SetStateAction } from 'react';

import type { ProductWithImages } from '@/features/products';
import { api } from '@/shared/lib/api-client';
import { invalidateListingBadges } from '@/shared/lib/query-invalidation';

import { listingBadgesQueryKey } from './listingCache';

export function useIntegrationOperations(): {
  integrationsProduct: ProductWithImages | null;
  setIntegrationsProduct: Dispatch<SetStateAction<ProductWithImages | null>>;
  showListProductModal: boolean;
  setShowListProductModal: Dispatch<SetStateAction<boolean>>;
  listProductPreset: { integrationId: string; connectionId: string } | null;
  setListProductPreset: Dispatch<SetStateAction<{ integrationId: string; connectionId: string } | null>>;
  integrationBadgeIds: Set<string>;
  integrationBadgeStatuses: Map<string, string>;
  exportSettingsProduct: ProductWithImages | null;
  setExportSettingsProduct: Dispatch<SetStateAction<ProductWithImages | null>>;
  refreshListingBadges: () => Promise<void>;
  handleListProductSuccess: () => void;
  } {
  const queryClient = useQueryClient();
  
  // Integrations state
  const [integrationsProduct, setIntegrationsProduct] = useState<ProductWithImages | null>(null);
  const [showListProductModal, setShowListProductModal] = useState(false);
  const [listProductPreset, setListProductPreset] = useState<{ integrationId: string; connectionId: string } | null>(null);

  // Export settings state - opens ListProductModal directly for products with existing listings
  const [exportSettingsProduct, setExportSettingsProduct] = useState<ProductWithImages | null>(null);

  // Load listing badges using useQuery
  const listingsBadgeQuery = useQuery({
    queryKey: listingBadgesQueryKey,
    queryFn: async (): Promise<Record<string, string>> => {
      try {
        return await api.get<Record<string, string>>(
          '/api/integrations/product-listings',
          {
            cache: 'no-store',
          }
        );
      } catch {
        return {};
      }
    },
    retry: 1,
  });

  const payload = listingsBadgeQuery.data || {};
  const entries = Object.entries(payload);
  const integrationBadgeStatuses = new Map(entries);
  const integrationBadgeIds = new Set(entries.map(([productId]: [string, string]) => productId));

  const refreshListingBadges = useCallback(async (): Promise<void> => {
    await invalidateListingBadges(queryClient);
  }, [queryClient]);

  const handleListProductSuccess = (): void => {
    setShowListProductModal(false);
    setIntegrationsProduct(null);
    void refreshListingBadges();
  };

  return {
    integrationsProduct,
    setIntegrationsProduct,
    showListProductModal,
    setShowListProductModal,
    listProductPreset,
    setListProductPreset,
    integrationBadgeIds,
    integrationBadgeStatuses,
    exportSettingsProduct,
    setExportSettingsProduct,
    refreshListingBadges,
    handleListProductSuccess,
  };
}
