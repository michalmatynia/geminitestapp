"use client";

import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";
import { useToast } from "@/components/ui/toast";
import type { ProductWithImages } from "@/types";

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
  const [integrationBadgeIds, setIntegrationBadgeIds] = useState<Set<string>>(() => new Set());
  const [integrationBadgeStatuses, setIntegrationBadgeStatuses] = useState<Map<string, string>>(() => new Map());

  // Load listing badges
  useEffect(() => {
    let mounted = true;
    const loadListingBadges = async () => {
      try {
        const res = await fetch("/api/products/listings");
        if (!res.ok) return;
        const payload = (await res.json()) as Record<string, string>;
        if (!mounted) return;
        const entries = Object.entries(payload || {});
        setIntegrationBadgeStatuses(new Map(entries));
        setIntegrationBadgeIds(new Set(entries.map(([productId]) => productId)));
      } catch (error) {
        logger.warn("Failed to load listing badges", error);
      }
    };
    void loadListingBadges();
    return () => { mounted = false; };
  }, []);

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
        const payload = await res.json();
        setActionError(payload?.error || "Failed to validate SKU");
        return;
      }
      const products = (await res.json()) as ProductWithImages[];
      if (products.some((p) => p.sku === sku)) {
        setActionError("SKU already exists.");
        return;
      }
    } catch (error) {
      logger.error("Failed to validate SKU:", error);
      setActionError("Failed to validate SKU. Please try again.");
      return;
    }
    setInitialSku(sku);
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

  const handleListProductSuccess = () => {
    if (integrationsProduct?.id) {
      setIntegrationBadgeIds((prev) => new Set(prev).add(integrationsProduct.id));
      setIntegrationBadgeStatuses((prev) => new Map(prev).set(integrationsProduct.id, "pending"));
    }
    setShowListProductModal(false);
    const currentProduct = integrationsProduct;
    setIntegrationsProduct(null);
    setTimeout(() => { setIntegrationsProduct(currentProduct); }, 100);
  };

  return {
    isCreateOpen,
    setIsCreateOpen,
    initialSku,
    editingProduct,
    setEditingProduct,
    lastEditedId,
    actionError,
    setActionError,
    integrationsProduct,
    setIntegrationsProduct,
    showListProductModal,
    setShowListProductModal,
    integrationBadgeIds,
    integrationBadgeStatuses,
    handleOpenCreateModal,
    handleCreateSuccess,
    handleEditSuccess,
    handleListProductSuccess,
  };
}
