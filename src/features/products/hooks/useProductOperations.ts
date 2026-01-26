"use client";

import { useState, useEffect, useCallback } from "react";
import { logger } from "@/shared/lib/utils/logger";
import { useToast } from "@/shared/ui/toast";
import type { ProductWithImages } from "@/types";
import type { ProductDraft } from "@/types/drafts";

export function useProductOperations(setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>) {
  const { toast } = useToast();
  
  // UI State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [initialSku, setInitialSku] = useState<string>("");
  const [editingProduct, setEditingProduct] = useState<ProductWithImages | null>(null);
  const [lastEditedId, setLastEditedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  
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
      const res = await fetch("/api/products/listings");
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

  const handleOpenCreateModal = async () => {
    const skuInput = window.prompt("Enter a new unique SKU:");
    if (skuInput === null) return;
    const sku = skuInput.trim().toUpperCase();
    const skuPattern = /^[A-Z0-9]+$/;
    if (!sku) {
      setActionError("SKU is required.");
      return;
    }
    if (!skuPattern.test(sku)) {
      setActionError("SKU must use uppercase letters and numbers only.");
      return;
    }
    try {
      const res = await fetch(`/api/products?sku=${encodeURIComponent(sku)}`);
      if (!res.ok) {
        const payload = (await res.json()) as { error?: string };
        setActionError(payload?.error || "Failed to validate SKU");
        return;
      }
      const products = (await res.json()) as ProductWithImages[];
      if (products.some((p) => p.sku === sku)) {
        setActionError("SKU already exists.");
        return;
      }
    } catch (error) {
      console.error("Failed to validate SKU:", error);
      setActionError("Failed to validate SKU. Please try again.");
      return;
    }
    setInitialSku(sku);
    setIsCreateOpen(true);
  };

  const handleOpenCreateFromDraft = (draft: ProductDraft) => {
    const draftSku = typeof draft.sku === "string" ? draft.sku.trim().toUpperCase() : "";
    setInitialSku(draftSku);
    setIsCreateOpen(true);
  };

  const handleCreateSuccess = () => {
    setIsCreateOpen(false);
    setInitialSku("");
    setRefreshTrigger((prev) => prev + 1);
    toast("Product created successfully.", { variant: "success" });
  };

  const handleEditSuccess = () => {
    if (editingProduct) {
      setLastEditedId(editingProduct.id);
    }
    setEditingProduct(null);
    setRefreshTrigger((prev) => prev + 1);
    toast("Product updated successfully.", { variant: "success" });
  };

  const handleEditSave = (savedProduct: ProductWithImages) => {
    setLastEditedId(savedProduct.id);
    setRefreshTrigger((prev) => prev + 1);
  };

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
    isCreateOpen,
    setIsCreateOpen,
    initialSku,
    setInitialSku,
    editingProduct,
    setEditingProduct,
    lastEditedId,
    actionError,
    setActionError,
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
    handleOpenCreateModal,
    handleOpenCreateFromDraft,
    handleCreateSuccess,
    handleEditSuccess,
    handleEditSave,
    handleListProductSuccess,
  };
}
