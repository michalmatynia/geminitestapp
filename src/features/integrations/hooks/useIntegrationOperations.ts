'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { Dispatch, SetStateAction } from 'react';

import type { ProductWithImages } from '@/features/products';


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
    queryKey: ['integrations', 'product-listings-badges'],
    queryFn: async (): Promise<Record<string, string>> => {
      const res = await fetch('/api/integrations/product-listings', {
        cache: 'no-store',
        credentials: 'include',
      });
      if (!res.ok) return {};
      return (await res.json()) as Record<string, string>;
    },
  });

  const payload = listingsBadgeQuery.data || {};
  const entries = Object.entries(payload);
  const integrationBadgeStatuses = new Map(entries);
  const integrationBadgeIds = new Set(entries.map(([productId]: [string, string]) => productId));

  const refreshListingBadges = useCallback(async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['integrations', 'product-listings-badges'] });
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
