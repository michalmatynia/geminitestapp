"use client";

import { useState, useEffect, useCallback } from "react";
import { logger } from "@/shared/utils/logger";
import type { ProductWithImages } from "@/features/products/types";

export function useIntegrationOperations() {
  // Integrations state
  const [integrationsProduct, setIntegrationsProduct] = useState<ProductWithImages | null>(null);
  const [showListProductModal, setShowListProductModal] = useState(false);
  const [listProductPreset, setListProductPreset] = useState<{ integrationId: string; connectionId: string } | null>(null);
  const [integrationBadgeIds, setIntegrationBadgeIds] = useState<Set<string>>(() => new Set());
  const [integrationBadgeStatuses, setIntegrationBadgeStatuses] = useState<Map<string, string>>(() => new Map());

  // Export settings state - opens ListProductModal directly for products with existing listings
  const [exportSettingsProduct, setExportSettingsProduct] = useState<ProductWithImages | null>(null);

  // Load listing badges
  const refreshListingBadges = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/product-listings");
      if (!res.ok) return;
      const payload = (await res.json()) as Record<string, string>;
      const entries = Object.entries(payload || {});
      setIntegrationBadgeStatuses(new Map(entries));
      setIntegrationBadgeIds(new Set(entries.map(([productId]) => productId)));
    } catch (error) {
      logger.warn("Failed to load listing badges", error);
    }
  }, []);

  useEffect(() => {
    const loadListingBadges = async () => {
      await refreshListingBadges();
    };
    void loadListingBadges();
  }, [refreshListingBadges]);

  const handleListProductSuccess = () => {
    if (integrationsProduct?.id) {
      setIntegrationBadgeIds((prev) => new Set(prev).add(integrationsProduct.id));
      setIntegrationBadgeStatuses((prev) => new Map(prev).set(integrationsProduct.id, "pending"));
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
