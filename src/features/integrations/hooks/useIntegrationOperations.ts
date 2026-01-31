"use client";
import { useState, useEffect, useCallback } from "react";
import { logger } from "@/shared/utils/logger";
import type { ProductWithImages } from "@/features/products";

import { Dispatch, SetStateAction } from "react";

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
  // Integrations state
  const [integrationsProduct, setIntegrationsProduct] = useState<ProductWithImages | null>(null);
  const [showListProductModal, setShowListProductModal] = useState(false);
  const [listProductPreset, setListProductPreset] = useState<{ integrationId: string; connectionId: string } | null>(null);
  const [integrationBadgeIds, setIntegrationBadgeIds] = useState<Set<string>>(() => new Set());
  const [integrationBadgeStatuses, setIntegrationBadgeStatuses] = useState<Map<string, string>>(() => new Map());

  // Export settings state - opens ListProductModal directly for products with existing listings
  const [exportSettingsProduct, setExportSettingsProduct] = useState<ProductWithImages | null>(null);

  // Load listing badges
  const refreshListingBadges = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch("/api/integrations/product-listings");
      if (!res.ok) return;
      const payload = (await res.json()) as Record<string, string>;
      const entries = Object.entries(payload || {});
      setIntegrationBadgeStatuses(new Map(entries));
      setIntegrationBadgeIds(new Set(entries.map(([productId]: [string, string]): string => productId)));
    } catch (error: unknown) {
      logger.warn("Failed to load listing badges", error);
    }
  }, []);

  useEffect(() => {
    const loadListingBadges = async (): Promise<void> => {
      await refreshListingBadges();
    };
    void loadListingBadges();
  }, [refreshListingBadges]);

  const handleListProductSuccess = (): void => {
    if (integrationsProduct?.id) {
      setIntegrationBadgeIds((prev: Set<string>) => new Set(prev).add(integrationsProduct.id));
      setIntegrationBadgeStatuses((prev: Map<string, string>) => new Map(prev).set(integrationsProduct.id, "pending"));
    }
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
